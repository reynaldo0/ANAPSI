package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"blindspot/backend/internal/config"
	"blindspot/backend/internal/errs"
	"blindspot/backend/internal/store"
)

// streamInterval is how often the admin realtime stream emits a snapshot.
const streamInterval = 15 * time.Second

const mysqlTimeLayout = "2006-01-02 15:04:05.000"

// parseMySQLTime reads a value written by util.NowMySQL (stored in UTC).
func parseMySQLTime(s *string) (time.Time, bool) {
	if s == nil || *s == "" {
		return time.Time{}, false
	}
	for _, layout := range []string{mysqlTimeLayout, "2006-01-02 15:04:05"} {
		if t, err := time.Parse(layout, *s); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

// streamPayload mirrors the reading surfaces the admin dashboard shows, so a
// single SSE connection can keep every "realtime" widget fresh without per-tab
// polling.
type streamPayload struct {
	Stats           *store.AdminStats     `json:"stats"`
	OnlineUserNames []string              `json:"onlineUserNames"`
	RecentLocations []store.AdminLocation `json:"recentLocations"`
	ServerTime      string                `json:"serverTime"`
}

func buildStreamPayload() (streamPayload, error) {
	stats, err := store.CountStats()
	if err != nil {
		return streamPayload{}, err
	}
	users, err := store.ListUsersAdmin()
	if err != nil {
		return streamPayload{}, err
	}
	locs, err := store.ListLocationsAdmin()
	if err != nil {
		return streamPayload{}, err
	}
	online := make([]string, 0, len(users))
	for _, u := range users {
		if t, ok := parseMySQLTime(u.LastActivityAt); ok && time.Since(t) < 10*time.Minute {
			online = append(online, u.DisplayName)
		}
	}
	recent := locs
	if len(recent) > 5 {
		recent = recent[:5]
	}
	return streamPayload{
		Stats:           stats,
		OnlineUserNames: online,
		RecentLocations: recent,
		ServerTime:      time.Now().UTC().Format(time.RFC3339),
	}, nil
}

// handleAdminStream streams snapshots over Server-Sent Events so the admin
// dashboard reflects heartbeats almost instantly. Authentication is enforced
// identically to the other admin endpoints; the session cookie is sent
// automatically by the browser's EventSource.
func handleAdminStream(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	if err := requireAdmin(w, r, cfg); err != nil {
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeErr(w, errs.Fail("Server ini tidak mendukung streaming realtime.", "INTERNAL_ERROR", 500))
		return
	}

	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	ctx := r.Context()
	emit := func(event string, payload streamPayload) bool {
		b, err := json.Marshal(payload)
		if err != nil {
			return false
		}
		if _, err := fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, b); err != nil {
			return false
		}
		flusher.Flush()
		return true
	}

	ticker := time.NewTicker(streamInterval)
	defer ticker.Stop()

	// Kirim snapshot segera, lalu berkala; berhenti saat client terputus.
	for {
		payload, err := buildStreamPayload()
		if err != nil {
			// Jangan jatuh: coba lagi di tick berikutnya.
			_ = payload
		} else if !emit("snapshot", payload) {
			return
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}