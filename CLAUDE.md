# Ten for Life: handover for Claude Code

A single-page web app: a 5/10/15-minute morning routine (mobility, breath, qigong) that rotates exercises and
unlocks new ones gradually, plus a separate 5/10-minute posture programme. No framework, no backend, no build
dependencies beyond Python 3. Hosted on GitHub Pages as an installable PWA; optional end-to-end encrypted sync through a private gist.

**Core rule:** the code in `app/` is public and generic. Everything personal lives in the user's profile (`private/profile.json`,
gitignored), which is loaded into the app on each device and synced encrypted. Never put personal details in `app/`.

## Layout

| Path | What it is |
|---|---|
| `app/src/app.template.html` | Markup and all logic (one inline `<script>`). Placeholders `/*@STYLE@*/`, `/*@EXERCISES@*/`, `/*@VIDEOS@*/`, `@APP_NAME@`. |
| `app/src/style.css` | All styles. Style "true-black flat" from the taste-skill app library: warm near-black ground, elevation by lightness, **one sunrise-amber hue on data only** (progress dots, meters, timer bar, calendar); controls stay neutral and the primary button is inverted (near-white, dark text). Dark is the default on `:root`; light under `[data-theme=light]` and `[data-theme=system]`. Fonts Geist / Geist Mono; tab icons Phosphor light. |
| `app/src/exercises.js` | The exercise library: `const EX = [...]`. Each entry: `id, name, slot, secs, equip, grade, search, why, protects[], steps[], pitfalls[], evidence`. |
| `app/src/figures.js` | Animated stick figure per exercise (`FIG`): one rig, absolute joint angles, key poses + timing per exercise id, props (wall, bar, band, roller, breath). Injected at `/*@FIGURES@*/`. Shown under the name in the runner and atop each Library entry; still image under reduced motion. Every exercise id needs a spec. |
| `app/data/videos*.json` | Verified YouTube ids per exercise id (oEmbed-checked). |
| `app/assets/` | Icons, `manifest.webmanifest` (`@APP_NAME@`/`@APP_SHORT@` placeholders), `sw.js` (offline cache). |
| `app/build.py` | `python app/build.py` → `app/build/site/` (the PWA) and `app/build/claude-artifact.html` (claude.ai version). `APP_NAME`/`APP_SHORT` at the top set the display name. |
| `.github/workflows/deploy.yml` | On push to `main`: runs the build, deploys `app/build/site` to Pages. |
| `README.md` | Public summary of the app for the GitHub homepage. No setup steps or commands there. Screenshots in `docs/`. |
| `private/GUIDE.md` | The user's step-by-step guide (install, profile, sync, editing). **Gitignored.** Keep it current when flows change. |
| `private/profile.json` | The user's personal profile (format below). **Gitignored.** Seeded from the original personal texts. |
| `research/` | Reports and notes behind the routine. **Gitignored: personal health information.** |
| `archive/` | Original claude.ai export zip. Gitignored. |
| `.claude/skills/` | Design skills installed for this project only (gitignored): `ui-ux-pro-max` and `design-taste-frontend`. Use both for any UI change: UUPM's searches and pre-delivery checklist, the taste skill's `references/app-screens.md` rules and `node .claude/skills/design-taste-frontend/scripts/inspect.mjs <url> --app` (aim for 0 FAIL, 0 WARN). |

Never edit `app/build/` by hand. The service-worker cache name is a hash of the page, set by the build, so
there is no version to bump.

## How it works (the parts you'd touch)

- **Two programmes.** The morning routine is the body (CORE + `UNLOCK_ORDER`, slots in `SLOT_ORDER`, never a posture slot). The posture programme (`POSTURE`: neck, shoulders, upper back) is separate, all available from the start, and never offered as an unlock. `available()` excludes posture work, switched-off exercises and missing equipment.
- **Planner** `buildPlan(tier)`: fills slots in `SLOT_ORDER[tier]` without going over the time; within a slot favourites (`state.pinned`) come first, then the exercise done least recently. Favourites are always added. Balance/floor/standing items go last. Every 4th session at 10/15 min is a follow-along video day, with a video short enough to fit.
- **Exact length** `fitSecs(plan, tier)`: the planned exercises share exactly `tier*60` seconds in proportion to their usual time (stretched when few are unlocked, trimmed when favourites squeeze in; 15 s steps, 30 s minimum, breathing capped at 2x, videos fixed). Durations are computed from the plan, never stored: use `durOf(entry, id)` and `planSecs()` everywhere a time is shown or run.
- **Unlocks**: `CORE` (4 items) to start; `UNLOCK_ORDER` is the queue; one item is offered every `PACE[pace].sessions` counted sessions (slow 10, normal 7, fast 4; only the first session of a day counts). `unlockInfo()` gives the progress; `unlockTrack()` draws the dot track shown on Today and after a session. User accepts or snoozes 7 days. `tidyRoutine()` clears posture offers or plans left over from older data.
- **Posture programme** `buildPosturePlan(tier)`: fixed sequence from the `POSTURE` set, independent of unlocks; own log (`log.posture[date]`) and own counter (`state.postureSessions`); also fitted to exactly 5/10 min.
- **Editing the routine** (Library): each unlocked morning exercise has "In rotation" (`state.excluded`, at least 3 must stay on) and "Every session" (`state.pinned`). Changing either replans today if nothing is done yet.
- **Equipment**: `equipOK(ex)` reads `state.settings.equip` and `travel`.
- **Runner**: `startSession(kind, manual)`; `kind` is `"main"` or `"posture"`; `manual` = no countdown, user presses Next. `advance()`, `goBack()`, `finishSession()` → `commitDay()`.
- **Video**: `CAN_EMBED` is false inside claude.ai (sandbox blocks iframes) and true anywhere else; then `videoBlock()` renders a tap-to-play youtube-nocookie iframe. `CAN_EMBED` also gates gist sync (it means "not inside claude.ai").

