const User = require('../model/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppError = require('../utilites/appError.util');
const catchAsync = require('../utilites/catchAsync.util');


const PHONE_REGEX = /^\+?\d{10,15}$/;

const signToken = (user) =>
    jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

const publicUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    addresses: user.addresses
});

// role = 'user' (public register) or 'admin' (admin creating another admin)
const createAccount = (role) => catchAsync(async (req, res) => {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
        throw new AppError('Name, email and password are required', 400);
    }
    if (typeof password !== 'string' || password.length < 8) {
        throw new AppError('Password must be at least 8 characters', 400);
    }

    const data = {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        password,                 // hashed once, by the User model's pre-save hook
        role
    };

    if (role === 'user') {
        if (!phone || !PHONE_REGEX.test(phone)) {
            throw new AppError('A valid phone number is required', 400);
        }
        const addresses = req.body.addresses || (req.body.address ? [req.body.address] : []);
        if (!Array.isArray(addresses) || addresses.length === 0) {
            throw new AppError('At least one address is required', 400);
        }
        data.phone = phone;
        data.addresses = addresses;       
        data.phone = phone;
    }

    const user = await User.create(data);
    res.status(201).json({ status: 'success', data: { user: publicUser(user) } });
});

exports.register = createAccount('user');
exports.addAdmin = createAccount('admin');

exports.login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        throw new AppError('Please provide email and password', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new AppError('Invalid email or password', 401);
    }
    if (user.isBlocked) throw new AppError('Your account is blocked', 403);

    res.status(200).json({ status: 'success', token: signToken(user), data: { user: publicUser(user) } });
});
