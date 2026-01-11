use std::process::Command;

#[tauri::command]
pub fn open_in_editor(editor_path: String, file_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new(&editor_path)
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open editor: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-a")
            .arg(&editor_path)
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open editor: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new(&editor_path)
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open editor: {}", e))?;
    }

    Ok(())
}
