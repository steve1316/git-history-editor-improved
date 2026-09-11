import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Tab, Tabs, TextField } from "@mui/material"
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker"
import { useState } from "react"
import { shiftDates, spreadDates } from "../../../core/batch/shiftDates"
import { useStore } from "../../../store"
import type { BatchDialogProps } from "./types"

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
    const [days, setDays] = useState(0)
    const [hours, setHours] = useState(0)
    const [minutes, setMinutes] = useState(0)
    const [start, setStart] = useState<Date | null>(new Date())
    const [end, setEnd] = useState<Date | null>(new Date())

    const rangeInvalid = tab === 1 && (!start || !end || end.getTime() < start.getTime())

    const apply = (): void => {
        if (tab === 0) {
            replaceCommits(shiftDates(commits, selected, { days, hours, minutes }))
        } else if (start && end && !rangeInvalid) {
            replaceCommits(spreadDates(commits, selected, Math.round(start.getTime() / 1000), Math.round(end.getTime() / 1000)))
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
                            <TextField label="Days" type="number" value={days} onChange={(e) => setDays(Number(e.target.value) || 0)} fullWidth />
                            <TextField label="Hours" type="number" value={hours} onChange={(e) => setHours(Number(e.target.value) || 0)} fullWidth />
                            <TextField label="Minutes" type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 0)} fullWidth />
                        </Stack>
                    </Stack>
                ) : (
                    <Stack spacing={2}>
                        <Alert severity="info">The earliest selected commit lands on the start, the latest on the end, and the rest are spaced evenly between them.</Alert>
                        <DateTimePicker label="Start" value={start} onChange={setStart} format="yyyy-MM-dd HH:mm:ss" ampm={false} views={["year", "month", "day", "hours", "minutes", "seconds"]} />
                        <DateTimePicker
                            label="End"
                            value={end}
                            onChange={setEnd}
                            format="yyyy-MM-dd HH:mm:ss"
                            ampm={false}
                            views={["year", "month", "day", "hours", "minutes", "seconds"]}
                            slotProps={{ textField: { error: rangeInvalid, helperText: rangeInvalid ? "The end must be after the start." : " " } }}
                        />
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={apply} disabled={(tab === 0 && days === 0 && hours === 0 && minutes === 0) || rangeInvalid}>
                    Apply
                </Button>
            </DialogActions>
        </Dialog>
    )
}
