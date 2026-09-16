package main

import (
	"regexp"
	"strings"
)

type AssistantAnswer struct {
	Intent       string           `json:"intent"`
	SubjectPlace *AssistantPlace  `json:"subjectPlace"`
	AnswerText   string           `json:"answerText"`
	Bullets      []string         `json:"bullets"`
	Sources      []AssistantSource `json:"sources"`
	FollowUps    []AssistantFollowUp `json:"followUps"`
}

type AssistantPlace struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type AssistantSource struct {
	Type        string  `json:"type"`
	Title       string  `json:"title"`
	Detail      string  `json:"detail"`
	Reliability string  `json:"reliability"`
	Href        *string `json:"href,omitempty"`
}

type AssistantFollowUp struct {
	Label string `json:"label"`
	Query string `json:"query"`
}

type AssistantRequest struct {
	Message string `json:"message"`
}

const UNKNOWN_DATA_TEXT = "Belum tersedia cukup data untuk memastikan kondisi tersebut."

const ASSISTANT_DISCLAIMER = "Asisten menjawab dari data BLINDSPOT (saat ini data demo untuk pengembangan, RULE 1) dan tidak mengarang kondisi aksesibilitas. Bedakan: terverifikasi / dilaporkan komunitas / belum terverifikasi."

var ALL_NOUNS = []string{
	"ramp", "toilet", "musala", "guiding block", "guiding", "taktil",
	"elevator", "lift", "tangga", "escalator", "eskalator",
}

var NOUN_KIND = map[string]string{
	"ramp": "ramp", "toilet": "toilet", "musala": "toilet",
	"guiding block": "guiding_block", "guiding": "guiding_block", "taktil": "guiding_block",
	"elevator": "elevator", "lift": "elevator",
	"tangga": "stairs", "escalator": "stairs", "eskalator": "stairs",
}

var PLACE_ALIASES = [][2][]string{
	{{"halte", "transjakarta"}, {"place-halte"}},
	{{"stasiun", "lrt", "velodrome"}, {"place-stasiun"}},
	{{"masjid"}, {"place-masjid"}},
	{{"cafe", "kafe", "marison"}, {"place-marison"}},
	{{"puskesmas"}, {"place-puskesmas"}},
	{{"perpustakaan", "library"}, {"place-library"}},
	{{"rptra"}, {"place-rptra"}},
	{{"universitas", "unj"}, {"place-unj"}},
}

func normalizeText(text string) string {
	re := regexp.MustCompile(`[?.,!]`)
	return strings.TrimSpace(strings.ToLower(re.ReplaceAllString(text, " ")))
}

func hasAny(text string, phrases []string) bool {
	for _, p := range phrases {
		if strings.Contains(text, p) {
			return true
		}
	}
	return false
}

func regexpEscape(s string) string {
	re := regexp.MustCompile(`[.*+?^${}()|[\]\\]`)
	return re.ReplaceAllString(s, `\$&`)
}

func hasWord(text, word string) bool {
	pattern := `(^|\s)` + regexpEscape(word) + `(\s|$)`
	matched, _ := regexp.MatchString(pattern, text)
	return matched
}

func reliabilityLabel(verification string) string {
	if verification == "VERIFIED" {
		return "terverifikasi"
	}
	if verification == "COMMUNITY_REPORTED" {
		return "dilaporkan komunitas"
	}
	return "belum terverifikasi"
}

func detectFeatureNoun(message string) (string, bool) {
	for _, noun := range ALL_NOUNS {
		if strings.Contains(message, noun) {
			return noun, true
		}
	}
	return "", false
}

func findPlacesByQuery(message string) []*DemoPlace {
	q := normalizeText(message)
	matched := map[string]bool{}
	for _, place := range demoPlacesData() {
		name := strings.ToLower(place.Name)
		address := strings.ToLower(place.Address + " " + place.City)
		if strings.Contains(name, q) || (len(q) >= 4 && strings.Contains(address, q)) {
			matched[place.ID] = true
		}
	}
	for _, entry := range PLACE_ALIASES {
		aliases := entry[0]
		id := entry[1][0]
		for _, alias := range aliases {
			wordMatch := hasWord(q, alias)
			contained := strings.Contains(q, alias) && len(alias) >= 6
			if wordMatch || contained {
				for _, p := range demoPlacesData() {
					if p.ID == id {
						matched[id] = true
						break
					}
				}
				break
			}
		}
	}
	var out []*DemoPlace
	for _, p := range demoPlacesData() {
		if matched[p.ID] {
			out = append(out, p)
		}
	}
	return out
}

