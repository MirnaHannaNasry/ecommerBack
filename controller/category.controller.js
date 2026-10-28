
const Category = require('../model/category.model');

exports.createCategory = async (req, res) => {
    try {
        const category = await Category.create(req.body);

        res.status(201).json({
            status: 'success',
            data: { category }
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
};


exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find({
            isDeleted: false
        });

        res.status(200).json({
            status: 'success',
            results: categories.length,
            data: { categories }
        });
    } catch (error) {
        res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};


exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findOne({
            _id: req.params.id,
            isDeleted: false
        });

        if (!category) {
            return res.status(404).json({
                status: 'fail',
                message: 'Category not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { category }
        });
    } catch (error) {
        res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};



exports.updateCategory = async (req, res) => {
    try {
        const category = await Category.findOneAndUpdate(
            {
                _id: req.params.id,
                isDeleted: false
            },
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!category) {
            return res.status(404).json({
                status: 'fail',
                message: 'Category not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { category }
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
};


exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { isDeleted: true },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({
                status: 'fail',
                message: 'Category not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { category }
        });
    } catch (error) {
        res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};

exports.restoreCategory = async (req, res) => {
    try {
        const category = await Category.findOneAndUpdate(
            { _id: req.params.id, isDeleted: true },
            { isDeleted: false },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({
                status: 'fail',
                message: 'Deleted category not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { category }
        });
    } catch (error) {
        res.status(500).json({
            status: 'fail',
            message: error.message
        });
    }
};
