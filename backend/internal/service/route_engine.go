package service

import (
	"encoding/json"
	"io"
	"math"
	"net/http"
	"strconv"
	"time"

	"anapsi/backend/internal/demo"
	"anapsi/backend/internal/model"
)

const corridorRadiusM = 120.0
const legLengthM = 80.0
const detourOffsetM = 70.0
const osrmBase = "https://router.project-osrm.org/route/v1/foot"
const osrmQuery = "overview=full&geometries=geojson&alternatives=true&continue_straight=false"
const osrmTimeoutMs = 8 * time.Second
const stepStepM = 55.0
const hitStepM = 30.0

var speedKmph = map[string]float64{
	"WHEELCHAIR_MOBILITY": 4.5,
	"VISUAL_NAVIGATION":   5,
}

func metersBetween(a, b model.LatLng) float64 {
	return model.HaversineKm(a, b) * 1000
}

func projectOnSegment(p, a, b model.LatLng) (nearest, along float64) {
	abx := b.Lng - a.Lng
	aby := b.Lat - a.Lat
	apsx := p.Lng - a.Lng
	apsy := p.Lat - a.Lat
	denom := abx*abx + aby*aby
	t := 0.0
	if denom > 0 {
		t = (apsx*abx + apsy*aby) / denom
	}
	if t < 0 {
		t = 0
	}
	if t > 1 {
		t = 1
	}
	proj := model.LatLng{Lng: a.Lng + t*abx, Lat: a.Lat + t*aby}
	return metersBetween(p, proj), t * metersBetween(a, b)
}

func subdivide(a, b model.LatLng, maxLegM float64) []model.LatLng {
	total := metersBetween(a, b)
	count := int(total / maxLegM)
	if count < 1 {
		count = 1
	}
	points := make([]model.LatLng, 0, count+1)
	for i := 0; i < count; i++ {
		t := float64(i) / float64(count)
		points = append(points, model.LatLng{Lat: a.Lat + (b.Lat-a.Lat)*t, Lng: a.Lng + (b.Lng-a.Lng)*t})
	}
	points = append(points, b)
	return points
}

type corridorHit struct {
	feature       *demo.Feature
	alongMeters   float64
	nearestMeters float64
}

type routeLike struct {
	points []model.LatLng
	hits   []corridorHit
}

// Stroke is a highlighted accessibility segment along a route.
type Stroke struct {
	Kind           string
	Status         string
	DistanceMeters int
	Verification   string
}

func corridorHits(points []model.LatLng, kinds []string) []corridorHit {
	kindsSet := map[string]bool{}
	for _, k := range kinds {
		kindsSet[k] = true
	}
	var hits []corridorHit
	var lengths []float64
	cum := 0.0
	for i := 0; i < len(points)-1; i++ {
		lenStep := metersBetween(points[i], points[i+1])
		lengths = append(lengths, lenStep)
		cum += lenStep
	}
	total := cum
	for _, feature := range demo.Features() {
		if !kindsSet[feature.Kind] {
			continue
		}
		var best = -1.0
		var bestAlong = 0.0
		cumLeg := 0.0
		for i := 0; i < len(points)-1; i++ {
			nearest, along := projectOnSegment(model.LatLng{Lat: feature.Lat, Lng: feature.Lng}, points[i], points[i+1])
			candidate := cumLeg + along
			if best < 0 || nearest < best {
				best = nearest
				bestAlong = candidate
			}
			cumLeg += lengths[i]
		}
		if best >= 0 && best <= corridorRadiusM && bestAlong >= -40 && bestAlong <= total+80 {
			hits = append(hits, corridorHit{feature: feature, alongMeters: bestAlong, nearestMeters: best})
		}
	}
	return hits
}

func sumPath(points []model.LatLng) float64 {
	total := 0.0
	for i := 0; i < len(points)-1; i++ {
		total += metersBetween(points[i], points[i+1])
	}
	return total
}

