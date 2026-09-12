import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Tab, Tabs, TextField } from "@mui/material"
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker"
import { DateTime } from "luxon"
import { useState } from "react"
import { isZeroOffset, shiftDates, spreadDates } from "../../../core/batch/shiftDates"
import { formatOffset } from "../../../core/gitDate"
import { useStore } from "../../../store"
import type { BatchDialogProps } from "./types"

/**
 * Describe the viewer's current UTC offset. The two range pickers are read as instants in the viewer's zone rather than in each commit's own
 * zone, which is the opposite of every other date surface in the app, so the fields have to say so.
 *
 * @returns A label such as `UTC-07:00`.
 */
function localZoneLabel(): string {
    const offset = formatOffset(DateTime.now().offset)
    return `UTC${offset.slice(0, 3)}:${offset.slice(3)}`
}

/**
 * Moves the selected commits' author dates, either by a relative offset that preserves their spacing, or by spreading them evenly across a range.
 *
 * @param props Component props.
 * @returns The dialog.
 */
export default function ShiftDatesDialog({ open, onClose }: BatchDialogProps) {
    const commits = useStore((s) => s.current)
    const selected = useStore((s) => s.selected)
    const replaceCommits = useStore((s) => s.replaceCommits)

    const [tab, setTab] = useState(0)
    const [years, setYears] = useState(0)
    const [days, setDays] = useState(0)
    const [hours, setHours] = useState(0)
    const [minutes, setMinutes] = useState(0)
    const [start, setStart] = useState<DateTime | null>(DateTime.now())
    const [end, setEnd] = useState<DateTime | null>(DateTime.now())

    const offset = { years, days, hours, minutes }
    const rangeInvalid = tab === 1 && (!start || !end || !start.isValid || !end.isValid || end.toMillis() < start.toMillis())
    const zoneHint = `Interpreted in your local time, ${localZoneLabel()}.`

    const apply = (): void => {
        if (tab === 0) {
            replaceCommits(shiftDates(commits, selected, offset))
        } else if (start && end && !rangeInvalid) {
            replaceCommits(spreadDates(commits, selected, Math.round(start.toMillis() / 1000), Math.round(end.toMillis() / 1000)))
        }
        onClose()
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Change dates on {selected.length} selected commits</DialogTitle>
            <DialogContent>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                    <Tab label="Shift by an offset" />
                    <Tab label="Spread across a range" />
                </Tabs>

                {tab === 0 ? (
                    <Stack spacing={2}>
                        <Alert severity="info">Every selected commit moves by the same amount, so the spacing between them is preserved. Use negative numbers to move backwards.</Alert>
                        <Stack direction="row" spacing={2}>
                            <TextField label="Years" type="number" value={years} onChange={(e) => setYears(Number(e.target.value) || 0)} fullWidth />
                            <TextField label="Days" type="number" value={days} onChange={(e) => setDays(Number(e.target.value) || 0)} fullWidth />
                            <TextField label="Hours" type="number" value={hours} onChange={(e) => setHours(Number(e.target.value) || 0)} fullWidth />
                            <TextField label="Minutes" type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 0)} fullWidth />
                        </Stack>
                    </Stack>
                ) : (
                    <Stack spacing={2}>
                        <Alert severity="info">The earliest selected commit lands on the start, the latest on the end, and the rest are spaced evenly between them.</Alert>
                        <DateTimePicker
                            label="Start"
                            value={start}
                            onChange={setStart}
                            format="yyyy-MM-dd HH:mm:ss"
                            ampm={false}
                            views={["year", "month", "day", "hours", "minutes", "seconds"]}
                            slotProps={{ textField: { helperText: zoneHint } }}
                        />
                        <DateTimePicker
                            label="End"
                            value={end}
                            onChange={setEnd}
                            format="yyyy-MM-dd HH:mm:ss"
                            ampm={false}
                            views={["year", "month", "day", "hours", "minutes", "seconds"]}
                            slotProps={{ textField: { error: rangeInvalid, helperText: rangeInvalid ? "The end must be after the start." : zoneHint } }}
                        />
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={apply} disabled={(tab === 0 && isZeroOffset(offset)) || rangeInvalid}>
                    Apply
                </Button>
            </DialogActions>
        </Dialog>
    )
}
