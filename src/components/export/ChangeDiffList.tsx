import { Box, Paper, Typography } from "@mui/material"
import type { ChangeSet, EditableField } from "../../core/types"
import { MONO_FONT } from "../../theme"

/** Human-readable names for the editable fields. */
const FIELD_LABELS: Record<EditableField, string> = {
    authorName: "author name",
    authorEmail: "author email",
    authored: "author date",
    message: "message",
}

/** Props for `ChangeDiffList`. */
interface ChangeDiffListProps {
    /** Every change that will be applied. */
    changeSet: ChangeSet
}

/**
 * Lists every field that will change, old value beside new. This is the last chance to spot a mistake before the script rewrites real history.
 *
 * @param props Component props.
 * @returns The diff list.
 */
export default function ChangeDiffList({ changeSet }: ChangeDiffListProps) {
    if (changeSet.commits.length === 0 && changeSet.authorReplacements.length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography color="text.secondary">Nothing has been changed yet. Go back to the Edit step to make some changes.</Typography>
            </Paper>
        )
    }

    return (
        <Paper variant="outlined" sx={{ maxHeight: 380, overflowY: "auto" }}>
            {changeSet.authorReplacements.map((r) => (
                <Box key={r.matchEmail} sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider", fontSize: 13 }}>
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                        everywhere
                    </Typography>
                    <Box component="span" sx={{ color: "error.main", textDecoration: "line-through" }}>
                        {r.matchEmail}
                    </Box>
                    {" -> "}
                    <Box component="span" sx={{ color: "success.main" }}>
                        {r.name} ({r.email})
                    </Box>
                </Box>
            ))}

            {changeSet.commits.map((commit) =>
                commit.changes.map((change) => (
                    <Box key={`${commit.sha}-${change.field}`} sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider", display: "flex", gap: 1.5, alignItems: "baseline" }}>
                        <Typography component="span" sx={{ fontFamily: MONO_FONT, fontSize: 12, color: "text.secondary", minWidth: 62 }}>
                            {commit.sha.slice(0, 7)}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ minWidth: 88 }}>
                            {FIELD_LABELS[change.field]}
                        </Typography>
                        <Box sx={{ fontFamily: MONO_FONT, fontSize: 12, whiteSpace: "pre-wrap", flex: 1 }}>
                            <Box component="span" sx={{ color: "error.main", textDecoration: "line-through" }}>
                                {change.before.trimEnd()}
                            </Box>
                            {" -> "}
                            <Box component="span" sx={{ color: "success.main" }}>
                                {change.after.trimEnd()}
                            </Box>
                        </Box>
                    </Box>
                )),
            )}
        </Paper>
    )
}
