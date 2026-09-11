import { useEffect } from "react"
import { useStore } from "../store"

/**
 * Bind Ctrl+Z and Ctrl+Y, plus their macOS equivalents, to the undo history. Ignores key presses originating in a text field
 * so editing a commit message still has its own native undo.
 */
export function useUndoRedoShortcuts(): void {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            const target = event.target as HTMLElement | null
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
                return
            }
            if (!event.ctrlKey && !event.metaKey) {
                return
            }

            const key = event.key.toLowerCase()
            if (key === "z" && !event.shiftKey) {
                event.preventDefault()
                useStore.temporal.getState().undo()
            } else if (key === "y" || (key === "z" && event.shiftKey)) {
                event.preventDefault()
                useStore.temporal.getState().redo()
            }
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [])
}
