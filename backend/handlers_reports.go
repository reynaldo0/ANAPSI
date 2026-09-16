package main

import (
	"net/http"
	"strings"
)

func validatePhotoDataUrl(url string) (bool, string) {
	maxLen := MAX_PHOTO_BYTES*4/3 + 64
	if len(url) > maxLen {
		return false, "File terlalu besar. Maksimal 5 MB."
	}
	matched, _ := regexpMatch(`^data:(image/[\w+.+-]+);base64,[A-Za-z0-9+/=]+$`, url)
	if !matched {
		return false, "Format file tidak dikenali."
	}
	mimeMatched, _ := regexpMatch(`^data:(image/[^;]+);base64,`, url)
	if !mimeMatched {
		return false, "Format file tidak dikenali."
	}
	mime := strings.TrimPrefix(strings.TrimPrefix(url, "data:"), "")
	end := strings.IndexByte(url, ';')
	mime = ""
	if end != -1 {
		mime = strings.TrimPrefix(url[:end], "data:")
	}
	allowedType := false
	for _, t := range ALLOWED_PHOTO_TYPES {
		if t == mime {
			allowedType = true
			break
		}
	}
	if !allowedType {
		return false, "Jenis file tidak didukung. Gunakan PNG, JPG, atau WebP."
	}
	comma := strings.IndexByte(url, ',')
	if comma == -1 {
		return false, "Data gambar rusak atau tidak valid."
	}
	b64 := url[comma+1:]
	padding := 0
	if strings.HasSuffix(b64, "==") {
		padding = 2
	} else if strings.HasSuffix(b64, "=") {
		padding = 1
	}
	byteLength := len(b64)*3/4 - padding
	if byteLength > MAX_PHOTO_BYTES {
		return false, "File terlalu besar. Maksimal 5 MB."
	}
	return true, ""
}

func toReportKey(ip string, session *PublicUser) string {
	return reporterKey(ip, session)
}

