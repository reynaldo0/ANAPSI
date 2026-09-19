package service

import (
	"sort"
	"strings"

	"blindspot/backend/internal/demo"
	"blindspot/backend/internal/model"
)

// EntranceInfo is the API shape of a place entrance.
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

// PlaceSummary is the API shape of a place list entry.
type PlaceSummary struct {
	ID            string          `json:"id"`
	Name          string          `json:"name"`
	Address       string          `json:"address"`
	City          string          `json:"city"`
	Category      string          `json:"category"`
	Lat           float64         `json:"lat"`
	Lng           float64         `json:"lng"`
	Score         map[string]*int `json:"score"`
	ProfileScore  *ProfileScoreInfo `json:"profileScore,omitempty"`
	DistanceLabel string          `json:"distanceLabel,omitempty"`
	DistanceKm    *float64        `json:"distanceKm,omitempty"`
}

// ProfileScoreInfo is the server-computed score for one accessibility profile
// (single source of truth for the per-profile badge on list entries).
type ProfileScoreInfo struct {
	Profile string `json:"profile"`
	Score   *int   `json:"score"`
	Label   string `json:"label"`
}

// PlaceDetail is the full API shape of a place page.
type PlaceDetail struct {
	Summary     PlaceSummary    `json:"summary"`
	Description string          `json:"description"`
	Score       map[string]*int `json:"score"`
	Factors     []AccessFactor  `json:"factors"`
	Entrances   []EntranceInfo  `json:"entrances"`
	Reports     []ReportStub    `json:"reports"`
	Freshness   string          `json:"freshness"`
}

// ReportStub is a place-page report card.
type ReportStub struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Excerpt      string `json:"excerpt"`
	Status       string `json:"status"`
	Verification string `json:"verification"`
	AuthorName   string `json:"authorName"`
	CreatedAt    string `json:"createdAt"`
	Agree        *int   `json:"agree,omitempty"`
	Disagree     *int   `json:"disagree,omitempty"`
}

// MapFeatureReturn is a map marker.
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

// PlacesQuery narrows the places list request.
type PlacesQuery struct {
	Q        string
	Origin   *model.LatLng
	RadiusKm float64
}

var radiusDefault = 3.0

// FormatEntrance converts a demo entrance into its API shape.
func FormatEntrance(e *demo.Entrance) EntranceInfo {
	formattedSteps := "Tanpa tangga"
	if e.Steps > 0 {
		formattedSteps = model.FormatInt(e.Steps) + " anak tangga"
	}
	formattedWidth := "Belum diukur"
	if e.WidthCm != nil {
		formattedWidth = model.FormatInt(*e.WidthCm) + " cm"
	}
	recommended := e.Steps == 0 || (e.HasRamp && e.Steps <= 2)
	return EntranceInfo{
		ID: e.ID, Name: e.Name, Type: e.Type, Steps: e.Steps, HasRamp: e.HasRamp,
		WidthCm: e.WidthCm, Notes: e.Notes,
		FormattedSteps: formattedSteps, FormattedWidth: formattedWidth, Recommended: recommended,
	}
}

func linkedFeaturesFor(place *demo.Place) []FeatureEvidence {
	features := demo.Features()
	var out []FeatureEvidence
	for _, f := range features {
		if f.PlaceID != nil && *f.PlaceID == place.ID {
			out = append(out, FeatureEvidence{Kind: f.Kind, Status: f.Status, StepCount: f.StepCount, Verification: f.Verification})
		}
	}
	return out
}

func entranceEvidence(place *demo.Place) []EntranceEvidence {
	var out []EntranceEvidence
	for _, e := range place.Entrances {
		out = append(out, EntranceEvidence{Name: e.Name, Steps: e.Steps, HasRamp: e.HasRamp, WidthCm: e.WidthCm})
	}
	return out
}

