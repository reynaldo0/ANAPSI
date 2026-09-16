package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
)

const maxVerificationsPerReport = 30
const maxPhotosPerReport = 5

type ReportMediaInfo struct {
	ID      string  `json:"id"`
	Kind    string  `json:"kind"`
	URL     string  `json:"url"`
	Caption *string `json:"caption"`
}

type ReportVerificationInfo struct {
	ID      string  `json:"id"`
	Type    string  `json:"type"`
	Comment *string `json:"comment"`
	User    *string `json:"userName"`
	At      string  `json:"at"`
}

type ReportDetail struct {
	ID               string                  `json:"id"`
	Category         string                  `json:"category"`
	CategoryLabel    string                  `json:"categoryLabel"`
	Description      string                  `json:"description"`
	Severity         string                  `json:"severity"`
	AffectedProfiles []string                `json:"affectedProfiles"`
	PlaceID          *string                 `json:"placeId"`
	PlaceName        *string                 `json:"placeName"`
	Latitude         *float64                `json:"latitude"`
	Longitude        *float64                `json:"longitude"`
	Address          *string                 `json:"address"`
	ReporterName     *string                 `json:"reporterName"`
	Status           string                  `json:"status"`
	Verification     string                  `json:"verification"`
	CreatedAt        string                  `json:"createdAt"`
	UpdatedAt        string                  `json:"updatedAt"`
	Media            []ReportMediaInfo       `json:"media"`
	VerificationCount int                   `json:"verificationCount"`
	LastVerifiedAt   *string                 `json:"lastVerifiedAt"`
	Verifications    []ReportVerificationInfo `json:"verifications"`
	AISuggested      bool                    `json:"aiSuggested"`
	ModerationNotes  *string                 `json:"moderationNotes"`
	Source           string                  `json:"source"`
}

type verificationRow struct {
	id               string
	verificationType string
	comment          *string
	verifiedAt       *string
	userName         *string
}

type loadedReport struct {
	detail       ReportDetail
	authorID     *string
	reporterID   *string
	verifications []verificationRow
}

func reportStatusMeta(status string) string {
	if m, ok := REPORT_STATUS_META[status]; ok {
		return m.Label
	}
	return status
}

func isStatus(s string) bool {
	for _, x := range STATUSES {
		if x == s {
			return true
		}
	}
	return false
}

func isSeverity(s string) bool {
	for _, x := range SEVERITIES {
		if x == s {
			return true
		}
	}
	return false
}

func isVerificationType(s string) bool {
	for _, x := range VERIFICATION_TYPES {
		if x == s {
			return true
		}
	}
	return false
}

func isAffectedProfile(s string) bool {
	return s == "BOTH" || s == "WHEELCHAIR_MOBILITY" || s == "VISUAL_NAVIGATION"
}

// listReports loads reports from DB (in-memory mirror kept synced at load).
func listReports(filters struct {
	PlaceID  *string
	Mine     bool
	Profile  string
	AuthorID *string
}) ([]ReportDetail, string, error) {
	where := "1=1"
	args := []interface{}{}
	if filters.PlaceID != nil {
		where += " AND r.placeId = ?"
		args = append(args, *filters.PlaceID)
	}
	if filters.Mine {
		if filters.AuthorID != nil {
			where += " AND r.authorId = ?"
			args = append(args, *filters.AuthorID)
		} else {
			where += " AND r.authorId IS NOT NULL"
		}
	}
	if filters.Profile != "" && filters.Profile != "BOTH" {
		where += " AND r.affectedProfiles LIKE ?"
		args = append(args, "%"+filters.Profile+"%")
	}
	query := `SELECT r.id, r.category, r.body, r.severity, r.affectedProfiles, r.aiGenerated,
		r.latitude, r.longitude, r.status, r.moderationNotes, r.createdAt, r.updatedAt,
		r.placeId, r.authorId, p.name, p.address, p.city, u.displayName
		FROM accessibility_reports r
		LEFT JOIN places p ON p.id = r.placeId
		LEFT JOIN users u ON u.id = r.authorId
		WHERE ` + where + ` ORDER BY r.createdAt DESC LIMIT 50`
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()
	var out []ReportDetail
	for rows.Next() {
		d, err := scanReport(rows)
		if err != nil {
			return nil, "", err
		}
		out = append(out, d)
	}
	return out, "database", nil
}

