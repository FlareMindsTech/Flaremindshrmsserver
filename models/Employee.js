const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    // Account Details
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profileImage: {
        url: { type: String },
        publicId: { type: String }
    }, // Cloudinary URL

    // Personal Information
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },
    bloodGroup: { type: String },
    fatherName: { type: String },
    motherName: { type: String },

    // Contact Information
    phone: { type: String, required: true },
    personalEmail: { type: String },
    emergencyContact: {
        name: { type: String },
        relation: { type: String },
        phone: { type: String }
    },

    // Address Details
    currentAddress: { type: String },
    permanentAddress: { type: String },

    // Identity Proofs
    aadharNumber: { type: String },
    panNumber: { type: String },

    // Professional Details
    department: { type: String },
    designation: { type: String }, // Equivalent to Role in business terms

    employmentType: { type: String, enum: ['Full-Time', 'Part-Time', 'Contract', 'Intern'], default: 'Full-Time' },
    joiningDate: { type: Date },
    status: { type: String, enum: ['Active', 'Inactive', 'Terminated'], default: 'Active' },
    salary: { type: Number },

    // Bank Details
    bankDetails: {
        accountName: { type: String },
        accountNumber: { type: String },
        ifscCode: { type: String },
        bankName: { type: String }
    },

    // Geofencing
    requiredLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        radius: { type: Number, default: 100 }
    },
    // WFH Location
    homeLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String },
        radius: { type: Number, default: 100 } // Default 500m for home
    }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