func freshnessForPlace(place *demo.Place) string {
	var dates []string
	for _, r := range demo.Reports() {
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

func placeScores(place *demo.Place) map[string]*int {
	evalV := EvaluateAccessibility("VISUAL_NAVIGATION", entranceEvidence(place), linkedFeaturesFor(place), freshnessForPlace(place))
	evalM := EvaluateAccessibility("WHEELCHAIR_MOBILITY", entranceEvidence(place), linkedFeaturesFor(place), freshnessForPlace(place))
	return map[string]*int{"visual": evalV.Score, "mobility": evalM.Score}
}

// PlaceEvaluation scores a place for a specific profile.
func PlaceEvaluation(place *demo.Place, profile string) AccessEvaluation {
	return EvaluateAccessibility(profile, entranceEvidence(place), linkedFeaturesFor(place), freshnessForPlace(place))
}

// ToSummary converts a demo place into a list-entry summary.
func ToSummary(place *demo.Place, origin *model.LatLng) PlaceSummary {
	dist := model.DistanceFrom(origin, model.LatLng{Lat: place.Lat, Lng: place.Lng})
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

// ScoreLabel maps a 0–100 accessibility score to its display label.
func ScoreLabel(score *int) string {
	if score == nil {
		return "Belum dinilai"
	}
	switch {
	case *score >= 80:
		return "Sangat Aksesibel"
	case *score >= 60:
		return "Aksesibel Sebagian"
	case *score >= 40:
		return "Aksesibilitas Terbatas"
	default:
		return "Hambatan Signifikan"
	}
}

// ToSummaryWithProfile summarizes a place and appends the per-profile score so
// clients render the profile badge without re-implementing scoring.
func ToSummaryWithProfile(place *demo.Place, origin *model.LatLng, profile string) PlaceSummary {
	s := ToSummary(place, origin)
	if model.IsAccessibilityProfile(profile) {
		var sc *int
		if profile == "WHEELCHAIR_MOBILITY" {
			sc = s.Score["mobility"]
		} else {
			sc = s.Score["visual"]
		}
		s.ProfileScore = &ProfileScoreInfo{Profile: profile, Score: sc, Label: ScoreLabel(sc)}
	}
	return s
}

// FilteredPlaces filters and sorts the demo catalog by query/radius.
func FilteredPlaces(query PlacesQuery, origin *model.LatLng) []*demo.Place {
	q := strings.ToLower(strings.TrimSpace(query.Q))
	radius := query.RadiusKm
	if radius == 0 {
		radius = radiusDefault
	}
	places := demo.Places()
	var out []*demo.Place
	for _, p := range places {
		if q != "" {
			haystack := strings.ToLower(p.Name + " " + p.Address + " " + p.City + " " + p.Category)
			if !strings.Contains(haystack, q) {
				continue
			}
		}
		if origin != nil && model.HaversineKm(*origin, model.LatLng{Lat: p.Lat, Lng: p.Lng}) > radius {
			continue
		}
		out = append(out, p)
	}
	sort.Slice(out, func(i, j int) bool {
		if origin != nil {
			return model.HaversineKm(*origin, model.LatLng{Lat: out[i].Lat, Lng: out[i].Lng}) < model.HaversineKm(*origin, model.LatLng{Lat: out[j].Lat, Lng: out[j].Lng})
		}
		return out[i].Name < out[j].Name
	})
	return out
}

// PlaceToDetail assembles a full place page.
func PlaceToDetail(place *demo.Place, profile *string) PlaceDetail {
	scores := placeScores(place)
	var factors []AccessFactor
	if profile != nil && *profile != "" {
		eval := PlaceEvaluation(place, *profile)
		factors = eval.Factors
	}
	var entranceInfo []EntranceInfo
	for _, e := range place.Entrances {
		entranceInfo = append(entranceInfo, FormatEntrance(e))
	}
	var reports []ReportStub
	for _, r := range demo.Reports() {
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
		Summary: ToSummary(place, nil), Description: place.Description, Score: scores,
		Factors: factors, Entrances: entranceInfo, Reports: reports, Freshness: freshnessForPlace(place),
	}
}

// ToFeature converts a demo feature into a map marker.
func ToFeature(f *demo.Feature) MapFeatureReturn {
	meta := model.StatusMeta(f.Kind, f.Status)
	var place *demo.Place
	if f.PlaceID != nil {
		for _, p := range demo.Places() {
			if p.ID == *f.PlaceID {
				place = p
				break
			}
		}
	}
	label := meta.Label
	if f.StepCount != nil && *f.StepCount > 0 {
		label = meta.Label + " (" + model.FormatInt(*f.StepCount) + " anak tangga)"
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

// MockFeatures returns the nearest features for a profile, sorted by distance
// from an optional origin.
func MockFeatures(profile string, origin *model.LatLng) []MapFeatureReturn {
	var kinds []string
	if profile == "WHEELCHAIR_MOBILITY" {
		kinds = []string{"ramp", "stairs", "elevator", "path_width", "surface_condition", "accessible_entrance"}
	} else {
		kinds = []string{"guiding_block", "pedestrian_crossing", "audio_crossing_signal", "obstacle", "surface_hazard"}
	}
	type scored struct {
		f *demo.Feature
		d float64
	}
	var candidates []scored
	for _, f := range demo.Features() {
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
			d = model.HaversineKm(*origin, model.LatLng{Lat: f.Lat, Lng: f.Lng})
		}
		candidates = append(candidates, scored{f: f, d: d})
	}
	sort.Slice(candidates, func(i, j int) bool { return candidates[i].d < candidates[j].d })
	out := make([]MapFeatureReturn, 0, len(candidates))
	for _, c := range candidates {
		out = append(out, ToFeature(c.f))
	}
	if out == nil {
		out = []MapFeatureReturn{}
	}
	return out
}
