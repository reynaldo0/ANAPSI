package main

import (
	"net/http"
)

type savedPlaceRecord struct {
	ID           string `json:"id"`
	PlaceID      string `json:"placeId"`
	PlaceName    string `json:"placeName"`
	PlaceAddress string `json:"placeAddress"`
	CreatedAt    string `json:"createdAt"`
}

func handleSavedGet(w http.ResponseWriter, r *http.Request, cfg *Config) {
	session := getSession(w, r, cfg)
	if session == nil {
		writeErr(w, unauthorized(""))
		return
	}
	placeID := r.URL.Query().Get("placeId")
	if placeID != "" {
		saved, err := isSavedPlace(session.ID, placeID)
		if err != nil {
			writeErr(w, fail("Gagal memuat tempat tersimpan.", "INTERNAL_ERROR", 500))
			return
		}
		ok(w, map[string]interface{}{"saved": saved, "placeId": placeID})
		return
	}
	data, err := listSavedFor(session.ID)
	if err != nil {
		writeErr(w, fail("Gagal memuat tempat tersimpan.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{"saved": data, "source": "database"})
}

func handleSavedPost(w http.ResponseWriter, r *http.Request, cfg *Config) {
	session := getSession(w, r, cfg)
	if session == nil {
		writeErr(w, unauthorized(""))
		return
	}
	ip := clientIPHeader(r)
	if allowed, retry := checkRateLimit(rateLimitKey(ip, "saved:write"), 30, 60000); !allowed {
		writeErr(w, fail("Terlalu banyak permintaan. Coba lagi nanti.", "RATE_LIMITED", 429))
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
	placeID := asString(body.PlaceID)
	if placeID == "" {
		writeErr(w, fail("ID tempat tidak valid.", "VALIDATION_ERROR", 422))
		return
	}
	record, saved, err := toggleSaved(session.ID, placeID)
	if err != nil {
		writeErr(w, fail("Gagal menyimpan tempat.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{
		"saved": saved, "place": record, "placeId": placeID, "source": "database",
	})
}

func handleSavedDelete(w http.ResponseWriter, r *http.Request, cfg *Config) {
	session := getSession(w, r, cfg)
	if session == nil {
		writeErr(w, unauthorized(""))
		return
	}
	ip := clientIPHeader(r)
	if allowed, retry := checkRateLimit(rateLimitKey(ip, "saved:write"), 30, 60000); !allowed {
		writeErr(w, fail("Terlalu banyak permintaan. Coba lagi nanti.", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	placeID := r.URL.Query().Get("placeId")
	if placeID == "" {
		writeErr(w, fail("ID tempat tidak valid.", "VALIDATION_ERROR", 422))
		return
	}
	saved, err := removeSaved(session.ID, placeID)
	if err != nil {
		writeErr(w, fail("Gagal menghapus tempat tersimpan.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{"saved": saved, "placeId": placeID, "source": "database"})
}

func isSavedPlace(userID, placeID string) (bool, error) {
	var count int
	err := db.QueryRow(`SELECT COUNT(*) FROM saved_places WHERE userId = ? AND placeId = ?`, userID, placeID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func listSavedFor(userID string) ([]savedPlaceRecord, error) {
	rows, err := db.Query(
		`SELECT s.id, s.placeId, COALESCE(p.name, 'Tempat'), COALESCE(CONCAT_WS(', ', p.address, p.city), ''), s.createdAt
		 FROM saved_places s
		 LEFT JOIN places p ON p.id = s.placeId
		 WHERE s.userId = ? ORDER BY s.createdAt DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []savedPlaceRecord
	for rows.Next() {
		var rec savedPlaceRecord
		if err := rows.Scan(&rec.ID, &rec.PlaceID, &rec.PlaceName, &rec.PlaceAddress, &rec.CreatedAt); err != nil {
			continue
		}
		rec.CreatedAt = toISO(rec.CreatedAt)
		out = append(out, rec)
	}
	return out, nil
}

func toggleSaved(userID, placeID string) (*savedPlaceRecord, bool, error) {
	existing, err := isSavedPlace(userID, placeID)
	if err != nil {
		return nil, false, err
	}
	if existing {
		ref, err := removeSaved(userID, placeID)
		if err != nil {
			return nil, false, err
		}
		return nil, !ref, nil
	}
	id := "saved-" + randID()
	_, err = db.Exec(
		`INSERT INTO saved_places (id, userId, placeId, createdAt) VALUES (?, ?, ?, ?)`,
		id, userID, placeID, nowMySQL(),
	)
	if err != nil {
		return nil, false, err
	}
	var rec savedPlaceRecord
	rec.ID = id
	rec.PlaceID = placeID
	_ = db.QueryRow(
		`SELECT COALESCE(p.name, 'Tempat'), COALESCE(CONCAT_WS(', ', p.address, p.city), '') FROM places p WHERE p.id = ?`,
		placeID,
	).Scan(&rec.PlaceName, &rec.PlaceAddress)
	rec.CreatedAt = nowISO()
	return &rec, true, nil
}

func removeSaved(userID, placeID string) (bool, error) {
	existing, err := isSavedPlace(userID, placeID)
	if err != nil {
		return false, err
	}
	if !existing {
		return false, nil
	}
	_, err = db.Exec(`DELETE FROM saved_places WHERE userId = ? AND placeId = ?`, userID, placeID)
	if err != nil {
		return false, err
	}
	return false, nil
}