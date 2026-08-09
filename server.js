const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const { connectDB } = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import Models to ensure they register
require('./models/Admin');
require('./models/Employee');
require('./models/Report');
require('./models/Attendance');

// Import Routes
const adminRoutes = require('./routes/adminRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Use Routes
app.use('/api/admin', adminRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);

// Basic Route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Start Server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error(`Unable to start server: ${error.message}`);
    process.exit(1);
  });
