const mongoose = require('mongoose');
const Testimonial = require('../model/testimonial.model');
const Product = require('../model/product.model');
const AppError = require('../utilites/appError.util');
const catchAsync = require('../utilites/catchAsync.util');
const paginateQuery = require('../utilites/pagination.util');

exports.addTestimonial = catchAsync(async (req, res) => {
    const { product, stars, comment } = req.body;
    if (!product || !stars || !comment) throw new AppError('product, stars and comment are required', 400);
    const myProduct = await Product.findOne({ _id: product, isDeleted: false });
    if (!myProduct) throw new AppError('product not found', 404);

    const myTestimonial = await Testimonial.create({
        user: req.user._id,
        name: req.user.name,
        product, stars, comment
    });
    res.status(201).json({ message: 'thanks! your review will appear after admin approval', data: myTestimonial });
});

// public: approved reviews of one product + average
exports.getProductTestimonials = catchAsync(async (req, res) => {
    const { page, limit, skip } = paginateQuery(req, 10);
    const filter = { product: req.params.productId, status: 'approved' };
    const productId = new mongoose.Types.ObjectId(req.params.productId);

    const [data, total, stats] = await Promise.all([
        Testimonial.find(filter).sort({ date: -1 }).skip(skip).limit(limit).select('name stars comment date'),
        Testimonial.countDocuments(filter),
        Testimonial.aggregate([
            { $match: { product: productId, status: 'approved' } },
            { $group: { _id: null, averageStars: { $avg: '$stars' }, count: { $sum: 1 } } }
        ])
    ]);
    res.status(200).json({
        message: 'product reviews',
        page, limit, totalPages: Math.ceil(total / limit), total,
        averageStars: stats[0] ? Math.round(stats[0].averageStars * 10) / 10 : 0,
        data
    });
});

exports.getMyTestimonials = catchAsync(async (req, res) => {
    const data = await Testimonial.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('product', 'name slug');
    res.status(200).json({ message: 'my reviews', data });
});

// admin: ?status=pending|approved|declined
exports.getAllTestimonials = catchAsync(async (req, res) => {
    const { page, limit, skip } = paginateQuery(req, 20, 100);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.product) filter.product = req.query.product;
    const [data, total] = await Promise.all([
        Testimonial.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
            .populate('product', 'name slug').populate('user', 'name email'),
        Testimonial.countDocuments(filter)
    ]);
    res.status(200).json({ message: 'reviews list', page, limit, totalPages: Math.ceil(total / limit), total, data });
});

exports.updateTestimonialStatus = catchAsync(async (req, res) => {
    const { status } = req.body;
    if (!['approved', 'declined', 'pending'].includes(status)) {
        throw new AppError('status must be approved, declined or pending', 400);
    }
    const myTestimonial = await Testimonial.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!myTestimonial) throw new AppError('review not found', 404);
    res.status(200).json({ message: `review ${status}`, data: myTestimonial });
});
