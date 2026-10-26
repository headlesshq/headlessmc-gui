# HeadlessMc Web

> [!WARNING]
> This is work in progress and currently more of a demo.

A web GUI for [HeadlessMc](https://github.com/headlesshq/headlessmc).

![screenshot](docs/screenshot.png)

## Getting started

```shell
git clone --recurse-submodules https://github.com/headlesshq/headlessmc-web.git

cd src/main/webui && npm install && cd -
./gradlew quarkusDev
```

## Desktop app

`src/main/webui/src-tauri` contains a [Tauri](https://tauri.app) app that runs HeadlessMc Web in its own window.
It is built with [Quinoa's Tauri integration](https://docs.quarkiverse.io/quarkus-quinoa/dev/advanced-guides.html):
the backend is compiled to a native image and bundled as Tauri sidecar, Tauri serves the web ui.
Requires [Rust](https://rustup.rs), the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) of your OS,
and GraalVM 25, or Docker for a container build.

```shell
./gradlew build -Pdesktop -Dquarkus.native.container-build=true
```

The installers (e.g. AppImage, .deb, .rpm on Linux) are placed in `src/main/webui/src-tauri/target/release/bundle`.

During development run `./gradlew quarkusDev` and, in `src/main/webui`, `npm run tauri dev`:
the window then loads the ui from quarkusDev, with hot reload.
The backend log of the desktop app is written to `backend.log` in the app's log directory,
e.g. `~/.local/share/io.github.headlesshq.web/logs` on Linux.
