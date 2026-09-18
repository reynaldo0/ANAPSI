// Package demo provides the seeded in-memory demo catalog used across the
// API (places, map features and community reports). Data is stored once and
// cached for the lifetime of the process.
package demo

// Entrance is a physical entrance of a demo place.
type Entrance struct {
	ID      string
	Name    string
	Type    string
	Steps   int
	HasRamp bool
	WidthCm *int
	Notes   *string
}

// Place is a demo accessibility-published place.
type Place struct {
	ID          string
	Name        string
	Address     string
	City        string
	Category    string
	Description string
	Lat         float64
	Lng         float64
	Entrances   []*Entrance
}

// Feature is an accessibility feature published to the map.
type Feature struct {
	ID           string
	Kind         string
	Status       string
	Lat          float64
	Lng          float64
	PlaceID      *string
	Verification string
	StepCount    *int
}

// CommunityReport is a seeded report belonging to a demo place.
type CommunityReport struct {
	ID           string
	Title        string
	Excerpt      string
	Status       string
	Verification string
	AuthorName   string
	CreatedAt    string
	Agree        int
	Disagree     int
	PlaceID      string
}

// IntPtr returns a pointer to v.
func IntPtr(v int) *int { return &v }

// StrPtr returns a pointer to s.
func StrPtr(s string) *string { return &s }

var (
	placesCache   []*Place
	featuresCache []*Feature
	reportsCache  []*CommunityReport
)

