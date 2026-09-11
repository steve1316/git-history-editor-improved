import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import { Button, Snackbar } from "@mui/material"
import { useState } from "react"

/** Props for `CopyButton`. */
interface CopyButtonProps {
    /** The text placed on the clipboard when the button is pressed. */
    value: string
    /** Button label. */
    label?: string
    /** Whether the button fills the width of its container. */
    fullWidth?: boolean
}

/**
 * A button that copies text to the clipboard and confirms with a transient message. Reports failure rather than appearing to
 * succeed, because a silent failure here leaves the user pasting stale content into their terminal.
 *
 * @param props Component props.
 * @returns The button and its confirmation snackbar.
 */
export default function CopyButton({ value, label = "Copy", fullWidth = false }: CopyButtonProps) {
    const [message, setMessage] = useState<string | null>(null)

    const onCopy = async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(value)
            setMessage("Copied to clipboard")
        } catch {
            setMessage("Could not copy. Select the text and copy it manually.")
        }
    }

    return (
        <>
            <Button startIcon={<ContentCopyIcon />} onClick={onCopy} variant="outlined" size="small" fullWidth={fullWidth} disabled={value.length === 0}>
                {label}
            </Button>
            <Snackbar open={message !== null} autoHideDuration={2500} onClose={() => setMessage(null)} message={message ?? ""} />
        </>
    )
}
