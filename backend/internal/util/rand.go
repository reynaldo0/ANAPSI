package util

import (
	"crypto/rand"
	"encoding/hex"
)

// RandReader is a thin wrapper around crypto/rand for callers that need an
// io.Reader-shaped source of cryptographic randomness.
func RandReader(b []byte) (int, error) {
	return rand.Read(b)
}

// RandID returns a 128-bit random hex string used for entity identifiers.
func RandID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "id-" + hex.EncodeToString([]byte("fallback"))
	}
	return hex.EncodeToString(b)
}
