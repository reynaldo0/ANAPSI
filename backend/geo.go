package main

import "math"

const earthRadiusKm = 6371

type LatLng struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

func toRad(deg float64) float64 { return deg * math.Pi / 180 }

func haversineKm(a, b LatLng) float64 {
	dLat := toRad(b.Lat - a.Lat)
	dLng := toRad(b.Lng - a.Lng)
	s := math.Pow(math.Sin(dLat/2), 2) +
		math.Cos(toRad(a.Lat))*math.Cos(toRad(b.Lat))*math.Pow(math.Sin(dLng/2), 2)
	return 2 * earthRadiusKm * math.Asin(math.Min(1, math.Sqrt(s)))
}

func formatDistance(km float64) string {
	if km < 1 {
		m := math.Max(1, math.Round(km*1000))
		return "≈ " + formatInt(int(m)) + " m"
	}
	return "≈ " + formatFixed(km, 1) + " km"
}

func formatInt(v int) string {
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

func formatFixed(v float64, decimals int) string {
	scale := 1.0
	for i := 0; i < decimals; i++ {
		scale *= 10
	}
	rounded := math.Round(v*scale) / scale
	s := formatFloat(rounded)
	return s
}

func formatFloat(v float64) string {
	// minimal float formatting without math/big
	if v == math.Trunc(v) && math.Abs(v) < 1e15 {
		return formatInt(int(v))
	}
	neg := v < 0
	if neg {
		v = -v
	}
	// find decimal places needed (up to 10)
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
			buf = append(buf, []byte(formatInt(intPart))...)
			buf = append(buf, '.')
			fracStr := formatInt(frac)
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
	// fallback
	s := formatInt(int(v)) + "." + formatInt(int((v-math.Trunc(v))*1e6))
	if neg {
		return "-" + s
	}
	return s
}

type DistanceInfo struct {
	Km    float64 `json:"km"`
	Label string  `json:"label"`
}

func distanceFrom(origin *LatLng, target LatLng) *DistanceInfo {
	if origin == nil {
		return nil
	}
	km := haversineKm(*origin, target)
	return &DistanceInfo{Km: km, Label: formatDistance(km)}
}

func isWithinRadius(origin *LatLng, target LatLng, radiusKm float64) bool {
	if origin == nil {
		return true
	}
	return haversineKm(*origin, target) <= radiusKm
}