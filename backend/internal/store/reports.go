package store

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"blindspot/backend/internal/auth"
	"blindspot/backend/internal/database"
	"blindspot/backend/internal/errs"
	"blindspot/backend/internal/model"
	"blindspot/backend/internal/util"
)

// ReportMediaInfo is a photo/attachment attached to a report.
type ReportMediaInfo struct {
	ID      string  `json:"id"`
	Kind    string  `json:"kind"`
	URL     string  `json:"url"`
	Caption *string `json:"caption"`
}

// ReportVerificationInfo is a single community verification record.
type ReportVerificationInfo struct {
	ID      string  `json:"id"`
	Type    string  `json:"type"`
	Comment *string `json:"comment"`
	User    *string `json:"userName"`
	At      string  `json:"at"`
}

// ReportDetail is the full API shape of a report.
type ReportDetail struct {
	ID                string                   `json:"id"`
	Category          string                   `json:"category"`
	CategoryLabel     string                   `json:"categoryLabel"`
	Description       string                   `json:"description"`
	Severity          string                   `json:"severity"`
	AffectedProfiles  []string                 `json:"affectedProfiles"`
	PlaceID           *string                  `json:"placeId"`
	PlaceName         *string                  `json:"placeName"`
	Latitude          *float64                 `json:"latitude"`
	Longitude         *float64                 `json:"longitude"`
	Address           *string                  `json:"address"`
	ReporterName      *string                  `json:"reporterName"`
	Status            string                   `json:"status"`
	Verification      string                   `json:"verification"`
	CreatedAt         string                   `json:"createdAt"`
	UpdatedAt         string                   `json:"updatedAt"`
	Media             []ReportMediaInfo        `json:"media"`
	VerificationCount int                      `json:"verificationCount"`
	LastVerifiedAt    *string                  `json:"lastVerifiedAt"`
	Verifications     []ReportVerificationInfo `json:"verifications"`
	AISuggested       bool                     `json:"aiSuggested"`
	ModerationNotes   *string                  `json:"moderationNotes"`
	Source            string                   `json:"source"`
}

type verificationRow struct {
	id               string
	verificationType string
	comment          *string
	verifiedAt       *string
	userName         *string
}

type loadedReport struct {
	detail        ReportDetail
	authorID      *string
	reporterID    *string
	verifications []verificationRow
}

// ReportFilters narrows the report list query.
type ReportFilters struct {
	PlaceID  *string
	Mine     bool
	Profile  string
	AuthorID *string
	Status   string
	Category string
	Severity string
	Limit    int
	Offset   int
}

// SubmitReportInput is the validated input for creating a report.
type SubmitReportInput struct {
	Category         string
	Description      string
	Severity         string
	AffectedProfiles []string
	PlaceID          *string
	Address          *string
	Latitude         *float64
	Longitude        *float64
	Media            []ReportMediaInput
	AISuggested      bool
	ReporterID       *string
	ReporterName     *string
}

// ReportMediaInput is a single media attachment from the submit payload.
type ReportMediaInput struct {
	Kind    string
	URL     string
	Caption *string
}

// ReportPatch is a partial update applied to a report.
type ReportPatch struct {
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

// ListReports loads reports from the database, ordered newest-first.
func ListReports(filters ReportFilters) ([]ReportDetail, string, error) {
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
	if filters.Status != "" {
		where += " AND r.status = ?"
		args = append(args, filters.Status)
	}
	if filters.Category != "" {
		where += " AND r.category = ?"
		args = append(args, filters.Category)
	}
	if filters.Severity != "" {
		where += " AND r.severity = ?"
		args = append(args, filters.Severity)
	}
	limit := filters.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	if filters.Offset < 0 {
		filters.Offset = 0
	}
	query := `SELECT r.id, r.category, r.body, r.severity, r.affectedProfiles, r.aiGenerated,
		r.latitude, r.longitude, r.status, r.moderationNotes, r.createdAt, r.updatedAt,
		r.placeId, r.authorId, p.name, p.address, p.city, u.displayName
		FROM accessibility_reports r
		LEFT JOIN places p ON p.id = r.placeId
		LEFT JOIN users u ON u.id = r.authorId
		WHERE ` + where + ` ORDER BY r.createdAt DESC, r.id DESC LIMIT ? OFFSET ?`
	args = append(args, limit, filters.Offset)
	rows, err := database.DB.Query(query, args...)
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
	if !model.IsReportCategory(category) {
		cat = "OTHER"
	}
	var affProfiles []string
	rawProfiles := affProfilesJSON
	if rawProfiles == "" || rawProfiles == "null" {
		rawProfiles = "[]"
	}
	_ = json.Unmarshal([]byte(rawProfiles), &affProfiles)
	if affProfiles == nil {
		affProfiles = []string{}
	}
	var filtered []string
	for _, p := range affProfiles {
		if model.IsAffectedProfile(p) {
			filtered = append(filtered, p)
		}
	}
	sev := severity
	if !model.IsSeverity(severity) {
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
		iso := util.ToISO(*verifications[0].verifiedAt)
		lastVerifiedAt = &iso
	}
	reporterName := authorName.String
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
	media := LoadMedia(id)
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
			info.At = util.ToISO(*v.verifiedAt)
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
		CategoryLabel:     model.ReportCategoryLabel(cat),
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
		CreatedAt:         util.ToISO(createdAt),
		UpdatedAt:         util.ToISO(updatedAt),
		Media:             media,
		VerificationCount: verificationCount,
		LastVerifiedAt:    lastVerifiedAt,
		Verifications:     verifInfo,
		AISuggested:       aiGenerated,
		ModerationNotes:   modRef,
		Source:            "database",
	}, nil
}

