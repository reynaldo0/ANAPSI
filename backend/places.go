package main

import (
	"sort"
	"strings"
)

type EntranceInfo struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	Type           string  `json:"type"`
	Steps          int     `json:"steps"`
	HasRamp        bool    `json:"hasRamp"`
	WidthCm        *int    `json:"widthCm"`
	Notes          *string `json:"notes"`
	FormattedSteps string  `json:"formattedSteps"`
	FormattedWidth string  `json:"formattedWidth"`
	Recommended    bool    `json:"recommended"`
}

type PlaceSummary struct {
	ID           string              `json:"id"`
	Name         string              `json:"name"`
	Address      string              `json:"address"`
	City         string              `json:"city"`
	Category     string              `json:"category"`
	Lat          float64             `json:"lat"`
	Lng          float64             `json:"lng"`
	Score        map[string]*int     `json:"score"`
	DistanceLabel string             `json:"distanceLabel,omitempty"`
	DistanceKm   *float64            `json:"distanceKm,omitempty"`
}

type PlaceDetail struct {
	Summary     PlaceSummary     `json:"summary"`
	Description string           `json:"description"`
	Score       map[string]*int  `json:"score"`
	Factors     []AccessFactor   `json:"factors"`
	Entrances   []EntranceInfo   `json:"entrances"`
	Reports     []ReportStub     `json:"reports"`
	Freshness   string           `json:"freshness"`
}

type ReportStub struct {
	ID           string  `json:"id"`
	Title        string  `json:"title"`
	Excerpt      string  `json:"excerpt"`
	Status       string  `json:"status"`
	Verification string  `json:"verification"`
	AuthorName   string  `json:"authorName"`
	CreatedAt    string  `json:"createdAt"`
	Agree        *int    `json:"agree,omitempty"`
	Disagree     *int    `json:"disagree,omitempty"`
}

type MapFeatureReturn struct {
	ID           string  `json:"id"`
	Kind         string  `json:"kind"`
	Status       string  `json:"status"`
	Symbol       string  `json:"symbol"`
	Label        string  `json:"label"`
	StatusLabel  string  `json:"statusLabel"`
	Tone         string  `json:"tone"`
	Lat          float64 `json:"lat"`
	Lng          float64 `json:"lng"`
	PlaceID      *string `json:"placeId,omitempty"`
	PlaceName    *string `json:"placeName,omitempty"`
	Verification string  `json:"verification"`
	StepCount    *int    `json:"stepCount,omitempty"`
}

type placesQuery struct {
	Q         string
	Origin    *LatLng
	RadiusKm  float64
}

var radiusDefault = 3.0

func nodeAddress(p *DemoPlace) string {
	return p.Address
}

func placeAddressLine(p *DemoPlace) string {
	return p.Address + ", " + p.City
}

func formatEntrance(e *DemoEntrance) EntranceInfo {
	formattedSteps := "Tanpa tangga"
	if e.Steps > 0 {
		formattedSteps = formatInt(e.Steps) + " anak tangga"
	}
	formattedWidth := "Belum diukur"
	if e.WidthCm != nil {
		formattedWidth = formatInt(*e.WidthCm) + " cm"
	}
	recommended := e.Steps == 0 || (e.HasRamp && e.Steps <= 2)
	return EntranceInfo{
		ID: e.ID, Name: e.Name, Type: e.Type, Steps: e.Steps, HasRamp: e.HasRamp,
		WidthCm: e.WidthCm, Notes: e.Notes,
		FormattedSteps: formattedSteps, FormattedWidth: formattedWidth, Recommended: recommended,
	}
}

func linkedFeaturesFor(place *DemoPlace) []FeatureEvidence {
	features := demoFeatureData()
	var out []FeatureEvidence
	for _, f := range features {
		if f.PlaceID != nil && *f.PlaceID == place.ID {
			out = append(out, FeatureEvidence{Kind: f.Kind, Status: f.Status, StepCount: f.StepCount, Verification: f.Verification})
		}
	}
	return out
}

func entranceEvidence(place *DemoPlace) []EntranceEvidence {
	var out []EntranceEvidence
	for _, e := range place.Entrances {
		out = append(out, EntranceEvidence{Name: e.Name, Steps: e.Steps, HasRamp: e.HasRamp, WidthCm: e.WidthCm})
	}
	return out
}

func freshnessForPlace(place *DemoPlace) string {
	var dates []string
	for _, r := range demoReportData() {
		if r.PlaceID == place.ID {
			dates = append(dates, r.CreatedAt)
		}
	}
	sort.Strings(dates)
	if len(dates) > 0 {
		return "Diperbarui komunitas " + dates[len(dates)-1] + " (demo)"
	}
	return "Belum ada pembaruan data"
}

func placeScores(place *DemoPlace) map[string]*int {
	evalV := evaluateAccessibility("VISUAL_NAVIGATION", entranceEvidence(place), linkedFeaturesFor(place), freshnessForPlace(place))
	evalM := evaluateAccessibility("WHEELCHAIR_MOBILITY", entranceEvidence(place), linkedFeaturesFor(place), freshnessForPlace(place))
	return map[string]*int{"visual": evalV.Score, "mobility": evalM.Score}
}

