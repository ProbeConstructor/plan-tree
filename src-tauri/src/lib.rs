// SPDX-License-Identifier: GPL-3.0-only

mod vault;

use tauri::{Emitter, Manager};

// WebKitGTK fallback: algunos GPUs/compositores no soportan DMA-BUF.
// Si no se desactiva, el webview no crea el buffer y la ventana se ve
// en blanco. Esta variable es inocua en sistemas donde DMA-BUF funciona.
fn _ensure_webkit_compat() {
  if cfg!(target_os = "linux") {
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
  }
}

#[derive(Clone, serde::Serialize)]
struct SingleInstancePayload {
  args: Vec<String>,
  cwd: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  _ensure_webkit_compat();
  tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
      let _ = app.emit("single-instance", SingleInstancePayload { args, cwd });
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
      }
    }))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .manage(vault::VaultState::default())
    .manage(vault::UnlockRateLimit::default())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      vault::generate_salt,
      vault::unlock,
      vault::unlock_no_length_check,
      vault::lock,
      vault::is_unlocked,
      vault::encrypt,
      vault::decrypt,
      vault::setup_recovery,
      vault::unlock_with_recovery,
      vault::reset_master_key,
      vault::reset_master_key_atomic
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}