const Order = require('../model/order.model');
const catchAsync = require('../utilites/catchAsync.util');

const NOT_REVENUE = ['cancelled', 'rejected', 'refunded'];

exports.getSalesReport = catchAsync(async (req, res) => {
    const { fromDate, toDate } = req.query;
    const dateMatch = {};
    if (fromDate || toDate) {
        dateMatch.createdAt = {};
        if (fromDate) dateMatch.createdAt.$gte = new Date(fromDate);
        if (toDate) dateMatch.createdAt.$lte = new Date(toDate);
    }
    const revenueMatch = { status: { $nin: NOT_REVENUE } };

    const [report] = await Order.aggregate([
        { $match: dateMatch },
        {
            $facet: {
                ordersByStatus: [
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ],
                overallStats: [
                    { $match: revenueMatch },
                    {
                        $group: {
                            _id: null,
                            totalSalesAmount: { $sum: '$totalPrice' },
                            totalOrders: { $sum: 1 },
                            totalQuantity: { $sum: { $sum: '$items.quantity' } }
                        }
                    }
                ],
                topProducts: [
                    { $match: revenueMatch },
                    { $unwind: '$items' },
                    {
                        $group: {
                            _id: '$items.product',
                            name: { $first: '$items.name' },
                            imgURL: { $first: '$items.imgURL' },
                            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                            quantitySold: { $sum: '$items.quantity' }
                        }
                    },
                    { $sort: { revenue: -1 } },
                    { $limit: 5 }
                ],
                topCustomers: [
                    { $match: revenueMatch },
                    {
                        $group: {
                            _id: '$user',
                            name: { $first: '$customer.name' },
                            email: { $first: '$customer.email' },
                            totalSpent: { $sum: '$totalPrice' },
                            totalOrders: { $sum: 1 }
                        }
                    },
                    { $sort: { totalSpent: -1 } },
                    { $limit: 5 }
                ],
                monthlySales: [
                    { $match: revenueMatch },
                    {
                        $group: {
                            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                            totalRevenue: { $sum: '$totalPrice' },
                            totalOrders: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } }
                ]
            }
        }
    ]);
    res.status(200).json({ message: 'sales report', data: report });
});
