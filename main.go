package main

import (
	"log/slog"
	"os"

	"github.com/go-shiori/shiori/internal/cmd"
	"github.com/go-shiori/shiori/internal/model"

	// Add this to prevent it removed by go mod tidy
	_ "github.com/shurcooL/vfsgen"
)

var (
	version = "dev"
	commit  = "none"
	date    = "unknown"
)

func init() {
	// Set globally
	model.BuildVersion = version
	model.BuildCommit = commit
	model.BuildDate = date
}

func main() {
	err := cmd.ShioriCmd().Execute()
	if err != nil {
		slog.Error("command failed", "error", err)
		os.Exit(1)
	}
}
