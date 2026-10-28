const Cart = require('../model/cart.model');
const Product = require('../model/product.model');
const Category = require('../model/category.model');
const AppError = require('../utilites/appError.util');
const catchAsync = require('../utilites/catchAsync.util');

const getOrCreateCart = async (userId) =>
    (await Cart.findOne({ user: userId })) || (await Cart.create({ user: userId, items: [] }));

const isPurchasable = async (product) => {
    if (!product || !product.isActive || product.isDeleted) return false;
    // products only have a category (no sub-category in the product model)
    const cat = await Category.findOne({ _id: product.category, isActive: true, isDeleted: false });
    return !!cat;
};
exports.isPurchasable = isPurchasable;

const buildCartResponse = async (cart) => {
    const products = await Product.find({ _id: { $in: cart.items.map(i => i.product) } });
    const byId = new Map(products.map(p => [String(p._id), p]));

    let dirty = false;
    const items = [];
    for (const item of cart.items) {
        const p = byId.get(String(item.product));
        const changed = !!p && p.price !== item.price;
        if (item.priceChanged !== changed) { item.priceChanged = changed; dirty = true; }

        const available = await isPurchasable(p);
        items.push({
            productId: item.product,               // still present when the product was deleted
            product: p ? {
                _id: p._id, name: p.name, slug: p.slug, imgURL: p.imgURL,
                stock: p.stock, isOutOfStock: p.isOutOfStock, isLowStock: p.isLowStock
            } : null,
            quantity: item.quantity,
            price: item.price,                     // price the user saw when adding
            currentPrice: p ? p.price : null,      // price right now
            priceChanged: item.priceChanged,
            available,                             // false => remove it before ordering
            enoughStock: !!p && p.stock >= item.quantity
        });
    }
    if (dirty) await cart.save();

    const total = items.reduce((s, i) => s + (i.currentPrice ?? i.price) * i.quantity, 0);
    return {
        items,
        total,
        hasPriceChanges: items.some(i => i.priceChanged),
        canPlaceOrder: items.length > 0 && items.every(i => i.available && i.enoughStock && !i.priceChanged)
    };
};

exports.getCart = catchAsync(async (req, res) => {
    const cart = await getOrCreateCart(req.user._id);
    res.status(200).json({ message: 'my cart', data: await buildCartResponse(cart) });
});

exports.addItem = catchAsync(async (req, res) => {
    const { product, quantity = 1 } = req.body;
    const qty = Number(quantity);
    if (!product || !Number.isInteger(qty) || qty < 1) {
        throw new AppError('product and a positive integer quantity are required', 400);
    }
    const myProduct = await Product.findById(product);
    if (!(await isPurchasable(myProduct))) throw new AppError('product not available', 404);
    if (myProduct.stock <= 0) throw new AppError('product is out of stock', 409);

    const cart = await getOrCreateCart(req.user._id);
    const existing = cart.items.find(i => String(i.product) === String(myProduct._id));
    const newQty = (existing?.quantity || 0) + qty;
    if (newQty > myProduct.stock) {
        throw new AppError(`only ${myProduct.stock} left in stock`, 409);
    }
    if (existing) {
        existing.quantity = newQty;
    } else {
        cart.items.push({ product: myProduct._id, quantity: qty, price: myProduct.price });
    }
    await cart.save();
    res.status(200).json({ message: 'item added to cart', data: await buildCartResponse(cart) });
});

exports.updateItem = catchAsync(async (req, res) => {
    const qty = Number(req.body.quantity);
    if (!Number.isInteger(qty) || qty < 1) throw new AppError('quantity must be a positive integer', 400);

    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.find(i => String(i.product) === req.params.productId);
    if (!item) throw new AppError('item not in cart', 404);

    const myProduct = await Product.findById(req.params.productId);
    if (!myProduct || qty > myProduct.stock) {
        throw new AppError(`only ${myProduct?.stock ?? 0} left in stock`, 409);
    }
    item.quantity = qty;
    await cart.save();
    res.status(200).json({ message: 'cart updated', data: await buildCartResponse(cart) });
});

exports.removeItem = catchAsync(async (req, res) => {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = cart.items.filter(i => String(i.product) !== req.params.productId);
    await cart.save();
    res.status(200).json({ message: 'item removed', data: await buildCartResponse(cart) });
});

exports.clearCart = catchAsync(async (req, res) => {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    await cart.save();
    res.status(200).json({ message: 'cart cleared', data: await buildCartResponse(cart) });
});

// user agrees to the new prices: copy current price into the cart and reset the flag
exports.acceptPriceChanges = catchAsync(async (req, res) => {
    const cart = await getOrCreateCart(req.user._id);
    const products = await Product.find({ _id: { $in: cart.items.map(i => i.product) } });
    const byId = new Map(products.map(p => [String(p._id), p]));
    for (const item of cart.items) {
        const p = byId.get(String(item.product));
        if (p) { item.price = p.price; item.priceChanged = false; }
    }
    await cart.save();
    res.status(200).json({ message: 'new prices accepted', data: await buildCartResponse(cart) });
});