func scanReport(rows *sql.Rows) (ReportDetail, error) {
	var (
		id, category, body, severity string
		affProfilesJSON              string
		aiGenerated                  bool
		latitude, longitude          sql.NullFloat64
		status, moderationNotes      sql.NullString
		createdAt, updatedAt         string
		placeID, authorID            sql.NullString
		placeName, address, city     sql.NullString
		authorName                   sql.NullString
	)
	err := rows.Scan(&id, &category, &body, &severity, &affProfilesJSON, &aiGenerated,
		&latitude, &longitude, &status, &moderationNotes, &createdAt, &updatedAt,
		&placeID, &authorID, &placeName, &address, &city, &authorName)
	if err != nil {
		return ReportDetail{}, err
	}
	cat := category
	if !isReportCategory(category) {
		cat = "OTHER"
	}
	var affProfiles []string
	_ = json.Unmarshal([]byte(affProfilesJSON), &affProfiles)
	var filtered []string
	for _, p := range affProfiles {
		if isAffectedProfile(p) {
			filtered = append(filtered, p)
		}
	}
	sev := severity
	if !isSeverity(severity) {
		sev = "MEDIUM"
	}
	st := status.String
	if st == "" {
		st = "PENDING"
	}
	verifications, _ := loadVerifications(id)
	verification := "UNKNOWN"
	if len(verifications) > 0 {
		verification = "VERIFIED"
	}
	var lastVerifiedAt *string
	if len(verifications) > 0 && verifications[0].verifiedAt != nil {
		iso := toISO(*verifications[0].verifiedAt)
		lastVerifiedAt = &iso
	}
	reporterName := authorName.String
	if reporterName == "" {
		reporterName = ""
	}
	var placeRef *string
	if placeID.Valid {
		placeRef = &placeID.String
	}
	var placeNameRef *string
	if placeName.Valid {
		placeNameRef = &placeName.String
	}
	var addrRef *string
	if address.Valid || city.Valid {
		addr := ""
		if address.Valid {
			addr = address.String
		}
		if city.Valid {
			if addr != "" {
				addr += ", "
			}
			addr += city.String
		}
		addrRef = &addr
	}
	var latitudeRef *float64
	if latitude.Valid {
		v := latitude.Float64
		latitudeRef = &v
	}
	var longitudeRef *float64
	if longitude.Valid {
		v := longitude.Float64
		longitudeRef = &v
	}
	var rnRef *string
	if reporterName != "" {
		r := reporterName
		rnRef = &r
	}
	var modRef *string
	if moderationNotes.Valid && moderationNotes.String != "" {
		m := moderationNotes.String
		modRef = &m
	}
	media := loadMedia(id)
	verificationCount := len(verifications)
	verifInfo := make([]ReportVerificationInfo, 0, len(verifications))
	for _, v := range verifications {
		info := ReportVerificationInfo{
			ID:      v.id,
			Type:    v.verificationType,
			Comment: v.comment,
			At:      "",
		}
		if v.verifiedAt != nil {
			info.At = toISO(*v.verifiedAt)
		}
		var nref *string
		if v.userName != nil && *v.userName != "" {
			n := *v.userName
			nref = &n
		}
		info.User = nref
		verifInfo = append(verifInfo, info)
	}
	return ReportDetail{
		ID:                id,
		Category:          cat,
		CategoryLabel:     reportCategoryLabel(cat),
		Description:       body,
		Severity:          sev,
		AffectedProfiles:  filtered,
		PlaceID:           placeRef,
		PlaceName:         placeNameRef,
		Latitude:          latitudeRef,
		Longitude:         longitudeRef,
		Address:           addrRef,
		ReporterName:      rnRef,
		Status:            st,
		Verification:      verification,
		CreatedAt:         toISO(createdAt),
		UpdatedAt:         toISO(updatedAt),
		Media:             media,
		VerificationCount: verificationCount,
		LastVerifiedAt:    lastVerifiedAt,
		Verifications:     verifInfo,
		AISuggested:       aiGenerated,
		ModerationNotes:   modRef,
		Source:            "database",
	}, nil
}