func destPointAt(a, b model.LatLng, t float64) model.LatLng {
	return model.LatLng{Lat: a.Lat + (b.Lat-a.Lat)*t, Lng: a.Lng + (b.Lng-a.Lng)*t}
}

// safeFraction returns t = x/total tanpa menghasilkan NaN/+Inf saat total ≈ 0.
func safeFraction(x, total float64) float64 {
	if total <= 0 || math.IsNaN(x) || math.IsInf(x, 0) {
		return 0.5
	}
	t := x / total
	if t < 0 || math.IsNaN(t) {
		return 0
	}
	if t > 1 {
		return 1
	}
	return t
}

var sideSign = 1

func currentSide() int {
	sideSign = -sideSign
	return sideSign
}

func perpendicularOffsetFastest(a, b, at model.LatLng, offsetMeters float64) model.LatLng {
	dx := b.Lng - a.Lng
	dy := b.Lat - a.Lat
	lenD := dx*dx + dy*dy
	if lenD == 0 {
		lenD = 1
	}
	lenD = sqrt000(lenD)
	ux := -dy / lenD
	uy := dx / lenD
	degLng := offsetMeters / 111320
	degLat := offsetMeters / 110574
	side := float64(currentSide())
	return model.LatLng{
		Lng: at.Lng + ux*degLng*side,
		Lat: at.Lat + uy*degLat*side,
	}
}

func sqrt000(v float64) float64 {
	if v <= 0 {
		return 0
	}
	x := v
	for i := 0; i < 32; i++ {
		x = (x + v/x) / 2
	}
	return x
}

// RouteBarrierInfo is a reported barrier on a route.
type RouteBarrierInfo struct {
	ID             string `json:"id"`
	Kind           string `json:"kind"`
	Label          string `json:"label"`
	Symbol         string `json:"symbol"`
	Tone           string `json:"tone"`
	DistanceMeters int    `json:"distanceMeters"`
	Verification   string `json:"verification"`
}

// RouteFacilityInfo is an accessibility facility on a route.
type RouteFacilityInfo struct {
	ID             string `json:"id"`
	Kind           string `json:"kind"`
	Label          string `json:"label"`
	Symbol         string `json:"symbol"`
	Tone           string `json:"tone"`
	DistanceMeters int    `json:"distanceMeters"`
}

// RouteStepInfo is one turn-by-turn route instruction.
type RouteStepInfo struct {
	ID             string  `json:"id"`
	Instruction    string  `json:"instruction"`
	DistanceMeters int     `json:"distanceMeters"`
	BarrierLabel   *string `json:"barrierLabel"`
	FacilityLabel  *string `json:"facilityLabel"`
	IsArrival      *bool   `json:"isArrival,omitempty"`
}

// RouteOption is one route alternative offered to the client.
type RouteOption struct {
	ID                 string              `json:"id"`
	FromName           string              `json:"fromName"`
	ToName             string              `json:"toName"`
	DestinationID      string              `json:"destinationId"`
	Label              string              `json:"label"`
	Recommended        bool                `json:"recommended"`
	DistanceKm         float64             `json:"distanceKm"`
	DistanceLabel      string              `json:"distanceLabel"`
	DurationMinutes    int                 `json:"durationMinutes"`
	DurationLabel      string              `json:"durationLabel"`
	AccessibilityScore *int                `json:"accessibilityScore"`
	ScoreLabel         string              `json:"scoreLabel"`
	Reasoning          []string            `json:"reasoning"`
	Warnings           []string            `json:"warnings"`
	Barriers           []RouteBarrierInfo  `json:"barriers"`
	Facilities         []RouteFacilityInfo `json:"facilities"`
	Geometry           []model.LatLng      `json:"geometry"`
	Steps              []RouteStepInfo     `json:"steps"`
	HonestNote         *string             `json:"honestNote"`
}

