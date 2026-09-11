import { RECORD_SEPARATOR, UNIT_SEPARATOR } from "../../core/parseLog"

/** Field values for one sample commit, in the order the import command emits them. */
type SampleRecord = [sha: string, authorName: string, authorEmail: string, authoredIso: string, committerName: string, committerEmail: string, committedIso: string, message: string]

const RECORDS: SampleRecord[] = [
    [
        "4f1c2a7d9b8e5f0a3c6d1e2b7a4f8c9d0e5b6a13",
        "Jane Doe",
        "jane@example.com",
        "2026-03-04T14:30:00+09:00",
        "Jane Doe",
        "jane@example.com",
        "2026-03-04T14:30:00+09:00",
        "Fix the log parser\n\nMulti-line bodies now survive a round trip.\n",
    ],
    ["8a2d5e1f7c4b9a0d3e6f2c5b8a1d4e7f0c3b6a29", "Jane Doe", "j.doe@old-corp.com", "2026-03-03T09:12:44-07:00", "Jane Doe", "j.doe@old-corp.com", "2026-03-03T09:12:44-07:00", "Bump dependencies\n"],
    ["c7b3f6a1d4e8092b5c8f1a4d7e0b3c6f9a2d5e81", "Ali Reza", "ali@example.com", "2026-03-01T22:05:10+00:00", "Ali Reza", "ali@example.com", "2026-03-01T22:05:10+00:00", 'Add the "export" tab\n'],
    ["1e4a7d0c3f6b9e2a5d8c1f4b7e0a3d6c9f2b5e48", "ali", "ali@laptop.local", "2026-02-27T11:41:03+00:00", "ali", "ali@laptop.local", "2026-02-27T11:41:03+00:00", "wip\n"],
    ["b5c8e1a4d7f0b3c6e9a2d5f8b1c4e7a0d3f6b9e2", "Ali Reza", "ali@example.com", "2026-02-26T08:00:00+00:00", "Ali Reza", "ali@example.com", "2026-02-26T08:00:00+00:00", "Initial commit\n"],
]

/** Sample `git log` output, in the raw un-encoded form. Lets someone try the tool without a repository to hand. */
export const SAMPLE_LOG: string = RECORDS.map((record) => record.join(UNIT_SEPARATOR) + RECORD_SEPARATOR).join("\n")
