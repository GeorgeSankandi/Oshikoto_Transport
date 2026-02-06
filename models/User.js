const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['client', 'provider', 'admin', 'clerk'], // MODIFIED
        default: 'client'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Password hashing middleware --- THIS IS THE FIX ---
// The `next()` call has been removed. In async middleware, the function
// automatically continues when the promise resolves.
UserSchema.pre('save', async function() {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return;
    }
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        // If an error occurs during hashing, we should stop the save operation
        // by passing the error to the next middleware in the chain.
        // In this case, we'll let Mongoose handle it by throwing the error.
        console.error('Error hashing password:', err);
        throw err;
    }
});

module.exports = mongoose.model('User', UserSchema);