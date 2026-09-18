package httpapi

import (
	"math"
	"net/http"

	"blindspot/backend/internal/config"
	"blindspot/backend/internal/demo"
	"blindspot/backend/internal/errs"
	"blindspot/backend/internal/model"
	"blindspot/backend/internal/ratelimit"
	"blindspot/backend/internal/service"
	"blindspot/backend/internal/util"
)

func isProfile(value interface{}) bool {
	return model.IsAccessibilityProfile(util.AsString(value))
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
	return !math.IsNaN(lat) && !math.IsNaN(lng) &&
		math.Abs(lat) <= 90 && math.Abs(lng) <= 180
}

func handleRoutesPost(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	ip := clientIPHeader(r)
	if allowed, retry := ratelimit.Check(ratelimit.Key(ip, "routes"), 20, 60000); !allowed {
		writeErr(w, errs.Fail("Terlalu banyak permintaan rute. Coba lagi nanti.", "RATE_LIMITED", 429))
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
		writeErr(w, errs.Fail("Profil aksesibilitas tidak valid.", "VALIDATION_ERROR", 422))
		return
	}
	if !isLatLngValue(body.Origin) {
		writeErr(w, errs.Fail("Lokasi asal tidak valid.", "VALIDATION_ERROR", 422))
		return
	}
	destinationID := util.AsString(body.DestinationID)
	if destinationID == "" {
		writeErr(w, errs.Fail("Tujuan tidak valid.", "VALIDATION_ERROR", 422))
		return
	}
	destination := demo.FindPlace(destinationID)
	if destination == nil {
		writeErr(w, errs.Fail("Rute belum dapat dibuat untuk lokasi ini. Silakan coba lokasi lain.", "NOT_FOUND", 404))
		return
	}
	originName := "Lokasiku"
	if s := util.AsString(body.OriginName); s != "" {
		originName = s
	}
	obj := body.Origin.(map[string]interface{})
	origin := model.LatLng{Lat: obj["lat"].(float64), Lng: obj["lng"].(float64)}
	profile := util.AsString(body.Profile)

	street := service.PlanStreetRoutes(origin, originName, destination, profile)
	if street.Real && len(street.Routes) > 0 {
		ok(w, map[string]interface{}{"routes": street.Routes, "source": street.Source, "real": true})
		return
	}
	routes, source := service.PlanRoutes(origin, originName, destination, profile)
	ok(w, map[string]interface{}{"routes": routes, "source": source, "real": false})
}
