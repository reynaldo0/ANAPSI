// Package model holds the shared domain types and pure helpers used by every
// layer. It must not import other internal packages (leaf dependency).
package model

import "math"

const earthRadiusKm = 6371

// LatLng is a geographic coordinate in WGS-84.
type LatLng struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

func toRad(deg float64) float64 { return deg * math.Pi / 180 }

// HaversineKm returns the great-circle distance between two points in km.
func HaversineKm(a, b LatLng) float64 {
	dLat := toRad(b.Lat - a.Lat)
	dLng := toRad(b.Lng - a.Lng)
	s := math.Pow(math.Sin(dLat/2), 2) +
		math.Cos(toRad(a.Lat))*math.Cos(toRad(b.Lat))*math.Pow(math.Sin(dLng/2), 2)
	return 2 * earthRadiusKm * math.Asin(math.Min(1, math.Sqrt(s)))
}

// FormatDistance renders a distance in km as a short, human-friendly string.
func FormatDistance(km float64) string {
	if km < 1 {
		m := math.Max(1, math.Round(km*1000))
		return "≈ " + FormatInt(int(m)) + " m"
	}
	return "≈ " + FormatFixed(km, 1) + " km"
}

// FormatInt renders an int without locale separators.
func FormatInt(v int) string {
	if v == 0 {
		return "0"
	}
	neg := v < 0
	if neg {
		v = -v
	}
	var digits []byte
	for v > 0 {
		digits = append([]byte{byte('0' + v%10)}, digits...)
		v /= 10
	}
	if neg {
		return "-" + string(digits)
	}
	return string(digits)
}

// FormatFixed renders a float rounded to the given number of decimals.
func FormatFixed(v float64, decimals int) string {
	scale := 1.0
	for i := 0; i < decimals; i++ {
		scale *= 10
	}
	rounded := math.Round(v*scale) / scale
	return FormatFloat(rounded)
}

// FormatFloat renders a float using minimal precision without math/big.
func FormatFloat(v float64) string {
	if v == math.Trunc(v) && math.Abs(v) < 1e15 {
		return FormatInt(int(v))
	}
	neg := v < 0
	if neg {
		v = -v
	}
	const maxPrec = 10
	var buf []byte
	for prec := 1; prec <= maxPrec; prec++ {
		scale := 1.0
		for i := 0; i < prec; i++ {
			scale *= 10
		}
		rounded := math.Round(v*scale) / scale
		if math.Abs(rounded-v) < 0.5/scale {
			intPart := int(math.Trunc(rounded))
			frac := int(math.Round((rounded - math.Trunc(rounded)) * scale))
			buf = append(buf, []byte(FormatInt(intPart))...)
			buf = append(buf, '.')
			fracStr := FormatInt(frac)
			for i := len(fracStr); i < prec; i++ {
				buf = append(buf, '0')
			}
			buf = append(buf, []byte(fracStr)...)
			if neg {
				return "-" + string(buf)
			}
			return string(buf)
		}
	}
	s := FormatInt(int(v)) + "." + FormatInt(int((v-math.Trunc(v))*1e6))
	if neg {
		return "-" + s
	}
	return s
}

// DistanceInfo pairs a raw km value with a rendered label.
type DistanceInfo struct {
	Km    float64 `json:"km"`
	Label string  `json:"label"`
}

// DistanceFrom computes the distance from origin (nil means unknown).
func DistanceFrom(origin *LatLng, target LatLng) *DistanceInfo {
	if origin == nil {
		return nil
	}
	km := HaversineKm(*origin, target)
	return &DistanceInfo{Km: km, Label: FormatDistance(km)}
}

// IsWithinRadius reports whether target lies within radiusKm of origin.
// A nil origin means "no constraint".
func IsWithinRadius(origin *LatLng, target LatLng, radiusKm float64) bool {
	if origin == nil {
		return true
	}
	return HaversineKm(*origin, target) <= radiusKm
}
