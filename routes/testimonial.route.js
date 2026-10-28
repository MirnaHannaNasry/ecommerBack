const express = require('express');
const router = express.Router();
const c = require('../controller/testimonial.controller');
const { authanicate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.get('/product/:productId', c.getProductTestimonials);

router.post('/', authanicate, authorize('user'), c.addTestimonial);
router.get('/my', authanicate, authorize('user'), c.getMyTestimonials);

router.get('/', authanicate, authorize('admin'), c.getAllTestimonials);
router.patch('/:id/status', authanicate, authorize('admin'), c.updateTestimonialStatus);

module.exports = router;
