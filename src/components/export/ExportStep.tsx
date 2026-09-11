import { Box, FormControlLabel, Stack, Switch, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import { useMemo } from "react"
import { changedCommitCount, computeChangeSet } from "../../core/diff"
import { FILTER_BRANCH_WARN_THRESHOLD, generateFilterBranchScript } from "../../core/export/filterBranch"
import { generateFilterRepoScript } from "../../core/export/filterRepo"
import { useStore } from "../../store"
import CopyButton from "../common/CopyButton"
import ChangeDiffList from "./ChangeDiffList"
import ExportWarnings from "./ExportWarnings"
import ScriptBlock from "./ScriptBlock"

/**
 * The Export step: the change diff, the format toggle, the warnings, and the generated script.
 *
 * @returns The Export step.
 */
export default function ExportStep() {
    const originals = useStore((s) => s.originals)
    const current = useStore((s) => s.current)
    const authorReplacements = useStore((s) => s.authorReplacements)
    const updateCommitter = useStore((s) => s.updateCommitter)
    const setUpdateCommitter = useStore((s) => s.setUpdateCommitter)
    const exportFormat = useStore((s) => s.exportFormat)
    const setExportFormat = useStore((s) => s.setExportFormat)

    const input = useMemo(() => ({ originals, current, authorReplacements, updateCommitter }), [originals, current, authorReplacements, updateCommitter])
    const changeSet = useMemo(() => computeChangeSet(input), [input])
    const script = useMemo(() => (exportFormat === "filter-repo" ? generateFilterRepoScript(input) : generateFilterBranchScript(input)), [input, exportFormat])

    const changed = changedCommitCount(changeSet)

    return (
        <Stack spacing={2} sx={{ maxWidth: 1100 }}>
            <Typography variant="h6">{changed === 0 ? "No changes to apply" : `${changed} commit${changed === 1 ? "" : "s"} will be changed`}</Typography>

            <ChangeDiffList changeSet={changeSet} />

            {script.length > 0 && (
                <>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                        <ToggleButtonGroup size="small" exclusive value={exportFormat} onChange={(_, v) => v && setExportFormat(v)}>
                            <ToggleButton value="filter-repo">git filter-repo</ToggleButton>
                            <ToggleButton value="filter-branch">git filter-branch</ToggleButton>
                        </ToggleButtonGroup>
                        <FormControlLabel control={<Switch size="small" checked={updateCommitter} onChange={(e) => setUpdateCommitter(e.target.checked)} />} label="Also update the committer" />
                        <Box sx={{ flex: 1 }} />
                        <CopyButton value={script} label="Copy script" />
                    </Box>

                    <ExportWarnings format={exportFormat} largeFilterBranch={exportFormat === "filter-branch" && changed > FILTER_BRANCH_WARN_THRESHOLD} />

                    <ScriptBlock script={script} />
                </>
            )}
        </Stack>
    )
}
