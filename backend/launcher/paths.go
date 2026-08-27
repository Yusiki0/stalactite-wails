package launcher

import (
	"os"
	"path/filepath"
)

func userDataDir() string {
	base, err := os.UserConfigDir()
	if err != nil || base == "" {
		if home, e := os.UserHomeDir(); e == nil {
			base = filepath.Join(home, ".config")
		} else {
			base = "."
		}
	}
	return filepath.Join(base, "Pokemon-Stalactite-Launcher")
}

func ensureDataDir() (string, error) {
	dir := userDataDir()
	return dir, os.MkdirAll(dir, 0o755)
}
