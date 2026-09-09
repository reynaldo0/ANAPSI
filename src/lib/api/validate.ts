const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface ValidationRule {
  field: string;
  ok: boolean;
  message: string;
}

export interface FieldErrors {
  [field: string]: string;
}

export function required(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function minLength(value: string, length: number): boolean {
  return value.length >= length;
}

export function isWholeNumber(value: unknown): boolean {
  return Number.isInteger(value);
}

export function validateRule(
  errors: FieldErrors,
  field: string,
  pass: boolean,
  message: string,
): void {
  if (!pass && !errors[field]) {
    errors[field] = message;
  }
}

export function buildErrors(rules: ValidationRule[]): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const rule of rules) {
    validateRule(fieldErrors, rule.field, rule.ok, rule.message);
  }
  return fieldErrors;
}

export function hasErrors(fieldErrors: FieldErrors): boolean {
  return Object.keys(fieldErrors).length > 0;
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}