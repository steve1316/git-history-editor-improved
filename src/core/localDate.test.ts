import { DateTime } from "luxon"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { formatDisplay } from "./gitDate"
import { fromPickerValue, toPickerValue } from "./localDate"
import type { GitDate } from "./types"

const TOKYO: GitDate = { epochSeconds: Date.UTC(2026, 2, 4, 5, 30, 0) / 1000, offsetMinutes: 540 }
const LA: GitDate = { epochSeconds: Date.UTC(2026, 2, 4, 2, 15, 0) / 1000, offsetMinutes: -420 }

/** The wall-clock string a picker shows for a value, which is the thing these tests are really about. */
function displayed(value: DateTime): string {
    return value.toFormat("yyyy-MM-dd HH:mm:ss")
}

describe("toPickerValue in commit mode", () => {
    it("reads the commit's own wall-clock time regardless of the host timezone", () => {
        const d = toPickerValue(TOKYO, "commit")
        expect(displayed(d)).toBe("2026-03-04 14:30:00")
        expect(d.offset).toBe(540)
    })

    it("handles a negative offset that lands on the previous day", () => {
        const d = toPickerValue(LA, "commit")
        expect(displayed(d)).toBe("2026-03-03 19:15:00")
        expect(d.offset).toBe(-420)
    })

    it("carries a fixed-offset zone, which is what makes a DST gap impossible", () => {
        expect(toPickerValue(TOKYO, "commit").zone.type).toBe("fixed")
    })
})

describe("toPickerValue in local mode", () => {
    it("uses the real instant so the host timezone applies", () => {
        expect(toPickerValue(TOKYO, "local").toMillis()).toBe(TOKYO.epochSeconds * 1000)
    })
})

describe("round trips", () => {
    it("round-trips in commit mode", () => {
        expect(fromPickerValue(toPickerValue(TOKYO, "commit"), TOKYO, "commit")).toEqual(TOKYO)
        expect(fromPickerValue(toPickerValue(LA, "commit"), LA, "commit")).toEqual(LA)
    })

    it("round-trips in local mode", () => {
        expect(fromPickerValue(toPickerValue(TOKYO, "local"), TOKYO, "local")).toEqual(TOKYO)
    })

    it("keeps the original offset when the wall-clock time is edited in commit mode", () => {
        const edited = toPickerValue(TOKYO, "commit").plus({ hours: 1 })
        const result = fromPickerValue(edited, TOKYO, "commit")
        expect(result.offsetMinutes).toBe(540)
        expect(result.epochSeconds).toBe(TOKYO.epochSeconds + 3600)
    })

    it("keeps the original offset when the instant is edited in local mode", () => {
        const edited = DateTime.fromMillis((TOKYO.epochSeconds + 3600) * 1000)
        const result = fromPickerValue(edited, TOKYO, "local")
        expect(result).toEqual({ epochSeconds: TOKYO.epochSeconds + 3600, offsetMinutes: 540 })
    })

    it("leaves the commit alone when the picker hands back an unparseable value", () => {
        const invalid = DateTime.fromFormat("not a date", "yyyy-MM-dd HH:mm:ss")
        expect(invalid.isValid).toBe(false)
        expect(fromPickerValue(invalid, TOKYO, "commit")).toEqual(TOKYO)
        expect(fromPickerValue(invalid, TOKYO, "local")).toEqual(TOKYO)
    })
})

// 02:00-03:00 on 2026-03-08 does not exist in America/Los_Angeles: the clocks jump straight from 01:59:59 to 03:00:00.
// A commit whose own wall clock lands in that hour used to be shown an hour late, because the picker's value was a `Date`
// in the viewer's zone and no such `Date` exists. The value now lives in the commit's own fixed offset, which has no gap.
describe("a commit whose wall clock falls inside the viewer's DST spring-forward gap", () => {
    /** 2026-03-08 02:30:00 +0900, which is 2026-03-07T17:30:00Z. */
    const GAP: GitDate = { epochSeconds: Date.UTC(2026, 2, 7, 17, 30, 0) / 1000, offsetMinutes: 540 }
    const originalTz = process.env.TZ

    beforeAll(() => {
        process.env.TZ = "America/Los_Angeles"
    })

    afterAll(() => {
        // Assigning `undefined` back would coerce to the string "undefined", which Node reads as a zero offset and leaves
        // the whole worker pinned to UTC for every test file that follows.
        if (originalTz === undefined) {
            delete process.env.TZ
        } else {
            process.env.TZ = originalTz
        }
    })

    it("really is running in the pinned zone, so the rest of this block proves something", () => {
        expect(new Date(Date.UTC(2026, 0, 15)).getTimezoneOffset()).toBe(480)
        expect(new Date(Date.UTC(2026, 6, 15)).getTimezoneOffset()).toBe(420)
        // And the gap is real here, for Luxon as well as for `Date`: this wall clock cannot be built, so both normalise
        // it an hour forward. Neither assertion can hold in UTC, where the offset is zero and 02:30 exists.
        expect(new Date(2026, 2, 8, 2, 30, 0).getHours()).toBe(3)
        expect(DateTime.local(2026, 3, 8, 2, 30, 0).hour).toBe(3)
        expect(DateTime.local(2026, 7, 15).offset).toBe(-420)
    })

    it("displays its own wall-clock time rather than the hour the viewer's zone normalises it to", () => {
        const value = toPickerValue(GAP, "commit")
        expect(displayed(value)).toBe("2026-03-08 02:30:00")
        expect(value.offset).toBe(540)
        // The picker and the read-only cell must agree, since the cell is what the user compares the picker against.
        expect(`${displayed(value)} +0900`).toBe(formatDisplay(GAP))
    })

    it("follows the viewer's zone in local mode, where 09:30 PST is the correct reading of the same instant", () => {
        const value = toPickerValue(GAP, "local")
        expect(displayed(value)).toBe("2026-03-07 09:30:00")
        expect(value.offset).toBe(-480)
    })

    it("is left untouched when the picker is opened and accepted without an edit", () => {
        expect(formatDisplay(GAP)).toBe("2026-03-08 02:30:00 +0900")
        expect(fromPickerValue(toPickerValue(GAP, "commit"), GAP, "commit")).toEqual(GAP)
        expect(fromPickerValue(toPickerValue(GAP, "local"), GAP, "local")).toEqual(GAP)
    })

    it("still takes a real edit through", () => {
        const edited = toPickerValue(GAP, "commit").plus({ days: 1 })
        const result = fromPickerValue(edited, GAP, "commit")
        expect(result.offsetMinutes).toBe(540)
        expect(formatDisplay(result)).toBe("2026-03-09 02:30:00 +0900")
    })
})
