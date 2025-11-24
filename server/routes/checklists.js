const express = require('express');
const db = require('../db');
const router = express.Router();

// Create Checklist
router.post('/', (req, res) => {
    const { title, items, unit_id } = req.body;
    const userId = req.user?.id || 1; // Fallback for dev

    try {
        const insertChecklist = db.prepare('INSERT INTO checklists (title, unit_id, created_by) VALUES (?, ?, ?)');
        const info = insertChecklist.run(title, unit_id || 1, userId);
        const checklistId = info.lastInsertRowid;

        const insertItem = db.prepare('INSERT INTO checklist_items (checklist_id, text, type, is_required, order_index) VALUES (?, ?, ?, ?, ?)');

        const insertMany = db.transaction((items) => {
            items.forEach((item, index) => {
                insertItem.run(checklistId, item.text, item.type, item.is_required ? 1 : 0, index);
            });
        });

        insertMany(items);

        res.status(201).json({ message: 'Checklist created', id: checklistId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create checklist' });
    }
});

// Get All Checklists
router.get('/', (req, res) => {
    try {
        const checklists = db.prepare('SELECT * FROM checklists ORDER BY created_at DESC').all();
        res.json(checklists);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch checklists' });
    }
});

// Get Single Checklist
router.get('/:id', (req, res) => {
    try {
        const checklist = db.prepare('SELECT * FROM checklists WHERE id = ?').get(req.params.id);
        if (!checklist) return res.status(404).json({ error: 'Checklist not found' });

        const items = db.prepare('SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY order_index').all(req.params.id);

        res.json({ ...checklist, items });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch checklist' });
    }
});

// Submit Checklist
router.post('/:id/submit', (req, res) => {
    const { answers, geolocation } = req.body;
    const checklistId = req.params.id;
    const userId = req.user?.id || 1;
    const unitId = req.user?.unit_id || 1;

    try {
        const insertSubmission = db.prepare(`
      INSERT INTO submissions (checklist_id, user_id, unit_id, geolocation, started_at)
      VALUES (?, ?, ?, ?, ?)
    `);

        const info = insertSubmission.run(
            checklistId,
            userId,
            unitId,
            JSON.stringify(geolocation),
            new Date().toISOString()
        );
        const submissionId = info.lastInsertRowid;

        const insertAnswer = db.prepare(`
      INSERT INTO submission_answers (submission_id, item_id, value)
      VALUES (?, ?, ?)
    `);

        const insertMany = db.transaction((answers) => {
            Object.entries(answers).forEach(([itemId, value]) => {
                insertAnswer.run(submissionId, itemId, value);
            });
        });

        insertMany(answers);

        // Award Points (Gamification)
        // 10 points for completion + 1 point per item
        const pointsEarned = 10 + Object.keys(answers).length;
        const updateUserPoints = db.prepare('UPDATE users SET points = points + ? WHERE id = ?');
        updateUserPoints.run(pointsEarned, userId);

        res.status(201).json({ message: 'Submission successful', id: submissionId, pointsEarned });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit checklist' });
    }
});

module.exports = router;
