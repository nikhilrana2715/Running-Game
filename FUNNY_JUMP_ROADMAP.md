# 🎮 Funny Jump Mini Game — A to Z Development Roadmap

> Tumhari 5 images ke analysis par based complete build plan.
> Genre: **2D Side-Scrolling Platformer (Mario-style)** | Style: **Cartoon / Casual / Colorful** | Target: **Mobile + Web (Landscape)**

---

## 1. Images Ka Analysis (Kya-Kya Diya Hua Hai)

### 1.1 Game Concept
- Ek bachcha (hero) **run + jump** karta hai, **coins collect** karta hai, **enemies/spikes avoid** karta hai, **stars** aur **power-ups (apple)** uthata hai.
- Level-based progression: 8 levels per page, 3 pages (= ~24 levels), stars (1-3) per level, locked levels.
- Meta layer: **Coins → Store/Shop**, **Trophy (leaderboard/achievements)**, **Settings**.

### 1.2 Screens Jo Images Me Dikhe (Total 8)

| # | Screen | Kya Hai |
|---|--------|---------|
| 1 | **Main Menu / Splash** | Logo "Funny Jump – Mini Game", **Play**, Trophy, Settings (v1). Version 2 me: **Levels, Store/Shop, Settings, Exit**. Chicken (sunglasses) mascot, hero, mushroom, coins, "?" block. Bottom me 3 page-dots |
| 2 | **Select Level** | Wooden board title, 8 level buttons (grid 4x2), stars (0-3), lock icon, back arrow, left/right pagination arrows, page dots, top-right **coin balance (2,450) + "+" button** (buy coins) |
| 3 | **Gameplay HUD** | Top-left: player avatar + **lives x3**, **3 hearts (health)**, **Score: 1,250**, **Coins: 320**, **Pause** button. Bottom: **Left, Right** buttons, **Jump** button (right side) |
| 4 | **Tutorial/Gameplay v2** | "JUMP!" wooden sign (tutorial hint), apple + coin on floating platform, dust puff animation on jump, sun with smiley face, treasure chest |
| 5 | **Game Over** | "Game Over" red ribbon, skull badge, Score, **Best score** (trophy), buttons: **Home, Retry, Next/Play** |
| 6 | **Game Over (v2)** | Broken heart, crying hero, **Retry** + **Home** |
| 7 | **Level Complete** | 3 stars, confetti, **Score, Coins, Time (01:24)**, **Next** + **Home** |
| 8 | **Gameplay v3 HUD** | Coins 1280, **Stars 3/5 (collectible stars per level)**, hearts, lives x3, mid-air jump with trail |

### 1.3 Game Objects / Assets (Sprites List)

**Characters**
- **Hero** (2 variants): brown spiky hair + red headband + white hoodie + red sneakers (main) | black hair + blue tee + controller icon (alt skin → Store me unlock kar sakte ho)
- Animations needed: idle, run, jump-up, fall, land (squash), hurt, die/cry, win/cheer

**Enemies / Hazards**
- 🍄 **Mushroom** (red cap, walking enemy; stomp karke maar sakte ho)
- ⚫ **Spike ball** (black spiky, angry face; touch = damage, stomp NOT allowed)
- 🐔 **Chicken with sunglasses** (mascot; flying enemy / companion / bonus-giver)

**Collectibles**
- 🪙 Coin (star-embossed gold coin)
- ⭐ Level Star (big, glowing — 3/5 type collectible, used for 1-3 star rating)
- 🍎 Apple (heal +1 heart / power-up)
- 🧰 Treasure chest (bonus coins reward)
- ❓ Mystery block (hit from below → coin / apple / power-up)
- 📦 Wooden crate (breakable / pushable obstacle)

**Environment**
- Grass-top dirt/stone platforms (big + floating), wooden fence, wooden signs, trees, waterfall, mountains, clouds, river, flowers, smiling sun
- Parallax layers: sky → clouds → mountains → trees/hills → foreground platforms

**UI Elements**
- Yellow pill button (Play), purple rounded buttons (Levels/Store/Settings/Trophy), red Exit, green Play/+ button, wooden plank titles, red ribbon banner, cream parchment panel, dark-navy HUD pills, translucent white-ring control buttons
- Fonts: bold rounded outlined font (like **Lilita One / Fredoka One / Baloo**)

