// Nodemailer configuration for sending emails
const nodemailer = require('nodemailer');

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
    host: process.env.Email_Host,
    port: process.env.Email_port,
    secure: process.env.Email_secure === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.Email_user, // email address
        pass: process.env.Email_pass // email password
    },
});

module.exports = transporter;