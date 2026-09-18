package store

import (
	"database/sql"

	"blindspot/backend/internal/database"
	"blindspot/backend/internal/util"
)

// GetUserAccessibilityProfile returns the chosen accessibility profile type
// for a user, or nil when unset.
func GetUserAccessibilityProfile(userID string) *string {
	var t sql.NullString
	err := database.DB.QueryRow(`SELECT type FROM accessibility_profiles WHERE userId = ?`, userID).Scan(&t)
	if err != nil || !t.Valid {
		return nil
	}
	return &t.String
}

// UpsertAccessibilityProfile stores (or replaces) the user's profile type.
func UpsertAccessibilityProfile(userID, profileType string) error {
	_, err := database.DB.Exec(
		`INSERT INTO accessibility_profiles (id, userId, type, createdAt, updatedAt)
		 VALUES (?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE type = VALUES(type), updatedAt = VALUES(updatedAt)`,
		"ap-"+util.RandID(), userID, profileType, util.NowMySQL(), util.NowMySQL(),
	)
	return err
}
