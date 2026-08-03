const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String, // The content of the report
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'viewed', 'Reviewed', 'Approved'],
        default: 'Pending',
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin', // Admin or Manager reviews it
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    lastEditedAt: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
