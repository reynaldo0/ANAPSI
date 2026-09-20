package service

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"anapsi/backend/internal/demo"
	"anapsi/backend/internal/model"
)

// GeoSuggestion is a search-suggestion entry returned by /api/geo/suggest.
type GeoSuggestion struct {
	ID       string        `json:"id"`
	Name     string        `json:"name"`
	Subtitle string        `json:"subtitle"`
	Lat      float64       `json:"lat"`
	Lng      float64       `json:"lng"`
	Kind     string        `json:"kind"`
	Icon     string        `json:"icon"`
	Place    *PlaceSummary `json:"place,omitempty"`
}

type nominatimAddress struct {
	Amenity  string `json:"amenity"`
	Shop     string `json:"shop"`
	Tourism  string `json:"tourism"`
	Leisure  string `json:"leisure"`
	Railway  string `json:"railway"`
	Highway  string `json:"highway"`
	Road     string `json:"road"`
	City     string `json:"city"`
	Town     string `json:"town"`
	Village  string `json:"village"`
	State    string `json:"state"`
	Country  string `json:"country"`
}

type nominatimResult struct {
	OSMID       int              `json:"osm_id"`
	OSMType     string           `json:"osm_type"`
	Lat         string           `json:"lat"`
	Lon         string           `json:"lon"`
	DisplayName string           `json:"display_name"`
	Category    string           `json:"category"`
	Type        string           `json:"type"`
	Address     nominatimAddress `json:"address"`
}

var suggestFocusCenter = model.LatLng{Lat: -6.196, Lng: 106.879}

const suggestFocusRadiusKm = 3.5
const defaultSuggestViewbox = "106.79,-6.34,106.99,-6.10"
const analyzedNearMaxKm = 1.2

func isOutsideSuggestFocus(origin model.LatLng) bool {
	return model.HaversineKm(origin, suggestFocusCenter) > suggestFocusRadiusKm
}

func suggestKindFromRemote(category, typ string) string {
	if category == "highway" || typ == "road" || typ == "residential" {
		return "street"
	}
	if category == "place" {
		return "city"
	}
	if category == "building" {
		return "poi"
	}
	return "poi"
}

func suggestIcon(kind, category string) string {
	if category != "" && strings.Contains("|amenity|shop|tourism|leisure|office|", "|"+category+"|") {
		return "📍"
	}
	switch kind {
	case "street":
		return "🛣️"
	case "city":
		return "🏙️"
	case "area":
		return "🗺️"
	}
	return "📍"
}

func suggestSubtitle(r nominatimResult) string {
	a := r.Address
	bits := []string{}
	for _, v := range []string{a.Amenity, a.Shop, a.Tourism, a.Leisure, a.Railway, a.Highway, a.Road} {
		if v != "" {
			bits = append(bits, v)
			break
		}
	}
	for _, v := range []string{a.City, a.Town, a.Village} {
		if v != "" {
			bits = append(bits, v)
			break
		}
	}
	if a.State != "" {
		bits = append(bits, a.State)
	}
	if a.Country != "" {
		bits = append(bits, a.Country)
	}
	if len(bits) > 0 {
		return strings.Join(bits, ", ")
	}
	parts := strings.Split(r.DisplayName, ",")
	if len(parts) > 1 {
		return strings.TrimSpace(strings.Join(parts[1:], ","))
	}
	return ""
}

func suggestName(r nominatimResult) string {
	a := r.Address
	for _, v := range []string{a.Amenity, a.Shop, a.Tourism, a.Leisure, a.Railway, a.Highway, a.Road} {
		if v != "" {
			return v
		}
	}
	first := strings.TrimSpace(strings.Split(r.DisplayName, ",")[0])
	if first != "" {
		return first
	}
	return r.DisplayName
}

// AnalyzedPlaceNear returns a summary of the nearest analyzed demo place within
// maxKm (skor aksesibilitas dari tempat terdekat yang sudah dianalisis).
func AnalyzedPlaceNear(lat, lng, maxKm float64) *PlaceSummary {
	if maxKm == 0 {
		maxKm = analyzedNearMaxKm
	}
	var best *demo.Place
	var bestD float64
	for _, p := range demo.Places() {
		d := model.HaversineKm(model.LatLng{Lat: lat, Lng: lng}, model.LatLng{Lat: p.Lat, Lng: p.Lng})
		if d <= maxKm && (best == nil || d < bestD) {
			best = p
			bestD = d
		}
	}
	if best == nil {
		return nil
	}
	s := ToSummary(best, nil)
	return &s
}

func scoreSuffix(place *PlaceSummary) string {
	if place == nil {
		return ""
	}
	var value *int
	for _, key := range []string{"visual", "mobility"} {
		if v, ok := place.Score[key]; ok && v != nil {
			value = v
			break
		}
	}
	if value == nil {
		return ""
	}
	return "Skor " + model.FormatInt(*value)
}

