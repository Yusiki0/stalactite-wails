# Migration report — Electron → Wails

## Source audit

The original launcher contained:

- `main.js`: BrowserWindow, splash, IPC, game update, download, extraction, launch, uninstall and window controls.
- `updater.js`: `electron-updater` integration against GitHub Releases.
- `index.html`: UI plus most application logic embedded in inline scripts.
- `i18n.js`: locale loader using Electron `require()` with browser fallback.
- `style.css`: 1275-line monolithic stylesheet.
- Electron dependencies: axios, adm-zip, extract-zip, fs-extra, electron-log and electron-updater.

## Migrated

### Backend

- Wails application entry point in `main.go`.
- Bound application service in `app.go`.
- Game launcher service in `backend/launcher/`.
- Native streaming HTTP download using `net/http`.
- ZIP extraction using Go's standard `archive/zip`.
- Zip Slip protection during extraction.
- Native Windows process launch using `os/exec`.
- Native Explorer folder opening.
- Local version persistence in the user configuration directory.
- GitHub Releases launcher updater replacing `electron-updater`.

### Frontend

- Vite + Vanilla JS.
- Navigation isolated into a component module.
- Window controls isolated from application logic.
- Home/download/launch logic isolated into a page module.
- Patch notes, settings and credits isolated into page modules.
- Wails API wrapper replacing Electron IPC.
- Wails events replacing renderer IPC listeners.
- Electron `<webview>` replaced by a normal `<iframe>` for the online-player counter.
- Splash screen removed entirely.
- CSS split into base/layout/pages/components/banner modules.

## Intentional compatibility choices

The existing JSONBin endpoints and GitHub repository are preserved so the migration does not silently change the server-side release workflow.

The game installation remains in the per-user application data directory rather than beside the executable, matching the original Electron behavior.

## Build caveat

The execution environment used for this migration has Go and Node installed, but cannot access the public Go/npm registries. Therefore dependency resolution and a real Windows Wails build could not be executed here. The Go source has been formatted and the frontend JavaScript files pass Node syntax validation.

On a Windows development machine with network access, run:

```powershell
wails doctor
wails dev
```

Then build with:

```powershell
wails build -platform windows/amd64 -webview2 download
```

Wails generates its `wailsjs` bindings during development/build. The current frontend intentionally uses the standard `window.go.main.App` binding surface, which is the normal non-obfuscated Wails v2 binding mechanism.