func hasFeatureVerification(features []*DemoFeature, verification string) bool {
	for _, f := range features {
		if f.Verification == verification {
			return true
		}
	}
	return false
}

func featureSentence(f *DemoFeature) string {
	meta := statusMeta(f.Kind, f.Status)
	label := meta.Label
	if f.StepCount != nil && *f.StepCount > 0 {
		label = meta.Label + " (" + formatInt(*f.StepCount) + " anak tangga)"
	}
	layer := LAYERS[f.Kind]
	layerLabel := "? "
	if layer != nil {
		layerLabel = layer.Label
	}
	symbol := meta.Symbol
	if symbol == "" {
		symbol = "?"
	}
	return symbol + " " + layerLabel + " — " + label + " (" + reliabilityLabel(f.Verification) + ")"
}

func featureSource(f *DemoFeature) AssistantSource {
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
	layerLabel := LAYERS[f.Kind].Label + ": " + meta.Label
	if LAYERS[f.Kind] == nil {
		layerLabel = meta.Label
	}
	detail := "area: " + reliabilityLabel(f.Verification)
	if place != nil {
		detail = place.Name + ": " + reliabilityLabel(f.Verification)
	}
	href := "/map"
	if place != nil {
		href = "/places/" + place.ID
	}
	return AssistantSource{
		Type: "feature", Title: layerLabel, Detail: detail,
		Reliability: f.Verification, Href: &href,
	}
}

func reportSource(r *DemoReport) AssistantSource {
	statusLabel := REPORT_STATUS_META[r.Status].Label
	detail := statusLabel + " · laporan " + reliabilityLabel(r.Verification) + " oleh " + r.AuthorName
	href := "/report/" + r.ID
	return AssistantSource{
		Type: "report", Title: r.Title, Detail: detail,
		Reliability: r.Verification, Href: &href,
	}
}

func placeSources(place *DemoPlace) []AssistantSource {
	var out []AssistantSource
	for _, f := range demoFeatureData() {
		if f.PlaceID != nil && *f.PlaceID == place.ID {
			out = append(out, featureSource(f))
		}
	}
	for _, r := range demoReportData() {
		if r.PlaceID == place.ID {
			out = append(out, reportSource(r))
		}
	}
	return out
}

func placeHref(id string) string {
	return "/places/" + id
}

func scoreSourceFor(place *DemoPlace, profile string) AssistantSource {
	evaluation := placeEvaluation(place, profile)
	reliability := "UNKNOWN"
	hasV := false
	for _, r := range demoReportData() {
		if r.PlaceID == place.ID && r.Verification == "VERIFIED" {
			hasV = true
			break
		}
	}
	if hasFeatureVerification(linkedDemoFeatures(place), "VERIFIED") || hasV {
		reliability = "VERIFIED"
	} else if len(linkedDemoFeatures(place)) > 0 || len(reportsForPlace(place)) > 0 {
		reliability = "COMMUNITY_REPORTED"
	}
	scoreText := "belum tersedia"
	if evaluation.Score != nil {
		scoreText = formatInt(*evaluation.Score) + "/100"
	}
	profileName := "navigasi visual"
	if profile == "WHEELCHAIR_MOBILITY" {
		profileName = "kursi roda"
	}
	title := "Skor aksesibilitas " + profileName + ": " + scoreText
	detail := evaluation.Label + " · " + reliabilityLabel(reliability)
	href := placeHref(place.ID)
	return AssistantSource{
		Type: "score", Title: title, Detail: detail, Reliability: reliability, Href: &href,
	}
}

func linkedDemoFeatures(place *DemoPlace) []*DemoFeature {
	var out []*DemoFeature
	for _, f := range demoFeatureData() {
		if f.PlaceID != nil && *f.PlaceID == place.ID {
			out = append(out, f)
		}
	}
	return out
}

func reportsForPlace(place *DemoPlace) []*DemoReport {
	var out []*DemoReport
	for _, r := range demoReportData() {
		if r.PlaceID == place.ID {
			out = append(out, r)
		}
	}
	return out
}

