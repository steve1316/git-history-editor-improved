import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, type TestContext } from "vitest"
import { buildImportCommand } from "../importCommand"
import { parseLog } from "../parseLog"
import type { Commit, ExportInput } from "../types"
import { generateFilterBranchScript } from "./filterBranch"
import { generateFilterRepoScript } from "./filterRepo"

/**
 * These tests run the generated scripts against a throwaway repository, because the bug they guard against is not visible in the script
 * text: an over-wide rewrite range re-creates commits the user never edited, and any signed commit among them loses its signature and
 * changes hash, taking every later hash with it.
 *
 * The repository mirrors the reported case: `main` holds an upstream commit carrying a `gpgsig` header, `origin/main` tracks it, and
 * `feature` adds three commits on top, two of which get edited.
 */

/** One day, in seconds. The edit applied to each chosen commit's author date. */
const ONE_DAY = 86400

/** A detached signature block. Never verified by anything here, only checked for presence, so its contents need not be real. */
const FAKE_SIGNATURE = ["gpgsig -----BEGIN PGP SIGNATURE-----", " ", " iQEzBAABCAAdFiEEfakefakefakefakefakefakefakefakefakeAAoJEfakefake", " -----END PGP SIGNATURE-----"]

/**
 * Probe for a command whose `--version` output starts with the expected word.
 *
 * @param command The command to run.
 * @param args Arguments that print the version.
 * @param banner Word the real tool's version output starts with.
 * @returns Whether the tool is present and real.
 */
function hasTool(command: string, args: string[], banner: string): boolean {
    const probe = spawnSync(command, args, { encoding: "utf8" })
    return probe.status === 0 && `${probe.stdout}${probe.stderr}`.trimStart().startsWith(banner)
}

const HAS_GIT_AND_BASH = hasTool("git", ["--version"], "git version") && hasTool("bash", ["--version"], "GNU bash")
const HAS_FILTER_REPO = HAS_GIT_AND_BASH && spawnSync("git", ["filter-repo", "--version"], { encoding: "utf8" }).status === 0

/** Repositories created by the current test, removed afterwards. */
const repos: string[] = []

afterEach(() => {
    for (const repo of repos.splice(0)) {
        rmSync(repo, { recursive: true, force: true })
    }
})

/**
 * Run git in a repository and return its trimmed output, failing the test on a non-zero exit.
 *
 * @param repo The repository directory.
 * @param args Git arguments.
 * @param input Optional standard input.
 * @returns Standard output, trimmed.
 */
function git(repo: string, args: string[], input?: string): string {
    const result = spawnSync("git", args, { cwd: repo, input, encoding: "utf8" })
    expect(result.status, `git ${args.join(" ")}\n${result.stderr}`).toBe(0)
    return result.stdout.trim()
}

/**
 * Make an empty commit on the current branch with a fixed, increasing timestamp, so `git log` order is deterministic.
 *
 * @param repo The repository directory.
 * @param subject The commit subject.
 * @param epoch Seconds since the epoch, used for both author and committer dates.
 * @returns The new commit's sha.
 */
function commit(repo: string, subject: string, epoch: number): string {
    const date = `${epoch} +0000`
    const result = spawnSync("git", ["commit", "--quiet", "--allow-empty", "-m", subject], {
        cwd: repo,
        encoding: "utf8",
        env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
    })
    expect(result.status, result.stderr).toBe(0)
    return git(repo, ["rev-parse", "HEAD"])
}

/** The shas of the fixture repository's interesting commits. */
interface Fixture {
    /** The repository directory. */
    repo: string
    /** The root commit. */
    root: string
    /** The signed upstream commit on `main`. */
    signed: string
    /** `main`'s tip, which is also `origin/main`. */
    main: string
}

/**
 * Build the fixture repository, with `feature` checked out.
 *
 * @returns The repository and the shas the assertions refer to.
 */
function buildRepo(): Fixture {
    const repo = mkdtempSync(join(tmpdir(), "ghe-scope-"))
    repos.push(repo)
    git(repo, ["init", "--quiet", "--initial-branch=main"])
    git(repo, ["config", "user.name", "Upstream Author"])
    git(repo, ["config", "user.email", "upstream@example.com"])
    git(repo, ["config", "commit.gpgsign", "false"])

    let epoch = 1_700_000_000
    const root = commit(repo, "root", (epoch += 60))
    commit(repo, "upstream one", (epoch += 60))

    // Re-create the next commit with a gpgsig header, the way GitHub's web editor signs commits.
    const unsigned = commit(repo, "upstream signed", (epoch += 60))
    const lines = git(repo, ["cat-file", "commit", unsigned]).split("\n")
    lines.splice(lines.findIndex((l) => l.startsWith("committer ")) + 1, 0, ...FAKE_SIGNATURE)
    const signed = git(repo, ["hash-object", "-t", "commit", "-w", "--stdin"], `${lines.join("\n")}\n`)
    git(repo, ["reset", "--quiet", "--soft", signed])

    const main = commit(repo, "upstream after signed", (epoch += 60))
    git(repo, ["remote", "add", "origin", "https://example.com/upstream.git"])
    git(repo, ["update-ref", "refs/remotes/origin/main", main])

    git(repo, ["switch", "--quiet", "-c", "feature"])
    for (const subject of ["feature one", "feature two", "feature three"]) {
        commit(repo, subject, (epoch += 60))
    }
    return { repo, root, signed, main }
}

/**
 * Import the repository exactly the way a user would: the raw output of the app's own `git log` command.
 *
 * @param repo The repository directory.
 * @returns The imported commits, newest first.
 */
