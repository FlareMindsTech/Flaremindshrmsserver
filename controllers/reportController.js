const Report = require('../models/Report');

// @desc    Create a report
// @route   POST /api/reports
// @access  Private
const createReport = async (req, res) => {
    const { title, description } = req.body;

    try {
        const report = await Report.create({
            employeeId: req.user.id,
            title,
            description,
        });

        res.status(201).json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my reports
// @route   GET /api/reports/my-reports
// @access  Private
const getMyReports = async (req, res) => {
    try {
        const reports = await Report.find({ employeeId: req.user.id }).sort({ createdAt: -1 });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all reports (Admin)
// @route   GET /api/reports/all
// @access  Private (Admin/Manager)
const getAllReports = async (req, res) => {
    try {
        const reports = await Report.find({}).populate('employeeId', 'name email department').sort({ createdAt: -1 });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update report status (Admin/Manager)
// @route   PUT /api/reports/:id/status
// @access  Private (Admin/Manager)
const updateReportStatus = async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    try {
        // specific role check: Admin or Manager
        if (!req.user.role || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
            return res.status(403).json({ message: 'Not authorized as admin' });
        }

        const report = await Report.findById(id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        const validStatuses = ['Pending', 'viewed', 'Reviewed', 'Approved'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        report.status = status || report.status;
        report.reviewedBy = req.user._id;

        const updatedReport = await report.save();
        res.json(updatedReport);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update report content (Employee only)
// @route   PUT /api/reports/:id
// @access  Private
const updateReport = async (req, res) => {
    const { title, description } = req.body;
    const { id } = req.params;

    try {
        const report = await Report.findById(id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        // Verify ownership
        if (report.employeeId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Restrict edit to same day (until midnight)
        const reportDate = new Date(report.createdAt);
        const today = new Date();

        // Reset hours to compare just the date part
        const isSameDay =
            reportDate.getDate() === today.getDate() &&
            reportDate.getMonth() === today.getMonth() &&
            reportDate.getFullYear() === today.getFullYear();

        if (!isSameDay) {
            return res.status(403).json({ message: 'You can only edit reports created today.' });
        }

        // Optional: Block edit if already approved? User didn't ask, but reasonable.
        // Assuming free edit for now as per "set editable" request.

        report.title = title || report.title;
        report.description = description || report.description;
        report.isEdited = true;
        report.lastEditedAt = Date.now();
        report.status = 'Pending'; // Reset status to Pending on edit

        const updatedReport = await report.save();
        res.json(updatedReport);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createReport,
    getMyReports,
    getAllReports,
    updateReportStatus,
    updateReport
};