func entranceSummary(place *DemoPlace, profile string) []string {
	if profile != "WHEELCHAIR_MOBILITY" {
		return []string{}
	}
	var main *DemoEntrance
	for _, e := range place.Entrances {
		if e.Type == "MAIN" {
			main = e
			break
		}
	}
	if main == nil && len(place.Entrances) > 0 {
		main = place.Entrances[0]
	}
	if main == nil {
		return []string{"Belum ada data pintu masuk."}
	}
	stepsText := formatInt(main.Steps) + " anak tangga"
	if main.Steps == 0 {
		stepsText = "tanpa tangga"
	}
	rampText := "tanpa ramp"
	if main.HasRamp {
		rampText = "dengan ramp"
	}
	lines := []string{"Pintu masuk utama \"" + main.Name + "\": " + stepsText + ", " + rampText + "."}
	for _, e := range place.Entrances {
		if e.ID != main.ID && e.Steps == 0 && e.Type != "SERVICE" {
			lines = append(lines, "Alternatif rata tanpa tangga tersedia: \""+e.Name+"\".")
			break
		}
	}
	return lines
}

func ambiguousAnswer(candidates []*DemoPlace) AssistantAnswer {
	bullets := []string{}
	sources := []AssistantSource{}
	for _, p := range candidates {
		bullets = append(bullets, p.Name)
		href := placeHref(p.ID)
		sources = append(sources, AssistantSource{
			Type: "place", Title: p.Name, Detail: p.City, Reliability: "UNKNOWN", Href: &href,
		})
	}
	return AssistantAnswer{
		Intent: "ambiguous", AnswerText: "Kamu menyebut beberapa kemungkinan tempat. Bisa perjelas dengan menyebut nama lengkapnya.",
		Bullets: bullets, Sources: sources, FollowUps: []AssistantFollowUp{},
	}
}

func noDataAnswer() AssistantAnswer {
	return AssistantAnswer{
		Intent: "unknown", AnswerText: UNKNOWN_DATA_TEXT,
		Bullets: []string{"Coba sebutkan nama tempat yang lebih spesifik, atau tanyakan fasilitas (misalnya: 'Di mana fasilitas yang memiliki ramp?')."},
		Sources: []AssistantSource{},
		FollowUps: []AssistantFollowUp{{Label: "Cari ramp", Query: "Di mana fasilitas yang memiliki ramp?"}},
	}
}

func strPtrOf(s string) *string { return &s }

