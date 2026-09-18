package model

// LayerStatus is the display metadata for a single feature kind/status pair.
type LayerStatus struct {
	Symbol string
	Label  string
	Tone   string
}

// LayerMeta describes an accessibility feature layer.
type LayerMeta struct {
	Label    string
	Profile  string
	Statuses map[string]LayerStatus
}

// LAYERS is the catalog of accessibility map layers. Profiles:
// VISUAL_NAVIGATION or WHEELCHAIR_MOBILITY.
var LAYERS = map[string]*LayerMeta{
	"guiding_block": {
		Label: "Guiding Block", Profile: "VISUAL_NAVIGATION",
		Statuses: map[string]LayerStatus{
			"available":   {Symbol: "▮", Label: "Tersedia", Tone: "success"},
			"damaged":     {Symbol: "▮⌁", Label: "Rusak", Tone: "danger"},
			"interrupted": {Symbol: "- - -", Label: "Terputus", Tone: "warning"},
			"unknown":     {Symbol: "?", Label: "Tidak diketahui", Tone: "neutral"},
		},
	},
	"pedestrian_crossing": {
		Label: "Zebra Crossing", Profile: "VISUAL_NAVIGATION",
		Statuses: map[string]LayerStatus{
			"available":      {Symbol: "≡", Label: "Ada", Tone: "success"},
			"signalized":     {Symbol: "●", Label: "Ada dengan lampu", Tone: "success"},
			"non_signalized": {Symbol: "○", Label: "Tanpa lampu", Tone: "warning"},
			"unknown":        {Symbol: "?", Label: "Tidak diketahui", Tone: "neutral"},
		},
	},
	"audio_crossing_signal": {
		Label: "Sinyal Suara Penyeberangan", Profile: "VISUAL_NAVIGATION",
		Statuses: map[string]LayerStatus{
			"available":   {Symbol: "🔊", Label: "Tersedia", Tone: "success"},
			"unavailable": {Symbol: "✕", Label: "Tidak tersedia", Tone: "danger"},
			"unknown":     {Symbol: "?", Label: "Tidak diketahui", Tone: "neutral"},
		},
	},
	"obstacle": {
		Label: "Hambatan", Profile: "VISUAL_NAVIGATION",
		Statuses: map[string]LayerStatus{
			"construction":     {Symbol: "🚧", Label: "Konstruksi", Tone: "danger"},
			"permanent":        {Symbol: "⛔", Label: "Permanen", Tone: "danger"},
			"temporary":        {Symbol: "🟨", Label: "Sementara", Tone: "warning"},
			"street_furniture": {Symbol: "◎", Label: "Fasilitas jalan", Tone: "warning"},
			"other":            {Symbol: "⚠", Label: "Lainnya", Tone: "warning"},
		},
	},
	"surface_hazard": {
		Label: "Bahaya Permukaan", Profile: "VISUAL_NAVIGATION",
		Statuses: map[string]LayerStatus{
			"hole":             {Symbol: "◌", Label: "Lubang", Tone: "danger"},
			"damaged_sidewalk": {Symbol: "▥", Label: "Trotoar rusak", Tone: "danger"},
			"uneven_surface":   {Symbol: "⤫", Label: "Permukaan tidak rata", Tone: "warning"},
			"other":            {Symbol: "⚠", Label: "Lainnya", Tone: "warning"},
		},
	},
	"ramp": {
		Label: "Ramp", Profile: "WHEELCHAIR_MOBILITY",
		Statuses: map[string]LayerStatus{
			"available": {Symbol: "↘", Label: "Tersedia", Tone: "success"},
			"damaged":   {Symbol: "↘⚠", Label: "Rusak", Tone: "danger"},
			"unknown":   {Symbol: "?", Label: "Tidak diketahui", Tone: "neutral"},
		},
	},
	"stairs": {
		Label: "Tangga", Profile: "WHEELCHAIR_MOBILITY",
		Statuses: map[string]LayerStatus{
			"none":    {Symbol: "✓", Label: "Tanpa tangga", Tone: "success"},
			"present": {Symbol: "≡", Label: "Ada tangga", Tone: "danger"},
			"unknown": {Symbol: "?", Label: "Tidak diketahui", Tone: "neutral"},
		},
	},
	"elevator": {
		Label: "Elevator", Profile: "WHEELCHAIR_MOBILITY",
		Statuses: map[string]LayerStatus{
			"available":      {Symbol: "↕", Label: "Tersedia", Tone: "success"},
			"unavailable":    {Symbol: "✕", Label: "Tidak tersedia", Tone: "danger"},
			"out_of_service": {Symbol: "🚧", Label: "Sedang diperbaiki", Tone: "danger"},
			"unknown":        {Symbol: "?", Label: "Tidak diketahui", Tone: "neutral"},
		},
	},
	"path_width": {
		Label: "Lebar Jalur", Profile: "WHEELCHAIR_MOBILITY",
		Statuses: map[string]LayerStatus{
			"accessible": {Symbol: "⇔", Label: "Aksesibel", Tone: "success"},
			"limited":    {Symbol: "↔", Label: "Terbatas", Tone: "warning"},
			"too_narrow": {Symbol: "╳", Label: "Terlalu sempit", Tone: "danger"},
			"unknown":    {Symbol: "?", Label: "Tidak diketahui", Tone: "neutral"},
		},
	},
	"surface_condition": {
		Label: "Kondisi Permukaan", Profile: "WHEELCHAIR_MOBILITY",
		Statuses: map[string]LayerStatus{
			"good":    {Symbol: "✓", Label: "Baik", Tone: "success"},
			"uneven":  {Symbol: "⤫", Label: "Tidak rata", Tone: "warning"},
			"damaged": {Symbol: "▥", Label: "Rusak", Tone: "danger"},
			"blocked": {Symbol: "✕", Label: "Terhalang", Tone: "danger"},
		},
	},
	"accessible_entrance": {
		Label: "Akses Masuk", Profile: "WHEELCHAIR_MOBILITY",
		Statuses: map[string]LayerStatus{
			"accessible":           {Symbol: "↘", Label: "Aksesibel", Tone: "success"},
			"partially_accessible": {Symbol: "⚠", Label: "Sebagian aksesibel", Tone: "warning"},
			"not_accessible":       {Symbol: "✕", Label: "Tidak aksesibel", Tone: "danger"},
			"unknown":              {Symbol: "?", Label: "Tidak diketahui", Tone: "neutral"},
		},
	},
}

