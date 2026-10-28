const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },                 // reviewer name snapshot
    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

testimonialSchema.index({ user: 1, product: 1 }, { unique: true });
testimonialSchema.index({ product: 1, status: 1 });

module.exports = mongoose.model('Testimonial', testimonialSchema);
