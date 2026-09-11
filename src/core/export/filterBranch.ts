import { computeChangeSet } from "../diff"
import { chooseHeredocDelimiter, shellSingleQuote } from "../escape"
import { formatGitDate } from "../gitDate"
import type { Commit, EditableField, ExportInput } from "../types"

/** Above this many changed commits the UI warns that the generated script is unwieldy and recommends filter-repo. */
export const FILTER_BRANCH_WARN_THRESHOLD = 50

/**
 * Generate a legacy `git filter-branch` script for users who cannot install `git filter-repo`. Filters are written to files and sourced
 * through an absolute path, because filter-branch runs them from a temporary directory rather than the repository root.
 *
 * @param input The imported commits, the edited commits, the global author replacements, and whether to mirror changes onto the committer.
 * @returns The complete shell script, or an empty string when there is nothing to apply.
 */
export function generateFilterBranchScript(input: ExportInput): string {
    const changeSet = computeChangeSet(input)
    if (changeSet.commits.length === 0 && changeSet.authorReplacements.length === 0) {
        return ""
    }

    const currentBySha = new Map(input.current.map((c) => [c.sha, c]))
    const envCases: string[] = []
    const msgCases: string[] = []
    const messages: string[] = []

    for (const commitChange of changeSet.commits) {
        const commit = currentBySha.get(commitChange.sha)
        if (!commit) {
            continue
        }
        const fields = commitChange.changes.map((c) => c.field)
        const exports = fields.flatMap((f) => renderExports(commit, f, input.updateCommitter))
        if (exports.length > 0) {
            envCases.push(`${shellSingleQuote(commit.sha)})\n${exports.map((e) => `    ${e}`).join("\n")}\n    ;;`)
        }
        if (fields.includes("message")) {
            messages.push(commit.message)
        }
    }

    const msgDelimiter = chooseHeredocDelimiter(messages.join("\n"), "GHE_MSG")
    for (const commitChange of changeSet.commits) {
        const commit = currentBySha.get(commitChange.sha)
        if (!commit || !commitChange.changes.some((c) => c.field === "message")) {
            continue
        }
        const body = commit.message.replace(/\n$/, "")
        msgCases.push(`${shellSingleQuote(commit.sha)})\ncat <<'${msgDelimiter}'\n${body}\n${msgDelimiter}\n;;`)
    }

    const replacementCase = renderAuthorReplacements(changeSet.authorReplacements, input.updateCommitter)
    const lines: string[] = [
        "# Legacy fallback. git filter-branch is deprecated - prefer the filter-repo script.",
        "# This rewrites history and changes every downstream commit hash. Back up your repository first.",
        'export GHE_DIR="$PWD"',
    ]

    const hasEnv = envCases.length > 0 || replacementCase.length > 0
    if (hasEnv) {
        const body = [replacementCase, envCases.length > 0 ? `case "$GIT_COMMIT" in\n${envCases.join("\n")}\nesac` : ""].filter((p) => p.length > 0).join("\n")
        lines.push(...heredoc("ghe-env-filter.sh", body))
    }
    if (msgCases.length > 0) {
        const body = `case "$GIT_COMMIT" in\n${msgCases.join("\n")}\n*)\ncat\n;;\nesac`
        lines.push(...heredoc("ghe-msg-filter.sh", body))
    }

    const filters: string[] = []
    if (hasEnv) {
        filters.push(`--env-filter '. "$GHE_DIR/ghe-env-filter.sh"'`)
    }
    if (msgCases.length > 0) {
        filters.push(`--msg-filter '. "$GHE_DIR/ghe-msg-filter.sh"'`)
    }

    lines.push(`git filter-branch --force ${filters.join(" ")} -- --all`)
    if (hasEnv) {
        lines.push(`rm -f "$GHE_DIR/ghe-env-filter.sh"`)
    }
    if (msgCases.length > 0) {
        lines.push(`rm -f "$GHE_DIR/ghe-msg-filter.sh"`)
    }
    lines.push(`rm -fr "$(git rev-parse --git-dir)/refs/original/"`, "")

    return lines.join("\n")
}

/**
 * Wrap a filter body in a quoted heredoc that writes it to a file beside the repository.
 *
 * @param fileName Name of the filter file to write.
 * @param body The filter source.
 * @returns The lines that write the file.
 */
function heredoc(fileName: string, body: string): string[] {
    const delimiter = chooseHeredocDelimiter(body)
    return [`cat > "$GHE_DIR/${fileName}" <<'${delimiter}'`, body, delimiter]
}

/**
 * Render the `export` lines one changed field implies.
 *
 * @param commit The edited commit, which supplies the new values.
 * @param field The field that changed.
 * @param updateCommitter Whether to mirror the change onto the committer variables.
 * @returns Shell `export` statements, without indentation.
 */
function renderExports(commit: Commit, field: EditableField, updateCommitter: boolean): string[] {
    const pairs: Record<Exclude<EditableField, "message">, [string, string, string]> = {
        authorName: ["GIT_AUTHOR_NAME", "GIT_COMMITTER_NAME", commit.authorName],
        authorEmail: ["GIT_AUTHOR_EMAIL", "GIT_COMMITTER_EMAIL", commit.authorEmail],
        authored: ["GIT_AUTHOR_DATE", "GIT_COMMITTER_DATE", formatGitDate(commit.authored)],
    }

    if (field === "message") {
        return []
    }

    const [authorVar, committerVar, rawValue] = pairs[field]
    const value = shellSingleQuote(rawValue)
    return updateCommitter ? [`export ${authorVar}=${value}`, `export ${committerVar}=${value}`] : [`export ${authorVar}=${value}`]
}

/**
 * Render the global author replacement case, which matches on the existing author email so it also covers commits outside the imported set.
 *
 * @param replacements The replacements to apply.
 * @param updateCommitter Whether a replacement also rewrites the committer identity.
 * @returns The case statement, or an empty string when there are no replacements.
 */
function renderAuthorReplacements(replacements: ExportInput["authorReplacements"], updateCommitter: boolean): string {
    if (replacements.length === 0) {
        return ""
    }

    const cases = replacements.map((r) => {
        const name = shellSingleQuote(r.name)
        const email = shellSingleQuote(r.email)
        const exports = [`    export GIT_AUTHOR_NAME=${name}`, `    export GIT_AUTHOR_EMAIL=${email}`]
        if (updateCommitter) {
            exports.push(`    export GIT_COMMITTER_NAME=${name}`, `    export GIT_COMMITTER_EMAIL=${email}`)
        }
        return `${shellSingleQuote(r.matchEmail)})\n${exports.join("\n")}\n    ;;`
    })

    return `case "$GIT_AUTHOR_EMAIL" in\n${cases.join("\n")}\nesac`
}
