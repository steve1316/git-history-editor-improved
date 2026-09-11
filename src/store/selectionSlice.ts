import type { Commit } from "../core/types"

/** Which commits the batch actions apply to. */
export interface SelectionSlice {
    /** SHAs of the selected commits, in display order. An array rather than a `Set` so it survives JSON persistence. */
    selected: string[]
    /** Add or remove one SHA. */
    toggleSelected: (sha: string) => void
    /** Add every commit between two SHAs inclusive, in the given display order, regardless of which endpoint came first. */
    selectRange: (fromSha: string, toSha: string, order: string[]) => void
    /** Replace the selection outright. */
    setSelected: (shas: string[]) => void
    /** Deselect everything. */
    clearSelected: () => void
}

/** The subset of the store the selection slice needs to write. */
type Setter = (partial: Partial<SelectionSlice>) => void

/** The subset of the store the selection slice needs to read. */
type Getter = () => SelectionSlice & { current: Commit[] }

/**
 * Build the selection slice.
 *
 * @param set Store setter.
 * @param get Store getter.
 * @returns The slice's state and actions.
 */
export function createSelectionSlice(set: Setter, get: Getter): SelectionSlice {
    return {
        selected: [],

        toggleSelected: (sha) => {
            const selected = get().selected
            set({ selected: selected.includes(sha) ? selected.filter((s) => s !== sha) : [...selected, sha] })
        },

        selectRange: (fromSha, toSha, order) => {
            const a = order.indexOf(fromSha)
            const b = order.indexOf(toSha)
            if (a < 0 || b < 0) {
                return
            }
            const range = order.slice(Math.min(a, b), Math.max(a, b) + 1)
            const merged = new Set([...get().selected, ...range])
            // Order by the full commit list, not just `order` (which may be a filtered view), so a shift-click
            // made while filtered keeps any previously selected commit that is currently hidden.
            const fullOrder = get().current.map((c) => c.sha)
            set({ selected: fullOrder.filter((sha) => merged.has(sha)) })
        },

        setSelected: (shas) => set({ selected: shas }),

        clearSelected: () => set({ selected: [] }),
    }
}
