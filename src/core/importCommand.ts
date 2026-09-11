/** Options controlling the generated `git log` command. */
export interface ImportCommandOptions {
    /** Maximum number of commits to import. Omitted or non-positive means no limit. */
    limit?: number
}

/**
 * Build the `git log` command the user runs to produce importable output. The field order here must match the order `parseLog` expects.
 *
 * @param options Controls whether a commit limit is applied.
 * @returns A single-line shell command.
 */
export function buildImportCommand(options: ImportCommandOptions = {}): string {
    const limit = options.limit && options.limit > 0 ? ` -${options.limit}` : ""
    const format = "%H%x1f%an%x1f%ae%x1f%aI%x1f%cn%x1f%ce%x1f%cI%x1f%B%x1e"
    return `git log${limit} --pretty=format:"${format}" | base64 | tr -d "\\n"`
}
