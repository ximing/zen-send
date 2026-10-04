fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "set_server_url",
            "get_global_shortcut",
            "set_global_shortcut",
            "clear_global_shortcut",
            "open_file_dialog",
            "save_file_dialog",
            "read_file",
            "write_file",
        ]),
    ))
    .expect("failed to run tauri-build");
}
