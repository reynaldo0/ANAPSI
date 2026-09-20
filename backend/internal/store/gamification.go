package store

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"anapsi/backend/internal/database"
	"anapsi/backend/internal/util"
)

// BadgeDef describes a single gamification badge.
type BadgeDef struct {
	ID          string
	Name        string
	Description string
	Icon        string
	Tier        string
}

// BADGES is the badge catalog.
var BADGES = []BadgeDef{
	{ID: "FIRST_REPORT", Name: "Bintang Pelapor", Description: "Kirim laporan pertamamu.", Icon: "🌟", Tier: "bronze"},
	{ID: "THREE_REPORTS", Name: "Penjaga Aksesibilitas", Description: "Kirim 3 laporan terbukti.", Icon: "🛡️", Tier: "silver"},
	{ID: "FIVE_REPORTS", Name: "Pahlawan Trotoar", Description: "Kirim 5 laporan atau lebih.", Icon: "🏅", Tier: "gold"},
	{ID: "PHOTO_REPORT", Name: "Mata Elang", Description: "Lapor dengan foto bukti.", Icon: "📸", Tier: "special"},
	{ID: "HIGH_SEVERITY", Name: "Pemberani", Description: "Laporkan kondisi berbahaya.", Icon: "⚠️", Tier: "special"},
	{ID: "VERIFIED_CONTRIBUTION", Name: "Terpercaya", Description: "Laporanmu diverifikasi komunitas.", Icon: "✅", Tier: "special"},
}

func badgeByID(id string) BadgeDef {
	for _, b := range BADGES {
		if b.ID == id {
			return b
		}
	}
	return BADGES[0]
}

// AccountStore is the persisted gamification ledger for one reporter key.
type AccountStore struct {
	ReporterName    string
	Reports         int
	VerifiedReports int
	Points          int
	Badges          []string
}

// AwardInput describes a report for point/badge awarding.
type AwardInput struct {
	Category string
	Severity string
	HasPhoto bool
}

var pointsByCategory = map[string]int{
	"STAIRS": 10, "DAMAGED_RAMP": 15, "RAMP": 5, "GUIDING_BLOCK": 15,
	"DAMAGED_SIDEWALK": 15, "OBSTACLE": 12, "ELEVATOR": 15,
	"ACCESSIBLE_FACILITY": 5, "OTHER": 5,
}

func severityBonus(severity string) int {
	switch severity {
	case "HIGH":
		return 5
	case "MEDIUM":
		return 2
	default:
		return 0
	}
}

func collectBadges(account AccountStore, pending *AwardInput, existing []string) []string {
	seen := map[string]bool{}
	var earned []string
	for _, b := range existing {
		if !seen[b] {
			seen[b] = true
			earned = append(earned, b)
		}
	}
	add := func(id string) {
		if !seen[id] {
			seen[id] = true
			earned = append(earned, id)
		}
	}
	if account.Reports >= 1 {
		add("FIRST_REPORT")
	}
	if account.Reports >= 3 {
		add("THREE_REPORTS")
	}
	if account.Reports >= 5 {
		add("FIVE_REPORTS")
	}
	if account.VerifiedReports >= 1 {
		add("VERIFIED_CONTRIBUTION")
	}
	if pending != nil && pending.HasPhoto {
		add("PHOTO_REPORT")
	}
	if pending != nil && pending.Severity == "HIGH" {
		add("HIGH_SEVERITY")
	}
	return earned
}

// GamificationStats is the API snapshot of a reporter's gamification state.
type GamificationStats struct {
	ReporterId      string   `json:"reporterId"`
	ReporterName    *string  `json:"reporterName"`
	Reports         int      `json:"reports"`
	VerifiedReports int      `json:"verifiedReports"`
	Points          int      `json:"points"`
	Badges          []string `json:"badges"`
	NewlyEarned     []string `json:"newlyEarned"`
	PointsEarned    int      `json:"pointsEarned"`
}

func snapshot(reporterId string, account AccountStore, newlyEarned []string, pointsEarned int) GamificationStats {
	var name *string
	if account.ReporterName != "" {
		n := account.ReporterName
		name = &n
	}
	return GamificationStats{
		ReporterId:      reporterId,
		ReporterName:    name,
		Reports:         account.Reports,
		VerifiedReports: account.VerifiedReports,
		Points:          account.Points,
		Badges:          account.Badges,
		NewlyEarned:     newlyEarned,
		PointsEarned:    pointsEarned,
	}
}

