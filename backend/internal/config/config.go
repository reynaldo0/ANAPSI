// Package config centralizes all runtime configuration loaded from the
// environment. Values are read once at startup so behavior is predictable
// across environments (local, staging, production).
package config

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"strconv"
	"strings"
)

// Config holds every tunable for the Blindspot API server.
type Config struct {
	Port        string
	MySQLDSN    string
	AuthSecret  string
	GroqAPIKey  string
	DatabaseURL string

	// CookieSecure marks the session cookie with the Secure attribute.
	// Enable in production (HTTPS). Keep off for plain-HTTP development.
	CookieSecure bool

	// AppOrigins is the allow-list of browser origins CORS allows. Empty means
	// the development defaults (localhost). Set APP_ORIGINS in production to
	// lock cross-origin browsers to your real domain.
	AppOrigins []string

	// Database pool tuning (ops guard against connection exhaustion).
	DBMaxOpen     int
	DBMaxIdle     int
	DBConnLifetimeSeconds int

	// TrustProxyHeaders enables honoring X-Forwarded-For/X-Real-IP from a
	// reverse proxy (Caddy/Nginx). Never enable when the API is reachable
	// directly from the internet, or the header is spoofable.
	TrustProxyHeaders bool
}

// Load builds a Config from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Port:         envOr("PORT", "8080"),
		MySQLDSN:     envOr("MYSQL_DSN", "root:@tcp(127.0.0.1:3306)/blindspot?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci"),
		AuthSecret:   resolveAuthSecret(),
		GroqAPIKey:   os.Getenv("GROQ_API_KEY"),
		DatabaseURL:  os.Getenv("DATABASE_URL"),
		CookieSecure: envBool("COOKIE_SECURE", false),

		AppOrigins: envList("APP_ORIGINS"),

		DBMaxOpen:            envInt("DB_MAX_OPEN", 20),
		DBMaxIdle:            envInt("DB_MAX_IDLE", 5),
		DBConnLifetimeSeconds: envInt("DB_CONN_LIFETIME_SECONDS", 300),

		TrustProxyHeaders: envBool("TRUST_PROXY_HEADERS", false),
	}
}

// resolveAuthSecret shares the same HMAC secret as the Next.js app. Priority:
// env AUTH_SECRET, then ./.data/auth-secret (the file next's getAuthSecret
// creates/reads), then a dev-only fallback.
func resolveAuthSecret() string {
	if v := os.Getenv("AUTH_SECRET"); v != "" {
		return v
	}
	candidates := []string{
		"./data/auth-secret",
		"./.data/auth-secret",
		"../data/auth-secret",
		"../.data/auth-secret",
	}
	for _, p := range candidates {
		if b, err := os.ReadFile(p); err == nil {
			s := strings.TrimSpace(string(b))
			if len(s) >= 16 {
				return s
			}
		}
	}
	// Tidak ada file: buat di lokasi yang juga dibaca Next.js agar sesi tetap
	// selaras saat Next dev maupun backend dijalankan dari direktori mana pun
	// (repo root maupun backend/). Tulis ke dua kemungkinan lokasi.
	fresh := randomSecret()
	if fresh != "" {
		wrote := false
		for _, p := range []string{"./.data/auth-secret", "../.data/auth-secret"} {
			dir := strings.TrimSuffix(p, "/auth-secret")
			if err := os.MkdirAll(dir, 0o755); err != nil {
				continue
			}
			if err := os.WriteFile(p, []byte(fresh+"\n"), 0o600); err == nil {
				wrote = true
			}
		}
		if wrote {
			return fresh
		}
	}
	return "blindspot-dev-secret-change-me"
}

func randomSecret() string {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return ""
	}
	return hex.EncodeToString(buf)
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}

func envInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}

// envList parses a comma-separated env var into a trimmed string list.
func envList(key string) []string {
	raw := os.Getenv(key)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
