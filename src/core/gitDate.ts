import type { GitDate, ZonedParts } from "./types"

const ISO_WITH_OFFSET = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})$/

/**
 * Parse a strict ISO 8601 timestamp, keeping the offset it was written in rather than normalising to the host timezone.
 *
 * @param iso Timestamp as produced by `git log --pretty=format:%aI`, for example `2026-03-04T14:30:00+09:00`.
 * @returns The instant and its original offset, or `null` when the input is not a valid ISO timestamp with an offset.
 */
export function parseIsoWithOffset(iso: string): GitDate | null {
    const m = ISO_WITH_OFFSET.exec(iso.trim())
    if (!m) {
        return null
    }

    const zone = m[7]!
    const offsetMinutes = zone === "Z" ? 0 : parseOffset(zone)
    if (offsetMinutes === null) {
        return null
    }

    // Interpret the wall-clock parts as if they were UTC, then subtract the offset to recover the true instant.
    const asUtc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]))
    if (Number.isNaN(asUtc)) {
        return null
    }
    return { epochSeconds: asUtc / 1000 - offsetMinutes * 60, offsetMinutes }
}

/**
 * Parse the `+HH:MM` or `+HHMM` tail of an ISO timestamp.
 *
 * @param zone The offset portion of the timestamp.
 * @returns Offset in minutes, or `null` when it cannot be read.
 */
function parseOffset(zone: string): number | null {
    const m = /^([+-])(\d{2}):?(\d{2})$/.exec(zone)
    if (!m) {
        return null
    }
    const sign = m[1] === "-" ? -1 : 1
    return sign * (Number(m[2]) * 60 + Number(m[3]))
}

/**
 * Format an offset the way git writes it internally.
 *
 * @param offsetMinutes Offset from UTC in minutes.
 * @returns A four-digit signed offset such as `+0900`.
 */
export function formatOffset(offsetMinutes: number): string {
    const sign = offsetMinutes < 0 ? "-" : "+"
    const abs = Math.abs(offsetMinutes)
    return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}${String(abs % 60).padStart(2, "0")}`
}

/**
 * Format a date in git's internal `<epoch> <offset>` form, which is what `GIT_AUTHOR_DATE` and filter-repo's `author_date` both accept.
 *
 * @param date The instant and its offset.
 * @returns A string such as `1772602200 +0900`.
 */
export function formatGitDate(date: GitDate): string {
    return `${date.epochSeconds} ${formatOffset(date.offsetMinutes)}`
}

/**
 * Render an instant as the wall-clock time an observer in the commit's own timezone would have seen. This deliberately
 * ignores the host machine's timezone.
 *
 * @param date The instant and its offset.
 * @returns The wall-clock parts in the commit's own zone.
 */
export function toZonedParts(date: GitDate): ZonedParts {
    const shifted = new Date((date.epochSeconds + date.offsetMinutes * 60) * 1000)
    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
        hour: shifted.getUTCHours(),
        minute: shifted.getUTCMinutes(),
        second: shifted.getUTCSeconds(),
    }
}

/**
 * Convert edited wall-clock parts back into an instant, interpreting them in the given offset.
 *
 * @param parts The wall-clock date and time the user entered.
 * @param offsetMinutes The offset those parts should be interpreted in.
 * @returns The resulting instant, carrying the same offset.
 */
export function fromZonedParts(parts: ZonedParts, offsetMinutes: number): GitDate {
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
    return { epochSeconds: asUtc / 1000 - offsetMinutes * 60, offsetMinutes }
}

/**
 * Render an instant for display and editing, in the commit's own timezone.
 *
 * @param date The instant and its offset.
 * @returns A string such as `2026-03-04 14:30:00 +0900`.
 */
export function formatDisplay(date: GitDate): string {
    const p = toZonedParts(date)
    const pad = (n: number): string => String(n).padStart(2, "0")
    return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)} ${formatOffset(date.offsetMinutes)}`
}
