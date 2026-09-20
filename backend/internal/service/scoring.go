package service

import (
	"math"

	"anapsi/backend/internal/model"
)

const baseScore = 50

var visualKinds = []string{"guiding_block", "pedestrian_crossing", "audio_crossing_signal", "obstacle", "surface_hazard"}
var mobilityKinds = []string{"ramp", "stairs", "elevator", "path_width", "surface_condition", "accessible_entrance"}

// EntranceEvidence describes one entrance for scoring.
type EntranceEvidence struct {
	Name    string
	Steps   int
	HasRamp bool
	WidthCm *int
}

// FeatureEvidence describes one map feature for scoring.
type FeatureEvidence struct {
	Kind         string
	Status       string
	StepCount    *int
	Verification string
}

// AccessFactor is a human-readable scoring factor.
type AccessFactor struct {
	Label string `json:"label"`
	Kind  string `json:"kind"`
}

// AccessEvaluation is the scoring result for one place/profile.
type AccessEvaluation struct {
	Score      *int           `json:"score"`
	Label      string         `json:"label"`
	Level      string         `json:"level"`
	Factors    []AccessFactor `json:"factors"`
	Confidence *string        `json:"confidence"`
	Freshness  string         `json:"freshness"`
	Scale      int            `json:"scale"`
}

func scoreLabel(score *int) string {
	if score == nil {
		return "Data Belum Tersedia"
	}
	if *score >= 80 {
		return "Sangat Aksesibel"
	}
	if *score >= 60 {
		return "Aksesibel Sebagian"
	}
	if *score >= 40 {
		return "Aksesibilitas Terbatas"
	}
	return "Hambatan Signifikan"
}

func scoreLevel(score *int) string {
	if score == nil {
		return "unknown"
	}
	if *score >= 80 {
		return "accessible"
	}
	if *score >= 40 {
		return "limited"
	}
	return "not-accessible"
}

func clampScore(value float64) int {
	return int(math.Max(0, math.Min(100, math.Round(value))))
}

func confidenceFor(count int, hasVerified bool) *string {
	if count == 0 {
		return nil
	}
	if count >= 4 && hasVerified {
		s := "high"
		return &s
	}
	if count >= 2 {
		s := "medium"
		return &s
	}
	s := "low"
	return &s
}

func entranceDeltas(entrance EntranceEvidence) (float64, []AccessFactor) {
	if entrance.Steps == 0 {
		return 1, []AccessFactor{{Label: entrance.Name + ": tanpa tangga", Kind: "positive"}}
	}
	if entrance.HasRamp && entrance.Steps <= 2 {
		return 0.5, []AccessFactor{{Label: entrance.Name + ": " + model.FormatInt(entrance.Steps) + " anak tangga dengan ramp", Kind: "neutral"}}
	}
	return -1, []AccessFactor{{Label: entrance.Name + ": " + model.FormatInt(entrance.Steps) + " anak tangga tanpa ramp", Kind: "negative"}}
}

func entranceWidthFactor(entrance EntranceEvidence) []AccessFactor {
	if entrance.WidthCm == nil {
		return nil
	}
	if *entrance.WidthCm >= 120 {
		return []AccessFactor{{Label: entrance.Name + ": pintu aksesibel " + model.FormatInt(*entrance.WidthCm) + " cm", Kind: "positive"}}
	}
	return []AccessFactor{{Label: entrance.Name + ": pintu sempit " + model.FormatInt(*entrance.WidthCm) + " cm", Kind: "negative"}}
}

type featureRule struct {
	kinds  []string
	adjust func(f FeatureEvidence) (float64, []AccessFactor)
}

func numberOrNull(v *int) *int {
	if v == nil {
		return nil
	}
	return v
}

