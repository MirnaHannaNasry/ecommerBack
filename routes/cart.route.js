const express = require('express');
const router = express.Router();
const c = require('../controller/cart.controller');
const { authanicate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.use(authanicate, authorize('user'));

router.get('/', c.getCart);
router.delete('/', c.clearCart);
router.post('/items', c.addItem);
router.patch('/items/:productId', c.updateItem);
router.delete('/items/:productId', c.removeItem);
router.post('/accept-price-changes', c.acceptPriceChanges);

module.exports = router;
