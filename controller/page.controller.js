const Page = require('../model/page.model');
const AppError = require('../utilites/appError.util');
const catchAsync = require('../utilites/catchAsync.util');

const KEYS = ['policy', 'about', 'contact'];

exports.getPage = catchAsync(async (req, res) => {
    if (!KEYS.includes(req.params.key)) throw new AppError(`page must be one of: ${KEYS.join(', ')}`, 400);
    const myPage = await Page.findOne({ key: req.params.key });
    if (!myPage) throw new AppError('page not written yet', 404);
    res.status(200).json({ message: `${req.params.key} page`, data: myPage });
});

// create or update
exports.savePage = catchAsync(async (req, res) => {
    const { key } = req.params;
    if (!KEYS.includes(key)) throw new AppError(`page must be one of: ${KEYS.join(', ')}`, 400);
    const { title, content, contact } = req.body;
    const myPage = await Page.findOneAndUpdate(
        { key },
        { key, title, content, contact },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: `${key} page saved`, data: myPage });
});
