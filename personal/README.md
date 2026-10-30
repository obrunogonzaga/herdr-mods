# personal

My Herdr setup, not a shareable mod.

- `mods/my-tabs`: Herdr's `tabs` mod with GitHub, Servers and Ideas buttons beside Files and Changes.
- `layouts/my-layout.json`: Herdr's `main` layout using `my-tabs`, the `github`, `servers` and `ideas` panels in the right column, and the CI badge (`github` with `view: "ci"`) at the right of the status bar.
- `keys.json`: my full key map, with `cmd-shift-g` opening the GitHub panel `cmd-shift-m` the Servers panel and `cmd-shift-i` the Ideas panel. `sync.sh` copies it over `~/.config/herdr-app/keys.json`, keeping a `keys.json.bak-<time>` when they differ.

- `ideas.json`: the Ideas panel's file, my vault's `wiki/projects/ideias.md`. `sync.sh` copies it to `~/.config/herdr-app/ideas.json`.

`my-tabs` and `my-layout` are derived from [herdr-app](https://github.com/herdrdev/herdr-app) (Apache-2.0, see `LICENSE`). They don't get Herdr's updates; if an update changes the tab bar, re-clone and reapply the button.
