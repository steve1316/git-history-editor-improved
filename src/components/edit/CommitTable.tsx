import { Box, Paper, Typography } from "@mui/material"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useRef, useState } from "react"
import { useStore } from "../../store"
import CommitRow, { GRID_COLUMNS } from "./CommitRow"

const HEADERS = ["", "", "Commit", "Author name", "Author email", "Author date", "Message", ""]

/** Estimated row height in pixels, used by the virtualizer before a row has been measured. */
const ROW_HEIGHT = 41

/**
 * The virtualized commit table. Only the visible rows are mounted, so an import of several thousand commits stays responsive.
 *
 * @returns The table.
 */
export default function CommitTable() {
    const commits = useStore((s) => s.current)
    const originals = useStore((s) => s.originals)
    const selected = useStore((s) => s.selected)
    const toggleSelected = useStore((s) => s.toggleSelected)
    const selectRange = useStore((s) => s.selectRange)
    const updateCommit = useStore((s) => s.updateCommit)
    const resetCommit = useStore((s) => s.resetCommit)

    const [expanded, setExpanded] = useState<string | null>(null)
    const [lastClicked, setLastClicked] = useState<string | null>(null)
    const parentRef = useRef<HTMLDivElement>(null)

    const selectedSet = new Set(selected)
    const originalBySha = new Map(originals.map((c) => [c.sha, c]))

    const virtualizer = useVirtualizer({
        count: commits.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 12,
    })

    const onToggle = (sha: string, shiftKey: boolean): void => {
        if (shiftKey && lastClicked) {
            selectRange(lastClicked, sha)
        } else {
            toggleSelected(sha)
        }
        setLastClicked(sha)
    }

    return (
        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <Box sx={{ display: "grid", gridTemplateColumns: GRID_COLUMNS, gap: 1, px: 1, py: 1, borderBottom: 1, borderColor: "divider", bgcolor: "action.hover" }}>
                {HEADERS.map((label, i) => (
                    <Typography key={i} variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {label}
                    </Typography>
                ))}
            </Box>

            <Box ref={parentRef} sx={{ height: "calc(100vh - 340px)", minHeight: 240, overflowY: "auto" }}>
                <Box sx={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                    {virtualizer.getVirtualItems().map((item) => {
                        const commit = commits[item.index]
                        if (!commit) {
                            return null
                        }
                        const original = originalBySha.get(commit.sha) ?? commit
                        return (
                            <Box
                                key={commit.sha}
                                ref={virtualizer.measureElement}
                                data-index={item.index}
                                sx={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${item.start}px)` }}
                            >
                                <CommitRow
                                    commit={commit}
                                    original={original}
                                    selected={selectedSet.has(commit.sha)}
                                    expanded={expanded === commit.sha}
                                    onToggle={onToggle}
                                    onExpand={(sha) => setExpanded(expanded === sha ? null : sha)}
                                    onChange={updateCommit}
                                    onReset={resetCommit}
                                />
                            </Box>
                        )
                    })}
                </Box>
            </Box>
        </Paper>
    )
}
