import { formatDisplay } from "./gitDate"
import type { ChangeSet, Commit, CommitChange, EditableField, ExportInput, FieldChange } from "./types"

/** The editable fields, in the order changes are reported. */
const FIELD_ORDER: EditableField[] = ["authorName", "authorEmail", "authored", "message"]

/**
 * Compare the edited history against the imported one.
 *
 * @param input The imported commits, the edited commits, and any global author replacements.
 * @returns Every per-commit change, in import order, plus the author replacements passed through.
 */
export function computeChangeSet(input: ExportInput): ChangeSet {
    const commits: CommitChange[] = []

    for (let i = 0; i < input.originals.length; i++) {
        const original = input.originals[i]
        const current = input.current[i]
        if (!original || !current) {
            continue
        }
        const changes = diffCommit(original, current)
        if (changes.length > 0) {
            commits.push({ sha: original.sha, changes })
        }
    }

    return { commits, authorReplacements: input.authorReplacements }
}

/**
 * Count how many commits carry at least one change.
 *
 * @param changeSet The computed change set.
 * @returns The number of changed commits.
 */
export function changedCommitCount(changeSet: ChangeSet): number {
    return changeSet.commits.length
}

/**
 * Compare one commit against its imported form.
 *
 * @param original The commit as imported.
 * @param current The commit as edited.
 * @returns The changed fields, in `FIELD_ORDER`.
 */
function diffCommit(original: Commit, current: Commit): FieldChange[] {
    const changes: FieldChange[] = []

    for (const field of FIELD_ORDER) {
        const before = renderField(original, field)
        const after = renderField(current, field)
        if (before !== after) {
            changes.push({ field, before, after })
        }
    }
    return changes
}

/**
 * Render one editable field as the string shown in the diff. Timestamps compare by their rendered form, so an offset-only change
 * still counts as a change.
 *
 * @param commit The commit to read from.
 * @param field The field to render.
 * @returns The field's display string.
 */
function renderField(commit: Commit, field: EditableField): string {
    switch (field) {
        case "authorName":
            return commit.authorName
        case "authorEmail":
            return commit.authorEmail
        case "authored":
            return formatDisplay(commit.authored)
        case "message":
            return commit.message
    }
}
