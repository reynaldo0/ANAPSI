package service

import (
	"regexp"
	"strings"

	"blindspot/backend/internal/model"
)

// StructuredReport is the extracted report fields from a voice transcript.
type StructuredReport struct {
	Category          string   `json:"category"`
	Description       string   `json:"description"`
	Severity          string   `json:"severity"`
	AffectedProfiles  []string `json:"affectedProfiles"`
	SuggestedLocation *string  `json:"suggestedLocation"`
}

func normalizeTextLower(text string) string {
	return strings.ToLower(strings.TrimSpace(text))
}

func detectCategory(text string) string {
	t := normalizeTextLower(text)
	if hasAny(t, []string{"guiding block", "guiding", "taktil", "paving kuning", "marka taktil"}) {
		return "GUIDING_BLOCK"
	}
	if hasAny(t, []string{"ramp"}) {
		if hasAny(t, []string{"rusak", "retak", "berlubang", "patah", "pecah"}) {
			return "DAMAGED_RAMP"
		}
		return "RAMP"
	}
	if hasAny(t, []string{"tangga", "anak tangga", "stepping"}) {
		return "STAIRS"
	}
	if hasAny(t, []string{"trotoar", "trottoir", "pinggir jalan", "jalan setapak"}) {
		return "DAMAGED_SIDEWALK"
	}
	if hasAny(t, []string{"elevator", "lift"}) {
		return "ELEVATOR"
	}
	if hasAny(t, []string{"ramah", "aksesibel", "tersedia", "toilet", "kursi roda"}) {
		return "ACCESSIBLE_FACILITY"
	}
	if hasAny(t, []string{"hambatan", "penghalang", "obstacle", "menghalangi", "terhalang", "barikade"}) {
		return "OBSTACLE"
	}
	return "OTHER"
}

func detectSeverity(text string) string {
	t := normalizeTextLower(text)
	if hasAny(t, []string{"darurat", "bahaya", "sangat parah", "parah", "kritis", "mendesak"}) {
		return "HIGH"
	}
	if hasAny(t, []string{"ringan", "kecil", "sedikit", "minor", "biasa"}) {
		return "LOW"
	}
	return "MEDIUM"
}

func detectProfiles(text string) []string {
	t := normalizeTextLower(text)
	wheelchair := hasAny(t, []string{"kursi roda", "tunadaksa", "wheelchair", "difabel duduk", "naik kursi"})
	visual := hasAny(t, []string{"tunanetra", "buta", "visual", "tongkat", "low vision", "netra"})
	if wheelchair && visual {
		return []string{"BOTH"}
	}
	if wheelchair {
		return []string{"WHEELCHAIR_MOBILITY"}
	}
	if visual {
		return []string{"VISUAL_NAVIGATION"}
	}
	return []string{}
}

func detectLocation(text string) *string {
	t := strings.TrimSpace(text)
	re := regexp.MustCompile(`(?i)(?:di (dekat|sekitar|depan|belakang|samping|area|kawasan)[^.,]*)`)
	near := re.FindString(t)
	if near != "" {
		s := near
		return &s
	}
	re2 := regexp.MustCompile(`(?i)(?:tangga|pintu|depan|halte|stasiun|perempatan|trotoar|jalur)[^.,]{0,60}`)
	mentions := re2.FindString(t)
	if mentions != "" {
		s := strings.TrimSpace(mentions)
		return &s
	}
	return nil
}

// StructureReportTranscript extracts structured fields from a transcript.
func StructureReportTranscript(transcript string) StructuredReport {
	desc := strings.TrimSpace(transcript)
	loc := detectLocation(transcript)
	return StructuredReport{
		Category:          detectCategory(transcript),
		Description:       desc,
		Severity:          detectSeverity(transcript),
		AffectedProfiles:  detectProfiles(transcript),
		SuggestedLocation: loc,
	}
}

func categoryLabel(category string) string {
	return model.ReportCategoryLabel(category)
}
