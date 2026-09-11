import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material"
import { useState } from "react"
import { listAuthors } from "../../../core/batch/authorReplace"
import { useStore } from "../../../store"
import type { BatchDialogProps } from "./types"

/**
 * Adds a global author substitution. Unlike the other batch actions this ignores the selection, because it is emitted as a
 * condition in the generated script and so also reaches commits that were never imported.
 *
 * @param props Component props.
 * @returns The dialog.
 */
export default function ReplaceAuthorDialog({ open, onClose }: BatchDialogProps) {
    const commits = useStore((s) => s.originals)
    const replacements = useStore((s) => s.authorReplacements)
    const setAuthorReplacements = useStore((s) => s.setAuthorReplacements)

    const [matchEmail, setMatchEmail] = useState("")
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")

    const known = listAuthors(commits)

    const apply = (): void => {
        setAuthorReplacements([...replacements.filter((r) => r.matchEmail !== matchEmail), { matchEmail, name, email }])
        onClose()
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Replace an author everywhere</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Alert severity="info">This applies to every commit the script touches, including commits older than the ones you imported. It matches on the existing author email.</Alert>
                    <TextField select label="Replace this author" value={matchEmail} onChange={(e) => setMatchEmail(e.target.value)}>
                        {known.map((a) => (
                            <MenuItem key={`${a.name} ${a.email}`} value={a.email}>
                                {a.name} ({a.email}) - {a.count} commit{a.count === 1 ? "" : "s"}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField label="New name" value={name} onChange={(e) => setName(e.target.value)} />
                    <TextField label="New email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={apply} disabled={matchEmail.length === 0 || name.trim().length === 0 || email.trim().length === 0}>
                    Add replacement
                </Button>
            </DialogActions>
        </Dialog>
    )
}
