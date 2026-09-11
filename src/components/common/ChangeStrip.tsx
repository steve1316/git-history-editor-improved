import RedoIcon from "@mui/icons-material/Redo"
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import UndoIcon from "@mui/icons-material/Undo"
import { Box, Button, Divider, Paper, Tooltip, Typography } from "@mui/material"
import { useStore as useZustandStore } from "zustand"
import { useStore } from "../../store"
import { changedCommitCount, computeChangeSet } from "../../core/diff"

/**
 * The thin strip pinned below the Edit table. Shows how many commits carry changes and gives undo, redo, and reset-all a permanent home.
 *
 * @returns The strip.
 */
export default function ChangeStrip() {
    const originals = useStore((s) => s.originals)
    const current = useStore((s) => s.current)
    const authorReplacements = useStore((s) => s.authorReplacements)
    const resetAll = useStore((s) => s.resetAll)

    const changed = changedCommitCount(computeChangeSet({ originals, current, authorReplacements, updateCommitter: true }))
    const canUndo = useZustandStore(useStore.temporal, (s) => s.pastStates.length > 0)
    const canRedo = useZustandStore(useStore.temporal, (s) => s.futureStates.length > 0)

    return (
        <Paper square elevation={3} sx={{ position: "sticky", bottom: 0, zIndex: 2, px: 2, py: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {changed === 0 ? "No changes yet" : `${changed} commit${changed === 1 ? "" : "s"} changed`}
            </Typography>
            {authorReplacements.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                    plus {authorReplacements.length} author replacement{authorReplacements.length === 1 ? "" : "s"}
                </Typography>
            )}
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Undo (Ctrl+Z)">
                <span>
                    <Button size="small" startIcon={<UndoIcon />} disabled={!canUndo} onClick={() => useStore.temporal.getState().undo()}>
                        Undo
                    </Button>
                </span>
            </Tooltip>
            <Tooltip title="Redo (Ctrl+Y)">
                <span>
                    <Button size="small" startIcon={<RedoIcon />} disabled={!canRedo} onClick={() => useStore.temporal.getState().redo()}>
                        Redo
                    </Button>
                </span>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <Button size="small" color="warning" startIcon={<RestartAltIcon />} disabled={changed === 0 && authorReplacements.length === 0} onClick={resetAll}>
                Reset all
            </Button>
        </Paper>
    )
}
