package store

import (
	"database/sql"

	"blindspot/backend/internal/database"
	"blindspot/backend/internal/util"
)

// RecordActivity heartbeats a signed-in user: refreshes last activity/ip/page
// and, only when the user consents (activityEnabled), also stores the shared
// location. Unknown users are ignored.
func RecordActivity(userID string, lat, lng *float64, ip, page, userAgent string) error {
	if userID == "" {
		return nil
	}
	var enabled int
	err := database.DB.QueryRow(`SELECT activityEnabled FROM users WHERE id = ?`, userID).Scan(&enabled)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}
	if enabled == 0 {
		lat, lng = nil, nil
	}
	now := util.NowMySQL()
	_, err = database.DB.Exec(
		`UPDATE users
			SET lastActivityAt = ?, lastLat = COALESCE(?, lastLat), lastLng = COALESCE(?, lastLng),
				lastIP = COALESCE(?, lastIP), lastPage = COALESCE(?, lastPage),
				lastUserAgent = COALESCE(?, lastUserAgent), updatedAt = ?
			WHERE id = ?`,
		now, lat, lng, ip, page, userAgent, now, userID,
	)
	return err
}

// SetActivityEnabled toggles a user's consent to share their location for
// admin monitoring. Activity metadata (page/ip/time) is still tracked.
func SetActivityEnabled(userID string, enabled bool) error {
	_, err := database.DB.Exec(
		`UPDATE users SET activityEnabled = ?, updatedAt = ? WHERE id = ?`,
		enabled, util.NowMySQL(), userID,
	)
	return err
}

// GetActivityEnabled returns the user's current location-sharing consent.
func GetActivityEnabled(userID string) (bool, error) {
	var enabled int
	err := database.DB.QueryRow(`SELECT activityEnabled FROM users WHERE id = ?`, userID).Scan(&enabled)
	if err != nil {
		return false, err
	}
	return enabled == 1, nil
}