use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::Emitter;
use zip::{ZipWriter, write::FileOptions};
use chrono::{DateTime, Utc};
use std::collections::HashMap;

// 进度事件结构
#[derive(Clone, Serialize)]
pub struct ExportProgress {
    pub progress: u32,
    pub message: String,
    pub current: usize,
    pub total: usize,
}

// 进度追踪器
struct ProgressTracker<'a> {
    app: &'a tauri::AppHandle,
    current: usize,
    total: usize,
    last_emitted: usize,
}

impl<'a> ProgressTracker<'a> {
    fn new(app: &'a tauri::AppHandle, total: usize) -> Self {
        Self {
            app,
            current: 0,
            total,
            last_emitted: 0,
        }
    }

    fn increment(&mut self) {
        self.current += 1;
        // 每处理 10 个文件或进度变化超过 1% 时发送事件
        let current_percent = if self.total > 0 {
            (self.current * 100) / self.total
        } else {
            0
        };
        let last_percent = if self.total > 0 {
            (self.last_emitted * 100) / self.total
        } else {
            0
        };

        if current_percent > last_percent || self.current - self.last_emitted >= 10 {
            self.emit();
            self.last_emitted = self.current;
        }
    }

    fn emit(&self) {
        let progress = if self.total > 0 {
            ((self.current as f64 / self.total as f64) * 100.0).min(99.0) as u32
        } else {
            0
        };

        let _ = self.app.emit("export-progress", ExportProgress {
            progress,
            message: format!("正在打包文件 ({}/{})", self.current, self.total),
            current: self.current,
            total: self.total,
        });
    }

    fn complete(&self) {
        let _ = self.app.emit("export-progress", ExportProgress {
            progress: 100,
            message: "导出完成！".to_string(),
            current: self.total,
            total: self.total,
        });
    }
}

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

// 统计目录中的文件数量
fn count_files_in_directory(dir: &Path, ignore: bool) -> usize {
    const IGNORE_DIRS: &[&str] = &[".git", "target", "node_modules", ".idea", ".vscode", ".DS_Store"];

    if !dir.exists() { return 0; }

    let mut count = 0;
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().into_owned();
            if ignore && IGNORE_DIRS.iter().any(|i| *i == name) { continue; }

            if let Ok(file_type) = entry.file_type() {
                if file_type.is_symlink() { continue; }
                if file_type.is_dir() {
                    count += count_files_in_directory(&entry.path(), ignore);
                } else if file_type.is_file() {
                    count += 1;
                }
            }
        }
    }
    count
}

fn add_directory_to_zip(
    zip: &mut ZipWriter<fs::File>,
    dir: &Path,
    zip_base: &str,
    options: FileOptions,
    ignore: bool,
    mut tracker: Option<&mut ProgressTracker>,
) -> Result<(), String> {
    const IGNORE_DIRS: &[&str] = &[".git", "target", "node_modules", ".idea", ".vscode", ".DS_Store"];

    if !dir.exists() { return Ok(()); }

    // 收集所有条目以便在循环中使用可变引用
    let entries: Vec<_> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .collect();

    for entry in entries {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();

        if ignore && IGNORE_DIRS.iter().any(|i| *i == name) { continue; }
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        if file_type.is_symlink() { continue; }

        let zip_path = format!("{}/{}", zip_base.trim_end_matches('/'), name);

        if file_type.is_dir() {
            add_directory_to_zip(zip, &path, &zip_path, options, ignore, tracker.as_deref_mut())?;
        } else if file_type.is_file() {
            let mut f = fs::File::open(&path).map_err(|e| e.to_string())?;
            zip.start_file(&zip_path, options).map_err(|e| e.to_string())?;
            std::io::copy(&mut f, zip).map_err(|e| e.to_string())?;

            // 更新进度
            if let Some(ref mut t) = tracker {
                t.increment();
            }
        }
    }
    Ok(())
}

// ---------------- 主导出命令 ----------------

#[tauri::command]
pub async fn export_project_handover(
    app: tauri::AppHandle,
    project: Project,
    docvault_path: Option<String>,
    vault_entries: Option<Vec<VaultEntry>>,
    vault_masters: Option<String>,
    output_path: String,
    export_options: ExportOptions,
) -> Result<(), String> {
    // 发送初始进度
    let _ = app.emit("export-progress", ExportProgress {
        progress: 0,
        message: "正在统计文件数量...".to_string(),
        current: 0,
        total: 0,
    });

    // 1. 统计总文件数
    let ignore_dirs = export_options.ignore_plugin == "ignore-plugin-directory";
    let project_root = PathBuf::from(&project.path);
    let mut total_files: usize = 1; // info.json

    if project_root.exists() && project_root.is_dir() {
        total_files += count_files_in_directory(&project_root, ignore_dirs);
    }

    if let Some(ref path) = docvault_path {
        let docvault_dir = PathBuf::from(path);
        if docvault_dir.exists() && docvault_dir.is_dir() {
            total_files += count_files_in_directory(&docvault_dir, false);
        }
    }

    if vault_entries.is_some() && vault_masters.is_some() {
        total_files += 2; // vault/info.json and vault/vault.md
    }

    // 2. 创建进度追踪器
    let mut tracker = ProgressTracker::new(&app, total_files);
    tracker.emit(); // 发送初始进度（0/total）

    // 3. 开始导出
    let file = fs::File::create(&output_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);

    let zip_options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // 4. 项目基础信息
    zip.start_file("info.json", zip_options).map_err(|e| e.to_string())?;
    let project_json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    zip.write_all(project_json.as_bytes()).map_err(|e| e.to_string())?;
    tracker.increment();

    // 5. 项目源码导出
    if project_root.exists() && project_root.is_dir() {
        let folder_name = sanitize_filename(&project.name);
        let zip_project_path = format!("project/{}", folder_name);
        add_directory_to_zip(
            &mut zip,
            &project_root,
            &zip_project_path,
            zip_options,
            ignore_dirs,
            Some(&mut tracker),
        )?;
    }

    // 6. 导出文档库
    if let Some(path) = docvault_path {
        let docvault_dir = PathBuf::from(&path);
        if docvault_dir.exists() && docvault_dir.is_dir() {
            add_directory_to_zip(&mut zip, &docvault_dir, "docs", zip_options, false, Some(&mut tracker))?;
        }
    }

    // 7. 保险箱解密导出
    if let (Some(entries), Some(master)) = (vault_entries, vault_masters) {
        let exported_at = Utc::now().to_rfc3339();

        let export_payload = VaultExport {
            entries,
            masters: master,
        };
        let decrypted = decrypt_vault_export(export_payload).await?;

        let import_data: Vec<VaultImportEntry> = decrypted.iter().map(|e| {
            VaultImportEntry {
                title: e.title.clone(),
                param_key: e.param_key.clone(),
                param_value: e.param_value.clone(),
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

        zip.start_file("vault/info.json", zip_options).map_err(|e| e.to_string())?;
        zip.write_all(serde_json::to_string_pretty(&vault_json).unwrap().as_bytes()).map_err(|e| e.to_string())?;
        tracker.increment();

        let md_report = vault_to_markdown(&decrypted, &exported_at);
        zip.start_file("vault/vault.md", zip_options).map_err(|e| e.to_string())?;
        zip.write_all(md_report.as_bytes()).map_err(|e| e.to_string())?;
        tracker.increment();
    }

    zip.finish().map_err(|e| e.to_string())?;

    // 发送完成事件
    tracker.complete();

    Ok(())
}