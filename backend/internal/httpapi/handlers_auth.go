package httpapi

import (
	"net/http"
	"strings"

	"blindspot/backend/internal/auth"
	"blindspot/backend/internal/config"
	"blindspot/backend/internal/errs"
	"blindspot/backend/internal/model"
	"blindspot/backend/internal/ratelimit"
	"blindspot/backend/internal/store"
	"blindspot/backend/internal/util"
)

type fieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func validationErrors(items []fieldError) *errs.Error {
	return errs.FailDetails("Periksa kembali isian form.", "VALIDATION_ERROR", 422, items)
}

// isEmail mirrors src/lib/api/validate.ts leniently: must have a @, a dot
// after it, and no spaces or extra @s.
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

func handleRegister(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	ip := clientIPHeader(r)
	if allowed, retry := ratelimit.Check(ratelimit.Key(ip, "register"), 5, 60000); !allowed {
		writeErr(w, errs.Fail("Terlalu banyak percobaan. Coba lagi nanti.", "RATE_LIMITED", 429))
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
	displayName := util.AsString(body.DisplayName)
	email := util.AsString(body.Email)
	password := util.AsString(body.Password)
	var errors []fieldError
	if !(util.Required(displayName) && len(displayName) >= 2 && len(displayName) <= 50) {
		errors = append(errors, fieldError{Field: "displayName", Message: "Nama wajib diisi (2–50 karakter)."})
	}
	if !(isEmail(email) && len(email) <= 254) {
		errors = append(errors, fieldError{Field: "email", Message: "Format email tidak valid."})
	}
	if !(util.MinLength(password, 8) && len(password) <= 128) {
		errors = append(errors, fieldError{Field: "password", Message: "Kata sandi minimal 8 dan maksimal 128 karakter."})
	}
	if len(errors) > 0 {
		writeErr(w, validationErrors(errors))
		return
	}
	passwordHash, err := auth.HashPassword(password)
	if err != nil {
		writeErr(w, errs.Fail("Gagal memproses kata sandi.", "INTERNAL_ERROR", 500))
		return
	}
	publicUser, regErr := store.RegisterUser(email, displayName, passwordHash)
	if regErr != nil {
		if ae, ok := regErr.(*errs.Error); ok {
			writeErr(w, ae)
		} else {
			writeErr(w, errs.Fail("Gagal mendaftarkan akun.", "INTERNAL_ERROR", 500))
		}
		return
	}
	token := auth.CreateSessionToken(*publicUser, cfg.AuthSecret)
	http.SetCookie(w, auth.SessionCookie(token, auth.SessionCookieMaxAge, cfg.CookieSecure))
	created(w, publicUser)
}

func handleLogin(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	ip := clientIPHeader(r)
	if allowed, retry := ratelimit.Check(ratelimit.Key(ip, "login"), 5, 60000); !allowed {
		writeErr(w, errs.Fail("Terlalu banyak percobaan. Coba lagi nanti.", "RATE_LIMITED", 429))
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
	email := util.AsString(body.Email)
	password := util.AsString(body.Password)
	var errors []fieldError
	if !isEmail(email) {
		errors = append(errors, fieldError{Field: "email", Message: "Format email tidak valid."})
	}
	if !util.Required(password) {
		errors = append(errors, fieldError{Field: "password", Message: "Kata sandi wajib diisi."})
	}
	if len(errors) > 0 {
		writeErr(w, validationErrors(errors))
		return
	}
	found, passwordHash, err := store.FindLoginUser(email)
	if err != nil {
		writeErr(w, errs.Fail("Gagal memproses permintaan.", "INTERNAL_ERROR", 500))
		return
	}
	valid := found != nil && auth.VerifyPassword(password, passwordHash)
	if !valid {
		writeErr(w, errs.Fail("Email atau kata sandi salah.", "INVALID_CREDENTIALS", 401))
		return
	}
	token := auth.CreateSessionToken(*found, cfg.AuthSecret)
	http.SetCookie(w, auth.SessionCookie(token, auth.SessionCookieMaxAge, cfg.CookieSecure))
	ok(w, found)
}

func handleLogout(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	http.SetCookie(w, auth.SessionCookie("", 0, cfg.CookieSecure))
	ok(w, map[string]bool{"loggedOut": true})
}

func handleMe(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	if session == nil {
		writeErr(w, errs.Unauthorized(""))
		return
	}
	ok(w, session)
}

func handleProfileGet(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	if session == nil {
		writeErr(w, errs.Unauthorized(""))
		return
	}
	ok(w, map[string]interface{}{
		"id":            session.ID,
		"email":         session.Email,
		"displayName":   session.DisplayName,
		"accessibility": store.GetUserAccessibilityProfile(session.ID),
	})
}

func handleProfilePut(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	if session == nil {
		writeErr(w, errs.Unauthorized(""))
		return
	}
	body := struct {
		DisplayName interface{} `json:"displayName"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	displayName := util.AsString(body.DisplayName)
	if !(util.Required(displayName) && len(displayName) >= 2) {
		writeErr(w, validationErrors([]fieldError{{Field: "displayName", Message: "Nama minimal 2 karakter."}}))
		return
	}
	if err := store.UpdateUserDisplayName(session.ID, displayName); err != nil {
		writeErr(w, errs.Fail("Gagal menyimpan profil.", "INTERNAL_ERROR", 500))
		return
	}
	session.DisplayName = displayName
	ok(w, map[string]interface{}{
		"id":            session.ID,
		"email":         session.Email,
		"displayName":   displayName,
		"accessibility": store.GetUserAccessibilityProfile(session.ID),
	})
}

func handleProfileAccessibilityGet(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	if session == nil {
		writeErr(w, errs.Unauthorized(""))
		return
	}
	ok(w, map[string]interface{}{"type": store.GetUserAccessibilityProfile(session.ID)})
}

func handleProfileAccessibilityPut(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	if session == nil {
		writeErr(w, errs.Unauthorized(""))
		return
	}
	body := struct {
		Type interface{} `json:"type"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	typeValue := util.AsString(body.Type)
	if !model.IsAccessibilityProfile(typeValue) {
		writeErr(w, errs.FailDetails("Pilih profil aksesibilitas yang tersedia.", "VALIDATION_ERROR", 422, map[string]string{"type": typeValue}))
		return
	}
	if err := store.UpsertAccessibilityProfile(session.ID, typeValue); err != nil {
		writeErr(w, errs.Fail("Gagal menyimpan profil.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]string{"type": typeValue})
}
