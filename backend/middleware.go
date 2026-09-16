package main

import (
	"encoding/json"
	"net/http"
	"runtime/debug"
	"time"
)

type ctxKey string

const ctxSession ctxKey = "session"

type appContext struct {
	cfg *Config
}

func withMiddleware(cfg *Config, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		defer func() {
			if rec := recover(); rec != nil {
				debug.PrintStack()
				writeErr(w, fail("Terjadi kesalahan internal server.", "INTERNAL_ERROR", 500))
			}
			_ = start
		}()

		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func getBody(r *http.Request, dest interface{}) *apiError {
	if r.Body == nil {
		return fail("Badan permintaan harus berupa JSON.", "INVALID_JSON", 400)
	}
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(dest); err != nil {
		return fail("Badan permintaan harus berupa JSON.", "INVALID_JSON", 400)
	}
	return nil
}

func getSession(w http.ResponseWriter, r *http.Request, cfg *Config) *PublicUser {
	user, err := getSessionUser(r, cfg.AuthSecret)
	if err != nil {
		return nil
	}
	return user
}

func clientIPHeader(r *http.Request) string {
	return reqIP(r)
}