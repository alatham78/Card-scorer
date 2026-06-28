# Card Scorer

A simple, self-contained web app for keeping score in round-based card games
(like Flip 7). Add players, record each player's total for each round, and
correct any score later. Everything is saved in your browser — no server, no
sign-in.

**Live site:** <https://alatham78.github.io/Card-scorer/>

## Features

- **Multiple games** — create, rename, switch between, and delete games.
- **Players** — add players to a game; remove a player (and their scores) anytime.
- **Rounds** — add a round and enter each player's total for that round.
- **Corrections** — click any score in the table to edit that round, or delete the round entirely.
- **Running totals** — cumulative totals per player, with the current leader highlighted.
- **Persistent** — all data is stored locally in your browser (`localStorage`).

## Running it locally

It's just static files. Either:

- **Open directly:** double-click `index.html` (or open it in your browser), or
- **Serve locally** (recommended for consistent storage):

  ```bash
  python3 -m http.server 8000
  ```

  Then visit <http://localhost:8000>.

## Hosting

The app is hosted on GitHub Pages using branch-based deployment: Pages serves
the static files at the repo root from the `main` branch (Settings → Pages →
Source: "Deploy from a branch" → `main` / root). Every push to `main`
automatically rebuilds and republishes the site.

## How it works

- `index.html` — markup and layout
- `styles.css` — styling
- `app.js` — all game logic and `localStorage` persistence

Your data lives in the browser you use, under the key `card-scorer:v1`. Using a
different browser or device, or clearing site data, starts fresh.