func answerFor(intent string, place *DemoPlace, profile string, featureNoun *string) AssistantAnswer {
	if intent == "facility_with" {
		return facilityAnswer(featureNoun)
	}
	evaluation := placeEvaluation(place, profile)
	features := linkedDemoFeatures(place)
	reports := reportsForPlace(place)

	if intent == "feature_status" {
		return featureStatusAnswer(place, featureNoun, features, reports)
	}

	if intent == "barriers_toward" {
		relevantKinds := []string{"ramp", "stairs", "elevator", "path_width", "surface_condition", "accessible_entrance", "obstacle"}
		if profile != "WHEELCHAIR_MOBILITY" {
			relevantKinds = []string{"guiding_block", "pedestrian_crossing", "audio_crossing_signal", "obstacle", "surface_hazard"}
		}
		var barriers []*DemoFeature
		for _, f := range features {
			if !containsString(relevantKinds, f.Kind) {
				continue
			}
			if statusMeta(f.Kind, f.Status).Tone == "success" {
				continue
			}
			barriers = append(barriers, f)
		}
		// stable sort by tone (danger first)
		for i := 1; i < len(barriers); i++ {
			for j := i; j > 0; j-- {
				a := statusMeta(barriers[j-1].Kind, barriers[j-1].Status).Tone
				b := statusMeta(barriers[j].Kind, barriers[j].Status).Tone
				if a == "danger" || b != "danger" {
					break
				}
				barriers[j-1], barriers[j] = barriers[j], barriers[j-1]
			}
		}
		sentences := []string{}
		if len(barriers) == 0 && len(reports) == 0 {
			navName := "visual"
			if profile == "WHEELCHAIR_MOBILITY" {
				navName = "kursi roda"
			}
			sentences = append(sentences, "Tidak ada hambatan yang dilaporkan di area "+place.Name+" untuk navigasi "+navName+".")
		} else {
			sentences = append(sentences, "Menurut data yang tersedia, hambatan di area "+place.Name+":")
		}
		bullets := []string{}
		sources := []AssistantSource{}
		for _, b := range barriers {
			bullets = append(bullets, featureSentence(b))
			sources = append(sources, featureSource(b))
		}
		for _, r := range reports {
			sources = append(sources, reportSource(r))
		}
		sp := &AssistantPlace{ID: place.ID, Name: place.Name}
		return AssistantAnswer{
			Intent: intent, SubjectPlace: sp, AnswerText: strings.Join(sentences, " "),
			Bullets: bullets, Sources: sources,
			FollowUps: []AssistantFollowUp{
				{Label: "Cek aksesibilitas kursi roda", Query: "Apakah " + place.Name + " aksesibel untuk kursi roda?"},
				{Label: "Lihat detail tempat", Query: "Menuju " + place.Name},
			},
		}
	}

	if intent == "wheelchair_place" || intent == "visual_place" {
		sentences := []string{}
		if evaluation.Score == nil {
			sentences = append(sentences, "Belum ada fitur yang dilaporkan untuk menilai "+place.Name+".")
		} else {
			profileName := "visual"
			if profile == "WHEELCHAIR_MOBILITY" {
				profileName = "kursi roda"
			}
			sentences = append(sentences, "Menurut data saat ini, "+place.Name+" memiliki skor aksesibilitas "+profileName+" "+formatInt(*evaluation.Score)+" dari 100 ("+evaluation.Label+").")
		}
		if intent == "wheelchair_place" {
			sentences = append(sentences, entranceSummary(place, profile)...)
		}
		bullets := append(entranceSummary(place, profile), []string{}...)
		for _, f := range evaluation.Factors {
			bullets = append(bullets, f.Label)
		}
		sources := []AssistantSource{scoreSourceFor(place, profile)}
		sources = append(sources, placeSources(place)...)
		sp := &AssistantPlace{ID: place.ID, Name: place.Name}
		return AssistantAnswer{
			Intent: intent, SubjectPlace: sp, AnswerText: strings.Join(sentences, " "),
			Bullets: bullets, Sources: sources,
			FollowUps: []AssistantFollowUp{
				{Label: "Hambatan utama", Query: "Apa hambatan utama menuju " + place.Name + "?"},
				{Label: "Detail tempat", Query: "Ke " + place.Name},
			},
		}
	}

	return noDataAnswer()
}

