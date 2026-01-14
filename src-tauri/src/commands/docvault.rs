// DocVault - Document vault file system operations
// Provides real file system mapping for documents (like Obsidian vault)

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// File information returned after import or scan
#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub filename: String,
    pub file_type: String,  // markdown, pdf, image
    pub ext: String,
    pub size: u64,
}

/// Scan result for a file or folder
#[derive(Debug, Serialize, Deserialize)]
pub struct ScanItem {
    pub name: String,
    pub path: String,        // relative path from vault root
    pub is_dir: bool,
    pub file_type: Option<String>,
    pub ext: Option<String>,
    pub size: Option<u64>,
    pub children: Option<Vec<ScanItem>>,
}

/// Get the base directory for all docvaults
fn get_docvaults_base_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let docvaults_dir = app_data_dir.join("data").join("docvaults");

    if !docvaults_dir.exists() {
        fs::create_dir_all(&docvaults_dir)
            .map_err(|e| format!("Failed to create docvaults directory: {}", e))?;
    }

    Ok(docvaults_dir)
}

/// Get the vault directory for a specific project
fn get_docvault_dir(app: &tauri::AppHandle, project_id: i64) -> Result<PathBuf, String> {
    let base_dir = get_docvaults_base_dir(app)?;
    Ok(base_dir.join(project_id.to_string()))
}

/// Determine file type from extension
fn get_file_type_from_ext(ext: &str) -> String {
    let ext_lower = ext.to_lowercase();
    match ext_lower.as_str() {
        "md" | "markdown" => "markdown".to_string(),
        "pdf" => "pdf".to_string(),
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | "bmp" | "ico" => "image".to_string(),
        "txt" | "log" | "json" | "xml" | "yaml" | "yml" | "toml" | "ini" | "cfg" | "conf" => "text".to_string(),
        "js" | "ts" | "jsx" | "tsx" | "vue" | "html" | "css" | "scss" | "less" => "code".to_string(),
        "rs" | "py" | "java" | "c" | "cpp" | "h" | "hpp" | "go" | "rb" | "php" | "swift" | "kt" => "code".to_string(),
        "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" => "archive".to_string(),
        "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" => "office".to_string(),
        "mp3" | "wav" | "ogg" | "flac" | "aac" | "m4a" => "audio".to_string(),
        "mp4" | "avi" | "mkv" | "mov" | "wmv" | "flv" | "webm" => "video".to_string(),
        _ => "file".to_string(),
    }
}

/// Get the docvault path for a project
#[tauri::command]
pub fn get_docvault_path(app: tauri::AppHandle, project_id: i64) -> Result<String, String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;
    Ok(vault_dir.to_string_lossy().to_string())
}

/// Initialize the docvault directory structure for a project
#[tauri::command]
pub fn init_docvault(app: tauri::AppHandle, project_id: i64) -> Result<(), String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;

    // Create vault directory
    fs::create_dir_all(&vault_dir)
        .map_err(|e| format!("Failed to create vault directory: {}", e))?;

    // Create .attachments directory for embedded images
    let attachments_dir = vault_dir.join(".attachments");
    fs::create_dir_all(&attachments_dir)
        .map_err(|e| format!("Failed to create attachments directory: {}", e))?;

    Ok(())
}

/// Import an external file into the docvault
#[tauri::command]
pub fn import_file_to_docvault(
    app: tauri::AppHandle,
    project_id: i64,
    source_path: String,
    target_folder: String,
) -> Result<FileInfo, String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;
    let source = std::path::Path::new(&source_path);

    if !source.exists() {
        return Err(format!("Source file does not exist: {}", source_path));
    }

    // Get file info
    let filename = source
        .file_name()
        .ok_or("Invalid source file name")?
        .to_string_lossy()
        .to_string();

    let ext = source
        .extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_default();

    let file_type = get_file_type_from_ext(&ext);

    let metadata = fs::metadata(&source)
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;

    let size = metadata.len();

    // Build target path
    let target_dir = if target_folder == "/" || target_folder.is_empty() {
        vault_dir.clone()
    } else {
        let clean_folder = target_folder.trim_start_matches('/');
        vault_dir.join(clean_folder)
    };

    // Create target directory if needed
    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create target directory: {}", e))?;

    let target_path = target_dir.join(&filename);

    // Copy file
    fs::copy(&source, &target_path)
        .map_err(|e| format!("Failed to copy file: {}", e))?;

    // Return filename without extension for database title
    let title = source
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or(filename.clone());

    Ok(FileInfo {
        filename: title,
        file_type,
        ext,
        size,
    })
}

