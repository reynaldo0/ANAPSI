package main

import (
	"database/sql"
)

func getUserAccessibilityProfile(userID string) *string {
	var t sql.NullString
	err := db.QueryRow(`SELECT type FROM accessibility_profiles WHERE userId = ?`, userID).Scan(&t)
	if err != nil || !t.Valid {
		return nil
	}
	return &t.String
}

func updateUserDisplayName(userID, displayName string) error {
	_, err := db.Exec(`UPDATE users SET displayName = ?, updatedAt = ? WHERE id = ?`, displayName, nowMySQL(), userID)
	return err
}

func upsertAccessibilityProfile(userID, profileType string) error {
	_, err := db.Exec(
		`INSERT INTO accessibility_profiles (id, userId, type, createdAt, updatedAt)
		 VALUES (?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE type = VALUES(type), updatedAt = VALUES(updatedAt)`,
		"ap-"+randID(), userID, profileType, nowMySQL(), nowMySQL(),
	)
	return err
}