-- Remove content field from documents table
-- Content will now be stored in filesystem as data/documents/doc-{id}/index.md

-- Create new table without content field
CREATE TABLE IF NOT EXISTS documents_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    folder TEXT DEFAULT '/',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, folder, title)
);

-- Copy data from old table to new table (excluding content)
INSERT INTO documents_new (id, project_id, title, folder, created_at, updated_at)
SELECT id, project_id, title, folder, created_at, updated_at
FROM documents;

-- Drop old table
DROP TABLE documents;

-- Rename new table to documents
ALTER TABLE documents_new RENAME TO documents;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder);
