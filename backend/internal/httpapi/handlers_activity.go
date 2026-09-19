package httpapi

import (
	"net/http"
	"strings"

	"blindspot/backend/internal/config"
	"blindspot/backend/internal/errs"
	"blindspot/backend/internal/store"
)

type heartbeatInput struct {
	Lat       *float64 `json:"lat"`
	Lng       *float64 `json:"lng"`
	Page      string   `json:"page"`
	UserAgent string   `json:"userAgent"`
}

// handleHeartbeat records a signed-in user's activity + optional shared
// location for the admin monitoring dashboard.
func handleHeartbeat(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	if session == nil {
		writeErr(w, errs.Unauthorized(""))
		return
	}
	var in heartbeatInput
	if err := getBody(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	var lat, lng *float64
	if in.Lat != nil && in.Lng != nil {
		if *in.Lat >= -90 && *in.Lat <= 90 && *in.Lng >= -180 && *in.Lng <= 180 {
			lat, lng = in.Lat, in.Lng
		}
	}
	if err := store.RecordActivity(session.ID, lat, lng, clientIPHeader(r), truncatePage(in.Page), truncateUA(in.UserAgent)); err != nil {
		writeErr(w, errs.Fail("Gagal memperbarui aktivitas.", "INTERNAL_ERROR", 500))
		return
	}
	enabled, err := store.GetActivityEnabled(session.ID)
	if err != nil {
		enabled = true
	}
	ok(w, map[string]interface{}{
		"recorded":        true,
		"activityEnabled": enabled,
		"locationShared":  enabled && lat != nil && lng != nil,
	})
}

type activityToggleInput struct {
	Enabled bool `json:"enabled"`
}

// handleProfileActivityPut toggles the user's consent to share their location
// for caregiver/admin monitoring.
func handleProfileActivityPut(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	if session == nil {
		writeErr(w, errs.Unauthorized(""))
		return
	}
	var in activityToggleInput
	if err := getBody(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	if err := store.SetActivityEnabled(session.ID, in.Enabled); err != nil {
		writeErr(w, errs.Fail("Gagal memperbarui pengaturan aktivitas.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{"activityEnabled": in.Enabled})
}

func truncatePage(s string) string {
	s = strings.TrimSpace(s)
	if len(s) > 190 {
		s = s[:190]
	}
	return s
}

func truncateUA(s string) string {
	s = strings.TrimSpace(s)
	if len(s) > 290 {
		s = s[:290]
	}
	return s
}