const express = require('express');
const db = require('../db');
const { logger } = require('../logger');
const router = express.Router();

// Middleware to check auth (simplified for now, assumes valid token check in main server or here)
// In a real app, we'd use a middleware function like authenticateToken

router.get('/stats', (req, res) => {
    try {
        // Mocking some data for now as we don't have much real data
        // In reality, we would query the 'checklists', 'submissions', and 'users' tables

        const totalChecklists = db.prepare('SELECT COUNT(*) as count FROM checklists').get().count;
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

        // Get recent submissions (completed checklists)
        const recentActivity = db.prepare(`
      SELECT s.id, u.name as user_name, c.title as checklist_title, s.submitted_at 
      FROM submissions s
      JOIN users u ON s.user_id = u.id
      JOIN checklists c ON s.checklist_id = c.id
      ORDER BY s.submitted_at DESC
      LIMIT 5
    `).all();

        res.json({
            stats: {
                activeChecklists: totalChecklists,
                completedToday: 0, // TODO: Filter by date
                teamMembers: totalUsers,
                efficiency: '98%' // Mocked
            },
            recentActivity
        });
    } catch (error) {
        logger.error({
            file: 'server/routes/dashboard.js',
            function: 'dashboard.get',
            operation: 'dashboard.load',
            errorCode: 'DASHBOARD_LOAD_FAILED',
            correlationId: req.correlationId,
            error,
        });
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

module.exports = router;