func containsString(list []string, s string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

func featureStatusAnswer(place *DemoPlace, featureNoun *string, features []*DemoFeature, reports []*DemoReport) AssistantAnswer {
	noun := ""
	kind := ""
	if featureNoun != nil {
		noun = *featureNoun
		kind = NOUN_KIND[noun]
	}
	var matchReports []*DemoReport
	if noun != "" {
		for _, r := range reports {
			if strings.Contains(strings.ToLower(r.Title+" "+r.Excerpt), noun) {
				matchReports = append(matchReports, r)
			}
		}
	}
	var matchFeatures []*DemoFeature
	if kind == "ramp" || kind == "elevator" || kind == "guiding_block" || kind == "stairs" {
		for _, f := range linkedDemoFeatures(place) {
			if f.Kind == kind {
				matchFeatures = append(matchFeatures, f)
			}
		}
	}
	var rampEntrances []*DemoEntrance
	if kind == "ramp" || strings.Contains(noun, "ramp") {
		for _, e := range place.Entrances {
			if e.HasRamp {
				rampEntrances = append(rampEntrances, e)
			}
		}
	}
	var toiletReports []*DemoReport
	if regexp.MustCompile(`toilet|wc|musala`).MatchString(noun) {
		for _, r := range reports {
			if regexp.MustCompile(`(?i)toilet|wc|musala`).MatchString(r.Title+" "+r.Excerpt) {
				toiletReports = append(toiletReports, r)
			}
		}
	}
	var bullets []string
	for _, f := range matchFeatures {
		bullets = append(bullets, featureSentence(f))
	}
	for _, e := range rampEntrances {
		bullets = append(bullets, "Pintu masuk \""+e.Name+"\" memiliki ramp (data tempat).")
	}
	for _, r := range toiletReports {
		bullets = append(bullets, "Laporan: "+r.Title+" ("+reliabilityLabel(r.Verification)+").")
	}

	sp := &AssistantPlace{ID: place.ID, Name: place.Name}
	if len(bullets) == 0 {
		subject := "fitur"
		if noun != "" {
			subject = noun
		}
		sources := []AssistantSource{}
		for _, f := range linkedDemoFeatures(place) {
			sources = append(sources, AssistantSource{
				Type: "feature", Title: f.Kind, Detail: "area: " + reliabilityLabel(f.Verification),
				Reliability: f.Verification, Href: &hrefTop,
			})
		}
		for _, r := range reports {
			sources = append(sources, reportSource(r))
		}
		return AssistantAnswer{
			Intent: "feature_status", SubjectPlace: sp,
			AnswerText: UNKNOWN_DATA_TEXT,
			Bullets:    []string{"Tidak ada data " + subject + " tersebut untuk " + place.Name + "."},
			Sources:    sources,
			FollowUps:  []AssistantFollowUp{{Label: "Cek tempat", Query: "Apakah " + place.Name + " aksesibel untuk kursi roda?"}},
		}
	}
	answerText := "Data untuk " + place.Name + ":"
	if noun != "" {
		answerText = "Untuk " + noun + " di " + place.Name + ", data yang tersedia:"
	}
	sources := []AssistantSource{}
	for _, f := range matchFeatures {
		sources = append(sources, featureSource(f))
	}
	for _, r := range matchReports {
		sources = append(sources, reportSource(r))
	}
	return AssistantAnswer{
		Intent: "feature_status", SubjectPlace: sp, AnswerText: answerText,
		Bullets: bullets, Sources: sources,
		FollowUps: []AssistantFollowUp{{Label: "Hambatan utama", Query: "Apa hambatan utama menuju " + place.Name + "?"}},
	}
}

// hrefTop is a sentinel used when a generic href is needed.
var hrefTop = "/map"

func facilityAnswer(featureNoun *string) AssistantAnswer {
	kind := ""
	if featureNoun != nil {
		kind = NOUN_KIND[*featureNoun]
	}

	if kind == "ramp" {
		var placesWithRamp []*DemoPlace
		for _, p := range demoPlacesData() {
			for _, e := range p.Entrances {
				if e.HasRamp {
					placesWithRamp = append(placesWithRamp, p)
					break
				}
			}
		}
		var features []*DemoFeature
		for _, f := range demoFeatureData() {
			if f.Kind == "ramp" {
				features = append(features, f)
			}
		}
		if len(placesWithRamp) == 0 {
			return noDataAnswer()
		}
		bullets := []string{}
		sources := []AssistantSource{}
		for _, p := range placesWithRamp {
			bullets = append(bullets, p.Name+" — data tempat (pintu masuk ber-ramp)")
			href := placeHref(p.ID)
			sources = append(sources, AssistantSource{
				Type: "place", Title: p.Name, Detail: "Pintu masuk dengan ramp",
				Reliability: "UNKNOWN", Href: &href,
			})
		}
		for _, f := range features {
			sources = append(sources, featureSource(f))
		}
		return AssistantAnswer{
			Intent: "facility_with", AnswerText: "Tempat berikut memiliki ramp pada area atau pintu masuknya.",
			Bullets: bullets, Sources: sources,
			FollowUps: []AssistantFollowUp{{Label: "Cek halte", Query: "Apakah Halte Transjakarta Rawamangun aksesibel untuk kursi roda?"}},
		}
	}

	if kind == "toilet" {
		var reports []*DemoReport
		for _, r := range demoReportData() {
			if regexp.MustCompile(`(?i)toilet|wc|musala`).MatchString(r.Title+" "+r.Excerpt) {
				reports = append(reports, r)
			}
		}
		if len(reports) == 0 {
			return noDataAnswer()
		}
		bullets := []string{}
		sources := []AssistantSource{}
		for _, r := range reports {
			placeName := "tempat terkait"
			for _, p := range demoPlacesData() {
				if p.ID == r.PlaceID {
					placeName = p.Name
					break
				}
			}
			bullets = append(bullets, r.Title+" di "+placeName+" ("+reliabilityLabel(r.Verification)+")")
			sources = append(sources, reportSource(r))
		}
		return AssistantAnswer{
			Intent: "facility_with", AnswerText: "Fasilitas toilet ramah aksesibilitas yang dilaporkan komunitas:",
			Bullets: bullets, Sources: sources, FollowUps: []AssistantFollowUp{},
		}
	}

	if kind == "guiding_block" {
		var good []*DemoFeature
		for _, f := range demoFeatureData() {
			if f.Kind == "guiding_block" && f.Status == "available" {
				good = append(good, f)
			}
		}
		if len(good) == 0 {
			return noDataAnswer()
		}
		bullets := []string{}
		sources := []AssistantSource{}
		for _, f := range good {
			bullets = append(bullets, featureSentence(f))
			sources = append(sources, featureSource(f))
		}
		return AssistantAnswer{
			Intent: "facility_with", AnswerText: "Guiding block tersedia di tempat/kawasan berikut:",
			Bullets: bullets, Sources: sources,
			FollowUps: []AssistantFollowUp{{Label: "Cek UNJ", Query: "Apakah Universitas Negeri Jakarta aksesibel untuk tunanetra?"}},
		}
	}

	if kind == "elevator" {
		var features []*DemoFeature
		for _, f := range demoFeatureData() {
			if f.Kind == "elevator" {
				features = append(features, f)
			}
		}
		if len(features) == 0 {
			return noDataAnswer()
		}
		bullets := []string{}
		sources := []AssistantSource{}
		for _, f := range features {
			bullets = append(bullets, featureSentence(f))
			sources = append(sources, featureSource(f))
		}
		return AssistantAnswer{
			Intent: "facility_with", AnswerText: "Kondisi elevator yang dilaporkan saat ini:",
			Bullets: bullets, Sources: sources, FollowUps: []AssistantFollowUp{},
		}
	}

	return noDataAnswer()
}

func askAssistant(request AssistantRequest) AssistantAnswer {
	message := strings.TrimSpace(request.Message)
	q := normalizeText(message)

	noun, hasNoun := detectFeatureNoun(q)
	var featureNoun *string
	if hasNoun {
		featureNoun = &noun
	}
	candidates := findPlacesByQuery(q)

	isFacilityQuestion := hasAny(q, []string{"fasilitas"}) && hasNoun
	isFeatureWithLocation := hasNoun && hasAny(q, []string{"beroperasi", "tersedia", "ada", "berfungsi", "matang", "kurang", "bagaimana kondisi", "kondisi"})
	isBarrierQuestion := hasAny(q, []string{"hambatan"})
	isWheelchair := hasAny(q, []string{"kursi roda", "wheelchair", "ramah kursi", "disabilitas duduk"})
	isVisual := hasAny(q, []string{"tunanetra", "netra", "buta", "low vision", "visual", "tongkat"})

	var intent string
	switch {
	case isFacilityQuestion:
		intent = "facility_with"
	case isFeatureWithLocation && len(candidates) > 0 && hasNoun:
		intent = "feature_status"
	case isBarrierQuestion && len(candidates) > 0:
		intent = "barriers_toward"
	case isWheelchair && len(candidates) > 0:
		intent = "wheelchair_place"
	case isVisual && len(candidates) > 0:
		intent = "visual_place"
	case isWheelchair && len(candidates) == 0 && !hasNoun:
		return AssistantAnswer{
			Intent: "wheelchair_place",
			AnswerText: UNKNOWN_DATA_TEXT,
			Bullets: []string{"Sebutkan nama tempat yang spesifik agar asisten bisa mencarikan datanya."},
			Sources: []AssistantSource{},
			FollowUps: []AssistantFollowUp{{Label: "Cari ramp", Query: "Di mana fasilitas yang memiliki ramp?"}},
		}
	case isFacilityQuestion || hasNoun:
		return facilityAnswer(featureNoun)
	case len(candidates) > 1:
		return ambiguousAnswer(candidates)
	case len(candidates) == 1:
		if isBarrierQuestion {
			intent = "barriers_toward"
		} else if isVisual {
			intent = "visual_place"
		} else {
			intent = "wheelchair_place"
		}
	default:
		return noDataAnswer()
	}

	place := candidates[0]
	profile := "WHEELCHAIR_MOBILITY"
	if intent == "visual_place" {
		profile = "VISUAL_NAVIGATION"
	}
	return answerFor(intent, place, profile, featureNoun)
}