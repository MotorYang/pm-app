use std::process::Command as SysCommand;
use std::path::PathBuf;

#[tauri::command]
pub fn open_terminal(dir: Option<String>) -> Result<(), String> {
    // 获取目录
    let path = match dir {
        Some(d) => PathBuf::from(d),
        None => dirs::home_dir().ok_or("无法获取用户主目录")?,
    };

    if !path.exists() {
        return Err(format!("目录不存在: {:?}", path));
    }

    // 根据操作系统选择终端命令
    #[cfg(target_os = "windows")]
    {
        // Windows Terminal (wt) 或 cmd fallback
        let status = SysCommand::new("wt")
            .arg("-d")
            .arg(path.as_os_str())
            .status()
            .or_else(|_| {
                SysCommand::new("cmd")
                    .arg("/k")
                    .arg(format!("cd /d {}", path.display()))
                    .status()
            })
            .map_err(|e| e.to_string())?;

        if status.success() {
            Ok(())
        } else {
            Err(format!("终端启动失败，退出码: {:?}", status.code()))
        }
    }

    #[cfg(target_os = "macos")]
    {
        let status = SysCommand::new("open")
            .arg("-a")
            .arg("Terminal")
            .arg(path.as_os_str())
            .status()
            .map_err(|e| e.to_string())?;

        if status.success() {
            Ok(())
        } else {
            Err(format!("终端启动失败，退出码: {:?}", status.code()))
        }
    }

    #[cfg(target_os = "linux")]
    {
        let status = SysCommand::new("gnome-terminal")
            .arg("--working-directory")
            .arg(path.as_os_str())
            .status()
            .or_else(|_| {
                SysCommand::new("x-terminal-emulator")
                    .arg("--working-directory")
                    .arg(path.as_os_str())
                    .status()
            })
            .map_err(|e| e.to_string())?;

        if status.success() {
            Ok(())
        } else {
            Err(format!("终端启动失败，退出码: {:?}", status.code()))
        }
    }
}