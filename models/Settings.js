const mongoose = require('mongoose');

const settingsSchema = mongoose.Schema({
    officeLocation: {
        lat: {
            type: Number,
            required: true,
            default: 20.5937 // Default to India center
        },
        lng: {
            type: Number,
            required: true,
            default: 78.9629
        },
        radius: {
            type: Number,
            required: true,
            default: 100 // Default 100 meters
        }
    }
}, {
    timestamps: true
});

// We generally only want one settings document
module.exports = mongoose.model('Settings', settingsSchema);
