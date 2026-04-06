package handlers

import (
	"net/http"
	"path"

	"github.com/go-shiori/shiori/internal/http/response"
	"github.com/go-shiori/shiori/internal/model"
	webapp "github.com/go-shiori/shiori/webapp"
)

type webappAssetsFS struct {
	http.FileSystem
}

func (fs webappAssetsFS) Open(name string) (http.File, error) {
	return fs.FileSystem.Open(path.Join("dist/assets", name))
}

// HandleFrontend serves the main frontend page
func HandleFrontend(deps model.Dependencies, c model.WebContext) {
	data := map[string]any{
		"RootPath": deps.Config().Http.RootPath,
		"Version":  model.BuildVersion,
	}

	if err := response.SendTemplate(c, "index.html", data); err != nil {
		deps.Logger().WithError(err).Error("failed to render template")
	}
}

// HandleAssets serves static assets from the webapp
func HandleAssets(deps model.Dependencies, c model.WebContext) {
	fs := webappAssetsFS{http.FS(webapp.Assets)}
	http.StripPrefix("/assets/", http.FileServer(fs)).ServeHTTP(c.ResponseWriter(), c.Request())
}
