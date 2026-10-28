const withTransaction = require('../utilites/transaction.util');
const Order = require('../model/order.model');
const Cart = require('../model/cart.model');
const Product = require('../model/product.model');
const AppError = require('../utilites/appError.util');
const catchAsync = require('../utilites/catchAsync.util');
const cache = require('../utilites/chache.util');
const paginateQuery = require('../utilites/pagination.util');
const logger = require('../utilites/logger.util');
const { isPurchasable } = require('./cart.controller');

const { STATUSES, STOCK_RELEASING } = Order;


exports.placeOrder = catchAsync(async (req, res) => {
    const user = req.user;
    const address = req.body.addressId
        ? user.addresses.id(req.body.addressId)
        : user.addresses.find(a => a.isDefault) || user.addresses[0];
    if (!address) throw new AppError('no delivery address found, add an address first', 400);
    if (!user.phone) throw new AppError('add your phone number first', 400);

    let order;
    await withTransaction(async (session) => {
            const cart = await Cart.findOne({ user: user._id }).session(session);
            if (!cart || cart.items.length === 0) throw new AppError('your cart is empty', 400);

            const products = await Product.find({ _id: { $in: cart.items.map(i => i.product) } }).session(session);
            const byId = new Map(products.map(p => [String(p._id), p]));

            const unavailable = [], noStock = [], priceChanged = [];
            for (const item of cart.items) {
                const p = byId.get(String(item.product));
                if (!(await isPurchasable(p))) { unavailable.push({ product: item.product }); continue; }
                if (p.stock < item.quantity) {
                    noStock.push({ product: p._id, name: p.name, requested: item.quantity, available: p.stock });
                }
                if (p.price !== item.price) {
                    priceChanged.push({ product: p._id, name: p.name, oldPrice: item.price, newPrice: p.price });
                }
            }

            if (priceChanged.length) {
                // GET /cart recomputes the priceChanged flag, so the front-end just sends the user back there
                throw new AppError('some prices changed, please review your cart', 409, { type: 'PRICE_CHANGED', priceChanged });
            }
            if (unavailable.length) {
                throw new AppError('some products are no longer available', 409, { type: 'UNAVAILABLE', unavailable });
            }
            if (noStock.length) {
                throw new AppError('not enough stock for some products', 409, { type: 'OUT_OF_STOCK', noStock });
            }

            // reserve stock atomically (guards against two buyers taking the last piece)
            for (const item of cart.items) {
                const updated = await Product.findOneAndUpdate(
                    { _id: item.product, stock: { $gte: item.quantity } },
                    { $inc: { stock: -item.quantity } },
                    { session }
                );
                if (!updated) {
                    throw new AppError('not enough stock for some products', 409, { type: 'OUT_OF_STOCK' });
                }
            }

            const items = cart.items.map(i => {
                const p = byId.get(String(i.product));
                return { product: p._id, name: p.name, imgURL: p.imgURL, quantity: i.quantity, price: p.price };
            });
            const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

            [order] = await Order.create([{
                user: user._id,
                items,
                totalPrice,
                customer: { name: user.name, email: user.email, phone: user.phone },
                shippingAddress: {
                    label: address.label, governorate: address.governorate,
                    city: address.city, street: address.street, notes: address.notes
                },
                statusHistory: [{ status: 'pending', changedBy: user._id }]
            }], { session });

            cart.items = [];
            await cart.save({ session });
        });

    cache.flushAll();   // stock changed
    logger.info(`user ${user.email} placed order ${order._id}`);
    res.status(201).json({ message: 'order placed, pay on delivery', data: order });
});

exports.getMyOrders = catchAsync(async (req, res) => {
    const { page, limit, skip } = paginateQuery(req, 10);
    const filter = { user: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    const [data, total] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Order.countDocuments(filter)
    ]);
    res.status(200).json({ message: 'my orders', page, limit, totalPages: Math.ceil(total / limit), total, data });
});

exports.getOrder = catchAsync(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order || (req.user.role !== 'admin' && String(order.user) !== String(req.user._id))) {
        throw new AppError('order not found', 404);
    }
    res.status(200).json({ message: 'order details', data: order });
});

/* ---- status changes (stock is returned / re-taken inside a transaction) ---- */

const changeStatus = async (orderId, newStatus, byUser, onlyIfStatus) => {
    let result;
    await withTransaction(async (session) => {
            const order = await Order.findById(orderId).session(session);
            if (!order) throw new AppError('order not found', 404);
            if (onlyIfStatus && !onlyIfStatus(order)) {
                throw new AppError(`order can't be changed from ${order.status}`, 409);
            }
            if (order.status === newStatus) { result = order; return; }

            const releasing = STOCK_RELEASING.includes(newStatus);
            if (releasing && !order.stockReleased) {
                for (const i of order.items) {
                    await Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity } }, { session });
                }
                order.stockReleased = true;
            } else if (!releasing && order.stockReleased) {
                // admin is re-opening a cancelled/rejected order: take the stock again
                for (const i of order.items) {
                    const ok = await Product.findOneAndUpdate(
                        { _id: i.product, stock: { $gte: i.quantity } },
                        { $inc: { stock: -i.quantity } }, { session });
                    if (!ok) throw new AppError(`not enough stock to re-open the order (${i.name})`, 409);
                }
                order.stockReleased = false;
            }

            order.status = newStatus;
            order.statusHistory.push({ status: newStatus, changedBy: byUser._id });
            await order.save({ session });
            result = order;
        });
    cache.flushAll();
    return result;
};

// customer can cancel only while the order is still pending
exports.cancelMyOrder = catchAsync(async (req, res) => {
    const mine = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!mine) throw new AppError('order not found', 404);
    const order = await changeStatus(mine._id, 'cancelled', req.user, o => o.status === 'pending');
    res.status(200).json({ message: 'order cancelled', data: order });
});

// admin: any status -> any status, no fixed order
exports.updateStatus = catchAsync(async (req, res) => {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
        throw new AppError(`status must be one of: ${STATUSES.join(', ')}`, 400);
    }
    const order = await changeStatus(req.params.id, status, req.user);
    logger.info(`admin ${req.user.email} set order ${order._id} to ${status}`);
    res.status(200).json({ message: 'order status updated', data: order });
});

exports.getAllOrders = catchAsync(async (req, res) => {
    const { page, limit, skip } = paginateQuery(req, 20, 100);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.user) filter.user = req.query.user;
    if (req.query.fromDate || req.query.toDate) {
        filter.createdAt = {};
        if (req.query.fromDate) filter.createdAt.$gte = new Date(req.query.fromDate);
        if (req.query.toDate) filter.createdAt.$lte = new Date(req.query.toDate);
    }
    const [data, total] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Order.countDocuments(filter)
    ]);
    res.status(200).json({ message: 'all orders', page, limit, totalPages: Math.ceil(total / limit), total, data });
});
