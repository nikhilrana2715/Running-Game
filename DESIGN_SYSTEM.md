# Funny Jump Design System — v1.0

## 1. Product brief
- **Product:** casual cartoon runner/platformer. Screens: Loading, Main Menu, Level Select, Gameplay HUD + controls, Pause, Game Over, Level Complete, Store, Settings, Trophies (10).
- **Users:** office players (Chrome extension popup / tab, keyboard + mouse, 2–5 min sessions); phone players (Android, landscape, thumbs).
- **Key flows:** Menu → Play → Level → Complete → Next; Menu → Endless → Game Over → Retry/Revive; Coins → Store.
- **Pain points to design for:** tiny popup (780×440), thumbs covering the world, readability over a moving day/night sky.

## 2. Audit
New product — no legacy UI. Palette taken from roadmap §1.4 mockups.

## 3. Rules (tokens in `src/css/tokens.css`)
| Group | Tokens |
|---|---|
| Brand | `--c-yellow` primary CTA, `--c-green` go/confirm, `--c-purple` secondary nav, `--c-red` danger/exit, `--c-navy` HUD, `--c-wood` titles, `--c-cream` panels, `--c-lock` disabled, `--c-ink` outlines |
| Theme (morph with `--n`) | `--panel`, `--panel-edge`, `--panel-ink`, `--hud-bg`, `--hud-edge`, `--hud-glow`, `--ctl-bg`, `--ctl-ring`, `--scrim` |
| Type | Display `Lilita One`, body `Fredoka`. Scale 12 / 14 / 18 / 24 / 32 / 48 / 72 |
| Spacing | 4 / 8 / 12 / 16 / 24 / 32 / 48 |
| Radius | 8 / 12 / 20 / 28 / pill |
| Depth | 3px ink outline + solid "press" shadow (`--press`) + soft drop shadow |
| Motion | `--ease-pop` overshoot, 120 / 260 / 600 ms; honours `prefers-reduced-motion` |

Day/night: JS sets `--n` from the sky's night factor each frame (rounded to 0.02); tokens use `color-mix(in oklab, night var(--np), day)`.

## 4. Components (`src/css/app.css`)
- **Button / Yellow · Green · Purple · Red · Navy** — sizes `--sm --md --lg --xl --icon --icon-lg`. Candy gradient, gloss, outlined text, press-down.
- **Pill** (HUD values), **Wallet** (coins + "+" to store)
- **Ribbon / Red · Purple · Green** (modal titles), **Plank** (wooden screen titles)
- **Panel**, **Modal / Card**, **Tabs**, **Seg** (segmented toggle), **Item** (store card), **Level button** (+locked/current), **Stat**, **Achievement**
- **Ctl** (on-screen round controls) + **Ctl / Jump**

## 5. Do / Don't
- Do: one yellow primary per screen (Play, Retry, Next). Don't: two yellow CTAs side by side.
- Do: always outline text that sits on the sky. Don't: plain white text without stroke/shadow.
- Do: use theme tokens for anything that sits on the world. Don't: hardcode `#12294A` in a component.
- Do: controls ≥ 64px (touch). Don't: shrink below `--ctl-size` × 0.8.

## Changelog
- **v1.0 (2026-11-08)** — initial system, day/night token morphing.
