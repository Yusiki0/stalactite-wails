package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:            "STALACTITE | LAUNCHER",
		Width:            1050,
		Height:           620,
		DisableResize:    false,
		Frameless:        true,
		WindowStartState: options.Maximised,
		StartHidden:      false,
		BackgroundColour: options.NewRGBA(6, 10, 16, 255),
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Windows: &windows.Options{
			Theme: windows.SystemDefault,
		},
		OnStartup:  app.startup,
		OnDomReady: app.domReady,
		Bind:       []interface{}{app},
	})
	if err != nil {
		log.Fatal(err)
	}
}
