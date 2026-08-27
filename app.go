package main

import (
	"context"
	"log"

	launcher "github.com/Yusiki0/Stalactite-Launcher-Wails/backend/launcher"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const launcherVersion = "1.0.7"

type App struct {
	ctx      context.Context
	launcher *launcher.Launcher
	updater  *launcher.LauncherUpdater
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.launcher = launcher.NewLauncher(ctx)
	a.updater = launcher.NewLauncherUpdater(ctx, "Yusiki0", "Stalactite-Launcher-Auto-updater")
}

func (a *App) domReady(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) GetLauncherVersion() string {
	return launcherVersion
}

func (a *App) CheckForUpdates() launcher.UpdateStatus {
	if a.launcher == nil {
		return launcher.UpdateStatus{Type: "ERROR"}
	}
	return a.launcher.CheckForUpdates()
}

func (a *App) GetLocalVersion() launcher.LocalVersion {
	if a.launcher == nil {
		return launcher.LocalVersion{Version: "0.0.0"}
	}
	return a.launcher.GetLocalVersion()
}

func (a *App) StartDownload(downloadURL string) error {
	if a.launcher == nil {
		return launcher.ErrNotReady
	}
	if err := a.launcher.StartDownload(downloadURL); err != nil {
		emit(a.ctx, "download-error", map[string]any{
			"errorKey": "error.download",
			"message":  err.Error(),
		})
		return err
	}
	return nil
}

func (a *App) LaunchGame() error {
	if a.launcher == nil {
		return launcher.ErrNotReady
	}
	return a.launcher.LaunchGame()
}

func (a *App) OpenGameFolder() error {
	if a.launcher == nil {
		return launcher.ErrNotReady
	}
	return a.launcher.OpenGameFolder()
}

func (a *App) UninstallGame() error {
	if a.launcher == nil {
		return launcher.ErrNotReady
	}
	return a.launcher.UninstallGame()
}

func (a *App) Minimize() {
	if a.ctx != nil {
		wailsruntime.WindowMinimise(a.ctx)
	}
}

func (a *App) Close() {
	if a.ctx != nil {
		wailsruntime.Quit(a.ctx)
	}
}

func (a *App) OpenExternal(url string) {
	if a.ctx != nil {
		wailsruntime.BrowserOpenURL(a.ctx, url)
	}
}

func (a *App) CheckLauncherUpdate() {
	if a.updater == nil {
		return
	}
	go func() {
		if err := a.updater.Check(); err != nil {
			log.Printf("launcher updater: %v", err)
		}
	}()
}

func (a *App) DownloadLauncherUpdate() {
	if a.updater == nil {
		return
	}
	go func() {
		if err := a.updater.DownloadAndPrepare(); err != nil {
			log.Printf("launcher updater: %v", err)
			emit(a.ctx, "launcher-update-status", map[string]any{"type": "ERROR", "message": err.Error()})
		}
	}()
}

func (a *App) InstallLauncherUpdate() error {
	if a.updater == nil {
		return launcher.ErrNotReady
	}
	return a.updater.Install()
}

func emit(ctx context.Context, name string, data any) {
	if ctx != nil {
		wailsruntime.EventsEmit(ctx, name, data)
	}
}
