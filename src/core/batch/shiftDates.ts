import type { Commit } from "../types"

/** A relative amount of time to move selected commits by. Any component may be negative. */
export interface ShiftOffset {
    /** Whole days to move by. */
    days: number
    /** Whole hours to move by. */
    hours: number
    /** Whole minutes to move by. */
    minutes: number
}

/**
 * Collapse a shift offset into seconds.
 *
 * @param offset The offset to collapse.
 * @returns The equivalent number of seconds, which may be negative.
 */
export function offsetToSeconds(offset: ShiftOffset): number {
    return offset.days * 86400 + offset.hours * 3600 + offset.minutes * 60
}

/**
 * Move the author timestamp of every selected commit by the same amount, which preserves the spacing between them.
 * The committer timestamp is left alone.
 *
 * @param commits All commits, in import order.
 * @param shas The SHAs to move.
 * @param offset How far to move them.
 * @returns A new array with the selected commits moved.
 */
export function shiftDates(commits: Commit[], shas: Iterable<string>, offset: ShiftOffset): Commit[] {
    const selected = new Set(shas)
    const delta = offsetToSeconds(offset)
    if (selected.size === 0 || delta === 0) {
        return commits.slice()
    }

    return commits.map((commit) => (selected.has(commit.sha) ? { ...commit, authored: { ...commit.authored, epochSeconds: commit.authored.epochSeconds + delta } } : commit))
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
