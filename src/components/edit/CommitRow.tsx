import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import { Box, Checkbox, IconButton, Tooltip, Typography } from "@mui/material"
import { formatDisplay } from "../../core/gitDate"
import type { Commit } from "../../core/types"
import { MONO_FONT } from "../../theme"
import DateTimeCell from "./DateTimeCell"
import MessagePanel from "./MessagePanel"
import TextCell from "./TextCell"

/** Column widths, shared by the header and every row so they stay aligned. */
export const GRID_COLUMNS = "40px 40px 90px minmax(140px, 1fr) minmax(180px, 1.2fr) minmax(200px, 1.4fr) minmax(220px, 1.8fr) 44px"

/** Props for `CommitRow`. */
interface CommitRowProps {
    /** The commit as edited. */
    commit: Commit
    /** The commit as imported, used to mark which fields changed. */
    original: Commit
    /** Whether this row's checkbox is ticked. */
    selected: boolean
    /** Whether the full message panel is open. */
    expanded: boolean
    /** Called when the checkbox is clicked. `shiftKey` signals a range selection. */
    onToggle: (sha: string, shiftKey: boolean) => void
    /** Called when the expand chevron is clicked. */
    onExpand: (sha: string) => void
    /** Called when any field is edited. */
    onChange: (sha: string, patch: Partial<Commit>) => void
    /** Called when the row's reset button is pressed. */
    onReset: (sha: string) => void
}

/**
 * One commit row, plus its expandable full-message panel.
 *
 * @param props Component props.
 * @returns The row.
 */
export default function CommitRow({ commit, original, selected, expanded, onToggle, onExpand, onChange, onReset }: CommitRowProps) {
    const dirty =
        commit.authorName !== original.authorName ||
        commit.authorEmail !== original.authorEmail ||
        commit.message !== original.message ||
        formatDisplay(commit.authored) !== formatDisplay(original.authored)

    return (
        <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: selected ? "action.selected" : undefined }}>
            <Box sx={{ display: "grid", gridTemplateColumns: GRID_COLUMNS, alignItems: "center", gap: 1, px: 1 }}>
                <Checkbox size="small" checked={selected} onClick={(e) => onToggle(commit.sha, e.shiftKey)} />
                <IconButton size="small" onClick={() => onExpand(commit.sha)}>
                    {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
                <Typography component="span" sx={{ fontFamily: MONO_FONT, fontSize: 12, color: "text.secondary" }}>
                    {commit.sha.slice(0, 7)}
                </Typography>
                <TextCell value={commit.authorName} edited={commit.authorName !== original.authorName} onCommit={(v) => onChange(commit.sha, { authorName: v })} />
                <TextCell value={commit.authorEmail} edited={commit.authorEmail !== original.authorEmail} onCommit={(v) => onChange(commit.sha, { authorEmail: v })} />
                <DateTimeCell value={commit.authored} edited={formatDisplay(commit.authored) !== formatDisplay(original.authored)} onCommit={(v) => onChange(commit.sha, { authored: v })} />
                <TextCell
                    value={commit.message.split("\n")[0] ?? ""}
                    edited={commit.message !== original.message}
                    onCommit={(v) => onChange(commit.sha, { message: [v, ...commit.message.split("\n").slice(1)].join("\n") })}
                />
                <Tooltip title={dirty ? "Reset this commit" : ""}>
                    <span>
                        <IconButton size="small" disabled={!dirty} onClick={() => onReset(commit.sha)}>
                            <RestartAltIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>
            {expanded && <MessagePanel value={commit.message} onCommit={(v) => onChange(commit.sha, { message: v })} />}
        </Box>
    )
}
