import { describe, expect, it } from "vitest"
import { parseLog, RECORD_SEPARATOR, UNIT_SEPARATOR } from "./parseLog"
import { buildLogText, FIXTURE_COMMITS } from "./testFixtures"

/**
 * Base64-encode UTF-8 text the way the documented import command does.
 *
 * @param text The text to encode.
 * @returns The base64 form with no line breaks.
 */
function b64(text: string): string {
    return Buffer.from(text, "utf8").toString("base64")
}

describe("parseLog", () => {
    it("parses raw log text", () => {
        const result = parseLog(buildLogText(FIXTURE_COMMITS))
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.commits).toEqual(FIXTURE_COMMITS)
        }
    })

    it("parses base64 input", () => {
        const result = parseLog(b64(buildLogText(FIXTURE_COMMITS)))
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.commits).toEqual(FIXTURE_COMMITS)
        }
    })

    it("ignores whitespace and line breaks inside the base64 blob", () => {
        const wrapped = b64(buildLogText(FIXTURE_COMMITS)).replace(/(.{20})/g, "$1\n  ")
        const result = parseLog(wrapped)
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.commits).toHaveLength(3)
        }
    })

    it("preserves a multi-line body exactly, trailing newline included", () => {
        const result = parseLog(buildLogText(FIXTURE_COMMITS))
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.commits[0]!.message).toBe("Fix the log parser\n\nHandles multi-line bodies now.\n")
        }
    })

    it("keeps each commit's own timezone rather than normalising", () => {
        const result = parseLog(buildLogText(FIXTURE_COMMITS))
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.commits[0]!.authored.offsetMinutes).toBe(540)
            expect(result.commits[1]!.authored.offsetMinutes).toBe(-420)
            expect(result.commits[2]!.authored.offsetMinutes).toBe(0)
        }
    })

    it("round-trips unicode through base64", () => {
        const unicode = [{ ...FIXTURE_COMMITS[0]!, authorName: "Renee Nakamura", message: "Add cafe menu\n" }]
        const result = parseLog(b64(buildLogText(unicode)))
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.commits[0]!.message).toBe("Add cafe menu\n")
        }
    })

    it("tolerates CRLF between records", () => {
        const result = parseLog(buildLogText(FIXTURE_COMMITS).replace(/\n/g, "\r\n"))
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.commits).toHaveLength(3)
        }
    })

    it("rejects empty input", () => {
        const result = parseLog("   ")
        expect(result).toEqual({ ok: false, error: "Nothing to import. Paste the output of the git log command above." })
    })

    it("rejects input that is neither base64 nor log output", () => {
        const result = parseLog("hello world, this is not a log")
        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toContain("could not be read")
        }
    })

    it("reports the index and the field count when a record is malformed", () => {
        const good = buildLogText([FIXTURE_COMMITS[0]!])
        const bad = ["only", "three", "fields"].join(UNIT_SEPARATOR) + RECORD_SEPARATOR
        const result = parseLog(`${good}\n${bad}`)
        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.recordIndex).toBe(1)
            expect(result.error).toContain("8 fields")
            expect(result.error).toContain("3")
        }
    })

    it("reports the index when a timestamp is unreadable", () => {
        const broken = buildLogText([FIXTURE_COMMITS[0]!]).replace("2026-03-04T14:30:00+09:00", "not-a-date")
        const result = parseLog(broken)
        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.recordIndex).toBe(0)
            expect(result.error).toContain("timestamp")
        }
    })
})
