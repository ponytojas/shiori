package templates

import (
	"fmt"
	"html/template"
	"io"

	"github.com/go-shiori/shiori/internal/config"
	webapp "github.com/go-shiori/shiori/webapp"
)

const (
	leftTemplateDelim  = "$$"
	rightTemplateDelim = "$$"
)

var templates *template.Template

// SetupTemplates initializes the templates for the webserver
func SetupTemplates(_ *config.Config) error {
	var err error

	templates, err = template.New("html").
		Delims(leftTemplateDelim, rightTemplateDelim).
		ParseFS(webapp.Templates, "**/*.html")

	if err != nil {
		return fmt.Errorf("failed to parse templates: %w", err)
	}
	return nil
}

// RenderTemplate renders a template with the given data
func RenderTemplate(w io.Writer, name string, data any) error {
	if templates == nil {
		return fmt.Errorf("templates not initialized")
	}
	return templates.ExecuteTemplate(w, name, data)
}
