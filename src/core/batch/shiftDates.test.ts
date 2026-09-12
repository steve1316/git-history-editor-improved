import { describe, expect, it } from "vitest"
import { formatDisplay } from "../gitDate"
import { FIXTURE_COMMITS } from "../testFixtures"
import { isZeroOffset, shiftDates, spreadDates } from "./shiftDates"

const ALL = FIXTURE_COMMITS.map((c) => c.sha)

describe("isZeroOffset", () => {
    it("is true when all four components are zero", () => {
        expect(isZeroOffset({ years: 0, days: 0, hours: 0, minutes: 0 })).toBe(true)
    })

    it("is false when years is non-zero", () => {
        expect(isZeroOffset({ years: 1, days: 0, hours: 0, minutes: 0 })).toBe(false)
    })

    it("is false when days is non-zero", () => {
        expect(isZeroOffset({ years: 0, days: 1, hours: 0, minutes: 0 })).toBe(false)
    })

    it("is false when hours is non-zero", () => {
        expect(isZeroOffset({ years: 0, days: 0, hours: 1, minutes: 0 })).toBe(false)
    })

    it("is false when minutes is non-zero", () => {
        expect(isZeroOffset({ years: 0, days: 0, hours: 0, minutes: 1 })).toBe(false)
    })
})

describe("shiftDates", () => {
    it("moves only the selected commits", () => {
        const result = shiftDates(FIXTURE_COMMITS, [FIXTURE_COMMITS[0]!.sha], { years: 0, days: 0, hours: 1, minutes: 0 })
        expect(result[0]!.authored.epochSeconds).toBe(FIXTURE_COMMITS[0]!.authored.epochSeconds + 3600)
        expect(result[1]!.authored.epochSeconds).toBe(FIXTURE_COMMITS[1]!.authored.epochSeconds)
    })

    it("preserves each commit's own timezone offset for a positive offset", () => {
        const result = shiftDates(FIXTURE_COMMITS, ALL, { years: 0, days: 0, hours: 5, minutes: 0 })
        expect(result[0]!.authored.offsetMinutes).toBe(540)
        expect(result[1]!.authored.offsetMinutes).toBe(-420)
        expect(result[2]!.authored.offsetMinutes).toBe(0)
    })

    it("preserves each commit's own timezone offset for a negative offset", () => {
        const result = shiftDates(FIXTURE_COMMITS, ALL, { years: 0, days: 0, hours: -5, minutes: 0 })
        expect(result[0]!.authored.offsetMinutes).toBe(540)
        expect(result[1]!.authored.offsetMinutes).toBe(-420)
        expect(result[2]!.authored.offsetMinutes).toBe(0)
    })

    it("preserves each commit's own timezone offset for a zero offset", () => {
        const result = shiftDates(FIXTURE_COMMITS, ALL, { years: 0, days: 0, hours: 0, minutes: 0 })
        expect(result[0]!.authored.offsetMinutes).toBe(540)
        expect(result[1]!.authored.offsetMinutes).toBe(-420)
        expect(result[2]!.authored.offsetMinutes).toBe(0)
    })

    it("does not mutate the input", () => {
        const snapshot = FIXTURE_COMMITS[0]!.authored.epochSeconds
        shiftDates(FIXTURE_COMMITS, ALL, { years: 1, days: 3, hours: 0, minutes: 0 })
        expect(FIXTURE_COMMITS[0]!.authored.epochSeconds).toBe(snapshot)
    })

    it("leaves the committer timestamp alone", () => {
        const result = shiftDates(FIXTURE_COMMITS, ALL, { years: 0, days: 1, hours: 0, minutes: 0 })
        expect(result[0]!.committed.epochSeconds).toBe(FIXTURE_COMMITS[0]!.committed.epochSeconds)
    })

    it("returns the input unchanged for an empty selection", () => {
        expect(shiftDates(FIXTURE_COMMITS, [], { years: 0, days: 1, hours: 0, minutes: 0 })).toEqual(FIXTURE_COMMITS)
    })

    it("+1 year preserves the wall-clock date and time in the commit's own zone", () => {
        // FIXTURE_COMMITS[0] is 2026-03-04 05:30:00 UTC with a +0900 offset, so its own wall clock is 2026-03-04 14:30:00 +0900.
        const result = shiftDates(FIXTURE_COMMITS, [FIXTURE_COMMITS[0]!.sha], { years: 1, days: 0, hours: 0, minutes: 0 })
        expect(formatDisplay(result[0]!.authored)).toBe("2027-03-04 14:30:00 +0900")
    })

    it("Feb 29 + 1 year clamps to Feb 28", () => {
        const commit = FIXTURE_COMMITS[0]!
        const feb29 = { ...commit, authored: { epochSeconds: Date.UTC(2024, 1, 29, 10, 0, 0) / 1000, offsetMinutes: 540 } }
        const result = shiftDates([feb29], [feb29.sha], { years: 1, days: 0, hours: 0, minutes: 0 })
        expect(formatDisplay(result[0]!.authored)).toBe("2025-02-28 19:00:00 +0900")
    })

    it("changes the spacing between a pair of commits straddling a leap day by exactly one day under +1 year", () => {
        // 2024-02-01 is before the 2024 leap day; 2024-03-01 is after it. Shifting both by +1 year lands on
        // 2025-02-01 and 2025-03-01, a 28-day gap instead of the original 29-day gap.
        const before = { ...FIXTURE_COMMITS[0]!, sha: "before", authored: { epochSeconds: Date.UTC(2024, 1, 1, 0, 0, 0) / 1000, offsetMinutes: 0 } }
        const after = { ...FIXTURE_COMMITS[0]!, sha: "after", authored: { epochSeconds: Date.UTC(2024, 2, 1, 0, 0, 0) / 1000, offsetMinutes: 0 } }
        const gapBefore = after.authored.epochSeconds - before.authored.epochSeconds

        const result = shiftDates([before, after], ["before", "after"], { years: 1, days: 0, hours: 0, minutes: 0 })
        const gapAfter = result[1]!.authored.epochSeconds - result[0]!.authored.epochSeconds

        expect(gapBefore).toBe(29 * 86400)
        expect(gapAfter).toBe(28 * 86400)
        expect(gapBefore - gapAfter).toBe(86400)
    })

    it("combines years with days, hours, and minutes in one shift", () => {
        // FIXTURE_COMMITS[0] is 2026-03-04 14:30:00 +0900 in its own zone.
        const result = shiftDates(FIXTURE_COMMITS, [FIXTURE_COMMITS[0]!.sha], { years: 1, days: 2, hours: 3, minutes: 15 })
        expect(formatDisplay(result[0]!.authored)).toBe("2027-03-06 17:45:00 +0900")
    })

    it("negative years move backwards", () => {
        // FIXTURE_COMMITS[0] is 2026-03-04 14:30:00 +0900 in its own zone.
        const result = shiftDates(FIXTURE_COMMITS, [FIXTURE_COMMITS[0]!.sha], { years: -1, days: 0, hours: 0, minutes: 0 })
        expect(formatDisplay(result[0]!.authored)).toBe("2025-03-04 14:30:00 +0900")
    })
})

