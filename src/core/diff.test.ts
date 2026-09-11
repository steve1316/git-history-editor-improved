import { describe, expect, it } from "vitest"
import { changedCommitCount, commitChanged, computeChangeSet } from "./diff"
import { FIXTURE_COMMITS } from "./testFixtures"
import type { Commit, ExportInput } from "./types"

/**
 * Build an `ExportInput` from the fixtures with one commit modified.
 *
 * @param index Index of the commit to modify.
 * @param patch Fields to overwrite on that commit.
 * @returns An export input whose `current` differs from `originals` only by `patch`.
 */
function withEdit(index: number, patch: Partial<Commit>): ExportInput {
    const current = FIXTURE_COMMITS.map((c, i) => (i === index ? { ...c, ...patch } : c))
    return { originals: FIXTURE_COMMITS, current, authorReplacements: [], updateCommitter: true }
}

describe("computeChangeSet", () => {
    it("reports nothing when nothing changed", () => {
        const set = computeChangeSet({ originals: FIXTURE_COMMITS, current: FIXTURE_COMMITS, authorReplacements: [], updateCommitter: true })
        expect(set.commits).toEqual([])
        expect(changedCommitCount(set)).toBe(0)
    })

    it("reports an author name change", () => {
        const set = computeChangeSet(withEdit(0, { authorName: "Jane R. Doe" }))
        expect(set.commits).toHaveLength(1)
        expect(set.commits[0]!.sha).toBe(FIXTURE_COMMITS[0]!.sha)
        expect(set.commits[0]!.changes).toEqual([{ field: "authorName", before: "Jane Doe", after: "Jane R. Doe" }])
    })

    it("reports an email change", () => {
        const set = computeChangeSet(withEdit(1, { authorEmail: "jane@example.com" }))
        expect(set.commits[0]!.changes).toEqual([{ field: "authorEmail", before: "j.doe@old-corp.com", after: "jane@example.com" }])
    })

    it("reports a timestamp change and renders both sides in the commit's own zone", () => {
        const moved = { ...FIXTURE_COMMITS[0]!.authored, epochSeconds: FIXTURE_COMMITS[0]!.authored.epochSeconds + 3600 }
        const set = computeChangeSet(withEdit(0, { authored: moved }))
        expect(set.commits[0]!.changes).toEqual([{ field: "authored", before: "2026-03-04 14:30:00 +0900", after: "2026-03-04 15:30:00 +0900" }])
    })

    it("treats an offset-only change as a change", () => {
        const rezoned = { ...FIXTURE_COMMITS[0]!.authored, offsetMinutes: 0 }
        const set = computeChangeSet(withEdit(0, { authored: rezoned }))
        expect(set.commits[0]!.changes[0]!.field).toBe("authored")
        expect(set.commits[0]!.changes[0]!.after).toBe("2026-03-04 05:30:00 +0000")
    })

    it("reports a message change", () => {
        const set = computeChangeSet(withEdit(2, { message: "Add export tab\n" }))
        expect(set.commits[0]!.changes[0]!.field).toBe("message")
    })

    it("reports several fields on one commit in a stable order", () => {
        const set = computeChangeSet(withEdit(0, { message: "New subject\n", authorName: "Someone Else" }))
        expect(set.commits[0]!.changes.map((c) => c.field)).toEqual(["authorName", "message"])
    })

    it("keeps commits in import order", () => {
        const current = FIXTURE_COMMITS.map((c) => ({ ...c, authorName: "Everyone" }))
        const set = computeChangeSet({ originals: FIXTURE_COMMITS, current, authorReplacements: [], updateCommitter: true })
        expect(set.commits.map((c) => c.sha)).toEqual(FIXTURE_COMMITS.map((c) => c.sha))
        expect(changedCommitCount(set)).toBe(3)
    })

    it("passes author replacements through untouched", () => {
        const replacements = [{ matchEmail: "j.doe@old-corp.com", name: "Jane Doe", email: "jane@example.com" }]
        const set = computeChangeSet({ originals: FIXTURE_COMMITS, current: FIXTURE_COMMITS, authorReplacements: replacements, updateCommitter: true })
        expect(set.authorReplacements).toEqual(replacements)
    })
})

describe("commitChanged", () => {
    const base = FIXTURE_COMMITS[0]!

    it("reports an unedited commit as unchanged", () => {
        expect(commitChanged(base, { ...base })).toBe(false)
    })

    it.each([
        ["authorName", { authorName: "Jane R. Doe" }],
        ["authorEmail", { authorEmail: "jane@new.example" }],
        ["message", { message: "Rewritten subject\n" }],
        ["authored", { authored: { ...base.authored, epochSeconds: base.authored.epochSeconds + 60 } }],
    ])("reports a change to %s", (_label, patch) => {
        expect(commitChanged(base, { ...base, ...patch })).toBe(true)
    })

    it("agrees with computeChangeSet, which is the point of sharing the comparison", () => {
        const current = FIXTURE_COMMITS.map((c, i) => (i === 1 ? { ...c, authorName: "Edited" } : c))
        const changed = computeChangeSet({ originals: FIXTURE_COMMITS, current, authorReplacements: [], updateCommitter: true }).commits.map((c) => c.sha)
        expect(FIXTURE_COMMITS.filter((c, i) => commitChanged(c, current[i]!)).map((c) => c.sha)).toEqual(changed)
    })

    it("counts an offset-only change, matching the diff's rendered comparison", () => {
        const shifted = { ...base, authored: { epochSeconds: base.authored.epochSeconds, offsetMinutes: 0 } }
        expect(commitChanged(base, shifted)).toBe(true)
    })
})
