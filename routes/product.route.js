const express = require('express');
const router = express.Router();
const c = require('../controller/product.controller');
const { upload } = require('../middlewares/upload.middleware');
const { authanicate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const optionalAuth = require('../middlewares/optionalAuth.middleware');

const admin = [authanicate, authorize('admin')];

router.get('/', optionalAuth, c.getProducts);
router.get('/related-products/:slug', c.getRelatedProducts);
router.get('/:slug', optionalAuth, c.getProductBySlug);

router.post('/', ...admin, upload.single('img'), c.addProduct);
router.patch('/:id', ...admin, upload.single('img'), c.updateProduct);
router.delete('/:id', ...admin, c.deleteProduct);
router.patch('/:id/restore', ...admin, c.restoreProduct);

module.exports = router;
