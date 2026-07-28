const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');
const { logger, requestTelemetry } = require('./logger');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(requestTelemetry);
app.use(express.json());

// Routes Placeholder
app.get('/', (req, res) => {
    res.json({ message: 'Ritmika API is running' });
});

// Import Routes (will create these next)
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard.js');
const checklistRoutes = require('./routes/checklists.js');

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/checklists', checklistRoutes);

app.use((error, req, res, next) => {
    logger.error({
        file: 'server/server.js',
        function: 'express.errorHandler',
        operation: 'http.unhandled_error',
        errorCode: 'UNHANDLED_SERVER_ERROR',
        correlationId: req.correlationId,
        route: req.originalUrl.split('?')[0],
        method: req.method,
        error,
    });

    if (res.headersSent) return next(error);
    return res.status(500).json({
        error: 'Internal server error',
        correlationId: req.correlationId,
    });
});

app.listen(PORT, () => {
    logger.info({
        file: 'server/server.js',
        function: 'startup',
        operation: 'server.start',
        status: 'success',
        port: PORT,
    });
});
