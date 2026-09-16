package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var db *sql.DB

func ensureDatabase(cfg *Config) error {
	conn, err := sql.Open("mysql", cfg.MySQLDSN)
	if err != nil {
		return err
	}
	conn.SetMaxOpenConns(20)
	conn.SetMaxIdleConns(5)
	conn.SetConnMaxLifetime(5 * time.Minute)
	if err := conn.Ping(); err != nil {
		return fmt.Errorf("ping mysql: %w", err)
	}
	db = conn
	return nil
}

func loadMemoryCache(cfg *Config) error {
	var err error
	if _, err = loadPlaces(); err != nil {
		return err
	}
	if err = loadDemoFeatures(db); err != nil {
		return err
	}
	if err = loadDemoReports(db); err != nil {
		return err
	}
	return nil
}

// validateAuth ensures the server can sign/verify sessions.
func validateAuth(cfg *Config) error {
	if cfg.AuthSecret == "" {
		return fmt.Errorf("AUTH_SECRET empty")
	}
	return nil
}

func reqIP(r *http.Request) string {
	if fwd := r.Header.Get("x-forwarded-for"); fwd != "" {
		first := fwd
		for i := 0; i < len(fwd); i++ {
			if fwd[i] == ',' {
				first = fwd[:i]
				break
			}
		}
		if trimmed := trimSpace(first); trimmed != "" {
			return trimmed
		}
	}
	if rip := r.Header.Get("x-real-ip"); rip != "" {
		return trimSpace(rip)
	}
	return "local"
}

func trimSpace(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}

func nowISO() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000Z")
}

func nowMySQL() string {
	return time.Now().UTC().Format("2006-01-02 15:04:05.000")
}

func toISO(s string) string {
	if s == "" {
		return ""
	}
	s = strings.Replace(s, " ", "T", 1)
	if !strings.HasSuffix(s, "Z") {
		s += "Z"
	}
	return s
}

func iso(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format("2006-01-02T15:04:05.000Z")
}

func randID() string {
	return randUm() // defined in util.go
}