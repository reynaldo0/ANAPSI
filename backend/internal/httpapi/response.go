package httpapi

import (
	"encoding/json"
	"net/http"

	"anapsi/backend/internal/errs"
)

func writeJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	buf, err := json.Marshal(body)
	if err != nil {
		// Encode gagal (mis. nilai NaN/+Inf dari perhitungan rute): kirim
		// envelope error standar, jangan biarkan body terpotong/rusak.
		buf, _ = json.Marshal(map[string]interface{}{
			"ok": false,
			"error": map[string]interface{}{
				"code":    "INTERNAL_ERROR",
				"message": "Respons gagal dibentuk oleh server. Silakan coba lagi.",
			},
		})
		status = 500
	}
	w.WriteHeader(status)
	_, _ = w.Write(buf)
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