// Places returns the demo places catalog.
func Places() []*Place {
	if placesCache != nil {
		return placesCache
	}
	placesCache = []*Place{
		{
			ID: "place-unj", Name: "Universitas Negeri Jakarta",
			Address: "Jl. Rawamangun Muka Raya No. 11", City: "Jakarta Pusat", Category: "Pendidikan",
			Description: "Kampus utama UNJ. Area Gedung Dekanat dan perpustakaan.",
			Lat:         -6.2012, Lng: 106.8741,
			Entrances: []*Entrance{
				{ID: "ent-unj-1", Name: "Pintu Depan", Type: "MAIN", Steps: 3, HasRamp: true, WidthCm: IntPtr(120), Notes: StrPtr("Ramp permanen tersedia di sisi kiri.")},
				{ID: "ent-unj-2", Name: "Gerbang Samping", Type: "ALTERNATE", Steps: 0, HasRamp: true, WidthCm: IntPtr(150), Notes: StrPtr("Akses rata tanpa tangga.")},
			},
		},
		{
			ID: "place-marison", Name: "Marison Cafe Rawamangun",
			Address: "Jl. Pemuda No. 58", City: "Jakarta Pusat", Category: "Kuliner",
			Description: "Cafe dengan area outdoor dan indoor.",
			Lat:         -6.1998, Lng: 106.8755,
			Entrances: []*Entrance{
				{ID: "ent-marison-1", Name: "Pintu Utama", Type: "MAIN", Steps: 1, HasRamp: false, WidthCm: IntPtr(90), Notes: StrPtr("Ada satu anak tangga kecil di pintu masuk.")},
			},
		},
		{
			ID: "place-puskesmas", Name: "Puskesmas Kecamatan Pulo Gadung",
			Address: "Jl. Raya Pulo Gadung No. 1", City: "Jakarta Timur", Category: "Kesehatan",
			Description: "Layanan kesehatan umum dan KIA.",
			Lat:         -6.1938, Lng: 106.8881,
			Entrances: []*Entrance{
				{ID: "ent-pusk-1", Name: "Pintu Layanan", Type: "MAIN", Steps: 2, HasRamp: false, WidthCm: IntPtr(110), Notes: StrPtr("Petugas membantu membuka pintu lebar.")},
				{ID: "ent-pusk-2", Name: "Pintu Darurat", Type: "SERVICE", Steps: 0, HasRamp: true, WidthCm: IntPtr(180), Notes: StrPtr("Ramp landai, digunakan untuk brankar.")},
			},
		},
		{
			ID: "place-masjid", Name: "Masjid Baitul Iman Rawamangun",
			Address: "Jl. Rawamangun Muka Timur", City: "Jakarta Pusat", Category: "Ibada",
			Description: "Masjid lingkungan dengan area parkir dan tempat wudhu.",
			Lat:         -6.1977, Lng: 106.8784,
			Entrances: []*Entrance{
				{ID: "ent-masjid-1", Name: "Pintu Kiri", Type: "MAIN", Steps: 4, HasRamp: true, WidthCm: IntPtr(140), Notes: StrPtr("Ramp tersedia samping kiri.")},
				{ID: "ent-masjid-2", Name: "Pintu Belakang", Type: "ALTERNATE", Steps: 0, HasRamp: false, WidthCm: IntPtr(200), Notes: StrPtr("Akses rata dari halaman parkir.")},
			},
		},
		{
			ID: "place-halte", Name: "Halte Transjakarta Rawamangun",
			Address: "Jl. Pemuda, seberang ATM Center", City: "Jakarta Timur", Category: "Transportasi",
			Description: "Halte BRT koridor utama Rawamangun.",
			Lat:         -6.1995, Lng: 106.8799,
			Entrances: []*Entrance{
				{ID: "ent-halte-1", Name: "Akses Barat", Type: "MAIN", Steps: 6, HasRamp: false, WidthCm: IntPtr(100), Notes: StrPtr("Tangga curam; tidak ada ramp atau elevator ke peron.")},
			},
		},
		{
			ID: "place-rptra", Name: "RPTRA Rawamangun",
			Address: "Jl. K.H. Abdullah Syafei", City: "Jakarta Pusat", Category: "Rekreasi",
			Description: "Ruang publik terpadu ramah anak dengan taman dan jogging track.",
			Lat:         -6.1924, Lng: 106.8695,
			Entrances: []*Entrance{
				{ID: "ent-rptra-1", Name: "Gerbang Utama", Type: "MAIN", Steps: 0, HasRamp: true, WidthCm: IntPtr(240), Notes: StrPtr("Gerbang lebar, jalur rata masuk taman.")},
			},
		},
		{
			ID: "place-stasiun", Name: "Stasiun LRT Velodrome",
			Address: "Jl. Pemuda", City: "Jakarta Timur", Category: "Transportasi",
			Description: "Stasiun LRT dengan akses jembatan penyeberangan.",
			Lat:         -6.1945, Lng: 106.8832,
			Entrances: []*Entrance{
				{ID: "ent-stasiun-1", Name: "Tangga + Eskalator", Type: "MAIN", Steps: 24, HasRamp: false, WidthCm: IntPtr(150), Notes: StrPtr("Tersedia eskalator; lift menuju peron belum beroperasi.")},
			},
		},
		{
			ID: "place-library", Name: "Perpustakaan Umum Rawamangun",
			Address: "Jl. Pemuda No. 12", City: "Jakarta Timur", Category: "Pendidikan",
			Description: "Perpustakaan umum dengan ruang baca dan akses internet.",
			Lat:         -6.2008, Lng: 106.8777,
			Entrances: []*Entrance{
				{ID: "ent-lib-1", Name: "Pintu Akses", Type: "MAIN", Steps: 0, HasRamp: true, WidthCm: IntPtr(160), Notes: StrPtr("Pintu otomatis dan ramp landai.")},
			},
		},
	}
	return placesCache
}

