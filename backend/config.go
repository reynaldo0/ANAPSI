package main

import (
	"os"
	"strings"
)

type Config struct {
	Port        string
	MySQLDSN    string
	AuthSecret  string
	GroqAPIKey  string
	DatabaseURL string
}

func loadConfig() *Config {
	return &Config{
		Port:        envOr("PORT", "8080"),
		MySQLDSN:    envOr("MYSQL_DSN", "root:@tcp(127.0.0.1:3306)/blindspot?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci"),
		AuthSecret:  resolveAuthSecret(),
		GroqAPIKey:  os.Getenv("GROQ_API_KEY"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
	}
}

// resolveAuthSecret shares the same HMAC secret as the Next.js app. Priority:
// env AUTH_SECRET, then ./.data/auth-secret (the file next's getAuthSecret
// creates/reads), then a dev-only fallback.
func resolveAuthSecret() string {
	if v := os.Getenv("AUTH_SECRET"); v != "" {
		return v
	}
	for _, p := range []string{
		"./data/auth-secret",
		"./.data/auth-secret",
		"../data/auth-secret",
		"../.data/auth-secret",
	} {
		if b, err := os.ReadFile(p); err == nil {
			s := strings.TrimSpace(string(b))
			if len(s) >= 16 {
				return s
			}
		}
	}
	return "blindspot-dev-secret-change-me"
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}