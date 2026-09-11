import { describe, expect, it } from "vitest"
import { filterCommits } from "./filterCommits"
import { FIXTURE_COMMITS } from "./testFixtures"

describe("filterCommits", () => {
    it("returns everything for an empty query", () => {
        expect(filterCommits(FIXTURE_COMMITS, "")).toEqual(FIXTURE_COMMITS)
        expect(filterCommits(FIXTURE_COMMITS, "   ")).toEqual(FIXTURE_COMMITS)
    })

    it("matches on author name, case insensitively", () => {
        expect(filterCommits(FIXTURE_COMMITS, "ali reza").map((c) => c.sha)).toEqual([FIXTURE_COMMITS[2]!.sha])
    })

    it("matches on author email", () => {
        expect(filterCommits(FIXTURE_COMMITS, "old-corp").map((c) => c.sha)).toEqual([FIXTURE_COMMITS[1]!.sha])
    })

    it("matches on the message body, not just the subject", () => {
        expect(filterCommits(FIXTURE_COMMITS, "multi-line").map((c) => c.sha)).toEqual([FIXTURE_COMMITS[0]!.sha])
    })

    it("matches on a short sha prefix", () => {
        expect(filterCommits(FIXTURE_COMMITS, FIXTURE_COMMITS[1]!.sha.slice(0, 7)).map((c) => c.sha)).toEqual([FIXTURE_COMMITS[1]!.sha])
    })

    it("returns nothing when there is no match", () => {
        expect(filterCommits(FIXTURE_COMMITS, "zzzz")).toEqual([])
    })

    it("preserves import order", () => {
        expect(filterCommits(FIXTURE_COMMITS, "jane").map((c) => c.sha)).toEqual([FIXTURE_COMMITS[0]!.sha, FIXTURE_COMMITS[1]!.sha])
    })
})
