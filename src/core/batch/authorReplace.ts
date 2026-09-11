import type { Commit } from "../types"

/** One distinct author identity found in the imported history. */
export interface AuthorSummary {
    /** The author name as it appears on the commits. */
    name: string
    /** The author email as it appears on the commits. */
    email: string
    /** How many imported commits carry this exact name and email pair. */
    count: number
}

/**
 * List every distinct author identity in the imported history, most prolific first. Used to populate the global
 * author replacement dialog.
 *
 * @param commits All imported commits.
 * @returns Distinct name and email pairs, sorted by commit count descending and then by name.
 */
export function listAuthors(commits: Commit[]): AuthorSummary[] {
    const counts = new Map<string, AuthorSummary>()

    for (const commit of commits) {
        // Names and emails come from parseLog, which splits on unit separators, so neither can contain a
        // newline -- making it a safe grouping separator here.
        const key = `${commit.authorName}\n${commit.authorEmail}`
        const existing = counts.get(key)
        if (existing) {
            existing.count++
        } else {
            counts.set(key, { name: commit.authorName, email: commit.authorEmail, count: 1 })
        }
    }

    return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name) || a.email.localeCompare(b.email))
}

/**
 * Set one author identity on every selected commit.
 *
 * @param commits All commits, in import order.
 * @param shas The SHAs to change.
 * @param name The author name to set.
 * @param email The author email to set.
 * @returns A new array with the selected commits reassigned.
 */
export function applyAuthorToSelection(commits: Commit[], shas: Iterable<string>, name: string, email: string): Commit[] {
    const selected = new Set(shas)
    if (selected.size === 0) {
        return commits.slice()
    }
    return commits.map((commit) => (selected.has(commit.sha) ? { ...commit, authorName: name, authorEmail: email } : commit))
}
