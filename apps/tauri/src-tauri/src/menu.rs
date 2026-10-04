use tauri::menu::{AboutMetadata, Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use tauri_plugin_opener::OpenerExt;

use crate::commands::mark_quitting;
use crate::state::DesktopState;
use crate::window::show_main;

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    let version = app.package_info().version.to_string();
    let edit = edit_menu(app)?;
    let view = view_menu(app)?;
    let window_menu = window_menu(app)?;
    let help = help_menu(app)?;

    let menu = if cfg!(target_os = "macos") {
        let app_menu = Submenu::with_items(
            app,
            "Zen Send",
            true,
            &[
                &PredefinedMenuItem::about(
                    app,
                    None::<&str>,
                    Some(AboutMetadata {
                        name: Some("Zen Send".into()),
                        version: Some(version),
                        copyright: Some("Copyright © 2026 Zen Send".into()),
                        website: Some("https://github.com/ximing/zen-send".into()),
                        website_label: Some("GitHub".into()),
                        comments: Some(
                            "Cross-platform clipboard, text, and file transfer tool".into(),
                        ),
                        ..Default::default()
                    }),
                )?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::hide(app, None::<&str>)?,
                &PredefinedMenuItem::hide_others(app, None::<&str>)?,
                &PredefinedMenuItem::show_all(app, None::<&str>)?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItem::with_id(app, "quit", "Quit Zen Send", true, Some("CmdOrCtrl+Q"))?,
            ],
        )?;
        Menu::with_items(app, &[&app_menu, &edit, &view, &window_menu, &help])?
    } else {
        let file = Submenu::with_items(
            app,
            "File",
            true,
            &[&MenuItem::with_id(
                app,
                "quit",
                "Quit",
                true,
                Some("CmdOrCtrl+Q"),
            )?],
        )?;
        Menu::with_items(app, &[&file, &edit, &view, &window_menu, &help])?
    };

    app.set_menu(menu)?;
    app.on_menu_event(|app, event| handle_menu(app, event));
    Ok(())
}

fn edit_menu(app: &AppHandle) -> tauri::Result<Submenu<tauri::Wry>> {
    Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None::<&str>)?,
            &PredefinedMenuItem::redo(app, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None::<&str>)?,
            &PredefinedMenuItem::copy(app, None::<&str>)?,
            &PredefinedMenuItem::paste(app, None::<&str>)?,
            &PredefinedMenuItem::select_all(app, None::<&str>)?,
        ],
    )
}

fn view_menu(app: &AppHandle) -> tauri::Result<Submenu<tauri::Wry>> {
    let devtools_accelerator = if cfg!(target_os = "macos") {
        "Alt+Cmd+I"
    } else {
        "Ctrl+Shift+I"
    };
    Submenu::with_items(
        app,
        "View",
        true,
        &[
            &MenuItem::with_id(app, "reload", "Reload", true, Some("CmdOrCtrl+R"))?,
            &MenuItem::with_id(
                app,
                "devtools",
                "Toggle Developer Tools",
                true,
                Some(devtools_accelerator),
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "zoom-reset", "Reset Zoom", true, Some("CmdOrCtrl+0"))?,
            &MenuItem::with_id(app, "zoom-in", "Zoom In", true, Some("CmdOrCtrl+Plus"))?,
            &MenuItem::with_id(app, "zoom-out", "Zoom Out", true, Some("CmdOrCtrl+-"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(
                app,
                "fullscreen",
                "Toggle Full Screen",
                true,
                Some(if cfg!(target_os = "macos") {
                    "Ctrl+Cmd+F"
                } else {
                    "F11"
                }),
            )?,
        ],
    )
}

fn window_menu(app: &AppHandle) -> tauri::Result<Submenu<tauri::Wry>> {
    let minimize = PredefinedMenuItem::minimize(app, None::<&str>)?;
    let close = PredefinedMenuItem::close_window(app, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let show = MenuItem::with_id(app, "show-main", "Show Main Window", true, None::<&str>)?;
    if cfg!(target_os = "macos") {
        let separator_mac = PredefinedMenuItem::separator(app)?;
        let front = PredefinedMenuItem::bring_all_to_front(app, None::<&str>)?;
        let fullscreen = PredefinedMenuItem::fullscreen(app, None::<&str>)?;
        Submenu::with_items(
            app,
            "Window",
            true,
            &[
                &minimize,
                &close,
                &separator,
                &show,
                &separator_mac,
                &front,
                &fullscreen,
            ],
        )
    } else {
        Submenu::with_items(app, "Window", true, &[&minimize, &close, &separator, &show])
    }
}

fn help_menu(app: &AppHandle) -> tauri::Result<Submenu<tauri::Wry>> {
    Submenu::with_items(
        app,
        "Help",
        true,
        &[
            &MenuItem::with_id(app, "github", "Visit GitHub", true, None::<&str>)?,
            &MenuItem::with_id(app, "about-dialog", "About Zen Send", true, None::<&str>)?,
        ],
    )
}

fn handle_menu(app: &AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        "quit" | "tray-quit" => {
            mark_quitting(app);
            app.exit(0);
        }
        "show-main" | "tray-show" => show_main(app),
        "reload" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.eval("location.reload()");
            }
        }
        "devtools" => {
            if let Some(window) = app.get_webview_window("main") {
                if window.is_devtools_open() {
                    window.close_devtools();
                } else {
                    window.open_devtools();
                }
            }
        }
        "zoom-reset" => set_zoom(app, None),
        "zoom-in" => set_zoom(app, Some(1.1)),
        "zoom-out" => set_zoom(app, Some(1.0 / 1.1)),
        "fullscreen" => {
            if let Some(window) = app.get_webview_window("main") {
                let next = !window.is_fullscreen().unwrap_or(false);
                let _ = window.set_fullscreen(next);
            }
        }
        "github" => {
            let _ = app
                .opener()
                .open_url("https://github.com/ximing/zen-send", None::<&str>);
        }
        "about-dialog" => {
            let version = app.package_info().version.to_string();
            app.dialog()
                .message(format!(
                    "Version: {version}\nCross-platform clipboard, text, and file transfer tool"
                ))
                .title("About Zen Send")
                .kind(MessageDialogKind::Info)
                .show(|_| {});
        }
        _ => {}
    }
}

fn set_zoom(app: &AppHandle, factor: Option<f64>) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let Some(state) = app.try_state::<DesktopState>() else {
        return;
    };
    let mut zoom = state.zoom.lock().expect("zoom");
    *zoom = match factor {
        Some(factor) => (*zoom * factor).clamp(0.5, 3.0),
        None => 1.0,
    };
    let _ = window.set_zoom(*zoom);
}