// Features returns the demo map-feature catalog.
func Features() []*Feature {
	if featuresCache != nil {
		return featuresCache
	}
	v := "VERIFIED"
	c := "COMMUNITY_REPORTED"
	u := "UNKNOWN"
	pj := func(s string) *string { return &s }
	s6 := IntPtr(6)
	featuresCache = []*Feature{
		{ID: "gb-1", Kind: "guiding_block", Status: "available", Lat: -6.2009, Lng: 106.8743, PlaceID: pj("place-unj"), Verification: v},
		{ID: "gb-2", Kind: "guiding_block", Status: "damaged", Lat: -6.1997, Lng: 106.8762, PlaceID: pj("place-marison"), Verification: c},
		{ID: "gb-3", Kind: "guiding_block", Status: "interrupted", Lat: -6.1986, Lng: 106.8781, Verification: c},
		{ID: "pc-1", Kind: "pedestrian_crossing", Status: "signalized", Lat: -6.2003, Lng: 106.8766, PlaceID: pj("place-marison"), Verification: v},
		{ID: "pc-2", Kind: "pedestrian_crossing", Status: "non_signalized", Lat: -6.1961, Lng: 106.8792, Verification: u},
		{ID: "ac-1", Kind: "audio_crossing_signal", Status: "available", Lat: -6.2003, Lng: 106.8766, PlaceID: pj("place-marison"), Verification: v},
		{ID: "ob-1", Kind: "obstacle", Status: "construction", Lat: -6.1993, Lng: 106.8756, Verification: c},
		{ID: "ob-2", Kind: "obstacle", Status: "permanent", Lat: -6.1978, Lng: 106.8776, Verification: c},
		{ID: "ob-3", Kind: "obstacle", Status: "temporary", Lat: -6.2016, Lng: 106.8739, Verification: u},
		{ID: "gb-4", Kind: "guiding_block", Status: "available", Lat: -6.2004, Lng: 106.8779, PlaceID: pj("place-library"), Verification: v},
		{ID: "gb-5", Kind: "guiding_block", Status: "interrupted", Lat: -6.198, Lng: 106.8784, PlaceID: pj("place-masjid"), Verification: c},
		{ID: "gb-6", Kind: "guiding_block", Status: "available", Lat: -6.1926, Lng: 106.8697, PlaceID: pj("place-rptra"), Verification: v},
		{ID: "gb-7", Kind: "guiding_block", Status: "damaged", Lat: -6.1943, Lng: 106.8878, PlaceID: pj("place-puskesmas"), Verification: c},
		{ID: "pc-3", Kind: "pedestrian_crossing", Status: "signalized", Lat: -6.1943, Lng: 106.8834, PlaceID: pj("place-stasiun"), Verification: v},
		{ID: "pc-4", Kind: "pedestrian_crossing", Status: "available", Lat: -6.1936, Lng: 106.8884, PlaceID: pj("place-puskesmas"), Verification: c},
		{ID: "ac-2", Kind: "audio_crossing_signal", Status: "available", Lat: -6.1945, Lng: 106.8833, PlaceID: pj("place-stasiun"), Verification: v},
		{ID: "ob-4", Kind: "obstacle", Status: "permanent", Lat: -6.2005, Lng: 106.8779, PlaceID: pj("place-library"), Verification: c},
		{ID: "ob-5", Kind: "obstacle", Status: "temporary", Lat: -6.1923, Lng: 106.8696, PlaceID: pj("place-rptra"), Verification: c},
		{ID: "sh-4", Kind: "surface_hazard", Status: "damaged_sidewalk", Lat: -6.194, Lng: 106.8879, PlaceID: pj("place-puskesmas"), Verification: c},
		{ID: "sh-5", Kind: "surface_hazard", Status: "uneven_surface", Lat: -6.1939, Lng: 106.888, PlaceID: pj("place-puskesmas"), Verification: u},
		{ID: "sh-1", Kind: "surface_hazard", Status: "hole", Lat: -6.2014, Lng: 106.8742, PlaceID: pj("place-unj"), Verification: c},
		{ID: "sh-2", Kind: "surface_hazard", Status: "damaged_sidewalk", Lat: -6.1999, Lng: 106.8802, PlaceID: pj("place-halte"), Verification: c},
		{ID: "sh-3", Kind: "surface_hazard", Status: "uneven_surface", Lat: -6.1952, Lng: 106.8869, Verification: u},
		{ID: "rm-1", Kind: "ramp", Status: "available", Lat: -6.2012, Lng: 106.8740, PlaceID: pj("place-unj"), Verification: v},
		{ID: "rm-2", Kind: "ramp", Status: "damaged", Lat: -6.1951, Lng: 106.8829, PlaceID: pj("place-masjid"), Verification: c},
		{ID: "st-1", Kind: "stairs", Status: "present", StepCount: s6, Lat: -6.1994, Lng: 106.8799, PlaceID: pj("place-halte"), Verification: v},
		{ID: "ev-1", Kind: "elevator", Status: "out_of_service", Lat: -6.1946, Lng: 106.8831, PlaceID: pj("place-stasiun"), Verification: c},
		{ID: "pw-1", Kind: "path_width", Status: "limited", Lat: -6.1980, Lng: 106.8780, Verification: u},
		{ID: "pw-2", Kind: "path_width", Status: "accessible", Lat: -6.2010, Lng: 106.8744, PlaceID: pj("place-unj"), Verification: v},
		{ID: "pw-3", Kind: "path_width", Status: "limited", Lat: -6.198, Lng: 106.8783, PlaceID: pj("place-masjid"), Verification: u},
		{ID: "pw-4", Kind: "path_width", Status: "accessible", Lat: -6.1925, Lng: 106.8696, PlaceID: pj("place-rptra"), Verification: v},
		{ID: "pw-5", Kind: "path_width", Status: "accessible", Lat: -6.2007, Lng: 106.8778, PlaceID: pj("place-library"), Verification: v},
		{ID: "sc-1", Kind: "surface_condition", Status: "damaged", Lat: -6.2001, Lng: 106.8804, PlaceID: pj("place-halte"), Verification: c},
		{ID: "sc-2", Kind: "surface_condition", Status: "good", Lat: -6.1924, Lng: 106.8695, PlaceID: pj("place-rptra"), Verification: v},
		{ID: "sc-3", Kind: "surface_condition", Status: "uneven", Lat: -6.1941, Lng: 106.8877, PlaceID: pj("place-puskesmas"), Verification: c},
		{ID: "ae-1", Kind: "accessible_entrance", Status: "accessible", Lat: -6.20105, Lng: 106.87405, PlaceID: pj("place-unj"), Verification: v},
		{ID: "ae-2", Kind: "accessible_entrance", Status: "partially_accessible", Lat: -6.19982, Lng: 106.87548, PlaceID: pj("place-marison"), Verification: c},
		{ID: "ae-4", Kind: "accessible_entrance", Status: "partially_accessible", Lat: -6.1939, Lng: 106.8882, PlaceID: pj("place-puskesmas"), Verification: c},
		{ID: "ae-5", Kind: "accessible_entrance", Status: "accessible", Lat: -6.1925, Lng: 106.8694, PlaceID: pj("place-rptra"), Verification: v},
		{ID: "ae-6", Kind: "accessible_entrance", Status: "accessible", Lat: -6.2009, Lng: 106.8776, PlaceID: pj("place-library"), Verification: v},
		{ID: "ae-3", Kind: "accessible_entrance", Status: "not_accessible", Lat: -6.19951, Lng: 106.87994, PlaceID: pj("place-halte"), Verification: v},
	}
	return featuresCache
}

