package middleware

import (
	"time"

	"github.com/go-shiori/shiori/internal/model"
)

var _ model.HttpMiddleware = &LoggingMiddleware{}

// LoggingMiddleware is a middleware that logs the request and response
type LoggingMiddleware struct {
	startTime time.Time
}

func (m *LoggingMiddleware) OnRequest(deps model.Dependencies, c model.WebContext) error {
	m.startTime = time.Now()
	return nil
}

func (m *LoggingMiddleware) OnResponse(deps model.Dependencies, c model.WebContext) error {
	duration := time.Since(m.startTime)
	deps.Logger().Info("request completed",
		"path", c.Request().URL.Path,
		"duration", duration,
		"request_id", c.GetRequestID(),
	)
	return nil
}

func NewLoggingMiddleware() *LoggingMiddleware {
	return &LoggingMiddleware{}
}
