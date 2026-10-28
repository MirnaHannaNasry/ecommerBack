module.exports = (req, defaultLimit = 12, maxLimit = 50) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || defaultLimit, 1), maxLimit);
    return { page, limit, skip: (page - 1) * limit };
};
