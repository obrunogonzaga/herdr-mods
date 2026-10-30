# GitHub

The open pull requests and issues of the repo you are looking at, in one panel. Two tabs switch
between PRs and Issues; each row shows the number, the title, who opened it and how long ago it
was last updated. PRs also show their review state and branch; issues show their labels. Click a
row and it opens in your browser. It opens as a popup over the window (`cmd-shift-g`), and fits a
side panel of a cloned layout just as well.

![GitHub](preview.png)

## What you see

One column on the `background` color, radius 10, a 1px `border`, base type 13px. Top to bottom:

- **Header**, 42px tall, 10px side padding, a 1px `border` line under it. On the left two tab
  buttons, 4px apart, each 26px tall, 10px side padding, radius 7: the label (`PRs`, `Issues`)
  and its count at 10px in `dim`. The chosen one is `foreground` on `selected`; the other is
  `muted`. Both get `hover` under the pointer. On the right a `Refresh` button, 11px `muted`,
  26px tall, radius 7; while a load runs it reads `…`.
- **The list**, scrolling, 6px padding, rows 2px apart. Each row is two lines on a radius 7
  card, 10px side and 7px vertical padding, 3px between lines, `hover` under the pointer:
  - Line one: `#5610` at 11px in `accent`, an 8px gap, then the title in `foreground`,
    truncated to the width.
  - Line two, 11px `dim`: on the left, for a PR, its review state then its branch, 8px apart
    (`draft` in `dim`, `approved` in `ansi2`, `changes` in `ansi1`, otherwise `review` in
    `blocked`); for an issue, up to three labels, each a pill with 5px side padding, radius 4,
    a 1px border in the label's own GitHub color at 53% alpha and text in `muted`. On the
    right: `author · 2d` (`m`, `h` or `d` since the last update).
- In place of the list, at 8px padding: `Loading…` before the first load; `No open pull
  requests` or `No open issues` when empty; `Not a git repository`, `No GitHub remote in this
  repo`, `Run gh auth login first` or gh's first error line in `ansi1` when it fails.

As a popup it is 420×600 px, centered.

## How it behaves

- It doesn't show agent statuses: it lists GitHub items, not agents. Nothing animates.
- The repo is the focused pane's folder (else the focused terminal's, else the shown space's
  folder), on that space's machine. Switching space or focus re-renders and reloads at once.
- PRs and issues load together, up to 50 of each, open only. The list reloads every 60 s and
  on `Refresh`.
- A click on a row runs `open <url>` on this computer, so the browser opens even for a space on
  a remote machine.
- The tab choice is not saved.
- Commands: `github.prs` and `github.issues` switch the tab, `github.refresh` reloads. Bind them in `keys.json` (for example `"cmd-shift-i": "github.issues"`) or run them with `herdr-app do github.issues`. They reach shown copies only.

## Built from

- `mods/github/main.js`: one `View`, default export. `mod.json`:
  `{ "place": "none", "title": "GitHub", "overlay": { "width": 420, "height": 600 } }`, so
  `mod.open {name: "github"}` shows it as a popup and no layout docks it. `github.svg`: a 24×24
  pull-request glyph (two circles joined by a bent line), stroked `currentColor`, for a tab-bar
  button in a cloned layout.
- `keys.json`: `{ "global": { "cmd-shift-g": "mod.open:github" } }`.
- `herdr` functions: `spaces`, `panes`, `focused` (to find the folder and machine), `exec`,
  `theme`, `nextCommand` (a loop started in `init` that reads `prs`, `issues` and `refresh`).
- Programs: `gh pr list --state open --limit 50 --json
  number,title,author,url,isDraft,updatedAt,reviewDecision,headRefName` and `gh issue list
  --state open --limit 50 --json number,title,author,url,labels,updatedAt`, run in the folder
  with `exec(..., { cwd, on })`; `open <url>` locally.
- Reaches the network through `gh` and runs programs. Reads nothing outside its own folder.

## Watch out

- `gh` must be installed and logged in (`gh auth login`) on the machine the space lives on.
  For a remote space it runs there, not here.
- `open` is macOS. On Linux the click does nothing; swap it for `xdg-open`.
- Only the first 50 of each list show; the counts in the tabs are of what loaded, not the
  repo's totals.
- Results are dropped when the folder changes mid-load, so a slow `gh` never paints the wrong
  repo.
- To dock it as a side panel, clone `main` and `tabs`, add `{ "id": "github", "type": "block",
  "content": { "mod": "github" } }` to the `panel-body` stack and a third panel button beside
  Files and Changes. The shipped layout and tab bar are replaced on every start.

## Done when

- `herdr-app check mods/github` passes.
- `cmd-shift-g` in a space inside a GitHub repo opens the popup with open PRs listed and the
  counts in both tabs.
- Clicking a row opens that PR or issue in the browser.
- Switching to a space that isn't a repo shows `Not a git repository`.
- `herdr-app do github.issues` with the panel shown switches it to the Issues tab.
