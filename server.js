const dotenv = require('dotenv');
dotenv.config();
const AppError= require('./utilites/appError.util');
const express = require('express');
const app = express();
const port = process.env.PORT;
const dbConfig = require('./config/db.config');
dbConfig.connectDB();

const corsMiddleware = require('./middlewares/cors.middleware');

app.use(corsMiddleware);

app.use(express.json());
const path= require('path')

app.use('/files', express.static(path.join(__dirname, 'uploads')));

app.use('/api/v1/auth', require('./routes/auth.route'));
app.use('/api/v1/user', require('./routes/user.route'));
app.use('/api/v1/category', require('./routes/category.route'));
app.use('/api/v1/product', require('./routes/product.route'));
app.use('/api/v1/cart', require('./routes/cart.route'));
app.use('/api/v1/order', require('./routes/order.route'));
app.use('/api/v1/testimonial', require('./routes/testimonial.route'));
app.use('/api/v1/faq', require('./routes/feq.route'));
app.use('/api/v1/page', require('./routes/page.route'));
app.use('/api/v1/report', require('./routes/report.route'));

app.use((req,res,next)=>{
next(new AppError(`Can't find "${req.originalUrl}"`,404))
})

app.use(require('./middlewares/errorHandler.middleware'));


app.listen(port,_=> console.log(`Server started at ${port}`));



