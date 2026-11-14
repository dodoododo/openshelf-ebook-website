import type { RegisterRequest } from "@/types/auth"

export function validateAuth(values: RegisterRequest, registration: boolean): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!/^[^\s@]+@[^\s@]+$/.test(values.email.trim()) || Array.from(values.email).some((character) => character.charCodeAt(0) > 127) || values.email.trim().length > 254) {
    errors.email = "Enter a valid email address."
  }
  const length = Array.from(values.password).length
  if (!values.password.trim() || length > 128 || length < (registration ? 15 : 1)) {
    errors.password = registration ? "Use 15–128 characters for your password." : "Enter your password (up to 128 characters)."
  }
  if (registration && (!values.displayName.trim() || values.displayName.trim().length > 80)) {
    errors.displayName = "Enter a display name of up to 80 characters."
  }
  return errors
}

export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")
    || Array.from(value).some((character) => character.charCodeAt(0) < 32)) return "/account"
  const path = value.split(/[?#]/, 1)[0]
  if (path === "/login" || path === "/register") return "/account"
  return value
}
