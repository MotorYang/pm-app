use tauri_plugin_sql::{Migration, MigrationKind};
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create initial tables",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        /* 绑定命令 */
        .invoke_handler(tauri::generate_handler![
            commands::terminal::open_terminal,
            commands::folder::open_in_file_explorer
            ])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:pm-app.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}