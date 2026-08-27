package launcher

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const gameVersionURL = "https://api.jsonbin.io/v3/b/695bae4bd0ea881f4055c24a/latest?meta=false"

var ErrNotReady = errors.New("launcher is not ready")

func NewLauncher(ctx context.Context) *Launcher {
	return &Launcher{
		ctx:            ctx,
		client:         &http.Client{Timeout: 30 * time.Second},
		downloadClient: &http.Client{},
	}
}

type Launcher struct {
	ctx            context.Context
	client         *http.Client
	downloadClient *http.Client
}

func (l *Launcher) versionPath() string {
	return filepath.Join(userDataDir(), "version.json")
}

func (l *Launcher) gameDir() string {
	return filepath.Join(userDataDir(), "game_folder")
}

func (l *Launcher) gameExe() string {
	return filepath.Join(l.gameDir(), "Game.exe")
}

func (l *Launcher) GetLocalVersion() LocalVersion {
	data, err := os.ReadFile(l.versionPath())
	if err != nil {
		return LocalVersion{Version: "0.0.0"}
	}
	var v LocalVersion
	if json.Unmarshal(data, &v) != nil || strings.TrimSpace(v.Version) == "" {
		return LocalVersion{Version: "0.0.0"}
	}
	return v
}

func (l *Launcher) CheckForUpdates() UpdateStatus {
	local := l.GetLocalVersion()
	gameExists := fileExists(l.gameExe())

	req, err := http.NewRequestWithContext(l.ctx, http.MethodGet, gameVersionURL, nil)
	if err != nil {
		return UpdateStatus{Type: "ERROR"}
	}
	resp, err := l.client.Do(req)
	if err != nil {
		return UpdateStatus{Type: "ERROR"}
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return UpdateStatus{Type: "ERROR"}
	}

	var remote LocalVersion
	if err := json.NewDecoder(resp.Body).Decode(&remote); err != nil {
		return UpdateStatus{Type: "ERROR"}
	}

	remoteVersion := strings.TrimSpace(remote.Version)
	localVersion := strings.TrimSpace(local.Version)
	if remoteVersion == "" || remote.URL == "" {
		return UpdateStatus{Type: "ERROR"}
	}

	if !gameExists {
		return UpdateStatus{Type: "UPDATE_AVAILABLE", Reason: "INSTALL", Local: "0.0.0", Remote: remoteVersion, DownloadURL: remote.URL}
	}
	if remoteVersion != localVersion {
		return UpdateStatus{Type: "UPDATE_AVAILABLE", Reason: "UPDATE", Local: localVersion, Remote: remoteVersion, DownloadURL: remote.URL}
	}
	return UpdateStatus{Type: "UP_TO_DATE", Local: localVersion, Remote: remoteVersion}
}

func (l *Launcher) saveRemoteVersion() error {
	req, err := http.NewRequestWithContext(l.ctx, http.MethodGet, gameVersionURL, nil)
	if err != nil {
		return err
	}
	resp, err := l.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("version server returned %s", resp.Status)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	dir, err := ensureDataDir()
	if err != nil {
		return err
	}
	var pretty any
	if json.Unmarshal(body, &pretty) == nil {
		body, _ = json.MarshalIndent(pretty, "", "  ")
	}
	return os.WriteFile(filepath.Join(dir, "version.json"), body, 0o644)
}

func emit(ctx context.Context, name string, data any) {
	if ctx != nil {
		wailsruntime.EventsEmit(ctx, name, data)
	}
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}
