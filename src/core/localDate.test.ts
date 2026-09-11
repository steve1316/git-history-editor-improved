import { describe, expect, it } from "vitest"
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
