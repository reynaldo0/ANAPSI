package httpapi

import (
	"net/http"

	"anapsi/backend/internal/config"
	"anapsi/backend/internal/model"
)

// handleMetaLayers exposes the accessibility layer catalog (plus report
// categories/statuses/profiles) so the frontend can render map legends and
// filters straight from the backend instead of duplicated constants.
func handleMetaLayers(w http.ResponseWriter, r *http.Request, _ *config.Config) {
	type statusOut struct {
		Name   string `json:"name"`
		Symbol string `json:"symbol"`
		Label  string `json:"label"`
		Tone   string `json:"tone"`
	}
	type layerOut struct {
		ID       string       `json:"id"`
		Label    string       `json:"label"`
		Profile  string       `json:"profile"`
		Statuses []statusOut  `json:"statuses"`
	}
	layers := make([]layerOut, 0, len(model.LAYERS))
	for id, meta := range model.LAYERS {
		l := layerOut{ID: id, Label: meta.Label, Profile: meta.Profile}
		for name, st := range meta.Statuses {
			l.Statuses = append(l.Statuses, statusOut{Name: name, Symbol: st.Symbol, Label: st.Label, Tone: st.Tone})
		}
		layers = append(layers, l)
	}
	categories := make([]map[string]string, 0, len(model.REPORT_CATEGORIES))
	for _, c := range model.REPORT_CATEGORIES {
		categories = append(categories, map[string]string{"value": c.Value, "label": c.Label})
	}
	statuses := make([]map[string]string, 0, len(model.STATUSES))
	for _, s := range model.STATUSES {
		label := model.ReportStatusLabel(s)
		if meta, ok := model.REPORT_STATUS_META[s]; ok {
			statuses = append(statuses, map[string]string{"value": s, "label": label, "tone": meta.Tone, "symbol": meta.Symbol})
		} else {
			statuses = append(statuses, map[string]string{"value": s, "label": label})
		}
	}
	ok(w, map[string]interface{}{
		"layers":     layers,
		"categories": categories,
		"profiles":   model.ACCESSIBILITY_PROFILES,
		"statuses":   statuses,
	})
}