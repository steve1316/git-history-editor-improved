import { parseIsoWithOffset } from "./gitDate"
import type { Commit, ParseResult } from "./types"

/** Field separator emitted by the import command, U+001F. */
export const UNIT_SEPARATOR = "\u001f"

/** Record separator emitted by the import command, U+001E. */
export const RECORD_SEPARATOR = "\u001e"

/** Number of fields the import command emits per commit. */
const FIELD_COUNT = 8

/**
 * Shape of a git object name. Abbreviated hashes are as short as 7 characters and SHA-256 object names are 64, so anything outside that
 * range, or carrying a character that is not hex, did not come from `%H`. The generated scripts interpolate this value into shell and
 * Python source, so it is validated here rather than trusted.
 */
const SHA_PATTERN = /^[0-9a-f]{7,64}$/i

/**
 * Turn pasted, dropped, or base64-encoded `git log` output into commits. Accepts
 * the encoded and un-encoded forms interchangeably.
 *
 * @param input Raw text from the paste box or a dropped file.
 * @returns The parsed commits, or a failure describing what went wrong and where.
 */
export function parseLog(input: string): ParseResult {
    if (input.trim().length === 0) {
        return { ok: false, error: "Nothing to import. Paste the output of the git log command above." }
    }

    const text = decodeInput(input)
    if (text === null) {
        return {
            ok: false,
            error: "That input could not be read as git log output or as base64. Check that you copied the whole command output.",
        }
    }

    const records = text
        .split(RECORD_SEPARATOR)
        .map((r) => r.replace(/^[\r\n]+/, ""))
        .filter((r) => r.length > 0)

    if (records.length === 0) {
        return { ok: false, error: "No commits found in that input." }
    }

    const commits: Commit[] = []
    for (let i = 0; i < records.length; i++) {
        const parsed = parseRecord(records[i]!, i)
        if ("error" in parsed) {
            return { ok: false, error: parsed.error, recordIndex: i }
        }
        commits.push(parsed.commit)
    }
    return { ok: true, commits }
}

/**
 * Decode the input if it is base64, or pass it through if it already looks
 * like log output.
 *
 * @param input Raw text from the paste box or a dropped file.
 * @returns The decoded log text, or `null` when the input is neither form.
 */
function decodeInput(input: string): string | null {
    if (input.includes(UNIT_SEPARATOR)) {
        return input
    }

    try {
        const binary = atob(input.replace(/\s+/g, ""))
        const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
        const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
        return decoded.includes(UNIT_SEPARATOR) ? decoded : null
    } catch {
        return null
    }
}

/**
 * Parse one separator-delimited record into a commit.
 *
 * @param record The record text, already trimmed of surrounding newlines.
 * @param index Zero-based record index, used only in error messages.
 * @returns The commit, or an object carrying the failure message.
 */
function parseRecord(record: string, index: number): { commit: Commit } | { error: string } {
    const fields = record.split(UNIT_SEPARATOR)
    if (fields.length !== FIELD_COUNT) {
        return {
            error: `Commit ${index + 1} has ${fields.length} fields but ${FIELD_COUNT} fields were expected. Make sure you used the exact git log command shown above.`,
        }
    }

    const sha = fields[0]!
    if (!SHA_PATTERN.test(sha)) {
        return {
            error: `Commit ${index + 1} starts with "${truncate(sha)}" where a commit hash was expected, so this input does not look like git log output. Paste the output of the exact git log command shown above.`,
        }
    }

    const authored = parseIsoWithOffset(fields[3]!)
    const committed = parseIsoWithOffset(fields[6]!)
    if (!authored || !committed) {
        return {
            error: `Commit ${index + 1} has a timestamp that could not be read. Make sure you used the exact git log command shown above.`,
        }
    }

    return {
        commit: {
            sha,
            authorName: fields[1]!,
            authorEmail: fields[2]!,
            authored,
            committerName: fields[4]!,
            committerEmail: fields[5]!,
            committed,
            message: fields[7]!,
        },
    }
}

/**
 * Shorten a value for inclusion in an error message, so a large paste cannot flood the UI.
 *
 * @param value The offending field text.
 * @returns The value, truncated with an ellipsis when it is long.
 */
function truncate(value: string): string {
    const flat = value.replace(/\s+/g, " ")
    return flat.length > 20 ? `${flat.slice(0, 20)}...` : flat
}