function importLog(repo: string): Commit[] {
    const command = buildImportCommand().replace(/ \| base64 .*$/, "")
    const result = spawnSync("bash", ["-c", command], { cwd: repo, encoding: "utf8" })
    expect(result.status, result.stderr).toBe(0)
    const parsed = parseLog(result.stdout)
    if (!parsed.ok) {
        throw new Error(parsed.error)
    }
    return parsed.commits
}

/**
 * Shift the author date of the chosen commits by a day.
 *
 * @param originals The imported commits.
 * @param shas The commits to edit.
 * @returns An export input carrying exactly those edits.
 */
function editDates(originals: Commit[], shas: string[]): ExportInput {
    const current = originals.map((c) => (shas.includes(c.sha) ? { ...c, authored: { ...c.authored, epochSeconds: c.authored.epochSeconds + ONE_DAY } } : c))
    return { originals, current, authorReplacements: [], updateCommitter: false }
}

/**
 * Run a generated script in the repository.
 *
 * @param repo The repository directory.
 * @param script The script to run.
 * @returns What the script printed to standard output.
 */
function runScript(repo: string, script: string): string {
    expect(script).not.toBe("")
    const result = spawnSync("bash", ["-e", "-c", script], { cwd: repo, encoding: "utf8", env: { ...process.env, FILTER_BRANCH_SQUELCH_WARNING: "1" } })
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    return result.stdout
}

/**
 * Read a commit's author date as seconds since the epoch.
 *
 * @param repo The repository directory.
 * @param rev The commit to read.
 * @returns The author date.
 */
function authorEpoch(repo: string, rev: string): number {
    return Number(git(repo, ["log", "-1", "--format=%at", rev]))
}

/**
 * Skip a test because a tool is missing, saying so loudly enough that a skipped run is not mistaken for a passing one.
 *
 * @param ctx The test context, which carries the skip.
 * @param reason What was missing and what therefore went unchecked.
 */
function skipMissingTool(ctx: TestContext, reason: string): void {
    console.warn(`SKIPPED, NOT VERIFIED: ${reason}`)
    ctx.skip(reason)
}

const GENERATORS = [
    { name: "filter-branch", generate: generateFilterBranchScript, available: () => HAS_GIT_AND_BASH },
    { name: "filter-repo", generate: generateFilterRepoScript, available: () => HAS_FILTER_REPO },
] as const

describe.each(GENERATORS)("the generated $name script, run against a real repository", ({ name, generate, available }) => {
    it("rewrites only the edited commits and their descendants, leaving older history and other refs alone", (ctx) => {
        if (!available()) {
            skipMissingTool(ctx, `git, bash, or git ${name} is missing, so the ${name} rewrite scope was never exercised.`)
            return
        }
        const { repo, signed, main } = buildRepo()
        const originals = importLog(repo)
        const [three, two, one] = originals
        const before = { three: authorEpoch(repo, three!.sha), two: authorEpoch(repo, two!.sha), one: authorEpoch(repo, one!.sha) }

        runScript(repo, generate(editDates(originals, [two!.sha, one!.sha])))

        expect(git(repo, ["rev-parse", "main"])).toBe(main)
        expect(git(repo, ["rev-parse", "refs/remotes/origin/main"])).toBe(main)
        expect(git(repo, ["remote"])).toBe("origin")
        expect(git(repo, ["cat-file", "commit", signed])).toContain("gpgsig -----BEGIN PGP SIGNATURE-----")
        expect(git(repo, ["rev-parse", "feature~3"])).toBe(main)

        expect(authorEpoch(repo, "feature~2")).toBe(before.one + ONE_DAY)
        expect(authorEpoch(repo, "feature~1")).toBe(before.two + ONE_DAY)
        expect(authorEpoch(repo, "feature")).toBe(before.three)
    })

    it("still applies an edit to the root commit, which has no parent to start the range from", (ctx) => {
        if (!available()) {
            skipMissingTool(ctx, `git, bash, or git ${name} is missing, so the ${name} root-commit fallback was never exercised.`)
            return
        }
        const { repo, root, main } = buildRepo()
        const originals = importLog(repo)
        const before = authorEpoch(repo, root)

        runScript(repo, generate(editDates(originals, [root])))

        expect(git(repo, ["rev-parse", "main"])).toBe(main)
        expect(authorEpoch(repo, "feature~6")).toBe(before + ONE_DAY)
        expect(git(repo, ["rev-list", "--max-parents=0", "feature"])).not.toBe(root)
    })
})

describe("the generated filter-branch script's backup refs", () => {
    it("are kept, and the cleanup command it prints removes them", (ctx) => {
        if (!HAS_GIT_AND_BASH) {
            skipMissingTool(ctx, "git or bash is missing, so the filter-branch backup cleanup was never exercised.")
            return
        }
        const { repo } = buildRepo()
        const originals = importLog(repo)
        const output = runScript(repo, generateFilterBranchScript(editDates(originals, [originals[0]!.sha])))

        expect(git(repo, ["for-each-ref", "--format=%(refname)", "refs/original/"])).toBe("refs/original/refs/heads/feature")
        const cleanup = output.split("\n").find((line) => line.startsWith("  git for-each-ref"))
        expect(cleanup).toBeDefined()
        const result = spawnSync("bash", ["-e", "-c", cleanup!], { cwd: repo, encoding: "utf8" })
        expect(result.status, result.stderr).toBe(0)
        expect(git(repo, ["for-each-ref", "refs/original/"])).toBe("")
    })
})
