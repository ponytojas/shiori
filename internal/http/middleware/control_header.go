package middleware

import (
	"net/http"
	"strings"

	"github.com/go-shiori/shiori/internal/http/response"
	"github.com/go-shiori/shiori/internal/model"
)

// ControlHeaderMiddleware enforces an optional shared control header for API routes.
// If header name/value are empty, middleware is effectively disabled.
type ControlHeaderMiddleware struct {
	headerName  string
	headerValue string
}

func NewControlHeaderMiddleware(headerName, headerValue string) *ControlHeaderMiddleware {
	return &ControlHeaderMiddleware{
		headerName:  strings.TrimSpace(headerName),
		headerValue: strings.TrimSpace(headerValue),
	}
}

func (m *ControlHeaderMiddleware) OnRequest(deps model.Dependencies, c model.WebContext) error {
	if m.headerName == "" || m.headerValue == "" {
		return nil
	}

	path := c.Request().URL.Path
	if !strings.HasPrefix(path, "/api/") {
		return nil
	}

	if c.Request().Method == http.MethodOptions {
		return nil
	}

	if c.Request().Header.Get(m.headerName) != m.headerValue {
		response.SendError(c, http.StatusUnauthorized, "invalid control header")
		return nil
	}

	return nil
}

func (m *ControlHeaderMiddleware) OnResponse(deps model.Dependencies, c model.WebContext) error {
	return nil
}
