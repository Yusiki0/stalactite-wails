package launcher

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// Version actuelle du launcher.
// À incrémenter à chaque nouvelle release du launcher.
const launcherVersion = "1.0.0"

type LauncherUpdater struct {
	ctx           context.Context
	owner         string
	repo          string
	client        *http.Client
	assetURL      string
	version       string
	installerPath string
}

type githubRelease struct {
	TagName string `json:"tag_name"`
	Name    string `json:"name"`
	Assets  []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
	} `json:"assets"`
}

func NewLauncherUpdater(ctx context.Context, owner, repo string) *LauncherUpdater {
	return &LauncherUpdater{
		ctx:    ctx,
		owner:  owner,
		repo:   repo,
		client: &http.Client{},
	}
}

func (u *LauncherUpdater) Check() error {
	rel, err := u.latestRelease()
	if err != nil {
		emit(u.ctx, "launcher-update-status", map[string]any{
			"type":    "ERROR",
			"message": err.Error(),
		})
		return err
	}

	remote := strings.TrimPrefix(rel.TagName, "v")

	if remote == launcherVersion {
		emit(u.ctx, "launcher-update-status", map[string]any{
			"type":    "UP_TO_DATE",
			"version": remote,
		})
		return nil
	}

	asset := pickInstaller(rel)
	if asset == "" {
		err := fmt.Errorf("no Windows installer asset found")

		emit(u.ctx, "launcher-update-status", map[string]any{
			"type":    "ERROR",
			"message": err.Error(),
		})

		return err
	}

	u.assetURL = asset
	u.version = remote

	emit(u.ctx, "launcher-update-status", map[string]any{
		"type":         "UPDATE_AVAILABLE",
		"version":      remote,
		"releaseNotes": rel.Name,
	})

	return nil
}

func (u *LauncherUpdater) latestRelease() (githubRelease, error) {
	var rel githubRelease

	url := fmt.Sprintf(
		"https://api.github.com/repos/%s/%s/releases/latest",
		u.owner,
		u.repo,
	)

	req, err := http.NewRequestWithContext(
		u.ctx,
		http.MethodGet,
		url,
		nil,
	)
	if err != nil {
		return rel, err
	}

	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "Stalactite-Launcher")

	resp, err := u.client.Do(req)
	if err != nil {
		return rel, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return rel, fmt.Errorf(
			"GitHub returned %s",
			resp.Status,
		)
	}

	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return rel, err
	}

	return rel, nil
}

func pickInstaller(rel githubRelease) string {
	// Priorité à un installeur dont le nom contient "setup".
	for _, a := range rel.Assets {
		name := strings.ToLower(a.Name)

		if strings.HasSuffix(name, ".exe") &&
			strings.Contains(name, "setup") {
			return a.BrowserDownloadURL
		}
	}

	// Sinon, on prend le premier .exe disponible.
	for _, a := range rel.Assets {
		if strings.HasSuffix(
			strings.ToLower(a.Name),
			".exe",
		) {
			return a.BrowserDownloadURL
		}
	}

	return ""
}

func (u *LauncherUpdater) DownloadAndPrepare() error {
	if u.assetURL == "" {
		if err := u.Check(); err != nil {
			return err
		}
	}

	dir, err := ensureDataDir()
	if err != nil {
		return err
	}

	u.installerPath = filepath.Join(
		dir,
		"launcher-update.exe",
	)

	req, err := http.NewRequestWithContext(
		u.ctx,
		http.MethodGet,
		u.assetURL,
		nil,
	)
	if err != nil {
		return err
	}

	req.Header.Set("User-Agent", "Stalactite-Launcher")

	resp, err := u.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf(
			"update download returned %s",
			resp.Status,
		)
	}

	out, err := os.Create(u.installerPath)
	if err != nil {
		return err
	}
	defer out.Close()

	total := resp.ContentLength
	var done int64

	buf := make([]byte, 64*1024)

	for {
		n, rerr := resp.Body.Read(buf)

		if n > 0 {
			if _, err := out.Write(buf[:n]); err != nil {
				return err
			}

			done += int64(n)

			percent := 0

			if total > 0 {
				percent = int(done * 100 / total)
			}

			emit(u.ctx, "launcher-update-progress", map[string]any{
				"percent":     percent,
				"speed":       "",
				"transferred": done,
				"total":       total,
			})
		}

		if rerr == io.EOF {
			break
		}

		if rerr != nil {
			return rerr
		}
	}

	emit(u.ctx, "launcher-update-status", map[string]any{
		"type":    "UPDATE_DOWNLOADED",
		"version": u.version,
	})

	return nil
}

func (u *LauncherUpdater) Install() error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf(
			"self-update installer is only supported on Windows",
		)
	}

	if u.installerPath == "" {
		return fmt.Errorf("no downloaded update")
	}

	cmd := exec.Command(u.installerPath)

	if err := cmd.Start(); err != nil {
		return err
	}

	// L'installeur remplacera le launcher après la fermeture
	// du processus actuel.
	os.Exit(0)

	return nil
}
