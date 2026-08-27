# Pokémon Stalactite Launcher — Wails / Go

Migration du launcher Electron vers **Go + Wails v2 + Vite/Vanilla JS**.

## Architecture

```text
.
├── main.go
├── app.go
├── backend/
│   └── launcher/
│       ├── download.go
│       ├── paths.go
│       ├── run.go
│       ├── types.go
│       ├── updater.go
│       └── version.go
├── frontend/
│   ├── assets/
│   ├── locales/
│   ├── index.html
│   └── src/
│       ├── core/
│       ├── components/
│       ├── pages/
│       └── styles/
├── build/windows/icon.ico
├── go.mod
└── wails.json
```

## Développement

Prérequis : Go 1.21+, Node.js/npm et Wails CLI.

```bash
wails dev
```

## Build Windows

```bash
wails build -platform windows/amd64 -webview2 download
```

Pour embarquer le bootstrapper WebView2 :

```bash
wails build -platform windows/amd64 -webview2 embed
```

Le projet n'utilise plus Electron, `ipcRenderer`, `child_process`, `axios`, `extract-zip` ou `electron-updater`.

## Données conservées

Le jeu et `version.json` sont stockés dans le répertoire de configuration utilisateur :

```text
%APPDATA%\Pokemon-Stalactite-Launcher\
├── game_folder\
├── version.json
└── game_temp.zip
```

## Points importants

- Splash screen supprimé.
- Fenêtre 1050×620, frameless et non redimensionnable.
- Téléchargement streaming avec progression/vitesse/ETA.
- Extraction ZIP protégée contre le Zip Slip.
- Lancement natif de `Game.exe`.
- Ouverture du dossier via Explorer.
- Auto-update du launcher via GitHub Releases.
- Frontend découpé en composants/pages/modules.
- `webview` Electron remplacé par un `iframe` standard pour le compteur en ligne.
