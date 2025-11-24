const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
