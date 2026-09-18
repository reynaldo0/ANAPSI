package httpapi

import (
	"encoding/json"
	"net/http"

	"blindspot/backend/internal/errs"
)

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

func writeErr(w http.ResponseWriter, e *errs.Error) {
	body := map[string]interface{}{
		"ok": false,
		"error": map[string]interface{}{
			"message": e.Message(),
			"code":    e.Code(),
		},
	}
	if det := e.Details(); len(det) > 0 {
		var parsed interface{}
		if err := json.Unmarshal(det, &parsed); err == nil {
			body["error"].(map[string]interface{})["details"] = parsed
		}
	}
	writeJSON(w, e.Status(), body)
}
