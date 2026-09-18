package httpapi

import (
	"net/http"

	"blindspot/backend/internal/config"
	"blindspot/backend/internal/errs"
	"blindspot/backend/internal/ratelimit"
	"blindspot/backend/internal/store"
	"blindspot/backend/internal/util"
)

func handleSavedGet(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	if session == nil {
		writeErr(w, errs.Unauthorized(""))
		return
	}
	placeID := r.URL.Query().Get("placeId")
	if placeID != "" {
		saved, err := store.IsSavedPlace(session.ID, placeID)
		if err != nil {
			writeErr(w, errs.Fail("Gagal memuat tempat tersimpan.", "INTERNAL_ERROR", 500))
			return
		}
		ok(w, map[string]interface{}{"saved": saved, "placeId": placeID})
		return
	}
	data, err := store.ListSavedFor(session.ID)
	if err != nil {
		writeErr(w, errs.Fail("Gagal memuat tempat tersimpan.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{"saved": data, "source": "database"})
}

func handleSavedPost(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	if session == nil {
		writeErr(w, errs.Unauthorized(""))
		return
	}
	ip := clientIPHeader(r)
	if allowed, retry := ratelimit.Check(ratelimit.Key(ip, "saved:write"), 30, 60000); !allowed {
		writeErr(w, errs.Fail("Terlalu banyak permintaan. Coba lagi nanti.", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	body := struct {
		PlaceID interface{} `json:"placeId"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	placeID := util.AsString(body.PlaceID)
	if placeID == "" {
		writeErr(w, errs.Fail("ID tempat tidak valid.", "VALIDATION_ERROR", 422))
		return
	}
	record, saved, err := store.ToggleSaved(session.ID, placeID)
	if err != nil {
		writeErr(w, errs.Fail("Gagal menyimpan tempat.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{
		"saved": saved, "place": record, "placeId": placeID, "source": "database",
	})
}

func handleSavedDelete(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	if session == nil {
		writeErr(w, errs.Unauthorized(""))
		return
	}
	ip := clientIPHeader(r)
	if allowed, retry := ratelimit.Check(ratelimit.Key(ip, "saved:write"), 30, 60000); !allowed {
		writeErr(w, errs.Fail("Terlalu banyak permintaan. Coba lagi nanti.", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	placeID := r.URL.Query().Get("placeId")
	if placeID == "" {
		writeErr(w, errs.Fail("ID tempat tidak valid.", "VALIDATION_ERROR", 422))
		return
	}
	saved, err := store.RemoveSaved(session.ID, placeID)
	if err != nil {
		writeErr(w, errs.Fail("Gagal menghapus tempat tersimpan.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{"saved": saved, "placeId": placeID, "source": "database"})
}
