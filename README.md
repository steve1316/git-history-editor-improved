# Git History Editor

Edit the author, date, and message of your past git commits in the browser, then copy a script that applies the changes.

**[Open the app](https://steve1316.github.io/git-history-editor-improved/)**

Nothing is uploaded. Your commit data is parsed, edited, and turned into a script entirely in your browser.

## What it does

1. **Import** - run one `git log` command and paste, drop, or load its output. There is no commit limit.
2. **Edit** - change author names, emails, dates, and messages, one commit at a time or in bulk.
3. **Export** - review a diff of everything that changed, then copy a `git filter-repo` command that applies it.

### Features

- Inline editing in a virtualised table that stays responsive on large histories
- A date and time field you can both type into and pick from
- Batch operations across any selection: set author, shift dates by an offset, spread dates evenly across a range, find and replace in messages
- Global author replacement that also covers commits older than the ones you imported
- Undo and redo with Ctrl+Z and Ctrl+Y
- Your session is saved locally, so a refresh does not lose your work
- Dark and light themes, following your system by default

### Two things this fixes from the original

- **Commit bodies survive.** The original read only the subject line and its generated script replaced the whole message, silently discarding every commit body. This imports the full message.
- **Timezones are preserved.** The original rendered every commit in your browser's timezone and wrote edits back as if they were local, which shifted timestamps for anyone working with commits authored elsewhere. Each commit now keeps its own UTC offset, with an optional toggle to view everything in your own timezone.

## Running the generated script

The default output uses [`git filter-repo`](https://github.com/newren/git-filter-repo), which you install with `pip install git-filter-repo`. A `git filter-branch` fallback is available for environments where you cannot install it.

Either way: **back up your repository first**. Rewriting history changes every commit hash from the earliest edit onwards, and if the branch is shared you will need to coordinate before force-pushing.

## Development

```bash
yarn install
yarn dev          # start the dev server
yarn test         # run the unit tests
yarn typecheck    # tsc --noEmit
yarn lint         # eslint
yarn format       # prettier --write
yarn build        # typecheck and production build
```

TypeScript is pinned to the 5.x line. TypeScript 7's native compiler is not yet supported by
`typescript-eslint`, so the project stays on 5.x until that lands.

Use yarn classic (1.22). If corepack is active on your machine it may resolve `yarn` to Yarn 4,
which will try to convert the project to Plug'n'Play - invoke the classic binary explicitly.

### Layout

- `src/core/` - pure TypeScript with no React and no DOM: log parsing, diffing, escaping, script generation, batch operations. All of the test suite lives here, because this is the code that rewrites real history.
- `src/store/` - Zustand store with localStorage persistence and the undo history.
- `src/components/` - MUI presentation, one folder per step.

`src/core/` must not import from `src/store/` or `src/components/`, and must not import React. An ESLint rule enforces this.

## Credits

A rewrite of [bokub/git-history-editor](https://github.com/bokub/git-history-editor) by Boris K, which is licensed under Apache-2.0. This project keeps that licence.

## Licence

Apache-2.0. See [LICENSE](LICENSE).
