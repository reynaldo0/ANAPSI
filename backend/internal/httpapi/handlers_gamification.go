package httpapi

import (
	"net/http"

	"anapsi/backend/internal/config"
	"anapsi/backend/internal/store"
)

func handleGamification(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	ip := clientIPHeader(r)
	session := getSession(r, cfg)
	declared := r.URL.Query().Get("reporterId")
	rankingParam := r.URL.Query().Get("ranking")
	resolvedKey := store.ReporterKey(ip, session)
	raw := store.GetGamificationStats(resolvedKey)
	var stats *store.GamificationStats
	if raw != nil {
		id := declared
		if id == "" {
			id = raw.ReporterId
		}
		raw.ReporterId = id
		stats = raw
	}
	var leaderboard interface{} = nil
	if rankingParam == "1" {
		leaderboard = store.ListGamificationRanking(10)
	}
	_ = cfg
	ok(w, map[string]interface{}{"stats": stats, "leaderboard": leaderboard})
}
