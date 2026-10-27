#[cfg(not(target_os = "macos"))]
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
#[cfg(not(target_os = "macos"))]
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
#[cfg(not(target_os = "macos"))]
use tauri::Manager;
use tauri::AppHandle;

#[cfg(not(target_os = "macos"))]
use crate::window::show_main;

/// macOS 右上角状态栏不放文字，也不放图标。窗口从 Dock 或全局快捷键唤起。
#[cfg(target_os = "macos")]
pub fn install(_app: &AppHandle) -> tauri::Result<()> {
    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn install(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "tray-show", "显示主窗口", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "tray-quit", "退出应用", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &PredefinedMenuItem::separator(app)?, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main")
        .tooltip("Zen Send")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                        return;
                    }
                }
                show_main(app);
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    } else {
        builder = builder.icon(tauri::image::Image::from_bytes(include_bytes!(
            "../icons/32x32.png"
        ))?);
    }

    builder.build(app)?;
    Ok(())
}
