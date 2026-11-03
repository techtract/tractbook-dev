import { describe, it, expect } from "vitest"
import { makeInitials } from "./initials"

describe("makeInitials", () => {
  it("uses first and last name", () => expect(makeInitials("Rakesh Chandra", "a@b.com")).toBe("RC"))
  it("uses two letters of a single name", () => expect(makeInitials("Rakesh", "a@b.com")).toBe("RA"))
  it("falls back to the email when there is no name", () => expect(makeInitials("", "zed@b.com")).toBe("Z"))
})