### 1.4 Colour Palette (Images se)
| Use | Colour |
|-----|--------|
| Sky blue | `#2FA8F5` → `#8ED8FF` gradient |
| Grass green | `#7ED321` / `#4CAF1A` |
| Dirt orange-brown | `#C8742A` / `#8B4A1F` |
| Coin/Play yellow | `#FFC933` / `#FF9F1C` |
| Purple buttons | `#8E44D8` / `#5B2A9E` |
| Heart/Ribbon red | `#E53935` |
| HUD navy | `#12294A` |
| Locked grey | `#7B8794` |

---

## 2. Tech Stack Decision (Recommended)

Tum web/JS developer ho (HTML, PWA, Vercel use karte ho) → **best choice: Phaser 3 + Vite**.

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Phaser 3 (JS/TS) + Vite** | Tumhari existing skills, browser + mobile (PWA), Vercel deploy free, arcade physics built-in | Native app ke liye wrapper chahiye | ✅ **Recommended** |
| Godot 4 | Great 2D, export Android/iOS/Web | Naya language (GDScript) | 2nd choice |
| Unity 2D | Industry standard | Heavy, C# seekhna padega | Overkill |
| Pure HTML5 Canvas | Full control | Physics/tilemap sab khud likhna | Slow |

**Final Stack**
- Engine: **Phaser 3.80+** · Build: **Vite** · Language: **TypeScript** (ya JS agar jaldi chahiye)
- Level editor: **Tiled Map Editor** (free) → JSON export
- Audio: **Howler.js** ya Phaser built-in
- Storage: **localStorage** (Phase 1) → **Supabase** (leaderboard, Phase 2)
- Mobile wrap (optional): **Capacitor** → Android APK
- Hosting: **Vercel**
- Analytics: custom events → Supabase table (tumhare Data Science goal ke liye 🔥)

---

## 3. Project Folder Structure

```
funny-jump/
├─ public/
│  ├─ manifest.json            # PWA
│  └─ icons/
├─ src/
│  ├─ main.ts                  # Phaser config
│  ├─ config/
│  │  ├─ gameConfig.ts         # gravity, speeds, constants
│  │  └─ levels.json           # level metadata (name, stars rules, time)
│  ├─ scenes/
│  │  ├─ BootScene.ts          # minimal assets + loading bar
│  │  ├─ PreloadScene.ts       # all assets
│  │  ├─ MainMenuScene.ts
│  │  ├─ LevelSelectScene.ts
│  │  ├─ GameScene.ts          # core gameplay
│  │  ├─ UIScene.ts            # HUD (runs parallel to GameScene)
│  │  ├─ PauseScene.ts
│  │  ├─ GameOverScene.ts
│  │  ├─ LevelCompleteScene.ts
│  │  ├─ StoreScene.ts
│  │  └─ SettingsScene.ts
│  ├─ objects/
│  │  ├─ Player.ts
│  │  ├─ Coin.ts  Star.ts  Apple.ts  Chest.ts  MysteryBlock.ts  Crate.ts
│  │  ├─ enemies/ Mushroom.ts  SpikeBall.ts  FlyingChicken.ts
│  ├─ systems/
│  │  ├─ SaveManager.ts        # progress, coins, stars, settings
│  │  ├─ AudioManager.ts
│  │  ├─ InputManager.ts       # keyboard + touch
│  │  ├─ ScoreManager.ts
│  │  └─ Analytics.ts
│  └─ ui/
│     ├─ Button.ts  Panel.ts  HeartBar.ts  CoinCounter.ts
├─ assets/
│  ├─ sprites/ (atlas png + json)
│  ├─ tilemaps/ (level1.json ... + tileset.png)
│  ├─ backgrounds/ (parallax layers)
│  ├─ ui/
│  ├─ audio/ (music, sfx)
│  └─ fonts/
├─ package.json  vite.config.ts  tsconfig.json
└─ README.md
```

---

## 4. Phase-Wise Roadmap (Step by Step)

> Estimated total: **6–8 weeks** (part-time, job ke saath). Har phase ke end me ek **playable milestone** hai.

