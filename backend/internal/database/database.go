// Package database owns the process-wide *sql.DB handle and the one-time
// startup bootstrapping (schema, seeds, in-memory demo catalog).
package database

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"anapsi/backend/internal/config"
)

// DB is the process-wide MySQL connection pool. It is initialized by Ensure
// before the HTTP server starts.
var DB *sql.DB

// Ensure opens the MySQL connection pool and verifies connectivity. Pool sizes
// come from config so ops can tune them per VPS without a rebuild.
func Ensure(cfg *config.Config) error {
	conn, err := sql.Open("mysql", cfg.MySQLDSN)
	if err != nil {
		return err
	}
	if cfg.DBMaxOpen > 0 {
		conn.SetMaxOpenConns(cfg.DBMaxOpen)
	}
	if cfg.DBMaxIdle > 0 {
		conn.SetMaxIdleConns(cfg.DBMaxIdle)
	}
	if cfg.DBConnLifetimeSeconds > 0 {
		conn.SetConnMaxLifetime(time.Duration(cfg.DBConnLifetimeSeconds) * time.Second)
	}
	conn.SetConnMaxIdleTime(time.Minute)
	if err := conn.Ping(); err != nil {
		return fmt.Errorf("ping mysql: %w", err)
	}
	DB = conn
	return nil
}

// Close releases the connection pool on graceful shutdown.
func Close() {
	if DB != nil {
		_ = DB.Close()
	}
}

// LoadMemoryCache seeds and loads the in-memory demo catalog used by the
// places, routes and assistant services.
func LoadMemoryCache() error {
	if _, err := loadPlaces(); err != nil {
		return err
	}
	if err := loadDemoFeatures(DB); err != nil {
		return err
	}
	if err := loadDemoReports(DB); err != nil {
		return err
	}
	return nil
}

// ValidateAuth ensures the server can sign/verify sessions.
func ValidateAuth(cfg *config.Config) error {
	if cfg.AuthSecret == "" {
		return fmt.Errorf("AUTH_SECRET empty")
	}
	return nil
}
