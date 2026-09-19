package httpapi

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"runtime/debug"
	"strconv"
	"strings"
	"time"

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

type ctxKey int

const ctxCfg ctxKey = iota

// responseCapture wraps an http.ResponseWriter so the middleware can log the
// status code and byte count without changing handler behavior.
type responseCapture struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (rc *responseCapture) WriteHeader(code int) {
	rc.status = code
	rc.ResponseWriter.WriteHeader(code)
}

func (rc *responseCapture) Write(b []byte) (int, error) {
	if rc.status == 0 {
		rc.status = http.StatusOK
	}
	n, err := rc.ResponseWriter.Write(b)
	rc.bytes += n
	return n, err
}

func (rc *responseCapture) Flush() {
	if fl, ok := rc.ResponseWriter.(http.Flusher); ok {
		fl.Flush()
	}
}

// defaultAllowedOrigins are the CORS allow-list used when APP_ORIGINS is unset
// (local development: Next dev on :3000 and the Go API on :8080).
func defaultAllowedOrigins() []string {
	return []string{"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080", "http://127.0.0.1:8080"}
}

// WithMiddleware wraps the router with request-level concerns: panic recovery,
// CORS restricted to an explicit origin allow-list, security headers,
// per-request logging and the trusted-proxy decision for client IP lookup.
// The session cookie remains HttpOnly + SameSite=Lax.
func WithMiddleware(cfg *config.Config, next http.Handler) http.Handler {
	allowed := cfg.AppOrigins
	if len(allowed) == 0 {
		allowed = defaultAllowedOrigins()
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				debug.PrintStack()
				writeErr(w, errs.Fail("Terjadi kesalahan internal server.", "INTERNAL_ERROR", 500))
			}
		}()

		r = r.WithContext(context.WithValue(r.Context(), ctxCfg, cfg))

		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Add("Vary", "Origin")
			if allowedOrigin(allowed, origin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Expose-Headers", "Retry-After")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "geolocation=(self), camera=(self), microphone=()")
		if cfg.CookieSecure {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		applyCacheControl(w, r)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		start := time.Now()
		rc := &responseCapture{ResponseWriter: w, status: 0}
		next.ServeHTTP(rc, r)
		dur := time.Since(start)
		if rc.status == 0 {
			rc.status = http.StatusOK
		}
		logRequest(r, rc.status, rc.bytes, dur)
	})
}

func allowedOrigin(allowed []string, origin string) bool {
	for _, o := range allowed {
		if o == origin {
			return true
		}
	}
	return false
}

// logRequest emits one compact structured-ish line per request for operations
// monitoring. It stays bounded: no headers, no bodies, fixed fields.
func logRequest(r *http.Request, status, bytes int, dur time.Duration) {
	if strings.HasPrefix(r.URL.Path, "/api/admin/stream") && status == http.StatusOK {
		return // SSE emits one log line per snapshot — too noisy; skip.
	}
	ip := "-"
	if host, ok := clientIPRaw(r); ok {
		ip = host
	}
	bs := strconv.Itoa(bytes)
	if bytes < 1000 {
		bs += "B"
	} else {
		bs = strconv.Itoa(bytes/1000) + "KB"
	}
	println("[" + time.Now().Format("2006-01-02 15:04:05.000") + "] " + r.Method + " " + r.URL.Path +
		" → " + strconv.Itoa(status) + " (" + bs + ", " + dur.Round(time.Millisecond).String() + ", ip=" + ip + ")")
}

// cacheableGET decides whether a GET response is safe to cache: global,
// non user-specific data that only changes occasionally. Networking yang
// jelek jadi jauh lebih cepat ketika browser + service worker dapat memakai
// hasil yang terakhir dimuat sambil menyegarkannya di latar belakang.
func cacheableGET(path string) bool {
	if path == "/api/meta/layers" || path == "/api/map/features" {
		return true
	}
	return path == "/api/geo/suggest" || path == "/api/places"
}

// applyCacheControl sets conservative caching headers before handlers write.
// Data pribadi (auth, profil, admin, gamification, saved) selalu no-store.
func applyCacheControl(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet && cacheableGET(r.URL.Path) {
		w.Header().Set("Cache-Control", "public, max-age=60, stale-while-revalidate=120")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
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

// clientIPHeader returns the best-effort client address for rate limiting.
// Proxy headers (X-Forwarded-For / X-Real-IP) are only honored when the
// operator enabled TRUST_PROXY_HEADERS (i.e. the API sits behind a reverse
// proxy); otherwise the raw TCP peer address is used so spoofing is ignored.
func clientIPHeader(r *http.Request) string {
	ip, ok := clientIPRaw(r)
	if !ok {
		return "local"
	}
	return util.TrimSpace(ip)
}

func clientIPRaw(r *http.Request) (string, bool) {
	if cfg, ok := r.Context().Value(ctxCfg).(*config.Config); ok && cfg.TrustProxyHeaders {
		if fwd := r.Header.Get("x-forwarded-for"); fwd != "" {
			first := fwd
			for i := 0; i < len(fwd); i++ {
				if fwd[i] == ',' {
					first = fwd[:i]
					break
				}
			}
			if trimmed := util.TrimSpace(first); trimmed != "" {
				return trimmed, true
			}
		}
		if rip := r.Header.Get("x-real-ip"); rip != "" {
			return util.TrimSpace(rip), true
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return "", false
	}
	return host, true
}
