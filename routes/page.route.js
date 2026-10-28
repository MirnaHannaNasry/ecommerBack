const express = require('express');
const router = express.Router();
const c = require('../controller/page.controller');
const { authanicate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.get('/:key', c.getPage);
router.put('/:key', authanicate, authorize('admin'), c.savePage);

module.exports = router;
