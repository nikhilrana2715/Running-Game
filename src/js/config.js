// Core tuning constants (roadmap §5). World units: 1 unit = 1 px at 720p.
export const T = 48;            // tile size
export const ROWS = 15;         // 15 * 48 = 720
export const VIEW_H = ROWS * T; // logical view height

export const GAME = {
  gravity: 1400,
  maxFall: 900,
  player: {
    w: 30, h: 54, drawScale: 0.9,
    speed: 260, accel: 1500, airAccel: 1100, drag: 1700,
    jumpVelocity: -640, jumpCutMultiplier: 0.5, doubleJumpVelocity: -560,
    coyoteMs: 120, jumpBufferMs: 130,
    maxHearts: 3, startLives: 3, invincibleMs: 1500,
    knockbackX: 260, knockbackY: -380,
  },
  enemy: { mushroomSpeed: 60, chickenSpeed: 80, stompBounce: -420 },
  score: { coin: 10, star: 200, stomp: 50, apple: 30, chest: 100, noDamage: 300, timeBonusPerSec: 5 },
  camera: { lerp: 0.12, lead: 0.34 },
  endless: { startSpeed: 300, maxSpeed: 560, speedGainPerSec: 4 },
  // Web Swing: double-tap jump -> web zips hero forward-up, flings + glides far. Tap again mid-flight = chain.
  web: { charges: 3, maxCharges: 9, doubleTapMs: 320, reachX: 300, reachY: 260, zip: 950, maxTime: 0.55, flingX: 640, flingY: 360,
         glide: 1.5, glideGrav: 0.5, glideFall: 300, airDrag: 110, cooldown: 0.25 },
  // In-run pickups (durations in seconds). Heart pickup = existing apple.
  power: { boots: 7, spring: 8, shield: 12, magnet: 10, bootsMult: 1.45, springMult: 1.25 },
  cycleSec: 75,                 // one full day->night->day loop
  levelsPerPage: 8, pages: 3,
};

export const LEVEL_COUNT = GAME.levelsPerPage * GAME.pages;

// Worlds (roadmap §7). startPhase = where in day/night cycle the level begins (0 = midnight, .5 = noon).
export const WORLDS = [
  { name: 'Green Meadow',     from: 1,  grass: '#7ED321', grassDk: '#4CAF1A', dirt: '#C8742A', dirtDk: '#8B4A1F', hill: '#5DBB2F', tree: 'round', startPhase: 0.36 },
  { name: 'Waterfall Valley', from: 4,  grass: '#5FD06A', grassDk: '#2E9E4B', dirt: '#B9763C', dirtDk: '#7A4520', hill: '#3FAE6E', tree: 'round', startPhase: 0.55, waterfall: true },
  { name: 'Forest Heights',   from: 7,  grass: '#8BD43A', grassDk: '#3F8F23', dirt: '#9C6234', dirtDk: '#5F3618', hill: '#2F8F47', tree: 'pine',  startPhase: 0.62 },
  { name: 'Rocky Mountains',  from: 10, grass: '#A6D65A', grassDk: '#6E9B33', dirt: '#8F7F72', dirtDk: '#5A4E45', hill: '#7C8C6A', tree: 'pine',  startPhase: 0.30 },
  { name: 'Twilight Woods',   from: 13, grass: '#59C9A5', grassDk: '#2A8A73', dirt: '#7C5A9E', dirtDk: '#4A2F66', hill: '#3F7F8F', tree: 'round', startPhase: 0.82 },
  { name: 'Sunset Peaks',     from: 19, grass: '#F2B94B', grassDk: '#C27A1F', dirt: '#B5523B', dirtDk: '#73291B', hill: '#C46A4A', tree: 'pine',  startPhase: 0.70 },
];
export const worldFor = (lvl) => { let w = WORLDS[0]; for (const x of WORLDS) if (lvl >= x.from) w = x; return w; };

// Store catalog (roadmap §8).
export const SKINS = {
  red:   { name: 'Headband Hero',  price: 0,    hair: '#7A4A22', hood: '#FFFFFF', hoodDk: '#D9DEE8', band: '#E53935', shoe: '#E53935', pants: '#3B5BA9', skin: '#FFD2A6' },
  blue:  { name: 'Controller Kid', price: 500,  hair: '#1E1E28', hood: '#2F80ED', hoodDk: '#1B5FBF', band: null,      shoe: '#FFFFFF', pants: '#2B2B3A', skin: '#F6C79C', badge: 'pad' },
  ninja: { name: 'Night Ninja',    price: 800,  hair: '#14141C', hood: '#2A2A3A', hoodDk: '#17171F', band: '#8E44D8', shoe: '#14141C', pants: '#1D1D29', skin: '#F2C08F', mask: true },
  pink:  { name: 'Bubble Girl',    price: 1000, hair: '#FF5FA2', hood: '#FFE3F1', hoodDk: '#F5B6D3', band: '#FFC933', shoe: '#8E44D8', pants: '#5B2A9E', skin: '#FFD9B8', pony: true },
  robo:  { name: 'Robo Runner',    price: 1500, hair: '#9AA7B8', hood: '#C9D3E0', hoodDk: '#8C99AC', band: '#2FD5FF', shoe: '#5B6B80', pants: '#5B6B80', skin: '#DDE6F0', robot: true },
};
export const UPGRADES = {
  extraHeart: { name: 'Extra Heart', desc: 'Start every run with 4 hearts', price: 1000, icon: 'heart' },
  doubleJump: { name: 'Double Jump', desc: 'Jump again in mid-air',        price: 1500, icon: 'wing' },
  magnet:     { name: 'Coin Magnet', desc: 'Nearby coins fly to you',      price: 1200, icon: 'magnet' },
  swift:      { name: 'Swift Feet',  desc: 'Run 12% faster, always',      price: 800,  icon: 'swift' },
  springLegs: { name: 'Spring Legs', desc: 'Jump 10% higher, always',      price: 900,  icon: 'spring' },
  webPro:     { name: 'Web Shooter+', desc: '+2 Web Swings every run',     price: 1000, icon: 'web' },
  powerTime:  { name: 'Power Boost', desc: 'Power-ups last 50% longer',    price: 1200, icon: 'bolt' },
  revive:     { name: 'Revive x3',   desc: 'Continue after Game Over',     price: 300,  icon: 'revive', consumable: 3 },
};

// In-run power-up pickups: emoji glyph + bubble colour + spawn weight.
export const POWERUPS = {
  boots:  { icon: '👟', color: '#2FA8F5', label: 'Speed Boots!', w: 3 },
  spring: { icon: '🦘', color: '#7ED321', label: 'Super Jump!',  w: 3 },
  shield: { icon: '🛡️', color: '#8E44D8', label: 'Shield!',      w: 2 },
  magnet: { icon: '🧲', color: '#E53935', label: 'Coin Magnet!', w: 2 },
  web:    { icon: '🕸️', color: '#FFFFFF', label: '+1 Web Swing', w: 3 },
  heart:  { icon: '❤️', color: '#FF8A80', label: '+1 Heart',     w: 2 },
};
