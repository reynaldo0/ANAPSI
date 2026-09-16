package main

import (
	"crypto/rand"
	"encoding/hex"
	"regexp"
)

func randUm() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "id-" + hex.EncodeToString([]byte("fallback"))
	}
	return hex.EncodeToString(b)
}

func regexpMatch(pattern, s string) (bool, error) {
	return regexp.MatchString(pattern, s)
}