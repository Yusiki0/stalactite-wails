package launcher

import (
	"archive/zip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

func (l *Launcher) StartDownload(downloadURL string) error {
	if downloadURL == "" {
		return fmt.Errorf("empty download URL")
	}
	dir, err := ensureDataDir()
	if err != nil {
		return err
	}
	gameDir := l.gameDir()
	if err := os.MkdirAll(gameDir, 0o755); err != nil {
		return err
	}

	zipPath := filepath.Join(dir, "game_temp.zip")
	req, err := http.NewRequestWithContext(l.ctx, http.MethodGet, downloadURL, nil)
	if err != nil {
		return err
	}
	resp, err := l.downloadClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("download returned %s", resp.Status)
	}

	out, err := os.Create(zipPath)
	if err != nil {
		return err
	}
	defer out.Close()

	total := resp.ContentLength
	var downloaded int64
	lastBytes := int64(0)
	lastTime := time.Now()
	samples := make([]float64, 0, 5)
	buf := make([]byte, 64*1024)

	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, err := out.Write(buf[:n]); err != nil {
				return err
			}
			downloaded += int64(n)
			now := time.Now()
			elapsed := now.Sub(lastTime).Seconds()
			if elapsed >= 0.5 {
				speed := float64(downloaded-lastBytes) / elapsed
				samples = append(samples, speed)
				if len(samples) > 5 {
					samples = samples[1:]
				}
				var avg float64
				for _, s := range samples {
					avg += s
				}
				avg /= float64(len(samples))
				percent := 0
				eta := 0
				if total > 0 {
					percent = int(float64(downloaded) / float64(total) * 100)
					if avg > 0 {
						eta = int(float64(total-downloaded) / avg)
					}
				}
				emit(l.ctx, "download-progress", map[string]any{
					"percent":         percent,
					"speed":           formatSpeed(avg),
					"eta":             eta,
					"totalBytes":      total,
					"downloadedBytes": downloaded,
				})
				lastTime, lastBytes = now, downloaded
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return readErr
		}
	}

	emit(l.ctx, "download-progress", map[string]any{"percent": 100, "extracting": true})
	if err := extractZip(zipPath, gameDir); err != nil {
		emit(l.ctx, "download-error", map[string]any{"errorKey": "error.extracting"})
		return err
	}
	_ = os.Remove(zipPath)
	if err := l.saveRemoteVersion(); err != nil {
		return err
	}
	emit(l.ctx, "download-complete", nil)
	return nil
}

func formatSpeed(bytesPerSecond float64) string {
	if bytesPerSecond >= 1024*1024 {
		return fmt.Sprintf("%.1f MB/s", bytesPerSecond/(1024*1024))
	}
	return fmt.Sprintf("%d KB/s", int(bytesPerSecond/1024))
}

func extractZip(zipPath, dest string) error {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer r.Close()
	root, err := filepath.Abs(dest)
	if err != nil {
		return err
	}
	for _, f := range r.File {
		target := filepath.Join(root, filepath.Clean(f.Name))
		if target != root && !isWithin(root, target) {
			return fmt.Errorf("unsafe zip entry: %s", f.Name)
		}
		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0o755); err != nil {
				return err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		src, err := f.Open()
		if err != nil {
			return err
		}
		dst, err := os.OpenFile(target, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o755)
		if err != nil {
			src.Close()
			return err
		}
		_, copyErr := io.Copy(dst, src)
		dst.Close()
		src.Close()
		if copyErr != nil {
			return copyErr
		}
	}
	return nil
}

func isWithin(root, target string) bool {
	rel, err := filepath.Rel(root, target)
	return err == nil && rel != ".." && len(rel) >= 3 && rel[:3] != ".."+string(os.PathSeparator)
}
