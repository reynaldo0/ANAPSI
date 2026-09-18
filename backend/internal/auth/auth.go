// Package auth implements password hashing (scrypt), session token creation/
// verification (HMAC-SHA256) and session cookie handling.
package auth

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

	"blindspot/backend/internal/util"
)

const (
	SessionCookieName   = "blindspot_session"
	sessionTTL          = 7 * 24 * 60 * 60 * 1000 // ms
	scryptKeyLength     = 64
	scryptN             = 16384
	scryptR             = 8
	scryptP             = 1
	SessionCookieMaxAge = 604800 // seconds
)

// PublicUser is the publicly exposed consumer of registered users.
type PublicUser struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
}

// SessionPayload is the signed content of a session token.
type SessionPayload struct {
	Sub         string `json:"sub"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
	Exp         int64  `json:"exp"`
}

// HashPassword derives a salted scrypt hash stored as "salt:hash".
func HashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := util.RandReader(salt); err != nil {
		return "", err
	}
	saltHex := hex.EncodeToString(salt)
	derived, err := scrypt.Key([]byte(password), []byte(saltHex), scryptN, scryptR, scryptP, scryptKeyLength)
	if err != nil {
		return "", err
	}
	return saltHex + ":" + hex.EncodeToString(derived), nil
}

// VerifyPassword checks a plaintext password against a stored "salt:hash".
func VerifyPassword(password string, stored string) bool {
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

// SignCore HMAC-signs the base64 core of a session token.
func SignCore(core string, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(core))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// CreateSessionToken issues a stateless, signed session token for a user.
func CreateSessionToken(user PublicUser, secret string) string {
	payload := SessionPayload{
		Sub:         user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		Role:        user.Role,
		Exp:         time.Now().UnixMilli() + sessionTTL,
	}
	coreJSON, _ := json.Marshal(payload)
	core := base64.RawURLEncoding.EncodeToString(coreJSON)
	return core + "." + SignCore(core, secret)
}

// VerifySessionToken validates a token's signature, encoding and expiry.
func VerifySessionToken(token string, secret string) (*SessionPayload, error) {
	if token == "" {
		return nil, fmt.Errorf("empty token")
	}
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("malformed token")
	}
	core, signature := parts[0], parts[1]
	expected := SignCore(core, secret)
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

// SessionCookie builds the HttpOnly session cookie. secure should be true in
// production (HTTPS) deployments.
func SessionCookie(token string, maxAge int, secure bool) *http.Cookie {
	return &http.Cookie{
		Name:     SessionCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	}
}

// GetSessionUser resolves and verifies the session cookie into a PublicUser.
func GetSessionUser(r *http.Request, secret string) (*PublicUser, error) {
	cookie, err := r.Cookie(SessionCookieName)
	if err != nil {
		return nil, fmt.Errorf("no session")
	}
	payload, err := VerifySessionToken(cookie.Value, secret)
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
