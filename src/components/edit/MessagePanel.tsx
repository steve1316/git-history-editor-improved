import { Box, TextField } from "@mui/material"
import { useState } from "react"

/** Props for `MessagePanel`. */
interface MessagePanelProps {
    /** The full commit message, body included. */
    value: string
    /** Called when the user commits a new message, on blur. */
    onCommit: (value: string) => void
}

/**
 * The expanded row's full message editor. A commit message is often multi-line, and the table cell only ever shows its subject, so this is
 * where the body is edited.
 *
 * @param props Component props.
 * @returns The panel.
 */
export default function MessagePanel({ value, onCommit }: MessagePanelProps) {
    const [draft, setDraft] = useState(value)
    // Reset the draft when the value changes from outside (undo, reset, an external patch) rather than in a
    // useEffect, which would cause an extra render; this is React's documented pattern for adjusting state
    // in response to a prop change during render.
    const [prevValue, setPrevValue] = useState(value)
    if (value !== prevValue) {
        setPrevValue(value)
        setDraft(value)
    }

    return (
        <Box sx={{ px: 2, py: 1.5, bgcolor: "action.hover" }}>
            <TextField
                multiline
                fullWidth
                minRows={3}
                maxRows={20}
                label="Full commit message"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => draft !== value && onCommit(draft)}
                slotProps={{ input: { sx: { fontFamily: "monospace", fontSize: 13 } } }}
            />
        </Box>
    )
}
