import { Box, FormControlLabel, Paper, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import { useState } from "react"
import { buildImportCommand, type ImportShell } from "../../core/importCommand"
import { MONO_FONT } from "../../theme"
import CopyButton from "../common/CopyButton"

/**
 * Guess the visitor's terminal from their browser, so Windows users see the PowerShell command first.
 *
 * @returns `powershell` on Windows, otherwise `posix`.
 */
function detectShell(): ImportShell {
    return typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent) ? "powershell" : "posix"
}

/**
 * Shows the `git log` command to run, with an optional commit limit. Copying this is the first thing anyone
 * does, so the button sits directly beside the command.
 *
 * @returns The command block.
 */
export default function ImportCommandBlock() {
    const [shell, setShell] = useState<ImportShell>(detectShell)
    const [limited, setLimited] = useState(false)
    const [limit, setLimit] = useState(100)

    const command = buildImportCommand({ shell, ...(limited ? { limit } : {}) })

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", mb: 1 }}>
                <Typography variant="subtitle2">Run this in your repository</Typography>
                <ToggleButtonGroup size="small" exclusive value={shell} onChange={(_, v: ImportShell | null) => v && setShell(v)}>
                    <ToggleButton value="posix">Linux / macOS / Git Bash</ToggleButton>
                    <ToggleButton value="powershell">Windows PowerShell</ToggleButton>
                </ToggleButtonGroup>
            </Box>
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
                {shell === "powershell" ? 'This runs in PowerShell, not Command Prompt. It copies the result straight to your clipboard, so paste it below once you see "Copied to clipboard". ' : ""}
                The output is base64-encoded so that newlines and spaces in commit messages survive the trip through your clipboard. Nothing leaves your browser.
            </Typography>
        </Paper>
    )
}