var mobilityRules = []featureRule{
	{
		kinds: []string{"ramp"},
		adjust: func(f FeatureEvidence) (float64, []AccessFactor) {
			if f.Status == "available" {
				return 1.2, []AccessFactor{{Label: "Ramp tersedia di area sekitar", Kind: "positive"}}
			}
			return -1.2, []AccessFactor{{Label: "Ramp rusak di area sekitar", Kind: "negative"}}
		},
	},
	{
		kinds: []string{"stairs"},
		adjust: func(f FeatureEvidence) (float64, []AccessFactor) {
			label := "Ada tangga di jalur"
			if numberOrNull(f.StepCount) != nil {
				label = "Tangga " + model.FormatInt(*f.StepCount) + " anak tangga"
			}
			return -1.5, []AccessFactor{{Label: label, Kind: "negative"}}
		},
	},
	{
		kinds: []string{"elevator"},
		adjust: func(f FeatureEvidence) (float64, []AccessFactor) {
			switch f.Status {
			case "available":
				return 1.2, []AccessFactor{{Label: "Elevator tersedia", Kind: "positive"}}
			case "out_of_service":
				return -1.2, []AccessFactor{{Label: "Elevator sedang diperbaiki", Kind: "negative"}}
			default:
				return -1, []AccessFactor{{Label: "Elevator tidak tersedia", Kind: "negative"}}
			}
		},
	},
	{
		kinds: []string{"path_width"},
		adjust: func(f FeatureEvidence) (float64, []AccessFactor) {
			switch f.Status {
			case "accessible":
				return 1, []AccessFactor{{Label: "Lebar jalur aksesibel", Kind: "positive"}}
			case "limited":
				return -0.8, []AccessFactor{{Label: "Lebar jalur terbatas", Kind: "neutral"}}
			default:
				return -1.2, []AccessFactor{{Label: "Jalur terlalu sempit", Kind: "negative"}}
			}
		},
	},
	{
		kinds: []string{"surface_condition"},
		adjust: func(f FeatureEvidence) (float64, []AccessFactor) {
			switch f.Status {
			case "good":
				return 0.8, []AccessFactor{{Label: "Permukaan jalur baik", Kind: "positive"}}
			case "uneven":
				return -0.8, []AccessFactor{{Label: "Permukaan tidak rata", Kind: "neutral"}}
			default:
				return -1, []AccessFactor{{Label: "Permukaan jalur rusak", Kind: "negative"}}
			}
		},
	},
	{
		kinds: []string{"accessible_entrance"},
		adjust: func(f FeatureEvidence) (float64, []AccessFactor) {
			switch f.Status {
			case "accessible":
				return 1.2, []AccessFactor{{Label: "Akses masuk aksesibel", Kind: "positive"}}
			case "partially_accessible":
				return 0, []AccessFactor{{Label: "Akses masuk sebagian aksesibel", Kind: "neutral"}}
			default:
				return -1.5, []AccessFactor{{Label: "Akses masuk tidak aksesibel", Kind: "negative"}}
			}
		},
	},
}

