-- PM-App Database Schema Initialization

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#FF6B9D',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    settings TEXT DEFAULT '{}'
);

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert default settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('version', '1.0.0');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('theme', 'light');
