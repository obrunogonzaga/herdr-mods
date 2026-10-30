# Ideas

An ideas bank kept in a plain Markdown file you choose (an Obsidian vault works well). Type an idea
with `#tags` and press Enter: it's saved with the date and the repo of the space you're in. Filter by
open or done, by that repo, or by tag; tick ideas off; turn one into a GitHub issue in the current
repo. Edit the file anywhere else and the panel follows. It opens as a popup over the window
(`cmd-shift-i`), and fits a side panel of a cloned layout just as well.

![Ideas](preview.png)

## What you see

One column on the `background` color, radius 10, a 1px `border`, base type 12.5px. Top to bottom:

- **Header**, 42px tall, 14px side padding, a 1px `border` line under it: `Ideas` semibold, `4 open`
  in 11px `dim`, and `Open file` (11px `muted`) on the right.
- **Capture**, 10px padding, a 1px `border` line under it: a 32px field, radius 8, 1px `input`
  border, placeholder `New idea, #tags, Enter`.
- **Filters**, 10px side and 8px vertical padding, 6px between rows, a 1px `border` line under:
  - `Open`, `Done`, `All`, then the current repo's name (when the space is in a git repo).
  - Every tag in the file as `#tag`, sorted.
  - Chips are 22px, 8px side padding, radius 6, 11px; on: `selected`/`foreground`; off:
    `raised`/`muted`.
- **The list**, scrolling, 6px padding, newest first. Each row: 10px side and 7px vertical padding,
  radius 7, `hover` under the pointer, 9px gaps:
  - A 14px checkbox, radius 4: a 1px `input` border on `background`; done, `accent` filled with
    a `✓` in `accent_foreground`.
  - The idea without its tags (`dim` when done, else `foreground`, wrapping), and under it, 11px:
    each tag as a pill (`#tag`, `raised`, `muted`, radius 4), `shop · 6d` in `dim` (repo, days since
    added, `today`), and the linked issue as `#42` in `accent`.
  - On the right, 11px `muted`: `Issue` (open ideas without an issue, while the space is in a repo)
    and `Delete`.
  - Confirming swaps them for a line under the idea: `Create an issue in shop?` with `Create issue`
    in `accent`, or `Delete this idea?` in `ansi1` with `Delete` in `ansi1`; both with `Cancel`.
    While the issue is made the row shows `Creating…` in `blocked`.
- Empty: `No ideas yet. Type one above.` or `No ideas match these filters`, 8px padding, `dim`.
- A save or read error shows under the filters in 11px `ansi1`.

As a popup it is 440×600 px, centered, with the cursor in the capture field.

## How it behaves

- It doesn't show agent statuses: it lists ideas, not agents. Nothing animates.
- The file is `file` in `~/.config/herdr-app/ideas.json` (`{ "file": "~/notes/ideas.md" }`, `~/`
  expanded), else `~/ideas.md`. A missing file is created by the first idea.
- The format, readable and editable in any Markdown app:

  ```markdown
  - [ ] Cache product images at the edge #perf
    added 2026-10-24 · repo shop · issue https://github.com/example/shop/issues/42
  - [x] Status-bar CI badge #tooling
    added 2026-10-20 · done 2026-10-28
  ```

  Ideas are `- [ ]`/`- [x]` lines at the start of a line; the indented line under one is its meta
  (`added`, `repo`, `issue`, `done`, joined by ` · `). Tags are `#` words (letters in any script,
  digits, `_`, `-`, `/`), lowercased. Everything else in the file (frontmatter, headings, other
  bullets) is left exactly as it is.
- New ideas go right after the last idea, or at the end of a file without any. Their repo is the
  focused pane's folder's repo, named after its main checkout so worktrees count as the same repo
  (`git rev-parse --git-common-dir`); none outside git. It's checked every 5 s.
- The checkbox toggles done and stamps or clears `done <date>`. `Delete` removes the idea and its
  meta line.
- `Issue` → confirm → `gh issue create --title <idea without tags> --body "From the ideas bank in
  Herdr."` in the space's folder, on its machine; the URL it prints is saved as the idea's `issue`.
  `#42` opens it, only if it's https.
- Every edit reads the file fresh, finds the idea again by its text and added date (so an edit made
  elsewhere meanwhile doesn't shift it), and writes with `writeTextFile(path, next, snapshot)`, which
  refuses if the file changed in between. Edits are queued one at a time, so quick clicks don't
  refuse each other.
- `watchFolder` on the file's folder reloads the list when the file changes from anywhere.
- Filters reset when the panel reopens; the list is newest first.

## Built from

- `mods/ideas/main.js`: one `View`. `mod.json`: `{ "place": "none", "title": "Ideas", "overlay": {
  "width": 440, "height": 600 } }`. `lightbulb.svg`: a 24×24 bulb outline, stroked `currentColor`,
  for a tab-bar button.
- `mods/ideas/ideas-file.js`: pure functions over the file's text: `parseIdeas`, `addIdea`,
  `toggleIdea`, `linkIssue`, `deleteIdea`, `tagsOf`.
- `keys.json`: `{ "global": { "cmd-shift-i": "mod.open:ideas" } }`.
- `herdr` functions: `readTextFile`, `writeTextFile`, `watchFolder`, `appHome`, `home`, `spaces`,
  `panes`, `focused`, `exec` (git, gh, open), `props`, `theme`.
- Writes only the ideas file. Runs `gh issue create` only after you confirm.

## Watch out

- The file must be on this computer: `writeTextFile` and `watchFolder` work here only.
- The cursor goes to the capture field only in the popup; docked, it would take the keyboard from
  the terminal whenever the layout loads.
- The issue goes to the repo of the space you're in, not the idea's `repo`.
- Two ideas with the same text and date are the same idea to an edit.
- To dock it as a side panel, clone `main` and `tabs`, add `{ "id": "ideas", "type": "block",
  "content": { "mod": "ideas" } }` to the `panel-body` stack and a panel button beside Files and
  Changes.

## Done when

- `herdr-app check mods/ideas` passes.
- `cmd-shift-i`, type `Try a local model #ai`, Enter: the file gets `- [ ] Try a local model #ai` and
  `  added <today>` (plus `· repo <name>` inside a repo), and the row shows `#ai` and `today`.
- Ticking it writes `- [x]` and `· done <today>`; unticking takes the date away.
- Editing the file in another app updates the list within a second.
- Three quick adds all land in the file.
- `node --test` passes (`ideas-file.js`).
