package httpapi

import (
	"net/http"
	"strconv"

	"blindspot/backend/internal/config"
	"blindspot/backend/internal/database"
)

// NewRouter wires every HTTP route to its handler. Pattern syntax is Go
// 1.22+ path segments ({id}) resolved via r.PathValue.
func NewRouter(cfg *config.Config) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) { handleHealth(w, r, cfg) })

	mux.HandleFunc("POST /api/auth/register", func(w http.ResponseWriter, r *http.Request) { handleRegister(w, r, cfg) })
	mux.HandleFunc("POST /api/auth/login", func(w http.ResponseWriter, r *http.Request) { handleLogin(w, r, cfg) })
	mux.HandleFunc("POST /api/auth/logout", func(w http.ResponseWriter, r *http.Request) { handleLogout(w, r, cfg) })
	mux.HandleFunc("GET /api/auth/me", func(w http.ResponseWriter, r *http.Request) { handleMe(w, r, cfg) })

	mux.HandleFunc("GET /api/profile", func(w http.ResponseWriter, r *http.Request) { handleProfileGet(w, r, cfg) })
	mux.HandleFunc("PUT /api/profile", func(w http.ResponseWriter, r *http.Request) { handleProfilePut(w, r, cfg) })
	mux.HandleFunc("GET /api/profile/accessibility", func(w http.ResponseWriter, r *http.Request) { handleProfileAccessibilityGet(w, r, cfg) })
	mux.HandleFunc("PUT /api/profile/accessibility", func(w http.ResponseWriter, r *http.Request) { handleProfileAccessibilityPut(w, r, cfg) })

	mux.HandleFunc("GET /api/places", handlePlacesGet)
	mux.HandleFunc("GET /api/places/{id}", handlePlaceById)
	mux.HandleFunc("GET /api/places/{id}/accessibility", handlePlaceAccessibility)
	mux.HandleFunc("GET /api/places/{id}/entrances", handlePlaceEntrances)

	mux.HandleFunc("GET /api/map/features", handleMapFeatures)

	mux.HandleFunc("GET /api/reports", func(w http.ResponseWriter, r *http.Request) { handleReportsGet(w, r, cfg) })
	mux.HandleFunc("POST /api/reports", func(w http.ResponseWriter, r *http.Request) { handleReportsPost(w, r, cfg) })
	mux.HandleFunc("GET /api/reports/{id}", func(w http.ResponseWriter, r *http.Request) { handleReportById(w, r, cfg) })
	mux.HandleFunc("PUT /api/reports/{id}", func(w http.ResponseWriter, r *http.Request) { handleReportPut(w, r, cfg) })
	mux.HandleFunc("POST /api/reports/{id}/verify", func(w http.ResponseWriter, r *http.Request) { handleReportVerify(w, r, cfg, "CONFIRMED") })
	mux.HandleFunc("POST /api/reports/{id}/changed", func(w http.ResponseWriter, r *http.Request) { handleReportVerify(w, r, cfg, "CHANGED") })
	mux.HandleFunc("POST /api/reports/{id}/resolved", func(w http.ResponseWriter, r *http.Request) { handleReportVerify(w, r, cfg, "RESOLVED") })

	mux.HandleFunc("GET /api/admin/reports", func(w http.ResponseWriter, r *http.Request) { handleAdminReportsGet(w, r, cfg) })
	mux.HandleFunc("PUT /api/admin/reports", func(w http.ResponseWriter, r *http.Request) { handleAdminReportsPut(w, r, cfg) })

	mux.HandleFunc("GET /api/gamification", func(w http.ResponseWriter, r *http.Request) { handleGamification(w, r, cfg) })

	mux.HandleFunc("GET /api/saved", func(w http.ResponseWriter, r *http.Request) { handleSavedGet(w, r, cfg) })
	mux.HandleFunc("POST /api/saved", func(w http.ResponseWriter, r *http.Request) { handleSavedPost(w, r, cfg) })
	mux.HandleFunc("DELETE /api/saved", func(w http.ResponseWriter, r *http.Request) { handleSavedDelete(w, r, cfg) })

	mux.HandleFunc("POST /api/routes", func(w http.ResponseWriter, r *http.Request) { handleRoutesPost(w, r, cfg) })

	mux.HandleFunc("POST /api/ai/assistant", func(w http.ResponseWriter, r *http.Request) { handleAssistant(w, r, cfg) })
	mux.HandleFunc("POST /api/ai/analyze-voice-report", func(w http.ResponseWriter, r *http.Request) { handleAnalyzeVoice(w, r, cfg) })
	mux.HandleFunc("POST /api/ai/analyze-image-report", func(w http.ResponseWriter, r *http.Request) { handleAnalyzeImage(w, r, cfg) })
	mux.HandleFunc("POST /api/chatbot", func(w http.ResponseWriter, r *http.Request) { handleChatbot(w, r, cfg) })
	mux.HandleFunc("POST /api/chatbot/transcribe", func(w http.ResponseWriter, r *http.Request) { handleChatbotTranscribe(w, r, cfg) })

	return mux
}

func parseIntParam(r *http.Request, name string, fallback float64) float64 {
	v := r.URL.Query().Get(name)
	if v == "" {
		return fallback
	}
	n, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return fallback
	}
	return n
}

func handleHealth(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	databaseStatus := "not-configured"
	if cfg.DatabaseURL != "" || database.DB != nil {
		databaseStatus = "configured"
	}
	authStatus := "not-configured"
	if cfg.AuthSecret != "" {
		authStatus = "configured"
	}
	ok(w, map[string]interface{}{
		"service":  "blindspot-api",
		"status":   "healthy",
		"database": databaseStatus,
		"auth":     authStatus,
	})
}