### PHASE 0 — Planning & Setup (Day 1–2)
- [ ] GDD (Game Design Document) final karo — ye file hi base hai
- [ ] GitHub repo banao: `funny-jump`
- [ ] Node 20+ install, `npm create vite@latest funny-jump -- --template vanilla-ts`
- [ ] `npm i phaser`
- [ ] Tiled Map Editor install
- [ ] Trello/Notion board: phases ko tasks me todo
- [ ] Decide: portrait ya **landscape (recommended, images landscape hain 16:9)**
- **Base resolution:** `1280 x 720` with `Phaser.Scale.FIT` + `CENTER_BOTH`

### PHASE 1 — Asset Pipeline (Day 2–7) ⚠️ Sabse Important
Tumhari images **UI mockups/concept art** hain — inhe seedha game me use nahi kar sakte (sab ek flat image me merged hain). Sprites **alag-alag, transparent PNG** chahiye.

**Options (choose one):**
1. **AI generate individually** (Midjourney/Leonardo/Gemini/Higgsfield etc.) — same style prompt: *"cute cartoon platformer coin, thick dark outline, glossy, transparent background"* — har asset alag. Same character ke liye **reference image** use karo for consistency.
2. **Manual cut-out** — images se Photoshop/Photopea/remove.bg se objects kaato (quality limited, resolution low).
3. **Free asset packs** — Kenney.nl, itch.io, OpenGameArt se base lo, style match karo.
4. **Hybrid (best)**: Hero + enemies AI se, tiles/UI Kenney/Figma se.

**Asset checklist**
- [ ] Hero spritesheet: idle(4) run(8) jump(2) fall(2) hurt(2) die(4) win(4) frames
- [ ] Mushroom (walk 6, squash 2), Spikeball (idle/roll 4), Chicken (fly 6)
- [ ] Coin (spin 6), Star (glow 4), Apple, Chest (closed/open), ? block (idle/hit), Crate
- [ ] Tileset: grass-top, dirt, stone, floating platform edges (left/mid/right), slopes (optional)
- [ ] Parallax: sky gradient, clouds, mountains+waterfall, far trees
- [ ] UI: buttons (normal/pressed), panels, ribbon, wooden plank, hearts (full/empty), stars (filled/empty), lock, arrows, icons (trophy, gear, cart, home, retry, pause, skull)
- [ ] Particles: dust puff, coin sparkle, confetti, star burst
- [ ] Pack with **TexturePacker** (free: *free-tex-packer*) → atlas.png + atlas.json

**Audio**
- [ ] BGM: menu loop, gameplay loop, win jingle, lose jingle (Pixabay/Incompetech/Kenney Audio)
- [ ] SFX: jump, coin, star, stomp, hurt, button click, apple, chest, block hit, game over, level complete

**Fonts:** Lilita One / Fredoka (Google Fonts, free) — outline stroke dark brown.

### PHASE 2 — Project Skeleton (Day 7–9)
- [ ] Phaser config + scene flow: `Boot → Preload → MainMenu → LevelSelect → Game(+UI) → GameOver/LevelComplete`
- [ ] Loading bar
- [ ] Responsive scaling (test phone sizes)
- [ ] `SaveManager` basic structure (see Section 6)
- [ ] Global event bus (`this.registry` / `EventEmitter`) — Game ↔ UI communication

**Milestone 1:** Menu → Level Select → empty Game scene → back navigation chal raha hai.

### PHASE 3 — Core Player Mechanics (Day 9–16)
- [ ] Arcade Physics: gravity `y: 1400`
- [ ] Player movement: speed `220 px/s`, accel/decel smooth
- [ ] Jump: velocity `-620`, **variable jump height** (button chhodo → jump cut)
- [ ] **Coyote time** (120 ms) + **Jump buffer** (120 ms) → game feel ka secret
- [ ] Optional: double jump (Store upgrade)
- [ ] Animations state machine: idle ↔ run ↔ jump ↔ fall ↔ hurt ↔ die
- [ ] Dust particles on jump/land (image me dikh raha hai)
- [ ] Camera follow with lerp `0.1`, world bounds, deadzone
- [ ] Input: **Keyboard** (←/→/A/D, Space/↑/W) + **Touch buttons** (images jaise: Left, Right, Jump)
- [ ] Multi-touch support (`input.addPointer(2)`) — left+jump ek saath

