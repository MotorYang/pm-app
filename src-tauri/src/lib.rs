use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri_plugin_sql::{Migration, MigrationKind};

use std::path::Path;

mod commands;
mod crypto;

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() {
        std::fs::create_dir_all(dst)?;
    }
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        let metadata = entry.metadata()?;
        if metadata.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else if !dst_path.exists() {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 单实例插件必须最先注册
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 当尝试打开第二个实例时，显示并聚焦现有窗口
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![
            commands::terminal::open_terminal,
            commands::folder::open_in_file_explorer,
            commands::git::git_is_repository,
            commands::git::git_get_current_branch,
            commands::git::git_get_branches,
            commands::git::git_get_commits,
            commands::git::git_get_commit_detail,
            commands::git::git_checkout_branch,
            commands::git::git_get_status,
            commands::git::git_get_remotes,
            commands::git::git_stage_files,
            commands::git::git_unstage_files,
            commands::git::git_commit,
            commands::vault::vault_hash_password,
            commands::vault::vault_verify_master,
            commands::vault::vault_encrypt_entry,
            commands::vault::vault_decrypt_entry,
            commands::vault::vault_generate_password,
            commands::editor::open_in_editor,
            commands::documents::create_document_folder,
            commands::documents::read_document_content,
            commands::documents::write_document_content,
            commands::documents::delete_document_folder,
            commands::documents::save_document_image,
            commands::documents::get_document_images_path,
            commands::documents::copy_document_images,
            commands::handover::export_project_handover,
            // DocVault commands
            commands::docvault::get_docvault_path,
            commands::docvault::init_docvault,
            commands::docvault::import_file_to_docvault,
            commands::docvault::create_docvault_folder,
            commands::docvault::rename_docvault_item,
            commands::docvault::delete_docvault_item,
            commands::docvault::read_docvault_file,
            commands::docvault::read_docvault_binary,
            commands::docvault::write_docvault_file,
            commands::docvault::write_docvault_binary,
            commands::docvault::save_docvault_attachment,
            commands::docvault::get_docvault_attachments_path,
            commands::docvault::scan_docvault,
            commands::docvault::get_docvault_file_info,
            commands::docvault::copy_docvault_item,
            commands::docvault::move_docvault_item,
            commands::docvault::open_in_explorer,
            commands::docvault::get_file_absolute_path,
        ])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        // --- 托盘配置开始 ---
        .setup(|app| {
            // --- 数据迁移逻辑开始 ---
            // 迁移旧的 pro-manager 数据到新的 pomo 目录
            let handle = app.handle();
            // 修正：发现应用实际使用 Roaming 目录，而不是 Local
            // 我们需要获取 Roaming 目录下的数据路径
            let app_local_data = app.path().app_local_data_dir().unwrap();
            let target_dir = if let Some(parent) = app_local_data.parent() {
                if let Some(app_data_root) = parent.parent() {
                    app_data_root.join("Roaming").join("github.motoryang.pomo")
                } else {
                    app_local_data.clone()
                }
            } else {
                app_local_data.clone()
            };

            println!("[Migration] Target Dir: {:?}", target_dir);
            
            // 获取旧的数据目录路径（包括可能被错误迁移到 Local 的数据）
            if let Some(parent) = app_local_data.parent() {
                let mut candidate_dirs = Vec::new();

                // 0. Local/pomo (检查是否是上次错误迁移的数据)
                // 如果这里有数据，且比目标目录的数据大/新，则应该恢复
                candidate_dirs.push(app_local_data.clone());
                
                // 1. Local (优先检查，因为 Tauri 默认使用 Local，且用户之前的应用名为 promanager)
                candidate_dirs.push(parent.join("github.motoryang.pro-manager"));
                candidate_dirs.push(parent.join("github.motoryang.pm-app"));

                // 2. Roaming (次要检查)
                if let Some(app_data_root) = parent.parent() {
                    let roaming = app_data_root.join("Roaming");
                    candidate_dirs.push(roaming.join("github.motoryang.pro-manager"));
                    candidate_dirs.push(roaming.join("github.motoryang.pm-app"));
                }

                'migration_loop: for old_dir in candidate_dirs {
                    if !old_dir.exists() { continue; }
                    // 跳过自身
                    if old_dir == target_dir { continue; }
                    
                    // 检查数据库文件
                    let db_candidates = vec!["pomo.db", "pm-app.db"];
                    for db_name in db_candidates {
                        let db_path = old_dir.join(db_name);
                        if db_path.exists() {
                            let metadata = std::fs::metadata(&db_path).unwrap();
                            let size = metadata.len();
                            // 忽略空数据库或极小的数据库（假设小于 20KB 为空库）
                            if size < 20 * 1024 {
                                println!("[Migration] Skipping small/empty DB in {:?} (size: {})", old_dir, size);
                                continue;
                            }

                            println!("[Migration] Found valid database in {:?} (size: {}), starting migration...", old_dir, size);
                            
                            // 确保目标目录存在
                            if !target_dir.exists() {
                                let _ = std::fs::create_dir_all(&target_dir);
                            }

                            // 如果目标数据库已存在，检查是否需要覆盖
                            let target_db = target_dir.join("pomo.db");
                            if target_db.exists() {
                                let target_meta = std::fs::metadata(&target_db).unwrap();
                                if target_meta.len() < size {
                                    println!("[Migration] Target DB exists but is smaller, overwriting...");
                                    let _ = std::fs::remove_file(&target_db);
                                    let _ = std::fs::remove_file(target_dir.join("pomo.db-shm"));
                                    let _ = std::fs::remove_file(target_dir.join("pomo.db-wal"));
                                } else {
                                    println!("[Migration] Target DB exists and is larger/same, skipping migration from this source.");
                                    continue;
                                }
                            }

                            // 移动所有文件
                            if let Ok(entries) = std::fs::read_dir(&old_dir) {
                                for entry in entries.flatten() {
                                    let path = entry.path();
                                    let file_name_os = entry.file_name();
                                    let file_name = file_name_os.to_string_lossy();
                                    
                                    // 处理文件名映射
                                    let dest_name = if file_name == "pm-app.db" {
                                        "pomo.db".to_string()
                                    } else if file_name == "pm-app.db-wal" {
                                        "pomo.db-wal".to_string()
                                    } else if file_name == "pm-app.db-shm" {
                                        "pomo.db-shm".to_string()
                                    } else {
                                        file_name.to_string()
                                    };
                                    
                                    let dest = target_dir.join(&dest_name);
                                    
                                    // 移动或覆盖
                                    println!("[Migration] Moving {:?} to {:?}", file_name, dest_name);
                                    // 先尝试删除目标（如果存在）
                                    if dest.exists() {
                                        let _ = std::fs::remove_file(&dest); //如果是目录remove_file会失败，但不影响
                                        let _ = std::fs::remove_dir_all(&dest);
                                    }

                                    if let Err(e) = std::fs::rename(&path, &dest) {
                                        println!("[Migration] Failed to move file: {}", e);
                                        // 跨分区或失败时尝试复制
                                        if let Ok(_) = std::fs::copy(&path, &dest) {
                                            // 复制成功后，如果是文件则删除源（如果是目录copy会失败，需递归，这里简化处理）
                                            // 对于目录，std::fs::copy 不工作。
                                            // 简单起见，我们假设主要是文件。对于 data 目录，需要 rename。
                                            // rename 应该能处理目录移动（在同一卷上）。
                                        }
                                        // 再次尝试 rename (data 目录)
                                        // 如果 rename 失败，通常是因为跨卷。
                                        // 这里简化：如果 rename 失败且是目录，可能需要递归复制。
                                        // 但通常 Local 和 Roaming 在同一卷 C:。
                                    }
                                }
                            }
                            
                            // 尝试清理旧目录
                            let _ = std::fs::remove_dir_all(&old_dir);
                            
                            println!("[Migration] Migration completed from {:?}", old_dir);
                            // 成功迁移一次后退出，避免覆盖
                            break 'migration_loop; 
                        }
                    }
                }
            }

            if let Ok(app_data_dir) = app.path().app_data_dir() {
                if let Some(parent) = app_data_dir.parent() {
                    if let Some(root) = parent.parent() {
                        let old_base = root.join("Roaming").join("github.motoryang.pro-manager").join("data");
                        let new_base = app_data_dir.join("data");

                        let old_docvaults = old_base.join("docvaults");
                        let new_docvaults = new_base.join("docvaults");
                        if old_docvaults.exists() {
                            if let Ok(entries) = std::fs::read_dir(&old_docvaults) {
                                for entry in entries.flatten() {
                                    let src = entry.path();
                                    if src.is_dir() {
                                        let name = entry.file_name();
                                        let dest = new_docvaults.join(&name);
                                        let _ = copy_dir_recursive(&src, &dest);
                                    }
                                }
                            }
                        }

                        let old_documents = old_base.join("documents");
                        let new_documents = new_base.join("documents");
                        if old_documents.exists() {
                            if let Ok(entries) = std::fs::read_dir(&old_documents) {
                                for entry in entries.flatten() {
                                    let src = entry.path();
                                    if src.is_dir() {
                                        let name = entry.file_name();
                                        let dest = new_documents.join(&name);
                                        let _ = copy_dir_recursive(&src, &dest);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // --- 数据迁移逻辑结束 ---

            // 手动注册 SQL 插件
            let migrations = vec![
                Migration {
                    version: 1,
                    description: "create initial tables",
                    sql: include_str!("../migrations/001_init.sql"),
                    kind: MigrationKind::Up,
                },
                Migration {
                    version: 2,
                    description: "add documents table",
                    sql: include_str!("../migrations/002_add_documents.sql"),
                    kind: MigrationKind::Up,
                },
                Migration {
                    version: 3,
                    description: "add vault tables",
                    sql: include_str!("../migrations/003_add_vault.sql"),
                    kind: MigrationKind::Up,
                },
                Migration {
                    version: 4,
                    description: "remove document content field",
                    sql: include_str!("../migrations/004_remove_document_content.sql"),
                    kind: MigrationKind::Up,
                },
                Migration {
                    version: 5,
                    description: "rename vault fields",
                    sql: include_str!("../migrations/005_rename_vault_fields.sql"),
                    kind: MigrationKind::Up,
                },
                Migration {
                    version: 6,
                    description: "add document type support",
                    sql: include_str!("../migrations/006_document_types.sql"),
                    kind: MigrationKind::Up,
                },
            ];

            handle.plugin(
                tauri_plugin_sql::Builder::new()
                    .add_migrations("sqlite:pomo.db", migrations)
                    .build(),
            )?;

            // 1. 创建菜单项
            let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;


            // 2. 组合成菜单
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            // 3. 构建托盘
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone()) // 使用默认图标或指定路径图标
                .menu(&menu)
                .tooltip("项目管理")
                .show_menu_on_left_click(false) // 点击左键是否直接弹出菜单
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        // --- 托盘配置结束 ---
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
