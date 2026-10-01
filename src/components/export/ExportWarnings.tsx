import { Alert, AlertTitle, Stack } from "@mui/material"

/** Props for `ExportWarnings`. */
interface ExportWarningsProps {
    /** Which script is showing, since filter-repo has one consequence filter-branch does not. */
    format: "filter-repo" | "filter-branch"
    /** Whether the edit set is large enough that the filter-branch script becomes unwieldy. */
    largeFilterBranch: boolean
    /** Whether the script rewrites every ref rather than only the current branch from the oldest edit onwards. */
    rewritesAllRefs: boolean
}

/**
 * The consequences of running the generated script, stated before the copy button rather than after it.
 *
 * @param props Component props.
 * @returns The warnings.
 */
export default function ExportWarnings({ format, largeFilterBranch, rewritesAllRefs }: ExportWarningsProps) {
    return (
        <Stack spacing={1}>
            <Alert severity="warning">
                <AlertTitle>This rewrites history</AlertTitle>
                {rewritesAllRefs
                    ? "Author replacements match commits anywhere in the repository, so the script rewrites every branch, tag and remote-tracking ref. "
                    : "The script rewrites the oldest edited commit and every later commit on the current branch. "}
                Each rewritten commit gets a new hash, edited or not, and loses any signature it had. Back up your repository first, and if the branch is shared, agree with everyone else before
                force-pushing - their clones will not fast-forward.
            </Alert>
            {format === "filter-repo" && rewritesAllRefs && (
                <Alert severity="info">
                    {"git filter-repo removes the 'origin' remote by design, as a guard against accidentally pushing a rewritten history. Re-add it afterwards with: git remote add origin <url>"}
                </Alert>
            )}
            {format === "filter-branch" && largeFilterBranch && (
                <Alert severity="warning">You have changed a lot of commits, so this filter-branch script is long and will run slowly. The filter-repo version handles this much better.</Alert>
            )}
        </Stack>
    )
}
