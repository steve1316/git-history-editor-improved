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

    it.each([
        ["shell metacharacters", "*) touch /tmp/PWNED ;; #"],
        ["a closing parenthesis", "a1b2c3d4e5f6)"],
        ["a bare glob", "*"],
        ["a space", "a1b2c3d e5f6071"],
        ["non-hex characters", "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"],
    ])("rejects a record whose sha contains %s", (_label, sha) => {
        const result = parseLog(buildLogText([{ ...FIXTURE_COMMITS[0]!, sha }]))
        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.recordIndex).toBe(0)
            expect(result.error).toContain("Commit 1")
            expect(result.error).toContain("does not look like git log output")
        }
    })

    it("reports which record carries the bad sha", () => {
        const result = parseLog(buildLogText([FIXTURE_COMMITS[0]!, { ...FIXTURE_COMMITS[1]!, sha: "*" }]))
        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.recordIndex).toBe(1)
            expect(result.error).toContain("Commit 2")
        }
    })

    it("accepts a full SHA-1 object name in either case, and a full SHA-256 one", () => {
        expect(parseLog(buildLogText([{ ...FIXTURE_COMMITS[0]!, sha: "a".repeat(40) }])).ok).toBe(true)
        expect(parseLog(buildLogText([{ ...FIXTURE_COMMITS[0]!, sha: "A1B2C3D4E5F6".repeat(3) + "1234" }])).ok).toBe(true)
        expect(parseLog(buildLogText([{ ...FIXTURE_COMMITS[0]!, sha: "0123456789abcdef".repeat(4) }])).ok).toBe(true)
    })

    // An abbreviated hash imports cleanly and then matches nothing, because `GIT_COMMIT` and filter-repo's `commit.original_id`
    // are always full object names. The script would run to completion and rewrite none of the history it was asked to rewrite.
    it.each([
        ["the 7-character hash git abbreviates to by default", "a1b2c3d"],
        ["a longer abbreviation", "a1b2c3d4e5f6"],
        ["an uppercase abbreviation", "A1B2C3D4E5F6"],
        ["one character short of a full SHA-1 name", "a".repeat(39)],
    ])("rejects %s", (_label, sha) => {
        const result = parseLog(buildLogText([{ ...FIXTURE_COMMITS[0]!, sha }]))
        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.recordIndex).toBe(0)
            expect(result.error).toContain("Commit 1")
            expect(result.error).toContain("shortened commit hash")
            expect(result.error).toContain("%H rather than %h")
            // The input really is git log output here, so the message must not send the user looking for the wrong problem.
            expect(result.error).not.toContain("does not look like git log output")
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

describe("separator constants", () => {
    it("are the single control characters git emits, not their escape text", () => {
        expect(UNIT_SEPARATOR).toHaveLength(1)
        expect(UNIT_SEPARATOR.charCodeAt(0)).toBe(0x1f)
        expect(RECORD_SEPARATOR).toHaveLength(1)
        expect(RECORD_SEPARATOR.charCodeAt(0)).toBe(0x1e)
    })

    it("parses a record built with real control characters rather than the shared constants", () => {
        const us = String.fromCharCode(0x1f)
        const rs = String.fromCharCode(0x1e)
        const record = ["a".repeat(40), "Jane Doe", "jane@example.com", "2026-03-04T14:30:00+09:00", "Jane Doe", "jane@example.com", "2026-03-04T14:30:00+09:00", "Subject\n"].join(us) + rs
        const result = parseLog(record)
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.commits[0]!.authorName).toBe("Jane Doe")
        }
    })
})
