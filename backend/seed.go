package main

import (
	"database/sql"
	"fmt"
)

func seedPlaces(db *sql.DB, places []*DemoPlace) error {
	now := nowMySQL()
	for _, p := range places {
		if _, err := db.Exec(
			`INSERT INTO places (id, name, address, city, latitude, longitude, category, description, createdAt, updatedAt)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			 ON DUPLICATE KEY UPDATE name=VALUES(name)`,
			p.ID, p.Name, p.Address, p.City, p.Lat, p.Lng, p.Category, p.Description, now, now,
		); err != nil {
			return fmt.Errorf("seed place %s: %w", p.ID, err)
		}
		for _, e := range p.Entrances {
			if _, err := db.Exec(
				`INSERT INTO entrances (id, placeId, name, type, stepCount, hasRamp, widthCm, lat, lng, notes)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				 ON DUPLICATE KEY UPDATE placeId=VALUES(placeId)`,
				e.ID, p.ID, e.Name, e.Type, e.Steps, e.HasRamp, e.WidthCm, p.Lat, p.Lng, e.Notes,
			); err != nil {
				return fmt.Errorf("seed entrance %s: %w", e.ID, err)
			}
		}
	}
	return nil
}

func loadDemoFeatures(db *sql.DB) error {
	for _, f := range demoFeatureData() {
		var pid interface{}
		if f.PlaceID != nil {
			pid = *f.PlaceID
		}
		var sc interface{}
		if f.StepCount != nil {
			sc = *f.StepCount
		}
		if _, err := db.Exec(
			`INSERT INTO map_features (id, kind, status, lat, lng, placeId, verification, stepCount)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			 ON DUPLICATE KEY UPDATE kind=VALUES(kind)`,
			f.ID, f.Kind, f.Status, f.Lat, f.Lng, pid, f.Verification, sc,
		); err != nil {
			return fmt.Errorf("seed feature %s: %w", f.ID, err)
		}
	}
	return nil
}

func loadDemoReports(db *sql.DB) error {
	for _, r := range demoReportData() {
		if _, err := db.Exec(
			`INSERT IGNORE INTO accessibility_reports (id, placeId, authorId, category, title, body, severity, affectedProfiles, aiGenerated, latitude, longitude, status, moderationNotes, createdAt, updatedAt)
			 VALUES (?, ?, NULL, 'OTHER', ?, ?, 'MEDIUM', '[]', 0, NULL, NULL, ?, NULL, ?, ?)`,
			r.ID, r.PlaceID, r.Title, r.Excerpt, r.Status, r.CreatedAt+" 00:00:00.000", r.CreatedAt+" 00:00:00.000",
		); err != nil {
			return fmt.Errorf("seed demo report %s: %w", r.ID, err)
		}
		if r.Verification == "VERIFIED" && r.Agree > 0 {
			if _, err := db.Exec(
				`INSERT IGNORE INTO report_verifications (id, reportId, userId, verificationType, comment, userName, verifierKey, result, verifiedAt)
				 VALUES (?, ?, NULL, 'CONFIRMED', NULL, ?, NULL, 'VERIFIED', ?)`,
				r.ID+"-seed-ver", r.ID, r.AuthorName, r.CreatedAt+" 00:00:00.000",
			); err != nil {
				return fmt.Errorf("seed verification %s: %w", r.ID, err)
			}
		}
	}
	return nil
}

// seedDatabase seeds demo users and any other auth-critical rows.
func seedDatabase(cfg *Config) error {
	if err := seedUsers(db); err != nil {
		return err
	}
	return nil
}

func seedUsers(db *sql.DB) error {
	adminHash, err := hashPassword("admin12345")
	if err != nil {
		return err
	}
	userHash, err := hashPassword("demo12345")
	if err != nil {
		return err
	}
	now := nowMySQL()
	rows := []struct {
		id, email, displayName, hash, role, createdAt string
	}{
		{"u-admin-demo", "admin@blindspot.id", "Admin BLINDSPOT", adminHash, "ADMIN", now},
		{"u-demo-user", "demo@blindspot.id", "Pengguna Demo", userHash, "USER", now},
	}
	for _, r := range rows {
		if _, err := db.Exec(
			`INSERT IGNORE INTO users (id, email, displayName, passwordHash, role, createdAt, updatedAt)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			r.id, r.email, r.displayName, r.hash, r.role, r.createdAt, r.createdAt,
		); err != nil {
			return fmt.Errorf("seed user %s: %w", r.id, err)
		}
	}
	return nil
}