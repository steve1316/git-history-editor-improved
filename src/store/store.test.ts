import { beforeEach, describe, expect, it, vi } from "vitest"
import { FIXTURE_COMMITS } from "../core/testFixtures"
import { useStore } from "./index"
import { createSessionSlice } from "./sessionSlice"

beforeEach(() => {
    const backing = new Map<string, string>()
    vi.stubGlobal("localStorage", {
        getItem: (k: string) => backing.get(k) ?? null,
        setItem: (k: string, v: string) => void backing.set(k, v),
        removeItem: (k: string) => void backing.delete(k),
    })
    useStore.getState().clearSession()
    useStore.temporal.getState().clear()
})

describe("commits slice", () => {
    it("stores imported commits as both the original and the current copy", () => {
        useStore.getState().importCommits(FIXTURE_COMMITS)
        const state = useStore.getState()
        expect(state.originals).toEqual(FIXTURE_COMMITS)
        expect(state.current).toEqual(FIXTURE_COMMITS)
        expect(state.step).toBe(2)
    })

    it("edits one commit without touching the originals", () => {
        useStore.getState().importCommits(FIXTURE_COMMITS)
        useStore.getState().updateCommit(FIXTURE_COMMITS[0]!.sha, { authorName: "Edited" })
        expect(useStore.getState().current[0]!.authorName).toBe("Edited")
        expect(useStore.getState().originals[0]!.authorName).toBe("Jane Doe")
    })

    it("resets one commit back to its imported value", () => {
        useStore.getState().importCommits(FIXTURE_COMMITS)
        useStore.getState().updateCommit(FIXTURE_COMMITS[0]!.sha, { authorName: "Edited" })
        useStore.getState().resetCommit(FIXTURE_COMMITS[0]!.sha)
        expect(useStore.getState().current[0]).toEqual(FIXTURE_COMMITS[0])
    })

    it("resets everything, including author replacements", () => {
        useStore.getState().importCommits(FIXTURE_COMMITS)
        useStore.getState().updateCommit(FIXTURE_COMMITS[0]!.sha, { authorName: "Edited" })
        useStore.getState().setAuthorReplacements([{ matchEmail: "a@b.c", name: "N", email: "e@f.g" }])
        useStore.getState().resetAll()
        expect(useStore.getState().current).toEqual(FIXTURE_COMMITS)
        expect(useStore.getState().authorReplacements).toEqual([])
    })

    it("clears the session back to an empty import", () => {
        useStore.getState().importCommits(FIXTURE_COMMITS)
        useStore.getState().clearSession()
        expect(useStore.getState().originals).toEqual([])
        expect(useStore.getState().current).toEqual([])
        expect(useStore.getState().step).toBe(1)
    })

    it("keeps user preferences when the session is cleared", () => {
        useStore.getState().importCommits(FIXTURE_COMMITS)
        useStore.getState().setThemeMode("dark")
        useStore.getState().setExportFormat("filter-branch")
        useStore.getState().clearSession()

        expect(useStore.getState().originals).toEqual([])
        expect(useStore.getState().step).toBe(1)
        expect(useStore.getState().themeMode).toBe("dark")
        expect(useStore.getState().exportFormat).toBe("filter-branch")
    })
})

describe("selection slice", () => {
    beforeEach(() => {
        useStore.getState().importCommits(FIXTURE_COMMITS)
    })

    it("toggles a single sha on and off", () => {
        useStore.getState().toggleSelected(FIXTURE_COMMITS[0]!.sha)
        expect(useStore.getState().selected).toEqual([FIXTURE_COMMITS[0]!.sha])
        useStore.getState().toggleSelected(FIXTURE_COMMITS[0]!.sha)
        expect(useStore.getState().selected).toEqual([])
    })

    it("selects an inclusive range in display order", () => {
        const order = FIXTURE_COMMITS.map((c) => c.sha)
        useStore.getState().selectRange(FIXTURE_COMMITS[0]!.sha, FIXTURE_COMMITS[2]!.sha, order)
        expect(useStore.getState().selected).toEqual(FIXTURE_COMMITS.map((c) => c.sha))
    })

    it("selects the same range when the endpoints are given in reverse", () => {
        const order = FIXTURE_COMMITS.map((c) => c.sha)
        useStore.getState().selectRange(FIXTURE_COMMITS[2]!.sha, FIXTURE_COMMITS[0]!.sha, order)
        expect(useStore.getState().selected).toEqual(FIXTURE_COMMITS.map((c) => c.sha))
    })

    it("adds a range to an existing selection without duplicating", () => {
        const order = FIXTURE_COMMITS.map((c) => c.sha)
        useStore.getState().toggleSelected(FIXTURE_COMMITS[0]!.sha)
        useStore.getState().selectRange(FIXTURE_COMMITS[0]!.sha, FIXTURE_COMMITS[1]!.sha, order)
        expect(useStore.getState().selected).toEqual([FIXTURE_COMMITS[0]!.sha, FIXTURE_COMMITS[1]!.sha])
    })

    it("selects only the visible endpoints when the order given is a filtered view", () => {
        // A visible order of just the 1st and 3rd fixture commits, as CommitTable would pass while filtered.
        const visibleOrder = [FIXTURE_COMMITS[0]!.sha, FIXTURE_COMMITS[2]!.sha]
        useStore.getState().selectRange(FIXTURE_COMMITS[0]!.sha, FIXTURE_COMMITS[2]!.sha, visibleOrder)
        expect(useStore.getState().selected).toEqual([FIXTURE_COMMITS[0]!.sha, FIXTURE_COMMITS[2]!.sha])
    })

    it("preserves a previously selected commit that is now filtered out of the visible order", () => {
        useStore.getState().toggleSelected(FIXTURE_COMMITS[1]!.sha)
        const visibleOrder = [FIXTURE_COMMITS[0]!.sha, FIXTURE_COMMITS[2]!.sha]
        useStore.getState().selectRange(FIXTURE_COMMITS[0]!.sha, FIXTURE_COMMITS[2]!.sha, visibleOrder)
        expect(useStore.getState().selected).toEqual(FIXTURE_COMMITS.map((c) => c.sha))
    })

    it("drops selected shas that are no longer present after a re-import", () => {
        useStore.getState().setSelected(FIXTURE_COMMITS.map((c) => c.sha))
        useStore.getState().importCommits([FIXTURE_COMMITS[0]!])
        expect(useStore.getState().selected).toEqual([])
    })

    it("clears the selection", () => {
        useStore.getState().setSelected(FIXTURE_COMMITS.map((c) => c.sha))
        useStore.getState().clearSelected()
        expect(useStore.getState().selected).toEqual([])
    })
})

