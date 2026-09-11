import { describe, expect, it } from "vitest"
import { FIXTURE_COMMITS } from "../testFixtures"
import type { Commit, ExportInput } from "../types"
import { generateFilterRepoScript } from "./filterRepo"

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

describe("generateFilterRepoScript", () => {
    it("returns an empty string when nothing changed", () => {
        expect(generateFilterRepoScript({ originals: FIXTURE_COMMITS, current: FIXTURE_COMMITS, authorReplacements: [], updateCommitter: true })).toBe("")
    })

    it("wraps the callback in a quoted heredoc so the shell expands nothing", () => {
        const script = generateFilterRepoScript(withEdit(0, { authorName: "Jane R. Doe" }))
        expect(script).toContain("cat > ghe-rewrite.py <<'GHE_EOF'")
        expect(script).toContain("\nGHE_EOF\n")
        expect(script).toContain('git filter-repo --force --commit-callback "$(cat ghe-rewrite.py)"')
    })

    it("keys the change map on the original commit hash as bytes", () => {
        const script = generateFilterRepoScript(withEdit(0, { authorName: "Jane R. Doe" }))
        expect(script).toContain(`    b"${FIXTURE_COMMITS[0]!.sha}": {`)
    })

    it("emits only the fields that actually changed", () => {
        const script = generateFilterRepoScript(withEdit(0, { authorName: "Jane R. Doe" }))
        expect(script).toContain('"author_name": b"Jane R. Doe"')
        expect(script).not.toContain('"message":')
        expect(script).not.toContain('"author_email":')
    })

    it("omits commits that did not change", () => {
        const script = generateFilterRepoScript(withEdit(0, { authorName: "Jane R. Doe" }))
        expect(script).not.toContain(FIXTURE_COMMITS[1]!.sha)
        expect(script).not.toContain(FIXTURE_COMMITS[2]!.sha)
    })

    it("mirrors author changes onto the committer when that option is on", () => {
        const script = generateFilterRepoScript(withEdit(0, { authorName: "Jane R. Doe" }))
        expect(script).toContain('"committer_name": b"Jane R. Doe"')
    })

    it("leaves the committer alone when that option is off", () => {
        const script = generateFilterRepoScript(withEdit(0, { authorName: "Jane R. Doe" }, { updateCommitter: false }))
        expect(script).toContain('"author_name": b"Jane R. Doe"')
        expect(script).not.toContain('"committer_name"')
    })

    it("writes dates in git's internal epoch and offset form, preserving the original zone", () => {
        const moved = { ...FIXTURE_COMMITS[0]!.authored, epochSeconds: FIXTURE_COMMITS[0]!.authored.epochSeconds + 3600 }
        const script = generateFilterRepoScript(withEdit(0, { authored: moved }))
        expect(script).toContain(`"author_date": b"${FIXTURE_COMMITS[0]!.authored.epochSeconds + 3600} +0900"`)
    })

    it("escapes a multi-line message into a single-line bytes literal", () => {
        const script = generateFilterRepoScript(withEdit(1, { message: "New subject\n\nWith a body.\n" }))
        expect(script).toContain('"message": b"New subject\\n\\nWith a body.\\n"')
    })

    it("leaves shell metacharacters in a message untouched, because the heredoc is quoted", () => {
        const script = generateFilterRepoScript(withEdit(1, { message: "Fix $HOME and `date` handling\n" }))
        expect(script).toContain('"message": b"Fix $HOME and `date` handling\\n"')
    })

    it("emits a global author replacement block applied before the per-commit map", () => {
        const input: ExportInput = {
            originals: FIXTURE_COMMITS,
            current: FIXTURE_COMMITS,
            authorReplacements: [{ matchEmail: "j.doe@old-corp.com", name: "Jane Doe", email: "jane@example.com" }],
            updateCommitter: true,
        }
        const script = generateFilterRepoScript(input)
        expect(script).toContain('    b"j.doe@old-corp.com": (b"Jane Doe", b"jane@example.com"),')
        expect(script.indexOf("authors.get(commit.author_email)")).toBeLessThan(script.indexOf("changes.get(commit.original_id)"))
    })

    it("keeps the default delimiter even when a message contains it, because messages are escaped onto a single line", () => {
        const script = generateFilterRepoScript(withEdit(1, { message: "Subject\n\nGHE_EOF\n" }))
        expect(script).toContain("cat > ghe-rewrite.py <<'GHE_EOF'")
        expect(script).toContain('"message": b"Subject\\n\\nGHE_EOF\\n"')
    })

    it("emits the callback as top-level statements, never wrapped in a def", () => {
        const script = generateFilterRepoScript(withEdit(0, { authorName: "Jane R. Doe" }))
        const match = /<<'([A-Z0-9_]+)'\n([\s\S]*?)\n\1\n/.exec(script)
        expect(match).not.toBeNull()

        const body = match![2]!
        // git filter-repo wraps this body in its own def, so our own def would define a function it never calls.
        expect(body).not.toMatch(/^\s*def\s/m)
        // The executable statements must sit at column zero, or filter-repo's re-indentation produces invalid Python.
        expect(body).toMatch(/^replacement = authors\.get\(commit\.author_email\)$/m)
        expect(body).toMatch(/^change = changes\.get\(commit\.original_id\)$/m)
        expect(body).toMatch(/^if change:$/m)
    })

    it("produces pure printable ASCII even for a unicode message", () => {
        const script = generateFilterRepoScript(withEdit(1, { message: "Add caf\u00e9 menu\n" }))
        const body = script.split("\n").filter((l) => l.includes('"message"'))
        expect(body).toHaveLength(1)
        expect(/^[\x20-\x7e]*$/.test(body[0]!)).toBe(true)
    })
})
