
const mongoose = require('mongoose');

const LOW_STOCK_THRESHOLD = 3;

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    desc: String,

    price: {
        type: Number,
        required: true,
        min: 0
    },

    imgURL: String,

    stock: {
        type: Number,
        default: 0,
        min: 0
    },

    slug: {
        type: String,
        unique: true,
        required: true
    },

    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },

    isTrending: {
        type: Boolean,
        default: false
    },

    isActive: {
        type: Boolean,
        default: true
    },

    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Check stock status
productSchema.virtual('isOutOfStock').get(function () {
    return this.stock <= 0;
});

productSchema.virtual('isLowStock').get(function () {
    return this.stock > 0 && this.stock <= LOW_STOCK_THRESHOLD;
});


productSchema.index({ category: 1 });
productSchema.index({ name: 1 });

module.exports = mongoose.model('Product', productSchema);
module.exports.LOW_STOCK_THRESHOLD = LOW_STOCK_THRESHOLD;
