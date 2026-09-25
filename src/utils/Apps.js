const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const errorHandler = require('./middlewares/errorMiddleware');

const authRoutes = require('./routes/authRoute');
const userRoutes = require('./routes/userRoute');

const app = express();

app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        console.log('Raw body:', buf.toString());
    }
}));

app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => res.status(200).json({ status: 'OK' }));

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;