**Milestone 2:** Hero ek test map par smoothly chal-kood sakta hai.

### PHASE 4 — Level Building (Day 16–24)
- [ ] Tiled me tileset import, layers: `ground`, `platforms`, `decor`, `objects` (spawn points), `hazards`
- [ ] Object layer types: `player_start`, `coin`, `star`, `apple`, `chest`, `mushroom`, `spike`, `block`, `crate`, `goal_flag`, `checkpoint`
- [ ] Level loader: JSON → tilemap → spawn objects automatically
- [ ] Parallax backgrounds (scrollFactor 0.1 / 0.3 / 0.6)
- [ ] **Level 1 = Tutorial** ("JUMP!" sign, simple jumps, 10 coins, 1 mushroom)
- [ ] Goal: flag / door at end → LevelComplete
- [ ] Fall in pit → lose life

**Milestone 3:** Level 1 fully playable start-to-finish.

### PHASE 5 — Enemies & Hazards (Day 24–30)
| Enemy | Behaviour | Player interaction |
|-------|-----------|--------------------|
| Mushroom | Patrol left-right, turn at edge/wall | Stomp (top) = kill + bounce + 50 pts; side touch = −1 heart |
| Spike ball | Static ya slow roll | Touch = −1 heart; **stomp NOT allowed** |
| Chicken | Sine-wave flying, drops nothing / throws egg (later) | Stomp ya jump-attack |

- [ ] Invincibility frames after hit (1.5 s blink) + knockback
- [ ] Hurt sound + screen shake
- [ ] Health: 3 hearts; 0 hearts → lose 1 life; 0 lives → Game Over
- [ ] Respawn at checkpoint

### PHASE 6 — Collectibles & Blocks (Day 30–34)
- [ ] Coin: +1 coin, +10 score, sparkle + sfx, collect-pitch rising combo
- [ ] Star: per-level 3/5 counter (HUD me "⭐ 3/5") → 3-star rating
- [ ] Apple: +1 heart (max 3)
- [ ] ? Block: head-hit from below → bump animation → spawn coin/apple
- [ ] Chest: touch/press → open anim → 20-50 coins burst
- [ ] Crate: breakable (stomp) ya pushable
- [ ] Moving + falling platforms (Level 8+)

### PHASE 7 — UI & HUD (Day 34–42)
- [ ] **UIScene** parallel overlay: avatar + "x3", hearts, score pill, coin pill, pause button (images jaisa layout)
- [ ] Reusable `Button` class (hover/press scale tween 0.95)
- [ ] **MainMenu**: Play, Levels, Store, Settings, Trophy, Exit (web me Exit hide kar do), floating animation hero, chicken fly-by, coin bob
- [ ] **LevelSelect**: grid 4x2, pagination (3 pages), stars from save, locked = grey + lock, coin balance top-right
- [ ] **Pause**: Resume, Restart, Home, Sound toggle
- [ ] **Game Over**: ribbon, score, best, Home/Retry/Next(Revive for coins)
- [ ] **Level Complete**: 3 stars pop-in sequence (tween), confetti, score count-up, coins, time
- [ ] **Settings**: Music, SFX, Vibration, Controls size, Language (EN/HI), Reset progress
- [ ] Screen transitions (fade/slide)

**Milestone 4:** Poora flow images jaisa dikh raha hai.

### PHASE 8 — Progression, Score & Economy (Day 42–46)
**Scoring**
| Event | Points |
|-------|--------|
| Coin | +10 |
| Star | +200 |
| Enemy stomp | +50 |
| Apple | +30 |
| Chest | +100 |
| Time bonus | `max(0, parTime − time) × 5` |
| No-damage bonus | +300 |

**Star rating (per level)**
- ⭐ 1 star = level complete
- ⭐⭐ 2 stars = score ≥ target1 **ya** star collectibles ≥ 3
- ⭐⭐⭐ 3 stars = score ≥ target2 **aur** all 5 stars collected **ya** no-death

