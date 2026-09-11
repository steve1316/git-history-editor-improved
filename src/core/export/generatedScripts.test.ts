import { spawnSync } from "node:child_process"
import { describe, expect, it, type TestContext } from "vitest"
import { FIXTURE_COMMITS } from "../testFixtures"
import type { ExportInput } from "../types"
import { generateFilterBranchScript } from "./filterBranch"
import { generateFilterRepoScript } from "./filterRepo"

/**
 * Every other generator test asserts on the text of the output. These two hand the output to the interpreters that will actually read it,
 * which is the only way to catch a generator whose output parses as something other than what was intended.
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
})
