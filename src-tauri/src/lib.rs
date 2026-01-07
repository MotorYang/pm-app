use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri_plugin_sql::{Migration, MigrationKind};
use tauri::Manager;

mod commands;
mod crypto;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
        }
    ];

    tauri::Builder::default()
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
            ])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:pm-app.db", migrations)
                .build(),
        )
        // --- 托盘配置开始 ---
        .setup(|app| {
            // 1. 创建菜单项
            let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;

            // 2. 组合成菜单
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            // 3. 构建托盘
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone()) // 使用默认图标或指定路径图标
                .menu(&menu)
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