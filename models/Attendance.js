const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
    },
    date: {
        type: Date,
        required: true,
        // Usually store just the date part, or a timestamp normalized to midnight
    },
    checkIn: {
        type: Date,
    },
    checkOut: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Leave', 'Half-Day', 'Work From Home'],
        default: 'Absent',
    },
    device: {
        type: String,
        default: 'Desktop' // Default to Desktop, Mobile will override
    },
    checkInLocation: {
        latitude: Number,
        longitude: Number
    },
    checkInPhoto: {
        type: String, // Path or URL to the uploaded image
    },
    isLocationVerified: {
        type: Boolean,
        default: false,
    },
    notes: {
        type: String,
    },
    // Hourly WFH Logs
    wfhLogs: [{
        time: { type: Date, default: Date.now },
        location: {
            latitude: Number,
            longitude: Number
        },
        photo: String,
        isVerified: Boolean,
        notes: String
    }]
}, { timestamps: true });

// Prevent duplicate attendance records for the same employee on the same date
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
