-- Vault entries table
CREATE TABLE IF NOT EXISTS vault_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    username TEXT,
    encrypted_password TEXT NOT NULL,
    encrypted_notes TEXT,
    url TEXT,
    category TEXT DEFAULT 'general',  -- 'api_key', 'database', 'ssh', 'general'
    salt TEXT NOT NULL,
    nonce TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Vault master password table (one per project)
CREATE TABLE IF NOT EXISTS vault_master (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vault_entries_project_id ON vault_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_vault_entries_category ON vault_entries(category);
CREATE INDEX IF NOT EXISTS idx_vault_master_project_id ON vault_master(project_id);
