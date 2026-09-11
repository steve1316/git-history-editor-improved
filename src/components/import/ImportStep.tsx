import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material"
import { useState, type DragEvent } from "react"
import { parseLog } from "../../core/parseLog"
import { useStore } from "../../store"
import ImportCommandBlock from "./ImportCommandBlock"
import { SAMPLE_LOG } from "./sampleData"

/**
 * The Import step. Accepts a pasted base64 blob, raw log text, or a dropped file, and can load bundled sample data.
 *
 * @returns The Import step.
 */
export default function ImportStep() {
    const importCommits = useStore((s) => s.importCommits)
    const [text, setText] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [dragging, setDragging] = useState(false)

    const runImport = (value: string): void => {
        const result = parseLog(value)
        if (!result.ok) {
            setError(result.error)
            return
        }
        setError(null)
        importCommits(result.commits)
    }

    const onDrop = async (event: DragEvent<HTMLDivElement>): Promise<void> => {
        event.preventDefault()
        setDragging(false)
        const file = event.dataTransfer.files[0]
        if (!file) {
            return
        }
        const content = await file.text()
        setText(content)
        runImport(content)
    }

    return (
        <Stack spacing={2} sx={{ maxWidth: 1100 }}>
            <Typography variant="body1">Paste the output of the command below to load your commits. Everything happens in your browser - no repository data is uploaded anywhere.</Typography>

            <ImportCommandBlock />

            <Paper
                variant="outlined"
                onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                sx={{ p: 2, borderStyle: dragging ? "dashed" : "solid", borderColor: dragging ? "primary.main" : "divider", borderWidth: 2 }}
            >
                <TextField
                    multiline
                    minRows={6}
                    maxRows={16}
                    fullWidth
                    placeholder="Paste the command output here, or drop a file anywhere in this box"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    slotProps={{ input: { sx: { fontFamily: "monospace", fontSize: 12 } } }}
                />
            </Paper>

            {error && <Alert severity="error">{error}</Alert>}

            <Box sx={{ display: "flex", gap: 1 }}>
                <Button variant="contained" onClick={() => runImport(text)} disabled={text.trim().length === 0}>
                    Import commits
                </Button>
                <Button
                    onClick={() => {
                        setText(SAMPLE_LOG)
                        runImport(SAMPLE_LOG)
                    }}
                >
                    Try it with sample data
                </Button>
                <Box sx={{ flex: 1 }} />
                <Button
                    color="inherit"
                    onClick={() => {
                        setText("")
                        setError(null)
                    }}
                    disabled={text.length === 0}
                >
                    Clear
                </Button>
            </Box>
        </Stack>
    )
}
