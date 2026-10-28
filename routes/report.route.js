const express = require('express');
const router= express.Router();
const {authanicate} = require('../middlewares/auth.middleware');
const {authorize} = require('../middlewares/role.middleware');
const {getSalesReport} = require('../controller/report.controller');

router.get('/sales',authanicate,authorize('admin'),getSalesReport);

module.exports = router