/// Create a folder in the docvault
#[tauri::command]
pub fn create_docvault_folder(
    app: tauri::AppHandle,
    project_id: i64,
    folder_path: String,
) -> Result<(), String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;

    let clean_path = folder_path.trim_start_matches('/');
    let full_path = vault_dir.join(clean_path);

    fs::create_dir_all(&full_path)
        .map_err(|e| format!("Failed to create folder: {}", e))?;

    Ok(())
}

/// Rename a file or folder in the docvault
#[tauri::command]
pub fn rename_docvault_item(
    app: tauri::AppHandle,
    project_id: i64,
    old_path: String,
    new_path: String,
) -> Result<(), String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;

    let old_clean = old_path.trim_start_matches('/');
    let new_clean = new_path.trim_start_matches('/');

    let old_full = vault_dir.join(old_clean);
    let new_full = vault_dir.join(new_clean);

    if !old_full.exists() {
        return Err(format!("Source path does not exist: {}", old_path));
    }

    // Create parent directory if needed
    if let Some(parent) = new_full.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    fs::rename(&old_full, &new_full)
        .map_err(|e| format!("Failed to rename: {}", e))?;

    Ok(())
}

/// Delete a file or folder in the docvault
#[tauri::command]
pub fn delete_docvault_item(
    app: tauri::AppHandle,
    project_id: i64,
    item_path: String,
) -> Result<(), String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;

    let clean_path = item_path.trim_start_matches('/');
    let full_path = vault_dir.join(clean_path);

    if !full_path.exists() {
        return Ok(()); // Already deleted
    }

    if full_path.is_dir() {
        fs::remove_dir_all(&full_path)
            .map_err(|e| format!("Failed to delete folder: {}", e))?;
    } else {
        fs::remove_file(&full_path)
            .map_err(|e| format!("Failed to delete file: {}", e))?;
    }

    Ok(())
}

/// Read file content from the docvault
#[tauri::command]
pub fn read_docvault_file(
    app: tauri::AppHandle,
    project_id: i64,
    relative_path: String,
) -> Result<String, String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;

    let clean_path = relative_path.trim_start_matches('/');
    let full_path = vault_dir.join(clean_path);

    if !full_path.exists() {
        return Err(format!("File does not exist: {}", relative_path));
    }

    fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

/// Read binary file content from the docvault (for images, PDFs)
#[tauri::command]
pub fn read_docvault_binary(
    app: tauri::AppHandle,
    project_id: i64,
    relative_path: String,
) -> Result<Vec<u8>, String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;

    let clean_path = relative_path.trim_start_matches('/');
    let full_path = vault_dir.join(clean_path);

    if !full_path.exists() {
        return Err(format!("File does not exist: {}", relative_path));
    }

    fs::read(&full_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

/// Write file content to the docvault
#[tauri::command]
pub fn write_docvault_file(
    app: tauri::AppHandle,
    project_id: i64,
    relative_path: String,
    content: String,
) -> Result<(), String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;

    let clean_path = relative_path.trim_start_matches('/');
    let full_path = vault_dir.join(clean_path);

    // Create parent directories if needed
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    fs::write(&full_path, content)
        .map_err(|e| format!("Failed to write file: {}", e))
}

/// Write binary file content to the docvault (for images, etc.)
#[tauri::command]
pub fn write_docvault_binary(
    app: tauri::AppHandle,
    project_id: i64,
    relative_path: String,
    data: Vec<u8>,
) -> Result<(), String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;

    let clean_path = relative_path.trim_start_matches('/');
    let full_path = vault_dir.join(clean_path);

    // Create parent directories if needed
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    fs::write(&full_path, data)
        .map_err(|e| format!("Failed to write binary file: {}", e))
}

/// Save an attachment image (for embedded images in markdown)
#[tauri::command]
pub fn save_docvault_attachment(
    app: tauri::AppHandle,
    project_id: i64,
    filename: String,
    image_data: Vec<u8>,
) -> Result<String, String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;
    let attachments_dir = vault_dir.join(".attachments");

    // Ensure attachments directory exists
    fs::create_dir_all(&attachments_dir)
        .map_err(|e| format!("Failed to create attachments directory: {}", e))?;

    let file_path = attachments_dir.join(&filename);

    fs::write(&file_path, image_data)
        .map_err(|e| format!("Failed to save attachment: {}", e))?;

    // Return relative path for markdown reference
    Ok(format!(".attachments/{}", filename))
}

/// Get absolute path for docvault attachments directory
#[tauri::command]
pub fn get_docvault_attachments_path(
    app: tauri::AppHandle,
    project_id: i64,
) -> Result<String, String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;
    let attachments_dir = vault_dir.join(".attachments");

    Ok(attachments_dir.to_string_lossy().to_string())
}

