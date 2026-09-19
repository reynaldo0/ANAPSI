package httpapi

import (
	"net/http"
	"strconv"
	"strings"

	"blindspot/backend/internal/config"
	"blindspot/backend/internal/errs"
	"blindspot/backend/internal/model"
	"blindspot/backend/internal/ratelimit"
	"blindspot/backend/internal/store"
	"blindspot/backend/internal/util"
)

func validatePhotoDataUrl(url string) (bool, string) {
	maxLen := model.MaxPhotoBytes*4/3 + 64
	if len(url) > maxLen {
		return false, "File terlalu besar. Maksimal 5 MB."
	}
	matched, _ := util.RegexpMatch(`^data:(image/[\w+.+-]+);base64,[A-Za-z0-9+/=]+$`, url)
	if !matched {
		return false, "Format file tidak dikenali."
	}
	end := strings.IndexByte(url, ';')
	mime := ""
	if end != -1 {
		mime = strings.TrimPrefix(url[:end], "data:")
	}
	allowedType := false
	for _, t := range model.ALLOWED_PHOTO_TYPES {
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
	if byteLength > model.MaxPhotoBytes {
		return false, "File terlalu besar. Maksimal 5 MB."
	}
	return true, ""
}

func handleReportsGet(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	q := r.URL.Query()
	placeID := q.Get("placeId")
	mine := q.Get("mine")
	profile := q.Get("profile")

	filters := store.ReportFilters{}
	if placeID != "" {
		filters.PlaceID = &placeID
	}
	if mine == "1" || mine == "true" {
		filters.Mine = true
	}
	if profile == "BOTH" || profile == "WHEELCHAIR_MOBILITY" || profile == "VISUAL_NAVIGATION" {
		filters.Profile = profile
	}
	if s := q.Get("status"); s != "" && model.IsStatus(s) {
		filters.Status = s
	}
	if c := q.Get("category"); c != "" && model.IsReportCategory(c) {
		filters.Category = c
	}
	if sev := q.Get("severity"); sev != "" && model.IsSeverity(sev) {
		filters.Severity = sev
	}
	if lim, err := strconv.Atoi(q.Get("limit")); err == nil && lim > 0 {
		filters.Limit = lim
	}
	if off, err := strconv.Atoi(q.Get("offset")); err == nil && off >= 0 {
		filters.Offset = off
	}
	if filters.Mine {
		session := getSession(r, cfg)
		if session == nil {
			ok(w, map[string]interface{}{"reports": []interface{}{}, "source": "demo"})
			return
		}
		sid := session.ID
		filters.AuthorID = &sid
	}
	reports, source, err := store.ListReports(filters)
	if err != nil {
		writeErr(w, errs.Fail("Gagal memuat laporan.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{"reports": reports, "source": source})
}

func handleReportsPost(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	ip := clientIPHeader(r)
	if allowed, retry := ratelimit.Check(ratelimit.Key(ip, "reports"), 8, 60000); !allowed {
		writeErr(w, errs.Fail("Terlalu banyak laporan. Coba lagi setelah beberapa saat.", "RATE_LIMITED", 429))
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
	category := util.AsString(body.Category)
	if !model.IsReportCategory(category) {
		writeErr(w, errs.FailDetails("Pilih kategori yang tersedia.", "VALIDATION_ERROR", 422, map[string]interface{}{"category": body.Category}))
		return
	}
	description := strings.TrimSpace(util.AsString(body.Description))
	if len(description) < 10 || len(description) > 2000 {
		writeErr(w, errs.Fail("Deskripsi minimal 10 karakter dan maksimal 2000 karakter.", "VALIDATION_ERROR", 422))
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
		writeErr(w, errs.Fail("Pilih siapa yang terdampak.", "VALIDATION_ERROR", 422))
		return
	}
	severity := "MEDIUM"
	if s := util.AsString(body.Severity); s == "HIGH" || s == "LOW" {
		severity = s
	}
	aiSuggested := body.AiSuggested == true

	var media []store.ReportMediaInput
	if arr, ok := body.Media.([]interface{}); ok {
		if len(arr) > 3 {
			writeErr(w, errs.Fail("Maksimal 3 foto per laporan.", "VALIDATION_ERROR", 422))
			return
		}
		for _, item := range arr {
			obj, ok := item.(map[string]interface{})
			if !ok {
				writeErr(w, errs.Fail("Data media tidak valid.", "VALIDATION_ERROR", 422))
				return
			}
			kind := util.AsString(obj["kind"])
			url := util.AsString(obj["url"])
			if kind != "photo" || url == "" {
				writeErr(w, errs.Fail("Data media tidak valid.", "VALIDATION_ERROR", 422))
				return
			}
			if ok, errMsg := validatePhotoDataUrl(url); !ok {
				writeErr(w, errs.FailDetails(errMsg, "UPLOAD_FAILED", 422, map[string]interface{}{"media": item}))
				return
			}
			var caption *string
			if c := util.AsString(obj["caption"]); c != "" {
				caption = &c
			}
			media = append(media, store.ReportMediaInput{Kind: "photo", URL: url, Caption: caption})
		}
	}

	var declaredReporterID *string
	if s := util.AsString(body.ReporterID); s != "" {
		declaredReporterID = &s
	}
	resolvedKey := store.ReporterKey(ip, session)

	var placeID *string
	if s := util.AsString(body.PlaceID); s != "" {
		placeID = &s
	}
	var addr *string
	if s := util.AsString(body.Address); s != "" {
		addr = &s
	}
	var latitude, longitude *float64
	if num, ok := body.Latitude.(float64); ok {
		latitude = &num
	}
	if num, ok := body.Longitude.(float64); ok {
		longitude = &num
	}

	input := store.SubmitReportInput{
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
	if s := util.AsString(body.ReporterName); s != "" {
		reporterName = &s
	}
	input.ReporterName = reporterName

	detail, err := store.CreateReport(input, session)
	if err != nil {
		writeErr(w, errs.Fail("Gagal membuat laporan.", "INTERNAL_ERROR", 500))
		return
	}
	g, err := store.AwardReportPoints(resolvedKey, reporterName, store.AwardInput{
		Category: category, Severity: severity, HasPhoto: len(media) > 0,
	})
	if err != nil {
		writeErr(w, errs.Fail("Laporan tersimpan, tetapi penghargaan gagal.", "INTERNAL_ERROR", 500))
		return
	}
	if declaredReporterID != nil {
		g.ReporterId = *declaredReporterID
	}
	detail.CategoryLabel = model.ReportCategoryLabel(detail.Category)
	created(w, map[string]interface{}{
		"report": detail, "source": "database", "gamification": g,
	})
}

func allAffectedProfiles(list []string) bool {
	for _, p := range list {
		if !model.IsAffectedProfile(p) {
			return false
		}
	}
	return true
}

func handleReportById(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	id := r.PathValue("id")
	detail, err := store.GetReportDetail(id)
	if err != nil {
		writeErr(w, errs.Fail("Gagal memuat laporan.", "INTERNAL_ERROR", 500))
		return
	}
	if detail == nil {
		writeErr(w, errs.NotFound("Laporan tidak ditemukan."))
		return
	}
	ok(w, map[string]interface{}{"report": detail, "source": "database"})
}

func handleReportPut(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	if session == nil {
		writeErr(w, errs.Unauthorized(""))
		return
	}
	id := r.PathValue("id")
	detail, err := store.GetReportDetail(id)
	if err != nil {
		writeErr(w, errs.Fail("Gagal memuat laporan.", "INTERNAL_ERROR", 500))
		return
	}
	if detail == nil {
		writeErr(w, errs.NotFound("Laporan tidak ditemukan."))
		return
	}
	authorID, _, found, err := store.GetReportAuthorIdentity(id)
	if err != nil {
		writeErr(w, errs.Fail("Gagal memuat laporan.", "INTERNAL_ERROR", 500))
		return
	}
	isOwner := found && authorID != nil && *authorID == session.ID
	if session.Role != "ADMIN" && !isOwner {
		writeErr(w, errs.Forbidden("Kamu hanya dapat mengubah laporan milikmu sendiri."))
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
	var patch store.ReportPatch
	if body.Category != nil {
		c := util.AsString(body.Category)
		if !model.IsReportCategory(c) {
			writeErr(w, errs.Fail("Kategori tidak valid.", "VALIDATION_ERROR", 422))
			return
		}
		patch.Category = &c
	}
	if body.Description != nil {
		d := strings.TrimSpace(util.AsString(body.Description))
		if len(d) < 10 || len(d) > 2000 {
			writeErr(w, errs.Fail("Deskripsi minimal 10 karakter.", "VALIDATION_ERROR", 422))
			return
		}
		patch.Description = &d
	}
	if body.Severity != nil {
		s := util.AsString(body.Severity)
		if !model.IsSeverity(s) {
			writeErr(w, errs.Fail("Tingkat keparahan tidak valid.", "VALIDATION_ERROR", 422))
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
			writeErr(w, errs.Fail("Profil terdampak tidak valid.", "VALIDATION_ERROR", 422))
			return
		}
		patch.AffectedProfiles = &list
	}
	if body.Status != nil {
		if session.Role != "ADMIN" {
			writeErr(w, errs.Forbidden("Hanya admin yang dapat mengubah status laporan."))
			return
		}
		s := util.AsString(body.Status)
		if !model.IsStatus(s) {
			writeErr(w, errs.Fail("Status tidak valid.", "VALIDATION_ERROR", 422))
			return
		}
		patch.Status = &s
	}
	updated, err := store.UpdateReport(id, patch)
	if err != nil {
		writeErr(w, errs.Fail("Gagal memperbarui laporan.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{"report": updated, "source": "database"})
}

func handleReportVerify(w http.ResponseWriter, r *http.Request, cfg *config.Config, vtype string) {
	session := getSession(r, cfg)
	ip := clientIPHeader(r)
	if allowed, retry := ratelimit.Check(ratelimit.Key(ip, "verify:"+vtype), 15, 60000); !allowed {
		writeErr(w, errs.Fail("Terlalu banyak permintaan. Coba lagi nanti.", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	id := r.PathValue("id")

	var comment *string
	var body map[string]interface{}
	if err := getBody(r, &body); err != nil {
		writeErr(w, errs.Fail("Badan permintaan harus berupa JSON.", "INVALID_JSON", 400))
		return
	}
	if rawType, ok := body["type"]; ok {
		t := util.AsString(rawType)
		if !model.IsVerificationType(t) {
			writeErr(w, errs.Fail("Tipe verifikasi tidak valid.", "VALIDATION_ERROR", 422))
			return
		}
	}
	if rawComment, ok := body["comment"]; ok {
		c := strings.TrimSpace(util.AsString(rawComment))
		if c != "" {
			comment = &c
		}
	}
	if comment != nil && len(*comment) > 500 {
		writeErr(w, errs.Fail("Komentar maksimal 500 karakter.", "VALIDATION_ERROR", 422))
		return
	}
	callerKey := store.ReporterKey(ip, session)
	detail, gamification, apiErr := store.AddReportVerification(id, vtype, comment, session, &callerKey)
	if apiErr != nil {
		writeErr(w, apiErr)
		return
	}
	if detail == nil {
		writeErr(w, errs.NotFound("Laporan tidak ditemukan."))
		return
	}
	if gamification != nil {
		ok(w, map[string]interface{}{"report": detail, "source": "database", "gamification": gamification})
	} else {
		ok(w, map[string]interface{}{"report": detail, "source": "database"})
	}
}

func handleAdminReportsGet(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	if session == nil {
		writeErr(w, errs.Unauthorized(""))
		return
	}
	if session.Role != "ADMIN" {
		writeErr(w, errs.Forbidden("Hanya admin yang dapat mengakses panel moderasi."))
		return
	}
	status := r.URL.Query().Get("status")
	if status != "" && !model.IsStatus(status) {
		status = ""
	}
	reports, err := store.AdminListReports(status)
	if err != nil {
		writeErr(w, errs.Fail("Gagal memuat laporan.", "INTERNAL_ERROR", 500))
		return
	}
	ok(w, map[string]interface{}{"reports": reports, "source": "database"})
}

func handleAdminReportsPut(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	session := getSession(r, cfg)
	if session == nil {
		writeErr(w, errs.Unauthorized(""))
		return
	}
	if session.Role != "ADMIN" {
		writeErr(w, errs.Forbidden("Hanya admin yang dapat mengubah status laporan."))
		return
	}
	ip := clientIPHeader(r)
	if allowed, retry := ratelimit.Check(ratelimit.Key(ip, "admin:update"), 30, 60000); !allowed {
		writeErr(w, errs.Fail("Terlalu banyak permintaan. Coba lagi nanti.", "RATE_LIMITED", 429))
		_ = retry
		return
	}
	body := struct {
		ID              interface{} `json:"id"`
		Status          interface{} `json:"status"`
		ModerationNotes interface{} `json:"moderationNotes"`
	}{}
	if e := getBody(r, &body); e != nil {
		writeErr(w, e)
		return
	}
	id := util.AsString(body.ID)
	if id == "" {
		writeErr(w, errs.Fail("ID laporan tidak valid.", "VALIDATION_ERROR", 422))
		return
	}
	var patch store.ReportPatch
	if body.Status != nil {
		s := util.AsString(body.Status)
		if !model.IsStatus(s) {
			writeErr(w, errs.Fail("Status tidak valid.", "VALIDATION_ERROR", 422))
			return
		}
		patch.Status = &s
	}
	if body.ModerationNotes != nil {
		m := strings.TrimSpace(util.AsString(body.ModerationNotes))
		if len(m) > 2000 {
			writeErr(w, errs.Fail("Catatan moderasi maksimal 2000 karakter.", "VALIDATION_ERROR", 422))
			return
		}
		patch.ModerationNotes = &m
	}
	updated, err := store.UpdateReport(id, patch)
	if err != nil {
		writeErr(w, errs.Fail("Gagal memperbarui laporan.", "INTERNAL_ERROR", 500))
		return
	}
	if updated == nil {
		writeErr(w, errs.Fail("Laporan tidak ditemukan.", "NOT_FOUND", 404))
		return
	}
	updated.CategoryLabel = model.ReportCategoryLabel(updated.Category)
	ok(w, map[string]interface{}{"report": updated, "source": "database"})
}
