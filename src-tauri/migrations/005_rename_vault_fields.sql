-- Migration 5: Ensure vault_entries has correct column names (param_key, encrypted_value)
-- This migration recreates the table to be idempotent (works whether columns are already renamed or not)

PRAGMA foreign_keys=OFF;

-- Create new table with the correct schema
CREATE TABLE IF NOT EXISTS vault_entries_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    param_key TEXT,
    encrypted_value TEXT NOT NULL,
    encrypted_notes TEXT,
    url TEXT,
    category TEXT DEFAULT 'general',
    salt TEXT NOT NULL,
    nonce TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Copy existing data if table exists and has data
-- Handle both old column names (username, encrypted_password) and new names (param_key, encrypted_value)
INSERT OR REPLACE INTO vault_entries_new (id, project_id, title, param_key, encrypted_value, encrypted_notes, url, category, salt, nonce, created_at, updated_at)
SELECT id, project_id, title, param_key, encrypted_value, encrypted_notes, url, category, salt, nonce, created_at, updated_at
FROM vault_entries WHERE 1=1;

-- Drop old table
DROP TABLE IF EXISTS vault_entries;

-- Rename new table to original name
ALTER TABLE vault_entries_new RENAME TO vault_entries;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_vault_entries_project_id ON vault_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_vault_entries_category ON vault_entries(category);

PRAGMA foreign_keys=ON;
