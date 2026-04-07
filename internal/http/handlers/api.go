package handlers

import (
	"log/slog"
	"net/http"

	"github.com/go-shiori/shiori/internal/dependencies"
)

type APIHandler struct {
	logger *slog.Logger
	deps   *dependencies.Dependencies
}

func (h *APIHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.handleGet(w, r)
	case http.MethodPost:
		h.handlePost(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *APIHandler) handleGet(w http.ResponseWriter, r *http.Request) {
	// Implementation
}

func (h *APIHandler) handlePost(w http.ResponseWriter, r *http.Request) {
	// Implementation
}

func NewAPIHandler(logger *slog.Logger, deps *dependencies.Dependencies) *APIHandler {
	return &APIHandler{
		logger: logger,
		deps:   deps,
	}
}
