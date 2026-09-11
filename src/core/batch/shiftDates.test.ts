import { describe, expect, it } from "vitest"
import { FIXTURE_COMMITS } from "../testFixtures"
import { offsetToSeconds, shiftDates, spreadDates } from "./shiftDates"

const ALL = FIXTURE_COMMITS.map((c) => c.sha)

describe("offsetToSeconds", () => {
    it("combines days, hours, and minutes", () => {
        expect(offsetToSeconds({ days: 1, hours: 2, minutes: 30 })).toBe(86400 + 7200 + 1800)
    })

    it("handles a negative offset", () => {
        expect(offsetToSeconds({ days: 0, hours: -3, minutes: 0 })).toBe(-10800)
    })
})

describe("shiftDates", () => {
    it("moves only the selected commits", () => {
        const result = shiftDates(FIXTURE_COMMITS, [FIXTURE_COMMITS[0]!.sha], { days: 0, hours: 1, minutes: 0 })
        expect(result[0]!.authored.epochSeconds).toBe(FIXTURE_COMMITS[0]!.authored.epochSeconds + 3600)
        expect(result[1]!.authored.epochSeconds).toBe(FIXTURE_COMMITS[1]!.authored.epochSeconds)
    })

    it("preserves each commit's own timezone offset", () => {
        const result = shiftDates(FIXTURE_COMMITS, ALL, { days: 0, hours: 5, minutes: 0 })
        expect(result[0]!.authored.offsetMinutes).toBe(540)
        expect(result[1]!.authored.offsetMinutes).toBe(-420)
        expect(result[2]!.authored.offsetMinutes).toBe(0)
    })

    it("preserves the spacing between shifted commits", () => {
        const before = FIXTURE_COMMITS[0]!.authored.epochSeconds - FIXTURE_COMMITS[1]!.authored.epochSeconds
        const result = shiftDates(FIXTURE_COMMITS, ALL, { days: -2, hours: 0, minutes: 0 })
        expect(result[0]!.authored.epochSeconds - result[1]!.authored.epochSeconds).toBe(before)
    })

    it("does not mutate the input", () => {
        const snapshot = FIXTURE_COMMITS[0]!.authored.epochSeconds
        shiftDates(FIXTURE_COMMITS, ALL, { days: 3, hours: 0, minutes: 0 })
        expect(FIXTURE_COMMITS[0]!.authored.epochSeconds).toBe(snapshot)
    })

    it("leaves the committer timestamp alone", () => {
        const result = shiftDates(FIXTURE_COMMITS, ALL, { days: 1, hours: 0, minutes: 0 })
        expect(result[0]!.committed.epochSeconds).toBe(FIXTURE_COMMITS[0]!.committed.epochSeconds)
    })

    it("returns the input unchanged for an empty selection", () => {
        expect(shiftDates(FIXTURE_COMMITS, [], { days: 1, hours: 0, minutes: 0 })).toEqual(FIXTURE_COMMITS)
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
