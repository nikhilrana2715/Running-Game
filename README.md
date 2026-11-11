# 🎮 Funny Jump — Mini Game

Cartoon runner + platformer with a **live day ↔ night cycle**. 24 levels, Endless Run, store with skins & power-ups.
Plays on **web**, as a **Chrome extension**, and on **Android**.

## Controls
| | Keyboard | Mouse | Phone |
|---|---|---|---|
| Move | ← → / A D | on-screen ◀ ▶ | ◀ ▶ buttons (slide finger between them) |
| Jump | Space / ↑ / W | click anywhere | JUMP button or tap anywhere |
| Pause | P / Esc | ⏸ button | ⏸ / Android back |
Hold jump longer = higher jump. **Double-tap jump = Web Swing** (fly far; tap again mid-flight to chain). Endless Run: ◀ slows down, ▶ speeds up. Gamepads work too.

## Features
- 24 levels / 6 worlds + Endless Run, live day ↔ night cycle
- Web Swing (3 per run, +refills from 🕸️ bubbles)
- Power-up bubbles: 👟 Speed Boots · 🦘 Super Jump · 🛡️ Shield · 🧲 Magnet · ❤️ Heart
- Coins saved forever → skins + permanent upgrades (Extra Heart, Double Jump, Magnet, Swift Feet, Spring Legs, Web Shooter+, Power Boost)
- Daily Reward (7-day streak) + 3 Daily Missions

## Build
```bash
npm install
npm run build        # dist/web, dist/extension, dist/funny-jump-extension-vX.Y.Z.zip
npm run serve        # play at http://localhost:5173
```

### Chrome extension (office mode)
1. `npm run build`
2. Open `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → select `dist/extension`
3. Pin it. Click the icon to play in the popup, or ⛶ / **Alt+Shift+J** for a full tab. Works offline.

### Android APK
Requires Android SDK + JDK 17.
```bash
npm run android:apk
# -> android/app/build/outputs/apk/debug/app-debug.apk  (copy to phone & install)
```
Or open `android/` in Android Studio and press ▶. The app is fullscreen landscape.

### Web / PWA
Deploy `dist/web` to any static host (e.g. Vercel). It installs as an app and works offline.

## Deploy (GitHub)
| What | How | Result |
|---|---|---|
| Web game | push to `main` | GitHub Actions builds and publishes to **https://nikhilrana2715.github.io/Running-Game/** |
| Extension zip + Android APK | `git tag v1.1.0 && git push --tags` | **GitHub Release** with `funny-jump-extension-v1.1.0.zip` + `FunnyJump-debug.apk` |
| Chrome Web Store | upload the release zip | see [docs/CHROME_WEB_STORE.md](docs/CHROME_WEB_STORE.md) |

One-time: repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Store images: `store/` (regenerate with `scripts/store-assets.mjs`).

See `CLAUDE.md` for architecture and `DESIGN_SYSTEM.md` for the UI system.
