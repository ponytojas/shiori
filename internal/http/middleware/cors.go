package middleware

import (
	"strings"

	"github.com/go-shiori/shiori/internal/model"
)

type CORSMiddleware struct {
	allowedOrigins []string
	allowedHeaders string
}

func (m *CORSMiddleware) OnRequest(deps model.Dependencies, c model.WebContext) error {
	c.ResponseWriter().Header().Set("Access-Control-Allow-Origin", strings.Join(m.allowedOrigins, ", "))
	c.ResponseWriter().Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	c.ResponseWriter().Header().Set("Access-Control-Allow-Headers", m.allowedHeaders)
	return nil
}

func (m *CORSMiddleware) OnResponse(deps model.Dependencies, c model.WebContext) error {
	c.ResponseWriter().Header().Set("Access-Control-Allow-Origin", strings.Join(m.allowedOrigins, ", "))
	c.ResponseWriter().Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	c.ResponseWriter().Header().Set("Access-Control-Allow-Headers", m.allowedHeaders)
	return nil
}

func NewCORSMiddleware(allowedOrigins []string, extraAllowedHeader string) *CORSMiddleware {
	headers := []string{"Content-Type", "Authorization", "X-Shiori-Response-Format"}
	extraAllowedHeader = strings.TrimSpace(extraAllowedHeader)
	if extraAllowedHeader != "" {
		headers = append(headers, extraAllowedHeader)
	}

	return &CORSMiddleware{
		allowedOrigins: allowedOrigins,
		allowedHeaders: strings.Join(headers, ", "),
	}
}
