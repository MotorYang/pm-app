use tauri_plugin_sql::{Migration, MigrationKind};
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
        }
    ];

    tauri::Builder::default()
        /* 绑定命令 */
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
            commands::vault::vault_hash_password,
            commands::vault::vault_verify_master,
            commands::vault::vault_encrypt_entry,
            commands::vault::vault_decrypt_entry,
            commands::vault::vault_generate_password,
            commands::editor::open_in_editor,
            ])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:pm-app.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}