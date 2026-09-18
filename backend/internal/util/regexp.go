package util

import "regexp"

// RegexpMatch reports whether the regular expression matches s.
func RegexpMatch(pattern, s string) (bool, error) {
	return regexp.MatchString(pattern, s)
}
