package main

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"strings"
)

func findLoginUser(email string) (*PublicUser, string, error) {
	normalized := strings.ToLower(strings.TrimSpace(email))
	var id, displayName, passwordHash, role string
	err := db.QueryRow(
		`SELECT id, displayName, passwordHash, role FROM users WHERE email = ?`, normalized,
	).Scan(&id, &displayName, &passwordHash, &role)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, "", nil
		}
		return nil, "", err
	}
	return &PublicUser{ID: id, Email: normalized, DisplayName: displayName, Role: role}, passwordHash, nil
}

func findUserById(id string) (*PublicUser, error) {
	var email, displayName, role string
	err := db.QueryRow(
		`SELECT email, displayName, role FROM users WHERE id = ?`, id,
	).Scan(&email, &displayName, &role)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &PublicUser{ID: id, Email: email, DisplayName: displayName, Role: role}, nil
}

func registerUser(email, displayName, passwordHash string) (*PublicUser, error) {
	normalized := strings.ToLower(strings.TrimSpace(email))
	id := "u-" + randID()
	var exists int
	err := db.QueryRow(`SELECT COUNT(*) FROM users WHERE email = ?`, normalized).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if exists > 0 {
		return nil, fail("Email sudah terdaftar. Coba masuk atau gunakan email lain.", "EMAIL_TAKEN", 409)
	}
	now := nowMySQL()
	_, err = db.Exec(
		`INSERT INTO users (id, email, displayName, passwordHash, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'USER', ?, ?)`,
		id, normalized, displayName, passwordHash, now, now,
	)
	if err != nil {
		return nil, err
	}
	return &PublicUser{ID: id, Email: normalized, DisplayName: displayName, Role: "USER"}, nil
}

func reporterKey(ip string, session *PublicUser) string {
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