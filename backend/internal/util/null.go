package util

import "database/sql"

// NullableString is a database/sql.Scanner for nullable VARCHAR columns.
type NullableString struct {
	String string
	Valid  bool
}

// Scan implements database/sql.Scanner.
func (s *NullableString) Scan(value interface{}) error {
	var ns sql.NullString
	if err := ns.Scan(value); err != nil {
		return err
	}
	s.String = ns.String
	s.Valid = ns.Valid
	return nil
}

var _ sql.Scanner = (*NullableString)(nil)
