package main

import (
	"math"
	"net/http"
)

func isProfile(value interface{}) bool {
	s, ok := value.(string)
	return ok && (s == "VISUAL_NAVIGATION" || s == "WHEELCHAIR_MOBILITY")
}

func isLatLngValue(value interface{}) bool {
	obj, ok := value.(map[string]interface{})
	if !ok {
		return false
	}
	lat, ok1 := obj["lat"].(float64)
	lng, ok2 := obj["lng"].(float64)
	if !ok1 || !ok2 {
		return false
	}
	return math.IsNaN(lat) == false && math.IsNaN(lng) == false &&
		math.Abs(lat) <= 90 && math.Abs(lng) <= 180
}

func handleRoutesPost(w http.ResponseWriter, r *http.Request, cfg *Config) {
	ip := clientIPHeader(r)
	if allowed, retry := checkRateLimit(rateLimitKey(ip, "routes"), 20, 60000); !allowed {
		writeErr(w, fail("Terlalu banyak permintaan rute. Coba lagi nanti.", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	body := struct {
		Origin        interface{} `json:"origin"`
		OriginName    interface{} `json:"originName"`
		DestinationID interface{} `json:"destinationId"`
		Profile       interface{} `json:"profile"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	if !isProfile(body.Profile) {
		writeErr(w, fail("Profil aksesibilitas tidak valid.", "VALIDATION_ERROR", 422))
		return
	}
	if !isLatLngValue(body.Origin) {
		writeErr(w, fail("Lokasi asal tidak valid.", "VALIDATION_ERROR", 422))
		return
	}
	destinationID := asString(body.DestinationID)
	if destinationID == "" {
		writeErr(w, fail("Tujuan tidak valid.", "VALIDATION_ERROR", 422))
		return
	}
	destination := findDemoPlace(destinationID)
	if destination == nil {
		writeErr(w, fail("Rute belum dapat dibuat untuk lokasi ini. Silakan coba lokasi lain.", "NOT_FOUND", 404))
		return
	}
	originName := "Lokasiku"
	if s := asString(body.OriginName); s != "" {
		originName = s
	}
	obj := body.Origin.(map[string]interface{})
	origin := LatLng{Lat: obj["lat"].(float64), Lng: obj["lng"].(float64)}
	profile := body.Profile.(string)

	street := planStreetRoutes(origin, originName, destination, profile)
	if street.real && len(street.routes) > 0 {
		ok(w, map[string]interface{}{"routes": street.routes, "source": street.source, "real": true})
		return
	}
	routes, source := planRoutes(origin, originName, destination, profile)
	ok(w, map[string]interface{}{"routes": routes, "source": source, "real": false})
}