// Reports returns the demo community-report catalog.
func Reports() []*CommunityReport {
	if reportsCache != nil {
		return reportsCache
	}
	reportsCache = []*CommunityReport{
		{ID: "rep-1", Title: "Trotoar keluar kampus rusak", Excerpt: "Trotoar di depan pintu samping ada lubang besar setelah hujan.", Status: "VERIFIED", Verification: "VERIFIED", AuthorName: "Demo Tunanetra", CreatedAt: "2026-08-21", Agree: 3, Disagree: 0, PlaceID: "place-unj"},
		{ID: "rep-2", Title: "Toilet ramah kursi roda tersedia", Excerpt: "Tersedia toilet khusus aksesibel di lantai 1.", Status: "ACTIVE", Verification: "COMMUNITY_REPORTED", AuthorName: "Demo Kursi Roda", CreatedAt: "2026-08-18", Agree: 2, Disagree: 1, PlaceID: "place-marison"},
		{ID: "rep-3", Title: "Guiding block terputus di perempatan", Excerpt: "Marka taktil hilang sekitar 5 meter sebelum zebra crossing.", Status: "PENDING", Verification: "COMMUNITY_REPORTED", AuthorName: "Anonim", CreatedAt: "2026-08-25", Agree: 1, Disagree: 0, PlaceID: "place-unj"},
		{ID: "rep-4", Title: "Elevator stasiun tidak beroperasi", Excerpt: "Lift menuju peron sudah dua minggu diperbaiki.", Status: "VERIFIED", Verification: "VERIFIED", AuthorName: "Demo Kursi Roda", CreatedAt: "2026-08-28", Agree: 4, Disagree: 0, PlaceID: "place-stasiun"},
	}
	return reportsCache
}

// FindPlace returns the demo place with the given ID, or nil.
func FindPlace(id string) *Place {
	for _, p := range Places() {
		if p.ID == id {
			return p
		}
	}
	return nil
}