func evaluateRoute(
	route routeLike,
	destination *demo.Place,
	profile string,
	pathPivots []model.LatLng,
) (score *int, strokes []Stroke, facilitiesOf []RouteFacilityInfo, barriersOf []RouteBarrierInfo) {
	delta := 0.0
	hitCount := 0
	strokeMap := map[string]Stroke{}
	distanceM := sumPath(pathPivots)

	for _, hit := range route.hits {
		meta := model.StatusMeta(hit.feature.Kind, hit.feature.Status)
		if meta.Label == "Tidak diketahui" {
			continue
		}
		key := hit.feature.Kind + ":" + hit.feature.Status + ":" + strconv.Itoa(int(hit.alongMeters/40))
		if _, ok := strokeMap[key]; ok {
			continue
		}
		strokeMap[key] = Stroke{
			Kind:           hit.feature.Kind,
			Status:         hit.feature.Status,
			DistanceMeters: max(10, int(hit.alongMeters+0.5)),
			Verification:   hit.feature.Verification,
		}
		switch meta.Tone {
		case "danger":
			delta -= 2.2
		case "warning":
			delta -= 1.1
		case "success":
			delta += 1.3
		default:
			delta += 0
		}
		hitCount++
	}

	var recommendedEntrance *demo.Entrance
	for _, e := range destination.Entrances {
		if e.HasRamp || e.Type == "MAIN" {
			recommendedEntrance = e
			break
		}
	}
	if recommendedEntrance == nil && len(destination.Entrances) > 0 {
		recommendedEntrance = destination.Entrances[0]
	}
	if recommendedEntrance != nil {
		if recommendedEntrance.HasRamp {
			delta += 0.8
		}
		if recommendedEntrance.Steps > 0 && !recommendedEntrance.HasRamp {
			delta -= 1
		}
	}

	if hitCount > 0 || recommendedEntrance != nil {
		s := int(math000(50 + delta))
		if s < 0 {
			s = 0
		}
		if s > 100 {
			s = 100
		}
		score = &s
	} else {
		score = nil
	}

	for _, s := range strokeMap {
		strokes = append(strokes, s)
	}
	// deterministic order (map iteration is unstable in Go)
	for i := range strokes {
		for j := i + 1; j < len(strokes); j++ {
			if strokes[j].DistanceMeters < strokes[i].DistanceMeters {
				strokes[i], strokes[j] = strokes[j], strokes[i]
			}
		}
	}

	_ = profile
	for _, strokeItem := range strokes {
		if strokeItem.Kind == "accessible_entrance" && float64(strokeItem.DistanceMeters) > distanceM*0.85 {
			continue
		}
		meta := model.StatusMeta(strokeItem.Kind, strokeItem.Status)
		if meta.Tone == "success" {
			facilitiesOf = append(facilitiesOf, RouteFacilityInfo{
				ID:             strokeItem.Kind + "-" + strokeItem.Status + "-" + strconv.Itoa(strokeItem.DistanceMeters),
				Kind:           strokeItem.Kind,
				Label:          model.LAYERS[strokeItem.Kind].Label + ": " + meta.Label,
				Symbol:         meta.Symbol,
				Tone:           "success",
				DistanceMeters: strokeItem.DistanceMeters,
			})
		} else if meta.Tone != "neutral" {
			tone := "warning"
			if meta.Tone == "danger" {
				tone = "danger"
			}
			barriersOf = append(barriersOf, RouteBarrierInfo{
				ID:             strokeItem.Kind + "-" + strokeItem.Status + "-" + strconv.Itoa(strokeItem.DistanceMeters),
				Kind:           strokeItem.Kind,
				Label:          model.LAYERS[strokeItem.Kind].Label + ": " + meta.Label,
				Symbol:         meta.Symbol,
				Tone:           tone,
				DistanceMeters: strokeItem.DistanceMeters,
				Verification:   strokeItem.Verification,
			})
		}
	}

	if recommendedEntrance != nil && len(destination.Entrances) > 0 {
		symbol := "⚠"
		tone := "warning"
		if recommendedEntrance.HasRamp {
			symbol = "↘"
			tone = "success"
		}
		facilitiesOf = append(facilitiesOf, RouteFacilityInfo{
			ID:             "entrance-" + recommendedEntrance.ID,
			Kind:           "accessible_entrance",
			Label:          "Pintu masuk rekomendasi di tujuan: " + recommendedEntrance.Name,
			Symbol:         symbol,
			Tone:           tone,
			DistanceMeters: int(distanceM + 0.5),
		})
	}

	return
}

