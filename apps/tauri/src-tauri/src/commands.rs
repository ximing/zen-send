use std::path::Path;
use std::sync::atomic::Ordering;

use serde::Deserialize;
use tauri::async_runtime::spawn_blocking;
use tauri::{AppHandle, Manager, Runtime, State};
use tauri_plugin_dialog::{DialogExt, FileDialogBuilder};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

use crate::state::{save_config, DesktopState};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenFileOptions {
    pub title: Option<String>,
    pub filters: Option<Vec<FileFilter>>,
    #[serde(default, alias = "multiSelections")]
    pub multiple: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFileOptions {
    pub title: Option<String>,
    pub default_path: Option<String>,
    pub filters: Option<Vec<FileFilter>>,
}

#[derive(Debug, serde::Serialize)]
pub struct ShortcutResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

fn path_to_string(path: tauri_plugin_dialog::FilePath) -> Option<String> {
    path.into_path()
        .ok()
        .map(|path| path.to_string_lossy().to_string())
}

fn apply_filters<R: Runtime>(
    mut builder: FileDialogBuilder<R>,
    filters: Option<Vec<FileFilter>>,
) -> FileDialogBuilder<R> {
    if let Some(filters) = filters {
        for filter in filters {
            if filter.extensions.iter().any(|ext| ext == "*") {
                continue;
            }
            let extensions: Vec<String> = filter.extensions;
            let refs: Vec<&str> = extensions.iter().map(String::as_str).collect();
            builder = builder.add_filter(filter.name, &refs);
        }
    }
    builder
}

#[tauri::command]
pub fn set_server_url(app: AppHandle, state: State<DesktopState>, url: String) {
    let mut config = state.config.lock().expect("config");
    config.server_url = url;
    let snapshot = config.clone();
    drop(config);
    save_config(&app, &snapshot);
}

#[tauri::command]
pub fn get_global_shortcut(state: State<DesktopState>) -> String {
    state.config.lock().expect("config").accelerator.clone()
}

#[tauri::command]
pub fn set_global_shortcut(
    app: AppHandle,
    state: State<DesktopState>,
    accelerator: String,
) -> ShortcutResult {
    let shortcut = app.global_shortcut();
    if let Err(err) = shortcut.unregister_all() {
        return ShortcutResult {
            success: false,
            error: Some(err.to_string()),
        };
    }

    if !accelerator.is_empty() && shortcut.register(accelerator.as_str()).is_err() {
        return ShortcutResult {
            success: false,
            error: Some("快捷键注册失败，可能已被其他应用占用".to_string()),
        };
    }

    let mut config = state.config.lock().expect("config");
    config.accelerator = accelerator;
    let snapshot = config.clone();
    drop(config);
    save_config(&app, &snapshot);

    ShortcutResult {
        success: true,
        error: None,
    }
}

#[tauri::command]
pub fn clear_global_shortcut(app: AppHandle, state: State<DesktopState>) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|err| err.to_string())?;
    let mut config = state.config.lock().expect("config");
    config.accelerator.clear();
    let snapshot = config.clone();
    drop(config);
    save_config(&app, &snapshot);
    Ok(())
}

#[tauri::command]
pub async fn open_file_dialog(
    app: AppHandle,
    options: Option<OpenFileOptions>,
) -> Result<Option<Vec<String>>, String> {
    let options = options.unwrap_or(OpenFileOptions {
        title: None,
        filters: None,
        multiple: false,
    });
    let multiple = options.multiple;
    let mut builder = app.dialog().file();
    if let Some(title) = options.title {
        builder = builder.set_title(title);
    }
    builder = apply_filters(builder, options.filters);

    spawn_blocking(move || {
        if multiple {
            builder.blocking_pick_files().map(|files| {
                files
                    .into_iter()
                    .filter_map(path_to_string)
                    .collect::<Vec<_>>()
            })
        } else {
            builder
                .blocking_pick_file()
                .and_then(path_to_string)
                .map(|path| vec![path])
        }
    })
    .await
    .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn save_file_dialog(
    app: AppHandle,
    options: Option<SaveFileOptions>,
) -> Result<Option<String>, String> {
    let options = options.unwrap_or(SaveFileOptions {
        title: None,
        default_path: None,
        filters: None,
    });
    let mut builder = app.dialog().file();
    if let Some(title) = options.title {
        builder = builder.set_title(title);
    }
    if let Some(default_path) = options.default_path {
        let path = Path::new(&default_path);
        if let Some(name) = path.file_name() {
            builder = builder.set_file_name(name.to_string_lossy().to_string());
        }
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() {
                builder = builder.set_directory(parent);
            }
        }
    }
    builder = apply_filters(builder, options.filters);

    spawn_blocking(move || builder.blocking_save_file().and_then(path_to_string))
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<Vec<u8>, String> {
    spawn_blocking(move || std::fs::read(path))
        .await
        .map_err(|err| err.to_string())?
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn write_file(path: String, data: Vec<u8>) -> Result<(), String> {
    spawn_blocking(move || std::fs::write(path, data))
        .await
        .map_err(|err| err.to_string())?
        .map_err(|err| err.to_string())
}

pub fn register_saved_shortcut(app: &AppHandle) {
    let Some(state) = app.try_state::<DesktopState>() else {
        return;
    };
    let accelerator = state.config.lock().expect("config").accelerator.clone();
    if accelerator.is_empty() {
        return;
    }
    if app
        .global_shortcut()
        .register(accelerator.as_str())
        .is_err()
    {
        eprintln!("failed to restore global shortcut: {accelerator}");
    }
}

pub fn mark_quitting(app: &AppHandle) {
    if let Some(state) = app.try_state::<DesktopState>() {
        state.quitting.store(true, Ordering::SeqCst);
    }
}
