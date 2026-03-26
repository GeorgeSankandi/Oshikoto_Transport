const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    price: {
        type: Number,
        required: false, 
        default: 0
    },
    imageUrl: {
        type: String,
        default: '/images/default-service.png'
    },
    // Fleet Documents (PDFs)
    fleetDocs: [
        {
            name: { type: String },
            url: { type: String },
            checklist: [
                {
                    item: { type: String },
                    category: { type: String, default: 'General' }
                }
            ]
        }
    ],
    // Optional per-service checklist template
    checklistTemplate: {
        type: Object,
        default: {}
    },
    // Interactive Work Ticket template data
    workTicketTemplate: {
        type: Object,
        default: {}
    },
    // Tracks if a clerk has edited this specific template
    clerkHasEditedTemplate: {
        type: Boolean,
        default: false
    },
    lastEditedByClerkName: {
        type: String,
        default: null
    },
    lastEditedByClerkDate: {
        type: Date,
        default: null
    },
    // NEW: Array to track the last 10 edits
    editHistory: [
        {
            editorName: String,
            editorRole: String,
            editedAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    onSale: {
        type: Boolean,
        default: false
    },
    saleEndDate: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create a text index for the chatbot's context search
ServiceSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Service', ServiceSchema);
