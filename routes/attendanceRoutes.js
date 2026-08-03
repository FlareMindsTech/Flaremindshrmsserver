const express = require('express');
const router = express.Router();
const {
    checkIn,
    checkOut,
    getAttendance, // Keeping this as it's not explicitly removed by the instruction, though the provided "Code Edit" snippet omits it.
    getAllAttendance,
    getDailyLog, // Added based on the provided "Code Edit"
    getMonthlyAttendance, // Added based on the provided "Code Edit"
    getEmployeeYearlyStats,
    getYearlyAttendanceSummary
} = require('../controllers/attendanceController');
const { protect, admin } = require('../middleware/authMiddleware'); // Added 'admin'
const upload = require('../middleware/uploadMiddleware'); // Keeping this as it's not explicitly removed by the instruction, though the provided "Code Edit" snippet omits it.

router.post('/check-in', protect, upload.single('photo'), checkIn); // Keeping upload.single('photo') as the instruction is about adding a route, not modifying existing ones unless necessary.
router.post('/check-out', protect, checkOut);
router.get('/', protect, getAttendance); // Keeping this route
router.get('/daily-log', protect, admin, getDailyLog); // Added based on the provided "Code Edit"
router.get('/monthly', protect, admin, getMonthlyAttendance); // Added based on the instruction and "Code Edit"
router.get('/yearly-summary', protect, admin, getYearlyAttendanceSummary);
router.get('/all', protect, getAllAttendance); // Admin/Manager should access this
router.get('/stats/:employeeId', protect, admin, getEmployeeYearlyStats);

module.exports = router;
