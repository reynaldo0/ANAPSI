package main

import (
	"encoding/json"
	"net/http"
)

type apiError struct {
	status  int
	code    string
	message string
	details json.RawMessage
}

func (e *apiError) Error() string { return e.message }

func fail(message string, code string, status int) *apiError {
	return &apiError{status: status, code: code, message: message}
}

func failDetails(message string, code string, status int, details interface{}) *apiError {
	raw, _ := json.Marshal(details)
	return &apiError{status: status, code: code, message: message, details: raw}
}

func unauthorized(msg string) *apiError {
	if msg == "" {
		msg = "Sesi berakhir. Silakan masuk kembali."
	}
	return fail(msg, "UNAUTHORIZED", 401)
}

func forbidden(msg string) *apiError {
	if msg == "" {
		msg = "Kamu tidak memiliki izin untuk aksi ini."
	}
	return fail(msg, "FORBIDDEN", 403)
}

func notFound(msg string) *apiError {
	if msg == "" {
		msg = "Data tidak ditemukan."
	}
	return fail(msg, "NOT_FOUND", 404)
}

func validationErr(details interface{}) *apiError {
	return failDetails("Periksa kembali isian form.", "VALIDATION_ERROR", 422, details)
}

func writeJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func ok(w http.ResponseWriter, data interface{}) {
	writeJSON(w, 200, map[string]interface{}{"ok": true, "data": data})
}

func created(w http.ResponseWriter, data interface{}) {
	writeJSON(w, 201, map[string]interface{}{"ok": true, "data": data})
}

func writeErr(w http.ResponseWriter, e *apiError) {
	body := map[string]interface{}{
		"ok": false,
		"error": map[string]interface{}{
			"message": e.message,
			"code":    e.code,
		},
	}
	if len(e.details) > 0 {
		var det interface{}
		if err := json.Unmarshal(e.details, &det); err == nil {
			body["error"].(map[string]interface{})["details"] = det
		}
	}
	writeJSON(w, e.status, body)
}