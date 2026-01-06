use std::path::{PathBuf};
use std::process::Command;

#[tauri::command]
pub fn open_in_file_explorer(path: Option<String>) -> Result<(), String> {
    // path 为 None 就用用户主目录
    let path: PathBuf = match path {
        Some(p) => PathBuf::from(p),
        None => dirs::home_dir().ok_or("Cannot find home directory")?,
    };

    if !path.exists() {
        return Err(format!("Path does not exist: {:?}", path));
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .status()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .status()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .status()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
