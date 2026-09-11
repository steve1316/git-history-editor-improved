import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material"
import { useState } from "react"
import { applyAuthorToSelection, listAuthors } from "../../../core/batch/authorReplace"
import { useStore } from "../../../store"
import type { BatchDialogProps } from "./types"

/**
 * Sets one author name and email on every selected commit.
 *
 * @param props Component props.
 * @returns The dialog.
 */
export default function SetAuthorDialog({ open, onClose }: BatchDialogProps) {
    const commits = useStore((s) => s.current)
    const selected = useStore((s) => s.selected)
    const replaceCommits = useStore((s) => s.replaceCommits)

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")

    const known = listAuthors(commits)

    const apply = (): void => {
        replaceCommits(applyAuthorToSelection(commits, selected, name, email))
        onClose()
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Set author on {selected.length} selected commits</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Autocomplete
                        freeSolo
                        options={known.map((a) => a.name)}
                        value={name}
                        onInputChange={(_, v) => setName(v)}
                        renderInput={(params) => <TextField {...params} label="Author name" autoFocus />}
                    />
                    <Autocomplete
                        freeSolo
                        options={known.map((a) => a.email)}
                        value={email}
                        onInputChange={(_, v) => setEmail(v)}
                        renderInput={(params) => <TextField {...params} label="Author email" />}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={apply} disabled={name.trim().length === 0 || email.trim().length === 0}>
                    Apply
                </Button>
            </DialogActions>
        </Dialog>
    )
}
