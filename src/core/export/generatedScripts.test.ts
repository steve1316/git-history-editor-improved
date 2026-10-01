import { spawnSync } from "node:child_process"
import { describe, expect, it, type TestContext } from "vitest"
import { FIXTURE_COMMITS } from "../testFixtures"
import type { ExportInput } from "../types"
import { generateFilterBranchScript } from "./filterBranch"
import { generateFilterRepoScript } from "./filterRepo"

/**
 * Every other generator test asserts on the text of the output. The syntax checks here hand the output to the interpreters that will actually
 * read it, which is the only way to catch a generator whose output parses as something other than what was intended. The rewrite-range
 * checks cover what both generators share: how much history they rewrite.
 *
 * Nothing here ever runs a generated script: `bash -n` only parses, and the Python callback is only compiled.
 */

/** An export covering all four editable fields plus a global author replacement, so both generators emit every construct they have. */
const INPUT: ExportInput = {
    originals: FIXTURE_COMMITS,
    current: [
        { ...FIXTURE_COMMITS[0]!, authorName: "Jane R. O'Doe", message: "Fix the log parser\n\nNow with a 'quote', a $var, a `backtick`, and a \\backslash.\n" },
        { ...FIXTURE_COMMITS[1]!, authorEmail: "jane@new.example", authored: { ...FIXTURE_COMMITS[1]!.authored, epochSeconds: FIXTURE_COMMITS[1]!.authored.epochSeconds + 3600 } },
        { ...FIXTURE_COMMITS[2]!, message: 'Add "export" tab\n\nesac\ndone\nfi\n' },
    ],
    authorReplacements: [{ matchEmail: "ali@example.com", name: "Ali R. Reza", email: "ali@new.example" }],
    updateCommitter: true,
}

/** One `cat > file <<'DELIM'` block lifted out of a generated script. */
interface Heredoc {
    /** The file the block writes, as written in the script. */
    file: string
    /** The block's contents, exactly as they would land on disk. */
    body: string
}

/**
 * Find the first command on PATH whose `--version` output starts with the expected word. Windows ships stub `python3` and `py` launchers
 * that print an install prompt instead, so matching the banner is what separates a real interpreter from a placeholder.
 *
 * @param candidates Command names to try, in order of preference.
 * @param banner Word the real tool's version output starts with.
 * @returns The first working command name, or `null` when none of them work.
 */
function findTool(candidates: string[], banner: string): string | null {
    for (const candidate of candidates) {
        const probe = spawnSync(candidate, ["--version"], { encoding: "utf8" })
        if (probe.status === 0 && `${probe.stdout}${probe.stderr}`.trimStart().startsWith(banner)) {
            return candidate
        }
    }
    return null
}

/**
 * Lift every heredoc block out of a generated script. Both generators deliver their real payload this way, and a quoted heredoc's contents
 * are opaque data to the surrounding shell, so a syntax check of the outer script alone would never look at them.
 *
 * @param script The generated script.
 * @returns One entry per block, in the order they appear.
 */
function extractHeredocs(script: string): Heredoc[] {
    const lines = script.split("\n")
    const blocks: Heredoc[] = []

    for (let i = 0; i < lines.length; i++) {
        const header = /^cat > (.+) <<'(.+)'$/.exec(lines[i]!)
        if (!header) {
            continue
        }
        const end = lines.indexOf(header[2]!, i + 1)
        expect(end).toBeGreaterThan(i)
        blocks.push({ file: header[1]!, body: lines.slice(i + 1, end).join("\n") })
        i = end
    }
    return blocks
}

/**
 * Syntax-check a shell fragment without executing any part of it.
 *
 * @param bash The bash command to use.
 * @param source The shell source to parse.
 * @returns Whatever the parser complained about, or an empty string when it parsed cleanly.
 */
function bashSyntaxError(bash: string, source: string): string {
    const result = spawnSync(bash, ["-n"], { input: source, encoding: "utf8" })
    return result.status === 0 ? `${result.stderr}${result.stdout}`.trim() : `${result.stderr}${result.stdout}`.trim() || `bash exited ${result.status}`
}

const PYTHON = findTool(["python", "python3"], "Python")
const BASH = findTool(["bash"], "GNU bash")

/**
 * Skip a test because its interpreter is missing, saying so loudly enough that a skipped run is not mistaken for a passing one.
 *
 * @param ctx The test context, which carries the skip.
 * @param reason What was missing and what therefore went unchecked.
 */
function skipMissingTool(ctx: TestContext, reason: string): void {
    console.warn(`SKIPPED, NOT VERIFIED: ${reason}`)
    ctx.skip(reason)
}

