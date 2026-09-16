package main

import "database/sql"

type sqlNullableString struct {
	String string
	Valid  bool
}

func (s *sqlNullableString) Scan(value interface{}) error {
	var ns sql.NullString
	if err := ns.Scan(value); err != nil {
		return err
	}
	s.String = ns.String
	s.Valid = ns.Valid
	return nil
}

var _ sql.Scanner = (*sqlNullableString)(nil)