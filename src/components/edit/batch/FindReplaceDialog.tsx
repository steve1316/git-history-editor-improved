import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, TextField, Typography } from "@mui/material"
import { useState } from "react"
import { applyFindReplace, compilePattern, previewFindReplace, type FindReplaceOptions } from "../../../core/batch/findReplace"
import { useStore } from "../../../store"
import { MONO_FONT } from "../../../theme"
import type { BatchDialogProps } from "./types"

/**
 * Finds and replaces text across the selected commits' messages, showing exactly which commits change before anything is applied.
 *
 * @param props Component props.
 * @returns The dialog.
 */
export default function FindReplaceDialog({ open, onClose }: BatchDialogProps) {
    const commits = useStore((s) => s.current)
    const selected = useStore((s) => s.selected)
    const replaceCommits = useStore((s) => s.replaceCommits)

    const [options, setOptions] = useState<FindReplaceOptions>({ find: "", replace: "", useRegex: false, caseSensitive: true })

    const invalidRegex = options.useRegex && options.find.length > 0 && compilePattern(options) === null
    const rows = previewFindReplace(commits, selected, options)

    const apply = (): void => {
        replaceCommits(applyFindReplace(commits, selected, options))
        onClose()
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Find and replace in {selected.length} selected commit messages</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Find"
                        value={options.find}
                        onChange={(e) => setOptions({ ...options, find: e.target.value })}
                        error={invalidRegex}
                        helperText={invalidRegex ? "That is not a valid regular expression." : " "}
                        autoFocus
                    />
                    <TextField
                        label="Replace with"
                        value={options.replace}
                        onChange={(e) => setOptions({ ...options, replace: e.target.value })}
                        helperText={options.useRegex ? "Capture groups are available as $1, $2, and so on." : " "}
                    />
                    <Stack direction="row" spacing={2}>
                        <FormControlLabel control={<Checkbox checked={options.useRegex} onChange={(e) => setOptions({ ...options, useRegex: e.target.checked })} />} label="Regular expression" />
                        <FormControlLabel control={<Checkbox checked={options.caseSensitive} onChange={(e) => setOptions({ ...options, caseSensitive: e.target.checked })} />} label="Match case" />
                    </Stack>

                    {rows.length === 0 ? (
                        <Alert severity="info">No selected commit messages match.</Alert>
                    ) : (
                        <>
                            <Typography variant="subtitle2">
                                {rows.length} commit{rows.length === 1 ? "" : "s"} would change
                            </Typography>
                            <Box sx={{ maxHeight: 260, overflowY: "auto", border: 1, borderColor: "divider", borderRadius: 1 }}>
                                {rows.map((row) => (
                                    <Box key={row.sha} sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: "divider", fontFamily: MONO_FONT, fontSize: 12 }}>
                                        <Typography component="div" variant="caption" color="text.secondary">
                                            {row.sha.slice(0, 7)}
                                        </Typography>
                                        <Box sx={{ color: "error.main", whiteSpace: "pre-wrap", textDecoration: "line-through" }}>{row.before.trimEnd()}</Box>
                                        <Box sx={{ color: "success.main", whiteSpace: "pre-wrap" }}>{row.after.trimEnd()}</Box>
                                    </Box>
                                ))}
                            </Box>
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={apply} disabled={rows.length === 0}>
                    Replace in {rows.length} commit{rows.length === 1 ? "" : "s"}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
