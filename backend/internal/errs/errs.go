// Package errs defines the structured API error used across the codebase.
// It is deliberately dependency-free so both storage, business logic and HTTP
// layers can share it without creating import cycles.
package errs

import "encoding/json"

// Error is a structured, HTTP-compatible error.
type Error struct {
	status  int
	code    string
	message string
	details json.RawMessage
}

// Error implements the error interface.
func (e *Error) Error() string { return e.message }

// Status returns the HTTP status code.
func (e *Error) Status() int { return e.status }

// Code returns the machine-readable error code.
func (e *Error) Code() string { return e.code }

// Message returns the human-readable message.
func (e *Error) Message() string { return e.message }

// Details returns the optional structured validation details.
func (e *Error) Details() json.RawMessage { return e.details }

// Fail builds a plain error with the given message, code and status.
func Fail(message string, code string, status int) *Error {
	return &Error{status: status, code: code, message: message}
}

// FailDetails builds an error that carries structured details (for example a
// list of field-level validation messages).
func FailDetails(message string, code string, status int, details interface{}) *Error {
	raw, _ := json.Marshal(details)
	return &Error{status: status, code: code, message: message, details: raw}
}

// Unauthorized builds a 401 UNAUTHORIZED error.
func Unauthorized(msg string) *Error {
	if msg == "" {
		msg = "Sesi berakhir. Silakan masuk kembali."
	}
	return Fail(msg, "UNAUTHORIZED", 401)
}

// Forbidden builds a 403 FORBIDDEN error.
func Forbidden(msg string) *Error {
	if msg == "" {
		msg = "Kamu tidak memiliki izin untuk aksi ini."
	}
	return Fail(msg, "FORBIDDEN", 403)
}

// NotFound builds a 404 NOT_FOUND error.
func NotFound(msg string) *Error {
	if msg == "" {
		msg = "Data tidak ditemukan."
	}
	return Fail(msg, "NOT_FOUND", 404)
}

// Validation builds a 422 VALIDATION_ERROR with field details.
func Validation(details interface{}) *Error {
	return FailDetails("Periksa kembali isian form.", "VALIDATION_ERROR", 422, details)
}
