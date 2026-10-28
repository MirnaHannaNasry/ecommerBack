const jwt = require('jsonwebtoken');
const User = require('../model/user.model');


module.exports = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            if (user && !user.isBlocked) req.user = user;
        }
    } catch (err) {
        // ignore: treat as guest
    }
    next();
};
