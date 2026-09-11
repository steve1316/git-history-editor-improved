import { parseIsoWithOffset } from "./gitDate"
import type { Commit, ParseResult } from "./types"

/** Field separator emitted by the import command, U+001F. */
export const UNIT_SEPARATOR = "\u001f"

/** Record separator emitted by the import command, U+001E. */
export const RECORD_SEPARATOR = "\u001e"

/** Number of fields the import command emits per commit. */
const FIELD_COUNT = 8

/**
 * Shape of a git object name. The import command uses `%H`, which always emits a full object name: 40 hex characters for SHA-1 and 64 for
 * SHA-256. Anything else did not come from `%H`. The generated scripts interpolate this value into shell and Python source, so it is
 * validated here rather than trusted.
 */
const SHA_PATTERN = /^([0-9a-f]{40}|[0-9a-f]{64})$/i

/**
 * Hex, but shorter than any full object name. Such a value is real git output from `%h` rather than junk, and it is rejected for a different
 * reason: it would import cleanly and then never match `GIT_COMMIT` or filter-repo's `commit.original_id`, both of which are always full
 * object names, so the generated script would run to completion and rewrite nothing.
 */
const ABBREVIATED_SHA_PATTERN = /^[0-9a-f]{1,39}$/i

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
        return { error: shaError(sha, index) }
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
 * Build the rejection message for a first field that was not a full commit hash. An abbreviated hash gets its own wording, because the input
 * really is git log output and telling the user otherwise would send them looking for the wrong problem.
 *
 * @param sha The offending field text.
 * @param index Zero-based record index.
 * @returns The message to show.
 */
function shaError(sha: string, index: number): string {
    if (ABBREVIATED_SHA_PATTERN.test(sha)) {
        return (
            `Commit ${index + 1} starts with "${truncate(sha)}", which is a shortened commit hash rather than a full one. The script has to match each commit by its full hash, ` +
            "so paste the output of the exact git log command shown above, which uses %H rather than %h."
        )
    }
    return (
        `Commit ${index + 1} starts with "${truncate(sha)}" where a commit hash was expected, so this input does not look like git log output. ` +
        "Paste the output of the exact git log command shown above."
    )
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
