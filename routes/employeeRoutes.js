const express = require('express');
const router = express.Router();
const { updateEmployeeProfile, loginEmployee, getEmployeeProfile, uploadProfileImage } = require('../controllers/employeeController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware.js');

const cloudinary = require('../config/couldinary.js');


router.post('/login', loginEmployee);
router.get('/profile', protect, getEmployeeProfile);

router.post(
    '/:id/profile-image',
    protect,
    upload.single('image'),
    uploadProfileImage
);


router.put('/:id', protect, updateEmployeeProfile);



module.exports = router;