describe("undo and redo", () => {
    beforeEach(() => {
        useStore.getState().importCommits(FIXTURE_COMMITS)
        useStore.temporal.getState().clear()
    })

    it("undoes an edit", () => {
        useStore.getState().updateCommit(FIXTURE_COMMITS[0]!.sha, { authorName: "Edited" })
        useStore.temporal.getState().undo()
        expect(useStore.getState().current[0]!.authorName).toBe("Jane Doe")
    })

    it("redoes an undone edit", () => {
        useStore.getState().updateCommit(FIXTURE_COMMITS[0]!.sha, { authorName: "Edited" })
        useStore.temporal.getState().undo()
        useStore.temporal.getState().redo()
        expect(useStore.getState().current[0]!.authorName).toBe("Edited")
    })

    it("does not put step navigation on the undo stack", () => {
        useStore.getState().setStep(3)
        expect(useStore.temporal.getState().pastStates).toHaveLength(0)
    })

    it("does not put theme changes on the undo stack", () => {
        useStore.getState().setThemeMode("dark")
        expect(useStore.temporal.getState().pastStates).toHaveLength(0)
    })
})

describe("session slice", () => {
    it("starts on the first step with system theme and commit timezones", () => {
        const slice = createSessionSlice(() => {})
        expect(slice.step).toBe(1)
        expect(slice.themeMode).toBe("system")
        expect(slice.timezoneMode).toBe("commit")
        expect(slice.updateCommitter).toBe(true)
        expect(slice.exportFormat).toBe("filter-repo")
    })
})

describe("persistence", () => {
    it("persists session state but never the undo history", () => {
        useStore.getState().importCommits(FIXTURE_COMMITS)
        useStore.getState().updateCommit(FIXTURE_COMMITS[0]!.sha, { authorName: "Edited" })

        const raw = localStorage.getItem("git-history-editor-improved")
        expect(raw).not.toBeNull()
        // Guards persist's partialize whitelist: this is what keeps unintended state out of localStorage.
        // Note the nesting order of persist and temporal is NOT what protects this - zundo keeps its history
        // in a separate sub-store that persist never serialises, so either nesting passes these assertions.
        expect(raw).not.toContain("pastStates")
        expect(raw).not.toContain("futureStates")

        const persisted = JSON.parse(raw!).state
        expect(Object.keys(persisted).sort()).toEqual(["authorReplacements", "current", "exportFormat", "originals", "selected", "step", "themeMode", "timezoneMode", "updateCommitter"])
        // The edit itself must be in the persisted copy, or persistence is not doing its job.
        expect(persisted.current[0].authorName).toBe("Edited")
        // And the undo stack must still hold the edit in memory.
        expect(useStore.temporal.getState().pastStates.length).toBeGreaterThan(0)
    })
})

// These tests deliberately do not lean on the suite's `beforeEach`, which clears the temporal store itself and so
// hides the bug: every history entry they assert about is produced inside the test body.
describe("the undo boundary around an import", () => {
    it("does not leave the import itself on the undo stack", () => {
        useStore.getState().importCommits(FIXTURE_COMMITS)
        expect(useStore.temporal.getState().pastStates).toHaveLength(0)
    })

    it("cannot be undone past, so the table is never left empty", () => {
        useStore.getState().importCommits(FIXTURE_COMMITS)
        useStore.temporal.getState().undo()
        expect(useStore.getState().current).toEqual(FIXTURE_COMMITS)
        expect(useStore.getState().step).toBe(2)
    })

    it("keeps `current` and `originals` aligned after a re-import, so the diff and the script cannot disagree", () => {
        useStore.getState().importCommits(FIXTURE_COMMITS)
        useStore.getState().updateCommit(FIXTURE_COMMITS[0]!.sha, { authorName: "Edited" })

        const other = [{ ...FIXTURE_COMMITS[2]!, sha: "0123456789abcdef0123456789abcdef01234567" }]
        useStore.getState().importCommits(other)
        useStore.temporal.getState().undo()

        expect(useStore.getState().current).toEqual(other)
        expect(useStore.getState().current).toEqual(useStore.getState().originals)
    })

    it("clears the history when the session is cleared", () => {
        useStore.getState().importCommits(FIXTURE_COMMITS)
        useStore.getState().updateCommit(FIXTURE_COMMITS[0]!.sha, { authorName: "Edited" })
        useStore.getState().clearSession()

        expect(useStore.temporal.getState().pastStates).toHaveLength(0)
        useStore.temporal.getState().undo()
        expect(useStore.getState().current).toEqual([])
        expect(useStore.getState().step).toBe(1)
    })
})
