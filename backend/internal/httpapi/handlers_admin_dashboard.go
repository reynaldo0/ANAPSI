package httpapi

import (
	"net/http"

	"blindspot/backend/internal/config"
	"blindspot/backend/internal/demo"
	"blindspot/backend/internal/errs"
	"blindspot/backend/internal/service"
	"blindspot/backend/internal/store"
)

// requireAdmin resolves the session and enforces the ADMIN role, mirroring the
// moderation-panel authorization.
func requireAdmin(w http.ResponseWriter, r *http.Request, cfg *config.Config) error {
	session := getSession(r, cfg)
	if session == nil {
		writeErr(w, errs.Unauthorized(""))
		return errs.Unauthorized("")
	}
	if session.Role != "ADMIN" {
		writeErr(w, errs.Forbidden("Hanya admin yang dapat mengakses panel ini."))
		return errs.Forbidden("Hanya admin yang dapat mengakses panel ini.")
	}
	return nil
}

func handleAdminStats(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	if err := requireAdmin(w, r, cfg); err != nil {
		return
	}
	stats, err := store.CountStats()
	if err != nil {
		writeErr(w, errs.Fail("Gagal memuat statistik.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, stats)
}

func handleAdminUsersGet(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	if err := requireAdmin(w, r, cfg); err != nil {
		return
	}
	users, err := store.ListUsersAdmin()
	if err != nil {
		writeErr(w, errs.Fail("Gagal memuat pengguna.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{"users": users})
}

func handleAdminUserGet(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	if err := requireAdmin(w, r, cfg); err != nil {
		return
	}
	user, err := store.GetUserAdmin(r.PathValue("id"))
	if err != nil {
		writeErr(w, errs.Fail("Gagal memuat pengguna.", "INTERNAL_ERROR", 500))
		return
	}
	if user == nil {
		writeErr(w, errs.NotFound("Pengguna tidak ditemukan."))
		return
	}
	ok(w, map[string]interface{}{"user": user})
}

type adminUserPatch struct {
	Role            string `json:"role"`
	DisplayName     string `json:"displayName"`
	ActivityEnabled *bool  `json:"activityEnabled"`
}

func handleAdminUserPut(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	if err := requireAdmin(w, r, cfg); err != nil {
		return
	}
	id := r.PathValue("id")
	var in adminUserPatch
	if err := getBody(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	if in.Role != "" && in.Role != "USER" && in.Role != "ADMIN" {
		writeErr(w, errs.Fail("Peran tidak valid.", "VALIDATION_ERROR", 400))
		return
	}
	// Prevent locking the active admin out of the last admin account.
	if id == session.ID {
		if in.Role == "USER" {
			writeErr(w, errs.Fail("Kamu tidak dapat menurunkan peran dirimu sendiri.", "VALIDATION_ERROR", 400))
			return
		}
		if in.ActivityEnabled != nil && !*in.ActivityEnabled {
			writeErr(w, errs.Fail("Kamu tidak dapat menonaktifkan pelacakan akunmu sendiri.", "VALIDATION_ERROR", 400))
			return
		}
	}
	user, err := store.UpdateUserAdmin(id, in.Role, in.DisplayName, in.ActivityEnabled)
	if err != nil {
		writeErr(w, errs.Fail("Gagal memperbarui pengguna.", "INTERNAL_ERROR", 500))
		return
	}
	if user == nil {
		writeErr(w, errs.NotFound("Pengguna tidak ditemukan."))
		return
	}
	ok(w, map[string]interface{}{"user": user})
}

func handleAdminUserDelete(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	if err := requireAdmin(w, r, cfg); err != nil {
		return
	}
	id := r.PathValue("id")
	if id == session.ID {
		writeErr(w, errs.Fail("Kamu tidak dapat menghapus akunmu sendiri.", "VALIDATION_ERROR", 400))
		return
	}
	if err := store.DeleteUserAdmin(id); err != nil {
		writeErr(w, errs.Fail("Gagal menghapus pengguna.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{"deleted": true, "id": id})
}

func handleAdminLocationsGet(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	if err := requireAdmin(w, r, cfg); err != nil {
		return
	}
	locs, err := store.ListLocationsAdmin()
	if err != nil {
		writeErr(w, errs.Fail("Gagal memuat lokasi.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{"locations": locs})
}

func handleAdminReportsDelete(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	if err := requireAdmin(w, r, cfg); err != nil {
		return
	}
	if err := store.DeleteReportAdmin(r.PathValue("id")); err != nil {
		writeErr(w, errs.Fail("Gagal menghapus laporan.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{"deleted": true})
}

func handleAdminPlacesGet(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	if err := requireAdmin(w, r, cfg); err != nil {
		return
	}
	places, err := store.ListPlacesAdmin()
	if err != nil {
		writeErr(w, errs.Fail("Gagal memuat tempat.", "INTERNAL_ERROR", 500))
		return
	}
	// Attach the profile scores from the scoring service (single source).
	scores := map[string]map[string]*int{}
	for _, ph := range demo.Places() {
		evalV := service.PlaceEvaluation(ph, "VISUAL_NAVIGATION")
		evalM := service.PlaceEvaluation(ph, "WHEELCHAIR_MOBILITY")
		scores[ph.ID] = map[string]*int{"visual": evalV.Score, "mobility": evalM.Score}
	}
	for i := range places {
		if s, ok := scores[places[i].ID]; ok {
			places[i].VisualScore = s["visual"]
			places[i].MobilityScore = s["mobility"]
		}
	}
	ok(w, map[string]interface{}{"places": places})
}