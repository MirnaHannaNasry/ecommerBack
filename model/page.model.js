const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
    key: { type: String, enum: ['policy', 'about', 'contact'], unique: true, required: true },
    title: { type: String, required: true },
    content: { type: String, default: '' },
    contact: {                    
        email: String,
        phone: String,
        whatsapp: String,
        address: String,
        facebook: String,
        instagram: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Page', pageSchema);
