# personal

My machine-local Herdr config, not a shareable layout or mod (no `RECIPE.md`, so herdr.dev leaves it out).

- `layouts/my-layout.json`: extends the `aifbr` layout with the `github`, `servers` and `ideas` panels in the right column and the CI badge (`github` with `view: "ci"`) in the status bar.
- `keys.json`: my full key map, with `cmd-shift-g` opening the GitHub panel, `cmd-shift-m` the Servers panel and `cmd-shift-i` the Ideas panel. `sync.sh` copies it over `~/.config/herdr-app/keys.json`, keeping a `keys.json.bak-<time>` when they differ.
- `ideas.json`: the Ideas panel's file, my vault's `wiki/projects/ideias.md`. `sync.sh` copies it to `~/.config/herdr-app/ideas.json`.
- `settings.json`: the settings Herdr keeps about me. `sync.sh` **merges** it into `~/.config/herdr-app/settings.json` (repo keys win, app-written keys like `zoom` and `appearance` stay).
- `programs.json` + `icons/`: program table entries (`muse`, `tau`, `flatt`, `rea`, `herdr-projects`) and their glyphs, copied to `~/.config/herdr-app/programs.json` and `personal-icons/`.

The `aifbr` layout itself (`aifbr-chrome`, `aifbr-tabs`, `aifbr-dark`/`aifbr-light` themes and `layouts/aifbr.json`) lives in [`../aifbr/`](../aifbr/RECIPE.md).
