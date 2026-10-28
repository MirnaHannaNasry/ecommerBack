const logger = require('../utilites/logger.util');
const AppError = require('../utilites/appError.util');

// turn common mongoose/mongo errors into clean 4xx responses
const normalize = (err) => {
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        return new AppError(`${field} already exists`, 409);
    }
    if (err.name === 'ValidationError') {
        return new AppError(Object.values(err.errors).map(e => e.message).join(', '), 400);
    }
    if (err.name === 'CastError') {
        return new AppError(`invalid ${err.path}: ${err.value}`, 400);
    }
    if (err.name === 'MulterError') {
        return new AppError(err.message, 400);
    }
    return err;
};

module.exports = (err, req, res, next) => {
    err = normalize(err);
  logger.error(err.stack || err.message);
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    if (process.env.NODE_ENV === 'development') {
        return res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    }
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            ...(err.details && { details: err.details })
        });
    }
    return res.status(500).json({
        status: 'error',
        message: 'something went wrong'
    });
};
