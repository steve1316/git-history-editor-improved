import { Box, Typography } from "@mui/material"
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker"
import type { DateTime } from "luxon"
import { useState } from "react"
import { formatDisplay, formatOffset } from "../../core/gitDate"
import { fromPickerValue, toPickerValue, type DisplayMode } from "../../core/localDate"
import type { GitDate } from "../../core/types"
import { useStore } from "../../store"

/**
 * Render the read-only cell text. `formatDisplay` (in `core/gitDate`) always uses the commit's own offset, since
 * that is what the exported script needs; the table's "Show times in my timezone" toggle is purely a viewer
 * convenience, so it is applied here rather than in `core`.
 *
 * @param value The commit's author date.
 * @param mode Whether to render in the commit's own zone or the viewer's.
 * @returns The formatted date string.
 */
function formatForDisplayMode(value: GitDate, mode: DisplayMode): string {
    if (mode === "commit") {
        return formatDisplay(value)
    }
    const d = toPickerValue(value, "local")
    return `${d.toFormat("yyyy-MM-dd HH:mm:ss")} ${formatOffset(d.offset)}`
}

/** Props for `DateTimeCell`. */
interface DateTimeCellProps {
    /** The commit's author date. */
    value: GitDate
    /** Whether this value differs from the imported one. */
    edited: boolean
    /** Called when the user picks or types a new date. */
    onCommit: (value: GitDate) => void
}

/**
 * The author date cell. Renders as text until clicked, then becomes a MUI `DateTimePicker` that accepts both typing into its segments and
 * picking from the calendar and clock. The value shown is always in the commit's own timezone unless the viewer switched the table to local
 * time.
 *
 * @param props Component props.
 * @returns The cell.
 */
export default function DateTimeCell({ value, edited, onCommit }: DateTimeCellProps) {
    const timezoneMode = useStore((s) => s.timezoneMode)
    const [editing, setEditing] = useState(false)
    // MUI's picker is a controlled component once `value` is set: without an `onChange` handler that feeds
    // an updated value back in, `useControlledValue` discards every calendar click and typed keystroke, and
    // `onAccept` would fire with the value the picker opened with. `draft` is that missing piece of state.
    const [draft, setDraft] = useState<DateTime | null>(null)

    if (!editing) {
        return (
            <Box
                onClick={() => {
                    setDraft(toPickerValue(value, timezoneMode))
                    setEditing(true)
                }}
                sx={{ cursor: "text", py: 0.5, minHeight: 28, whiteSpace: "nowrap", borderBottom: edited ? 2 : 0, borderColor: "warning.main" }}
            >
                <Typography component="span" variant="body2">
                    {formatForDisplayMode(value, timezoneMode)}
                </Typography>
            </Box>
        )
    }

    return (
        <DateTimePicker
            autoFocus
            open
            // Without this, clicking into the field's own segments to type (rather than clicking the calendar)
            // is treated as a click away from the popup and silently closes it, per MUI's PickerPopper source.
            keepOpenDuringFieldFocus
            views={["year", "month", "day", "hours", "minutes", "seconds"]}
            format="yyyy-MM-dd HH:mm:ss"
            ampm={false}
            value={draft}
            onChange={(next) => setDraft(next)}
            onClose={() => setEditing(false)}
            onAccept={(next) => {
                if (next) {
                    onCommit(fromPickerValue(next, value, timezoneMode))
                }
                setEditing(false)
            }}
            slotProps={{ textField: { size: "small", variant: "standard", fullWidth: true } }}
        />
    )
}
