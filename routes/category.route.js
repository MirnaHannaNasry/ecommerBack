
const express = require('express');
const router = express.Router();

const c = require('../controller/category.controller');
const { authanicate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');


router.get('/', c.getAllCategories);

router.get('/:id', c.getCategoryById);

router.post(
    '/',
    authanicate,
    authorize('admin'),
    c.createCategory
);

router.patch(
    '/:id',
    authanicate,
    authorize('admin'),
    c.updateCategory
);

router.delete(
    '/:id',
    authanicate,
    authorize('admin'),
    c.deleteCategory
);

router.patch(
    '/:id/restore',
    authanicate,
    authorize('admin'),
    c.restoreCategory
);

module.exports = router;