func math000(v float64) float64 {
	r := int(v)
	if r == 0 && v > 0 {
		r = 1
	}
	return float64(r)
}

func buildSteps(pivots []model.LatLng, destinationName string) []RouteStepInfo {
	var steps []RouteStepInfo
	for i := 0; i < len(pivots)-1; i++ {
		d := int(metersBetween(pivots[i], pivots[i+1]) + 0.5)
		instruction := "Lanjut " + strconv.Itoa(d) + " meter."
		if i == 0 {
			instruction = "Berjalan menuju " + destinationName + " sejauh " + strconv.Itoa(d) + " meter."
		}
		steps = append(steps, RouteStepInfo{
			ID:             "step-" + strconv.Itoa(i),
			Instruction:    instruction,
			DistanceMeters: d,
			BarrierLabel:   nil,
			FacilityLabel:  nil,
			IsArrival:      nil,
		})
	}
	arrival := true
	steps = append(steps, RouteStepInfo{
		ID:             "step-arrive",
		Instruction:    "Tiba di " + destinationName + ".",
		DistanceMeters: 0,
		BarrierLabel:   nil,
		FacilityLabel:  nil,
		IsArrival:      &arrival,
	})
	return steps
}

func withWarnings(steps []RouteStepInfo, barriers []RouteBarrierInfo, facilities []RouteFacilityInfo) []RouteStepInfo {
	untilNow := 0.0
	out := make([]RouteStepInfo, 0, len(steps))
	for _, step := range steps {
		from := untilNow - 20
		to := untilNow + float64(step.DistanceMeters) + 30
		untilNow += float64(step.DistanceMeters)
		next := step
		if step.IsArrival != nil && *step.IsArrival {
			out = append(out, next)
			continue
		}
		var barrier *RouteBarrierInfo
		for i := range barriers {
			b := &barriers[i]
			if float64(b.DistanceMeters) >= from && float64(b.DistanceMeters) <= to {
				barrier = b
				break
			}
		}
		var facility *RouteFacilityInfo
		for i := range facilities {
			f := &facilities[i]
			if float64(f.DistanceMeters) >= from && float64(f.DistanceMeters) <= to {
				facility = f
				break
			}
		}
		if barrier != nil {
			sym := barrier.Symbol
			if sym == "" {
				sym = "⚠"
			}
			offset := int(float64(barrier.DistanceMeters) - from)
			if offset < 0 {
				offset = 0
			}
			s := sym + " " + barrier.Label + " dilaporkan sekitar " + strconv.Itoa(offset) + " m dari posisi saat ini."
			next.BarrierLabel = &s
		}
		if facility != nil && barrier == nil {
			sym := facility.Symbol
			if sym == "" {
				sym = "✓"
			}
			s := sym + " " + facility.Label + "."
			next.FacilityLabel = &s
		}
		out = append(out, next)
	}
	return out
}

func honestNote() string {
	return "Accessibility-informed route based on currently available community data."
}

type routeOptionInput struct {
	ID              string
	Label           string
	FromName        string
	ToName          string
	DestinationID   string
	DistanceM       float64
	DurationMinutes int
	Score           *int
	Reasoning       []string
	Warnings        []string
	BarriersOf      []RouteBarrierInfo
	FacilitiesOf    []RouteFacilityInfo
	Steps           []RouteStepInfo
	Geometry        []model.LatLng
}

