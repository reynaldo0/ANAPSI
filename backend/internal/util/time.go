package util

import (
	"strings"
	"time"
)

// NowISO returns the current UTC time in the ISO-8601 format used by the API.
func NowISO() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000Z")
}

// NowMySQL returns the current UTC time in the MySQL DATETIME(3) format.
func NowMySQL() string {
	return time.Now().UTC().Format("2006-01-02 15:04:05.000")
}

// ToISO normalizes a value coming from a MySQL DATETIME column into ISO-8601.
func ToISO(s string) string {
	if s == "" {
		return ""
	}
	s = strings.Replace(s, " ", "T", 1)
	if !strings.HasSuffix(s, "Z") {
		s += "Z"
	}
	return s
}

// ISO formats a time.Time into ISO-8601 (empty when zero).
func ISO(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format("2006-01-02T15:04:05.000Z")
}
