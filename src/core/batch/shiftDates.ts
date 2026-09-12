import { DateTime, FixedOffsetZone } from "luxon"
import type { Commit } from "../types"

/** A relative amount of time to move selected commits by. Any component may be negative. */
export interface ShiftOffset {
    /** Whole years to move by. */
    years: number
    /** Whole days to move by. */
    days: number
    /** Whole hours to move by. */
    hours: number
    /** Whole minutes to move by. */
    minutes: number
}

/**
 * Check whether a shift offset would move anything at all.
 *
 * @param offset The offset to check.
 * @returns `true` when every component is zero.
 */
export function isZeroOffset(offset: ShiftOffset): boolean {
    return offset.years === 0 && offset.days === 0 && offset.hours === 0 && offset.minutes === 0
}

/**
 * Move the author timestamp of every selected commit by the same amount. Each commit is shifted in its own
 * fixed-offset zone, so `years` is calendar-aware (it lands on the same wall-clock date and time a year later, or
 * the closest one when that date does not exist, such as Feb 29) and `days` stays exactly 24 hours rather than
 * being distorted by a daylight-saving rule. Because a year spans a variable number of days (365 or 366), this
 * only preserves the spacing between shifted commits when `years` is zero -- a pair whose interval straddles a leap
 * day, for instance, ends up with a spacing one day different from before. The committer timestamp is left alone.
 *
 * @param commits All commits, in import order.
 * @param shas The SHAs to move.
 * @param offset How far to move them.
 * @returns A new array with the selected commits moved.
 */
export function shiftDates(commits: Commit[], shas: Iterable<string>, offset: ShiftOffset): Commit[] {
    const selected = new Set(shas)
    if (selected.size === 0 || isZeroOffset(offset)) {
        return commits.slice()
    }

    return commits.map((commit) => {
        if (!selected.has(commit.sha)) {
            return commit
        }
        const zone = FixedOffsetZone.instance(commit.authored.offsetMinutes)
        const shifted = DateTime.fromMillis(commit.authored.epochSeconds * 1000, { zone }).plus({
            years: offset.years,
            days: offset.days,
            hours: offset.hours,
            minutes: offset.minutes,
        })
        return { ...commit, authored: { epochSeconds: Math.round(shifted.toMillis() / 1000), offsetMinutes: commit.authored.offsetMinutes } }
    })
}

/**
 * Distribute the selected commits evenly between two instants, earliest first. Chronological order within the
 * selection is preserved regardless of array order. The earliest selected commit always lands exactly on
 * `startEpoch` and the latest exactly on `endEpoch`; every assigned timestamp is a whole second and the
 * sequence is non-decreasing. When the requested range is shorter than one second per commit, distinct commits
 * necessarily share a timestamp rather than being pushed past `endEpoch` to stay distinct -- git permits
 * duplicate author timestamps, so this is treated as an honest answer, not an error.
 *
 * @param commits All commits, in import order.
 * @param shas The SHAs to redistribute.
 * @param startEpoch Instant for the earliest selected commit, in seconds.
 * @param endEpoch Instant for the latest selected commit, in seconds.
 * @returns A new array with the selected commits redistributed.
 */
export function spreadDates(commits: Commit[], shas: Iterable<string>, startEpoch: number, endEpoch: number): Commit[] {
    const selected = new Set(shas)
    if (selected.size === 0) {
        return commits.slice()
    }

    const ordered = commits.filter((c) => selected.has(c.sha)).sort((a, b) => a.authored.epochSeconds - b.authored.epochSeconds)
    const step = ordered.length > 1 ? (endEpoch - startEpoch) / (ordered.length - 1) : 0
    const assigned = new Map(ordered.map((c, i) => [c.sha, Math.round(startEpoch + step * i)]))

    return commits.map((commit) => {
        const epochSeconds = assigned.get(commit.sha)
        return epochSeconds === undefined ? commit : { ...commit, authored: { ...commit.authored, epochSeconds } }
    })
}
