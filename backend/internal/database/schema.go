package database

import (
	"database/sql"
	"fmt"

	"blindspot/backend/internal/demo"
)

// loadPlaces performs a memory load of the demo catalog and mirrors it into
// the places/entrances tables.
func loadPlaces() ([]*demo.Place, error) {
	places := demo.Places()
	if err := ensurePlacesSchema(DB); err != nil {
		return nil, err
	}
	if err := seedPlaces(DB, places); err != nil {
		return nil, err
	}
	return places, nil
}

// ensurePlacesSchema creates all application tables when missing.
func ensurePlacesSchema(db *sql.DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id VARCHAR(255) PRIMARY KEY,
			email VARCHAR(254) NOT NULL UNIQUE,
			displayName VARCHAR(100) NOT NULL,
			passwordHash VARCHAR(200) NOT NULL,
			role VARCHAR(10) NOT NULL DEFAULT 'USER',
			avatarUrl VARCHAR(500) NULL,
			createdAt DATETIME(3) NOT NULL,
			updatedAt DATETIME(3) NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS accessibility_profiles (
			id VARCHAR(255) PRIMARY KEY,
			userId VARCHAR(255) NOT NULL UNIQUE,
			type VARCHAR(30) NOT NULL,
			mobilityDetail VARCHAR(500) NULL,
			preferredVoiceRate FLOAT NULL,
			createdAt DATETIME(3) NOT NULL,
			updatedAt DATETIME(3) NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS places (
			id VARCHAR(255) PRIMARY KEY,
			name VARCHAR(200) NOT NULL,
			address VARCHAR(300) NULL,
			city VARCHAR(120) NOT NULL,
			latitude DOUBLE NOT NULL,
			longitude DOUBLE NOT NULL,
			category VARCHAR(80) NOT NULL,
			description TEXT NULL,
			createdAt DATETIME(3) NOT NULL,
			updatedAt DATETIME(3) NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS entrances (
			id VARCHAR(255) PRIMARY KEY,
			placeId VARCHAR(255) NOT NULL,
			name VARCHAR(200) NOT NULL,
			type VARCHAR(20) NOT NULL,
			stepCount INT NOT NULL DEFAULT 0,
			hasRamp TINYINT(1) NOT NULL DEFAULT 0,
			widthCm INT NULL,
			lat DOUBLE NULL,
			lng DOUBLE NULL,
			notes VARCHAR(500) NULL,
			INDEX (placeId)
		)`,
		`CREATE TABLE IF NOT EXISTS accessibility_features (
			id VARCHAR(255) PRIMARY KEY,
			placeId VARCHAR(255) NOT NULL,
			type VARCHAR(40) NOT NULL,
			present TINYINT(1) NOT NULL DEFAULT 1,
			notes VARCHAR(500) NULL,
			INDEX (placeId)
		)`,
		`CREATE TABLE IF NOT EXISTS map_features (
			id VARCHAR(255) PRIMARY KEY,
			kind VARCHAR(40) NOT NULL,
			status VARCHAR(40) NOT NULL,
			lat DOUBLE NOT NULL,
			lng DOUBLE NOT NULL,
			placeId VARCHAR(255) NULL,
			verification VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
			stepCount INT NULL,
			INDEX (kind)
		)`,
		`CREATE TABLE IF NOT EXISTS accessibility_scores (
			id VARCHAR(255) PRIMARY KEY,
			placeId VARCHAR(255) NOT NULL UNIQUE,
			visualValue DOUBLE NOT NULL,
			mobilityValue DOUBLE NOT NULL,
			rating DOUBLE NOT NULL,
			updatedAt DATETIME(3) NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS accessibility_reports (
			id VARCHAR(255) PRIMARY KEY,
			placeId VARCHAR(255) NULL,
			authorId VARCHAR(255) NULL,
			reporterKey VARCHAR(300) NULL,
			category VARCHAR(40) NOT NULL,
			title VARCHAR(200) NOT NULL,
			body TEXT NOT NULL,
			severity VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
			affectedProfiles TEXT NOT NULL,
			aiGenerated TINYINT(1) NOT NULL DEFAULT 0,
			latitude DOUBLE NULL,
			longitude DOUBLE NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
			moderationNotes VARCHAR(2000) NULL,
			createdAt DATETIME(3) NOT NULL,
			updatedAt DATETIME(3) NOT NULL,
			INDEX (placeId), INDEX (authorId), INDEX (status)
		)`,
		`CREATE TABLE IF NOT EXISTS report_media (
			id VARCHAR(255) PRIMARY KEY,
			reportId VARCHAR(255) NOT NULL,
			kind VARCHAR(20) NOT NULL,
			url TEXT NOT NULL,
			caption VARCHAR(500) NULL,
			INDEX (reportId)
		)`,
		`CREATE TABLE IF NOT EXISTS report_verifications (
			id VARCHAR(255) PRIMARY KEY,
			reportId VARCHAR(255) NOT NULL,
			userId VARCHAR(255) NULL,
			verificationType VARCHAR(20) NOT NULL,
			comment VARCHAR(500) NULL,
			userName VARCHAR(100) NULL,
			verifierKey VARCHAR(300) NULL,
			result VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
			verifiedAt DATETIME(3) NULL,
			INDEX (reportId)
		)`,
		`CREATE TABLE IF NOT EXISTS saved_places (
			id VARCHAR(255) PRIMARY KEY,
			userId VARCHAR(255) NOT NULL,
			placeId VARCHAR(255) NOT NULL,
			createdAt DATETIME(3) NOT NULL,
			UNIQUE (userId, placeId)
		)`,
		`CREATE TABLE IF NOT EXISTS gamification (
			reporterKey VARCHAR(300) PRIMARY KEY,
			reporterName VARCHAR(100) NULL,
			reports INT NOT NULL DEFAULT 0,
			verifiedReports INT NOT NULL DEFAULT 0,
			points INT NOT NULL DEFAULT 0,
			badges TEXT NOT NULL,
			updatedAt DATETIME(3) NOT NULL
		)`,
	}
	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("schema: %w", err)
		}
	}
	if err := ensureActivityColumns(db); err != nil {
		return fmt.Errorf("schema: %w", err)
	}
	return nil
}

// ensureActivityColumns migrates the users table with activity-tracking
// columns used by the admin monitoring dashboard (last activity, shared
// location, IP/page/UA, consent flag).
func ensureActivityColumns(db *sql.DB) error {
	migrations := []struct{ name, ddl string }{
		{"lastActivityAt", "DATETIME(3) NULL"},
		{"lastLat", "DOUBLE NULL"},
		{"lastLng", "DOUBLE NULL"},
		{"lastIP", "VARCHAR(60) NULL"},
		{"lastPage", "VARCHAR(200) NULL"},
		{"lastUserAgent", "VARCHAR(300) NULL"},
		{"activityEnabled", "TINYINT(1) NOT NULL DEFAULT 1"},
	}
	for _, m := range migrations {
		var exists int
		err := db.QueryRow(
			`SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
			m.name,
		).Scan(&exists)
		if err != nil {
			return err
		}
		if exists == 0 {
			if _, err := db.Exec(`ALTER TABLE users ADD COLUMN ` + m.name + ` ` + m.ddl); err != nil {
				return fmt.Errorf("migrate users.%s: %w", m.name, err)
			}
		}
	}
	var hasIndex int
	err := db.QueryRow(
		`SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_activity'`,
	).Scan(&hasIndex)
	if err != nil {
		return err
	}
	if hasIndex == 0 {
		if _, err := db.Exec(`CREATE INDEX idx_users_activity ON users (lastActivityAt)`); err != nil {
			return fmt.Errorf("migrate users index: %w", err)
		}
	}
	return nil
}
