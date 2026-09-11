import { Box, TextField } from "@mui/material"
import { useState } from "react"

/** Props for `TextCell`. */
interface TextCellProps {
    /** The current value. */
    value: string
    /** Whether this value differs from the imported one, which draws the edited underline. */
    edited: boolean
    /** Called when the user commits a new value, on blur or Enter. */
    onCommit: (value: string) => void
}

/**
 * A single-line cell that shows plain text until clicked, then becomes an input. Committing on blur and Enter rather than on every keystroke
 * keeps the undo history one entry per edit instead of one per character.
 *
 * @param props Component props.
 * @returns The cell.
 */
export default function TextCell({ value, edited, onCommit }: TextCellProps) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(value)
    // Reset the draft when the value changes from outside (undo, reset, an external patch) rather than in a
    // useEffect, which would cause an extra render; this is React's documented pattern for adjusting state
    // in response to a prop change during render.
    const [prevValue, setPrevValue] = useState(value)
    if (value !== prevValue) {
        setPrevValue(value)
        setDraft(value)
    }

    const commit = (): void => {
        setEditing(false)
        if (draft !== value) {
            onCommit(draft)
        }
    }

    if (!editing) {
        return (
            <Box
                onClick={() => setEditing(true)}
                sx={{
                    cursor: "text",
                    py: 0.5,
                    minHeight: 28,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    borderBottom: edited ? 2 : 0,
                    borderColor: "warning.main",
                }}
            >
                {value}
            </Box>
        )
    }

    return (
        <TextField
            autoFocus
            size="small"
            fullWidth
            variant="standard"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    commit()
                } else if (e.key === "Escape") {
                    setDraft(value)
                    setEditing(false)
                }
            }}
        />
    )
}
