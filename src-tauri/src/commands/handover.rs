use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::Manager;
use zip::{ZipWriter, write::FileOptions};
use chrono::{DateTime, Utc};
use std::collections::HashMap;

// ---------------- 数据结构 ----------------

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Project {
    pub name: String,
    pub path: String,
    pub description: Option<String>,
    pub created_at: String,
    pub last_accessed: DateTime<Utc>,
    pub settings: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Document {
    pub id: i64,
    pub project_id: i64,
    pub title: String,
    pub folder: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct VaultEntry {
    pub id: i64,
    pub project_id: i64,
    pub title: String,
    pub param_key: Option<String>,
    pub encrypted_value: String,
    pub encrypted_notes: Option<String>,
    pub url: Option<String>,
    pub category: String,
    pub salt: String,
    pub nonce: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ExportOptions {
    pub ignore_plugin: String,
    pub zip_encryption: bool,
    pub zip_password: Option<String>,
}

#[derive(Deserialize, Clone)]
pub struct VaultExport {
    pub entries: Vec<VaultEntry>,
    pub masters: String,
    pub exported_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct VaultImportEntry {
    pub title: String,
    pub param_key: Option<String>,
    pub param_value: String,
    pub notes: Option<String>,
    pub url: Option<String>,
    pub category: String,
}

// ---------------- 辅助工具函数 ----------------

async fn decrypt_vault_export(
    export: VaultExport,
) -> Result<Vec<crate::commands::vault::DecryptedVaultEntry>, String> {
    let master = export.masters.clone();
    let mut out = Vec::new();

    for e in export.entries {
        let (value, notes) = crate::commands::vault::vault_decrypt_entry(
            e.encrypted_value,
            e.nonce,
            e.encrypted_notes,
            e.salt,
            master.clone(),
        ).await?;

        out.push(crate::commands::vault::DecryptedVaultEntry {
            id: e.id,
            project_id: e.project_id,
            title: e.title,
            param_key: e.param_key,
            param_value: value,
            notes,
            url: e.url,
            category: e.category,
            created_at: e.created_at,
            updated_at: e.updated_at,
        });
    }
    Ok(out)
}

fn vault_to_markdown(entries: &[crate::commands::vault::DecryptedVaultEntry], exported_at: &str) -> String {
    let mut md = String::new();

    // 统计数据
    let mut category_stats = HashMap::new();
    for e in entries {
        *category_stats.entry(&e.category).or_insert(0) += 1;
    }

    md.push_str("# 🔐 保险箱数据导出报告\n\n");
    md.push_str(&format!("- **导出时间**: `{}`\n", exported_at));
    md.push_str(&format!("- **记录总数**: `{}` 条\n", entries.len()));

    md.push_str("\n### 📂 分类统计\n\n");
    for (cat, count) in category_stats {
        md.push_str(&format!("- **{}**: {} 条\n", cat, count));
    }

    md.push_str("\n---\n\n");

    for e in entries {
        md.push_str(&format!("## {}\n\n", e.title));
        md.push_str("| 字段 | 内容 |\n|------|------|\n");
        md.push_str(&format!("| 键名 | {} |\n", e.param_key.as_deref().unwrap_or("*未设置*")));
        md.push_str(&format!("| 键值 | `{}` |\n", e.param_value));
        md.push_str(&format!("| 分类 | {} |\n", e.category));

        if let Some(u) = &e.url { md.push_str(&format!("| URL | [{}]({}) |\n", u, u)); }
        if let Some(n) = &e.notes { md.push_str(&format!("| 备注 | {} |\n", n)); }

        md.push_str(&format!("| 创建日期 | {} |\n", e.created_at));
        md.push_str(&format!("| 更新日期 | {} |\n", e.updated_at));
        md.push_str("\n---\n\n");
    }

    md.push_str("\n> 注意：此文件包含敏感信息，请妥善保管。\n");
    md
}

fn sanitize_filename(name: &str) -> String {
    let forbidden_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|', ' '];
    let mut sanitized = name.to_string();
    for c in forbidden_chars {
        sanitized = sanitized.replace(c, "_");
    }
    sanitized
}

fn add_directory_to_zip(
    zip: &mut ZipWriter<fs::File>,
    dir: &Path,
    zip_base: &str,
    options: FileOptions,
    ignore: bool,
) -> Result<(), String> {
    const IGNORE_DIRS: &[&str] = &[".git", "target", "node_modules", ".idea", ".vscode", ".DS_Store"];

    if !dir.exists() { return Ok(()); }

    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();

        if ignore && IGNORE_DIRS.iter().any(|i| *i == name) { continue; }
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        if file_type.is_symlink() { continue; }

        let zip_path = format!("{}/{}", zip_base.trim_end_matches('/'), name);

        if file_type.is_dir() {
            add_directory_to_zip(zip, &path, &zip_path, options, ignore)?;
        } else if file_type.is_file() {
            let mut f = fs::File::open(&path).map_err(|e| e.to_string())?;
            zip.start_file(&zip_path, options).map_err(|e| e.to_string())?;
            std::io::copy(&mut f, zip).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

// ---------------- 主导出命令 ----------------

#[tauri::command]
pub async fn export_project_handover(
    app: tauri::AppHandle,
    project: Project,
    documents: Option<Vec<Document>>,
    vault_entries: Option<Vec<VaultEntry>>,
    vault_masters: Option<String>,
    output_path: String,
    export_options: ExportOptions,
) -> Result<(), String> {
    let file = fs::File::create(&output_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);

    // 设置 ZIP 选项（如果需要密码，可以在此处扩展）
    let zip_options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    // 1. 项目基础信息
    zip.start_file("info.json", zip_options).map_err(|e| e.to_string())?;
    let project_json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    zip.write_all(project_json.as_bytes()).map_err(|e| e.to_string())?;

    // 2. 项目源码导出
    let project_root = PathBuf::from(&project.path);
    if project_root.exists() && project_root.is_dir() {
        let folder_name = sanitize_filename(&project.name);
        let zip_project_path = format!("project/{}", folder_name);
        add_directory_to_zip(
            &mut zip,
            &project_root,
            &zip_project_path,
            zip_options,
            export_options.ignore_plugin == "ignore-plugin-directory"
        )?;
    }

    // 3.导出文档
    if let Some(docs) = documents {
        for doc in docs {
            // 物理路径：app_data/data/documents/doc-ID
            let doc_dir = app_data_dir.join("data/documents").join(format!("doc-{}", doc.id));

            // 清洗文件名和文件夹名
            let safe_folder = if doc.folder == "/" || doc.folder.is_empty() {
                "".to_string()
            } else {
                sanitize_filename(&doc.folder)
            };
            let safe_title = sanitize_filename(&doc.title);

            // 构造 ZIP 内的基础目录路径
            // 如果有文件夹：docs/文件夹/标题
            // 如果没文件夹：docs/标题
            let base_zip_dir = if safe_folder.is_empty() {
                format!("docs/{}", safe_title)
            } else {
                format!("docs/{}/{}", safe_folder, safe_title)
            };

            // 3.1 写入 index.md
            let index_path = doc_dir.join("index.md");
            if index_path.exists() {
                let content = fs::read_to_string(&index_path).map_err(|e| e.to_string())?;
                // 路径：docs/.../标题/index.md
                let zip_index_path = format!("{}/index.md", base_zip_dir);
                zip.start_file(zip_index_path, zip_options).map_err(|e| e.to_string())?;
                zip.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
            }

            // 3.2 写入图片资源目录
            let img_dir = doc_dir.join("images");
            if img_dir.exists() {
                // 路径：docs/.../标题/images/
                let zip_img_dir = format!("{}/images", base_zip_dir);
                add_directory_to_zip(
                    &mut zip,
                    &img_dir,
                    &zip_img_dir,
                    zip_options,
                    false
                )?;
            }
        }
    }

    // 4. 保险箱解密导出
    if let (Some(entries), Some(master)) = (vault_entries, vault_masters) {
        let exported_at = Utc::now().to_rfc3339();

        // 执行解密
        let export_payload = VaultExport {
            entries,
            masters: master,
            exported_at: exported_at.clone(),
        };
        let decrypted = decrypt_vault_export(export_payload).await?;

        // 生成明文导入格式的 JSON
        let import_data: Vec<VaultImportEntry> = decrypted.iter().map(|e| {
            VaultImportEntry {
                title: e.title.clone(),
                param_key: e.param_key.clone(),
                param_value: e.param_value.clone(), // 明文密码/值
                notes: e.notes.clone(),
                url: e.url.clone(),
                category: e.category.clone(),
            }
        }).collect();

        let vault_json = serde_json::json!({
            "entries": &import_data,
            "exported_at": &exported_at,
            "version": "1.0"
        });

        // 写入 vault/info.json
        zip.start_file("vault/info.json", zip_options).map_err(|e| e.to_string())?;
        zip.write_all(serde_json::to_string_pretty(&vault_json).unwrap().as_bytes()).map_err(|e| e.to_string())?;

        let md_report = vault_to_markdown(&decrypted, &exported_at);
        zip.start_file("vault/vault.md", zip_options).map_err(|e| e.to_string())?;
        zip.write_all(md_report.as_bytes()).map_err(|e| e.to_string())?;
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}