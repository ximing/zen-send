mod commands;
mod menu;
mod state;
mod tray;
mod window;

use std::sync::atomic::AtomicBool;
use std::sync::Mutex;

use tauri::{Manager, RunEvent};
use tauri_plugin_global_shortcut::ShortcutState;

use crate::commands::register_saved_shortcut;
use crate::state::DesktopState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        window::show_main(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            app.manage(DesktopState {
                config: Mutex::new(state::load_config(app.handle())),
                quitting: AtomicBool::new(false),
                zoom: Mutex::new(1.0),
            });
            window::create_main_window(app.handle())?;
            menu::install(app.handle())?;
            tray::install(app.handle())?;
            register_saved_shortcut(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::set_server_url,
            commands::get_global_shortcut,
            commands::set_global_shortcut,
            commands::clear_global_shortcut,
            commands::open_file_dialog,
            commands::save_file_dialog,
            commands::read_file,
            commands::write_file,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Zen Send")
        .run(|app, event| {
            if let RunEvent::ExitRequested { .. } = event {
                commands::mark_quitting(app);
            }
            if let RunEvent::Reopen { .. } = event {
                window::show_main(app);
            }
        });
}