/// Scan the docvault directory and return file tree
#[tauri::command]
pub fn scan_docvault(
    app: tauri::AppHandle,
    project_id: i64,
) -> Result<Vec<ScanItem>, String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;

    if !vault_dir.exists() {
        return Ok(vec![]);
    }

    scan_directory(&vault_dir, &vault_dir)
}

/// Recursively scan a directory
fn scan_directory(dir: &PathBuf, vault_root: &PathBuf) -> Result<Vec<ScanItem>, String> {
    let mut items = Vec::new();

    let entries = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Include all files and folders (including hidden ones like .attachments)
        // Only skip special system files
        if name == ".DS_Store" || name == "Thumbs.db" || name == "desktop.ini" {
            continue;
        }

        let relative_path = path
            .strip_prefix(vault_root)
            .map(|p| format!("/{}", p.to_string_lossy().replace("\\", "/")))
            .unwrap_or_else(|_| name.clone());

        if path.is_dir() {
            let children = scan_directory(&path, vault_root)?;
            items.push(ScanItem {
                name: name.clone(),
                path: relative_path,
                is_dir: true,
                file_type: None,
                ext: None,
                size: None,
                children: Some(children),
            });
        } else {
            let ext = path
                .extension()
                .map(|e| e.to_string_lossy().to_string());

            let file_type = ext.as_ref().map(|e| get_file_type_from_ext(e));

            let size = fs::metadata(&path).ok().map(|m| m.len());

            // Get filename without extension for display
            let display_name = path
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or(name.clone());

            items.push(ScanItem {
                name: display_name,
                path: relative_path,
                is_dir: false,
                file_type,
                ext,
                size,
                children: None,
            });
        }
    }

    // Sort: folders first (hidden folders at the end), then files, alphabetically
    items.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            (true, true) => {
                // Hidden folders (starting with .) go to the end
                let a_hidden = a.name.starts_with('.');
                let b_hidden = b.name.starts_with('.');
                match (a_hidden, b_hidden) {
                    (true, false) => std::cmp::Ordering::Greater,
                    (false, true) => std::cmp::Ordering::Less,
                    _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
                }
            }
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(items)
}

/// Copy a file or folder in the docvault
#[tauri::command]
pub fn copy_docvault_item(
    app: tauri::AppHandle,
    project_id: i64,
    source_path: String,
    target_folder: String,
) -> Result<String, String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;

    let source_clean = source_path.trim_start_matches('/');
    let source_full = vault_dir.join(source_clean);

    if !source_full.exists() {
        return Err(format!("Source path does not exist: {}", source_path));
    }

    // Get file name
    let file_name = source_full
        .file_name()
        .ok_or("Invalid source file name")?
        .to_string_lossy()
        .to_string();

    // Build target path
    let target_dir = if target_folder == "/" || target_folder.is_empty() {
        vault_dir.clone()
    } else {
        let clean_folder = target_folder.trim_start_matches('/');
        vault_dir.join(clean_folder)
    };

    // Create target directory if needed
    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create target directory: {}", e))?;

    // Generate unique file name if target already exists
    let mut target_name = file_name.clone();
    let mut counter = 1;

    let (stem, ext) = if source_full.is_file() {
        let stem = source_full
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or(file_name.clone());
        let ext = source_full
            .extension()
            .map(|e| format!(".{}", e.to_string_lossy()))
            .unwrap_or_default();
        (stem, ext)
    } else {
        (file_name.clone(), String::new())
    };

    while target_dir.join(&target_name).exists() {
        target_name = format!("{} 副本{}{}", stem, if counter > 1 { format!(" {}", counter) } else { String::new() }, ext);
        counter += 1;
    }

    let target_path = target_dir.join(&target_name);

    // Copy file or directory
    if source_full.is_dir() {
        copy_dir_all(&source_full, &target_path)?;
    } else {
        fs::copy(&source_full, &target_path)
            .map_err(|e| format!("Failed to copy file: {}", e))?;
    }

    // Return the new relative path
    let new_relative = target_path
        .strip_prefix(&vault_dir)
        .map(|p| format!("/{}", p.to_string_lossy().replace("\\", "/")))
        .unwrap_or_else(|_| format!("/{}", target_name));

    Ok(new_relative)
}

/// Helper function to recursively copy a directory
fn copy_dir_all(src: &PathBuf, dst: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(dst)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    for entry in fs::read_dir(src).map_err(|e| format!("Failed to read directory: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_all(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)
                .map_err(|e| format!("Failed to copy file: {}", e))?;
        }
    }

    Ok(())
}

