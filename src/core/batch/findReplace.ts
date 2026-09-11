import type { Commit } from "../types"

/** How a find and replace across commit messages should be performed. */
export interface FindReplaceOptions {
    /** The text or regular expression to search for. An empty string matches nothing. */
    find: string
    /** The replacement text. Capture references such as `$1` apply only when `useRegex` is on. */
    replace: string
    /** Whether `find` is a regular expression rather than literal text. */
    useRegex: boolean
    /** Whether matching is case sensitive. */
    caseSensitive: boolean
}

/** One commit whose message would change, shown in the dialog's preview. */
export interface FindReplaceRow {
    /** SHA of the matching commit. */
    sha: string
    /** The message as it stands. */
    before: string
    /** The message after the replacement. */
    after: string
}

/**
 * Build the regular expression a find and replace will use. Shared by the preview and the apply path so the
 * preview cannot drift from the result.
 *
 * @param options The search settings.
 * @returns The compiled expression, or `null` when the search is empty or the regex is invalid.
 */
export function compilePattern(options: FindReplaceOptions): RegExp | null {
    if (options.find.length === 0) {
        return null
    }

    const source = options.useRegex ? options.find : escapeRegex(options.find)
    const flags = options.caseSensitive ? "gm" : "gim"
    try {
        return new RegExp(source, flags)
    } catch {
        return null
    }
}

/**
 * List the selected commits whose message the replacement would change.
 *
 * @param commits All commits, in import order.
 * @param shas The SHAs in scope.
 * @param options The search settings.
 * @returns One row per changed commit, in import order.
 */
export function previewFindReplace(commits: Commit[], shas: Iterable<string>, options: FindReplaceOptions): FindReplaceRow[] {
    const pattern = compilePattern(options)
    const selected = new Set(shas)
    if (!pattern) {
        return []
    }

    const rows: FindReplaceRow[] = []
    for (const commit of commits) {
        if (!selected.has(commit.sha)) {
            continue
        }
        const after = replaceIn(commit.message, pattern, options)
        if (after !== commit.message) {
            rows.push({ sha: commit.sha, before: commit.message, after })
        }
    }
    return rows
}

/**
 * Apply the replacement to every selected commit's message.
 *
 * @param commits All commits, in import order.
 * @param shas The SHAs in scope.
 * @param options The search settings.
 * @returns A new array with the replacements applied.
 */
export function applyFindReplace(commits: Commit[], shas: Iterable<string>, options: FindReplaceOptions): Commit[] {
    const pattern = compilePattern(options)
    const selected = new Set(shas)
    if (!pattern) {
        return commits.slice()
    }

    return commits.map((commit) => (selected.has(commit.sha) ? { ...commit, message: replaceIn(commit.message, pattern, options) } : commit))
}

/**
 * Run one replacement, treating the replacement text literally unless regex mode is on.
 *
 * @param message The message to transform.
 * @param pattern The compiled search expression.
 * @param options The search settings, which decide how the replacement text is interpreted.
 * @returns The transformed message.
 */
function replaceIn(message: string, pattern: RegExp, options: FindReplaceOptions): string {
    const replacement = options.useRegex ? options.replace : options.replace.split("$").join("$$")
    return message.replace(pattern, replacement)
}

/**
 * Escape every regular expression metacharacter so a plain search is taken literally.
 *
 * @param value The literal text to search for.
 * @returns The text with metacharacters escaped.
 */
function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
