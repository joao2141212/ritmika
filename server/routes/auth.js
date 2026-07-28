const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { logger } = require('../logger');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Register (for demo purposes, usually admin only)
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const stmt = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
        const info = stmt.run(name, email, hashedPassword, role || 'employee');

        logger.info({
            file: 'server/routes/auth.js',
            function: 'auth.register',
            operation: 'auth.register',
            status: 'success',
            correlationId: req.correlationId,
            userId: info.lastInsertRowid,
            role: role || 'employee',
        });
        res.status(201).json({ message: 'User created', userId: info.lastInsertRowid, correlationId: req.correlationId });
    } catch (error) {
        logger.error({
            file: 'server/routes/auth.js',
            function: 'auth.register',
            operation: 'auth.register',
            errorCode: 'AUTH_REGISTER_FAILED',
            correlationId: req.correlationId,
            hasEmail: Boolean(email),
            error,
        });
        res.status(400).json({ error: 'Email already exists or invalid data', correlationId: req.correlationId });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        const user = stmt.get(email);

        if (!user) {
            logger.warn({
                file: 'server/routes/auth.js',
                function: 'auth.login',
                operation: 'auth.login',
                errorCode: 'AUTH_INVALID_CREDENTIALS',
                correlationId: req.correlationId,
                hasEmail: Boolean(email),
            });
            return res.status(400).json({ error: 'Invalid credentials', correlationId: req.correlationId });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            logger.warn({
                file: 'server/routes/auth.js',
                function: 'auth.login',
                operation: 'auth.login',
                errorCode: 'AUTH_INVALID_CREDENTIALS',
                correlationId: req.correlationId,
                userId: user.id,
                hasEmail: Boolean(email),
            });
            return res.status(400).json({ error: 'Invalid credentials', correlationId: req.correlationId });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

        logger.info({
            file: 'server/routes/auth.js',
            function: 'auth.login',
            operation: 'auth.login',
            status: 'success',
            correlationId: req.correlationId,
            userId: user.id,
            role: user.role,
        });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role }, correlationId: req.correlationId });
    } catch (error) {
        logger.error({
            file: 'server/routes/auth.js',
            function: 'auth.login',
            operation: 'auth.login',
            errorCode: 'AUTH_LOGIN_FAILED',
            correlationId: req.correlationId,
            hasEmail: Boolean(email),
            error,
        });
        res.status(500).json({ error: 'Server error', correlationId: req.correlationId });
    }
});

module.exports = router;
