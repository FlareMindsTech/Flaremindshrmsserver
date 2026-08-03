const express = require('express');
const router = express.Router();
const { updateEmployeeProfile, loginEmployee, getEmployeeProfile } = require('../controllers/employeeController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', loginEmployee);
router.get('/profile', protect, getEmployeeProfile);
router.put('/:id', protect, updateEmployeeProfile);

module.exports = router;
