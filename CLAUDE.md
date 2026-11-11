# CLAUDE.md — Funny Jump (project memory)

Read this first. It replaces re-reading the whole codebase. Keep it updated at the end of every session.

## What
Original cartoon 2D runner/platformer based on `FUNNY_JUMP_ROADMAP.md`. ONE web codebase (`src/`) ships to 3 targets:
- **Web/PWA** → `dist/web` (offline via `sw.js`)
- **Chrome extension (MV3)** → `dist/extension` + zip (popup 780×440 iframe + full tab, `Alt+Shift+J`)
- **Android APK** → Capacitor 6 project in `android/` (webDir = `dist/web`)

Signature feature: live **day ↔ night cycle** (75 s loop, 55 s in endless). Sky, sun/moon, stars, clouds, hills,
lantern-light darkness, fireflies, glowing coins/boxes, music filter, AND all DOM UI tokens morph via CSS var `--n` (0..1).

## Tech decisions (don't re-litigate)
- Vanilla JS ES modules + Canvas 2D. **No engine, no bundler, no runtime deps** (MV3 CSP + offline). Phaser from roadmap intentionally dropped.
- All art procedural in `art.js` (no sprite files). All audio synthesized (`audio.js`, WebAudio). Fonts bundled (`src/fonts`, from @fontsource).
- Levels procedurally generated + **seeded** (`levelgen.js`): level N always same. Tiled editor not used.
- Capacitor **6** (not 7) because machine has JDK 17 + compileSdk 34. Android SDK at `%LOCALAPPDATA%\Android\Sdk`.
- Copyright: no Mario lookalikes → purple "Grumpcap" mushroom, star "Lucky Box" (not `?`), finish gate (not flagpole).
- No inline `<script>` / `on*=` handlers anywhere (extension CSP).

## Commands
```
npm run build            # src -> dist/web + dist/extension + dist/funny-jump-extension-vX.zip
npm run serve            # (or) node scripts/serve.mjs dist/web 5173
node scripts/icons.mjs   # regen PNG icons from game art via headless Chrome -> src/icons + assets/android
npm run android:sync     # build + cap sync
npm run android:apk      # build + sync + gradlew assembleDebug -> android/app/build/outputs/apk/debug/app-debug.apk
```
Debug hook: open `index.html?debug` → `window.__fj.{game,demo,start(mode,lvl),Save}`.
Headless test scripts used (puppeteer-core + local Chrome) lived in the session scratchpad, not in repo.

## File map (src/js)
| file | role |
|---|---|
| config.js | constants (physics, score, worlds, skins, upgrades). Tile T=48, ROWS=15, view 720 tall |
| util.js | rng (mulberry32), color mix, noise, fmt |
| save.js | versioned localStorage `funnyJump.save.v1`, merge-with-defaults |
| levelgen.js | `Level` class: tiles (0 empty,1 ground,2 one-way plat,3 lucky box,4 used,5 crate), ents, decor, segments, endless `extend()` |
| game.js | `Game`: player physics (coyote, buffer, jump-cut, double jump), enemies, items, camera, particles, render + night lighting, hooks `onHud/onComplete/onGameOver/onPhase/onToast` |
| sky.js | cycle phase → sky state; background parallax drawing |
| art.js | every sprite + cached tile sprites + `heroThumb()` |
| input.js | keyboard (←→/AD, Space/W/↑/Z/K, P/Esc, Enter), pointer multitouch buttons with slide, click-anywhere = jump, gamepad |
| audio.js | sfx + step-sequencer music (night = filtered/softer) |
| i18n.js | EN/HI via `data-i18n` |
| main.js | screens, HUD, store, settings, trophies, loop, platform glue (popup/extension/Capacitor back button & exit) |
CSS: `css/tokens.css` (design tokens, see DESIGN_SYSTEM.md) + `css/app.css` (components).

## Game rules implemented
24 levels (3 pages × 8), 6 worlds; 5 stars/level; checkpoint mid-level; goal gate. Rating: 1★ finish, 2★ ≥3 stars or score target, 3★ all stars or (no death & ≥3 stars).
Score: coin 10, star 200, stomp 50, apple 30, chest 100, time bonus, no-damage 300. Endless: +1/metre, speed 300→560.
Lives 3, hearts 3 (+1 upgrade), i-frames 1.5 s. Revive: pack or 150 coins. Coins banked on finish AND game over.
Store: skins red(free)/blue 500/ninja 800/pink 1000/robo 1500; Extra Heart 1000, Double Jump 1500, Magnet 1200, Revive×3 300.