## Data and sync

- `localStorage` keys: `mr:state` (settings, unlocks, counters; `state.updated` = ms timestamp of the last local save), `mr:log-YYYY` (`{days:{date:entry}, weeks:{isoWeek:anchors}, posture:{date:entry}}`), `mr:profile`, `mr:gist` (`{token, pass, id, salt, base}`).
- Entry: `{tier, plan:[ids], done:[ids], skipped:[ids], secs, feel, counted, rc, hist:[earlier rounds]}`. Several sessions a day: "Again" (`newRound`) files the finished round into `hist` and plans a fresh one with free choice of length; `dayStats()` sums rounds for history. Only the first round of a day advances `state.sessions` (the unlock clock); `rc` marks whether the current round was added to per-exercise `counts`.
- These keys and the gist filename `morning-reserve.json` are storage identifiers: **do not rename them** when the app is renamed, or existing data is orphaned.
- **Profile**: `{v, updated, postureNote, notes:{exId:text}, anchors:{anchorId:why}, exercises:{exId:{why,protects,steps,pitfalls,evidence}}}`. `cleanProfile()` validates (drops malformed fields), `applyProfile()` overlays it onto `EX`/`ANCHORS` from the pristine copies `EX_BASE`/`ANCHOR_BASE`, `saveProfile()` stamps `updated` and schedules a sync. Notes are edited in Library (`data-savenote`), bulk edits via Settings → Personal profile (load file / download / edit as text). Not sent to the claude.ai database.
- **Encryption**: the gist file holds `{enc, salt, iv, ct}`: AES-GCM-256, key from the passphrase via PBKDF2-SHA256 (310k iterations), salt per gist (adopted from the gist if another device created it), fresh IV per write. `seal()`/`unseal()`; a wrong passphrase surfaces as `Error("passphrase")`. A plaintext gist (older format) is still read once, then rewritten encrypted.
- **Gist sync** (standalone only): `gistSync(preferLocal)` reads the gist, merges, writes back if the gist lacks anything. The profile merges by newest `updated`. Logs merge per date with `pickDays` (more `done` wins; ties go to local after a local change, to the gist when pulling). State: `adoptState()` compares both sides' `updated` against `gist.cfg.base` (the value at the last sync): only-gist-changed → take it; both changed → more sessions wins, then newer. Triggered 1.5 s after any `persist()`, on boot, on returning to the foreground, and flushed when the page is hidden. `gistConnect(token)` finds an existing gist holding `morning-reserve.json` or creates a private one. Import calls `gistReplace()` (overwrite, no merge).
- On claude.ai the same docs sync to the artifact database (`window.claude.use("db")`) instead.

## Privacy

The repo is public (free GitHub Pages). `app/` was scrubbed of everything personal (conditions, injuries, weight, age,
martial art, posture findings); the personal versions live in `private/profile.json`. When the user asks for something
specific to them, put it in the profile, not in `exercises.js`. Profile edits: change `private/profile.json`, validate it
is JSON with known exercise ids, and tell the user to load it (Settings → Personal profile → Load file).

## Other ways to ship (if Pages stops fitting)

- **Private repo**: Cloudflare Pages or Netlify deploy private repos for free; same build command, output `app/build/site`.
- **Flutter wrapper (real APK, no hosting)**: put `build/site` under `assets/web/`, serve with `flutter_inappwebview`'s `InAppLocalhostServer` (http, not `file://`, so `localStorage` persists and YouTube embeds work); enable JS and DOM storage; add `wakelock_plus` if the screen dims mid-session.
- **Trusted Web Activity (Bubblewrap)**: Play-installable APK pointing at the hosted URL.

## Conventions

- Evidence wording in `exercises.js` is deliberate (graded strong / moderate / thin, with sources named). Keep that tone; do not upgrade claims.
- Test at 375-400 px width, light and dark. No horizontal scroll. Touch targets at least 44 px. Colour only on data; no gradients, glows, blur or entrance animations (app-screen rules).
- Local test: `python app/build.py && python -m http.server 8080 --directory app/build/site`.
