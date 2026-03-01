package webapp

import (
	"embed"
)

//go:embed dist/index.html
var Templates embed.FS

//go:embed dist/assets dist/*.ico dist/*.svg
var Assets embed.FS
