import { describe, expect, it } from "vitest"
import { FIXTURE_COMMITS } from "../testFixtures"
import { applyFindReplace, compilePattern, previewFindReplace } from "./findReplace"

const ALL = FIXTURE_COMMITS.map((c) => c.sha)

describe("compilePattern", () => {
    it("escapes regex metacharacters in plain mode", () => {
        const re = compilePattern({ find: "a.b", replace: "", useRegex: false, caseSensitive: true })
        expect(re!.source).toBe("a\\.b")
    })

    it("honours the case sensitivity flag", () => {
        expect(compilePattern({ find: "fix", replace: "", useRegex: false, caseSensitive: false })!.flags).toContain("i")
        expect(compilePattern({ find: "fix", replace: "", useRegex: false, caseSensitive: true })!.flags).not.toContain("i")
    })

    it("returns null for an empty search", () => {
        expect(compilePattern({ find: "", replace: "x", useRegex: false, caseSensitive: true })).toBeNull()
    })

    it("returns null for an invalid regex rather than throwing", () => {
        expect(compilePattern({ find: "([", replace: "", useRegex: true, caseSensitive: true })).toBeNull()
    })
})

describe("previewFindReplace", () => {
    it("lists only the commits that actually match", () => {
        const rows = previewFindReplace(FIXTURE_COMMITS, ALL, { find: "Bump", replace: "Update", useRegex: false, caseSensitive: true })
        expect(rows).toHaveLength(1)
        expect(rows[0]!.sha).toBe(FIXTURE_COMMITS[1]!.sha)
        expect(rows[0]!.after).toBe("Update deps\n")
    })

    it("ignores commits outside the selection", () => {
        const rows = previewFindReplace(FIXTURE_COMMITS, [FIXTURE_COMMITS[0]!.sha], { find: "Bump", replace: "Update", useRegex: false, caseSensitive: true })
        expect(rows).toEqual([])
    })

    it("returns nothing when the pattern cannot compile", () => {
        expect(previewFindReplace(FIXTURE_COMMITS, ALL, { find: "([", replace: "", useRegex: true, caseSensitive: true })).toEqual([])
    })
})

describe("applyFindReplace", () => {
    it("replaces every occurrence, not just the first", () => {
        const commits = [{ ...FIXTURE_COMMITS[1]!, message: "fix fix fix\n" }]
        const result = applyFindReplace(commits, [commits[0]!.sha], { find: "fix", replace: "mend", useRegex: false, caseSensitive: true })
        expect(result[0]!.message).toBe("mend mend mend\n")
    })

    it("supports regex capture groups", () => {
        const commits = [{ ...FIXTURE_COMMITS[1]!, message: "JIRA-42: do the thing\n" }]
        const result = applyFindReplace(commits, [commits[0]!.sha], { find: "^(\\w+-\\d+): (.*)$", replace: "$2 ($1)", useRegex: true, caseSensitive: true })
        expect(result[0]!.message).toBe("do the thing (JIRA-42)\n")
    })

    it("treats the replacement literally in plain mode, so a dollar sign is not a capture reference", () => {
        const commits = [{ ...FIXTURE_COMMITS[1]!, message: "cost TBD\n" }]
        const result = applyFindReplace(commits, [commits[0]!.sha], { find: "TBD", replace: "$5", useRegex: false, caseSensitive: true })
        expect(result[0]!.message).toBe("cost $5\n")
    })

    it("matches case-insensitively when asked", () => {
        const commits = [{ ...FIXTURE_COMMITS[1]!, message: "Bump DEPS\n" }]
        const result = applyFindReplace(commits, [commits[0]!.sha], { find: "deps", replace: "dependencies", useRegex: false, caseSensitive: false })
        expect(result[0]!.message).toBe("Bump dependencies\n")
    })

    it("leaves non-matching and unselected commits untouched", () => {
        const result = applyFindReplace(FIXTURE_COMMITS, ALL, { find: "Bump", replace: "Update", useRegex: false, caseSensitive: true })
        expect(result[0]!.message).toBe(FIXTURE_COMMITS[0]!.message)
        expect(result[2]!.message).toBe(FIXTURE_COMMITS[2]!.message)
    })

    it("does not mutate the input", () => {
        const snapshot = FIXTURE_COMMITS[1]!.message
        applyFindReplace(FIXTURE_COMMITS, ALL, { find: "Bump", replace: "Update", useRegex: false, caseSensitive: true })
        expect(FIXTURE_COMMITS[1]!.message).toBe(snapshot)
    })

    it("returns the input unchanged when the pattern cannot compile", () => {
        expect(applyFindReplace(FIXTURE_COMMITS, ALL, { find: "([", replace: "", useRegex: true, caseSensitive: true })).toEqual(FIXTURE_COMMITS)
    })
})
