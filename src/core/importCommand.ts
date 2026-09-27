/** The terminal the generated command is written for. */
export type ImportShell = "posix" | "powershell"

/** Options controlling the generated `git log` command. */
export interface ImportCommandOptions {
    /** Maximum number of commits to import. Omitted or non-positive means no limit. */
    limit?: number
    /** Terminal to target. Defaults to a POSIX shell (Linux, macOS, Git Bash). */
    shell?: ImportShell
}

/**
 * Build the `git log` command the user runs to produce importable output. The field order here must match the order `parseLog` expects.
 *
 * The PowerShell form has git write to a temp file instead of piping, because PowerShell re-encodes piped native output and
 * turns LF into CRLF inside commit bodies. It encodes the file's exact bytes, so its output matches the POSIX form, and copies
 * the result to the clipboard. `safe.directory=*` applies to this one command only, so repos owned by another account (common
 * on Windows after cloning from an elevated terminal) still import without the user changing their git config.
 *
 * @param options Controls the commit limit and the target terminal.
 * @returns A single-line shell command.
 */
export function buildImportCommand(options: ImportCommandOptions = {}): string {
    const limit = options.limit && options.limit > 0 ? ` -${options.limit}` : ""
    const format = "%H%x1f%an%x1f%ae%x1f%aI%x1f%cn%x1f%ce%x1f%cI%x1f%B%x1e"
    if (options.shell === "powershell") {
        return (
            `$f="$env:TEMP\\gitlog.tmp"; git -c safe.directory=* log${limit} --output="$f" --pretty=format:"${format}"; ` +
            `if ($LASTEXITCODE -eq 0) { [Convert]::ToBase64String([IO.File]::ReadAllBytes($f)) | Set-Clipboard; Remove-Item $f; "Copied to clipboard" }`
        )
    }
    return `git log${limit} --pretty=format:"${format}" | base64 | tr -d "\\n"`
}
