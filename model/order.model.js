const mongoose = require('mongoose');

const STATUSES = ['pending', 'preparing', 'shipped', 'delivered', 'cancelled', 'rejected', 'refunded'];
const STOCK_RELEASING = ['cancelled', 'rejected'];

const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,         
    imgURL: String,       
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }   // unit price at order time
}, { _id: false });

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], validate: v => v.length > 0 },
    status: { type: String, enum: STATUSES, default: 'pending' },
    totalPrice: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash_on_delivery'], default: 'cash_on_delivery' },
    customer: {
        name: String,
        email: String,
        phone: String
    },
    shippingAddress: {
        label: String,
        governorate: String,
        city: String,
        street: String,
        notes: String
    },
    stockReleased: { type: Boolean, default: false },
    statusHistory: [{
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        _id: false
    }]
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
module.exports.STATUSES = STATUSES;
module.exports.STOCK_RELEASING = STOCK_RELEASING;
