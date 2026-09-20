package store

import (
	"anapsi/backend/internal/database"
	"anapsi/backend/internal/util"
)

// SavedPlaceRecord is a saved-place row returned to the client.
type SavedPlaceRecord struct {
	ID           string `json:"id"`
	PlaceID      string `json:"placeId"`
	PlaceName    string `json:"placeName"`
	PlaceAddress string `json:"placeAddress"`
	CreatedAt    string `json:"createdAt"`
}

// IsSavedPlace reports whether a user has saved a place.
func IsSavedPlace(userID, placeID string) (bool, error) {
	var count int
	err := database.DB.QueryRow(`SELECT COUNT(*) FROM saved_places WHERE userId = ? AND placeId = ?`, userID, placeID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// ListSavedFor returns the user's saved places, newest first.
func ListSavedFor(userID string) ([]SavedPlaceRecord, error) {
	rows, err := database.DB.Query(
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
	var out []SavedPlaceRecord
	for rows.Next() {
		var rec SavedPlaceRecord
		if err := rows.Scan(&rec.ID, &rec.PlaceID, &rec.PlaceName, &rec.PlaceAddress, &rec.CreatedAt); err != nil {
			continue
		}
		rec.CreatedAt = util.ToISO(rec.CreatedAt)
		out = append(out, rec)
	}
	return out, nil
}

// ToggleSaved adds or removes a saved place and reports the resulting state:
// `saved` is true when the place ended up saved, false when removed.
func ToggleSaved(userID, placeID string) (*SavedPlaceRecord, bool, error) {
	existing, err := IsSavedPlace(userID, placeID)
	if err != nil {
		return nil, false, err
	}
	if existing {
		if _, err := RemoveSaved(userID, placeID); err != nil {
			return nil, false, err
		}
		return nil, false, nil
	}
	id := "saved-" + util.RandID()
	_, err = database.DB.Exec(
		`INSERT INTO saved_places (id, userId, placeId, createdAt) VALUES (?, ?, ?, ?)`,
		id, userID, placeID, util.NowMySQL(),
	)
	if err != nil {
		return nil, false, err
	}
	var rec SavedPlaceRecord
	rec.ID = id
	rec.PlaceID = placeID
	_ = database.DB.QueryRow(
		`SELECT COALESCE(p.name, 'Tempat'), COALESCE(CONCAT_WS(', ', p.address, p.city), '') FROM places p WHERE p.id = ?`,
		placeID,
	).Scan(&rec.PlaceName, &rec.PlaceAddress)
	rec.CreatedAt = util.NowISO()
	return &rec, true, nil
}

// RemoveSaved deletes a saved place. The returned bool mirrors the old
// removeSaved contract: false means the place is no longer saved.
func RemoveSaved(userID, placeID string) (bool, error) {
	existing, err := IsSavedPlace(userID, placeID)
	if err != nil {
		return false, err
	}
	if !existing {
		return false, nil
	}
	if _, err := database.DB.Exec(`DELETE FROM saved_places WHERE userId = ? AND placeId = ?`, userID, placeID); err != nil {
		return false, err
	}
	return false, nil
}