func toOption(input routeOptionInput) RouteOption {
	score := input.Score
	return RouteOption{
		ID:                 input.ID,
		Label:              input.Label,
		FromName:           input.FromName,
		ToName:             input.ToName,
		DestinationID:      input.DestinationID,
		Recommended:        false,
		DistanceKm:         input.DistanceM / 1000,
		DistanceLabel:      model.FormatDistance(input.DistanceM / 1000),
		DurationMinutes:    input.DurationMinutes,
		DurationLabel:      strconv.Itoa(input.DurationMinutes) + " menit",
		AccessibilityScore: score,
		ScoreLabel:         scoreLabel(score),
		Reasoning:          input.Reasoning,
		Warnings:           input.Warnings,
		Barriers:           input.BarriersOf,
		Facilities:         input.FacilitiesOf,
		Geometry:           input.Geometry,
		Steps:              input.Steps,
		HonestNote:         demo.StrPtr(honestNote()),
	}
}

// PlanRoutes plans demo connectivity between origin and a demo destination.
func PlanRoutes(origin model.LatLng, originName string, destination *demo.Place, profile string) ([]RouteOption, string) {
	kinds := model.LayersForProfile(profile)

	dest := model.LatLng{Lat: destination.Lat, Lng: destination.Lng}

	if metersBetween(origin, dest) < 1.0 {
		// Titik asal & tujuan (hampir) sama. Lewati logika corridor:
		// t = alongMeters / metersBetween = x/0 menghasilkan NaN/+Inf yang
		// membuat JSON gagal di-encode (response rusak / "gangguan jaringan").
		option := toOption(routeOptionInput{
			ID:              "route-fast",
			Label:           "Fastest Route",
			FromName:        originName,
			ToName:          destination.Name,
			DestinationID:   destination.ID,
			DistanceM:       0,
			DurationMinutes: 1,
			Reasoning:       []string{"Titik awal sama dengan tujuan — kamu sudah berada di lokasi."},
			Steps:           []RouteStepInfo{},
			Geometry:        []model.LatLng{origin, dest},
		})
		option.Recommended = true
		return []RouteOption{option}, "demo"
	}

	fastPoints := subdivide(origin, dest, legLengthM)
	fastHits := corridorHits(fastPoints, kinds)
	fastLike := routeLike{points: fastPoints, hits: fastHits}

	accessiblePivots := []model.LatLng{origin}
	sortedFastHits := make([]corridorHit, len(fastHits))
	copy(sortedFastHits, fastHits)
	for i := range sortedFastHits {
		for j := i + 1; j < len(sortedFastHits); j++ {
			if sortedFastHits[j].alongMeters < sortedFastHits[i].alongMeters {
				sortedFastHits[i], sortedFastHits[j] = sortedFastHits[j], sortedFastHits[i]
			}
		}
	}
	for _, hit := range sortedFastHits {
		meta := model.StatusMeta(hit.feature.Kind, hit.feature.Status)
		if meta.Tone != "danger" {
			continue
		}
		midpoint := destPointAt(origin, dest, safeFraction(hit.alongMeters, metersBetween(origin, dest)))
		offset := perpendicularOffsetFastest(origin, dest, midpoint, detourOffsetM)
		last := accessiblePivots[len(accessiblePivots)-1]
		if metersBetween(last, offset) < 25 {
			continue
		}
		accessiblePivots = append(accessiblePivots, offset)
	}
	if metersBetween(accessiblePivots[len(accessiblePivots)-1], dest) > 25 {
		accessiblePivots = append(accessiblePivots, dest)
	}

	var accessiblePoints []model.LatLng
	for i := 0; i < len(accessiblePivots)-1; i++ {
		s := subdivide(accessiblePivots[i], accessiblePivots[i+1], legLengthM)
		if len(s) > 0 {
			accessiblePoints = append(accessiblePoints, s[:len(s)-1]...)
		}
	}
	accessiblePoints = append(accessiblePoints, dest)
	accessibleHits := corridorHits(accessiblePoints, kinds)
	accessibleLike := routeLike{points: accessiblePoints, hits: accessibleHits}

	fastScore, fastStrokes, fastFacilities, fastBarriers := evaluateRoute(fastLike, destination, profile, []model.LatLng{origin, dest})
	accessibleScore, accessibleStrokes, accessibleFacilities, accessibleBarriers := evaluateRoute(accessibleLike, destination, profile, accessiblePivots)
	_ = fastStrokes
	_ = accessibleStrokes

	fastTotalM := metersBetween(origin, dest)
	accessibleTotalM := sumPath(accessiblePivots)

	// convert score into an int used for comparisons
	fastScoreVal := -1
	if fastScore != nil {
		fastScoreVal = *fastScore
	}
	accessibleScoreVal := -1
	if accessibleScore != nil {
		accessibleScoreVal = *accessibleScore
	}

	fastSteps := withWarnings(buildSteps([]model.LatLng{origin, dest}, destination.Name), fastBarriers, fastFacilities)
	accessibleSteps := withWarnings(buildSteps(accessiblePivots, destination.Name), accessibleBarriers, accessibleFacilities)

	fastWarnings := make([]string, 0, 3)
	for i, b := range fastBarriers {
		if i >= 3 {
			break
		}
		fastWarnings = append(fastWarnings, b.Label+" dilaporkan sekitar "+strconv.Itoa(b.DistanceMeters)+" m dari awal.")
	}
	accessibleWarnings := make([]string, 0, 3)
	for i, b := range accessibleBarriers {
		if i >= 3 {
			break
		}
		accessibleWarnings = append(accessibleWarnings, b.Label+" dilaporkan sekitar "+strconv.Itoa(b.DistanceMeters)+" m dari awal.")
	}

	fastReasoning := []string{"Dihitung dari estimator demo."}
	if fastScore != nil {
		fastReasoning = append([]string{"Rute tercepat berdasarkan data aksesibilitas yang tersedia."}, fastReasoning...)
	}

	var accessibleReasoning []string
	if len(accessibleBarriers) > 0 {
		accessibleReasoning = append(accessibleReasoning, "Menghindari "+strconv.Itoa(len(accessibleBarriers))+" hambatan yang dilaporkan komunitas.")
	}
	if len(accessibleFacilities) > 0 {
		accessibleReasoning = append(accessibleReasoning, "Termasuk "+strconv.Itoa(len(accessibleFacilities))+" fasilitas aksesibel di sepanjang rute.")
	}
	if len(accessibleReasoning) == 0 {
		accessibleReasoning = []string{"Rute ini sedapat mungkin menghindari hambatan yang dilaporkan."}
	}

	fastRoute := toOption(routeOptionInput{
		ID:              "route-fast",
		Label:           "Fastest Route",
		FromName:        originName,
		ToName:          destination.Name,
		DestinationID:   destination.ID,
		DistanceM:       fastTotalM,
		DurationMinutes: durationFor(profile, fastTotalM),
		Score:           fastScore,
		Reasoning:       fastReasoning,
		Warnings:        fastWarnings,
		BarriersOf:      fastBarriers,
		FacilitiesOf:    fastFacilities,
		Steps:           fastSteps,
		Geometry:        fastPoints,
	})

	accessibleRoute := toOption(routeOptionInput{
		ID:              "route-maj",
		Label:           "Most Accessible Route",
		FromName:        originName,
		ToName:          destination.Name,
		DestinationID:   destination.ID,
		DistanceM:       accessibleTotalM,
		DurationMinutes: durationFor(profile, accessibleTotalM),
		Score:           accessibleScore,
		Reasoning:       accessibleReasoning,
		Warnings:        accessibleWarnings,
		BarriersOf:      accessibleBarriers,
		FacilitiesOf:    accessibleFacilities,
		Steps:           accessibleSteps,
		Geometry:        accessiblePoints,
	})

	recommended := &fastRoute
	alternative := &accessibleRoute
	if accessibleScoreVal >= fastScoreVal {
		recommended = &accessibleRoute
		alternative = &fastRoute
	}

	var routes []RouteOption
	for _, r := range []*RouteOption{recommended, alternative} {
		cp := *r
		cp.Recommended = r == recommended
		routes = append(routes, cp)
	}

	return routes, "demo"
}

