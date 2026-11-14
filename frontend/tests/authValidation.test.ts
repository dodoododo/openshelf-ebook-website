import { describe, expect, it } from "vitest"
import { safeReturnTo, validateAuth } from "@/utils/authValidation"

describe("authentication validation", () => {
  it("counts Unicode code points and preserves passphrase whitespace", () => {
    expect(validateAuth({ email: "reader@example.com", displayName: "Reader", password: "🔐".repeat(15) }, true)).toEqual({})
    expect(validateAuth({ email: "reader@example.com", displayName: "Reader", password: "🔐".repeat(14) }, true)).toHaveProperty("password")
    expect(validateAuth({ email: "reader@example.com", displayName: "Reader", password: " ".repeat(20) }, true)).toHaveProperty("password")
  })

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/login", "/register", null])(
    "rejects unsafe or recursive return destination %s", (value) => { expect(safeReturnTo(value)).toBe("/account") },
  )

  it("retains an internal destination and query string", () => {
    expect(safeReturnTo("/account?source=login")).toBe("/account?source=login")
  })
})
