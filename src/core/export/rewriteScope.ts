import { shellSingleQuote } from "../escape"
import type { ChangeSet } from "../types"

/**
 * Pick the commit the rewrite has to start from. Both tools re-create every commit in their range, and a re-created commit loses any
 * signature and so changes hash, so the range is kept to the oldest edited commit and what follows it on the current branch.
 *
 * Global author replacements match on email anywhere in the repository, including commits that were never imported, so they keep the
 * whole-repository rewrite.
 *
 * @param changeSet The computed change set.
 * @returns The oldest edited commit's sha, or `null` when the script has to rewrite every ref.
 */
export function rewriteBase(changeSet: ChangeSet): string | null {
    if (changeSet.authorReplacements.length > 0) {
        return null
    }
    // The change set is in import order, which is `git log` order, newest first.
    return changeSet.commits[changeSet.commits.length - 1]?.sha ?? null
}

/**
 * Render the shell lines that set `GHE_RANGE` to the revisions to rewrite: from the base commit's parent to `HEAD`, or all of `HEAD` when
 * the base is a root commit and has no parent to exclude.
 *
 * @param base The oldest edited commit.
 * @returns The lines, ready to splice into a script.
 */
export function renderRangeLines(base: string): string[] {
    return [
        `if git rev-parse --quiet --verify ${shellSingleQuote(`${base}^`)} >/dev/null; then`,
        `    GHE_RANGE=${shellSingleQuote(`${base}^..HEAD`)}`,
        "else",
        `    echo "The oldest edited commit is a root commit, so all of HEAD's history is rewritten." >&2`,
        "    GHE_RANGE=HEAD",
        "fi",
    ]
}
