# Publishing Funny Jump to the Chrome Web Store

The extension is Manifest V3, has **no permissions**, no remote code and works offline, so review should be quick.

## 1. One-time setup (you)
1. Go to <https://chrome.google.com/webstore/devconsole> and sign in with your Google account.
2. Pay the one-time **$5 developer registration fee** and verify your email.
3. (Recommended) Turn on 2-Step Verification on that Google account (required to publish).

## 2. Get the package
- **Easiest:** download `funny-jump-extension-vX.Y.Z.zip` from the latest GitHub Release
  (created automatically when you push a `v*` tag, see README → Deploy).
- **Or locally:** `npm run build` → `dist/funny-jump-extension-vX.Y.Z.zip`.
- Test first: `chrome://extensions` → Developer mode → **Load unpacked** → `dist/extension`.

## 3. Create the item
Dev console → **New item** → upload the zip. Then fill the tabs:

### Store listing
| Field | Value |
|---|---|
| Name | Funny Jump – Mini Game (from manifest) |
| Summary | Quick cartoon runner & platformer with a live day-night cycle. Play in the popup or a full tab — works offline. |
| Category | Entertainment → Games (or "Fun") |
| Language | English |
| Icon | `src/icons/icon-128.png` |
| Screenshots (1280×800) | `store/screenshot-1-menu.png` … `store/screenshot-4-daily.png` |
| Small promo tile (440×280) | `store/promo-small-440x280.png` |

**Description** (paste):
```
Funny Jump is a bright cartoon runner & platformer you can play right from your toolbar.

• 24 hand-tuned levels across 6 worlds + Endless Run
• Live day ↔ night cycle: sun, moon, stars, fireflies and glowing coins
• Web Swing: double-tap jump to shoot a web and fly across gaps
• Power-ups: Speed Boots, Super Jump, Shield, Coin Magnet, extra hearts
• Coins are saved forever – unlock skins and permanent upgrades in the Store
• Daily Rewards & Daily Missions
• Play in the small popup or press Alt+Shift+J for a full tab
• Keyboard, mouse, touch and gamepad. Works 100% offline. No ads, no tracking.
```

### Privacy practices
- **Single purpose:** "A casual offline mini game played in the extension popup or a full tab."
- **Permissions:** none requested (nothing to justify).
- **Remote code:** **No**, I am not using remote code.
- **Data usage:** tick nothing (the extension does not collect user data); tick all three certification boxes.
- **Privacy policy URL:** `https://nikhilrana2715.github.io/Running-Game/privacy.html` (deployed by GitHub Pages).

### Distribution
- Visibility: **Public** (or Unlisted to test with a link first). Regions: all.
- Pricing: free.

## 4. Submit
Click **Submit for review**. It usually takes from a few hours to a few days. You get an email when it is live.

## 5. Updating later
1. Bump `"version"` in `package.json` (the build copies it into `manifest.json`; the Web Store needs a higher number each upload).
2. Commit, then `git tag v1.2.0 && git push --tags` → the Release workflow builds the new zip.
3. Dev console → your item → **Package** → **Upload new package** → Submit.

## Checklist
- [ ] $5 developer account registered
- [ ] Zip uploaded, loads fine unpacked
- [ ] Icon, 4 screenshots, small promo tile
- [ ] Description, category, language
- [ ] Privacy tab: single purpose, no remote code, no data collected, policy URL
- [ ] GitHub Pages enabled (so the privacy URL works)
- [ ] Submit for review
