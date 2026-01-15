// Project management commands
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub path: String,
    pub description: Option<String>,
    pub color: String,
    pub created_at: String,
    pub last_accessed: String,
    pub settings: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewProject {
    pub name: String,
    pub path: String,
    pub description: Option<String>,
    pub color: Option<String>,
}

#[tauri::command]
pub async fn get_all_projects(app: tauri::AppHandle) -> Result<Vec<Project>, String> {
    use tauri_plugin_sql::{Builder, Migration, MigrationKind};

    let db = app.state::<tauri_plugin_sql::DbPool>();
    let connection = db.get("sqlite:pomo.db")
        .ok_or("Failed to get database connection")?;

    let result: Vec<Project> = tauri_plugin_sql::query("SELECT * FROM projects ORDER BY last_accessed DESC")
        .fetch_all(connection)
        .await
        .map_err(|e| format!("Database query failed: {}", e))?;

    Ok(result)
}

#[tauri::command]
pub async fn add_project(
    app: tauri::AppHandle,
    project: NewProject,
) -> Result<i64, String> {
    let db = app.state::<tauri_plugin_sql::DbPool>();

    let color = project.color.unwrap_or_else(|| "#FF6B9D".to_string());
    let description = project.description.unwrap_or_default();

    let result = db
        .get("sqlite:pomo.db")
        .ok_or("Failed to get database connection")?
        .execute(
            "INSERT INTO projects (name, path, description, color) VALUES (?, ?, ?, ?)",
            &[&project.name, &project.path, &description, &color],
        )
        .await
        .map_err(|e| format!("Failed to insert project: {}", e))?;

    Ok(result.last_insert_rowid())
}

#[tauri::command]
pub async fn delete_project(
    app: tauri::AppHandle,
    id: i64,
) -> Result<(), String> {
    let db = app.state::<tauri_plugin_sql::DbPool>();

    db.get("sqlite:pomo.db")
        .ok_or("Failed to get database connection")?
        .execute("DELETE FROM projects WHERE id = ?", &[&id])
        .await
        .map_err(|e| format!("Failed to delete project: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn update_project_access_time(
    app: tauri::AppHandle,
    id: i64,
) -> Result<(), String> {
    let db = app.state::<tauri_plugin_sql::DbPool>();

    db.get("sqlite:pomo.db")
        .ok_or("Failed to get database connection")?
        .execute(
            "UPDATE projects SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?",
            &[&id],
        )
        .await
        .map_err(|e| format!("Failed to update access time: {}", e))?;

    Ok(())
}

