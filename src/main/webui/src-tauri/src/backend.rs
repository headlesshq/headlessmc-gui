//! Runs the HeadlessMc Web backend, the native image of the Quarkus app that Quinoa bundles as sidecar.

use std::fs::{self, File};
use std::net::{Ipv4Addr, SocketAddr, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager, Url};

/// The sidecar's name, `quarkus.quinoa.tauri.sidecar-name`. Tauri places it next to the executable.
const SIDECAR: &str = "quarkus-backend";
const STARTUP_TIMEOUT: Duration = Duration::from_secs(30);
const SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(15);

pub struct Backend {
    pub url: Url,
    child: Mutex<Option<Child>>,
}

impl Backend {
    /// Starts the backend and waits until it accepts connections.
    pub fn start(app: &AppHandle) -> Result<Backend, String> {
        let sidecar = sidecar_path()?;
        let log_file = log_file(app)?;
        let log = File::create(&log_file).map_err(|e| format!("Failed to create {}: {e}", log_file.display()))?;
        let log_err = log.try_clone().map_err(|e| e.to_string())?;
        let port = free_port()?;

        let mut command = Command::new(&sidecar);
        command
            .arg(format!("-Dquarkus.http.port={port}"))
            .arg("-Dhmc.web.exit-on-stdin-close=true")
            .arg("-Dhmc.web.java.current.enabled=false")
            .stdin(Stdio::piped())
            .stdout(log)
            .stderr(log_err);
        hide_console_window(&mut command);
        remove_appimage_env(&mut command);

        let mut child = command.spawn().map_err(|e| format!("Failed to start {}: {e}", sidecar.display()))?;
        if let Err(e) = await_port(&mut child, port) {
            let _ = child.kill();
            return Err(format!("{e}\n\n{}", tail(&log_file)));
        }

        let url = Url::parse(&format!("http://127.0.0.1:{port}")).map_err(|e| e.to_string())?;
        Ok(Backend { url, child: Mutex::new(Some(child)) })
    }

    /// Asks the backend to shut down by closing its stdin, and kills it if it does not exit in time.
    pub fn stop(&self) {
        let Some(mut child) = self.child.lock().unwrap().take() else {
            return;
        };

        drop(child.stdin.take());
        let deadline = Instant::now() + SHUTDOWN_TIMEOUT;
        while Instant::now() < deadline {
            match child.try_wait() {
                Ok(Some(_)) => return,
                Ok(None) => thread::sleep(Duration::from_millis(100)),
                Err(_) => break,
            }
        }

        let _ = child.kill();
        let _ = child.wait();
    }
}

fn sidecar_path() -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| format!("Failed to find the executable: {e}"))?;
    let name = if cfg!(windows) { format!("{SIDECAR}.exe") } else { SIDECAR.to_string() };
    let path = exe.parent().map(|dir| dir.join(&name)).unwrap_or_else(|| PathBuf::from(&name));
    if path.is_file() {
        Ok(path)
    } else {
        Err(format!("{} is missing, build the app with ./gradlew build -Pdesktop", path.display()))
    }
}

fn log_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_log_dir().map_err(|e| format!("Failed to find the log directory: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create {}: {e}", dir.display()))?;
    Ok(dir.join("backend.log"))
}

fn free_port() -> Result<u16, String> {
    TcpListener::bind((Ipv4Addr::LOCALHOST, 0))
        .and_then(|listener| listener.local_addr())
        .map(|addr| addr.port())
        .map_err(|e| format!("Failed to find a free port: {e}"))
}

fn await_port(child: &mut Child, port: u16) -> Result<(), String> {
    let addr = SocketAddr::from((Ipv4Addr::LOCALHOST, port));
    let deadline = Instant::now() + STARTUP_TIMEOUT;
    while Instant::now() < deadline {
        if let Ok(Some(status)) = child.try_wait() {
            return Err(format!("The backend exited during startup ({status})."));
        }

        if TcpStream::connect_timeout(&addr, Duration::from_millis(250)).is_ok() {
            return Ok(());
        }

        thread::sleep(Duration::from_millis(20));
    }

    Err(format!("The backend did not start within {} seconds.", STARTUP_TIMEOUT.as_secs()))
}

fn tail(log_file: &Path) -> String {
    let content = fs::read_to_string(log_file).unwrap_or_default();
    let lines: Vec<&str> = content.lines().collect();
    let tail = lines[lines.len().saturating_sub(20)..].join("\n");
    format!("{}:\n{tail}", log_file.display())
}

/// The AppImage's AppRun points GTK, GIO and XDG variables into the image, so that the bundled WebKitGTK works.
/// The backend and the games it launches should see the user's environment instead:
/// entries pointing into the image are dropped, path lists keep their other entries.
fn remove_appimage_env(command: &mut Command) {
    let Some(app_dir) = std::env::var_os("APPDIR").filter(|_| std::env::var_os("APPIMAGE").is_some()) else {
        return;
    };

    let app_dir = app_dir.to_string_lossy().into_owned();
    for name in ["APPDIR", "APPIMAGE", "ARGV0", "OWD", "GTK_THEME"] {
        command.env_remove(name);
    }

    for (name, value) in std::env::vars() {
        if !value.contains(&app_dir) {
            continue;
        }

        let kept: Vec<&str> = value.split(':').filter(|entry| !entry.is_empty() && !entry.starts_with(&app_dir)).collect();
        if kept.is_empty() {
            command.env_remove(&name);
        } else {
            command.env(&name, kept.join(":"));
        }
    }
}

#[cfg(windows)]
fn hide_console_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_console_window(_command: &mut Command) {}
