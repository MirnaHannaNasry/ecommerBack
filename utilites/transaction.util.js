const mongoose = require('mongoose');

module.exports = async (fn) => {
    if (process.env.DISABLE_TRANSACTIONS === 'true') return fn(null);
    const session = await mongoose.startSession();
    try {
        return await session.withTransaction(() => fn(session));
    } finally {
        await session.endSession();
    }
};
