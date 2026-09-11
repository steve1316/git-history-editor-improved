import type { Commit } from "./types"

/**
 * Narrow the commit list to those matching a free-text query. Matches against the SHA, author name, author email, and the
 * full message including the body.
 *
 * @param commits All commits, in import order.
 * @param query The user's search text. Blank returns everything.
 * @returns The matching commits, in import order.
 */
export function filterCommits(commits: Commit[], query: string): Commit[] {
    const q = query.trim().toLowerCase()
    if (q.length === 0) {
        return commits
    }

    return commits.filter((c) => c.sha.toLowerCase().includes(q) || c.authorName.toLowerCase().includes(q) || c.authorEmail.toLowerCase().includes(q) || c.message.toLowerCase().includes(q))
}
