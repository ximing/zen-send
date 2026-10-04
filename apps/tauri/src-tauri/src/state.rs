use std::fs;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

pub const PROD_WEB_URL: &str = "https://zs.aimo.plus";
pub const DEV_WEB_URL: &str = "http://localhost:5274";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct WindowState {
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub width: f64,
    pub height: f64,
    pub is_maximized: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            x: None,
            y: None,
            width: 1200.0,
            height: 800.0,
            is_maximized: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PersistedConfig {
    pub server_url: String,
    pub accelerator: String,
    pub window: WindowState,
}

impl Default for PersistedConfig {
    fn default() -> Self {
        Self {
            server_url: app_url(),
            accelerator: String::new(),
            window: WindowState::default(),
        }
    }
}

pub struct DesktopState {
    pub config: Mutex<PersistedConfig>,
    pub quitting: AtomicBool,
    pub zoom: Mutex<f64>,
}

pub fn app_url() -> String {
    if let Ok(url) = std::env::var("ZEN_SEND_WEB_URL") {
        let url = url.trim();
        if !url.is_empty() {
            return url.to_string();
        }
    }

    if cfg!(debug_assertions) {
        DEV_WEB_URL.to_string()
    } else {
        PROD_WEB_URL.to_string()
    }
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|err| err.to_string())?;
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    Ok(dir.join("config.json"))
}

pub fn load_config(app: &AppHandle) -> PersistedConfig {
    let Ok(path) = config_path(app) else {
        return PersistedConfig::default();
    };
    let Ok(raw) = fs::read_to_string(path) else {
        return PersistedConfig::default();
    };
    let mut config: PersistedConfig = serde_json::from_str(&raw).unwrap_or_default();
    if config.server_url.trim().is_empty() {
        config.server_url = app_url();
    }
    if config.window.width < 460.0 {
        config.window.width = 1200.0;
    }
    if config.window.height < 600.0 {
        config.window.height = 800.0;
    }
    config
}

pub fn save_config(app: &AppHandle, config: &PersistedConfig) {
    let Ok(path) = config_path(app) else {
        return;
    };
    let Ok(raw) = serde_json::to_string_pretty(config) else {
        return;
    };
    let _ = fs::write(path, raw);
}

pub fn electron_platform() -> &'static str {
    match std::env::consts::OS {
        "macos" => "darwin",
        "windows" => "win32",
        _ => "linux",
    }
}
