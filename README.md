<div align="center">

<img src="src/icons/icon-128.png" width="112" alt="Funny Jump icon">

# Funny Jump

### A bright cartoon runner & platformer with a live day ↔ night cycle.

**Run. Jump. Web-swing across the sky.** Play in your browser, from the Chrome toolbar, or on Android, fully offline.

[![Release](https://img.shields.io/github/v/release/nikhilrana2715/Running-Game?label=release&color=7ED321)](https://github.com/nikhilrana2715/Running-Game/releases/latest)
[![Build & Deploy Web](https://img.shields.io/github/actions/workflow/status/nikhilrana2715/Running-Game/deploy-web.yml?branch=main&label=web%20build)](https://github.com/nikhilrana2715/Running-Game/actions/workflows/deploy-web.yml)
[![Release build](https://img.shields.io/github/actions/workflow/status/nikhilrana2715/Running-Game/release.yml?label=release%20build)](https://github.com/nikhilrana2715/Running-Game/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-FFC933)](LICENSE)
![Platforms](https://img.shields.io/badge/platforms-Web%20%7C%20Chrome%20%7C%20Android-2FA8F5)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)
![No dependencies](https://img.shields.io/badge/runtime%20deps-0-8E44D8)
![Offline](https://img.shields.io/badge/works-offline-2E9E4B)

**[▶ Play in browser](https://nikhilrana2715.github.io/Running-Game/)** ·
**[⬇ Download APK](https://github.com/nikhilrana2715/Running-Game/releases/latest/download/FunnyJump-debug.apk)** ·
**[🧩 Chrome extension zip](https://github.com/nikhilrana2715/Running-Game/releases/latest)**

[Features](#-features) · [Controls](#-controls) · [Install](#-install--play) · [Build from source](#-build-from-source) · [Deploy](#-deploy--release) · [Architecture](#-architecture) · [Roadmap](#-roadmap) · [FAQ](#-faq)

<img src="store/screenshot-2-webswing.png" width="820" alt="Hero web-swinging over a level">

</div>

---

## ✨ Highlights

|  |  |
|---|---|
| 🌗 **Living world** | A real-time day → sunset → night → dawn cycle. Sky, sun/moon, stars, fireflies, glowing coins, lantern-lit darkness, the music *and* the UI colours all change with it. |
| 🕸️ **Web Swing** | Double-tap jump to shoot a web, zip forward and fling into a long glide. Tap again mid-flight to chain swings. |
| 🫧 **Power-ups** | Speed Boots, Super Jump, Shield, Coin Magnet, Heart and Web refills float along every run. |
| 🪙 **Progress that sticks** | Every coin you pick up is saved for good. Spend coins on skins and permanent upgrades. |
| 🎁 **Daily loop** | 7-day login streak plus 3 fresh missions every day. |
| 📦 **One codebase, three platforms** | The same vanilla JS game ships as a PWA, a Chrome MV3 extension and an Android app. |

## 📸 Screenshots

<div align="center">

| Main menu | Night + power-ups |
|---|---|
| <img src="store/screenshot-1-menu.png" width="400" alt="Main menu"> | <img src="store/screenshot-3-night-powerups.png" width="400" alt="Night level with shield and speed boots"> |
| **Web Swing** | **Daily rewards & missions** |
| <img src="store/screenshot-2-webswing.png" width="400" alt="Web swing"> | <img src="store/screenshot-4-daily.png" width="400" alt="Daily rewards"> |

</div>

## 🎮 Features

### Game modes
- **Adventure:** 24 levels across 6 worlds (Green Meadow → Sunset Peaks), 5 hidden stars per level, a mid-level checkpoint and a 1–3 ★ rating.
- **Endless Run:** auto-running mode that speeds up over time, scores by distance and has a faster day/night cycle.
- Levels are **procedurally generated but seeded**, so level *N* is always the same layout.

### Web Swing
| Action | Result |
|---|---|
| Double-tap **Jump** (2nd tap in mid-air) | Web sticks ahead-up and the hero zips along it |
| Release | Big forward fling plus a low-gravity glide (~1.5 s, ~8× a normal jump's distance) |
| Tap **Jump** while gliding | Chain another web |

3 swings per run (5 with *Web Shooter+*), refilled by 🕸️ bubbles (max 9). With no swings left, the second tap falls back to double jump.

### Power-ups (collect during a run)
| Bubble | Effect | Duration |
|---|---|---|
| 👟 Speed Boots | Run ×1.45 faster | 7 s |
| 🦘 Super Jump | Jump ×1.25 higher | 8 s |
| 🛡️ Shield | Blocks the next hit | 12 s |
| 🧲 Coin Magnet | Pulls coins from a wide radius | 10 s |
| 🕸️ Web | +1 Web Swing | n/a |
| ❤️ Heart | +1 health | n/a |

Active power-ups show as countdown chips in the HUD. The *Power Boost* upgrade makes them last 50% longer.

### Store: spend your saved coins
| Skins | Price | Upgrades | Price |
|---|---|---|---|
| Headband Hero | Free | ❤️ Extra Heart (4 hearts) | 1,000 |
| Controller Kid | 500 | 🪽 Double Jump | 1,500 |
| Night Ninja | 800 | 🧲 Coin Magnet (permanent) | 1,200 |
| Bubble Girl | 1,000 | 👟 Swift Feet (+12% speed) | 800 |
| Robo Runner | 1,500 | 🦘 Spring Legs (+10% jump) | 900 |
|  |  | 🕸️ Web Shooter+ (+2 swings) | 1,000 |
|  |  | ⚡ Power Boost (+50% duration) | 1,200 |
|  |  | 💖 Revive ×3 | 300 |

Coins are banked when you finish a level or hit game over, and also when you quit, restart, or close/minimise the app, so you never lose them.

### Daily rewards & missions
- **Login streak:** 50 → 75 → 100 → 150 → 200 → 250 → **500 coins + free Revive** on day 7.
- **3 daily missions** (e.g. *Web Swing 6 times*, *Stomp 10 enemies*, *Collect 200 coins*) worth 50–150 coins each.

### Polish
Coyote time, jump buffering, variable jump height, squash & stretch, screen shake, particles, synthesized SFX and adaptive music, haptics on Android, an English / हिन्दी UI and trophies.

## 🕹️ Controls

| Action | Keyboard | Mouse | Touch | Gamepad |
|---|---|---|---|---|
| Move | ← → / A D | on-screen ◀ ▶ | ◀ ▶ (slide between) | D-pad / left stick |
| Jump | Space / ↑ / W / Z / K | click anywhere | JUMP or tap anywhere | A / B |
| Web Swing | double-tap jump | double-click | double-tap | double-press A |
| Pause | P / Esc | ⏸ | ⏸ / Android back | Start |
| Confirm | Enter | n/a | n/a | n/a |

Hold jump for a higher jump. In Endless Run, ◀ slows you down and ▶ speeds you up.

## 📥 Install & play

| Platform | How |
|---|---|
| 🌐 **Browser / PWA** | Open **[nikhilrana2715.github.io/Running-Game](https://nikhilrana2715.github.io/Running-Game/)** → *Install app* from the address bar to play offline. |
| 🧩 **Chrome extension** | Download the zip from [Releases](https://github.com/nikhilrana2715/Running-Game/releases/latest) → unzip → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the folder. Click the toolbar icon to play in the popup, or press **Alt+Shift+J** for a full tab. |
| 🤖 **Android** | Download [`FunnyJump-debug.apk`](https://github.com/nikhilrana2715/Running-Game/releases/latest/download/FunnyJump-debug.apk) → open on the phone → allow *Install unknown apps*. Runs fullscreen in landscape. |

## 🛠️ Build from source

**Requirements:** Node.js 18+. For Android you also need JDK 17 and the Android SDK (compileSdk 34).

```bash
git clone https://github.com/nikhilrana2715/Running-Game.git
cd Running-Game
npm install

npm run build          # -> dist/web, dist/extension, dist/funny-jump-extension-vX.Y.Z.zip
npm run serve          # play at http://localhost:5173
npm run android:apk    # -> dist/FunnyJump-debug.apk
```

| Script | What it does |
|---|---|
| `npm run build` | Copies `src/` into the web build (with a cache-busting service worker) and the extension build, then zips the extension |
| `npm run serve` | Local static server for `dist/web` |
| `npm run android:sync` | Build + `cap sync android` |
| `npm run android:apk` | Build + sync + Gradle `assembleDebug` |
| `node scripts/icons.mjs` | Regenerate PNG icons from the in-game art (headless Chrome) |
| `node scripts/store-assets.mjs` | Regenerate Chrome Web Store screenshots and promo tile into `store/` |

**Debug hook:** open `index.html?debug` to get `window.__fj.{game, demo, start(mode, level), Save}` in the console.

> Note: `npm run build` wipes `dist/` (including a previously built APK).

## 🚀 Deploy & release

Everything is automated with GitHub Actions:

| Trigger | Workflow | Output |
|---|---|---|
| Push to `main` | [`deploy-web.yml`](.github/workflows/deploy-web.yml) | Builds and publishes the web game to **GitHub Pages**; uploads the extension zip as an artifact |
| Push a tag `v*` | [`release.yml`](.github/workflows/release.yml) | Builds the extension zip and the Android APK, then attaches both to a **GitHub Release** |

```bash
# ship a new version
npm version minor --no-git-tag-version   # bump package.json (also the extension version)
git commit -am "Release v1.2.0"
git tag v1.2.0 && git push && git push --tags
```

One-time setup: **Settings → Pages → Source: GitHub Actions**.

**Chrome Web Store:** the step-by-step publishing guide (listing text, privacy answers, images) is in [`docs/CHROME_WEB_STORE.md`](docs/CHROME_WEB_STORE.md).

## 🧱 Architecture

Vanilla JavaScript ES modules + Canvas 2D. There's **no engine, no bundler and no runtime dependencies**, so it passes the strict MV3 extension CSP and runs fully offline. All art is drawn procedurally in code, and all sound is synthesized with WebAudio.

```
src/
├── index.html            # all screens + HUD (no inline scripts – extension-CSP safe)
├── css/tokens.css        # design tokens; colours morph with day/night via --n
├── css/app.css           # components
├── js/
│   ├── main.js           # screens, HUD, store, settings, daily, platform glue, main loop
│   ├── game.js           # physics, web swing, power-ups, enemies, camera, rendering, lighting
│   ├── levelgen.js       # seeded procedural levels + endless streaming + power-up spawns
│   ├── sky.js            # day/night phase -> sky state, parallax background
│   ├── art.js            # every sprite, drawn in code
│   ├── audio.js          # synthesized SFX + step-sequencer music
│   ├── input.js          # keyboard, multitouch buttons, gamepad
│   ├── daily.js          # login streak + daily missions
│   ├── save.js           # versioned localStorage save
│   ├── config.js         # all tuning constants (physics, web, power-ups, store)
│   └── i18n.js           # English / Hindi
├── sw.js                 # offline cache (PWA)
└── privacy.html          # privacy policy
extension/                # MV3 manifest, popup, background worker
android/                  # Capacitor 6 Android project
scripts/                  # build, icons, store assets, dev server
.github/workflows/        # Pages deploy + release pipeline
```

| Decision | Why |
|---|---|
| No engine / bundler | Tiny download, instant load, MV3 CSP compliant, no build step to debug |
| Procedural art & audio | Zero asset files, crisp at any resolution, easy to recolour per world |
| Seeded level generation | 24 handcrafted-feeling levels plus infinite endless mode from one generator |
| Capacitor 6 | Native Android wrapper with fullscreen, back button and haptics |
| Tuning in `config.js` | All feel parameters (jump, web swing, power-ups, prices) live in one place |

## 🗺️ Roadmap

- [x] 24 levels, Endless Run, day/night cycle
- [x] Web, Chrome extension and Android builds
- [x] Web Swing, power-ups, permanent coin wallet, new upgrades
- [x] Daily rewards & missions
- [x] CI: GitHub Pages + automated releases
- [ ] Chrome Web Store listing
- [ ] Boss levels, egg-throwing chicken, falling platforms
- [ ] Online leaderboard
- [ ] Signed Play Store release build
- [ ] Composed music tracks

## ❓ FAQ

<details>
<summary><b>Does it collect any data?</b></summary>

No. Progress is stored only in your browser/device (localStorage). There are no analytics, ads, trackers or network calls during play. The extension requests **no permissions**. See the [privacy policy](src/privacy.html).
</details>

<details>
<summary><b>Will I lose my coins if I close the game mid-run?</b></summary>

No. Coins are banked on finish, on game over, on quit/restart, and when the app goes to the background.
</details>

<details>
<summary><b>The web swing doesn't trigger.</b></summary>

The second tap must come within ~0.3 s of the first while you're in the air, and you need at least one 🕸️ charge (shown in the HUD).
</details>

<details>
<summary><b>How do I tweak the game feel?</b></summary>

Edit `src/js/config.js`: `GAME.player` for movement, `GAME.web` for swing distance/glide, `GAME.power` for power-up durations, and `UPGRADES` / `SKINS` for prices.
</details>

## 🤝 Contributing

Issues and pull requests are welcome.

1. Fork and create a branch: `git checkout -b feature/my-idea`
2. `npm install && npm run build && npm run serve` and test on desktop and mobile widths
3. Keep the rules: no runtime dependencies, no inline `<script>` / `on*=` handlers, and art/audio generated in code
4. Open a PR describing the change, with a screenshot or GIF for visual changes

## 📄 License

[MIT](LICENSE) © 2026 Nikhil Rana

<div align="center">
<sub>Made with ☀️ and 🌙. If you enjoy it, leave a ⭐!</sub>
</div>
