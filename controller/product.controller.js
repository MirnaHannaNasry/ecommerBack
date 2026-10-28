
const Product = require('../model/product.model');
const Category = require('../model/category.model');
const AppError = require('../utilites/appError.util');
const catchAsync = require('../utilites/catchAsync.util');
const cache = require('../utilites/chache.util');
const logger = require('../utilites/logger.util');
const slugify = require('../utilites/slug.util');
const paginateQuery = require('../utilites/pagination.util');
const escapeRegex = require('../utilites/escapeRegex.util');

const isId = (v) => /^[a-f\d]{24}$/i.test(v);
const isAdmin = (req) => req.user?.role === 'admin';

// Get active, non-deleted categories
const visibleFilter = async () => {
    const categories = await Category.find({
        isActive: true,
        isDeleted: false
    }).distinct('_id');

    return {
        isActive: true,
        isDeleted: false,
        category: { $in: categories }
    };
};



exports.getProducts = catchAsync(async (req, res) => {
    const all = isAdmin(req) && req.query.all === 'true';
    const cacheKey = all ? null : `products:${req.originalUrl}`;

    if (cacheKey) {
        const cached = cache.get(cacheKey);

        if (cached) {
            logger.warn('user cached products');

            return res.status(200).json({
                ...cached,
                cached: true
            });
        }
    }

    const filter = all ? {} : await visibleFilter();
    const q = req.query;

    if (q.search) {
        filter.name = {
            $regex: escapeRegex(q.search),
            $options: 'i'
        };
    }

    if (q.category) {
        const category = await Category.findOne(
            isId(q.category)
                ? { _id: q.category }
                : { slug: q.category }
        );

        filter.$and = [
            ...(filter.$and || []),
            { category: category ? category._id : null }
        ];
    }

    if (q.trending === 'true') {
        filter.isTrending = true;
    }

    if (q.inStock === 'true') {
        filter.stock = { $gt: 0 };
    }

    if (q.minPrice || q.maxPrice) {
        filter.price = {};

        if (q.minPrice) {
            filter.price.$gte = Number(q.minPrice);
        }

        if (q.maxPrice) {
            filter.price.$lte = Number(q.maxPrice);
        }
    }

    const sortable = ['price', 'createdAt', 'name'];
    const sortBy = sortable.includes(q.sort)
        ? q.sort
        : 'createdAt';

    const order = q.order === 'asc' ? 1 : -1;
const { page, limit, skip } = paginateQuery(req);

let data;
let total;

try {
data = await Product.find(filter)
    .sort({ [sortBy]: order })
    .skip(skip)
    .limit(limit)
    .populate('category', 'name slug')
    .lean();
} catch (error) {
    console.error('PRODUCT FIND ERROR:', error.message);
    throw error;
}

try {
    total = await Product.countDocuments(filter);
} catch (error) {
    console.error('PRODUCT COUNT ERROR:', error.message);
    throw error;
}


    const body = {
        message: 'products list',
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
        data
    };

    if (cacheKey) {
        cache.set(cacheKey, body);
    }

    logger.info('user listed products');

    res.status(200).json(body);
});


// Get one product by slug

exports.getProductBySlug = catchAsync(async (req, res, next) => {
    const slug = req.params.slug;

    const filter = isAdmin(req)
        ? { slug }
        : {
            slug,
            ...(await visibleFilter())
        };

    const product = await Product.findOne(filter)
        .populate('category', 'name slug');

    if (!product) {
        return next(
            new AppError(`can't find product with slug:${slug}`, 404)
        );
    }

    res.status(200).json({
        message: `get product by slug:${slug}`,
        data: product
    });
});


// Get related products from the same category

exports.getRelatedProducts = catchAsync(async (req, res, next) => {
    const slug = req.params.slug;

    const current = await Product.findOne({ slug });

    if (!current) {
        return next(
            new AppError(`can't find product with slug:${slug}`, 404)
        );
    }

    const filter = {
        ...(await visibleFilter()),
        category: current.category,
        _id: { $ne: current._id }
    };

    const data = await Product.find(filter)
        .limit(8)
        .populate('category', 'name slug');

    res.status(200).json({
        message: `get related products by slug:${slug}`,
        data
    });
});


// Check that the category exists and is not deleted

const checkCategory = async (categoryId) => {
    const category = await Category.findOne({
        _id: categoryId,
        isDeleted: false
    });

    if (!category) {
        throw new AppError('category not found', 404);
    }
};


// Add product

exports.addProduct = catchAsync(async (req, res) => {
    const {
        name,
        price,
        desc,
        stock,
        category,
        isTrending,
        isActive
    } = req.body;

    if (!name || price === undefined || !category) {
        throw new AppError(
            'name, price and category are required',
            400
        );
    }

    if (!req.file) {
        throw new AppError('product image (img) is required', 400);
    }

    await checkCategory(category);

    const product = await Product.create({
        name,
        desc,
        price,
        stock,
        slug: slugify(req.body.slug || name),
        category,
        isTrending,
        isActive,
        imgURL: req.file.filename
    });

    cache.flushAll();

    logger.info(
        `admin: ${req.user.email} created product: ${product._id}`
    );

    res.status(201).json({
        message: 'product created',
        data: product
    });
});


// Update product

exports.updateProduct = catchAsync(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        throw new AppError('product not found', 404);
    }

    const fields = [
        'name',
        'desc',
        'price',
        'stock',
        'isTrending',
        'isActive',
        'category'
    ];

    fields.forEach((field) => {
        if (req.body[field] !== undefined) {
            product[field] = req.body[field];
        }
    });

    if (req.body.slug !== undefined) {
        product.slug = slugify(req.body.slug);
    }

    if (req.file) {
        product.imgURL = req.file.filename;
    }

    if (req.body.category !== undefined) {
        await checkCategory(product.category);
    }

    await product.save();

    cache.flushAll();

    logger.info(
        `admin: ${req.user.email} updated product: ${product._id}`
    );

    res.status(200).json({
        message: 'product updated',
        data: product
    });
});


// Soft delete product

exports.deleteProduct = catchAsync(async (req, res) => {
    const product = await Product.findByIdAndUpdate(
        req.params.id,
        { isDeleted: true },
        { new: true }
    );

    if (!product) {
        throw new AppError('product not found', 404);
    }

    cache.flushAll();

    logger.info(
        `admin: ${req.user.email} deleted product: ${product._id}`
    );

    res.status(200).json({
        message: 'product deleted',
        data: product
    });
});


// Restore deleted product

exports.restoreProduct = catchAsync(async (req, res) => {
    const product = await Product.findByIdAndUpdate(
        req.params.id,
        { isDeleted: false },
        { new: true }
    );

    if (!product) {
        throw new AppError('product not found', 404);
    }

    cache.flushAll();

    res.status(200).json({
        message: 'product restored',
        data: product
    });
});



