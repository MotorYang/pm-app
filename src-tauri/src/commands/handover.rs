use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::Manager;
use zip::{ZipWriter, write::FileOptions};
use chrono::{DateTime, Utc};

// ---------------- Structs ----------------

// 项目信息Struct
#[derive(Debug, Deserialize, Serialize)]
pub struct Project {
    pub name: String,
    pub path: String,
    pub description: Option<String>,
    pub created_at: String,
    pub last_accessed: DateTime<Utc>,
    pub settings: Option<String>,
}

// 文档信息Struct
#[derive(Debug, Deserialize, Serialize)]
pub struct Document {
    pub id: i64,
    pub project_id: i64,
    pub title: String,
    pub folder: String,
    pub created_at: String,
    pub updated_at: String,
}

// 保险箱Struct
#[derive(Debug, Deserialize, Serialize)]
pub struct VaultEntry {
    pub project_id: i64,
    pub title: String,
    pub username: String,
    pub encrypted_password: String,
    pub encrypted_notes: String,
    pub url: String,
    pub category: String,
    pub salt: String,
    pub nonce: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// 保险箱管理密码Struct
#[derive(Debug, Deserialize, Serialize)]
pub struct VaultMaster {
    pub project_id: i64,
    pub password_hash: String,
    pub salt: String,
    pub created_at: DateTime<Utc>,
}

// 导出选项
#[derive(Debug, Deserialize, Serialize)]
pub struct ExportOptions {
    pub ignore_plugin: String,
    pub zip_encryption: bool,
    pub zip_password: Option<String>,
}

// ---------------- Helper Functions ----------------

/// 安全转换文件名/文件夹名，替换特殊字符
fn sanitize_filename(name: &str) -> String {
    let forbidden_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|', ' '];
    let mut sanitized = name.to_string();
    for c in forbidden_chars {
        sanitized = sanitized.replace(c, "_");
    }
    sanitized
}

/// 递归把目录添加到 ZIP
fn add_directory_to_zip(
    zip: &mut ZipWriter<std::fs::File>,
    dir: &Path,
    zip_base: &str,
    options: FileOptions,
    ignore: bool, // 是否忽略平台插件目录，如IGNORE_DIRS
) -> Result<(), String> {
    const IGNORE_DIRS: &[&str] = &[
        ".git",
        "target",
        "node_modules",
        ".idea",
        ".vscode",
        ".DS_Store",
    ];

    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let file_name = entry.file_name();
        let name = file_name.to_string_lossy();

        // 忽略黑名单目录/文件
        if ignore {
            if IGNORE_DIRS.iter().any(|i| *i == name) {
                continue;
            }
        }

        let file_type = entry.file_type().map_err(|e| e.to_string())?;

        // 跳过符号链接（macOS / Linux）
        if file_type.is_symlink() {
            continue;
        }

        let zip_path = format!("{}/{}", zip_base.trim_end_matches('/'), name);

        if file_type.is_dir() {
            add_directory_to_zip(zip, &path, &zip_path, options, ignore)?;
        } else if file_type.is_file() {
            let content = fs::read(&path).map_err(|e| e.to_string())?;
            zip.start_file(&zip_path, options).map_err(|e| e.to_string())?;
            zip.write_all(&content).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

// ---------------- Export Function ----------------

#[tauri::command]
pub async fn export_project_handover(
    app: tauri::AppHandle,
    project: Project,
    documents: Option<Vec<Document>>,
    vault_entries: Option<Vec<VaultEntry>>,
    vault_masters: Option<VaultMaster>,
    output_path: String,
    export_options: ExportOptions,
) -> Result<(), String> {
    // 创建 ZIP 文件
    let file = fs::File::create(&output_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    let zip_options = FileOptions::default();

    // 获取应用数据目录
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    // ---------------- 导出项目 ----------------
    zip.start_file("project/info.json", zip_options)
        .map_err(|e| e.to_string())?;
    zip.write_all(
        serde_json::to_string_pretty(&project)
            .map_err(|e| e.to_string())?
            .as_bytes(),
    )
        .map_err(|e| e.to_string())?;

    let project_root = PathBuf::from(&project.path);
    if project_root.exists() && project_root.is_dir() {
        let project_folder_name = sanitize_filename(
            project_root
                .file_name()
                .ok_or("Invalid project path")?
                .to_string_lossy()
                .as_ref()
        );
        let zip_project_path = format!("project/{}", project_folder_name);
        add_directory_to_zip(
            &mut zip,
            &project_root,
            &zip_project_path,
            zip_options,
            export_options.ignore_plugin.eq("ignore-plugin-directory")
        )?;
    }

    // ---------------- 导出文档 ----------------
    if let Some(documents) = documents {
        for doc in documents {
            let doc_dir = app_data_dir
                .join("data/documents")
                .join(format!("doc-{}", doc.id));

            // index.md
            let index_md = doc_dir.join("index.md");
            if index_md.exists() {
                let content = fs::read_to_string(&index_md).map_err(|e| e.to_string())?;

                // 安全化 folder 和 title
                let safe_folder = if doc.folder == "/" {
                    "".to_string()
                } else {
                    sanitize_filename(&doc.folder)
                };
                let safe_title = sanitize_filename(&doc.title);

                // 构造 zip 中文档路径
                let zip_path = if safe_folder.is_empty() {
                    format!("documents/{}/{}.md", safe_title, safe_title)
                } else {
                    format!("documents/{}/{}.md", safe_folder, safe_title)
                };

                zip.start_file(&zip_path, zip_options)
                    .map_err(|e| e.to_string())?;
                zip.write_all(content.as_bytes())
                    .map_err(|e| e.to_string())?;
            }

            // images 文件夹
            let images_dir = doc_dir.join("images");
            if images_dir.exists() {
                let safe_folder = if doc.folder == "/" {
                    "".to_string()
                } else {
                    sanitize_filename(&doc.folder)
                };
                let safe_title = sanitize_filename(&doc.title);
                let zip_images_path = if safe_folder.is_empty() {
                    format!("documents/{}/images", safe_title)
                } else {
                    format!("documents/{}/{}/images", safe_folder, safe_title)
                };
                add_directory_to_zip(&mut zip, &images_dir, &zip_images_path, zip_options, false)?;
            }
        }
    }

    // ---------------- 导出保险箱 ----------------
    let vault_json = serde_json::json!({
        "entries": vault_entries,
        "masters": vault_masters,
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

    // 完成 ZIP
    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}
