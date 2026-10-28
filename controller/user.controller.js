const User = require('../model/user.model');
const AppError = require('../utilites/appError.util');
const catchAsync = require('../utilites/catchAsync.util');
const paginateQuery = require('../utilites/pagination.util');
const escapeRegex = require('../utilites/escapeRegex.util');

const PHONE_REGEX = /^\+?\d{10,15}$/;

exports.getUsers = catchAsync(async (req, res) => {
    const { page, limit, skip } = paginateQuery(req, 20, 100);
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.blocked) filter.isBlocked = req.query.blocked === 'true';
    if (req.query.search) {
        const rx = new RegExp(escapeRegex(req.query.search), 'i');
        filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }
    const [data, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        User.countDocuments(filter)
    ]);
    res.status(200).json({ message: 'list of users', page, limit, totalPages: Math.ceil(total / limit), total, data });
});

exports.getUserByEmail = catchAsync(async (req, res) => {
    const email = req.params.email.toLowerCase();
    const myUser = await User.findOne({ email });
    if (!myUser) throw new AppError(`can't find user with email:${email}`, 404);
    res.status(200).json({ message: `get user by email:${email}`, data: myUser });
});

exports.setBlocked = (blocked) => catchAsync(async (req, res) => {
    if (String(req.user._id) === req.params.id) {
        throw new AppError("you can't block yourself", 400);
    }
    const myUser = await User.findByIdAndUpdate(req.params.id, { isBlocked: blocked }, { new: true });
    if (!myUser) throw new AppError('user not found', 404);
    res.status(200).json({ message: blocked ? 'user blocked' : 'user unblocked', data: myUser });
});

/* ---------- my profile ---------- */

exports.getMe = (req, res) => {
    res.status(200).json({ message: 'my profile', data: req.user });
};

exports.updateMe = catchAsync(async (req, res) => {
    const { name, phone } = req.body;
    if (name !== undefined) req.user.name = name;
    if (phone !== undefined) {
        if (!PHONE_REGEX.test(phone)) throw new AppError('invalid phone number', 400);
        req.user.phone = phone;
    }
    await req.user.save();
    res.status(200).json({ message: 'profile updated', data: req.user });
});

/* ---------- my addresses ---------- */

exports.addAddress = catchAsync(async (req, res) => {
    const { label, governorate, city, street, notes, isDefault } = req.body;
    if (isDefault) req.user.addresses.forEach(a => { a.isDefault = false; });
    req.user.addresses.push({ label, governorate, city, street, notes, isDefault: !!isDefault });
    await req.user.save();
    res.status(201).json({ message: 'address added', data: req.user.addresses });
});

exports.updateAddress = catchAsync(async (req, res) => {
    const address = req.user.addresses.id(req.params.addressId);
    if (!address) throw new AppError('address not found', 404);
    ['label', 'governorate', 'city', 'street', 'notes'].forEach(f => {
        if (req.body[f] !== undefined) address[f] = req.body[f];
    });
    await req.user.save();
    res.status(200).json({ message: 'address updated', data: req.user.addresses });
});

exports.setDefaultAddress = catchAsync(async (req, res) => {
    const address = req.user.addresses.id(req.params.addressId);
    if (!address) throw new AppError('address not found', 404);
    req.user.addresses.forEach(a => { a.isDefault = false; });
    address.isDefault = true;
    await req.user.save();
    res.status(200).json({ message: 'default address changed', data: req.user.addresses });
});

exports.deleteAddress = catchAsync(async (req, res) => {
    const address = req.user.addresses.id(req.params.addressId);
    if (!address) throw new AppError('address not found', 404);
    if (req.user.addresses.length === 1) {
        throw new AppError('you must keep at least one address', 400);
    }
    address.deleteOne();
    await req.user.save();   // pre-validate hook picks a new default if needed
    res.status(200).json({ message: 'address deleted', data: req.user.addresses });
});
