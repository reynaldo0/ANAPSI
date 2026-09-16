package main

import (
	"net/http"
	"strconv"
	"strings"
)

func newRouter(cfg *Config) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		handleHealth(w, r, cfg)
	})

	mux.HandleFunc("POST /api/auth/register", func(w http.ResponseWriter, r *http.Request) {
		handleRegister(w, r, cfg)
	})
	mux.HandleFunc("POST /api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		handleLogin(w, r, cfg)
	})
	mux.HandleFunc("POST /api/auth/logout", handleLogout)
	mux.HandleFunc("GET /api/auth/me", func(w http.ResponseWriter, r *http.Request) {
		handleMe(w, r, cfg)
	})

	mux.HandleFunc("GET /api/profile", func(w http.ResponseWriter, r *http.Request) {
		handleProfileGet(w, r, cfg)
	})
	mux.HandleFunc("PUT /api/profile", func(w http.ResponseWriter, r *http.Request) {
		handleProfilePut(w, r, cfg)
	})
	mux.HandleFunc("GET /api/profile/accessibility", func(w http.ResponseWriter, r *http.Request) {
		handleProfileAccessibilityGet(w, r, cfg)
	})
	mux.HandleFunc("PUT /api/profile/accessibility", func(w http.ResponseWriter, r *http.Request) {
		handleProfileAccessibilityPut(w, r, cfg)
	})

	mux.HandleFunc("GET /api/places", func(w http.ResponseWriter, r *http.Request) {
		handlePlacesGet(w, r)
	})
	mux.HandleFunc("GET /api/places/{id}", func(w http.ResponseWriter, r *http.Request) {
		handlePlaceById(w, r)
	})
	mux.HandleFunc("GET /api/places/{id}/accessibility", func(w http.ResponseWriter, r *http.Request) {
		handlePlaceAccessibility(w, r)
	})
	mux.HandleFunc("GET /api/places/{id}/entrances", func(w http.ResponseWriter, r *http.Request) {
		handlePlaceEntrances(w, r)
	})

	mux.HandleFunc("GET /api/map/features", func(w http.ResponseWriter, r *http.Request) {
		handleMapFeatures(w, r)
	})

	mux.HandleFunc("GET /api/reports", func(w http.ResponseWriter, r *http.Request) {
		handleReportsGet(w, r, cfg)
	})
	mux.HandleFunc("POST /api/reports", func(w http.ResponseWriter, r *http.Request) {
		handleReportsPost(w, r, cfg)
	})
	mux.HandleFunc("GET /api/reports/{id}", func(w http.ResponseWriter, r *http.Request) {
		handleReportById(w, r, cfg)
	})
	mux.HandleFunc("PUT /api/reports/{id}", func(w http.ResponseWriter, r *http.Request) {
		handleReportPut(w, r, cfg)
	})
	mux.HandleFunc("POST /api/reports/{id}/verify", func(w http.ResponseWriter, r *http.Request) {
		handleReportVerify(w, r, cfg, "CONFIRMED")
	})
	mux.HandleFunc("POST /api/reports/{id}/changed", func(w http.ResponseWriter, r *http.Request) {
		handleReportVerify(w, r, cfg, "CHANGED")
	})
	mux.HandleFunc("POST /api/reports/{id}/resolved", func(w http.ResponseWriter, r *http.Request) {
		handleReportVerify(w, r, cfg, "RESOLVED")
	})

	mux.HandleFunc("GET /api/admin/reports", func(w http.ResponseWriter, r *http.Request) {
		handleAdminReportsGet(w, r, cfg)
	})
	mux.HandleFunc("PUT /api/admin/reports", func(w http.ResponseWriter, r *http.Request) {
		handleAdminReportsPut(w, r, cfg)
	})

	mux.HandleFunc("GET /api/gamification", func(w http.ResponseWriter, r *http.Request) {
		handleGamification(w, r, cfg)
	})

	mux.HandleFunc("GET /api/saved", func(w http.ResponseWriter, r *http.Request) {
		handleSavedGet(w, r, cfg)
	})
	mux.HandleFunc("POST /api/saved", func(w http.ResponseWriter, r *http.Request) {
		handleSavedPost(w, r, cfg)
	})
	mux.HandleFunc("DELETE /api/saved", func(w http.ResponseWriter, r *http.Request) {
		handleSavedDelete(w, r, cfg)
	})

	mux.HandleFunc("POST /api/routes", func(w http.ResponseWriter, r *http.Request) {
		handleRoutesPost(w, r, cfg)
	})

	mux.HandleFunc("POST /api/ai/assistant", func(w http.ResponseWriter, r *http.Request) {
		handleAssistant(w, r, cfg)
	})
	mux.HandleFunc("POST /api/ai/analyze-voice-report", func(w http.ResponseWriter, r *http.Request) {
		handleAnalyzeVoice(w, r, cfg)
	})
	mux.HandleFunc("POST /api/ai/analyze-image-report", func(w http.ResponseWriter, r *http.Request) {
		handleAnalyzeImage(w, r, cfg)
	})
	mux.HandleFunc("POST /api/chatbot", func(w http.ResponseWriter, r *http.Request) {
		handleChatbot(w, r, cfg)
	})
	mux.HandleFunc("POST /api/chatbot/transcribe", func(w http.ResponseWriter, r *http.Request) {
		handleChatbotTranscribe(w, r, cfg)
	})

	return mux
}

