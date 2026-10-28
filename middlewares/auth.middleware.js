
const jwt = require('jsonwebtoken');
const User = require('../model/user.model');

exports.authanicate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'No token provided'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = await User.findById(decoded.id);
    } catch (err) {
        return res.status(401).json({
            error: 'Invalid or expired token'
        });
    }

    if (!req.user) {
        return res.status(401).json({
            error: 'User not found'
        });
    }

    if (req.user.isBlocked) {
        return res.status(403).json({
            error: 'Your account is blocked'
        });
    }

    next();
};
