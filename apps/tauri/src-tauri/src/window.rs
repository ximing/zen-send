use std::sync::atomic::Ordering;

use crate::state::{app_url, save_config, DesktopState};
use tauri::webview::{NewWindowResponse, PageLoadEvent};
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_opener::OpenerExt;

pub fn show_main(app: &AppHandle) {
    #[cfg(target_os = "macos")]
    {
        let _ = app.show();
    }
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

fn remember_window(app: &AppHandle, window: &tauri::WebviewWindow) {
    let Some(state) = app.try_state::<DesktopState>() else {
        return;
    };
    let mut config = state.config.lock().expect("config");
    let maximized = window.is_maximized().unwrap_or(false);
    config.window.is_maximized = maximized;
    if !maximized {
        if let (Ok(position), Ok(size), Ok(scale)) = (
            window.outer_position(),
            window.outer_size(),
            window.scale_factor(),
        ) {
            let position = position.to_logical::<f64>(scale);
            let size = size.to_logical::<f64>(scale);
            config.window.x = Some(position.x);
            config.window.y = Some(position.y);
            config.window.width = size.width;
            config.window.height = size.height;
        }
    }
    let snapshot = config.clone();
    drop(config);
    save_config(app, &snapshot);
}

pub fn bridge_script(server_url: &str, version: &str, platform: &str) -> String {
    include_str!("../scripts/zen-bridge.js")
        .replace(
            "__ZEN_SERVER_URL__",
            &serde_json::to_string(server_url).unwrap_or_else(|_| "\"\"".into()),
        )
        .replace(
            "__ZEN_VERSION__",
            &serde_json::to_string(version).unwrap_or_else(|_| "\"\"".into()),
        )
        .replace(
            "__ZEN_PLATFORM__",
            &serde_json::to_string(platform).unwrap_or_else(|_| "\"\"".into()),
        )
}

pub fn create_main_window(app: &AppHandle) -> tauri::Result<()> {
    let page = app_url();
    let parsed: Url = page.parse().expect("invalid ZEN_SEND_WEB_URL");
    let state = app.state::<DesktopState>();
    let (saved, server_url) = {
        let config = state.config.lock().expect("config");
        (config.window.clone(), config.server_url.clone())
    };
    let version = app.package_info().version.to_string();
    let script = bridge_script(&server_url, &version, crate::state::electron_platform());

    let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed.clone()))
        .title("Zen Send")
        .inner_size(saved.width, saved.height)
        .min_inner_size(460.0, 600.0)
        .visible(false)
        .initialization_script(script)
        .on_page_load(|window, payload| {
            if payload.event() == PageLoadEvent::Finished {
                let _ = window.show();
            }
        })
        .on_navigation(|url| url.scheme() != "file")
        .on_new_window({
            let app_handle = app.clone();
            move |url, _features| {
                if url.scheme() == "https" {
                    let _ = app_handle.opener().open_url(url.as_str(), None::<&str>);
                }
                NewWindowResponse::Deny
            }
        });

    if let (Some(x), Some(y)) = (saved.x, saved.y) {
        if position_is_visible(app, x, y) {
            builder = builder.position(x, y);
        }
    }
    if saved.is_maximized {
        builder = builder.maximized(true);
    }
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone())?;
    }

    let window = builder.build()?;
    let app_handle = app.clone();
    let watched = window.clone();
    window.on_window_event(move |event| match event {
        WindowEvent::CloseRequested { api, .. } => {
            remember_window(&app_handle, &watched);
            let quitting = app_handle
                .try_state::<DesktopState>()
                .map(|state| state.quitting.load(Ordering::SeqCst))
                .unwrap_or(false);
            if !quitting {
                api.prevent_close();
                let _ = watched.hide();
            }
        }
        WindowEvent::Moved(_) | WindowEvent::Resized(_) => {
            remember_window(&app_handle, &watched);
        }
        WindowEvent::DragDrop(tauri::DragDropEvent::Drop { paths, .. }) => {
            let files: Vec<String> = paths
                .iter()
                .filter(|path| path.is_file())
                .map(|path| path.display().to_string())
                .collect();
            if files.is_empty() {
                return;
            }
            if let Ok(json) = serde_json::to_string(&files) {
                let _ = watched.eval(format!(
                    "window.__zenEmitFileDrop&&window.__zenEmitFileDrop({json})"
                ));
            }
        }
        _ => {}
    });

    Ok(())
}

fn position_is_visible(app: &AppHandle, x: f64, y: f64) -> bool {
    let Ok(monitors) = app.available_monitors() else {
        return true;
    };
    monitors.iter().any(|monitor| {
        let scale = monitor.scale_factor();
        let origin = monitor.position().to_logical::<f64>(scale);
        let size = monitor.size().to_logical::<f64>(scale);
        x >= origin.x - size.width
            && x <= origin.x + size.width
            && y >= origin.y - size.height
            && y <= origin.y + size.height
    })
}
