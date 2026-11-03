export type ZoneOption = { value: string; label: string }

export const ZONES: ZoneOption[] = [
  { value: "America/St_Johns", label: "Newfoundland (St. John's)" },
  { value: "America/Halifax", label: "Atlantic (Halifax)" },
  { value: "America/Toronto", label: "Eastern (Toronto, New York)" },
  { value: "America/Winnipeg", label: "Central (Winnipeg, Chicago)" },
  { value: "America/Regina", label: "Saskatchewan (Regina)" },
  { value: "America/Edmonton", label: "Mountain (Edmonton, Denver)" },
  { value: "America/Vancouver", label: "Pacific (Vancouver, Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Central Europe (Paris, Berlin)" },
  { value: "Asia/Kolkata", label: "India (Kolkata)" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Australia/Sydney", label: "Sydney" },
]

export function detectZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

/** Human label for an IANA zone; falls back to the raw name. */
export function zoneLabel(zone: string): string {
  return ZONES.find((z) => z.value === zone)?.label || zone.replace(/_/g, " ")
}

/** Zones to show in the picker: the list, plus the current value if it is not in the list. */
export function zoneOptions(current: string): ZoneOption[] {
  if (!current || ZONES.some((z) => z.value === current)) return ZONES
  return [{ value: current, label: zoneLabel(current) }, ...ZONES]
}
