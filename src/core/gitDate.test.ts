import { describe, expect, it } from "vitest"
import { formatDisplay, formatGitDate, formatOffset, fromZonedParts, parseIsoWithOffset, toZonedParts } from "./gitDate"

describe("parseIsoWithOffset", () => {
    it("reads a positive offset", () => {
        expect(parseIsoWithOffset("2026-03-04T14:30:00+09:00")).toEqual({ epochSeconds: Date.UTC(2026, 2, 4, 5, 30, 0) / 1000, offsetMinutes: 540 })
    })

    it("reads a negative offset", () => {
        expect(parseIsoWithOffset("2026-03-04T14:30:00-07:00")).toEqual({ epochSeconds: Date.UTC(2026, 2, 4, 21, 30, 0) / 1000, offsetMinutes: -420 })
    })

    it("reads Z as a zero offset", () => {
        expect(parseIsoWithOffset("2026-03-04T14:30:00Z")).toEqual({ epochSeconds: Date.UTC(2026, 2, 4, 14, 30, 0) / 1000, offsetMinutes: 0 })
    })

    it("reads a half-hour offset", () => {
        expect(parseIsoWithOffset("2026-03-04T14:30:00+05:30")).toEqual({ epochSeconds: Date.UTC(2026, 2, 4, 9, 0, 0) / 1000, offsetMinutes: 330 })
    })

    it("returns null for garbage", () => {
        expect(parseIsoWithOffset("not a date")).toBeNull()
        expect(parseIsoWithOffset("")).toBeNull()
    })
})

describe("formatOffset", () => {
    it("formats offsets in git's four-digit form", () => {
        expect(formatOffset(540)).toBe("+0900")
        expect(formatOffset(-420)).toBe("-0700")
        expect(formatOffset(0)).toBe("+0000")
        expect(formatOffset(330)).toBe("+0530")
    })
})

describe("formatGitDate", () => {
    it("formats as epoch seconds and offset", () => {
        expect(formatGitDate({ epochSeconds: 1772602200, offsetMinutes: 540 })).toBe("1772602200 +0900")
    })
})

describe("toZonedParts and fromZonedParts", () => {
    it("renders the wall-clock time in the commit's own zone, not the host zone", () => {
        const parts = toZonedParts({ epochSeconds: Date.UTC(2026, 2, 4, 5, 30, 0) / 1000, offsetMinutes: 540 })
        expect(parts).toEqual({ year: 2026, month: 3, day: 4, hour: 14, minute: 30, second: 0 })
    })

    it("round-trips", () => {
        const original = { epochSeconds: Date.UTC(2026, 2, 4, 5, 30, 7) / 1000, offsetMinutes: 540 }
        expect(fromZonedParts(toZonedParts(original), 540)).toEqual(original)
    })

    it("round-trips across a negative offset and a day boundary", () => {
        const original = { epochSeconds: Date.UTC(2026, 2, 4, 2, 15, 0) / 1000, offsetMinutes: -420 }
        const parts = toZonedParts(original)
        expect(parts).toEqual({ year: 2026, month: 3, day: 3, hour: 19, minute: 15, second: 0 })
        expect(fromZonedParts(parts, -420)).toEqual(original)
    })

    it("round-trips at a zero offset", () => {
        const utc = { epochSeconds: Date.UTC(2026, 2, 4, 5, 30, 0) / 1000, offsetMinutes: 0 }
        expect(toZonedParts(utc)).toEqual({ year: 2026, month: 3, day: 4, hour: 5, minute: 30, second: 0 })
        expect(fromZonedParts(toZonedParts(utc), 0)).toEqual(utc)
    })
})

describe("formatDisplay", () => {
    it("renders in the commit's own zone with the offset appended", () => {
        expect(formatDisplay({ epochSeconds: Date.UTC(2026, 2, 4, 5, 30, 0) / 1000, offsetMinutes: 540 })).toBe("2026-03-04 14:30:00 +0900")
    })
})
