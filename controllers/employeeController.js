const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const cloudinary = require('../config/couldinary.js');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

// @desc    Auth Employee & get token
// @route   POST /api/employees/login
// @access  Public
const loginEmployee = async (req, res) => {
    const { email, password } = req.body;

    try {
        const employee = await Employee.findOne({ email });

        if (employee && (await bcrypt.compare(password, employee.password))) {
            if (employee.status === 'Inactive') {
                return res.status(403).json({ message: 'Your account is inactive please contact Admin' });
            }

            res.json({
                _id: employee.id,
                name: employee.name,
                email: employee.email,
                token: generateToken(employee.id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current employee profile
// @route   GET /api/employees/profile
// @access  Private
const getEmployeeProfile = async (req, res) => {
    // req.user is set by auth middleware
    const employee = await Employee.findById(req.user.id);

    if (employee) {
        const employeeData = employee.toObject();
        delete employeeData.password; // Remove password from response
        res.json(employeeData);
    } else {
        res.status(404).json({ message: 'Employee not found' });
    }
};

// @desc    Update employee profile
// @route   PUT /api/employees/:id
// @access  Private (Admin/Manager/Employee)
const updateEmployeeProfile = async (req, res) => {
    try {
        const { name, email, password, ...otherDetails } = req.body;
        const employeeId = req.params.id;

        const requester = req.user;

        const foundEmployee = await Employee.findById(employeeId);

        if (!foundEmployee) {
            return res.status(404).json({
                message: 'Employee not found'
            });
        }

        // Employee can only edit their own profile
        // Admin/Manager can edit any employee
        const isSelf = requester.id === employeeId;
        const isAdminOrManager = ['admin', 'manager'].includes(requester.role);

        if (!isSelf && !isAdminOrManager) {
            return res.status(403).json({
                message: 'Not authorized to update this profile'
            });
        }

        // Account details
        if (name) {
            foundEmployee.name = name;
        }

        if (email) {
            foundEmployee.email = email;
        }

        // Hash password before saving
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            foundEmployee.password = hashedPassword;
        }

        // Other details
        if (otherDetails.phone) {
            foundEmployee.phone = otherDetails.phone;
        }

        if (otherDetails.address) {
            foundEmployee.address = otherDetails.address;
        }

        if (otherDetails.department) {
            foundEmployee.department = otherDetails.department;
        }

        // Allow updating homeLocation (Self or Admin) - WFH Feature
        if (otherDetails.homeLocation) {
            const {
                latitude,
                longitude,
                address,
                radius
            } = otherDetails.homeLocation;

            foundEmployee.homeLocation = {
                latitude: Number(latitude),
                longitude: Number(longitude),
                address: String(address),
                radius: Number(radius) || 100
            };
        }

        // Location Update Limit (Admin/Manager only)
        if (otherDetails.requiredLocation) {
            if (isAdminOrManager) {
                foundEmployee.requiredLocation = otherDetails.requiredLocation;
            } else {
                return res.status(403).json({
                    message: 'Employees cannot update their own required location'
                });
            }
        }

        const updatedEmployee = await foundEmployee.save();

        res.json(updatedEmployee);

    } catch (error) {
        console.error('Update Profile Error:', error);

        res.status(500).json({
            message: 'Server Error',
            error: error.message
        });
    }
};
const uploadProfileImage = async (req, res) => {
    try {
        const employeeId = req.params.id;


        if (!req.file) {
            return res.status(400).json({
                message: 'No image file provided'
            });
        }

        const employee = await Employee.findById(employeeId);



        if (!employee) {
            return res.status(404).json({
                message: 'Employee not found'
            });
        }



        const requester = req.user;

        const isSelf = requester.id === employeeId;
        const isAdminOrManager = ['admin', 'manager'].includes(requester.role);

        if (!isSelf && !isAdminOrManager) {
            return res.status(403).json({
                message: 'Not authorized to update this profile image'
            });
        }

        const oldPublicId = employee.profileImage?.publicId;

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'hrms/profile-images',
                resource_type: 'image'
            },
            async (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);

                    return res.status(500).json({
                        message: 'Failed to upload profile image'
                    });
                }

                try {
                    employee.profileImage = {
                        url: result.secure_url,
                        publicId: result.public_id
                    };

                    await employee.save();

                } catch (databaseError) {

                    console.error('Failed to save profile image to database:', databaseError);

                    // MongoDB failed, so remove the newly uploaded Cloudinary image
                    try {
                        await cloudinary.uploader.destroy(result.public_id);
                        console.log('New Cloudinary image cleaned up:', result.public_id);
                    } catch (cleanupError) {
                        console.error('Failed to clean up new Cloudinary image:', cleanupError);
                    }

                    return res.status(500).json({
                        message: 'Failed to save profile image'
                    });
                }

                if (oldPublicId) {
                    try {
                        await cloudinary.uploader.destroy(oldPublicId);
                        console.log('Old profile image deleted:', oldPublicId);
                    } catch (deleteError) {
                        console.error(
                            'Failed to delete old profile image:',
                            deleteError
                        );
                    }
                }

                res.json({
                    message: 'Profile image uploaded successfully',
                    profileImage: employee.profileImage
                });
            }
        );

        uploadStream.end(req.file.buffer);

    } catch (error) {
        console.error('Upload Profile Image Error:', error);

        res.status(500).json({
            message: 'Server Error',
            error: error.message
        });
    }
};

module.exports = {
    updateEmployeeProfile,
    loginEmployee,
    getEmployeeProfile,
    uploadProfileImage
};
