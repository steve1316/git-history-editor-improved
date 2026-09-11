import type { AuthorReplacement, Commit } from "../core/types"
import type { Store } from "./index"

/** Commit data and the operations that change it. */
export interface CommitsSlice {
    /** Commits exactly as imported. Never edited, so the diff always has a baseline. */
    originals: Commit[]
    /** Commits as edited. Same length and order as `originals`. */
    current: Commit[]
    /** Global author substitutions applied at export time rather than per commit. */
    authorReplacements: AuthorReplacement[]
    /** Replace the imported history and move to the Edit step. */
    importCommits: (commits: Commit[]) => void
    /** Apply a partial update to one commit. */
    updateCommit: (sha: string, patch: Partial<Commit>) => void
    /** Replace the whole edited array, used by the batch operations. */
    replaceCommits: (commits: Commit[]) => void
    /** Set the global author substitutions. */
    setAuthorReplacements: (replacements: AuthorReplacement[]) => void
    /** Revert one commit to its imported values. */
    resetCommit: (sha: string) => void
    /** Revert every commit and drop all author substitutions. */
    resetAll: () => void
    /** Discard the imported commits, edits, and selection, and return to the Import step. User preferences (theme, timezone mode, export options) deliberately survive. */
    clearSession: () => void
}

/** The subset of the store the commits slice needs to write. */
type Setter = (partial: Partial<Store>) => void

/** The subset of the store the commits slice needs to read. */
type Getter = () => CommitsSlice

/**
 * Build the commits slice.
 *
 * @param set Store setter.
 * @param get Store getter.
 * @returns The slice's state and actions.
 */
export function createCommitsSlice(set: Setter, get: Getter): CommitsSlice {
    return {
        originals: [],
        current: [],
        authorReplacements: [],

        importCommits: (commits) => set({ originals: commits, current: commits, authorReplacements: [], selected: [], step: 2 }),

        updateCommit: (sha, patch) => set({ current: get().current.map((c) => (c.sha === sha ? { ...c, ...patch } : c)) }),

        replaceCommits: (commits) => set({ current: commits }),

        setAuthorReplacements: (replacements) => set({ authorReplacements: replacements }),

        resetCommit: (sha) => {
            const original = get().originals.find((c) => c.sha === sha)
            if (!original) {
                return
            }
            set({ current: get().current.map((c) => (c.sha === sha ? original : c)) })
        },

        resetAll: () => set({ current: get().originals, authorReplacements: [] }),

        clearSession: () => set({ originals: [], current: [], authorReplacements: [], selected: [], step: 1 }),
    }
}
