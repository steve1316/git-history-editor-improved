import type { StateStorage } from "zustand/middleware"

let available = true

/**
 * Report whether session persistence is working. The UI shows a warning when it is not, rather than silently losing the user's work on refresh.
 *
 * @returns `true` while localStorage reads and writes are succeeding.
 */
export function isPersistenceAvailable(): boolean {
    return available
}

/**
 * A localStorage adapter that degrades instead of throwing. Private browsing, blocked site data, and an exceeded quota all
 * surface as exceptions, and none of them should take the app down.
 */
export const guardedStorage: StateStorage = {
    getItem: (name) => {
        try {
            return localStorage.getItem(name)
        } catch {
            available = false
            return null
        }
    },
    setItem: (name, value) => {
        try {
            localStorage.setItem(name, value)
        } catch {
            available = false
        }
    },
    removeItem: (name) => {
        try {
            localStorage.removeItem(name)
        } catch {
            available = false
        }
    },
}
