package httpapi

import (
	"net/http"
	"strconv"
	"strings"

	"anapsi/backend/internal/config"
	"anapsi/backend/internal/model"
	"anapsi/backend/internal/service"
)

func handleGeoSuggest(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	_ = cfg
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	var origin *model.LatLng
	latRaw := r.URL.Query().Get("lat")
	lngRaw := r.URL.Query().Get("lng")
	if latRaw != "" && lngRaw != "" {
		if lat, err := strconv.ParseFloat(latRaw, 64); err == nil {
			if lng, err := strconv.ParseFloat(lngRaw, 64); err == nil {
				origin = &model.LatLng{Lat: lat, Lng: lng}
			}
		}
	}
	suggestions, source := service.SuggestPlaces(q, origin)
	ok(w, map[string]interface{}{"suggestions": suggestions, "source": source})
}