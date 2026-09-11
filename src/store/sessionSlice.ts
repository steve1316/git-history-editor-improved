/** Which of the three steps is showing. */
export type Step = 1 | 2 | 3

/** Theme preference. `system` follows the operating system. */
export type ThemeMode = "light" | "dark" | "system"

/** Whether timestamps render in each commit's own zone or in the viewer's. */
export type TimezoneMode = "commit" | "local"

/** Which script the Export step generates. */
export type ExportFormat = "filter-repo" | "filter-branch"

/** UI preferences and export options. None of these belong on the undo stack. */
export interface SessionSlice {
    /** The step currently showing. */
    step: Step
    /** The user's theme preference. */
    themeMode: ThemeMode
    /** How timestamps are rendered across the Edit table. */
    timezoneMode: TimezoneMode
    /** Whether generated scripts rewrite the committer identity alongside the author. */
    updateCommitter: boolean
    /** Which script the Export step shows. */
    exportFormat: ExportFormat
    /** Move to a step. */
    setStep: (step: Step) => void
    /** Set the theme preference. */
    setThemeMode: (mode: ThemeMode) => void
    /** Set the timezone rendering mode. */
    setTimezoneMode: (mode: TimezoneMode) => void
    /** Turn committer rewriting on or off. */
    setUpdateCommitter: (value: boolean) => void
    /** Choose the export format. */
    setExportFormat: (format: ExportFormat) => void
}

/** The subset of the store the session slice needs to write. */
type Setter = (partial: Partial<SessionSlice>) => void

/**
 * Build the session slice.
 *
 * @param set Store setter.
 * @returns The slice's state and actions.
 */
export function createSessionSlice(set: Setter): SessionSlice {
    return {
        step: 1,
        themeMode: "system",
        timezoneMode: "commit",
        updateCommitter: true,
        exportFormat: "filter-repo",

        setStep: (step) => set({ step }),
        setThemeMode: (themeMode) => set({ themeMode }),
        setTimezoneMode: (timezoneMode) => set({ timezoneMode }),
        setUpdateCommitter: (updateCommitter) => set({ updateCommitter }),
        setExportFormat: (exportFormat) => set({ exportFormat }),
    }
}
