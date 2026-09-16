package main

type LayerStatus struct {
	Symbol string
	Label  string
	Tone   string
}

type LayerMeta struct {
	Label    string
	Profile  string
	Statuses map[string]LayerStatus
}

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
			"available":       {Symbol: "≡", Label: "Ada", Tone: "success"},
			"signalized":      {Symbol: "●", Label: "Ada dengan lampu", Tone: "success"},
			"non_signalized":  {Symbol: "○", Label: "Tanpa lampu", Tone: "warning"},
			"unknown":         {Symbol: "?", Label: "Tidak diketahui", Tone: "neutral"},
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

func layersForProfile(profile string) []string {
	var out []string
	for kind, meta := range LAYERS {
		if profile == "" || meta.Profile == profile {
			out = append(out, kind)
		}
	}
	return out
}

func statusMeta(kind, status string) LayerStatus {
	if meta, ok := LAYERS[kind]; ok {
		if s, ok := meta.Statuses[status]; ok {
			return s
		}
	}
	return LayerStatus{Symbol: "?", Label: "Tidak diketahui", Tone: "neutral"}
}

var REPORT_CATEGORIES = []struct{ Value, Label string }{
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

func reportCategoryLabel(category string) string {
	for _, c := range REPORT_CATEGORIES {
		if c.Value == category {
			return c.Label
		}
	}
	return "Lainnya"
}

func isReportCategory(value string) bool {
	for _, c := range REPORT_CATEGORIES {
		if c.Value == value {
			return true
		}
	}
	return false
}

var REPORT_STATUS_META = map[string]struct{ Label, Tone, Symbol string }{
	"PENDING":  {Label: "Menunggu verifikasi", Tone: "neutral", Symbol: "⌛"},
	"VERIFIED": {Label: "Terverifikasi", Tone: "success", Symbol: "✓"},
	"ACTIVE":   {Label: "Masih relevan", Tone: "success", Symbol: "✓"},
	"OUTDATED": {Label: "Mungkin usang", Tone: "warning", Symbol: "⚠"},
	"RESOLVED": {Label: "Sudah diperbaiki", Tone: "neutral", Symbol: "✓"},
	"REJECTED": {Label: "Ditolak", Tone: "danger", Symbol: "✕"},
}

var ACCESSIBILITY_PROFILES = []string{"VISUAL_NAVIGATION", "WHEELCHAIR_MOBILITY"}

var SEVERITIES = []string{"HIGH", "MEDIUM", "LOW"}

var STATUSES = []string{"PENDING", "VERIFIED", "ACTIVE", "OUTDATED", "RESOLVED", "REJECTED"}

var VERIFICATION_TYPES = []string{"CONFIRMED", "CHANGED", "RESOLVED"}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024

var ALLOWED_PHOTO_TYPES = []string{"image/png", "image/jpeg", "image/webp"}