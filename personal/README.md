# personal

My Herdr setup, not a shareable mod.

- `mods/my-tabs`: Herdr's `tabs` mod with a GitHub button beside Files and Changes.
- `layouts/my-layout.json`: Herdr's `main` layout using `my-tabs` and the `github` panel in the right column.
- `keys.json`: my full key map, with `cmd-shift-g` opening the GitHub panel. `sync.sh` copies it over `~/.config/herdr-app/keys.json`, keeping a `keys.json.bak-<time>` when they differ.

Both are derived from [herdr-app](https://github.com/herdrdev/herdr-app) (Apache-2.0, see `LICENSE`). They don't get Herdr's updates; if an update changes the tab bar, re-clone and reapply the button.
