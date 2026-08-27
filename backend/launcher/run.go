package launcher

import (
	"fmt"
	"os"
	"os/exec"
)

func (l *Launcher) LaunchGame() error {
	exe := l.gameExe()
	if !fileExists(exe) {
		emit(l.ctx, "launch-error", map[string]any{"errorKey": "error.game_missing"})
		return fmt.Errorf("game executable missing")
	}
	cmd := exec.Command(exe)
	cmd.Dir = l.gameDir()
	if err := cmd.Start(); err != nil {
		emit(l.ctx, "launch-error", map[string]any{"errorKey": "error.launch_crash"})
		return err
	}
	go func() {
		if err := cmd.Wait(); err != nil {
			emit(l.ctx, "launch-error", map[string]any{"errorKey": "error.launch_crash"})
		}
	}()
	return nil
}

func (l *Launcher) OpenGameFolder() error {
	dir := l.gameDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	return exec.Command("explorer.exe", dir).Start()
}

func (l *Launcher) UninstallGame() error {
	if err := os.RemoveAll(l.gameDir()); err != nil {
		emit(l.ctx, "uninstall-error", err.Error())
		return err
	}
	_ = os.Remove(l.versionPath())
	emit(l.ctx, "uninstall-complete", nil)
	return nil
}
