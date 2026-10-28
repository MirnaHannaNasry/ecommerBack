const express = require('express');
const router = express.Router();
const c = require('../controller/user.controller');
const { addAdmin } = require('../controller/auth.controller');
const { authanicate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.get('/me', authanicate, c.getMe);
router.patch('/me', authanicate, c.updateMe);
router.post('/me/addresses', authanicate, c.addAddress);
router.patch('/me/addresses/:addressId', authanicate, c.updateAddress);
router.patch('/me/addresses/:addressId/default', authanicate, c.setDefaultAddress);
router.delete('/me/addresses/:addressId', authanicate, c.deleteAddress);

router.post('/add-admin', authanicate, authorize('admin'), addAdmin);
router.get('/', authanicate, authorize('admin'), c.getUsers);
router.patch('/:id/block', authanicate, authorize('admin'), c.setBlocked(true));
router.patch('/:id/unblock', authanicate, authorize('admin'), c.setBlocked(false));
router.get('/email/:email', authanicate, authorize('admin'), c.getUserByEmail);

module.exports = router;