func durationFor(profile string, meters float64) int {
	speed := speedKmph[profile]
	if speed <= 0 {
		speed = 5
	}
	mins := (meters / 1000) / speed * 60
	if mins < 1 {
		return 1
	}
	return int(mins + 0.5)
}

func decimate(points []model.LatLng, maxStepM float64) []model.LatLng {
	if len(points) < 3 {
		return points
	}
	out := []model.LatLng{points[0]}
	acc := 0.0
	for i := 1; i < len(points)-1; i++ {
		acc += metersBetween(points[i-1], points[i])
		if acc >= maxStepM {
			out = append(out, points[i])
			acc = 0
		}
	}
	last := points[len(points)-1]
	if metersBetween(out[len(out)-1], last) > 0.5 {
		out = append(out, last)
	}
	return out
}

func parseOsrmCoords(raw interface{}) []model.LatLng {
	coords, ok := raw.([]interface{})
	if !ok || len(coords) < 2 {
		return nil
	}
	var out []model.LatLng
	for _, c := range coords {
		pair, ok := c.([]interface{})
		if !ok || len(pair) < 2 {
			continue
		}
		lng, ok1 := pair[0].(float64)
		lat, ok2 := pair[1].(float64)
		if !ok1 || !ok2 {
			continue
		}
		if !mathIsFinite(lng) || !mathIsFinite(lat) {
			continue
		}
		if len(out) > 0 && metersBetween(out[len(out)-1], model.LatLng{Lat: lat, Lng: lng}) < 0.5 {
			continue
		}
		out = append(out, model.LatLng{Lat: lat, Lng: lng})
	}
	if len(out) < 2 {
		return nil
	}
	return out
}

