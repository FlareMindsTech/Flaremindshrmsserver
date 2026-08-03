const express = require('express');
const router = express.Router();
const {
    createReport,
    getMyReports,
    getAllReports,
    updateReportStatus,
    updateReport
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createReport);
router.get('/my-reports', protect, getMyReports);
router.get('/all', protect, getAllReports);
router.put('/:id', protect, updateReport);
router.put('/:id/status', protect, updateReportStatus);

module.exports = router;
