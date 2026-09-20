package store

import (
	"database/sql"
	"encoding/json"

	"anapsi/backend/internal/database"
	"anapsi/backend/internal/util"
)

// AdminUser is the administration snapshot of a registered account.
type AdminUser struct {
	ID              string    `json:"id"`
	Email           string    `json:"email"`
	DisplayName     string    `json:"displayName"`
	Role            string    `json:"role"`
	AvatarURL       string    `json:"avatarUrl"`
	CreatedAt       string    `json:"createdAt"`
	LastActivityAt  *string   `json:"lastActivityAt"`
	LastLat         *float64  `json:"lastLat"`
	LastLng         *float64  `json:"lastLng"`
	LastIP          string    `json:"lastIP"`
	LastPage        string    `json:"lastPage"`
	LastUserAgent   string    `json:"lastUserAgent"`
	ActivityEnabled bool      `json:"activityEnabled"`
	ReportsCount    int       `json:"reportsCount"`
	Verifications   int       `json:"verifications"`
	Points          int       `json:"points"`
	Badges          []string  `json:"badges"`
}

const userListSelect = `SELECT u.id, u.email, u.displayName, u.role, COALESCE(u.avatarUrl, ''),
	u.createdAt, u.lastActivityAt, u.lastLat, u.lastLng,
	COALESCE(u.lastIP, ''), COALESCE(u.lastPage, ''), COALESCE(u.lastUserAgent, ''), u.activityEnabled,
	(SELECT COUNT(*) FROM accessibility_reports r WHERE r.authorId = u.id),
	(SELECT COUNT(*) FROM report_verifications v WHERE v.userId = u.id),
	COALESCE(g.points, 0), COALESCE(g.badges, '[]')
	FROM users u
	LEFT JOIN gamification g ON g.reporterKey = CONCAT('user:', u.id)`

func scanAdminUser(rows *sql.Rows) (AdminUser, error) {
	var (
		u          AdminUser
		createdAt  sql.NullTime
		lastAt     sql.NullTime
		lat, lng   sql.NullFloat64
		badgesJSON string
		enabled    int
	)
	if err := rows.Scan(
		&u.ID, &u.Email, &u.DisplayName, &u.Role, &u.AvatarURL,
		&createdAt, &lastAt, &lat, &lng,
		&u.LastIP, &u.LastPage, &u.LastUserAgent, &enabled,
		&u.ReportsCount, &u.Verifications, &u.Points, &badgesJSON,
	); err != nil {
		return u, err
	}
	u.CreatedAt = util.ISO(createdAt.Time)
	u.ActivityEnabled = enabled == 1
	if lastAt.Valid {
		s := util.ISO(lastAt.Time)
		u.LastActivityAt = &s
	}
	if lat.Valid {
		v := lat.Float64
		u.LastLat = &v
	}
	if lng.Valid {
		v := lng.Float64
		u.LastLng = &v
	}
	_ = json.Unmarshal([]byte(badgesJSON), &u.Badges)
	if u.Badges == nil {
		u.Badges = []string{}
	}
	return u, nil
}

