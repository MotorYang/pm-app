use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::Path;
use tauri::Manager;
use zip::{ZipWriter, write::FileOptions};

#[derive(Debug, Deserialize, Serialize)]
pub struct ExportOptions {
    pub include_project: bool,
    pub include_documents: bool,
    pub include_vault: bool,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ProjectInfo {
    pub id: i64,
    pub name: String,
    pub path: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DocumentInfo {
    pub id: i64,
    pub title: String,
    pub folder: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct VaultEntry {
    pub key: String,
    pub encrypted_key: String,
    pub category: String,
}

#[tauri::command]
pub async fn export_project_handover(
    app: tauri::AppHandle,
    project: Option<ProjectInfo>,
    documents: Vec<DocumentInfo>,
    vault_entries: Vec<VaultEntry>,
    output_path: String,
    options: ExportOptions,
) -> Result<(), String> {
    let file = fs::File::create(&output_path).map_err(|e| e.to_string())?;

    let mut zip = ZipWriter::new(file);
    let zip_options = FileOptions::default();

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    /* ---------- project ---------- */
    if options.include_project {
        if let Some(project) = project {
            zip.start_file("project/info.json", zip_options)
                .map_err(|e| e.to_string())?;

            zip.write_all(
                serde_json::to_string_pretty(&project)
                    .map_err(|e| e.to_string())?
                    .as_bytes(),
            )
            .map_err(|e| e.to_string())?;
        }
    }

    /* ---------- documents ---------- */
    if options.include_documents {
        for doc in documents {
            let doc_dir = app_data_dir
                .join("data/documents")
                .join(format!("doc-{}", doc.id));

            let index_md = doc_dir.join("index.md");
            if index_md.exists() {
                let content = fs::read_to_string(&index_md).map_err(|e| e.to_string())?;

                let zip_path = if doc.folder == "/" {
                    format!("documents/{}.md", doc.title)
                } else {
                    format!("documents{}/{}.md", doc.folder, doc.title)
                };

                zip.start_file(&zip_path, zip_options)
                    .map_err(|e| e.to_string())?;

                zip.write_all(content.as_bytes())
                    .map_err(|e| e.to_string())?;
            }

            // 复制 images 文件夹
            let images_dir = doc_dir.join("images");
            if images_dir.exists() {
                add_directory_to_zip(
                    &mut zip,
                    &images_dir,
                    &format!("documents/{}/images", doc.title),
                    zip_options,
                )?;
            }
        }
    }

    /* ---------- vault ---------- */
    if options.include_vault {
        let vault_json = serde_json::json!({
            "entries": vault_entries,
            "exported_at": chrono::Utc::now().to_rfc3339(),
        });

        zip.start_file("vault/entries.json", zip_options)
            .map_err(|e| e.to_string())?;

        zip.write_all(
            serde_json::to_string_pretty(&vault_json)
                .map_err(|e| e.to_string())?
                .as_bytes(),
        )
        .map_err(|e| e.to_string())?;
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

/// 递归把目录添加到 ZIP
fn add_directory_to_zip(
    zip: &mut ZipWriter<std::fs::File>,
    dir: &Path,
    zip_base: &str,
    options: FileOptions,
) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name();
        let name = name.to_string_lossy();

        let zip_path = format!("{}/{}", zip_base, name);

        if path.is_dir() {
            // 递归子目录
            add_directory_to_zip(zip, &path, &zip_path, options)?;
        } else {
            let content = fs::read(&path).map_err(|e| e.to_string())?;

            zip.start_file(&zip_path, options)
                .map_err(|e| e.to_string())?;

            zip.write_all(&content).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
