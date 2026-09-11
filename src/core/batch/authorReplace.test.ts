import { describe, expect, it } from "vitest"
import { FIXTURE_COMMITS } from "../testFixtures"
import { applyAuthorToSelection, listAuthors } from "./authorReplace"

describe("listAuthors", () => {
    it("lists each distinct name and email pair once, with its commit count", () => {
        const authors = listAuthors(FIXTURE_COMMITS)
        expect(authors).toEqual([
            { name: "Ali Reza", email: "ali@example.com", count: 1 },
            { name: "Jane Doe", email: "j.doe@old-corp.com", count: 1 },
            { name: "Jane Doe", email: "jane@example.com", count: 1 },
        ])
    })

    it("sorts by commit count descending, then by name", () => {
        const commits = [...FIXTURE_COMMITS, { ...FIXTURE_COMMITS[1]! }, { ...FIXTURE_COMMITS[1]! }]
        const authors = listAuthors(commits)
        expect(authors[0]).toEqual({ name: "Jane Doe", email: "j.doe@old-corp.com", count: 3 })
    })

    it("returns an empty list for no commits", () => {
        expect(listAuthors([])).toEqual([])
    })
})

describe("applyAuthorToSelection", () => {
    it("sets name and email on the selected commits only", () => {
        const result = applyAuthorToSelection(FIXTURE_COMMITS, [FIXTURE_COMMITS[1]!.sha], "Jane Doe", "jane@example.com")
        expect(result[1]!.authorName).toBe("Jane Doe")
        expect(result[1]!.authorEmail).toBe("jane@example.com")
        expect(result[2]!.authorEmail).toBe(FIXTURE_COMMITS[2]!.authorEmail)
    })

    it("does not mutate the input", () => {
        const snapshot = FIXTURE_COMMITS[1]!.authorEmail
        applyAuthorToSelection(FIXTURE_COMMITS, [FIXTURE_COMMITS[1]!.sha], "X", "x@y.z")
        expect(FIXTURE_COMMITS[1]!.authorEmail).toBe(snapshot)
    })

    it("returns the input unchanged for an empty selection", () => {
        expect(applyAuthorToSelection(FIXTURE_COMMITS, [], "X", "x@y.z")).toEqual(FIXTURE_COMMITS)
    })
})
