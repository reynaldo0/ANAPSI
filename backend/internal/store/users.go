package store

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"strings"

	"anapsi/backend/internal/auth"
	"anapsi/backend/internal/database"
	"anapsi/backend/internal/errs"
	"anapsi/backend/internal/util"
)

// FindLoginUser resolves a registered user by normalized email. It returns
// (nil, "", nil) when the email is unknown.
func FindLoginUser(email string) (*auth.PublicUser, string, error) {
	normalized := strings.ToLower(strings.TrimSpace(email))
	var id, displayName, passwordHash, role string
	err := database.DB.QueryRow(
		`SELECT id, displayName, passwordHash, role FROM users WHERE email = ?`, normalized,
	).Scan(&id, &displayName, &passwordHash, &role)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, "", nil
		}
		return nil, "", err
	}
	return &auth.PublicUser{ID: id, Email: normalized, DisplayName: displayName, Role: role}, passwordHash, nil
}

// FindUserByID resolves a user by primary key (nil when not found).
func FindUserByID(id string) (*auth.PublicUser, error) {
	var email, displayName, role string
	err := database.DB.QueryRow(
		`SELECT email, displayName, role FROM users WHERE id = ?`, id,
	).Scan(&email, &displayName, &role)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &auth.PublicUser{ID: id, Email: email, DisplayName: displayName, Role: role}, nil
}

// RegisterUser creates a new regular user. Duplicate emails are rejected with
// a 409 EMAIL_TAKEN error.
func RegisterUser(email, displayName, passwordHash string) (*auth.PublicUser, error) {
	normalized := strings.ToLower(strings.TrimSpace(email))
	id := "u-" + util.RandID()
	var exists int
	err := database.DB.QueryRow(`SELECT COUNT(*) FROM users WHERE email = ?`, normalized).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if exists > 0 {
		return nil, errs.Fail("Email sudah terdaftar. Coba masuk atau gunakan email lain.", "EMAIL_TAKEN", 409)
	}
	now := util.NowMySQL()
	_, err = database.DB.Exec(
		`INSERT INTO users (id, email, displayName, passwordHash, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'USER', ?, ?)`,
		id, normalized, displayName, passwordHash, now, now,
	)
	if err != nil {
		return nil, err
	}
	return &auth.PublicUser{ID: id, Email: normalized, DisplayName: displayName, Role: "USER"}, nil
}

// ReporterKey deterministically derives the attribution key for a client:
// a stable "user:<id>" for signed-in users, an anonymized hash of the IP
// otherwise.
func ReporterKey(ip string, session *auth.PublicUser) string {
	if session != nil {
		return "user:" + session.ID
	}
	key := ip
	if key == "" {
		key = "unknown"
	}
	sum := sha256.Sum256([]byte(key))
	return "anon:" + hex.EncodeToString(sum[:])
}

// UpdateUserDisplayName updates the stored display name.
func UpdateUserDisplayName(userID, displayName string) error {
	_, err := database.DB.Exec(`UPDATE users SET displayName = ?, updatedAt = ? WHERE id = ?`, displayName, util.NowMySQL(), userID)
	return err
}