var visualRules = []featureRule{
	{
		kinds: []string{"guiding_block"},
		adjust: func(f FeatureEvidence) (float64, []AccessFactor) {
			switch f.Status {
			case "available":
				return 1.2, []AccessFactor{{Label: "Guiding block tersedia", Kind: "positive"}}
			case "damaged":
				return -1, []AccessFactor{{Label: "Guiding block rusak", Kind: "negative"}}
			default:
				return -1.2, []AccessFactor{{Label: "Guiding block terputus", Kind: "negative"}}
			}
		},
	},
	{
		kinds: []string{"pedestrian_crossing"},
		adjust: func(f FeatureEvidence) (float64, []AccessFactor) {
			if f.Status == "signalized" || f.Status == "available" {
				return 1, []AccessFactor{{Label: "Zebra crossing dengan lampu", Kind: "positive"}}
			}
			if f.Status == "non_signalized" {
				return -0.5, []AccessFactor{{Label: "Zebra crossing tanpa lampu", Kind: "neutral"}}
			}
			return -0.8, []AccessFactor{{Label: "Zebra crossing tidak tersedia", Kind: "negative"}}
		},
	},
	{
		kinds: []string{"audio_crossing_signal"},
		adjust: func(f FeatureEvidence) (float64, []AccessFactor) {
			if f.Status == "available" {
				return 1.2, []AccessFactor{{Label: "Sinyal suara penyeberangan tersedia", Kind: "positive"}}
			}
			return -1, []AccessFactor{{Label: "Sinyal suara penyeberangan tidak tersedia", Kind: "negative"}}
		},
	},
	{
		kinds: []string{"obstacle"},
		adjust: func(f FeatureEvidence) (float64, []AccessFactor) {
			return -1, []AccessFactor{{Label: "Hambatan di jalur (" + f.Status + ")", Kind: "negative"}}
		},
	},
	{
		kinds: []string{"surface_hazard"},
		adjust: func(f FeatureEvidence) (float64, []AccessFactor) {
			return -1, []AccessFactor{{Label: "Bahaya permukaan: " + f.Status, Kind: "negative"}}
		},
	},
}

// EvaluateAccessibility scores a place for a profile.
func EvaluateAccessibility(profile string, entrances []EntranceEvidence, features []FeatureEvidence, freshness string) AccessEvaluation {
	rules := mobilityRules
	featureKinds := mobilityKinds
	if profile != "WHEELCHAIR_MOBILITY" {
		rules = visualRules
		featureKinds = visualKinds
	}

	delta := 0.0
	var factors []AccessFactor
	verifiedCount := 0

	if profile == "WHEELCHAIR_MOBILITY" {
		for _, entrance := range entrances {
			entranceResult, entranceFactors := entranceDeltas(entrance)
			delta += entranceResult
			factors = append(factors, entranceFactors...)
			factors = append(factors, entranceWidthFactor(entrance)...)
		}
	}

	var relevant []FeatureEvidence
	for _, f := range features {
		for _, kind := range featureKinds {
			if f.Kind == kind {
				relevant = append(relevant, f)
				break
			}
		}
	}

	for _, feature := range relevant {
		for _, rule := range rules {
			matched := false
			for _, kind := range rule.kinds {
				if feature.Kind == kind {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
			result, ruleFactors := rule.adjust(feature)
			delta += result
			factors = append(factors, ruleFactors...)
			if feature.Verification == "VERIFIED" {
				verifiedCount++
			}
			break
		}
	}

	evidenceCount := len(relevant)
	if profile == "WHEELCHAIR_MOBILITY" {
		evidenceCount += len(entrances)
	}
	var score *int
	if evidenceCount != 0 {
		s := clampScore(baseScore + delta)
		score = &s
	}
	confidence := confidenceFor(len(factors), verifiedCount > 0)

	return AccessEvaluation{
		Score:      score,
		Label:      scoreLabel(score),
		Level:      scoreLevel(score),
		Factors:    factors,
		Confidence: confidence,
		Freshness:  freshness,
		Scale:      100,
	}
}

// SummaryScore resolves the display score for a profile.
func SummaryScore(score map[string]*int, profile string) (int, string) {
	if profile == "WHEELCHAIR_MOBILITY" {
		value := score["mobility"]
		if value == nil {
			return 0, "Belum dinilai"
		}
		return *value, ScoreToLabel(*value)
	}
	value := score["visual"]
	if value == nil {
		return 0, "Belum dinilai"
	}
	return *value, ScoreToLabel(*value)
}

// ScoreToLabel returns the human score label.
func ScoreToLabel(score int) string {
	if score >= 80 {
		return "Sangat Aksesibel"
	}
	if score >= 60 {
		return "Aksesibel Sebagian"
	}
	if score >= 40 {
		return "Aksesibilitas Terbatas"
	}
	return "Hambatan Signifikan"
}
