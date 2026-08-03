const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');

const verifyToken = async (req) => {
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            const token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

            // Check if user is Admin or Employee
            let user = await Admin.findById(decoded.id).select('-password');
            if (!user) {
                user = await Employee.findById(decoded.id).select('-password');
            }

            return user;
        } catch (error) {
            return null;
        }
    }
    return null;
};

const protect = async (req, res, next) => {
    const user = await verifyToken(req);

    if (user) {
        if (user.status === 'Inactive') {
            return res.status(403).json({ message: 'Your account is inactive please contact Admin' });
        }
        req.user = user;
        next();
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const protectOptional = async (req, res, next) => {
    const user = await verifyToken(req);
    if (user) {
        req.user = user;
    }
    // Proceed even if no user found (req.user will be undefined)
    next();
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, protectOptional, admin };