// LayersForProfile returns the feature kinds visible for a profile (or all
// when profile is empty).
func LayersForProfile(profile string) []string {
	var out []string
	for kind, meta := range LAYERS {
		if profile == "" || meta.Profile == profile {
			out = append(out, kind)
		}
	}
	return out
}

// StatusMeta returns the display metadata for a feature kind/status pair.
func StatusMeta(kind, status string) LayerStatus {
	if meta, ok := LAYERS[kind]; ok {
		if s, ok := meta.Statuses[status]; ok {
			return s
		}
	}
	return LayerStatus{Symbol: "?", Label: "Tidak diketahui", Tone: "neutral"}
}

// ReportCategory is a reportable accessibility issue.
type ReportCategory struct {
	Value string
	Label string
}

// REPORT_CATEGORIES lists the selectable report categories.
var REPORT_CATEGORIES = []ReportCategory{
	{"STAIRS", "Tangga (tanpa ramp/tangan)"},
	{"DAMAGED_RAMP", "Ramp rusak"},
	{"RAMP", "Ramp tersedia"},
	{"GUIDING_BLOCK", "Guiding block hilang/terputus"},
	{"DAMAGED_SIDEWALK", "Trotoar rusak"},
	{"OBSTACLE", "Hambatan di jalur"},
	{"ELEVATOR", "Elevator tidak berfungsi"},
	{"ACCESSIBLE_FACILITY", "Fasilitas aksesibel tersedia"},
	{"OTHER", "Lainnya"},
}

// ReportCategoryLabel returns the human label for a category value.
func ReportCategoryLabel(category string) string {
	for _, c := range REPORT_CATEGORIES {
		if c.Value == category {
			return c.Label
		}
	}
	return "Lainnya"
}

// IsReportCategory reports whether value is a known category.
func IsReportCategory(value string) bool {
	for _, c := range REPORT_CATEGORIES {
		if c.Value == value {
			return true
		}
	}
	return false
}

// REPORT_STATUS_META maps a report status to display metadata.
var REPORT_STATUS_META = map[string]struct{ Label, Tone, Symbol string }{
	"PENDING":  {Label: "Menunggu verifikasi", Tone: "neutral", Symbol: "⌛"},
	"VERIFIED": {Label: "Terverifikasi", Tone: "success", Symbol: "✓"},
	"ACTIVE":   {Label: "Masih relevan", Tone: "success", Symbol: "✓"},
	"OUTDATED": {Label: "Mungkin usang", Tone: "warning", Symbol: "⚠"},
	"RESOLVED": {Label: "Sudah diperbaiki", Tone: "neutral", Symbol: "✓"},
	"REJECTED": {Label: "Ditolak", Tone: "danger", Symbol: "✕"},
}

// Known enum values.
var (
	ACCESSIBILITY_PROFILES = []string{"VISUAL_NAVIGATION", "WHEELCHAIR_MOBILITY"}
	SEVERITIES             = []string{"HIGH", "MEDIUM", "LOW"}
	STATUSES               = []string{"PENDING", "VERIFIED", "ACTIVE", "OUTDATED", "RESOLVED", "REJECTED"}
	VERIFICATION_TYPES     = []string{"CONFIRMED", "CHANGED", "RESOLVED"}
)

// IsAccessibilityProfile reports whether value is a known accessibility profile.
func IsAccessibilityProfile(value string) bool {
	for _, p := range ACCESSIBILITY_PROFILES {
		if p == value {
			return true
		}
	}
	return false
}

// IsStatus reports whether value is a known report status.
func IsStatus(s string) bool {
	for _, x := range STATUSES {
		if x == s {
			return true
		}
	}
	return false
}

// IsSeverity reports whether value is a known severity.
func IsSeverity(s string) bool {
	for _, x := range SEVERITIES {
		if x == s {
			return true
		}
	}
	return false
}

// IsVerificationType reports whether value is a known verification type.
func IsVerificationType(s string) bool {
	for _, x := range VERIFICATION_TYPES {
		if x == s {
			return true
		}
	}
	return false
}

// IsAffectedProfile reports whether value is a valid affected-profiles token.
func IsAffectedProfile(s string) bool {
	return s == "BOTH" || s == "WHEELCHAIR_MOBILITY" || s == "VISUAL_NAVIGATION"
}

// Photo upload limits.
const (
	MaxPhotoBytes             = 5 * 1024 * 1024
	MaxVerificationsPerReport = 30
	MaxPhotosPerReport        = 5
)

// ALLOWED_PHOTO_TYPES lists the MIME types accepted for report photos.
var ALLOWED_PHOTO_TYPES = []string{"image/png", "image/jpeg", "image/webp"}

// ReportStatusLabel returns the human label for a report status.
func ReportStatusLabel(status string) string {
	if m, ok := REPORT_STATUS_META[status]; ok {
		return m.Label
	}
	return status
}
