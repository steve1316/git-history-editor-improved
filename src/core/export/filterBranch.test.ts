import { describe, expect, it } from "vitest"
import { FIXTURE_COMMITS } from "../testFixtures"
import type { Commit, ExportInput } from "../types"
import { generateFilterBranchScript } from "./filterBranch"

/**
 * Build an `ExportInput` from the fixtures with one commit modified.
 *
 * @param index Index of the commit to modify.
 * @param patch Fields to overwrite on that commit.
 * @param overrides Extra export options to apply.
 * @returns An export input ready to hand to the generator.
 */
function withEdit(index: number, patch: Partial<Commit>, overrides: Partial<ExportInput> = {}): ExportInput {
    const current = FIXTURE_COMMITS.map((c, i) => (i === index ? { ...c, ...patch } : c))
    return { originals: FIXTURE_COMMITS, current, authorReplacements: [], updateCommitter: true, ...overrides }
}

describe("generateFilterBranchScript", () => {
    it("returns an empty string when nothing changed", () => {
        expect(generateFilterBranchScript({ originals: FIXTURE_COMMITS, current: FIXTURE_COMMITS, authorReplacements: [], updateCommitter: true })).toBe("")
    })

    it("captures the repository directory before filter-branch changes the working directory", () => {
        const script = generateFilterBranchScript(withEdit(0, { authorName: "Jane R. Doe" }))
        expect(script).toContain('export GHE_DIR="$PWD"')
        expect(script).toContain("--env-filter '. \"$GHE_DIR/ghe-env-filter.sh\"'")
    })

    it("matches commits with a case statement rather than a chain of elif", () => {
        const script = generateFilterBranchScript(withEdit(0, { authorName: "Jane R. Doe" }))
        expect(script).toContain('case "$GIT_COMMIT" in')
        expect(script).toContain(`${FIXTURE_COMMITS[0]!.sha})`)
        expect(script).not.toContain("elif")
    })

    it("exports both author and committer identity when that option is on", () => {
        const script = generateFilterBranchScript(withEdit(0, { authorName: "Jane R. Doe" }))
        expect(script).toContain("export GIT_AUTHOR_NAME='Jane R. Doe'")
        expect(script).toContain("export GIT_COMMITTER_NAME='Jane R. Doe'")
    })

    it("exports only the author when the committer option is off", () => {
        const script = generateFilterBranchScript(withEdit(0, { authorName: "Jane R. Doe" }, { updateCommitter: false }))
        expect(script).toContain("export GIT_AUTHOR_NAME='Jane R. Doe'")
        expect(script).not.toContain("GIT_COMMITTER_NAME")
    })

    it("writes dates in git's internal epoch and offset form", () => {
        const moved = { ...FIXTURE_COMMITS[0]!.authored, epochSeconds: FIXTURE_COMMITS[0]!.authored.epochSeconds + 3600 }
        const script = generateFilterBranchScript(withEdit(0, { authored: moved }))
        expect(script).toContain(`export GIT_AUTHOR_DATE='${FIXTURE_COMMITS[0]!.authored.epochSeconds + 3600} +0900'`)
    })

    it("escapes an embedded single quote in a name", () => {
        const script = generateFilterBranchScript(withEdit(0, { authorName: "O'Brien" }))
        expect(script).toContain("export GIT_AUTHOR_NAME='O'\\''Brien'")
    })

    it("emits a message filter with a nested heredoc and a passthrough default", () => {
        const script = generateFilterBranchScript(withEdit(1, { message: "New subject\n\nWith a body.\n" }))
        expect(script).toContain("cat <<'GHE_MSG'")
        expect(script).toContain("New subject\n\nWith a body.\nGHE_MSG")
        expect(script).toContain("*)\ncat\n;;")
    })

    it("omits the message filter entirely when no message changed", () => {
        const script = generateFilterBranchScript(withEdit(0, { authorName: "Jane R. Doe" }))
        expect(script).not.toContain("--msg-filter")
    })

    it("omits the env filter entirely when only a message changed", () => {
        const script = generateFilterBranchScript(withEdit(1, { message: "New subject\n" }))
        expect(script).not.toContain("--env-filter")
    })

    it("picks a different inner delimiter when a message contains the default one on its own line", () => {
        const script = generateFilterBranchScript(withEdit(1, { message: "Subject\n\nGHE_MSG\n" }))
        expect(script).toContain("cat <<'GHE_MSG_1'")
    })

    it("applies a global author replacement before the per-commit case", () => {
        const input: ExportInput = {
            originals: FIXTURE_COMMITS,
            current: FIXTURE_COMMITS,
            authorReplacements: [{ matchEmail: "j.doe@old-corp.com", name: "Jane Doe", email: "jane@example.com" }],
            updateCommitter: true,
        }
        const script = generateFilterBranchScript(input)
        expect(script).toContain('case "$GIT_AUTHOR_EMAIL" in')
        expect(script.indexOf('case "$GIT_AUTHOR_EMAIL" in')).toBeLessThan(script.indexOf('case "$GIT_COMMIT" in'))
    })

    it("cleans up its filter files and the filter-branch backup refs", () => {
        const script = generateFilterBranchScript(withEdit(0, { authorName: "Jane R. Doe" }))
        expect(script).toContain('rm -f "$GHE_DIR/ghe-env-filter.sh"')
        expect(script).toContain('rm -fr "$(git rev-parse --git-dir)/refs/original/"')
    })

    // Regression: filter-branch runs its filters with the working directory set to a temporary rewrite
    // directory, not the repository root, so a relative path to a filter file silently fails to resolve
    // there. This pins that every path handed to `--env-filter`/`--msg-filter` and every path a filter
    // file is written to is anchored through the absolute `$GHE_DIR`, never a bare relative filename.
    it("sources and writes every filter through the absolute $GHE_DIR path, never a relative one", () => {
        const script = generateFilterBranchScript(withEdit(1, { authorName: "Jane R. Doe", message: "New subject\n" }))
        expect(script).toContain('cat > "$GHE_DIR/ghe-env-filter.sh"')
        expect(script).toContain('cat > "$GHE_DIR/ghe-msg-filter.sh"')
        expect(script).toContain(`--env-filter '. "$GHE_DIR/ghe-env-filter.sh"'`)
        expect(script).toContain(`--msg-filter '. "$GHE_DIR/ghe-msg-filter.sh"'`)
        const envMentions = script.split("ghe-env-filter.sh").length - 1
        const anchoredEnvMentions = script.split("$GHE_DIR/ghe-env-filter.sh").length - 1
        const msgMentions = script.split("ghe-msg-filter.sh").length - 1
        const anchoredMsgMentions = script.split("$GHE_DIR/ghe-msg-filter.sh").length - 1
        expect(anchoredEnvMentions).toBe(envMentions)
        expect(anchoredMsgMentions).toBe(msgMentions)
    })
})
