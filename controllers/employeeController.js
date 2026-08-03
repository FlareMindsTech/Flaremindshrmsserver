const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

        // Assuming req.user is populated by auth middleware
        // req.user = { id: '...', role: '...' }
        const requester = req.user;

        const foundEmployee = await Employee.findById(employeeId);

        if (!foundEmployee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Logic: Employee can only edit their own profile
        // Admin/Manager can edit any employee
        const isSelf = requester.id === employeeId;
        const isAdminOrManager = ['admin', 'manager'].includes(requester.role);

        if (!isSelf && !isAdminOrManager) {
            return res.status(403).json({ message: 'Not authorized to update this profile' });
        }



        // Fields allowed for Employee (and Admin of course)
        if (name) foundEmployee.name = name;
        if (email) foundEmployee.email = email;
        if (password) foundEmployee.password = password; // Should be hashed in real app
        if (otherDetails.profileImage) foundEmployee.profileImage = otherDetails.profileImage;

        // Other details
        if (otherDetails.phone) foundEmployee.phone = otherDetails.phone;
        if (otherDetails.address) foundEmployee.address = otherDetails.address;
        if (otherDetails.department) foundEmployee.department = otherDetails.department;

        // Allow updating homeLocation (Self or Admin) - WFH Feature
        if (otherDetails.homeLocation) {
            const { latitude, longitude, address, radius } = otherDetails.homeLocation;
            foundEmployee.homeLocation = {
                latitude: Number(latitude),
                longitude: Number(longitude),
                address: String(address),
                radius: Number(radius) || 100
            };
            // console.log('Updating homeLocation:', foundEmployee.homeLocation);
        }

        // Location Update Limit (Admin/Manager only)
        if (otherDetails.requiredLocation) {
            if (isAdminOrManager) {
                foundEmployee.requiredLocation = otherDetails.requiredLocation;
            } else {
                // Optional: return error or just ignore. 
                // Returning error is safer to let them know they can't do it.
                if (isSelf) return res.status(403).json({ message: 'Employees cannot update their own required location' });
            }
        }

        const updatedEmployee = await foundEmployee.save();

        res.json(updatedEmployee);

    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    updateEmployeeProfile,
    loginEmployee,
    getEmployeeProfile
};
