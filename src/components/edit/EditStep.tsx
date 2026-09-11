import SearchIcon from "@mui/icons-material/Search"
import { Box, FormControlLabel, InputAdornment, Stack, Switch, TextField, Typography } from "@mui/material"
import { useMemo, useState } from "react"
import { filterCommits } from "../../core/filterCommits"
import { useStore } from "../../store"
import ChangeStrip from "../common/ChangeStrip"
import BatchToolbar from "./batch/BatchToolbar"
import CommitTable from "./CommitTable"

/**
 * The Edit step: the filter, the batch toolbar, the commit table, and the change strip.
 *
 * @returns The Edit step.
 */
export default function EditStep() {
    const commits = useStore((s) => s.current)
    const timezoneMode = useStore((s) => s.timezoneMode)
    const setTimezoneMode = useStore((s) => s.setTimezoneMode)

    const [filter, setFilter] = useState("")
    const visible = useMemo(() => filterCommits(commits, filter), [commits, filter])

    return (
        <Stack spacing={1.5}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <TextField
                    size="small"
                    placeholder="Filter by author, message, or sha"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    sx={{ minWidth: 320 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
                <Typography variant="body2" color="text.secondary">
                    {visible.length === commits.length ? `${commits.length} commit${commits.length === 1 ? "" : "s"}` : `${visible.length} of ${commits.length} commits`}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <FormControlLabel
                    control={<Switch size="small" checked={timezoneMode === "local"} onChange={(e) => setTimezoneMode(e.target.checked ? "local" : "commit")} />}
                    label="Show times in my timezone"
                />
            </Box>
            <BatchToolbar visible={visible} />
            <CommitTable commits={visible} />
            <ChangeStrip />
        </Stack>
    )
}