func loadAccountStore(reporterId string) (AccountStore, error) {
	var account AccountStore
	row := database.DB.QueryRow(`SELECT reporterName, reports, verifiedReports, points, badges FROM gamification WHERE reporterKey = ?`, reporterId)
	var name sql.NullString
	var badgesJSON string
	err := row.Scan(&name, &account.Reports, &account.VerifiedReports, &account.Points, &badgesJSON)
	if err != nil {
		return account, err
	}
	account.ReporterName = name.String
	_ = json.Unmarshal([]byte(badgesJSON), &account.Badges)
	return account, nil
}

func saveAccountStore(reporterId string, account AccountStore) error {
	badgesJSON, _ := json.Marshal(account.Badges)
	var name interface{}
	if account.ReporterName != "" {
		name = account.ReporterName
	}
	_, err := database.DB.Exec(
		`INSERT INTO gamification (reporterKey, reporterName, reports, verifiedReports, points, badges, updatedAt)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE reporterName=VALUES(reporterName), reports=VALUES(reports), verifiedReports=VALUES(verifiedReports), points=VALUES(points), badges=VALUES(badges), updatedAt=VALUES(updatedAt)`,
		reporterId, name, account.Reports, account.VerifiedReports, account.Points, string(badgesJSON), util.NowMySQL(),
	)
	return err
}

// AwardReportPoints credits a report to the reporter's gamification account.
func AwardReportPoints(reporterId string, reporterName *string, input AwardInput) (GamificationStats, error) {
	account, err := loadAccountStore(reporterId)
	if err != nil {
		account = AccountStore{Reports: 0, Points: 0}
	}
	if reporterName != nil && *reporterName != "" {
		account.ReporterName = *reporterName
	}
	earned := pointsByCategory[input.Category]
	if earned == 0 {
		earned = 5
	}
	earnedTotal := earned + severityBonus(input.Severity)
	if input.HasPhoto {
		earnedTotal += 5
	}
	account.Reports++
	account.Points += earnedTotal

	pending := &input
	target := collectBadges(account, pending, account.Badges)
	existingSet := map[string]bool{}
	for _, b := range account.Badges {
		existingSet[b] = true
	}
	var newlyEarned []string
	for _, b := range target {
		if !existingSet[b] {
			newlyEarned = append(newlyEarned, b)
		}
	}
	account.Badges = target
	if err := saveAccountStore(reporterId, account); err != nil {
		return GamificationStats{}, fmt.Errorf("award gamification: %w", err)
	}
	return snapshot(reporterId, account, newlyEarned, earnedTotal), nil
}

// MarkReportVerified increments the verified-count for a reporter.
func MarkReportVerified(reporterId string) (GamificationStats, error) {
	account, err := loadAccountStore(reporterId)
	if err != nil {
		return snapshot(reporterId, AccountStore{}, nil, 0), nil
	}
	account.VerifiedReports++
	target := collectBadges(account, nil, account.Badges)
	existingSet := map[string]bool{}
	for _, b := range account.Badges {
		existingSet[b] = true
	}
	var newlyEarned []string
	for _, b := range target {
		if !existingSet[b] && b == "VERIFIED_CONTRIBUTION" {
			newlyEarned = append(newlyEarned, b)
		}
	}
	account.Badges = target
	if err := saveAccountStore(reporterId, account); err != nil {
		return GamificationStats{}, err
	}
	return snapshot(reporterId, account, newlyEarned, 0), nil
}

// GetGamificationStats returns the current snapshot (nil when no account yet).
func GetGamificationStats(reporterId string) *GamificationStats {
	account, err := loadAccountStore(reporterId)
	if err != nil {
		return nil
	}
	s := snapshot(reporterId, account, nil, 0)
	return &s
}

// ListGamificationRanking returns the leaderboard, ordered by points.
func ListGamificationRanking(limit int) []map[string]interface{} {
	rows, err := database.DB.Query(`SELECT reporterName, reports, points FROM gamification ORDER BY points DESC LIMIT ?`, limit)
	if err != nil {
		return []map[string]interface{}{}
	}
	defer rows.Close()
	var out []map[string]interface{}
	for rows.Next() {
		var name sql.NullString
		var reports, points int
		if err := rows.Scan(&name, &reports, &points); err != nil {
			continue
		}
		n := name.String
		if n == "" {
			n = "Anonim"
		}
		out = append(out, map[string]interface{}{"reporterName": n, "reports": reports, "points": points})
	}
	return out
}

// HasGamificationAccount reports whether a reporter ledger exists.
func HasGamificationAccount(reporterId string) bool {
	_, err := loadAccountStore(reporterId)
	return err == nil
}
