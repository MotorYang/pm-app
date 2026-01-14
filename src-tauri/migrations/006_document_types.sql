-- Add document type support for PDF, images, etc.
-- type: 'markdown' | 'pdf' | 'image'
-- file_ext: file extension (md, pdf, png, jpg, etc.)
-- file_size: file size in bytes

-- Create new table with additional fields
CREATE TABLE IF NOT EXISTS documents_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    folder TEXT DEFAULT '/',
    type TEXT DEFAULT 'markdown',
    file_ext TEXT DEFAULT 'md',
    file_size INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, folder, title)
);

-- Copy data from old table to new table
INSERT INTO documents_new (id, project_id, title, folder, type, file_ext, file_size, created_at, updated_at)
SELECT id, project_id, title, folder, 'markdown', 'md', 0, created_at, updated_at
FROM documents;

-- Drop old table
DROP TABLE documents;

-- Rename new table to documents
ALTER TABLE documents_new RENAME TO documents;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