func parseIntParam(r *http.Request, name string, fallback float64) float64 {
	v := r.URL.Query().Get(name)
	if v == "" {
		return fallback
	}
	n, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return fallback
	}
	return n
}

func handleHealth(w http.ResponseWriter, r *http.Request, cfg *Config) {
	database := "not-configured"
	if cfg.DatabaseURL != "" {
		database = "configured"
	} else if db != nil {
		database = "configured"
	}
	auth := "not-configured"
	if cfg.AuthSecret != "" {
		auth = "configured"
	}
	ok(w, map[string]interface{}{
		"service": "blindspot-api",
		"status":  "healthy",
		"database": database,
		"auth":    auth,
	})
}

func isEmail(value string) bool {
	at := strings.IndexByte(value, '@')
	if at <= 0 || at == len(value)-1 {
		return false
	}
	if strings.ContainsAny(value, " \t") {
		return false
	}
	if strings.Contains(value[at+1:], "@") {
		return false
	}
	dot := strings.LastIndexByte(value, '.')
	return dot > at+1 && dot < len(value)-1
}

type fieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func validationErrors(items []fieldError) *apiError {
	return failDetails("Periksa kembali isian form.", "VALIDATION_ERROR", 422, items)
}

func handleRegister(w http.ResponseWriter, r *http.Request, cfg *Config) {
	ip := clientIPHeader(r)
	if allowed, retry := checkRateLimit(rateLimitKey(ip, "register"), 5, 60000); !allowed {
		writeErr(w, fail("Terlalu banyak percobaan. Coba lagi nanti.", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	body := struct {
		DisplayName interface{} `json:"displayName"`
		Email       interface{} `json:"email"`
		Password    interface{} `json:"password"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	displayName := asString(body.DisplayName)
	email := asString(body.Email)
	password := asString(body.Password)
	var errors []fieldError
	if !(required(displayName) && len(displayName) >= 2 && len(displayName) <= 50) {
		errors = append(errors, fieldError{Field: "displayName", Message: "Nama wajib diisi (2–50 karakter)."})
	}
	if !(isEmail(email) && len(email) <= 254) {
		errors = append(errors, fieldError{Field: "email", Message: "Format email tidak valid."})
	}
	if !(minLength(password, 8) && len(password) <= 128) {
		errors = append(errors, fieldError{Field: "password", Message: "Kata sandi minimal 8 dan maksimal 128 karakter."})
	}
	if len(errors) > 0 {
		writeErr(w, validationErrors(errors))
		return
	}
	passwordHash, err := hashPassword(password)
	if err != nil {
		writeErr(w, fail("Gagal memproses kata sandi.", "INTERNAL_ERROR", 500))
		return
	}
	publicUser, regErr := registerUser(email, displayName, passwordHash)
	if regErr != nil {
		if ae, ok := regErr.(*apiError); ok {
			writeErr(w, ae)
		} else {
			writeErr(w, fail("Gagal mendaftarkan akun.", "INTERNAL_ERROR", 500))
		}
		return
	}
	token := createSessionToken(*publicUser, cfg.AuthSecret)
	http.SetCookie(w, sessionCookie(token, sessionCookieMaxAge))
	created(w, publicUser)
}

func handleLogin(w http.ResponseWriter, r *http.Request, cfg *Config) {
	ip := clientIPHeader(r)
	if allowed, retry := checkRateLimit(rateLimitKey(ip, "login"), 5, 60000); !allowed {
		writeErr(w, fail("Terlalu banyak percobaan. Coba lagi nanti.", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	body := struct {
		Email    interface{} `json:"email"`
		Password interface{} `json:"password"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	email := asString(body.Email)
	password := asString(body.Password)
	var errors []fieldError
	if !isEmail(email) {
		errors = append(errors, fieldError{Field: "email", Message: "Format email tidak valid."})
	}
	if !required(password) {
		errors = append(errors, fieldError{Field: "password", Message: "Kata sandi wajib diisi."})
	}
	if len(errors) > 0 {
		writeErr(w, validationErrors(errors))
		return
	}
	found, passwordHash, err := findLoginUser(email)
	if err != nil {
		writeErr(w, fail("Gagal memproses permintaan.", "INTERNAL_ERROR", 500))
		return
	}
	valid := found != nil && verifyPassword(password, passwordHash)
	if !valid {
		writeErr(w, fail("Email atau kata sandi salah.", "INVALID_CREDENTIALS", 401))
		return
	}
	token := createSessionToken(*found, cfg.AuthSecret)
	http.SetCookie(w, sessionCookie(token, sessionCookieMaxAge))
	ok(w, found)
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, sessionCookie("", 0))
	ok(w, map[string]bool{"loggedOut": true})
}

func handleMe(w http.ResponseWriter, r *http.Request, cfg *Config) {
	session := getSession(w, r, cfg)
	if session == nil {
		writeErr(w, unauthorized(""))
		return
	}
	ok(w, session)
}

func handleProfileGet(w http.ResponseWriter, r *http.Request, cfg *Config) {
	session := getSession(w, r, cfg)
	if session == nil {
		writeErr(w, unauthorized(""))
		return
	}
	profileType := getUserAccessibilityProfile(session.ID)
	ok(w, map[string]interface{}{
		"id":           session.ID,
		"email":        session.Email,
		"displayName":  session.DisplayName,
		"accessibility": profileType,
	})
}

func handleProfilePut(w http.ResponseWriter, r *http.Request, cfg *Config) {
	session := getSession(w, r, cfg)
	if session == nil {
		writeErr(w, unauthorized(""))
		return
	}
	body := struct {
		DisplayName interface{} `json:"displayName"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	displayName := asString(body.DisplayName)
	if !(required(displayName) && len(displayName) >= 2) {
		writeErr(w, validationErrors([]fieldError{{Field: "displayName", Message: "Nama minimal 2 karakter."}}))
		return
	}
	if err := updateUserDisplayName(session.ID, displayName); err != nil {
		writeErr(w, fail("Gagal menyimpan profil.", "INTERNAL_ERROR", 500))
		return
	}
	profileType := getUserAccessibilityProfile(session.ID)
	session.DisplayName = displayName
	ok(w, map[string]interface{}{
		"id":            session.ID,
		"email":         session.Email,
		"displayName":   displayName,
		"accessibility": profileType,
	})
}

func handleProfileAccessibilityGet(w http.ResponseWriter, r *http.Request, cfg *Config) {
	session := getSession(w, r, cfg)
	if session == nil {
		writeErr(w, unauthorized(""))
		return
	}
	ok(w, map[string]interface{}{"type": getUserAccessibilityProfile(session.ID)})
}

func handleProfileAccessibilityPut(w http.ResponseWriter, r *http.Request, cfg *Config) {
	session := getSession(w, r, cfg)
	if session == nil {
		writeErr(w, unauthorized(""))
		return
	}
	body := struct {
		Type interface{} `json:"type"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	typeValue := ""
	if s, ok := body.Type.(string); ok {
		typeValue = s
	}
	if !isAccessibilityProfile(typeValue) {
		writeErr(w, failDetails("Pilih profil aksesibilitas yang tersedia.", "VALIDATION_ERROR", 422, map[string]string{"type": typeValue}))
		return
	}
	if err := upsertAccessibilityProfile(session.ID, typeValue); err != nil {
		writeErr(w, fail("Gagal menyimpan profil.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]string{"type": typeValue})
}

func handleGamification(w http.ResponseWriter, r *http.Request, cfg *Config) {
	ip := clientIPHeader(r)
	session := getSession(w, r, cfg)
	declared := r.URL.Query().Get("reporterId")
	rankingParam := r.URL.Query().Get("ranking")
	resolvedKey := reporterKeyForIP(ip, session)
	raw := getGamificationStats(resolvedKey)
	var stats *GamificationStats
	if raw != nil {
		id := declared
		if id == "" {
			id = raw.ReporterId
		}
		raw.ReporterId = id
		stats = raw
	}
	var leaderboard interface{} = nil
	if rankingParam == "1" {
		leaderboard = listGamificationRanking(10)
	}
	_ = cfg
	ok(w, map[string]interface{}{"stats": stats, "leaderboard": leaderboard})
}

func reporterKeyForIP(ip string, session *PublicUser) string {
	return reporterKey(ip, session)
}

func isAccessibilityProfile(value string) bool {
	for _, p := range ACCESSIBILITY_PROFILES {
		if p == value {
			return true
		}
	}
	return false
}

// helpers matching src/lib/api/validate.ts
func asString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func required(v string) bool {
	return strings.TrimSpace(v) != ""
}

func minLength(v string, n int) bool {
	return len(v) >= n
}