#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backend;

use backend::Backend;
use tauri::webview::NewWindowResponse;
use tauri::{AppHandle, Manager, RunEvent, Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use tauri_plugin_opener::OpenerExt;

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            // `tauri dev` loads the ui from quarkusDev (devUrl), which serves it next to the api
            if tauri::is_dev() {
                create_window(&handle, None)?;
                return Ok(());
            }

            match Backend::start(&handle) {
                Ok(backend) => {
                    create_window(&handle, Some(&backend.url))?;
                    handle.manage(backend);
                }
                Err(e) => {
                    handle
                        .dialog()
                        .message(e)
                        .title("HeadlessMc failed to start")
                        .kind(MessageDialogKind::Error)
                        .blocking_show();
                    handle.exit(1);
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build the HeadlessMc desktop app");

    app.run(|app, event| {
        if let RunEvent::Exit = event {
            if let Some(backend) = app.try_state::<Backend>() {
                backend.stop();
            }
        }
    });
}

/// Creates the main window, `backend` is injected as `window.__HMC_BACKEND__` for the ui's api calls.
fn create_window(app: &AppHandle, backend: Option<&Url>) -> tauri::Result<()> {
    let navigation_handle = app.clone();
    let new_window_handle = app.clone();
    let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
        .title("HeadlessMc")
        .inner_size(1280.0, 800.0)
        .min_inner_size(800.0, 600.0)
        // the web ui handles dropped mod files itself
        .disable_drag_drop_handler()
        .on_navigation(move |url| {
            if is_internal(url) {
                return true;
            }

            open_externally(&navigation_handle, url);
            false
        })
        .on_new_window(move |url, _features| {
            open_externally(&new_window_handle, &url);
            NewWindowResponse::Deny
        });

    if let Some(backend) = backend {
        let origin = serde_json::to_string(backend.origin().ascii_serialization().as_str()).unwrap_or_default();
        builder = builder.initialization_script(format!("window.__HMC_BACKEND__ = {origin};"));
    }

    builder.build()?;
    Ok(())
}

/// The ui served by Tauri, by quarkusDev during `tauri dev`, and the backend, which only listens on localhost.
fn is_internal(url: &Url) -> bool {
    match url.scheme() {
        "tauri" | "about" | "data" | "blob" => true,
        "http" | "https" => matches!(url.host_str(), Some("tauri.localhost" | "127.0.0.1" | "localhost")),
        _ => false,
    }
}

fn open_externally(app: &AppHandle, url: &Url) {
    if matches!(url.scheme(), "http" | "https" | "mailto") {
        let _ = app.opener().open_url(url.as_str(), None::<&str>);
    }
}