/// Move a file or folder in the docvault
#[tauri::command]
pub fn move_docvault_item(
    app: tauri::AppHandle,
    project_id: i64,
    source_path: String,
    target_folder: String,
) -> Result<String, String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;

    let source_clean = source_path.trim_start_matches('/');
    let source_full = vault_dir.join(source_clean);

    if !source_full.exists() {
        return Err(format!("Source path does not exist: {}", source_path));
    }

    // Get file name
    let file_name = source_full
        .file_name()
        .ok_or("Invalid source file name")?
        .to_string_lossy()
        .to_string();

    // Build target path
    let target_dir = if target_folder == "/" || target_folder.is_empty() {
        vault_dir.clone()
    } else {
        let clean_folder = target_folder.trim_start_matches('/');
        vault_dir.join(clean_folder)
    };

    // Create target directory if needed
    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create target directory: {}", e))?;

    let target_path = target_dir.join(&file_name);

    // Check if target already exists
    if target_path.exists() && target_path != source_full {
        return Err("目标文件夹已存在同名文件".to_string());
    }

    // Move file or directory
    fs::rename(&source_full, &target_path)
        .map_err(|e| format!("Failed to move: {}", e))?;

    // Return the new relative path
    let new_relative = target_path
        .strip_prefix(&vault_dir)
        .map(|p| format!("/{}", p.to_string_lossy().replace("\\", "/")))
        .unwrap_or_else(|_| format!("/{}", file_name));

    Ok(new_relative)
}

/// Open a file or folder in the system file explorer
#[tauri::command]
pub fn open_in_explorer(
    app: tauri::AppHandle,
    project_id: i64,
    item_path: String,
) -> Result<(), String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;

    let clean_path = item_path.trim_start_matches('/');

    let mut full_path = vault_dir.clone();
    if !clean_path.is_empty() {
        for part in clean_path.split('/') {
            if !part.is_empty() {
                full_path.push(part);
            }
        }
    }

    if !full_path.exists() {
        return Err(format!("Path does not exist: {} (full: {:?})", item_path, full_path));
    }

    // Get the directory to open (if it's a file, open its parent directory)
    let dir_to_open = if full_path.is_file() {
        full_path.parent().unwrap_or(&vault_dir).to_path_buf()
    } else {
        full_path.clone()
    };

    #[cfg(target_os = "windows")]
    {
        let full = full_path
            .canonicalize()
            .map_err(|e| format!("Invalid path: {}", e))?;

        let mut cmd = std::process::Command::new("explorer");

        if full.is_file() {
            cmd.arg("/select,")
                .arg(&full);
        } else {
            cmd.arg(&full);
        }

        cmd.spawn()
            .map_err(|e| format!("Failed to open explorer: {}", e))?;
    }


    #[cfg(target_os = "macos")]
    {
        if full_path.is_file() {
            // On macOS, use -R to reveal the file in Finder
            std::process::Command::new("open")
                .arg("-R")
                .arg(&full_path)
                .spawn()
                .map_err(|e| format!("Failed to open Finder: {}", e))?;
        } else {
            std::process::Command::new("open")
                .arg(&dir_to_open)
                .spawn()
                .map_err(|e| format!("Failed to open Finder: {}", e))?;
        }
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&dir_to_open)
            .spawn()
            .map_err(|e| format!("Failed to open file manager: {}", e))?;
    }

    Ok(())
}

/// Get file info for a specific file
#[tauri::command]
pub fn get_docvault_file_info(
    app: tauri::AppHandle,
    project_id: i64,
    relative_path: String,
) -> Result<FileInfo, String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;

    let clean_path = relative_path.trim_start_matches('/');
    let full_path = vault_dir.join(clean_path);

    if !full_path.exists() {
        return Err(format!("File does not exist: {}", relative_path));
    }

    let filename = full_path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .ok_or("Invalid filename")?;

    let ext = full_path
        .extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_default();

    let file_type = get_file_type_from_ext(&ext);

    let metadata = fs::metadata(&full_path)
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;

    Ok(FileInfo {
        filename,
        file_type,
        ext,
        size: metadata.len(),
    })
}

#[tauri::command]
pub fn get_file_absolute_path(app: tauri::AppHandle, project_id: i64, relative_path: String) -> Result<String, String> {
    let vault_dir = get_docvault_dir(&app, project_id)?;
    let full_path = vault_dir.join(relative_path.trim_start_matches('/'));
    Ok(full_path.to_string_lossy().to_string())
}

