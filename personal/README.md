# personal

My Herdr setup, not a shareable mod.

- `mods/my-tabs`: Herdr's `tabs` mod with GitHub, Servers and Ideas buttons beside Files and Changes.
- `layouts/my-layout.json`: Herdr's `main` layout using `my-tabs`, the `github`, `servers` and `ideas` panels in the right column, and the CI badge (`github` with `view: "ci"`) at the right of the status bar.
- `keys.json`: my full key map, with `cmd-shift-g` opening the GitHub panel `cmd-shift-m` the Servers panel and `cmd-shift-i` the Ideas panel. `sync.sh` copies it over `~/.config/herdr-app/keys.json`, keeping a `keys.json.bak-<time>` when they differ.

- `ideas.json`: the Ideas panel's file, my vault's `wiki/projects/ideias.md`. `sync.sh` copies it to `~/.config/herdr-app/ideas.json`.

- `settings.json`: the settings Herdr keeps about me. `sync.sh` **merges** it into `~/.config/herdr-app/settings.json`: the keys named here win, every other key in the app's file stays. The app writes that file itself (zoom, appearance), so a plain copy would fight it. `zoom` and `appearance` are deliberately absent here: they belong to the app, not to the repo.
  - `terminal_line_height` / `terminal_cell_width`: the terminal's row height and column width.
  - `pane_scrollbars`: no scrollback thumb at the right edge of a terminal pane.
  - `worktrees.directory`: where Herdr's own "New worktree" dialog creates checkouts. The GitHub panel's agent dialog has its own path (`~/.herdr/worktrees`), so the two agree by default.
- `programs.json`: the program table — how each program shows up (name, icon, tile, color) and how it starts. `sync.sh` copies it over `~/.config/herdr-app/programs.json`; the app only reads that file, so a copy is enough.
  - `run`: how Herdr launches the program. Entries with one show up in the `+` menu as agents.
  - `icon`: a path in `~/.config/herdr-app`. The app's own `icons/` folder is written by Herdr, so my own glyphs live in `personal/icons/` and are copied to `~/.config/herdr-app/personal-icons/`.
  - `tile` and `color`: the colored tile the program gets in the win98 layout.

- `icons/`: my own program glyphs, one SVG per program, in the same one-color `currentColor` style Herdr uses.

`my-tabs` and `my-layout` are derived from [herdr-app](https://github.com/herdrdev/herdr-app) (Apache-2.0, see `LICENSE`). They don't get Herdr's updates; if an update changes the tab bar, re-clone and reapply the button.
