import { Box, Button, Chip, Divider, Paper } from "@mui/material"
import { useState } from "react"
import type { Commit } from "../../../core/types"
import { useStore } from "../../../store"
import FindReplaceDialog from "./FindReplaceDialog"
import ReplaceAuthorDialog from "./ReplaceAuthorDialog"
import SetAuthorDialog from "./SetAuthorDialog"
import ShiftDatesDialog from "./ShiftDatesDialog"

/** Which batch dialog is currently open, if any. */
type OpenDialog = "author" | "dates" | "message" | "global" | null

/** Props for `BatchToolbar`. */
interface BatchToolbarProps {
    /** The commits currently visible under the filter. "Select all" applies to these. */
    visible: Commit[]
}

/**
 * The toolbar above the commit table. Selection-scoped actions are disabled until something is selected; the global author
 * replacement is always available.
 *
 * @param props Component props.
 * @returns The toolbar.
 */
export default function BatchToolbar({ visible }: BatchToolbarProps) {
    const commits = useStore((s) => s.current)
    const originals = useStore((s) => s.originals)
    const selected = useStore((s) => s.selected)
    const setSelected = useStore((s) => s.setSelected)
    const clearSelected = useStore((s) => s.clearSelected)
    const replaceCommits = useStore((s) => s.replaceCommits)

    const [dialog, setDialog] = useState<OpenDialog>(null)
    const hasSelection = selected.length > 0

    const resetSelected = (): void => {
        const originalBySha = new Map(originals.map((c) => [c.sha, c]))
        const selectedSet = new Set(selected)
        replaceCommits(commits.map((c) => (selectedSet.has(c.sha) ? (originalBySha.get(c.sha) ?? c) : c)))
    }

    return (
        <Paper variant="outlined" sx={{ px: 1.5, py: 1, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Chip size="small" color={hasSelection ? "primary" : "default"} label={`${selected.length} selected`} />
            <Button size="small" onClick={() => setSelected(visible.map((c) => c.sha))} disabled={visible.length === 0}>
                Select all{visible.length === commits.length ? "" : " matching"}
            </Button>
            <Button size="small" onClick={clearSelected} disabled={!hasSelection}>
                Clear
            </Button>
            <Divider orientation="vertical" flexItem />
            <Button size="small" disabled={!hasSelection} onClick={() => setDialog("author")}>
                Set author
            </Button>
            <Button size="small" disabled={!hasSelection} onClick={() => setDialog("dates")}>
                Shift dates
            </Button>
            <Button size="small" disabled={!hasSelection} onClick={() => setDialog("message")}>
                Find and replace
            </Button>
            <Button size="small" disabled={!hasSelection} color="warning" onClick={resetSelected}>
                Reset selected
            </Button>
            <Divider orientation="vertical" flexItem />
            <Button size="small" onClick={() => setDialog("global")}>
                Replace an author everywhere
            </Button>
            <Box sx={{ flex: 1 }} />

            <SetAuthorDialog open={dialog === "author"} onClose={() => setDialog(null)} />
            <ShiftDatesDialog open={dialog === "dates"} onClose={() => setDialog(null)} />
            <FindReplaceDialog open={dialog === "message"} onClose={() => setDialog(null)} />
            <ReplaceAuthorDialog open={dialog === "global"} onClose={() => setDialog(null)} />
        </Paper>
    )
}
