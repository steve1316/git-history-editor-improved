import { temporal } from "zundo"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { shallow } from "zustand/shallow"
import { createCommitsSlice, type CommitsSlice } from "./commitsSlice"
import { createSelectionSlice, type SelectionSlice } from "./selectionSlice"
import { createSessionSlice, type SessionSlice } from "./sessionSlice"
import { guardedStorage } from "./storage"

/** The whole application store. */
export type Store = CommitsSlice & SelectionSlice & SessionSlice

/** How many undo steps to keep. Deep enough to be useful, shallow enough not to grow without bound on a large import. */
const UNDO_LIMIT = 100

export const useStore = create<Store>()(
    persist(
        temporal(
            (set, get) => ({
                ...createCommitsSlice(set, get as () => CommitsSlice),
                ...createSelectionSlice(set, get as () => SelectionSlice & { current: Store["current"] }),
                ...createSessionSlice(set),
            }),
            {
                limit: UNDO_LIMIT,
                partialize: (state) => ({ current: state.current, authorReplacements: state.authorReplacements }),
                // partialize decides WHAT is tracked; without an equality check zundo still records an
                // entry on every set, so theme and step changes would land on the undo stack.
                equality: shallow,
            },
        ),
        {
            name: "git-history-editor-improved",
            version: 1,
            storage: createJSONStorage(() => guardedStorage),
            partialize: (state) => ({
                originals: state.originals,
                current: state.current,
                authorReplacements: state.authorReplacements,
                selected: state.selected,
                step: state.step,
                themeMode: state.themeMode,
                timezoneMode: state.timezoneMode,
                updateCommitter: state.updateCommitter,
                exportFormat: state.exportFormat,
            }),
        },
    ),
)

export { isPersistenceAvailable } from "./storage"
export type { Step, ThemeMode, TimezoneMode, ExportFormat } from "./sessionSlice"
