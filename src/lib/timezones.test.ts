import { describe, it, expect } from "vitest"
import { zoneLabel, zoneOptions, detectZone, ZONES } from "./timezones"

describe("timezones", () => {
  it("labels known zones", () => {
    expect(zoneLabel("America/Toronto")).toContain("Eastern")
  })
  it("falls back to a readable name for unknown zones", () => {
    expect(zoneLabel("Africa/Addis_Ababa")).toBe("Africa/Addis Ababa")
  })
  it("adds an unknown current zone to the top of the picker", () => {
    const opts = zoneOptions("Africa/Lagos")
    expect(opts[0].value).toBe("Africa/Lagos")
    expect(opts.length).toBe(ZONES.length + 1)
  })
  it("does not duplicate a known zone", () => {
    expect(zoneOptions("America/Toronto").length).toBe(ZONES.length)
  })
  it("detects some zone", () => {
    expect(detectZone().length).toBeGreaterThan(0)
  })
})
