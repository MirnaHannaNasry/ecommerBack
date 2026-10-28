const FAQ = require('../model/faq.model');
const AppError = require('../utilites/appError.util');
const catchAsync = require('../utilites/catchAsync.util');

exports.getFaqs = catchAsync(async (req, res) => {
    const data = await FAQ.find().sort({ createdAt: 1 });
    res.status(200).json({ message: 'faq list', data });
});

exports.addFaq = catchAsync(async (req, res) => {
    const { question, answer } = req.body;
    const myFaq = await FAQ.create({ question, answer });
    res.status(201).json({ message: 'faq created', data: myFaq });
});

exports.updateFaq = catchAsync(async (req, res) => {
    const { question, answer } = req.body;
    const update = {};
    if (question !== undefined) update.question = question;
    if (answer !== undefined) update.answer = answer;
    const myFaq = await FAQ.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!myFaq) throw new AppError('faq not found', 404);
    res.status(200).json({ message: 'faq updated', data: myFaq });
});


exports.deleteFaq = catchAsync(async (req, res) => {
    const myFaq = await FAQ.findByIdAndDelete(req.params.id);
    if (!myFaq) throw new AppError('faq not found', 404);
    res.status(200).json({ message: 'faq deleted' });
});