describe("the generated filter-repo callback", () => {
    it("compiles as Python once wrapped the way git filter-repo wraps it", (ctx) => {
        if (!PYTHON) {
            skipMissingTool(ctx, "no working `python` or `python3` on PATH, so the generated filter-repo callback was never compiled.")
            return
        }
        const blocks = extractHeredocs(generateFilterRepoScript(INPUT))
        expect(blocks).toHaveLength(1)
        // git filter-repo puts the --commit-callback text inside `def callback(commit, metadata):`, indented. Compiling the bare body would
        // miss exactly the indentation and block-structure mistakes that wrapping introduces.
        const wrapped = ["def callback(commit, metadata):", ...blocks[0]!.body.split("\n").map((line) => `  ${line}`)].join("\n")

        const result = spawnSync(PYTHON!, ["-c", "import sys; compile(sys.stdin.read(), '<callback>', 'exec')"], { input: wrapped, encoding: "utf8" })
        expect(`${result.stderr}${result.stdout}`.trim()).toBe("")
        expect(result.status).toBe(0)
    })
})

describe("the generated shell scripts", () => {
    it("parse under bash -n, filter bodies included", (ctx) => {
        if (!BASH) {
            skipMissingTool(ctx, "no working `bash` on PATH, so the generated scripts were never syntax-checked.")
            return
        }
        const repo = generateFilterRepoScript(INPUT)
        const branch = generateFilterBranchScript(INPUT)
        expect(repo).not.toBe("")
        expect(branch).not.toBe("")

        // The filter-branch payload is two shell filters inside heredocs, so those are checked as well as the script that writes them.
        const branchFilters = extractHeredocs(branch)
        expect(branchFilters.map((b) => b.file)).toEqual(['"$GHE_DIR/ghe-env-filter.sh"', '"$GHE_DIR/ghe-msg-filter.sh"'])

        for (const source of [repo, branch, ...branchFilters.map((b) => b.body)]) {
            expect(bashSyntaxError(BASH!, source)).toBe("")
        }
    })

    it("parse under bash -n when they rewrite a range rather than every ref", (ctx) => {
        if (!BASH) {
            skipMissingTool(ctx, "no working `bash` on PATH, so the range-limited scripts were never syntax-checked.")
            return
        }
        for (const script of [generateFilterRepoScript(PER_COMMIT_INPUT), generateFilterBranchScript(PER_COMMIT_INPUT)]) {
            expect(script).toContain('"$GHE_RANGE"')
            expect(bashSyntaxError(BASH!, script)).toBe("")
        }
    })
})

/** The same edits without the global author replacement, so the generators can limit the rewrite to the current branch. */
const PER_COMMIT_INPUT: ExportInput = { ...INPUT, authorReplacements: [] }

// Regression: both scripts used to rewrite every ref. Each re-created commit loses any signature, so an untouched signed commit on another
// branch, or deep in the current one, came back with a new hash and took every later hash with it.
describe("the rewrite range", () => {
    const oldest = FIXTURE_COMMITS[FIXTURE_COMMITS.length - 1]!.sha

    it.each([
        ["filter-branch", generateFilterBranchScript],
        ["filter-repo", generateFilterRepoScript],
    ])("is limited to the oldest edited commit onwards for per-commit edits in %s", (_, generate) => {
        const script = generate(PER_COMMIT_INPUT)
        expect(script).not.toContain("--all")
        expect(script).toContain(`GHE_RANGE='${oldest}^..HEAD'`)
        expect(script).toContain(`git rev-parse --quiet --verify '${oldest}^'`)
        expect(script).toContain("GHE_RANGE=HEAD")
    })

    it("starts from the oldest edited commit, which is the last one in import order", () => {
        const input: ExportInput = { ...PER_COMMIT_INPUT, current: [FIXTURE_COMMITS[0]!, { ...FIXTURE_COMMITS[1]!, authorName: "Edited" }, FIXTURE_COMMITS[2]!] }
        expect(generateFilterBranchScript(input)).toContain(`GHE_RANGE='${FIXTURE_COMMITS[1]!.sha}^..HEAD'`)
        expect(generateFilterRepoScript(input)).toContain(`GHE_RANGE='${FIXTURE_COMMITS[1]!.sha}^..HEAD'`)
    })

    it("covers every ref when a global author replacement is set, and says so", () => {
        const branch = generateFilterBranchScript(INPUT)
        expect(branch).toContain("-- --all")
        expect(branch).not.toContain("GHE_RANGE")
        expect(branch).toContain("rewrites every branch, tag and remote-tracking ref")

        const repo = generateFilterRepoScript(INPUT)
        expect(repo).not.toContain("--refs")
        expect(repo).toContain("rewrites every branch, tag and remote-tracking ref")
        expect(repo).toContain("removes the 'origin' remote")
    })

    it("tells the user rewritten commits lose their signatures", () => {
        for (const script of [generateFilterBranchScript(PER_COMMIT_INPUT), generateFilterRepoScript(PER_COMMIT_INPUT)]) {
            expect(script).toContain("Rewritten commits lose any signature")
            expect(script).toContain("edited or not")
        }
    })

    it("does not warn about the 'origin' remote when filter-repo only rewrites a range, since --refs keeps it", () => {
        expect(generateFilterRepoScript(PER_COMMIT_INPUT)).not.toContain("'origin' remote")
    })
})
