package httpapi

import (
	"net/http"
	"strconv"

	"anapsi/backend/internal/model"
	"anapsi/backend/internal/service"
	"anapsi/backend/internal/store"
)

func handlePlacesGet(w http.ResponseWriter, r *http.Request) {
	params := r.URL.Query()
	q := params.Get("q")
	latRaw := params.Get("lat")
	lngRaw := params.Get("lng")
	radiusRaw := params.Get("radiusKm")
	profile := params.Get("profile")

	var origin *model.LatLng
	if latRaw != "" && lngRaw != "" {
		lat, err1 := strconv.ParseFloat(latRaw, 64)
		lng, err2 := strconv.ParseFloat(lngRaw, 64)
		if err1 == nil && err2 == nil {
			origin = &model.LatLng{Lat: lat, Lng: lng}
		}
	}
	radius := 3.0
	if radiusRaw != "" {
		if v, err := strconv.ParseFloat(radiusRaw, 64); err == nil {
			radius = v
		}
	}
	places := service.FilteredPlaces(service.PlacesQuery{Q: q, Origin: origin, RadiusKm: radius}, origin)
	summaries := make([]service.PlaceSummary, 0, len(places))
	for _, p := range places {
		if model.IsAccessibilityProfile(profile) {
			summaries = append(summaries, service.ToSummaryWithProfile(p, origin, profile))
		} else {
			summaries = append(summaries, service.ToSummary(p, origin))
		}
	}
	ok(w, map[string]interface{}{"places": summaries, "source": "demo"})
}

func handlePlaceById(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	place := service.FindPlaceLoose(id)
	if place == nil {
		// Tidak pernah berikan 404 untuk halaman tempat: tampilkan halaman
		// "belum dianalisis" yang ramah, tanpa error page.
		ok(w, map[string]interface{}{
			"place":      service.PlaceDetailForUnknown(id),
			"unanalyzed": true,
			"source":     "demo",
		})
		return
	}
	detail := service.PlaceToDetail(place, nil)
	ok(w, map[string]interface{}{"place": detail, "source": "demo"})
}

func handlePlaceAccessibility(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	profile := r.URL.Query().Get("profile")
	if profile != "VISUAL_NAVIGATION" && profile != "WHEELCHAIR_MOBILITY" {
		writeErr(w, validationErr(map[string]string{"profile": "Pilih profil visual atau kursi roda."}))
		return
	}
	place := service.FindPlaceLoose(id)
	if place == nil {
		ok(w, map[string]interface{}{"placeId": id, "profile": profile, "evaluation": nil, "source": "demo"})
		return
	}
	ok(w, map[string]interface{}{
		"placeId":    id,
		"profile":    profile,
		"evaluation": service.PlaceEvaluation(place, profile),
		"source":     "demo",
	})
}

func handlePlaceEntrances(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	place := service.FindPlaceLoose(id)
	if place == nil {
		ok(w, map[string]interface{}{"entrances": []service.EntranceInfo{}, "source": "demo"})
		return
	}
	entrances := make([]service.EntranceInfo, 0, len(place.Entrances))
	for _, e := range place.Entrances {
		entrances = append(entrances, service.FormatEntrance(e))
	}
	ok(w, map[string]interface{}{"entrances": entrances, "source": "demo"})
}

func handleMapFeatures(w http.ResponseWriter, r *http.Request) {
	profile := r.URL.Query().Get("profile")
	if profile != "VISUAL_NAVIGATION" && profile != "WHEELCHAIR_MOBILITY" {
		profile = "VISUAL_NAVIGATION"
	}
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
	features := service.MockFeatures(profile, origin)
	if r.URL.Query().Get("includeReports") == "1" {
		// Merge the live community reports (excluding finished ones) onto the
		// map as markers so "semua data nyata" tampil dari backend.
		reports, _, err := store.ListReports(store.ReportFilters{Limit: 50})
		if err == nil {
			for _, rep := range reports {
				if rep.Status == "RESOLVED" || rep.Status == "REJECTED" {
					continue
				}
				if rep.Latitude == nil || rep.Longitude == nil {
					continue
				}
				tone := "warning"
				if meta, ok := model.REPORT_STATUS_META[rep.Status]; ok {
					tone = meta.Tone
				}
				features = append(features, service.MapFeatureReturn{
					ID:           rep.ID,
					Kind:         "report",
					Status:       rep.Status,
					Symbol:       "📌",
					Label:        "Laporan: " + rep.CategoryLabel,
					StatusLabel:  model.ReportStatusLabel(rep.Status),
					Tone:         tone,
					Lat:          *rep.Latitude,
					Lng:          *rep.Longitude,
					PlaceID:      rep.PlaceID,
					PlaceName:    rep.PlaceName,
					Verification: rep.Verification,
				})
			}
		}
	}
	ok(w, map[string]interface{}{"features": features, "source": "demo", "profile": profile})
}