// LoadMedia returns the media attachments for a report (never nil).
func LoadMedia(reportID string) []ReportMediaInfo {
	rows, err := database.DB.Query(`SELECT id, kind, url, caption FROM report_media WHERE reportId = ?`, reportID)
	if err != nil {
		return []ReportMediaInfo{}
	}
	defer rows.Close()
	out := make([]ReportMediaInfo, 0)
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
	rows, err := database.DB.Query(
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
			s := util.ISO(at.Time)
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

// GetReportDetail loads a single report (nil when not found).
func GetReportDetail(id string) (*ReportDetail, error) {
	rows, err := database.DB.Query(`SELECT r.id, r.category, r.body, r.severity, r.affectedProfiles, r.aiGenerated,
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

// CreateReport persists a new report plus its media, then returns the stored
// detail. The resolved reporter key is attached for gamification attribution.
func CreateReport(input SubmitReportInput, author *auth.PublicUser) (ReportDetail, error) {
	id := "rep-" + util.RandID()
	now := util.NowMySQL()
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
		err := database.DB.QueryRow(`SELECT name, address, city, latitude, longitude FROM places WHERE id = ?`, *input.PlaceID).
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
	title := model.ReportCategoryLabel(input.Category)
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
	_, err := database.DB.Exec(
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
		mediaID := "media-" + util.RandID()
		if _, err := database.DB.Exec(
			`INSERT INTO report_media (id, reportId, kind, url, caption) VALUES (?, ?, 'photo', ?, ?)`,
			mediaID, id, m.URL, caption,
		); err != nil {
			return ReportDetail{}, err
		}
	}
	detail, err := GetReportDetail(id)
	if err != nil {
		return ReportDetail{}, err
	}
	if detail == nil {
		return ReportDetail{}, fmt.Errorf("report not found after insert")
	}
	// store reporter key for attribution of gamification marks + self-verify control
	if input.ReporterID != nil {
		_, _ = database.DB.Exec(`UPDATE accessibility_reports SET reporterKey = ? WHERE id = ?`, *input.ReporterID, id)
	}
	return *detail, nil
}

// GetReportAuthorIdentity returns authorId and reporterKey for a report.
func GetReportAuthorIdentity(id string) (authorID *string, reporterKeyRef *string, found bool, err error) {
	var a sql.NullString
	var r sql.NullString
	err = database.DB.QueryRow(`SELECT authorId, reporterKey FROM accessibility_reports WHERE id = ?`, id).Scan(&a, &r)
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

// UpdateReport applies a partial patch and returns the refreshed detail.
func UpdateReport(id string, patch ReportPatch) (*ReportDetail, error) {
	updates := "updatedAt = ?"
	args := []interface{}{util.NowMySQL()}
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
	_, err := database.DB.Exec(`UPDATE accessibility_reports SET `+updates+` WHERE id = ?`, args...)
	if err != nil {
		return nil, err
	}
	return GetReportDetail(id)
}

// ApplyLifecycle derives the next report status for a verification type.
func ApplyLifecycle(status, verificationType string) string {
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

// AddReportVerification records a community verification. Self-verification is
// rejected, limits and duplicates are enforced, and report authors gain a
// gamification mark when their report is first confirmed.
func AddReportVerification(
	id, verificationType string,
	comment *string,
	user *auth.PublicUser,
	callerKey *string,
) (*ReportDetail, *GamificationStats, *errs.Error) {
	var currentStatus string
	var authorID sql.NullString
	err := database.DB.QueryRow(`SELECT status, authorId FROM accessibility_reports WHERE id = ?`, id).Scan(&currentStatus, &authorID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil, nil
		}
		return nil, nil, errs.Fail("Gagal memuat laporan.", "INTERNAL_ERROR", 500)
	}

	// self verification check (identitas penulis dari server, bukan kunci anonim)
	authorKey := ""
	if authorID.Valid && authorID.String != "" {
		authorKey = "user:" + authorID.String
	}
	if callerKey != nil && authorKey != "" && authorKey == *callerKey {
		return nil, nil, errs.Fail(
			"Kamu tidak dapat memverifikasi laporanmu sendiri. Ekspektasi: verifikasi datang dari pengguna lain.",
			"SELF_VERIFICATION", 409,
		)
	}

	if user != nil {
		var verificationCount int
		_ = database.DB.QueryRow(`SELECT COUNT(*) FROM report_verifications WHERE reportId = ?`, id).Scan(&verificationCount)
		if verificationCount >= model.MaxVerificationsPerReport {
			return nil, nil, errs.Fail(
				fmt.Sprintf("Laporan sudah menerima %d verifikasi.", model.MaxVerificationsPerReport),
				"VERIFICATION_LIMIT", 409,
			)
		}
		var dup int
		_ = database.DB.QueryRow(
			`SELECT COUNT(*) FROM report_verifications WHERE reportId = ? AND userId = ? AND verificationType = ?`,
			id, user.ID, verificationType,
		).Scan(&dup)
		if dup > 0 {
			return nil, nil, errs.Fail("Kamu sudah memverifikasi kondisi ini.", "ALREADY_VERIFIED", 409)
		}
	}

	nextStatus := ApplyLifecycle(currentStatus, verificationType)
	at := util.NowMySQL()
	var uid interface{}
	if user != nil {
		uid = user.ID
	}
	result := "VERIFIED"
	if verificationType == "CHANGED" {
		result = "COMMUNITY_REPORTED"
	}
	_, err = database.DB.Exec(
		`INSERT INTO report_verifications (id, reportId, userId, verificationType, comment, userName, verifierKey, result, verifiedAt)
		 VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
		"ver-"+util.RandID(), id, uid, verificationType, comment, callerKey, result, at,
	)
	if err != nil {
		return nil, nil, errs.Fail("Gagal menyimpan verifikasi.", "INTERNAL_ERROR", 500)
	}
	_, err = database.DB.Exec(`UPDATE accessibility_reports SET status = ?, updatedAt = ? WHERE id = ?`, nextStatus, util.NowMySQL(), id)
	if err != nil {
		return nil, nil, errs.Fail("Gagal memperbarui laporan.", "INTERNAL_ERROR", 500)
	}
	detail, err := GetReportDetail(id)
	if err != nil {
		return nil, nil, errs.Fail("Gagal memuat laporan.", "INTERNAL_ERROR", 500)
	}
	var gamification *GamificationStats
	if authorID.Valid && authorID.String != "" && verificationType == "CONFIRMED" {
		g, err := MarkReportVerified("user:" + authorID.String)
		if err == nil {
			gamification = &g
		}
	}
	return detail, gamification, nil
}

// AdminListReports lists reports for the moderation panel (optionally filtered
// by status), newest first.
func AdminListReports(status string) ([]ReportDetail, error) {
	where := "1=1"
	args := []interface{}{}
	if status != "" {
		where += " AND r.status = ?"
		args = append(args, status)
	}
	query := `SELECT r.id, r.category, r.body, r.severity, r.affectedProfiles, r.aiGenerated,
		r.latitude, r.longitude, r.status, r.moderationNotes, r.createdAt, r.updatedAt,
		r.placeId, r.authorId, p.name, p.address, p.city, u.displayName
		FROM accessibility_reports r
		LEFT JOIN places p ON p.id = r.placeId
		LEFT JOIN users u ON u.id = r.authorId
		WHERE ` + where + ` ORDER BY r.createdAt DESC LIMIT 100`
	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ReportDetail
	for rows.Next() {
		d, err := scanReport(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, nil
}
