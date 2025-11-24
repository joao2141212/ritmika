const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'ritmika.db'), { verbose: console.log });

// Initialize Schema
const initDb = () => {
  // Units (Stores/Restaurants)
  db.exec(`
    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Users Table (Updated with Unit ID)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_id INTEGER,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'employee', -- 'owner', 'manager', 'supervisor', 'employee'
      points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unit_id) REFERENCES units (id)
    )
  `);

  // Checklists Table (Updated)
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT, -- 'opening', 'closing', 'hygiene', etc.
      created_by INTEGER,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unit_id) REFERENCES units (id),
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `);

  // Checklist Schedules (Recurrence)
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklist_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_id INTEGER,
      frequency TEXT, -- 'daily', 'weekly', 'monthly'
      days_of_week TEXT, -- JSON array '[1,3,5]' (Mon, Wed, Fri)
      time_of_day TEXT, -- '08:00'
      assigned_role TEXT, -- 'manager', 'employee'
      FOREIGN KEY (checklist_id) REFERENCES checklists (id) ON DELETE CASCADE
    )
  `);

  // Checklist Items (Advanced Types)
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_id INTEGER,
      text TEXT NOT NULL,
      type TEXT DEFAULT 'boolean', -- 'boolean', 'text', 'number', 'photo', 'signature', 'rating', 'select'
      options TEXT, -- JSON for select options
      is_required BOOLEAN DEFAULT 1,
      order_index INTEGER DEFAULT 0,
      FOREIGN KEY (checklist_id) REFERENCES checklists (id) ON DELETE CASCADE
    )
  `);

  // Item Logic (Conditional Visibility)
  db.exec(`
    CREATE TABLE IF NOT EXISTS item_logic (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER,
      trigger_value TEXT, -- The value that triggers the action (e.g., 'false' or 'specific_option')
      action TEXT DEFAULT 'show', -- 'show', 'require_photo', 'require_comment'
      target_item_id INTEGER, -- The item to show/modify
      FOREIGN KEY (item_id) REFERENCES checklist_items (id) ON DELETE CASCADE
    )
  `);

  // Submissions
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_id INTEGER,
      user_id INTEGER,
      unit_id INTEGER,
      status TEXT DEFAULT 'completed',
      geolocation TEXT, -- JSON {lat, lng}
      started_at DATETIME,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      duration_seconds INTEGER,
      score INTEGER DEFAULT 0,
      FOREIGN KEY (checklist_id) REFERENCES checklists (id),
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (unit_id) REFERENCES units (id)
    )
  `);

  // Submission Answers (With Media)
  db.exec(`
    CREATE TABLE IF NOT EXISTS submission_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER,
      item_id INTEGER,
      value TEXT, -- Stored as text, parsed based on item type
      media_url TEXT, -- Path to photo/signature if applicable
      comment TEXT,
      FOREIGN KEY (submission_id) REFERENCES submissions (id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES checklist_items (id)
    )
  `);

  console.log('Database initialized with AAA schema successfully');
};

initDb();

module.exports = db;