describe("spreadDates", () => {
    const start = Date.UTC(2026, 0, 1, 0, 0, 0) / 1000
    const end = Date.UTC(2026, 0, 3, 0, 0, 0) / 1000

    it("puts the earliest selected commit on the start and the latest on the end", () => {
        const result = spreadDates(FIXTURE_COMMITS, ALL, start, end)
        const bySha = new Map(result.map((c) => [c.sha, c]))
        expect(bySha.get(FIXTURE_COMMITS[2]!.sha)!.authored.epochSeconds).toBe(start)
        expect(bySha.get(FIXTURE_COMMITS[0]!.sha)!.authored.epochSeconds).toBe(end)
    })

    it("spaces the commits evenly", () => {
        const result = spreadDates(FIXTURE_COMMITS, ALL, start, end)
        const bySha = new Map(result.map((c) => [c.sha, c]))
        expect(bySha.get(FIXTURE_COMMITS[1]!.sha)!.authored.epochSeconds).toBe(start + (end - start) / 2)
    })

    it("preserves each commit's own timezone offset", () => {
        const result = spreadDates(FIXTURE_COMMITS, ALL, start, end)
        const bySha = new Map(result.map((c) => [c.sha, c]))
        expect(bySha.get(FIXTURE_COMMITS[1]!.sha)!.authored.offsetMinutes).toBe(-420)
    })

    it("puts a single selected commit on the start", () => {
        const result = spreadDates(FIXTURE_COMMITS, [FIXTURE_COMMITS[1]!.sha], start, end)
        expect(result[1]!.authored.epochSeconds).toBe(start)
    })

    it("assigns whole seconds, non-decreasing, with exact endpoints", () => {
        const result = spreadDates(FIXTURE_COMMITS, ALL, start, end)
        const assigned = result
            .filter((c) => ALL.includes(c.sha))
            .map((c) => c.authored.epochSeconds)
            .sort((a, b) => a - b)

        expect(assigned.every(Number.isInteger)).toBe(true)
        for (let i = 1; i < assigned.length; i++) {
            expect(assigned[i]!).toBeGreaterThanOrEqual(assigned[i - 1]!)
        }
        expect(assigned[0]).toBe(start)
        expect(assigned[assigned.length - 1]).toBe(end)
    })

    it("ties rather than overshooting when the range is too tight for distinct seconds", () => {
        const result = spreadDates(FIXTURE_COMMITS, ALL, start, start + 1)
        const assigned = result
            .filter((c) => ALL.includes(c.sha))
            .map((c) => c.authored.epochSeconds)
            .sort((a, b) => a - b)

        // Three commits cannot occupy three distinct whole seconds inside a one-second range.
        expect(new Set(assigned).size).toBeLessThan(assigned.length)
        // But nothing is pushed outside the requested range.
        expect(Math.min(...assigned)).toBe(start)
        expect(Math.max(...assigned)).toBe(start + 1)
    })

    it("returns the input unchanged for an empty selection", () => {
        expect(spreadDates(FIXTURE_COMMITS, [], start, end)).toEqual(FIXTURE_COMMITS)
    })
})
