import { formatOffset } from "./gitDate"
import { RECORD_SEPARATOR, UNIT_SEPARATOR } from "./parseLog"
import type { Commit } from "./types"

/** Three commits covering a multi-line body, a non-local timezone, and a plain single-line message. */
export const FIXTURE_COMMITS: Commit[] = [
    {
        sha: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
        authorName: "Jane Doe",
        authorEmail: "jane@example.com",
        committerName: "Jane Doe",
        committerEmail: "jane@example.com",
        authored: { epochSeconds: Date.UTC(2026, 2, 4, 5, 30, 0) / 1000, offsetMinutes: 540 },
        committed: { epochSeconds: Date.UTC(2026, 2, 4, 5, 30, 0) / 1000, offsetMinutes: 540 },
        message: "Fix the log parser\n\nHandles multi-line bodies now.\n",
    },
    {
        sha: "9f0e1a2b3c4d5e6f708192a3b4c5d6e7f8901234",
        authorName: "Jane Doe",
        authorEmail: "j.doe@old-corp.com",
        committerName: "Jane Doe",
        committerEmail: "j.doe@old-corp.com",
        authored: { epochSeconds: Date.UTC(2026, 2, 3, 16, 12, 44) / 1000, offsetMinutes: -420 },
        committed: { epochSeconds: Date.UTC(2026, 2, 3, 16, 12, 44) / 1000, offsetMinutes: -420 },
        message: "Bump deps\n",
    },
    {
        sha: "77c4b19aabbccddeeff00112233445566778899a",
        authorName: "Ali Reza",
        authorEmail: "ali@example.com",
        committerName: "Ali Reza",
        committerEmail: "ali@example.com",
        authored: { epochSeconds: Date.UTC(2026, 1, 27, 11, 41, 3) / 1000, offsetMinutes: 0 },
        committed: { epochSeconds: Date.UTC(2026, 1, 27, 11, 41, 3) / 1000, offsetMinutes: 0 },
        message: 'Add "export" tab with a $var and a backtick `x`\n',
    },
]

/**
 * Render commits back into the exact text shape the import command produces,
 * newline-separated records included.
 *
 * @param commits The commits to render.
 * @returns Raw un-encoded log text.
 */
export function buildLogText(commits: Commit[]): string {
    return commits
        .map((c) => {
            const authored = isoOf(c.authored.epochSeconds, c.authored.offsetMinutes)
            const committed = isoOf(c.committed.epochSeconds, c.committed.offsetMinutes)
            return [c.sha, c.authorName, c.authorEmail, authored, c.committerName, c.committerEmail, committed, c.message].join(UNIT_SEPARATOR) + RECORD_SEPARATOR
        })
        .join("\n")
}

/**
 * Render an instant back into the strict ISO form `%aI` produces.
 *
 * @param epochSeconds The instant in seconds since the Unix epoch.
 * @param offsetMinutes The offset to render it in.
 * @returns An ISO 8601 timestamp with an explicit offset.
 */
function isoOf(epochSeconds: number, offsetMinutes: number): string {
    const shifted = new Date((epochSeconds + offsetMinutes * 60) * 1000).toISOString().slice(0, 19)
    const off = formatOffset(offsetMinutes)
    return `${shifted}${off.slice(0, 3)}:${off.slice(3)}`
}
