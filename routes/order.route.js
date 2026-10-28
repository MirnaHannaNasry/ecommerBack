const express = require('express');
const router = express.Router();
const c = require('../controller/order.controller');
const { authanicate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.use(authanicate);

router.post('/', authorize('user'), c.placeOrder);
router.get('/my', authorize('user'), c.getMyOrders);
router.patch('/:id/cancel', authorize('user'), c.cancelMyOrder);

router.get('/', authorize('admin'), c.getAllOrders);
router.patch('/:id/status', authorize('admin'), c.updateStatus);

router.get('/:id', c.getOrder);

module.exports = router;