**Unlock:** Level N+1 unlock when Level N ≥ 1 star.
**Coins:** earned in-level → bank (top-right wallet).
**Store items (coin sink):**
| Item | Price (starter) |
|------|-----------------|
| Skin: Blue Controller Boy | 500 |
| Skin: Ninja / Girl / Robot | 800–1500 |
| Extra heart (start with 4) | 1000 |
| Double jump | 1500 |
| Coin magnet (Level) | 600 |
| Revive pack x3 | 300 |

### PHASE 9 — Audio & Juice/Polish (Day 46–52)
- [ ] BGM crossfade between scenes, mute on tab blur
- [ ] SFX on every action
- [ ] Squash & stretch on jump/land, camera shake on hurt/stomp
- [ ] Coin fly-to-HUD animation, score pop-up text (+10)
- [ ] Hit-stop (50 ms freeze) on stomp
- [ ] Idle animations for UI (button pulse, mascot bobbing)
- [ ] Haptic (`navigator.vibrate(30)`) on mobile

### PHASE 10 — Persistence, Backend & Analytics (Day 52–56)
- [ ] localStorage save (versioned)
- [ ] **Supabase** (tumhare account me MCP connected hai): `players`, `scores`, `events` tables
- [ ] Global **Leaderboard** (Trophy button) — top 50
- [ ] **Analytics events** (data science project ban jayega):
  `level_start, level_complete, level_fail, death_position(x,y), time_taken, coins_collected, store_purchase, session_length`
- [ ] Death heatmap + difficulty curve analysis (Python/Pandas, Power BI) → **portfolio me dikhao** 🎯

### PHASE 11 — Testing & Optimization (Day 56–60)
- [ ] Devices: low-end Android, iPhone Safari, desktop Chrome
- [ ] FPS target **60** (min 30 low-end), texture atlas use, object pooling (coins/particles)
- [ ] Playtest 5–10 log, feedback form
- [ ] Bug list: tunneling through platforms, double-collect coin, stuck on edges, multi-touch issues
- [ ] Accessibility: large buttons (min 64px), colour contrast, sound-off playable
- [ ] Balance: Level difficulty curve (Section 7)

### PHASE 12 — Deploy & Launch (Day 60+)
- [ ] `npm run build` → Vercel deploy (`funny-jump.vercel.app`)
- [ ] PWA: manifest + service worker (offline play, "Add to Home Screen") — tumhara PC-Reminder PWA experience yahan kaam aayega
- [ ] Optional: **Capacitor** → Android APK → Play Store (₹ one-time $25 dev fee)
- [ ] Optional: itch.io upload, Poki/CrazyGames submit
- [ ] Portfolio site me add: demo link, GIF, GitHub, tech breakdown, analytics case study
- [ ] Privacy policy page (agar ads/analytics)

---

## 5. Core Config (Starter Constants)

```ts
// src/config/gameConfig.ts
export const GAME = {
  width: 1280, height: 720,
  gravity: 1400,
  player: {
    speed: 220, accel: 1200, drag: 1400,
    jumpVelocity: -620, jumpCutMultiplier: 0.5,
    coyoteMs: 120, jumpBufferMs: 120,
    maxHearts: 3, startLives: 3, invincibleMs: 1500
  },
  enemy: { mushroomSpeed: 60, chickenSpeed: 80, stompBounce: -380 },
  score: { coin: 10, star: 200, stomp: 50, apple: 30, chest: 100 },
  camera: { lerp: 0.1 }
};
```

```ts
// Player jump snippet (concept)
update(time: number) {
  const onGround = this.body.blocked.down;
  if (onGround) this.lastGrounded = time;
  if (jumpPressed) this.lastJumpPressed = time;

  const canCoyote = time - this.lastGrounded < GAME.player.coyoteMs;
  const buffered  = time - this.lastJumpPressed < GAME.player.jumpBufferMs;
  if (canCoyote && buffered) { this.setVelocityY(GAME.player.jumpVelocity); this.lastJumpPressed = 0; }
  if (jumpReleased && this.body.velocity.y < 0) this.body.velocity.y *= GAME.player.jumpCutMultiplier;
}
```

---

## 6. Save Data Schema

