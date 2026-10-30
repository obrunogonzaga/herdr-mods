# herdr-mods

Mods for [Herdr](https://github.com/herdrdev/herdr-app), the desktop app for terminals and coding agents.

| Mod | What it does |
| --- | --- |
| [github-panel](github-panel/RECIPE.md) | Open PRs and issues of the space's repo, via `gh`. `cmd-shift-g` opens it. |

![GitHub panel](github-panel/preview.png)

## Install

Ask your agent to add `github.com/obrunogonzaga/herdr-mods/github-panel`, or copy it yourself:

```sh
git clone https://github.com/obrunogonzaga/herdr-mods
cp -R herdr-mods/github-panel/mods/github ~/.config/herdr-app/mods/
herdr-app check ~/.config/herdr-app/mods/github
```

Then merge `github-panel/keys.json` into `~/.config/herdr-app/keys.json`.

Mods are trusted code: this one runs `gh` and `open`. Read it before installing.

## Development

Edit here, then run `./sync.sh`. It copies every item's `mods/` and `layouts/` into `~/.config/herdr-app` (or `$HERDR_APP_HOME`) and runs `herdr-app check` on each mod. Herdr reloads on copy.

Herdr doesn't follow symlinks for live reload, so the repo is copied, not linked.

`personal/` is my own setup (a tab bar with a GitHub button and the layout using it). It has no `RECIPE.md`, so it isn't listed on herdr.dev.