func handleReportsGet(w http.ResponseWriter, r *http.Request, cfg *Config) {
	q := r.URL.Query()
	placeID := q.Get("placeId")
	mine := q.Get("mine")
	profile := q.Get("profile")

	filters := struct {
		PlaceID  *string
		Mine     bool
		Profile  string
		AuthorID *string
	}{}
	if placeID != "" {
		filters.PlaceID = &placeID
	}
	if mine == "1" || mine == "true" {
		filters.Mine = true
	}
	if profile == "BOTH" || profile == "WHEELCHAIR_MOBILITY" || profile == "VISUAL_NAVIGATION" {
		filters.Profile = profile
	}
	if filters.Mine {
		session := getSession(w, r, cfg)
		if session == nil {
			ok(w, map[string]interface{}{"reports": []interface{}{}, "source": "demo"})
			return
		}
		sid := session.ID
		filters.AuthorID = &sid
	}
	reports, source, err := listReports(filters)
	if err != nil {
		writeErr(w, fail("Gagal memuat laporan.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{"reports": reports, "source": source})
}

func handleReportsPost(w http.ResponseWriter, r *http.Request, cfg *Config) {
	session := getSession(w, r, cfg)
	ip := clientIPHeader(r)
	if allowed, retry := checkRateLimit(rateLimitKey(ip, "reports"), 8, 60000); !allowed {
		writeErr(w, fail("Terlalu banyak laporan. Coba lagi setelah beberapa saat.", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	body := struct {
		Category         interface{} `json:"category"`
		Description      interface{} `json:"description"`
		Severity         interface{} `json:"severity"`
		AffectedProfiles interface{} `json:"affectedProfiles"`
		AiSuggested      interface{} `json:"aiSuggested"`
		PlaceID          interface{} `json:"placeId"`
		Address          interface{} `json:"address"`
		Latitude         interface{} `json:"latitude"`
		Longitude        interface{} `json:"longitude"`
		Media            interface{} `json:"media"`
		ReporterID       interface{} `json:"reporterId"`
		ReporterName     interface{} `json:"reporterName"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	category := asString(body.Category)
	if !isReportCategory(category) {
		writeErr(w, failDetails("Pilih kategori yang tersedia.", "VALIDATION_ERROR", 422, map[string]interface{}{"category": body.Category}))
		return
	}
	description := strings.TrimSpace(asString(body.Description))
	if len(description) < 10 || len(description) > 2000 {
		writeErr(w, fail("Deskripsi minimal 10 karakter dan maksimal 2000 karakter.", "VALIDATION_ERROR", 422))
		return
	}
	var affectedProfiles []string
	if arr, ok := body.AffectedProfiles.([]interface{}); ok {
		for _, item := range arr {
			if s, ok := item.(string); ok {
				affectedProfiles = append(affectedProfiles, s)
			}
		}
	}
	if len(affectedProfiles) == 0 || !allAffectedProfiles(affectedProfiles) {
		writeErr(w, fail("Pilih siapa yang terdampak.", "VALIDATION_ERROR", 422))
		return
	}
	severity := "MEDIUM"
	if s := asString(body.Severity); s == "HIGH" || s == "LOW" {
		severity = s
	}
	aiSuggested := body.AiSuggested == true

	var media []reportMediaInput
	if arr, ok := body.Media.([]interface{}); ok {
		if len(arr) > 3 {
			writeErr(w, fail("Maksimal 3 foto per laporan.", "VALIDATION_ERROR", 422))
			return
		}
		for _, item := range arr {
			obj, ok := item.(map[string]interface{})
			if !ok {
				writeErr(w, fail("Data media tidak valid.", "VALIDATION_ERROR", 422))
				return
			}
			kind := asString(obj["kind"])
			url := asString(obj["url"])
			if kind != "photo" || url == "" {
				writeErr(w, fail("Data media tidak valid.", "VALIDATION_ERROR", 422))
				return
			}
			if ok, errMsg := validatePhotoDataUrl(url); !ok {
				writeErr(w, failDetails(errMsg, "UPLOAD_FAILED", 422, map[string]interface{}{"media": item}))
				return
			}
			var caption *string
			if c := asString(obj["caption"]); c != "" {
				caption = &c
			}
			media = append(media, reportMediaInput{Kind: "photo", URL: url, Caption: caption})
		}
	}

	var declaredReporterID *string
	if s := asString(body.ReporterID); s != "" {
		declaredReporterID = &s
	}
	resolvedKey := toReportKey(ip, session)

	var placeID *string
	if s := asString(body.PlaceID); s != "" {
		placeID = &s
	}
	var addr *string
	if s := asString(body.Address); s != "" {
		addr = &s
	}
	var latitude, longitude *float64
	if num, ok := body.Latitude.(float64); ok {
		latitude = &num
	}
	if num, ok := body.Longitude.(float64); ok {
		longitude = &num
	}

	input := submitReportInput{
		Category:         category,
		Description:      description,
		Severity:         severity,
		AffectedProfiles: affectedProfiles,
		PlaceID:          placeID,
		Address:          addr,
		Latitude:         latitude,
		Longitude:        longitude,
		Media:            media,
		AISuggested:      aiSuggested,
		ReporterID:       &resolvedKey,
	}
	var reporterName *string
	if s := asString(body.ReporterName); s != "" {
		reporterName = &s
	}
	input.ReporterName = reporterName

	detail, err := createReport(input, session)
	if err != nil {
		writeErr(w, fail("Gagal membuat laporan.", "INTERNAL_ERROR", 500))
		return
	}
	g, err := awardReportPoints(resolvedKey, reporterName, AwardInput{
		Category: category, Severity: severity, HasPhoto: len(media) > 0,
	})
	if err != nil {
		writeErr(w, fail("Laporan tersimpan, tetapi penghargaan gagal.", "INTERNAL_ERROR", 500))
		return
	}
	if declaredReporterID != nil {
		g.ReporterId = *declaredReporterID
	}
	detail.CategoryLabel = reportCategoryLabel(detail.Category)
	created(w, map[string]interface{}{
		"report": detail, "source": "database", "gamification": g,
	})
}

func allAffectedProfiles(list []string) bool {
	for _, p := range list {
		if !isAffectedProfile(p) {
			return false
		}
	}
	return true
}

func handleReportById(w http.ResponseWriter, r *http.Request, cfg *Config) {
	id := r.PathValue("id")
	detail, err := getReportDetail(id)
	if err != nil {
		writeErr(w, fail("Gagal memuat laporan.", "INTERNAL_ERROR", 500))
		return
	}
	if detail == nil {
		writeErr(w, notFound("Laporan tidak ditemukan."))
		return
	}
	ok(w, map[string]interface{}{"report": detail, "source": "database"})
}

func handleReportPut(w http.ResponseWriter, r *http.Request, cfg *Config) {
	session := getSession(w, r, cfg)
	if session == nil {
		writeErr(w, unauthorized(""))
		return
	}
	id := r.PathValue("id")
	detail, err := getReportDetail(id)
	if err != nil {
		writeErr(w, fail("Gagal memuat laporan.", "INTERNAL_ERROR", 500))
		return
	}
	if detail == nil {
		writeErr(w, notFound("Laporan tidak ditemukan."))
		return
	}
	authorID, _, found, err := getReportAuthorIdentity(id)
	if err != nil {
		writeErr(w, fail("Gagal memuat laporan.", "INTERNAL_ERROR", 500))
		return
	}
	isOwner := found && authorID != nil && *authorID == session.ID
	if session.Role != "ADMIN" && !isOwner {
		writeErr(w, forbidden("Kamu hanya dapat mengubah laporan milikmu sendiri."))
		return
	}
	body := struct {
		Category         interface{} `json:"category"`
		Description      interface{} `json:"description"`
		Severity         interface{} `json:"severity"`
		Status           interface{} `json:"status"`
		AffectedProfiles interface{} `json:"affectedProfiles"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	var patch reportPatch
	if body.Category != nil {
		c := asString(body.Category)
		if !isReportCategory(c) {
			writeErr(w, fail("Kategori tidak valid.", "VALIDATION_ERROR", 422))
			return
		}
		patch.Category = &c
	}
	if body.Description != nil {
		d := strings.TrimSpace(asString(body.Description))
		if len(d) < 10 || len(d) > 2000 {
			writeErr(w, fail("Deskripsi minimal 10 karakter.", "VALIDATION_ERROR", 422))
			return
		}
		patch.Description = &d
	}
	if body.Severity != nil {
		s := asString(body.Severity)
		if !isSeverity(s) {
			writeErr(w, fail("Tingkat keparahan tidak valid.", "VALIDATION_ERROR", 422))
			return
		}
		patch.Severity = &s
	}
	if body.AffectedProfiles != nil {
		var list []string
		if arr, ok := body.AffectedProfiles.([]interface{}); ok {
			for _, item := range arr {
				if s, ok := item.(string); ok {
					list = append(list, s)
				}
			}
		}
		if len(list) == 0 || !allAffectedProfiles(list) {
			writeErr(w, fail("Profil terdampak tidak valid.", "VALIDATION_ERROR", 422))
			return
		}
		patch.AffectedProfiles = &list
	}
	if body.Status != nil {
		if session.Role != "ADMIN" {
			writeErr(w, forbidden("Hanya admin yang dapat mengubah status laporan."))
			return
		}
		s := asString(body.Status)
		if !isStatus(s) {
			writeErr(w, fail("Status tidak valid.", "VALIDATION_ERROR", 422))
			return
		}
		patch.Status = &s
	}
	updated, err := updateReport(id, patch)
	if err != nil {
		writeErr(w, fail("Gagal memperbarui laporan.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{"report": updated, "source": "database"})
}

func handleReportVerify(w http.ResponseWriter, r *http.Request, cfg *Config, vtype string) {
	session := getSession(w, r, cfg)
	ip := clientIPHeader(r)
	if allowed, retry := checkRateLimit(rateLimitKey(ip, "verify:"+vtype), 15, 60000); !allowed {
		writeErr(w, fail("Terlalu banyak permintaan. Coba lagi nanti.", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	id := r.PathValue("id")

	var comment *string
	var body map[string]interface{}
	if err := getBody(r, &body); err != nil {
		writeErr(w, fail("Badan permintaan harus berupa JSON.", "INVALID_JSON", 400))
		return
	}
	if rawType, ok := body["type"]; ok {
		t := asString(rawType)
		if !isVerificationType(t) {
			writeErr(w, fail("Tipe verifikasi tidak valid.", "VALIDATION_ERROR", 422))
			return
		}
	}
	if rawComment, ok := body["comment"]; ok {
		c := strings.TrimSpace(asString(rawComment))
		if c != "" {
			comment = &c
		}
	}
	if comment != nil && len(*comment) > 500 {
		writeErr(w, fail("Komentar maksimal 500 karakter.", "VALIDATION_ERROR", 422))
		return
	}
	callerKey := toReportKey(ip, session)
	detail, gamification, apiErr := addReportVerification(id, vtype, comment, session, &callerKey)
	if apiErr != nil {
		writeErr(w, apiErr)
		return
	}
	if detail == nil {
		writeErr(w, notFound("Laporan tidak ditemukan."))
		return
	}
	if gamification != nil {
		ok(w, map[string]interface{}{"report": detail, "source": "database", "gamification": gamification})
	} else {
		ok(w, map[string]interface{}{"report": detail, "source": "database"})
	}
}

func handleAdminReportsGet(w http.ResponseWriter, r *http.Request, cfg *Config) {
	session := getSession(w, r, cfg)
	if session == nil {
		writeErr(w, unauthorized(""))
		return
	}
	if session.Role != "ADMIN" {
		writeErr(w, forbidden("Hanya admin yang dapat mengakses panel moderasi."))
		return
	}
	status := r.URL.Query().Get("status")
	if status != "" && !isStatus(status) {
		status = ""
	}
	reports, err := adminListReports(status)
	if err != nil {
		writeErr(w, fail("Gagal memuat laporan.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{"reports": reports, "source": "database"})
}

func adminListReports(status string) ([]ReportDetail, error) {
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
	rows, err := db.Query(query, args...)
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

func handleAdminReportsPut(w http.ResponseWriter, r *http.Request, cfg *Config) {
	session := getSession(w, r, cfg)
	if session == nil {
		writeErr(w, unauthorized(""))
		return
	}
	if session.Role != "ADMIN" {
		writeErr(w, forbidden("Hanya admin yang dapat mengubah status laporan."))
		return
	}
	ip := clientIPHeader(r)
	if allowed, retry := checkRateLimit(rateLimitKey(ip, "admin:update"), 30, 60000); !allowed {
		writeErr(w, fail("Terlalu banyak permintaan. Coba lagi nanti.", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	body := struct {
		ID               interface{} `json:"id"`
		Status           interface{} `json:"status"`
		ModerationNotes  interface{} `json:"moderationNotes"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	id := asString(body.ID)
	if id == "" {
		writeErr(w, fail("ID laporan tidak valid.", "VALIDATION_ERROR", 422))
		return
	}
	var patch reportPatch
	if body.Status != nil {
		s := asString(body.Status)
		if !isStatus(s) {
			writeErr(w, fail("Status tidak valid.", "VALIDATION_ERROR", 422))
			return
		}
		patch.Status = &s
	}
	if body.ModerationNotes != nil {
		m := strings.TrimSpace(asString(body.ModerationNotes))
		if len(m) > 2000 {
			writeErr(w, fail("Catatan moderasi maksimal 2000 karakter.", "VALIDATION_ERROR", 422))
			return
		}
		if m == "" {
			m = ""
		}
		patch.ModerationNotes = &m
	}
	updated, err := updateReport(id, patch)
	if err != nil {
		writeErr(w, fail("Gagal memperbarui laporan.", "INTERNAL_ERROR", 500))
		return
	}
	if updated == nil {
		writeErr(w, fail("Laporan tidak ditemukan.", "NOT_FOUND", 404))
		return
	}
	updated.CategoryLabel = reportCategoryLabel(updated.Category)
	ok(w, map[string]interface{}{"report": updated, "source": "database"})
}