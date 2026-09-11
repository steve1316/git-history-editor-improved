/** Default heredoc delimiter, used unless the payload contains it as a line of its own. */
const DEFAULT_DELIMITER = "GHE_EOF"

/**
 * Render a string as a Python bytes literal. The output is pure printable ASCII, so no part of the generated script depends on the
 * encoding surviving a copy and paste.
 *
 * @param value The text to encode, typically a commit message, name, or email.
 * @returns A Python bytes literal including its `b"` prefix and closing quote.
 */
export function pythonBytes(value: string): string {
    const bytes = new TextEncoder().encode(value)
    let out = ""

    for (const byte of bytes) {
        if (byte === 0x5c) {
            out += "\\\\"
        } else if (byte === 0x22) {
            out += '\\"'
        } else if (byte === 0x0a) {
            out += "\\n"
        } else if (byte === 0x0d) {
            out += "\\r"
        } else if (byte === 0x09) {
            out += "\\t"
        } else if (byte >= 0x20 && byte < 0x7f) {
            out += String.fromCharCode(byte)
        } else {
            out += `\\x${byte.toString(16).padStart(2, "0")}`
        }
    }
    return `b"${out}"`
}

/**
 * Choose a heredoc delimiter that does not appear as a line of its own anywhere in the payload. A quoted heredoc performs no
 * expansion, so this is the only way its contents can be terminated early.
 *
 * @param payload The text that will sit inside the heredoc.
 * @param base Stem for the delimiter. The filter-branch generator passes a second stem for its inner heredoc.
 * @returns A delimiter safe to use for this payload.
 */
export function chooseHeredocDelimiter(payload: string, base: string = DEFAULT_DELIMITER): string {
    const lines = new Set(payload.split("\n").map((line) => line.trim()))
    if (!lines.has(base)) {
        return base
    }

    for (let i = 1; ; i++) {
        const candidate = `${base}_${i}`
        if (!lines.has(candidate)) {
            return candidate
        }
    }
}

/**
 * Quote a value for safe inclusion in a single-quoted shell string. Used only by the legacy filter-branch generator; the
 * filter-repo path relies on a quoted heredoc instead.
 *
 * @param value The text to quote.
 * @returns The value wrapped in single quotes, with any embedded single quote escaped.
 */
export function shellSingleQuote(value: string): string {
    return `'${value.split("'").join("'\\''")}'`
}
