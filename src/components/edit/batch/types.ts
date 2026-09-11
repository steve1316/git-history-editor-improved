/** Props shared by every batch dialog. */
export interface BatchDialogProps {
    /** Whether the dialog is showing. */
    open: boolean
    /** Called when the dialog should close. */
    onClose: () => void
}