func loadMedia(reportID string) []ReportMediaInfo {
	rows, err := db.Query(`SELECT id, kind, url, caption FROM report_media WHERE reportId = ?`, reportID)
	if err != nil {
		return []ReportMediaInfo{}
	}
	defer rows.Close()
	var out []ReportMediaInfo
	for rows.Next() {
		var m ReportMediaInfo
		var caption sql.NullString
		if err := rows.Scan(&m.ID, &m.Kind, &m.URL, &caption); err != nil {
			continue
		}
		if caption.Valid {
			c := caption.String
			m.Caption = &c
		} else {
			m.Caption = nil
		}
		if m.Kind == "" {
			m.Kind = "photo"
		}
		out = append(out, m)
	}
	return out
}

func loadVerifications(reportID string) ([]verificationRow, error) {
	rows, err := db.Query(
		`SELECT id, verificationType, comment, verifiedAt, userName FROM report_verifications WHERE reportId = ? ORDER BY verifiedAt DESC`,
		reportID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []verificationRow
	for rows.Next() {
		var v verificationRow
		var comment sql.NullString
		var at sql.NullTime
		var userName sql.NullString
		if err := rows.Scan(&v.id, &v.verificationType, &comment, &at, &userName); err != nil {
			continue
		}
		if comment.Valid && comment.String != "" {
			c := comment.String
			v.comment = &c
		}
		if at.Valid {
			s := iso(at.Time)
			v.verifiedAt = &s
		}
		if userName.Valid && userName.String != "" {
			n := userName.String
			v.userName = &n
		}
		out = append(out, v)
	}
	return out, nil
}

func getReportDetail(id string) (*ReportDetail, error) {
	rows, err := db.Query(`SELECT r.id, r.category, r.body, r.severity, r.affectedProfiles, r.aiGenerated,
		r.latitude, r.longitude, r.status, r.moderationNotes, r.createdAt, r.updatedAt,
		r.placeId, r.authorId, p.name, p.address, p.city, u.displayName
		FROM accessibility_reports r
		LEFT JOIN places p ON p.id = r.placeId
		LEFT JOIN users u ON u.id = r.authorId
		WHERE r.id = ? LIMIT 1`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return nil, nil
	}
	d, err := scanReport(rows)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

type submitReportInput struct {
	Category         string
	Description      string
	Severity         string
	AffectedProfiles []string
	PlaceID          *string
	Address          *string
	Latitude         *float64
	Longitude        *float64
	Media            []reportMediaInput
	AISuggested      bool
	ReporterID       *string
	ReporterName     *string
}

type reportMediaInput struct {
	Kind    string
	URL     string
	Caption *string
}

func createReport(input submitReportInput, author *PublicUser) (ReportDetail, error) {
	id := "rep-" + randID()
	now := nowMySQL()
	var authorID interface{}
	if author != nil {
		authorID = author.ID
	}
	address := ""
	placeLat, placeLng := 0.0, 0.0
	hasPlace := false
	if input.PlaceID != nil {
		var name, addr, city string
		var lat, lng float64
		err := db.QueryRow(`SELECT name, address, city, latitude, longitude FROM places WHERE id = ?`, *input.PlaceID).
			Scan(&name, &addr, &city, &lat, &lng)
		if err == nil {
			_ = name
			address = addr
			if city != "" {
				if address != "" {
					address += ", "
				}
				address += city
			}
			placeLat = lat
			placeLng = lng
			hasPlace = true
		}
	}
	latitude := input.Latitude
	longitude := input.Longitude
	if latitude == nil && hasPlace {
		l := placeLat
		latitude = &l
	}
	if longitude == nil && hasPlace {
		l := placeLng
		longitude = &l
	}
	if input.Address != nil {
		a := *input.Address
		address = a
	}
	affProfilesJSON, _ := json.Marshal(input.AffectedProfiles)
	title := reportCategoryLabel(input.Category)
	ai := 0
	if input.AISuggested {
		ai = 1
	}
	var pid interface{}
	if input.PlaceID != nil {
		pid = *input.PlaceID
	}
	var latV, lngV interface{}
	if latitude != nil {
		latV = *latitude
	}
	if longitude != nil {
		lngV = *longitude
	}
	_, err := db.Exec(
		`INSERT INTO accessibility_reports (id, placeId, authorId, category, title, body, severity, affectedProfiles, aiGenerated, latitude, longitude, status, createdAt, updatedAt)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
		id, pid, authorID, input.Category, title, input.Description, input.Severity,
		string(affProfilesJSON), ai, latV, lngV, now, now,
	)
	if err != nil {
		return ReportDetail{}, err
	}
	for _, m := range input.Media {
		caption := m.Caption
		if caption != nil && *caption == "" {
			caption = nil
		}
		mediaID := "media-" + randID()
		if _, err := db.Exec(
			`INSERT INTO report_media (id, reportId, kind, url, caption) VALUES (?, ?, 'photo', ?, ?)`,
			mediaID, id, m.URL, caption,
		); err != nil {
			return ReportDetail{}, err
		}
	}
	detail, err := getReportDetail(id)
	if err != nil {
		return ReportDetail{}, err
	}
	if detail == nil {
		return ReportDetail{}, fmt.Errorf("report not found after insert")
	}
	// store reporter key for attribution of gamification marks + self-verify control
	if input.ReporterID != nil {
		_, _ = db.Exec(`UPDATE accessibility_reports SET reporterKey = ? WHERE id = ?`, *input.ReporterID, id)
	}
	return *detail, nil
}

// getReportAuthorIdentity returns authorId and reporterKey for a report.
func getReportAuthorIdentity(id string) (authorID *string, reporterKeyRef *string, found bool, err error) {
	var a sql.NullString
	var r sql.NullString
	err = db.QueryRow(`SELECT authorId, reporterKey FROM accessibility_reports WHERE id = ?`, id).Scan(&a, &r)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil, false, nil
		}
		return nil, nil, false, err
	}
	if a.Valid {
		authorID = &a.String
	}
	if r.Valid {
		reporterKeyRef = &r.String
	}
	return authorID, reporterKeyRef, true, nil
}

type reportPatch struct {
	Category         *string
	Description      *string
	Severity         *string
	AffectedProfiles *[]string
	Status           *string
	Latitude         *float64
	Longitude        *float64
	Address          *string
	ModerationNotes  *string
}

func updateReport(id string, patch reportPatch) (*ReportDetail, error) {
	updates := "updatedAt = ?"
	args := []interface{}{nowMySQL()}
	if patch.Category != nil {
		updates += ", category = ?"
		args = append(args, *patch.Category)
	}
	if patch.Description != nil {
		updates += ", body = ?"
		args = append(args, *patch.Description)
	}
	if patch.Severity != nil {
		updates += ", severity = ?"
		args = append(args, *patch.Severity)
	}
	if patch.AffectedProfiles != nil {
		j, _ := json.Marshal(*patch.AffectedProfiles)
		updates += ", affectedProfiles = ?"
		args = append(args, string(j))
	}
	if patch.Status != nil {
		updates += ", status = ?"
		args = append(args, *patch.Status)
	}
	if patch.Latitude != nil {
		updates += ", latitude = ?"
		args = append(args, *patch.Latitude)
	}
	if patch.Longitude != nil {
		updates += ", longitude = ?"
		args = append(args, *patch.Longitude)
	}
	if patch.ModerationNotes != nil {
		mValue := ""
		if *patch.ModerationNotes != "" {
			mValue = *patch.ModerationNotes
		}
		updates += ", moderationNotes = ?"
		args = append(args, mValue)
	}
	args = append(args, id)
	_, err := db.Exec(`UPDATE accessibility_reports SET `+updates+` WHERE id = ?`, args...)
	if err != nil {
		return nil, err
	}
	return getReportDetail(id)
}

func applyLifecycle(status, verificationType string) string {
	switch verificationType {
	case "CONFIRMED":
		return "ACTIVE"
	case "CHANGED":
		return "OUTDATED"
	case "RESOLVED":
		return "RESOLVED"
	}
	return status
}

func addReportVerification(
	id, verificationType string,
	comment *string,
	user *PublicUser,
	callerKey *string,
) (*ReportDetail, *GamificationStats, *apiError) {
	var currentStatus string
	var authorID sql.NullString
	err := db.QueryRow(`SELECT status, authorId FROM accessibility_reports WHERE id = ?`, id).Scan(&currentStatus, &authorID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil, nil
		}
		return nil, nil, fail("Gagal memuat laporan.", "INTERNAL_ERROR", 500)
	}

	// self verification check (identitas penulis dari server, bukan kunci anonim)
	authorKey := ""
	if authorID.Valid && authorID.String != "" {
		authorKey = "user:" + authorID.String
	}
	if callerKey != nil && authorKey != "" && authorKey == *callerKey {
		return nil, nil, fail(
			"Kamu tidak dapat memverifikasi laporanmu sendiri. Ekspektasi: verifikasi datang dari pengguna lain.",
			"SELF_VERIFICATION", 409,
		)
	}

	if user != nil {
		// count existing verifications
		var verificationCount int
		_ = db.QueryRow(`SELECT COUNT(*) FROM report_verifications WHERE reportId = ?`, id).Scan(&verificationCount)
		if verificationCount >= maxVerificationsPerReport {
			return nil, nil, fail(
				fmt.Sprintf("Laporan sudah menerima %d verifikasi.", maxVerificationsPerReport),
				"VERIFICATION_LIMIT", 409,
			)
		}
		var dup int
		_ = db.QueryRow(
			`SELECT COUNT(*) FROM report_verifications WHERE reportId = ? AND userId = ? AND verificationType = ?`,
			id, user.ID, verificationType,
		).Scan(&dup)
		if dup > 0 {
			return nil, nil, fail("Kamu sudah memverifikasi kondisi ini.", "ALREADY_VERIFIED", 409)
		}
	}

	nextStatus := applyLifecycle(currentStatus, verificationType)
	at := nowMySQL()
	var uid interface{}
	if user != nil {
		uid = user.ID
	}
	result := "VERIFIED"
	if verificationType == "CHANGED" {
		result = "COMMUNITY_REPORTED"
	}
	_, err = db.Exec(
		`INSERT INTO report_verifications (id, reportId, userId, verificationType, comment, userName, verifierKey, result, verifiedAt)
		 VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
		"ver-"+randID(), id, uid, verificationType, comment, callerKey, result, at,
	)
	if err != nil {
		return nil, nil, fail("Gagal menyimpan verifikasi.", "INTERNAL_ERROR", 500)
	}
	_, err = db.Exec(`UPDATE accessibility_reports SET status = ?, updatedAt = ? WHERE id = ?`, nextStatus, nowMySQL(), id)
	if err != nil {
		return nil, nil, fail("Gagal memperbarui laporan.", "INTERNAL_ERROR", 500)
	}
	detail, err := getReportDetail(id)
	if err != nil {
		return nil, nil, fail("Gagal memuat laporan.", "INTERNAL_ERROR", 500)
	}
	var gamification *GamificationStats
	if authorID.Valid && authorID.String != "" && verificationType == "CONFIRMED" {
		g, err := markReportVerified("user:" + authorID.String)
		if err == nil {
			gamification = &g
		}
	}
	return detail, gamification, nil
}