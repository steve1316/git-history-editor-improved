import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { formatDisplay } from "./gitDate"
import { fromLocalDate, toLocalDate } from "./localDate"
import type { GitDate } from "./types"

const TOKYO: GitDate = { epochSeconds: Date.UTC(2026, 2, 4, 5, 30, 0) / 1000, offsetMinutes: 540 }
const LA: GitDate = { epochSeconds: Date.UTC(2026, 2, 4, 2, 15, 0) / 1000, offsetMinutes: -420 }

describe("toLocalDate in commit mode", () => {
    it("reads the commit's own wall-clock time regardless of the host timezone", () => {
        const d = toLocalDate(TOKYO, "commit")
        expect([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([2026, 3, 4, 14, 30, 0])
    })

    it("handles a negative offset that lands on the previous day", () => {
        const d = toLocalDate(LA, "commit")
        expect([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 3, 3, 19, 15])
    })
})

describe("toLocalDate in local mode", () => {
    it("uses the real instant so the host timezone applies", () => {
        expect(toLocalDate(TOKYO, "local").getTime()).toBe(TOKYO.epochSeconds * 1000)
    })
})

describe("round trips", () => {
    it("round-trips in commit mode", () => {
        expect(fromLocalDate(toLocalDate(TOKYO, "commit"), TOKYO, "commit")).toEqual(TOKYO)
        expect(fromLocalDate(toLocalDate(LA, "commit"), LA, "commit")).toEqual(LA)
    })

    it("round-trips in local mode", () => {
        expect(fromLocalDate(toLocalDate(TOKYO, "local"), TOKYO, "local")).toEqual(TOKYO)
    })

    it("keeps the original offset when the wall-clock time is edited in commit mode", () => {
        const edited = toLocalDate(TOKYO, "commit")
        edited.setHours(edited.getHours() + 1)
        const result = fromLocalDate(edited, TOKYO, "commit")
        expect(result.offsetMinutes).toBe(540)
        expect(result.epochSeconds).toBe(TOKYO.epochSeconds + 3600)
    })

    it("keeps the original offset when the instant is edited in local mode", () => {
        const edited = new Date((TOKYO.epochSeconds + 3600) * 1000)
        const result = fromLocalDate(edited, TOKYO, "local")
        expect(result).toEqual({ epochSeconds: TOKYO.epochSeconds + 3600, offsetMinutes: 540 })
    })
})

// 02:00-03:00 on 2026-03-08 does not exist in America/Los_Angeles: the clocks jump straight from 01:59:59 to 03:00:00.
// A commit whose own wall clock lands in that hour therefore cannot be represented by a `Date` in the viewer's zone.
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
        // And the gap is real here: this wall clock cannot be built, so the runtime normalises it an hour forward.
        expect(new Date(2026, 2, 8, 2, 30, 0).getHours()).toBe(3)
    })

    it("is left untouched when the picker is opened and accepted without an edit", () => {
        expect(formatDisplay(GAP)).toBe("2026-03-08 02:30:00 +0900")
        expect(fromLocalDate(toLocalDate(GAP, "commit"), GAP, "commit")).toEqual(GAP)
        expect(fromLocalDate(toLocalDate(GAP, "local"), GAP, "local")).toEqual(GAP)
    })

    it("still takes a real edit through", () => {
        const edited = toLocalDate(GAP, "commit")
        edited.setDate(edited.getDate() + 1)
        const result = fromLocalDate(edited, GAP, "commit")
        expect(result.offsetMinutes).toBe(540)
        expect(formatDisplay(result)).toBe("2026-03-09 03:30:00 +0900")
    })
})
