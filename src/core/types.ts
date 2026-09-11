/** A point in time plus the UTC offset it was originally recorded in. */
export interface GitDate {
    /** The instant, in seconds since the Unix epoch. Always UTC. */
    epochSeconds: number
    /** Offset from UTC in minutes, positive east of Greenwich. Preserved so a commit renders in its own zone. */
    offsetMinutes: number
}

/** A wall-clock date and time with no zone attached. Used only for display and editing. */
export interface ZonedParts {
    /** Four-digit year. */
    year: number
    /** Month, 1 through 12. */
    month: number
    /** Day of month, 1 through 31. */
    day: number
    /** Hour, 0 through 23. */
    hour: number
    /** Minute, 0 through 59. */
    minute: number
    /** Second, 0 through 59. */
    second: number
}

/** One commit as imported from `git log`, and as edited by the user. */
export interface Commit {
    /** Full 40-character SHA from `%H`. The stable identity of the commit. Never edited. */
    sha: string
    /** Author name from `%an`. */
    authorName: string
    /** Author email from `%ae`. */
    authorEmail: string
    /** Committer name from `%cn`. */
    committerName: string
    /** Committer email from `%ce`. */
    committerEmail: string
    /** Author timestamp and its original offset, from `%aI`. */
    authored: GitDate
    /** Committer timestamp and its original offset, from `%cI`. */
    committed: GitDate
    /** Full raw message from `%B`, body and trailing newline included. */
    message: string
}

/** The `Commit` fields a user is allowed to change. */
export type EditableField = "authorName" | "authorEmail" | "authored" | "message"

/** A single field that differs between the imported commit and the edited one. */
export interface FieldChange {
    /** Which field changed. */
    field: EditableField
    /** The value as imported, rendered for display. */
    before: string
    /** The value after editing, rendered for display. */
    after: string
}

/** Every change made to one commit. */
export interface CommitChange {
    /** SHA of the commit these changes apply to. */
    sha: string
    /** The changed fields, in a stable order. */
    changes: FieldChange[]
}

/** A global author substitution, applied by matching the existing email rather than by SHA. */
export interface AuthorReplacement {
    /** The author email to match against. */
    matchEmail: string
    /** The name to write in its place. */
    name: string
    /** The email to write in its place. */
    email: string
}

/** Everything that differs between the imported history and the edited one. */
export interface ChangeSet {
    /** Per-commit changes, in import order, excluding commits with no changes. */
    commits: CommitChange[]
    /** Global author substitutions, which may also affect commits outside the imported set. */
    authorReplacements: AuthorReplacement[]
}

/** A successful parse of `git log` output. */
export interface ParseSuccess {
    /** Discriminant. */
    ok: true
    /** The parsed commits, newest first, in the order `git log` emitted them. */
    commits: Commit[]
}

/** A failed parse, carrying enough detail to tell the user what went wrong. */
export interface ParseFailure {
    /** Discriminant. */
    ok: false
    /** Human-readable explanation of what was expected and what was found. */
    error: string
    /** Zero-based index of the offending record, when the failure is attributable to one. */
    recordIndex?: number
}

/** Result of parsing pasted or dropped log input. */
export type ParseResult = ParseSuccess | ParseFailure

/** Everything the script generators need to produce their output. */
export interface ExportInput {
    /** Commits exactly as imported. */
    originals: Commit[]
    /** Commits as edited. Same length and order as `originals`. */
    current: Commit[]
    /** Global author substitutions to apply before per-commit edits. */
    authorReplacements: AuthorReplacement[]
    /** Whether to write the committer name, email, and date alongside the author fields. */
    updateCommitter: boolean
}
