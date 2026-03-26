const mongoose = require('mongoose');

const ChecklistSchema = new mongoose.Schema({
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
        unique: true
    },
    items: [
        {
            item: {
                type: String
            },
            category: {
                type: String,
                default: 'General'
            },
            completed: {
                type: Boolean,
                default: false
            },
            completedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            completedAt: {
                type: Date
            }
        }
    ],
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Checklist', ChecklistSchema);
