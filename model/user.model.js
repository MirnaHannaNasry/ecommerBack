const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const addressSchema = new mongoose.Schema({
    label: { type: String, trim: true },          // e.g. Home / Work
    governorate: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    isDefault: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true
    },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    addresses: [addressSchema],
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isBlocked: { type: Boolean, default: false }
}, {
    timestamps: true
});

// Always keep exactly one default address (if the user has any)
userSchema.pre('validate', function () {
    if (!this.addresses?.length) return;
    const defaults = this.addresses.filter(a => a.isDefault);
    if (defaults.length === 0) {
        this.addresses[0].isDefault = true;
    } else if (defaults.length > 1) {
        // keep the last one that was marked as default
        defaults.slice(0, -1).forEach(a => { a.isDefault = false; });
    }
});

userSchema.pre('save', async function () {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});

userSchema.methods.isCorrectPassword = async function (inputPassword) {
    return await bcrypt.compare(inputPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