```json
{
  "version": 1,
  "player": { "name": "Player", "coins": 2450, "selectedSkin": "red_headband" },
  "unlockedSkins": ["red_headband"],
  "upgrades": { "extraHeart": false, "doubleJump": false },
  "levels": {
    "1": { "unlocked": true,  "stars": 3, "bestScore": 4200, "bestTime": 84 },
    "2": { "unlocked": true,  "stars": 2, "bestScore": 3100, "bestTime": 97 },
    "3": { "unlocked": false, "stars": 0, "bestScore": 0,    "bestTime": 0  }
  },
  "settings": { "music": 0.7, "sfx": 1, "vibration": true, "lang": "en" },
  "stats": { "totalCoins": 12000, "deaths": 41, "playTimeSec": 5400 }
}
```

## 7. Level Design Plan (24 Levels)

| Levels | Theme | New Mechanic | Difficulty |
|--------|-------|--------------|-----------|
| 1–3 | Green Meadow | Run, jump, coins, mushroom (tutorial "JUMP!") | ★☆☆☆☆ |
| 4–6 | Waterfall Valley | Spike balls, floating platforms, ? blocks | ★★☆☆☆ |
| 7–9 | Forest Heights | Moving platforms, chicken flyers, chests | ★★★☆☆ |
| 10–12 | Rocky Mountains | Falling platforms, crates, combos | ★★★☆☆ |
| 13–18 | Mixed / Night variant | Timed sections, multi-enemy | ★★★★☆ |
| 19–24 | Final | Boss (Giant Mushroom/Chicken King), speed run | ★★★★★ |

Rule: har level **60–120 sec**, **~30–60 coins**, **5 stars**, **1 secret area (chest)**. Naya mechanic pehle safe jagah introduce karo, phir difficulty badhao.

## 8. Development Order Summary (Checklist)

1. Setup → 2. Assets → 3. Scenes skeleton → 4. Player → 5. Level 1 → 6. Enemies → 7. Collectibles → 8. HUD/UI → 9. Score/Stars/Unlock → 10. Store → 11. Audio/Juice → 12. Save + Backend → 13. Levels 2–24 → 14. Test → 15. Deploy

## 9. Risks & Warnings ⚠️

| Risk | Solution |
|------|----------|
| Images mockup hain, sprites nahi | Phase 1 me alag-alag transparent assets generate/cut karo, shuru me hi decide karo |
| Character style inconsistent (images me 2 hero look hain: brown hair/red headband vs black hair/blue tee) | **Red headband hero = main**, blue tee = unlockable skin |
| Mobile touch lag | Pointer events, multi-touch, no heavy DOM |
| Scope creep (24 levels + store + backend) | **MVP pehle**: 5 levels + coins + stars. Baaki baad me |
| Copyright: "?" block + mushroom Mario jaisa lag sakta hai | Apna unique design rakho (rename "Mystery Box", mushroom ka alag look) taaki Play Store/portfolio me issue na ho |
| Ads/analytics legal | Privacy policy + consent |

## 10. MVP vs Full Version

**MVP (3 weeks):** Menu, 5 levels, hero, coins, mushroom + spike, HUD, game over, level complete, localStorage, deploy.
**Full (8 weeks):** 24 levels, store/skins, leaderboard, analytics, PWA/APK, polish.

## 11. Career Boost (Senior AI Data Scientist Goal) 🚀

Is project ko **data project** bhi bana do:
- Player telemetry collect → **Supabase**
- **EDA + dashboards** (death heatmaps, drop-off funnel per level, avg completion time)
- ML: **difficulty prediction / churn prediction** (logistic regression, XGBoost), **dynamic difficulty adjustment (DDA)** — AI-driven adaptive game
- Portfolio headline: *"Built a web game + analytics pipeline + ML-based difficulty balancing"* — recruiters ko ye bahut pasand aata hai.

## 12. Learning Resources
- Phaser 3 official examples & docs: phaser.io
- "Making your first Phaser 3 game" tutorial (official)
- Tiled docs: doc.mapeditor.org
- Game feel: *"Juice it or lose it"* (GDC talk), Coyote time articles
- Free assets: kenney.nl, itch.io/game-assets/free, opengameart.org

---

## ✅ Next Step
Bolo to main **Phase 0 + 2** ka ready-to-run starter code (Phaser + Vite project, scenes skeleton, MainMenu, LevelSelect) bana ke de dun.
