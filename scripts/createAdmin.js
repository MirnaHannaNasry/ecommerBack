
require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../model/user.model');

const createAdmin = async () => {
    try {
        console.log('Starting admin creation...');

        const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const password = process.env.ADMIN_PASSWORD;

        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is missing from .env');
        }

        if (!email || !password) {
            throw new Error('ADMIN_EMAIL or ADMIN_PASSWORD is missing from .env');
        }

        if (password.length < 8) {
            throw new Error('Admin password must be at least 8 characters');
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            console.log('This user already exists');
            console.log('Current role:', existingUser.role);
            console.log('No changes were made to the existing user.');
            return;
        }

        const admin = await User.create({
            name: 'Store Admin',
            email,
            password,   // hashed by the model's pre-save hook
            role: 'admin'
        });

        console.log('Admin created successfully');
        console.log('Admin ID:', admin._id.toString());
        console.log('Admin email:', admin.email);
        console.log('Admin role:', admin.role);

    } catch (error) {
        console.error('Admin creation failed:', error.message);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log('MongoDB connection closed');
        }
    }
};

createAdmin();