## Status (2026-11-08, session 1)
- DONE: full game, all screens, day/night, web build, extension build+zip, icons, Android project patched
  (sensorLandscape, immersive fullscreen in MainActivity.java, VIBRATE, custom icons/splash).
- Verified headless: no console errors; menu/levels/play/pause/game over/complete/store/settings; touch buttons move player; 24 levels generate (5 stars each, gaps ≤3 except mover gaps).
- Extension tested in real Chrome via puppeteer-core 24 `browser.installExtension()` (Chrome 137+ ignores `--load-extension`): no CSP errors.
- Debug APK built OK (4.9 MB) → `dist/FunnyJump-debug.apk`. `android/local.properties` must use forward slashes:
  `sdk.dir=C:/Users/nikhi/AppData/Local/Android/Sdk`. First Gradle run downloads ~14 min; later ~1 min.
- NOTE: `npm run build` wipes `dist/` (APK included) — rerun `npm run android:apk` to get it back.
- See bottom "Next" list for open items.

## Session 2 (2026-11-11) — Web Swing + power-ups
- Coins bank to permanent wallet also on quit/retry/home/app hide (`bankLive()` in main.js; `game.banked` prevents double count).
- **Web Swing**: (reworked session 3, see below). Charges per run `GAME.web.charges`=3 (+2 webPro), cap 9. Takes priority over double jump; falls back to double jump if 0 charges. Tuning in `GAME.web`.
- **Power-up bubbles** (`type:'power'`, `kind` from `POWERUPS` in config): boots (speed ×1.45), spring (jump ×1.25), shield (blocks 1 hit), magnet (temp, r=260), web (+1 charge), heart. Spawned by `Level.maybePower()` every 22–40 cols using separate `prng` (old tile layouts unchanged). Timers `game.pw`, HUD chips `#hud-powers` + `#hud-web`.
- New store upgrades: swift (+12% speed), springLegs (+10% jump), webPro (+2 webs), powerTime (+50% duration). Save stats: webs, powerups.
- Verified headless: swing triggers in level + endless, powers collect, shield blocks, banking OK, no console errors.

## Session 3 (2026-11-11) — swing fix, daily, deploy
- Web Swing rewritten: zip toward anchor ahead-up (`swing()` lerps velocity, W.zip) → `releaseWeb(true)` flings (W.flingX/flingY) → glide (W.glideGrav ×gravity, W.glideFall cap, W.airDrag bleed) for W.glide s. Tap again mid-flight = chain. Hero clamped to y≥4. Measured: ~1450 px / 1.55 s airtime vs ~180 px normal jump.
- `daily.js`: 7-day login streak (DAILY_REWARDS, day 7 = +1 revive) + 3 seeded daily missions; progress = `Save.data.stats[key] - base` (no gameplay hooks). `Save.grant()` adds coins without counting toward totalCoins. Menu 🎁 button + red dot, auto-opens once per session if unclaimed (not in popup).
- Deploy: `.github/workflows/deploy-web.yml` (push main → GitHub Pages; needs Settings→Pages→Source=GitHub Actions), `release.yml` (tag v* → extension zip + debug APK on GitHub Release). build.mjs uses `zip` on non-Windows.
- Chrome Web Store: `docs/CHROME_WEB_STORE.md`, images in `store/` (`scripts/store-assets.mjs`, needs puppeteer-core), privacy policy `src/privacy.html`.
- Version 1.1.0. Repo: github.com/nikhilrana2715/Running-Game.

## Session 4 (2026-11-11) — v1.2.0
- GitHub Pages enabled via API (build_type=workflow) → live at https://nikhilrana2715.github.io/Running-Game/
- New: `crumble` ents (one-way, trig 0.5 s → fall → respawn 3 s; `segCrumble` in levelgen, d>0.15), chicken drops `egg` ents when hero within 380 px (diff>0.2), coin combo (`addCoins`: <0.9 s streak, mult 1+floor(combo/8) max 5, +3 coins per tier, HUD `#hud-combo`). NOTE: new segment weight changed all level layouts (still seeded, 5 stars each).
- Release also uploads stable `funny-jump-extension.zip` (latest/download link). Extension verified in real Chrome from release zip (popup + full tab, no errors).

## Next / ideas (roadmap items not done)
- Boss levels (19–24), egg-throwing chicken, falling platforms
- Supabase leaderboard + analytics events (roadmap Phase 10) — needs user's Supabase project
- Play Store release build (signing keystore) — user must create keystore
- Real music tracks (currently synthesized)
