package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/scrypt"
)

const (
	sessionCookieName    = "blindspot_session"
	sessionTTL           = 7 * 24 * 60 * 60 * 1000 // ms
	scryptKeyLength      = 64
	scryptN              = 16384
	scryptR              = 8
	scryptP              = 1
	sessionCookieMaxAge  = 604800 // seconds
)

type PublicUser struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
}

type SessionPayload struct {
	Sub         string `json:"sub"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
	Exp         int64  `json:"exp"`
}

func hashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := randRead(salt); err != nil {
		return "", err
	}
	saltHex := hex.EncodeToString(salt)
	derived, err := scrypt.Key([]byte(password), []byte(saltHex), scryptN, scryptR, scryptP, scryptKeyLength)
	if err != nil {
		return "", err
	}
	return saltHex + ":" + hex.EncodeToString(derived), nil
}

func verifyPassword(password string, stored string) bool {
	parts := strings.SplitN(stored, ":", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return false
	}
	saltHex, derivedHex := parts[0], parts[1]
	storedHash, err := hex.DecodeString(derivedHex)
	if err != nil {
		return false
	}
	candidate, err := scrypt.Key([]byte(password), []byte(saltHex), scryptN, scryptR, scryptP, scryptKeyLength)
	if err != nil {
		return false
	}
	if len(storedHash) != len(candidate) {
		return false
	}
	return subtle.ConstantTimeCompare(storedHash, candidate) == 1
}

func signCore(core string, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(core))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func createSessionToken(user PublicUser, secret string) string {
	payload := SessionPayload{
		Sub:         user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		Role:        user.Role,
		Exp:         time.Now().UnixMilli() + sessionTTL,
	}
	coreJSON, _ := json.Marshal(payload)
	core := base64.RawURLEncoding.EncodeToString(coreJSON)
	return core + "." + signCore(core, secret)
}

func verifySessionToken(token string, secret string) (*SessionPayload, error) {
	if token == "" {
		return nil, fmt.Errorf("empty token")
	}
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("malformed token")
	}
	core, signature := parts[0], parts[1]
	expected := signCore(core, secret)
	if subtle.ConstantTimeCompare([]byte(signature), []byte(expected)) != 1 {
		return nil, fmt.Errorf("bad signature")
	}
	raw, err := base64.RawURLEncoding.DecodeString(core)
	if err != nil {
		return nil, fmt.Errorf("bad core")
	}
	var payload SessionPayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, fmt.Errorf("bad payload")
	}
	if payload.Exp < time.Now().UnixMilli() {
		return nil, fmt.Errorf("expired")
	}
	return &payload, nil
}

func sessionCookie(token string, maxAge int) *http.Cookie {
	return &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	}
}

func getSessionUser(r *http.Request, secret string) (*PublicUser, error) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil {
		return nil, fmt.Errorf("no session")
	}
	payload, err := verifySessionToken(cookie.Value, secret)
	if err != nil {
		return nil, err
	}
	return &PublicUser{
		ID:          payload.Sub,
		Email:       payload.Email,
		DisplayName: payload.DisplayName,
		Role:        payload.Role,
	}, nil
}

func randRead(b []byte) (int, error) {
	return randReader(b)
}