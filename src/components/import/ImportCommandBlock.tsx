import { Box, FormControlLabel, Paper, Switch, TextField, Typography } from "@mui/material"
import { useState } from "react"
import { buildImportCommand } from "../../core/importCommand"
import { MONO_FONT } from "../../theme"
import CopyButton from "../common/CopyButton"

/**
 * Shows the `git log` command to run, with an optional commit limit. Copying this is the first thing anyone
 * does, so the button sits directly beside the command.
 *
 * @returns The command block.
 */
export default function ImportCommandBlock() {
    const [limited, setLimited] = useState(false)
    const [limit, setLimit] = useState(100)

    const command = buildImportCommand(limited ? { limit } : {})

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
                Run this in your repository
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <Box component="pre" sx={{ flex: 1, m: 0, p: 1.5, borderRadius: 1, bgcolor: "action.hover", fontFamily: MONO_FONT, fontSize: 13, overflowX: "auto" }}>
                    {command}
                </Box>
                <CopyButton value={command} />
            </Box>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center", mt: 1.5 }}>
                <FormControlLabel control={<Switch size="small" checked={limited} onChange={(e) => setLimited(e.target.checked)} />} label="Limit the number of commits" />
                {limited && (
                    <TextField
                        size="small"
                        type="number"
                        label="Commits"
                        value={limit}
                        onChange={(e) => setLimit(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                        slotProps={{ htmlInput: { min: 1, step: 1 } }}
                        sx={{ width: 120 }}
                    />
                )}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                The output is base64-encoded so that newlines and spaces in commit messages survive the trip through your clipboard. Nothing leaves your browser.
            </Typography>
        </Paper>
    )
}