// ListUsersAdmin returns every account newest-first with activity + stats.
func ListUsersAdmin() ([]AdminUser, error) {
	rows, err := database.DB.Query(userListSelect + ` ORDER BY u.createdAt DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AdminUser
	for rows.Next() {
		u, err := scanAdminUser(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

// GetUserAdmin returns a single account for the admin panel (nil when absent).
func GetUserAdmin(id string) (*AdminUser, error) {
	row := database.DB.QueryRow(userListSelect+` WHERE u.id = ? LIMIT 1`, id)
	u, err := scanAdminUserRow(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func scanAdminUserRow(row *sql.Row) (AdminUser, error) {
	var (
		u          AdminUser
		createdAt  sql.NullTime
		lastAt     sql.NullTime
		lat, lng   sql.NullFloat64
		badgesJSON string
		enabled    int
	)
	if err := row.Scan(
		&u.ID, &u.Email, &u.DisplayName, &u.Role, &u.AvatarURL,
		&createdAt, &lastAt, &lat, &lng,
		&u.LastIP, &u.LastPage, &u.LastUserAgent, &enabled,
		&u.ReportsCount, &u.Verifications, &u.Points, &badgesJSON,
	); err != nil {
		return u, err
	}
	u.CreatedAt = util.ISO(createdAt.Time)
	u.ActivityEnabled = enabled == 1
	if lastAt.Valid {
		s := util.ISO(lastAt.Time)
		u.LastActivityAt = &s
	}
	if lat.Valid {
		v := lat.Float64
		u.LastLat = &v
	}
	if lng.Valid {
		v := lng.Float64
		u.LastLng = &v
	}
	_ = json.Unmarshal([]byte(badgesJSON), &u.Badges)
	if u.Badges == nil {
		u.Badges = []string{}
	}
	return u, nil
}

// UpdateUserAdmin applies an admin edit to an account (role/displayName and/or
// activity consent). Only admin-account changes are allowed to be empty.
func UpdateUserAdmin(id, role, displayName string, activityEnabled *bool) (*AdminUser, error) {
	if displayName != "" {
		if _, err := database.DB.Exec(`UPDATE users SET displayName = ?, updatedAt = ? WHERE id = ?`, displayName, util.NowMySQL(), id); err != nil {
			return nil, err
		}
	}
	if role != "" {
		if role != "USER" && role != "ADMIN" {
			role = "USER"
		}
		if _, err := database.DB.Exec(`UPDATE users SET role = ?, updatedAt = ? WHERE id = ?`, role, util.NowMySQL(), id); err != nil {
			return nil, err
		}
	}
	if activityEnabled != nil {
		if err := SetActivityEnabled(id, *activityEnabled); err != nil {
			return nil, err
		}
	}
	return GetUserAdmin(id)
}

// DeleteUserAdmin removes an account and its personal rows, keeping community
// reports intact (authorId is preserved for attribution).
func DeleteUserAdmin(id string) error {
	if _, err := database.DB.Exec(`DELETE FROM accessibility_profiles WHERE userId = ?`, id); err != nil {
		return err
	}
	if _, err := database.DB.Exec(`DELETE FROM saved_places WHERE userId = ?`, id); err != nil {
		return err
	}
	if _, err := database.DB.Exec(`DELETE FROM gamification WHERE reporterKey = ?`, "user:"+id); err != nil {
		return err
	}
	_, err := database.DB.Exec(`DELETE FROM users WHERE id = ?`, id)
	return err
}

// AdminLocation is a live-sharing user for the admin monitoring map.
type AdminLocation struct {
	ID             string   `json:"id"`
	DisplayName    string   `json:"displayName"`
	Email          string   `json:"email"`
	LastActivityAt *string  `json:"lastActivityAt"`
	LastLat        *float64 `json:"lastLat"`
	LastLng        *float64 `json:"lastLng"`
	LastIP         string   `json:"lastIP"`
	LastPage       string   `json:"lastPage"`
	Online         bool     `json:"online"`
}

// ListLocationsAdmin returns users consenting to location sharing, newest
// first, capped for the live map.
func ListLocationsAdmin() ([]AdminLocation, error) {
	rows, err := database.DB.Query(`SELECT u.id, u.displayName, u.email, u.lastActivityAt, u.lastLat, u.lastLng,
		COALESCE(u.lastIP, ''), COALESCE(u.lastPage, ''),
		(u.lastActivityAt >= (UTC_TIMESTAMP() - INTERVAL 10 MINUTE)) AS online
		FROM users u
		WHERE u.activityEnabled = 1 AND u.lastLat IS NOT NULL AND u.lastLng IS NOT NULL
		ORDER BY u.lastActivityAt DESC LIMIT 200`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AdminLocation
	for rows.Next() {
		var (
			l         AdminLocation
			lastAt    sql.NullTime
			lat, lng  sql.NullFloat64
			onlineInt int
		)
		if err := rows.Scan(&l.ID, &l.DisplayName, &l.Email, &lastAt, &lat, &lng, &l.LastIP, &l.LastPage, &onlineInt); err != nil {
			return nil, err
		}
		l.Online = onlineInt == 1
		if lastAt.Valid {
			s := util.ISO(lastAt.Time)
			l.LastActivityAt = &s
		}
		if lat.Valid {
			v := lat.Float64
			l.LastLat = &v
		}
		if lng.Valid {
			v := lng.Float64
			l.LastLng = &v
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

// AdminStats aggregates the numbers shown on the dashboard overview.
type AdminStats struct {
	TotalUsers         int `json:"totalUsers"`
	UsersActive24h     int `json:"usersActive24h"`
	UsersOnline        int `json:"usersOnline"`
	UsersLocated       int `json:"usersLocated"`
	TotalReports       int `json:"totalReports"`
	ReportsPending     int `json:"reportsPending"`
	ReportsActive      int `json:"reportsActive"`
	ReportsVerified    int `json:"reportsVerified"`
	ReportsResolved    int `json:"reportsResolved"`
	ReportsRejected    int `json:"reportsRejected"`
	ReportsOutdated    int `json:"reportsOutdated"`
	TotalVerifications int `json:"totalVerifications"`
	TotalSaved         int `json:"totalSaved"`
	TotalPlaces        int `json:"totalPlaces"`
	TotalFeatures      int `json:"totalFeatures"`
	TotalPoints        int `json:"totalPoints"`
}

// CountStats queries the dashboard overview numbers.
func CountStats() (*AdminStats, error) {
	s := &AdminStats{}
	var err error
	one := func(q string, dest *int) {
		if err != nil {
			return
		}
		err = database.DB.QueryRow(q).Scan(dest)
	}
	one(`SELECT COUNT(*) FROM users`, &s.TotalUsers)
	one(`SELECT COUNT(*) FROM users WHERE lastActivityAt >= (UTC_TIMESTAMP() - INTERVAL 24 HOUR)`, &s.UsersActive24h)
	one(`SELECT COUNT(*) FROM users WHERE lastActivityAt >= (UTC_TIMESTAMP() - INTERVAL 10 MINUTE)`, &s.UsersOnline)
	one(`SELECT COUNT(*) FROM users WHERE activityEnabled = 1 AND lastLat IS NOT NULL`, &s.UsersLocated)
	one(`SELECT COUNT(*) FROM accessibility_reports`, &s.TotalReports)
	one(`SELECT COUNT(*) FROM accessibility_reports WHERE status = 'PENDING'`, &s.ReportsPending)
	one(`SELECT COUNT(*) FROM accessibility_reports WHERE status = 'ACTIVE'`, &s.ReportsActive)
	one(`SELECT COUNT(*) FROM accessibility_reports WHERE status = 'VERIFIED'`, &s.ReportsVerified)
	one(`SELECT COUNT(*) FROM accessibility_reports WHERE status = 'RESOLVED'`, &s.ReportsResolved)
	one(`SELECT COUNT(*) FROM accessibility_reports WHERE status = 'REJECTED'`, &s.ReportsRejected)
	one(`SELECT COUNT(*) FROM accessibility_reports WHERE status = 'OUTDATED'`, &s.ReportsOutdated)
	one(`SELECT COUNT(*) FROM report_verifications`, &s.TotalVerifications)
	one(`SELECT COUNT(*) FROM saved_places`, &s.TotalSaved)
	one(`SELECT COUNT(*) FROM places`, &s.TotalPlaces)
	one(`SELECT COUNT(*) FROM map_features`, &s.TotalFeatures)
	one(`SELECT COALESCE(SUM(points), 0) FROM gamification`, &s.TotalPoints)
	if err != nil {
		return nil, err
	}
	return s, nil
}

// AdminPlace is a demo-catalog place with live engagement counts for the admin
// overview.
type AdminPlace struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Address       string  `json:"address"`
	City          string  `json:"city"`
	Category      string  `json:"category"`
	Lat           float64 `json:"lat"`
	Lng           float64 `json:"lng"`
	Reports       int     `json:"reports"`
	Entrances     int     `json:"entrances"`
	VisualScore   *int    `json:"visualScore"`
	MobilityScore *int    `json:"mobilityScore"`
}

// ListPlacesAdmin lists the demo-catalog mirror with engagement columns; the
// accessibility scores are filled by the handler via the scoring service.
func ListPlacesAdmin() ([]AdminPlace, error) {
	rows, err := database.DB.Query(`SELECT p.id, p.name, COALESCE(p.address, ''), p.city, p.category, p.latitude, p.longitude,
		(SELECT COUNT(*) FROM accessibility_reports r WHERE r.placeId = p.id) AS reports,
		(SELECT COUNT(*) FROM entrances e WHERE e.placeId = p.id) AS entrances
		FROM places p
		ORDER BY p.name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AdminPlace
	for rows.Next() {
		var p AdminPlace
		if err := rows.Scan(&p.ID, &p.Name, &p.Address, &p.City, &p.Category, &p.Lat, &p.Lng, &p.Reports, &p.Entrances); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	if out == nil {
		out = []AdminPlace{}
	}
	return out, rows.Err()
}

// DeleteReportAdmin permanently removes a report with its media and
// verifications (used by the admin moderation panel).
func DeleteReportAdmin(id string) error {
	if _, err := database.DB.Exec(`DELETE FROM report_media WHERE reportId = ?`, id); err != nil {
		return err
	}
	if _, err := database.DB.Exec(`DELETE FROM report_verifications WHERE reportId = ?`, id); err != nil {
		return err
	}
	_, err := database.DB.Exec(`DELETE FROM accessibility_reports WHERE id = ?`, id)
	return err
}