package util

import "strings"

// TrimSpace trims leading/trailing spaces and tabs.
func TrimSpace(s string) string {
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

// ContainsString reports whether list contains s.
func ContainsString(list []string, s string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

// AsString returns v as a string when it is one, otherwise the empty string.
func AsString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

// Required reports whether the trimmed value is non-empty.
func Required(v string) bool {
	return strings.TrimSpace(v) != ""
}

// MinLength reports whether the value is at least n runes/chars long.
func MinLength(v string, n int) bool {
	return len(v) >= n
}
