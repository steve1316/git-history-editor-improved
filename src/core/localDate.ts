import { DateTime, FixedOffsetZone } from "luxon"
import { fromZonedParts } from "./gitDate"
import type { GitDate } from "./types"

/** Whether timestamps are shown in each commit's own zone or in the viewer's. Mirrors the store's `TimezoneMode`. */
export type DisplayMode = "commit" | "local"

/**
 * Build the value to hand a date picker. In commit mode the value is carried in a fixed-offset zone built from the commit's own
 * `offsetMinutes`, so the picker displays exactly the wall-clock time `git log` would show, whatever zone the viewer is in.
 *
 * A fixed-offset zone has no daylight saving rules, so there is no spring-forward gap and every wall-clock time it can name exists.
 * That is what a host-zone `Date` could not promise: a commit whose own wall clock fell inside the viewer's gap had no `Date` that
 * read it back, and the runtime silently normalised the display an hour forward.
 *
 * @param date The stored instant and its original offset.
 * @param mode Whether to render in the commit's zone or the viewer's.
 * @returns The `DateTime` the picker can edit.
 */
export function toPickerValue(date: GitDate, mode: DisplayMode): DateTime {
    const millis = date.epochSeconds * 1000
    if (mode === "local") {
        return DateTime.fromMillis(millis)
    }
    return DateTime.fromMillis(millis, { zone: FixedOffsetZone.instance(date.offsetMinutes) })
}

/**
 * Convert a picker's `DateTime` back into a stored instant, keeping the commit's original offset.
 *
 * In commit mode the picker's value is already in the commit's own offset, so its wall-clock fields are read straight back. The
 * conversion is exact in both directions: opening the picker and accepting it without an edit cannot move a commit.
 *
 * @param value The `DateTime` the picker produced.
 * @param original The commit's stored date, which supplies the offset to preserve.
 * @param mode The mode `toPickerValue` was called with.
 * @returns The instant to store.
 */
export function fromPickerValue(value: DateTime, original: GitDate, mode: DisplayMode): GitDate {
    // A half-typed or nonsensical field produces an invalid `DateTime` whose fields are all `NaN`. Storing that would write a
    // garbage timestamp into the generated script, so the commit is left exactly as it was.
    if (!value.isValid) {
        return original
    }
    if (mode === "local") {
        return { epochSeconds: Math.round(value.toMillis() / 1000), offsetMinutes: original.offsetMinutes }
    }
    const parts = { year: value.year, month: value.month, day: value.day, hour: value.hour, minute: value.minute, second: value.second }
    return fromZonedParts(parts, original.offsetMinutes)
}
