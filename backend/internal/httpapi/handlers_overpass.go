package httpapi

import (
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"blindspot/backend/internal/config"
	"blindspot/backend/internal/errs"
)

var overpassEndpoints = []string{
	"https://overpass-api.de/api/interpreter",
	"https://overpass.kumi.systems/api/interpreter",
}

// handleOverpassProxy forwards the realtime OSM query from the browser to an
// Overpass API instance server-side (avoids CORS + rate-limit perf issues on
// the client) and returns the raw answer. Body can be form-encoded
// (data=...) or JSON {"data": "..."}.
func handleOverpassProxy(w http.ResponseWriter, r *http.Request, _ *config.Config) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		writeErr(w, errs.Fail("Metode tidak didukung.", "METHOD_NOT_ALLOWED", 405))
		return
	}
	query := r.URL.Query().Get("data")
	switch {
	case r.Method == http.MethodPost && r.Header.Get("Content-Type") == "application/json":
		var in struct {
			Data string `json:"data"`
		}
		if err := getBody(r, &in); err != nil {
			writeErr(w, err)
			return
		}
		query = in.Data
	case query == "" && r.Method == http.MethodPost:
		if err := r.ParseForm(); err == nil {
			query = r.PostForm.Get("data")
		}
	}
	if strings.TrimSpace(query) == "" {
		writeErr(w, errs.Fail("Parameter data (overpass QL) wajib diisi.", "VALIDATION_ERROR", 400))
		return
	}

	form := url.Values{"data": {query}}
	client := &http.Client{Timeout: 25 * time.Second}
	var lastErr error
	for _, ep := range overpassEndpoints {
		req, err := http.NewRequest(http.MethodPost, ep, strings.NewReader(form.Encode()))
		if err != nil {
			lastErr = err
			continue
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		req.Header.Set("User-Agent", "Blindspot/1.0 (accessibility assistant)")
		res, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		defer res.Body.Close()
		if res.StatusCode != http.StatusOK {
			lastErr = errs.Fail("Server Overpass menolak permintaan.", "UPSTREAM_ERROR", 502)
			continue
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = io.Copy(w, res.Body)
		return
	}
	if lastErr == nil {
		lastErr = errs.Fail("Semua server Overpass tidak tersedia.", "UPSTREAM_ERROR", 502)
	}
	writeErr(w, toAppError(lastErr))
}

func toAppError(err error) *errs.Error {
	if e, ok := err.(*errs.Error); ok {
		return e
	}
	return errs.Fail("Gagal menghubungi server Overpass.", "UPSTREAM_ERROR", 502)
}