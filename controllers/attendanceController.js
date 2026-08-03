const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { calculateDistance } = require('../utils/geoUtils');

// @desc    Check In
// @route   POST /api/attendance/check-in
// @access  Private
const checkIn = async (req, res) => {
    const userId = req.user.id;
    // req.body fields might be strings if coming from form-data
    const { latitude, longitude, device, status: providedStatus, notes } = req.body;
    const file = req.file; // From multer

    try {
        const employee = await Employee.findById(userId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        let status = providedStatus || 'Present';

        // Validation Logic
        if (status === 'Leave') {
            if (!notes) {
                return res.status(400).json({ message: 'Notes are compulsory for Leave' });
            }
            // Location and Photo are optional for Leave
        } else {
            // For Present, WFH, Half-Day -> Location and Photo are required
            if (!latitude || !longitude || !file) {
                return res.status(400).json({ message: 'Please provide location (lat, lng) and a photo' });
            }
        }

        // Check if already checked in today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const existingAttendance = await Attendance.findOne({
            employeeId: userId,
            date: { $gte: startOfDay }
        });

        // WFH HOURLY CHECK-IN LOGIC
        if (existingAttendance && existingAttendance.status === 'Work From Home' && providedStatus === 'Work From Home') {
            // Verify Location again for this hourly ping
            const homeLoc = employee.homeLocation;
            let isHourlyVerified = false;

            if (homeLoc && homeLoc.latitude) {
                const dist = calculateDistance(
                    parseFloat(latitude), parseFloat(longitude),
                    homeLoc.latitude, homeLoc.longitude
                );
                if (dist <= (homeLoc.radius || 500)) isHourlyVerified = true;
            }

            // Add to wfhLogs
            existingAttendance.wfhLogs.push({
                time: new Date(),
                location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
                photo: file ? file.path : null, // Optional for hourly? Let's say yes for now
                isVerified: isHourlyVerified,
                notes: notes
            });

            await existingAttendance.save();
            return res.status(200).json({ message: 'Hourly WFH verification recorded', attendance: existingAttendance });
        }

        if (existingAttendance) {
            return res.status(400).json({ message: 'Already checked in for today' });
        }

        // Fetch Employee to get required location
        // const employee = await Employee.findById(userId); // Moved to top

        // Valid statuses that allow remote check-in
        const remoteStatuses = ['Work From Home', 'Leave', 'Half-Day'];

        if (remoteStatuses.includes(status)) {
            // "Leave" bypasses location check (from previous step)
            if (status === 'Leave') {
                isVerified = true;
            } else if (status === 'Work From Home') {
                // WFH Enforcement: Must be at Home Location
                if (employee.homeLocation && employee.homeLocation.latitude) {
                    const dist = calculateDistance(
                        parseFloat(latitude), parseFloat(longitude),
                        employee.homeLocation.latitude, employee.homeLocation.longitude
                    );
                    if (dist <= (employee.homeLocation.radius || 500)) {
                        isVerified = true;
                    } else {
                        return res.status(400).json({ message: 'You are not at your designated Home Location.' });
                    }
                } else {
                    // If no home location set, maybe allow but warn? Or strictly fail?
                    // Request says "employee full profile set to employee home location... employee check the employee set location ONLY condition"
                    // Implies strictness. If not set, they can't WFH? Or default allow?
                    // Let's assume if not set, we can't verify -> verified=true (benefit of doubt) OR verified=false.
                    // Let's go with verified=true BUT strictly implies we need to check IF set.
                    isVerified = true;
                }
            } else {
                // Half-Day or other remote types
                isVerified = true;
            }
        } else {
            // Standard Office Check-In
            // Location Verification Logic
            if (employee.requiredLocation && employee.requiredLocation.latitude) {
                const distance = calculateDistance(
                    parseFloat(latitude),
                    parseFloat(longitude),
                    employee.requiredLocation.latitude,
                    employee.requiredLocation.longitude
                );

                if (distance <= (employee.requiredLocation.radius || 100)) {
                    isVerified = true;
                } else {
                    status = 'Absent'; // "Employee not put the admin pining location... make absend"
                }
            } else {
                // If no location set by admin, verify by default
                isVerified = true;
            }
        }

        const attendanceData = {
            employeeId: userId,
            date: new Date(),
            checkIn: new Date(),
            device: device || 'Desktop',
            checkInLocation: {
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null
            },
            checkInPhoto: file ? file.path : null, // Handle optional photo
            isLocationVerified: isVerified,
            status: status,
            notes: notes
        };

        const attendance = await Attendance.create(attendanceData);

        res.status(201).json({
            attendance,
            message: status === 'Absent' ? 'Marked Absent due to incorrect location' : 'Checked in successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check Out
// @route   POST /api/attendance/check-out
// @access  Private
const checkOut = async (req, res) => {
    const userId = req.user.id;

    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            employeeId: userId,
            date: { $gte: startOfDay }
        });

        if (!attendance) {
            return res.status(400).json({ message: 'You have not checked in today' });
        }

        if (attendance.checkOut) {
            return res.status(400).json({ message: 'Already checked out' });
        }

        attendance.checkOut = new Date();
        await attendance.save();

        res.json(attendance);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my attendance
// @route   GET /api/attendance
// @access  Private
const getAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find({ employeeId: req.user.id }).sort({ date: -1 });
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all attendance (Admin)
// @route   GET /api/attendance/all
// @access  Private (Admin)
const getAllAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find({}).populate('employeeId', 'name email').sort({ date: -1 });
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Get monthly attendance sheet
// @route   GET /api/attendance/monthly
// @access  Admin
const getMonthlyAttendance = async (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ message: 'Please provide month and year' });
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month
        endDate.setHours(23, 59, 59, 999);

        // 1. Get all active employees
        const employees = await Employee.find({ status: 'Active' }).select('name department designation _id');

        // 2. Get attendance records for the range
        const attendanceRecords = await Attendance.find({
            date: {
                $gte: startDate,
                $lte: endDate
            }
        });

        // 3. Build the map
        // Format: { employeeId: { dateString: status } }
        const attendanceMap = {};

        attendanceRecords.forEach(record => {
            const dateStr = record.date.toISOString().split('T')[0];
            const empId = record.employeeId.toString();

            if (!attendanceMap[empId]) {
                attendanceMap[empId] = {};
            }
            // If there's a record, they were Present (or whatever status logic we want)
            // We can refine this later (e.g., check 'status' field if it exists, or check-in time)
            attendanceMap[empId][dateStr] = record.status || 'Present';
        });

        // 4. Transform for frontend
        const result = employees.map(emp => {
            const empId = emp._id.toString();
            return {
                _id: emp._id,
                name: emp.name,
                department: emp.department,
                designation: emp.designation,
                attendance: attendanceMap[empId] || {}
            };
        });

        res.json(result);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Get Daily Log for Admin
// @route   GET /api/attendance/daily-log
// @access  Admin
const getDailyLog = async (req, res) => {
    try {
        const { date } = req.query;

        let startOfDay, endOfDay;

        if (date) {
            // Split YYYY-MM-DD and create date in LOCAL time
            const [year, month, day] = date.split('-').map(Number);
            startOfDay = new Date(year, month - 1, day); // Local midnight
            startOfDay.setHours(0, 0, 0, 0); // Explicitly set to 00:00 local

            endOfDay = new Date(year, month - 1, day);
            endOfDay.setHours(23, 59, 59, 999); // Local 23:59
        } else {
            startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
        }

        const query = {
            date: { $gte: startOfDay }
        };

        // If specific date is requested, restrict the upper bound too
        if (date) {
            query.date.$lte = endOfDay;
        }

        const records = await Attendance.find(query)
            .sort({ checkIn: -1 })
            .populate('employeeId', 'name email profileImage designation department');

        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get yearly stats for an employee
// @route   GET /api/attendance/stats/:employeeId
// @access  Admin
const getEmployeeYearlyStats = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { year } = req.query;

        if (!year) {
            return res.status(400).json({ message: 'Please provide a year' });
        }

        const startDate = new Date(year, 0, 1); // Jan 1st
        const endDate = new Date(year, 11, 31, 23, 59, 59, 999); // Dec 31st

        const records = await Attendance.find({
            employeeId: employeeId,
            date: { $gte: startDate, $lte: endDate }
        });

        const stats = { P: 0, A: 0, WFH: 0, HD: 0, L: 0 };

        records.forEach(record => {
            const status = record.status || 'Present';
            if (status === 'Present') stats.P++;
            else if (status === 'Absent') stats.A++;
            else if (status === 'Work From Home') stats.WFH++;
            else if (status === 'Half-Day') stats.HD++;
            else if (status === 'Leave') stats.L++;
        });

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get yearly attendance summary for all employees
// @route   GET /api/attendance/yearly-summary
// @access  Admin
const getYearlyAttendanceSummary = async (req, res) => {
    try {
        const { year } = req.query;
        if (!year) {
            return res.status(400).json({ message: 'Please provide a year' });
        }

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

        // 1. Get all active employees
        const employees = await Employee.find({ status: 'Active' }).select('name department designation _id');

        // 2. Get all attendance records for the year
        const records = await Attendance.find({
            date: { $gte: startDate, $lte: endDate }
        });

        // 3. Aggregate stats per employee
        const summaryMap = {};

        employees.forEach(emp => {
            summaryMap[emp._id.toString()] = {
                _id: emp._id,
                name: emp.name,
                designation: emp.designation,
                department: emp.department,
                stats: { P: 0, A: 0, WFH: 0, HD: 0, L: 0 }
            };
        });

        records.forEach(record => {
            const empId = record.employeeId.toString();
            // Only count if employee exists (might be inactive/deleted, but we filtered for active above. 
            // If historical data includes deleted employees, we might miss them here unless we fetch all employees.
            // Requirement implies current active employees yearly report usually.
            if (summaryMap[empId]) {
                const status = record.status || 'Present';
                if (status === 'Present') summaryMap[empId].stats.P++;
                else if (status === 'Absent') summaryMap[empId].stats.A++;
                else if (status === 'Work From Home') summaryMap[empId].stats.WFH++;
                else if (status === 'Half-Day') summaryMap[empId].stats.HD++;
                else if (status === 'Leave') summaryMap[empId].stats.L++;
            }
        });

        // Convert map to array
        const result = Object.values(summaryMap);
        res.json(result);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    checkIn,
    checkOut,
    getAttendance,
    getAllAttendance,
    getMonthlyAttendance,
    getDailyLog,
    getEmployeeYearlyStats,
    getYearlyAttendanceSummary
};
