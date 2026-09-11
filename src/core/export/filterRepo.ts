import { computeChangeSet } from "../diff"
import { chooseHeredocDelimiter, pythonBytes } from "../escape"
import { formatGitDate } from "../gitDate"
import type { Commit, EditableField, ExportInput } from "../types"

/** Name of the callback file the generated script writes and then deletes. */
const SCRIPT_FILE = "ghe-rewrite.py"

/**
 * Generate a `git filter-repo` invocation that applies every pending change. The Python callback is delivered through a quoted
 * heredoc, so the shell performs no expansion on commit data and the only escaping needed is Python's own.
 *
 * @param input The imported commits, the edited commits, the global author replacements, and whether to mirror changes onto the committer.
 * @returns The complete shell script, or an empty string when there is nothing to apply.
 */
export function generateFilterRepoScript(input: ExportInput): string {
    const changeSet = computeChangeSet(input)
    if (changeSet.commits.length === 0 && changeSet.authorReplacements.length === 0) {
        return ""
    }

    const currentBySha = new Map(input.current.map((c) => [c.sha, c]))
    const entries: string[] = []

    for (const commitChange of changeSet.commits) {
        const commit = currentBySha.get(commitChange.sha)
        if (!commit) {
            // Unreachable: `sha` is never edited and `originals`/`current` are documented as the same length and
            // order, so every `changeSet.commits` entry has a matching `current` commit under its original sha.
            continue
        }
        const fields = commitChange.changes.map((c) => c.field)
        entries.push(renderCommitEntry(commit, fields, input.updateCommitter))
    }

    const authorLines = changeSet.authorReplacements.map((r) => `    ${pythonBytes(r.matchEmail)}: (${pythonBytes(r.name)}, ${pythonBytes(r.email)}),`)
    const body = renderCallback(authorLines, entries, input.updateCommitter)
    const delimiter = chooseHeredocDelimiter(body)

    return [
        "# Requires: pip install git-filter-repo",
        "# This rewrites history and changes every downstream commit hash. Back up your repository first.",
        "# git filter-repo removes the 'origin' remote by design. Re-add it afterwards if you need it.",
        `cat > ${SCRIPT_FILE} <<'${delimiter}'`,
        body,
        delimiter,
        `git filter-repo --force --commit-callback "$(cat ${SCRIPT_FILE})"`,
        `rm -f ${SCRIPT_FILE}`,
        "",
    ].join("\n")
}

/**
 * Render one commit's entry in the `changes` dictionary.
 *
 * @param commit The edited commit, which supplies the new values.
 * @param fields The fields that changed on this commit.
 * @param updateCommitter Whether to mirror author changes onto the committer fields.
 * @returns The dictionary entry, indented and newline-terminated.
 */
function renderCommitEntry(commit: Commit, fields: EditableField[], updateCommitter: boolean): string {
    const lines: string[] = [`    ${pythonBytes(commit.sha)}: {`]

    for (const field of fields) {
        for (const [key, value] of renderField(commit, field, updateCommitter)) {
            lines.push(`        "${key}": ${value},`)
        }
    }
    lines.push("    },")
    return lines.join("\n")
}

/**
 * Map one edited field onto the filter-repo attribute names and values it sets.
 *
 * @param commit The edited commit.
 * @param field The field that changed.
 * @param updateCommitter Whether to mirror the change onto the committer fields.
 * @returns Attribute name and Python literal pairs, in emission order.
 */
function renderField(commit: Commit, field: EditableField, updateCommitter: boolean): Array<[string, string]> {
    switch (field) {
        case "authorName": {
            const value = pythonBytes(commit.authorName)
            return updateCommitter
                ? [
                      ["author_name", value],
                      ["committer_name", value],
                  ]
                : [["author_name", value]]
        }
        case "authorEmail": {
            const value = pythonBytes(commit.authorEmail)
            return updateCommitter
                ? [
                      ["author_email", value],
                      ["committer_email", value],
                  ]
                : [["author_email", value]]
        }
        case "authored": {
            const value = pythonBytes(formatGitDate(commit.authored))
            return updateCommitter
                ? [
                      ["author_date", value],
                      ["committer_date", value],
                  ]
                : [["author_date", value]]
        }
        case "message":
            return [["message", pythonBytes(commit.message)]]
    }
}

/**
 * Assemble the Python callback source. `git filter-repo` itself wraps `--commit-callback` text in
 * `def callback(commit, metadata): <this, indented>`, so this must be the function *body*, not a full `def` statement of
 * its own: a nested `def commit_callback(...)` here would only be defined and never invoked.
 *
 * @param authorLines Rendered entries for the global author replacement map.
 * @param entries Rendered entries for the per-commit change map.
 * @param updateCommitter Whether author replacements also rewrite the committer identity.
 * @returns The callback body, without its surrounding heredoc.
 */
function renderCallback(authorLines: string[], entries: string[], updateCommitter: boolean): string {
    const mirrorLine = updateCommitter ? "\n    commit.committer_name, commit.committer_email = replacement" : ""

    return [
        "authors = {",
        ...authorLines,
        "}",
        "",
        "changes = {",
        ...entries,
        "}",
        "",
        "replacement = authors.get(commit.author_email)",
        "if replacement:",
        "    commit.author_name, commit.author_email = replacement" + mirrorLine,
        "",
        "change = changes.get(commit.original_id)",
        "if change:",
        "    for field, value in change.items():",
        "        setattr(commit, field, value)",
    ].join("\n")
}
