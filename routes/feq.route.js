const express = require('express');
const router = express.Router();
const c = require('../controller/feq.controller');
const { authanicate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.get('/', c.getFaqs);
router.post('/', authanicate, authorize('admin'), c.addFaq);
router.patch('/:id', authanicate, authorize('admin'), c.updateFaq);
router.delete('/:id', authanicate, authorize('admin'), c.deleteFaq);

module.exports = router;
