import { Box, FormControlLabel, Stack, Switch, Typography } from "@mui/material"
import { useStore } from "../../store"
import ChangeStrip from "../common/ChangeStrip"
import CommitTable from "./CommitTable"

/**
 * The Edit step: the commit table, the timezone toggle, and the change strip. The batch toolbar is added in the next task.
 *
 * @returns The Edit step.
 */
export default function EditStep() {
    const count = useStore((s) => s.current.length)
    const timezoneMode = useStore((s) => s.timezoneMode)
    const setTimezoneMode = useStore((s) => s.setTimezoneMode)

    return (
        <Stack spacing={1.5}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    {count} commit{count === 1 ? "" : "s"}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <FormControlLabel
                    control={<Switch size="small" checked={timezoneMode === "local"} onChange={(e) => setTimezoneMode(e.target.checked ? "local" : "commit")} />}
                    label="Show times in my timezone"
                />
            </Box>
            <CommitTable />
            <ChangeStrip />
        </Stack>
    )
}
