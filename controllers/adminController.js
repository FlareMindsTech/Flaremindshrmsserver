const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const Settings = require('../models/Settings');
const bcrypt = require('bcryptjs'); // You might need to install bcryptjs if not already
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

// @desc    Register new admin (Only specific admins can do this, or first run)
// @route   POST /api/admin/register-admin
// @access  Private (Admin)
const registerAdmin = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        // Check if any admin exists
        const adminCount = await Admin.countDocuments();

        // If admins exist, ensure the requester is an admin
        if (adminCount > 0) {
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Not authorized. Only Admins can create new Admins/Managers.' });
            }
        }

        const adminExists = await Admin.findOne({ email });

        if (adminExists) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const admin = await Admin.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'admin',
        });

        if (admin) {
            res.status(201).json({
                _id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                message: 'Admin created successfully'
            });
        } else {
            res.status(400).json({ message: 'Invalid admin data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register new employee (Only Admin can do this)
// @route   POST /api/admin/register-employee
// @access  Private (Admin)
const registerEmployee = async (req, res) => {
    const {
        name, email, password,
        phone, dob, gender, maritalStatus, bloodGroup, fatherName, motherName,
        currentAddress, permanentAddress,
        aadharNumber, panNumber,
        department, designation, role, employmentType, joiningDate, status, salary,
        bankDetails, emergencyContact, requiredLocation
    } = req.body;

    // Check auth
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized. Only Admins can create Employees.' });
    }

    try {
        const employeeExists = await Employee.findOne({ email });
        if (employeeExists) {
            return res.status(400).json({ message: 'Employee with this email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const employee = await Employee.create({
            // Account
            name, email, password: hashedPassword,

            // Personal
            dob, gender, maritalStatus, bloodGroup, fatherName, motherName,

            // Contact
            phone, emergencyContact,

            // Address
            currentAddress, permanentAddress,

            // Identity
            aadharNumber, panNumber,

            // Professional
            department,
            designation: designation || 'Employee', // Default designation
            employmentType, joiningDate, status, salary,

            // Bank
            bankDetails,

            // Location
            requiredLocation
        });

        if (employee) {
            res.status(201).json({
                _id: employee.id,
                name: employee.name,
                email: employee.email,
                message: 'Employee created successfully'
            });
        } else {
            res.status(400).json({ message: 'Invalid employee data' });
        }

    } catch (error) {
        console.error(error); // Log error for debugging
        res.status(500).json({ message: error.message });
    }
}

// @desc    Authenticate a admin
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email });

        if (admin && (await bcrypt.compare(password, admin.password))) {
            res.json({
                _id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                token: generateToken(admin.id),
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all employees
// @route   GET /api/admin/employees
// @access  Private (Admin/Manager)
const getAllEmployees = async (req, res) => {
    try {
        const employees = await Employee.find({}).select('-password');
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Get single employee by ID
// @route   GET /api/admin/employees/:id
// @access  Private (Admin)
const getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).select('-password');
        if (employee) {
            res.json(employee);
        } else {
            res.status(404).json({ message: 'Employee not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Update employee by ID (Admin)
// @route   PUT /api/admin/employees/:id
// @access  Private (Admin)
const updateEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const {
            name, email, password,
            phone, dob, gender, maritalStatus, bloodGroup, fatherName, motherName,
            currentAddress, permanentAddress,
            aadharNumber, panNumber,
            department, designation, role, employmentType, joiningDate, status, salary,
            bankDetails, emergencyContact, requiredLocation, profileImage
        } = req.body;

        // Update fields if provided
        if (name) employee.name = name;
        if (email) employee.email = email;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            employee.password = await bcrypt.hash(password, salt);
        }

        // Helper to update if value exists
        const updateIf = (val, field) => { if (val !== undefined) employee[field] = val; };

        updateIf(phone, 'phone');
        updateIf(dob, 'dob');
        updateIf(gender, 'gender');
        updateIf(maritalStatus, 'maritalStatus');
        updateIf(bloodGroup, 'bloodGroup');
        updateIf(fatherName, 'fatherName');
        updateIf(motherName, 'motherName');

        // Address objects - merge or replace? Replace is simpler for Admin edits
        if (currentAddress) employee.currentAddress = currentAddress;
        if (permanentAddress) employee.permanentAddress = permanentAddress;

        updateIf(aadharNumber, 'aadharNumber');
        updateIf(panNumber, 'panNumber');

        updateIf(department, 'department');
        updateIf(designation, 'designation');
        updateIf(role, 'role');
        updateIf(employmentType, 'employmentType');
        updateIf(joiningDate, 'joiningDate');
        updateIf(status, 'status');
        updateIf(salary, 'salary');
        updateIf(profileImage, 'profileImage');

        if (bankDetails) employee.bankDetails = bankDetails;
        if (emergencyContact) employee.emergencyContact = emergencyContact;
        if (requiredLocation) employee.requiredLocation = requiredLocation;

        const updatedEmployee = await employee.save();
        res.json(updatedEmployee);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Delete employee
// @route   DELETE /api/admin/employees/:id
// @access  Private (Admin only)
const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);

        if (employee) {
            await employee.deleteOne();
            res.json({ message: 'Employee removed' });
        } else {
            res.status(404).json({ message: 'Employee not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Get Dashboard Statistics
// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
    try {
        const totalEmployees = await Employee.countDocuments();

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const presentToday = await require('../models/Attendance').countDocuments({
            date: { $gte: startOfDay },
            status: 'Present' // Or check if checkIn exists
        });

        // Calculate absent (Total - Present) - simplistic approach
        // Only count established employees
        const absentToday = Math.max(0, totalEmployees - presentToday);

        // Late Arrivals (e.g., after 9:30 AM)
        const lateThreshold = new Date();
        lateThreshold.setHours(9, 30, 0, 0);

        const lateArrivals = await require('../models/Attendance').countDocuments({
            date: { $gte: startOfDay },
            checkIn: { $gt: lateThreshold }
        });

        // Device Stats (User Counts)
        // Desktop = Admins & Managers
        const desktopCount = await Admin.countDocuments();

        // Personal Device = Employees (App Users)
        const mobileCount = await Employee.countDocuments();

        // Recent Activity (Last 5 check-ins - TODAY ONLY)
        const recentActivity = await require('../models/Attendance').find({
            date: { $gte: startOfDay }
        })
            .sort({ checkIn: -1 })
            .limit(5)
            .populate('employeeId', 'name');

        // Recent Check-outs (Last 5 check-outs - TODAY ONLY)
        const recentCheckOuts = await require('../models/Attendance').find({
            date: { $gte: startOfDay },
            checkOut: { $exists: true }
        })
            .sort({ checkOut: -1 })
            .limit(5)
            .populate('employeeId', 'name');

        // Active Employees (Status = Active)
        const activeEmployees = await Employee.countDocuments({ status: 'Active' });

        // Time Stats Aggregation
        const timeStats = await require('../models/Attendance').aggregate([
            { $match: { date: { $gte: startOfDay }, status: 'Present' } },
            {
                $project: {
                    hour: { $hour: "$checkIn" },
                    minute: { $minute: "$checkIn" }
                }
            },
            {
                $bucket: {
                    groupBy: { $add: [{ $multiply: ["$hour", 60] }, "$minute"] }, // Convert time to total minutes
                    boundaries: [0, 540, 570, 600, 660], // 0, 9:00(540), 9:30(570), 10:00(600), 11:00(660)
                    default: "after_11", // > 11:00
                    output: { count: { $sum: 1 } }
                }
            }
        ]);

        // Format stats for frontend
        const inTimeStatsMap = {
            0: { name: 'Before 9:00', fill: '#84cc16' },
            540: { name: '9:00 - 9:30', fill: '#3b82f6' },
            570: { name: '9:30 - 10:00', fill: '#eab308' },
            600: { name: '10:00 - 11:00', fill: '#f97316' },
            "after_11": { name: 'After 11:00', fill: '#ef4444' }
        };

        const inTimeStats = timeStats.map(bucket => ({
            name: inTimeStatsMap[bucket._id]?.name || 'Unknown',
            value: bucket.count,
            fill: inTimeStatsMap[bucket._id]?.fill || '#94a3b8'
        })).sort((a, b) => {
            const order = ['Before 9:00', '9:00 - 9:30', '9:30 - 10:00', '10:00 - 11:00', 'After 11:00'];
            return order.indexOf(a.name) - order.indexOf(b.name);
        });

        // Ensure all categories exist even if 0 (Optional, but good for consistent chart colors)
        const allCategories = [
            { name: 'Before 9:00', fill: '#84cc16' },
            { name: '9:00 - 9:30', fill: '#3b82f6' },
            { name: '9:30 - 10:00', fill: '#eab308' },
            { name: '10:00 - 11:00', fill: '#f97316' },
            { name: 'After 11:00', fill: '#ef4444' }
        ];

        const finalInTimeStats = allCategories.map(cat => {
            const found = inTimeStats.find(s => s.name === cat.name);
            return {
                name: cat.name,
                value: found ? found.value : 0,
                fill: cat.fill
            };
        });

        // Trend Chart Aggregation (Cumulative Check-ins per Hour)
        // Buckets for 6 AM to 8 PM (typical work hours)
        const trendBuckets = {};
        for (let i = 6; i <= 20; i++) {
            const hour = i < 10 ? `0${i}:00` : `${i}:00`;
            trendBuckets[i] = { name: hour, present: 0 };
        }

        const allCheckInsToday = await require('../models/Attendance').find({
            date: { $gte: startOfDay },
            status: 'Present'
        }).select('checkIn');

        allCheckInsToday.forEach(record => {
            const hour = record.checkIn.getHours();
            if (hour >= 6 && hour <= 20) {
                trendBuckets[hour].present += 1;
            }
        });

        // Convert to array and make cumulative
        let cumulativeCount = 0;
        const todayTrend = Object.values(trendBuckets).map(bucket => {
            cumulativeCount += bucket.present;
            return { name: bucket.name, present: cumulativeCount };
        });

        res.json({
            totalEmployees,
            activeEmployees,
            presentToday,
            absentToday,
            lateArrivals,
            recentActivity,
            recentCheckOuts,
            desktopCount,
            mobileCount,
            inTimeStats: finalInTimeStats,
            todayTrend
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get System Settings (Location)
// @route   GET /api/admin/settings
// @access  Private (Admin)
const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();

        if (!settings) {
            // Create default settings if not exists
            settings = await Settings.create({});
        }

        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update System Settings (Location)
// @route   PUT /api/admin/settings
// @access  Private (Admin)
const updateSettings = async (req, res) => {
    const { lat, lng, radius } = req.body;

    try {
        let settings = await Settings.findOne();

        if (!settings) {
            settings = await Settings.create({
                officeLocation: { lat, lng, radius }
            });
        } else {
            settings.officeLocation = {
                lat: lat || settings.officeLocation.lat,
                lng: lng || settings.officeLocation.lng,
                radius: radius || settings.officeLocation.radius
            };
            await settings.save();
        }

        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Users by Category for Dashboard Details
// @route   GET /api/admin/users-by-category
// @access  Private (Admin)
const getUsersByCategory = async (req, res) => {
    const { category } = req.query;

    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        let users = [];

        switch (category) {
            case 'active_employees':
                users = await Employee.find({ status: 'Active' }).select('-password');
                break;
            case 'web_admins':
                users = await Admin.find({}).select('-password');
                break;
            case 'app_users':
                users = await Employee.find({}).select('-password');
                break;
            case 'present_today':
                const presentRecords = await require('../models/Attendance').find({
                    date: { $gte: startOfDay },
                    status: 'Present'
                }).populate('employeeId', 'name email profileImage department designation');
                users = presentRecords.map(record => ({
                    ...record.employeeId._doc,
                    checkIn: record.checkIn
                }));
                break;
            case 'late_arrivals':
                const lateThreshold = new Date();
                lateThreshold.setHours(9, 30, 0, 0);
                const lateRecords = await require('../models/Attendance').find({
                    date: { $gte: startOfDay },
                    checkIn: { $gt: lateThreshold }
                }).populate('employeeId', 'name email profileImage department designation');
                users = lateRecords.map(record => ({
                    ...record.employeeId._doc,
                    checkIn: record.checkIn
                }));
                break;
            case 'absent_today':
                // Get all active employees
                const allEmployees = await Employee.find({ status: 'Active' }).select('_id name email profileImage department designation');
                // Get employees present today
                const attendedToday = await require('../models/Attendance').find({
                    date: { $gte: startOfDay }
                }).distinct('employeeId');

                // Filter out those who attended
                users = allEmployees.filter(emp => !attendedToday.some(attId => attId.toString() === emp._id.toString()));
                break;
            default:
                return res.status(400).json({ message: 'Invalid category' });
        }

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Daily Attendance Log (All records for today)
// @route   GET /api/admin/daily-log
// @access  Private (Admin)
const getDailyAttendance = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const records = await require('../models/Attendance').find({
            date: { $gte: startOfDay }
        })
            .sort({ checkIn: -1 })
            .populate('employeeId', 'name email profileImage designation department');

        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    registerAdmin,
    registerEmployee,
    loginAdmin,
    getAllEmployees,
    getEmployeeById,
    updateEmployeeById,
    deleteEmployee,
    getDashboardStats,
    getSettings,
    updateSettings,
    getUsersByCategory,
    getDailyAttendance
};
