require('dotenv').config();

const cloudinary = require('./config/couldinary.js');

console.log('Cloudinary configuration loaded');

console.log({
    cloud_name: cloudinary.config().cloud_name,
    api_key: cloudinary.config().api_key ? 'Loaded' : 'Missing',
    api_secret: cloudinary.config().api_secret ? 'Loaded' : 'Missing'
});