// Document file system operations
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// Get the base directory for all documents
fn get_documents_base_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let documents_dir = app_data_dir.join("data").join("documents");

    // Ensure the documents directory exists
    if !documents_dir.exists() {
        fs::create_dir_all(&documents_dir)
            .map_err(|e| format!("Failed to create documents directory: {}", e))?;
    }

    Ok(documents_dir)
}

/// Get the directory for a specific document
fn get_document_dir(app: &tauri::AppHandle, doc_id: i64) -> Result<PathBuf, String> {
    let base_dir = get_documents_base_dir(app)?;
    Ok(base_dir.join(format!("doc-{}", doc_id)))
}

/// Create a document folder structure
#[tauri::command]
pub fn create_document_folder(app: tauri::AppHandle, doc_id: i64) -> Result<(), String> {
    let doc_dir = get_document_dir(&app, doc_id)?;
    let images_dir = doc_dir.join("images");

    // Create document directory
    fs::create_dir_all(&doc_dir)
        .map_err(|e| format!("Failed to create document directory: {}", e))?;

    // Create images subdirectory
    fs::create_dir_all(&images_dir)
        .map_err(|e| format!("Failed to create images directory: {}", e))?;

    // Create empty index.md file
    let index_path = doc_dir.join("index.md");
    fs::write(&index_path, "")
        .map_err(|e| format!("Failed to create index.md: {}", e))?;

    Ok(())
}

/// Read document content from index.md
#[tauri::command]
pub fn read_document_content(app: tauri::AppHandle, doc_id: i64) -> Result<String, String> {
    let doc_dir = get_document_dir(&app, doc_id)?;
    let index_path = doc_dir.join("index.md");

    if !index_path.exists() {
        return Err(format!("Document file does not exist: doc-{}", doc_id));
    }

    fs::read_to_string(&index_path)
        .map_err(|e| format!("Failed to read document content: {}", e))
}

/// Write document content to index.md
#[tauri::command]
pub fn write_document_content(
    app: tauri::AppHandle,
    doc_id: i64,
    content: String,
) -> Result<(), String> {
    let doc_dir = get_document_dir(&app, doc_id)?;
    let index_path = doc_dir.join("index.md");

    // Ensure the document directory exists
    if !doc_dir.exists() {
        create_document_folder(app.clone(), doc_id)?;
    }

    fs::write(&index_path, content)
        .map_err(|e| format!("Failed to write document content: {}", e))
}

/// Delete document folder and all its contents
#[tauri::command]
pub fn delete_document_folder(app: tauri::AppHandle, doc_id: i64) -> Result<(), String> {
    let doc_dir = get_document_dir(&app, doc_id)?;

    if doc_dir.exists() {
        fs::remove_dir_all(&doc_dir)
            .map_err(|e| format!("Failed to delete document folder: {}", e))?;
    }

    Ok(())
}

/// Save an image to the document's images folder
#[tauri::command]
pub fn save_document_image(
    app: tauri::AppHandle,
    doc_id: i64,
    image_data: Vec<u8>,
    filename: String,
) -> Result<String, String> {
    let doc_dir = get_document_dir(&app, doc_id)?;
    let images_dir = doc_dir.join("images");

    // Ensure images directory exists
    if !images_dir.exists() {
        fs::create_dir_all(&images_dir)
            .map_err(|e| format!("Failed to create images directory: {}", e))?;
    }

    let image_path = images_dir.join(&filename);

    fs::write(&image_path, image_data)
        .map_err(|e| format!("Failed to save image: {}", e))?;

    // Return relative path for markdown reference
    Ok(format!("images/{}", filename))
}

/// Get the absolute path to a document's images folder
#[tauri::command]
pub fn get_document_images_path(app: tauri::AppHandle, doc_id: i64) -> Result<String, String> {
    let doc_dir = get_document_dir(&app, doc_id)?;
    let images_dir = doc_dir.join("images");

    Ok(images_dir.to_string_lossy().to_string())
}
