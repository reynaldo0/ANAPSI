package httpapi

import (
	"encoding/json"
	"net/http"
	"runtime/debug"

	"blindspot/backend/internal/auth"
	"blindspot/backend/internal/config"
	"blindspot/backend/internal/errs"
	"blindspot/backend/internal/util"
)

const maxBodyBytes = 32 << 20 // 32 MB: base64 report photos (3 × ~6.7 MB) + fields

type discardWriter struct{}

func (discardWriter) Header() http.Header         { return http.Header{} }
func (discardWriter) Write(b []byte) (int, error) { return len(b), nil }
func (discardWriter) WriteHeader(int)             {}

// WithMiddleware wraps the router with request-level concerns: panic
// recovery, permissive-but-sane CORS for the Next.js clients, and basic
// security headers. The session cookie remains HttpOnly + SameSite=Lax.
func WithMiddleware(cfg *config.Config, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				debug.PrintStack()
				writeErr(w, errs.Fail("Terjadi kesalahan internal server.", "INTERNAL_ERROR", 500))
			}
		}()

		if origin := r.Header.Get("Origin"); origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Add("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Expose-Headers", "Retry-After")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// getBody decodes a JSON request body with a hard size cap so oversized
// payloads cannot exhaust memory.
func getBody(r *http.Request, dest interface{}) *errs.Error {
	if r.Body == nil {
		return errs.Fail("Badan permintaan harus berupa JSON.", "INVALID_JSON", 400)
	}
	r.Body = http.MaxBytesReader(discardWriter{}, r.Body, maxBodyBytes)
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(dest); err != nil {
		return errs.Fail("Badan permintaan harus berupa JSON.", "INVALID_JSON", 400)
	}
	return nil
}

// getSession resolves the verified session user, or nil when absent/invalid.
func getSession(r *http.Request, cfg *config.Config) *auth.PublicUser {
	user, err := auth.GetSessionUser(r, cfg.AuthSecret)
	if err != nil {
		return nil
	}
	return user
}

// clientIPHeader returns the best-effort client address for rate limiting,
// preferring the first X-Forwarded-For entry.
func clientIPHeader(r *http.Request) string {
	if fwd := r.Header.Get("x-forwarded-for"); fwd != "" {
		first := fwd
		for i := 0; i < len(fwd); i++ {
			if fwd[i] == ',' {
				first = fwd[:i]
				break
			}
		}
		if trimmed := util.TrimSpace(first); trimmed != "" {
			return trimmed
		}
	}
	if rip := r.Header.Get("x-real-ip"); rip != "" {
		return util.TrimSpace(rip)
	}
	return "local"
}