func mathIsFinite(v float64) bool {
	return v == v && v-v == 0
}

func fetchStreetLines(origin, destination model.LatLng) ([][]model.LatLng, error) {
	url := osrmBase + "/" + formatCoord(origin.Lng) + "," + formatCoord(origin.Lat) + ";" + formatCoord(destination.Lng) + "," + formatCoord(destination.Lat) + "?" + osrmQuery
	client := &http.Client{Timeout: osrmTimeoutMs}
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, errNil
	}
	if resp.Body == nil {
		return nil, errNil
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return nil, err
	}
	var parsed struct {
		Code   string `json:"code"`
		Routes []struct {
			Geometry struct {
				Coordinates interface{} `json:"coordinates"`
			} `json:"geometry"`
		} `json:"routes"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	if parsed.Code != "Ok" || len(parsed.Routes) == 0 {
		return nil, errNil
	}
	var lines [][]model.LatLng
	for _, route := range parsed.Routes {
		raw := route.Geometry.Coordinates
		points := parseOsrmCoords(raw)
		if points == nil {
			continue
		}
		lines = append(lines, points)
		if len(lines) >= 2 {
			break
		}
	}
	if len(lines) == 0 {
		return nil, errNil
	}
	return lines, nil
}

var errNil = errSmallest()

func errSmallest() error {
	return httpError("network-unavailable")
}

func httpError(msg string) error {
	return &osrmHTTPError{msg: msg}
}

type osrmHTTPError struct {
	msg string
}

func (e *osrmHTTPError) Error() string { return e.msg }

func formatCoord(v float64) string {
	return strconv.FormatFloat(v, 'f', 6, 64)
}

// StreetRouteResult reports whether real OSM routing was used.
type StreetRouteResult struct {
	Routes []RouteOption
	Real   bool
	Source string
}

func toStreetOption(
	line []model.LatLng,
	originName string,
	destination *demo.Place,
	profile string,
	id string,
	label string,
) RouteOption {
	kinds := model.LayersForProfile(profile)
	hitPoints := decimate(line, hitStepM)
	pivots := decimate(line, stepStepM)
	hits := corridorHits(hitPoints, kinds)
	score, _, facilities, barriers := evaluateRoute(routeLike{points: hitPoints, hits: hits}, destination, profile, pivots)

	dist := sumPath(line)
	durationMinutes := durationFor(profile, dist)
	steps := withWarnings(buildSteps(pivots, destination.Name), barriers, facilities)

	var reasoning []string
	if len(barriers) > 0 {
		reasoning = append(reasoning, "Rute mengikuti jaringan jalan nyata (OpenStreetMap) dan menghindari "+strconv.Itoa(len(barriers))+" hambatan yang dianalisis.")
	} else {
		reasoning = append(reasoning, "Rute mengikuti jaringan jalan nyata (OpenStreetMap) tanpa hambatan yang dilaporkan.")
	}
	if len(facilities) > 0 {
		reasoning = append(reasoning, "Termasuk "+strconv.Itoa(len(facilities))+" fasilitas aksesibel di sepanjang rute.")
	}

	warnings := make([]string, 0, 3)
	for i, b := range barriers {
		if i >= 3 {
			break
		}
		warnings = append(warnings, b.Label+" dilaporkan sekitar "+strconv.Itoa(b.DistanceMeters)+" m dari awal.")
	}

	opt := toOption(routeOptionInput{
		ID:              id,
		Label:           label,
		FromName:        originName,
		ToName:          destination.Name,
		DestinationID:   destination.ID,
		DistanceM:       dist,
		DurationMinutes: durationMinutes,
		Score:           score,
		Reasoning:       reasoning,
		Warnings:        warnings,
		BarriersOf:      barriers,
		FacilitiesOf:    facilities,
		Steps:           steps,
		Geometry:        line,
	})
	opt.HonestNote = demo.StrPtr("Accessibility-informed street route based on the real OSM road network and available community data.")
	return opt
}

// PlanStreetRoutes routes via the real OSM network when reachable, falling
// back to demo routing when the OSRM service is unavailable.
func PlanStreetRoutes(origin model.LatLng, originName string, destination *demo.Place, profile string) StreetRouteResult {
	destinationPoint := model.LatLng{Lat: destination.Lat, Lng: destination.Lng}
	lines, err := fetchStreetLines(origin, destinationPoint)
	if err != nil || len(lines) == 0 {
		return StreetRouteResult{Routes: []RouteOption{}, Real: false, Source: "demo"}
	}
	if len(lines) > 2 {
		lines = lines[:2]
	}
	options := make([]RouteOption, 0, len(lines))
	for i, line := range lines {
		id := "route-street"
		label := "Most Accessible Route"
		if i == 0 {
			id = "route-street"
			label = "Most Accessible Route"
		} else {
			id = "route-street-2"
			label = "Fastest Route"
		}
		options = append(options, toStreetOption(line, originName, destination, profile, id, label))
	}
	if len(options) == 0 {
		return StreetRouteResult{Routes: []RouteOption{}, Real: false, Source: "demo"}
	}
	a := options[0]
	if len(options) == 1 {
		a.Recommended = true
		return StreetRouteResult{Routes: []RouteOption{a}, Real: true, Source: "osm-street"}
	}
	b := options[1]
	aScore := -1
	if a.AccessibilityScore != nil {
		aScore = *a.AccessibilityScore
	}
	bScore := -1
	if b.AccessibilityScore != nil {
		bScore = *b.AccessibilityScore
	}
	best := &a
	if bScore > aScore || (bScore == aScore && b.DistanceKm <= a.DistanceKm) {
		best = &b
	}
	other := &a
	if best == &a {
		other = &b
	}
	recommended := *best
	recommended.ID = "route-street"
	recommended.Label = "Most Accessible Route"
	recommended.Recommended = true
	alternative := *other
	alternative.ID = "route-street-2"
	alternative.Label = "Fastest Route"
	alternative.Recommended = false
	return StreetRouteResult{Routes: []RouteOption{recommended, alternative}, Real: true, Source: "osm-street"}
}
