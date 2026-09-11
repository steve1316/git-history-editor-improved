import { fromZonedParts, toZonedParts } from "./gitDate"
import type { GitDate } from "./types"

/** Whether timestamps are shown in each commit's own zone or in the viewer's. Mirrors the store's `TimezoneMode`. */
export type DisplayMode = "commit" | "local"

/**
 * Build a `Date` suitable for handing to a date picker. In commit mode the returned `Date` is a deliberate fiction: its local wall-clock reads
 * the same as the commit's wall-clock in the commit's own zone, so the picker shows what `git log` would show rather than what the viewer's
 * timezone would.
 *
 * @param date The stored instant and its original offset.
 * @param mode Whether to render in the commit's zone or the viewer's.
 * @returns A `Date` the picker can edit.
 */
export function toLocalDate(date: GitDate, mode: DisplayMode): Date {
    if (mode === "local") {
        return new Date(date.epochSeconds * 1000)
    }
    const p = toZonedParts(date)
    return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
}

/**
 * Convert a picker's `Date` back into a stored instant, keeping the commit's original offset.
 *
 * @param value The `Date` the picker produced.
 * @param original The commit's stored date, which supplies the offset to preserve.
 * @param mode The mode `toLocalDate` was called with.
 * @returns The instant to store.
 */
export function fromLocalDate(value: Date, original: GitDate, mode: DisplayMode): GitDate {
    if (mode === "local") {
        return { epochSeconds: Math.round(value.getTime() / 1000), offsetMinutes: original.offsetMinutes }
    }
    const parts = {
        year: value.getFullYear(),
        month: value.getMonth() + 1,
        day: value.getDate(),
        hour: value.getHours(),
        minute: value.getMinutes(),
        second: value.getSeconds(),
    }
    return fromZonedParts(parts, original.offsetMinutes)
}