func suggestionSubtitle(s PlaceSummary) string {
	bits := []string{}
	for _, v := range []string{s.Category, s.Address, s.DistanceLabel} {
		if v != "" {
			bits = append(bits, v)
		}
	}
	if suffix := scoreSuffix(&s); suffix != "" {
		bits = append(bits, suffix)
	}
	return strings.Join(bits, " · ")
}

func fetchRemoteSuggestions(q string, origin *model.LatLng) []GeoSuggestion {
	params := url.Values{}
	params.Set("q", q)
	params.Set("format", "jsonv2")
	params.Set("limit", "8")
	params.Set("addressdetails", "1")
	params.Set("accept-language", "id")
	params.Set("countrycodes", "id")
	params.Set("bounded", "1")
	if origin != nil && !isOutsideSuggestFocus(*origin) {
		params.Set("viewbox", fmt.Sprintf("%.5f,%.5f,%.5f,%.5f", origin.Lng-0.1, origin.Lat+0.1, origin.Lng+0.1, origin.Lat-0.1))
	} else {
		params.Set("viewbox", defaultSuggestViewbox)
	}

	req, err := http.NewRequest("GET", "https://nominatim.openstreetmap.org/search?"+params.Encode(), nil)
	if err != nil {
		return nil
	}
	req.Header.Set("User-Agent", "anapsi-web/1.0 (accessibility navigation demo)")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 4500 * time.Millisecond}
	resp, err := client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil
	}
	var results []nominatimResult
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		return nil
	}

	out := []GeoSuggestion{}
	for _, r := range results {
		if r.Lat == "" || r.Lon == "" {
			continue
		}
		lat, err1 := strconv.ParseFloat(r.Lat, 64)
		lng, err2 := strconv.ParseFloat(r.Lon, 64)
		if err1 != nil || err2 != nil {
			continue
		}
		kind := suggestKindFromRemote(r.Category, r.Type)
		out = append(out, GeoSuggestion{
			ID:       fmt.Sprintf("geo-%s-%d", r.OSMType, r.OSMID),
			Name:     suggestName(r),
			Subtitle: suggestSubtitle(r),
			Lat:      lat,
			Lng:      lng,
			Kind:     kind,
			Icon:     suggestIcon(kind, r.Category),
		})
	}
	return out
}

// SuggestPlaces returns geocoding suggestions (demo catalog + Nominatim). Empty
// query produces nearby recommendations; otherwise local + remote merge.
func SuggestPlaces(q string, origin *model.LatLng) ([]GeoSuggestion, string) {
	q = strings.TrimSpace(q)

	// Rekomendasi di sekitar saat kolom kosong (mirip "rekomendasi" Google Maps).
	if q == "" {
		places := FilteredPlaces(PlacesQuery{Q: "", Origin: origin, RadiusKm: 3}, origin)
		suggestions := []GeoSuggestion{}
		for _, p := range places {
			if len(suggestions) >= 6 {
				break
			}
			s := ToSummary(p, origin)
			suggestions = append(suggestions, GeoSuggestion{
				ID:       "place-" + p.ID,
				Name:     p.Name,
				Subtitle: suggestionSubtitle(s),
				Lat:      s.Lat,
				Lng:      s.Lng,
				Kind:     "place",
				Icon:     "📍",
				Place:    &s,
			})
		}
		return suggestions, "recommendations"
	}

	// Cari simultan: data lokal ANAPSI + geocode global (jalan/kota/dll).
	var remote []GeoSuggestion
	if len(q) >= 2 {
		remote = fetchRemoteSuggestions(q, origin)
	}
	local := FilteredPlaces(PlacesQuery{Q: q, Origin: origin, RadiusKm: 10}, origin)

	seen := map[string]bool{}
	suggestions := []GeoSuggestion{}
	for _, p := range local {
		if len(suggestions) >= 5 {
			break
		}
		key := strings.ToLower(p.Name)
		if seen[key] {
			continue
		}
		seen[key] = true
		s := ToSummary(p, origin)
		suggestions = append(suggestions, GeoSuggestion{
			ID:       "place-" + p.ID,
			Name:     p.Name,
			Subtitle: suggestionSubtitle(s),
			Lat:      s.Lat,
			Lng:      s.Lng,
			Kind:     "place",
			Icon:     "📍",
			Place:    &s,
		})
	}
	for _, s := range remote {
		key := strings.ToLower(s.Name)
		if seen[key] {
			continue
		}
		seen[key] = true
		analyzed := AnalyzedPlaceNear(s.Lat, s.Lng, analyzedNearMaxKm)
		parts := []string{}
		if s.Subtitle != "" {
			parts = append(parts, s.Subtitle)
		}
		if suffix := scoreSuffix(analyzed); suffix != "" {
			parts = append(parts, suffix)
		}
		merged := s
		merged.Subtitle = strings.Join(parts, " · ")
		if analyzed != nil {
			merged.Place = analyzed
		}
		suggestions = append(suggestions, merged)
	}
	return suggestions, "suggestions"
}