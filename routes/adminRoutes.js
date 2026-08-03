const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { protect, protectOptional } = require('../middleware/authMiddleware');

router.post('/register-admin', protectOptional, registerAdmin); // Protected: Admin creates Admin (or first run)
router.post('/register-employee', protect, registerEmployee); // Protected: Admin creates Employee
router.post('/login', loginAdmin);

// Protected routes
router.get('/dashboard-stats', protect, getDashboardStats);
router.get('/users-by-category', protect, getUsersByCategory);
router.get('/daily-log', protect, getDailyAttendance);

// Settings (Location)
router.get('/settings', protect, getSettings);
router.put('/settings', protect, updateSettings);

router.get('/employees', protect, getAllEmployees); // Add specific role check middleware if needed
router.get('/employees/:id', protect, getEmployeeById);
router.put('/employees/:id', protect, updateEmployeeById);
router.delete('/employees/:id', protect, deleteEmployee);

module.exports = router;