func placeEvaluation(place *DemoPlace, profile string) AccessEvaluation {
	return evaluateAccessibility(profile, entranceEvidence(place), linkedFeaturesFor(place), freshnessForPlace(place))
}

func toSummary(place *DemoPlace, origin *LatLng) PlaceSummary {
	dist := distanceFrom(origin, LatLng{Lat: place.Lat, Lng: place.Lng})
	s := PlaceSummary{
		ID: place.ID, Name: place.Name, Address: place.Address, City: place.City,
		Category: place.Category, Lat: place.Lat, Lng: place.Lng, Score: placeScores(place),
	}
	if dist != nil {
		s.DistanceLabel = dist.Label
		s.DistanceKm = &dist.Km
	}
	return s
}

func demoPlacesFiltered(query placesQuery, origin *LatLng) []*DemoPlace {
	q := strings.ToLower(strings.TrimSpace(query.Q))
	radius := query.RadiusKm
	if radius == 0 {
		radius = radiusDefault
	}
	places := demoPlacesData()
	var out []*DemoPlace
	for _, p := range places {
		if q != "" {
			haystack := strings.ToLower(p.Name + " " + p.Address + " " + p.City + " " + p.Category)
			if !strings.Contains(haystack, q) {
				continue
			}
		}
		if origin != nil && haversineKm(*origin, LatLng{Lat: p.Lat, Lng: p.Lng}) > radius {
			continue
		}
		out = append(out, p)
	}
	sort.Slice(out, func(i, j int) bool {
		if origin != nil {
			return haversineKm(*origin, LatLng{Lat: out[i].Lat, Lng: out[i].Lng}) < haversineKm(*origin, LatLng{Lat: out[j].Lat, Lng: out[j].Lng})
		}
		return out[i].Name < out[j].Name
	})
	return out
}

func demoPlaceToDetail(place *DemoPlace, profile *string) PlaceDetail {
	scores := placeScores(place)
	var factors []AccessFactor
	if profile != nil && *profile != "" {
		eval := placeEvaluation(place, *profile)
		factors = eval.Factors
	}
	var entranceInfo []EntranceInfo
	for _, e := range place.Entrances {
		entranceInfo = append(entranceInfo, formatEntrance(e))
	}
	var reports []ReportStub
	for _, r := range demoReportData() {
		if r.PlaceID == place.ID {
			agree := r.Agree
			disagree := r.Disagree
			st := r.Status
			reports = append(reports, ReportStub{
				ID: r.ID, Title: r.Title, Excerpt: r.Excerpt, Status: st,
				Verification: r.Verification, AuthorName: r.AuthorName, CreatedAt: r.CreatedAt,
				Agree: &agree, Disagree: &disagree,
			})
		}
	}
	return PlaceDetail{
		Summary: toSummary(place, nil), Description: place.Description, Score: scores,
		Factors: factors, Entrances: entranceInfo, Reports: reports, Freshness: freshnessForPlace(place),
	}
}

func toFeature(f *DemoFeature) MapFeatureReturn {
	meta := statusMeta(f.Kind, f.Status)
	var place *DemoPlace
	if f.PlaceID != nil {
		for _, p := range demoPlacesData() {
			if p.ID == *f.PlaceID {
				place = p
				break
			}
		}
	}
	label := meta.Label
	if f.StepCount != nil && *f.StepCount > 0 {
		label = meta.Label + " (" + formatInt(*f.StepCount) + " anak tangga)"
	}
	out := MapFeatureReturn{
		ID: f.ID, Kind: f.Kind, Status: f.Status, Symbol: meta.Symbol,
		Label: label, StatusLabel: meta.Label, Tone: meta.Tone,
		Lat: f.Lat, Lng: f.Lng, Verification: f.Verification,
	}
	if f.PlaceID != nil {
		p := *f.PlaceID
		out.PlaceID = &p
	}
	if place != nil {
		n := place.Name
		out.PlaceName = &n
	}
	out.StepCount = f.StepCount
	return out
}

func mockFeatures(profile string, origin *LatLng) []MapFeatureReturn {
	var kinds []string
	if profile == "WHEELCHAIR_MOBILITY" {
		kinds = []string{"ramp", "stairs", "elevator", "path_width", "surface_condition", "accessible_entrance"}
	} else {
		kinds = []string{"guiding_block", "pedestrian_crossing", "audio_crossing_signal", "obstacle", "surface_hazard"}
	}
	type scored struct {
		f *DemoFeature
		d float64
	}
	var candidates []scored
	for _, f := range demoFeatureData() {
		has := false
		for _, k := range kinds {
			if f.Kind == k {
				has = true
				break
			}
		}
		if !has {
			continue
		}
		d := 0.0
		if origin != nil {
			d = haversineKm(*origin, LatLng{Lat: f.Lat, Lng: f.Lng})
		}
		candidates = append(candidates, scored{f: f, d: d})
	}
	sort.Slice(candidates, func(i, j int) bool { return candidates[i].d < candidates[j].d })
	out := make([]MapFeatureReturn, 0, len(candidates))
	for _, c := range candidates {
		out = append(out, toFeature(c.f))
	}
	if out == nil {
		out = []MapFeatureReturn{}
	}
	return out
}