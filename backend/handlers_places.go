package main

import (
	"net/http"
	"strconv"
)

func handlePlacesGet(w http.ResponseWriter, r *http.Request) {
	params := r.URL.Query()
	q := params.Get("q")
	latRaw := params.Get("lat")
	lngRaw := params.Get("lng")
	radiusRaw := params.Get("radiusKm")

	var origin *LatLng
	if latRaw != "" && lngRaw != "" {
		lat, err1 := strconv.ParseFloat(latRaw, 64)
		lng, err2 := strconv.ParseFloat(lngRaw, 64)
		if err1 == nil && err2 == nil {
			origin = &LatLng{Lat: lat, Lng: lng}
		}
	}
	radius := 3.0
	if radiusRaw != "" {
		if v, err := strconv.ParseFloat(radiusRaw, 64); err == nil {
			radius = v
		}
	}
	places := demoPlacesFiltered(placesQuery{Q: q, Origin: origin, RadiusKm: radius}, origin)
	summaries := make([]PlaceSummary, 0, len(places))
	for _, p := range places {
		summaries = append(summaries, toSummary(p, origin))
	}
	ok(w, map[string]interface{}{"places": summaries, "source": "demo"})
}

func handlePlaceById(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	place := findDemoPlace(id)
	if place == nil {
		writeErr(w, notFound("Tempat tidak ditemukan."))
		return
	}
	detail := demoPlaceToDetail(place, nil)
	ok(w, map[string]interface{}{"place": detail, "source": "demo"})
}

func handlePlaceAccessibility(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	profile := r.URL.Query().Get("profile")
	if profile != "VISUAL_NAVIGATION" && profile != "WHEELCHAIR_MOBILITY" {
		writeErr(w, validationErr(map[string]string{"profile": "Pilih profil visual atau kursi roda."}))
		return
	}
	place := findDemoPlace(id)
	if place == nil {
		writeErr(w, notFound("Tempat tidak ditemukan."))
		return
	}
	ok(w, map[string]interface{}{
		"placeId":    id,
		"profile":    profile,
		"evaluation": placeEvaluation(place, profile),
		"source":     "demo",
	})
}

func handlePlaceEntrances(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	place := findDemoPlace(id)
	if place == nil {
		writeErr(w, notFound("Tempat tidak ditemukan."))
		return
	}
	entrances := make([]EntranceInfo, 0, len(place.Entrances))
	for _, e := range place.Entrances {
		entrances = append(entrances, formatEntrance(e))
	}
	ok(w, map[string]interface{}{"entrances": entrances, "source": "demo"})
}

func handleMapFeatures(w http.ResponseWriter, r *http.Request) {
	profile := r.URL.Query().Get("profile")
	if profile != "VISUAL_NAVIGATION" && profile != "WHEELCHAIR_MOBILITY" {
		profile = "VISUAL_NAVIGATION"
	}
	var origin *LatLng
	latRaw := r.URL.Query().Get("lat")
	lngRaw := r.URL.Query().Get("lng")
	if latRaw != "" && lngRaw != "" {
		if lat, err := strconv.ParseFloat(latRaw, 64); err == nil {
			if lng, err := strconv.ParseFloat(lngRaw, 64); err == nil {
				origin = &LatLng{Lat: lat, Lng: lng}
			}
		}
	}
	features := mockFeatures(profile, origin)
	ok(w, map[string]interface{}{"features": features, "source": "demo", "profile": profile})
}