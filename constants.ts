


import { SymbolType, SymbolConfig, Payline, GameConfig, GameTheme, Mission, MissionType, PassReward, RewardType, Deck, Card, CardRarity, MissionFrequency } from './types';

export const SPIN_DURATION = 1000; 
export const REEL_DELAY = 150; 

// --- Visual Styles ---
// All reel backgrounds are solid black so themed symbols pop and the
// per-game slot background image (slotBg) frames the reels.
const REEL_BGS: Record<GameTheme, string> = {
    NEON: 'bg-black',
    EGYPT: 'bg-black',
    DRAGON: 'bg-black',
    PIRATE: 'bg-black',
    SPACE: 'bg-black',
    CANDY: 'bg-black',
    JUNGLE: 'bg-black',
    UNDERWATER: 'bg-black',
    WESTERN: 'bg-black',
    SAMURAI: 'bg-black',
    PIGGY: 'bg-black',
    GOLDEN_POT: 'bg-black',
    LEPRECHAUN: 'bg-black',
    ARCTIC: 'bg-black',
    PETS: 'bg-black',
    MMORPG: 'bg-black',
    FARM: 'bg-black',
    BEAST: 'bg-black',
    ANGRYFLOCK: 'bg-black',
    PRINCESS: 'bg-black',
    OLYMPUS: 'bg-black',
    BUFFALO: 'bg-black',
};

// --- Games Configuration ---
// Mystery-Symbol slots — placed inline in GAMES_CONFIG below (not bunched at the end).
const FARM_SLOT: GameConfig = {
    id: 'barnyard-bonanza',
    name: 'Barnyard Bonanza',
    theme: 'FARM',
    rows: 3,
    reels: 5,
    scattersToTrigger: 3,
    description: 'Mystery Symbols! 3 scatters for free spins where mystery tiles all reveal the same symbol.',
    color: 'from-lime-500 via-green-600 to-emerald-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #84cc16 0%, #14532d 100%)',
    reelBg: REEL_BGS.FARM,
    coverImage: '/farm.png',
    slotBg: '/farm_bg.png',
};
const BEAST_SLOT: GameConfig = {
    id: 'beast-rage',
    name: 'Beast Rage',
    theme: 'BEAST',
    rows: 3,
    reels: 5,
    scattersToTrigger: 3,
    description: 'Rage Wilds! 3 scatters for 10 free spins with a roulette-picked wild multiplier.',
    color: 'from-amber-600 via-orange-800 to-stone-950',
    bgImage: 'radial-gradient(circle at 50% 0%, #d97706 0%, #1c1917 100%)',
    reelBg: REEL_BGS.BEAST,
    coverImage: '/beast.png',
    slotBg: '/beast_bg.png',
};
const ANGRYFLOCK_SLOT: GameConfig = {
    id: 'angry-flock',
    name: 'Angry Flock',
    theme: 'ANGRYFLOCK',
    rows: 3,
    reels: 5,
    scattersToTrigger: 3,
    description: 'Mystery Symbols! 3 scatters for free spins where mystery tiles all reveal the same symbol.',
    color: 'from-red-500 via-rose-600 to-red-950',
    bgImage: 'radial-gradient(circle at 50% 0%, #ef4444 0%, #450a0a 100%)',
    reelBg: REEL_BGS.ANGRYFLOCK,
    coverImage: '/angryflock.png',
    slotBg: '/angryflock_bg.png',
};
const PRINCESS_SLOT: GameConfig = {
    id: 'princess-realm',
    name: 'Princess Realm',
    theme: 'PRINCESS',
    rows: 3,
    reels: 5,
    scattersToTrigger: 3,
    description: 'Mystery Symbols! 3 scatters for free spins where mystery tiles all reveal the same symbol.',
    color: 'from-fuchsia-400 via-pink-500 to-purple-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #e879f9 0%, #4a044e 100%)',
    reelBg: REEL_BGS.PRINCESS,
    coverImage: '/princess.png',
    slotBg: '/princess_bg.png',
};

// Lobby display order (explicit per product request): Piggy, Arctic, Sugar Rush, Pharaoh,
// Buffalo, Barnyard, Jungle, Pirate, Neon, Oxgoldpower, Zeus (Olympus), then the rest.
export const GAMES_CONFIG: GameConfig[] = [
  {
    id: 'piggy-riches',
    name: 'Piggy Riches',
    theme: 'PIGGY',
    rows: 3,
    reels: 6,
    scattersToTrigger: 999,
    description: 'Break the bank!',
    color: 'from-pink-500 via-rose-500 to-pink-800',
    bgImage: 'radial-gradient(circle at 50% 0%, #f472b6 0%, #831843 100%)',
    reelBg: REEL_BGS.PIGGY,
    slotBg: '/slots/piggy_bg.jpg',
    coverImage: '/newicon_piggy.png',
  },
  {
    id: 'arctic-freeze',
    name: 'Arctic Freeze',
    theme: 'ARCTIC',
    rows: 3,
    reels: 5,
    scattersToTrigger: 3,
    description: 'Cascading Reels! Wins explode and new symbols fall. 3 snowflakes for free spins!',
    color: 'from-cyan-400 via-sky-600 to-indigo-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #22d3ee 0%, #1e3a8a 100%)',
    reelBg: REEL_BGS.ARCTIC,
    slotBg: '/slots/arctic_bg.jpg',
    coverImage: '/slots/artic_covernew.png',
  },
  {
    id: 'sugar-rush',
    name: 'Sugar Rush',
    theme: 'CANDY',
    rows: 3,
    reels: 6,
    scattersToTrigger: 3,
    description: 'Wild Wheel free spins with switching wilds on a 3×6 Grid!',
    color: 'from-pink-400 via-pink-600 to-rose-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #ec4899 0%, #831843 100%)',
    reelBg: REEL_BGS.CANDY,
    slotBg: '/slots/candy_bg.png',
    coverImage: '/slots/sugar_covernew.png',
  },
  {
    id: 'pharaoh-tomb',
    name: 'Pharaoh\'s Tomb',
    theme: 'EGYPT',
    rows: 3,
    reels: 6,
    scattersToTrigger: 999,
    description: 'Hold & Win! 6x4 grid. 6+ coins trigger Respins with jackpot tiles!',
    color: 'from-yellow-500 via-amber-600 to-orange-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #d97706 0%, #451a03 100%)',
    reelBg: REEL_BGS.EGYPT,
    slotBg: '/slots/egypt_bg.jpg',
    coverImage: '/newicon_pharaoh.png',
  },
  {
    id: 'buffalo-thunder',
    name: 'Buffalo Thunder',
    theme: 'BUFFALO',
    rows: 3,
    reels: 5,
    scattersToTrigger: 3,
    description: 'Tumbling Reels! Stacked wilds and a climbing multiplier across free spins.',
    color: 'from-amber-600 via-orange-800 to-stone-950',
    bgImage: 'radial-gradient(circle at 50% 0%, #f97316 0%, #451a03 100%)',
    reelBg: REEL_BGS.BUFFALO,
    slotBg: '/buffalo_bg.png',
    coverImage: '/buffalo_cover.png',
  },
  FARM_SLOT,
  {
    id: 'jungle-rumble',
    name: 'Jungle Rumble',
    theme: 'JUNGLE',
    rows: 3,
    reels: 5,
    // Standard 3-scatter threshold — the colossal center symbol, when it's the
    // SCATTER variant, fills all 9 cells of its 3x3 block at once, so it always
    // clears this bar in a single hit; scattersToTrigger only matters here as a
    // consistency guard, matching every other slot in the game.
    scattersToTrigger: 3,
    description: 'Wild wins in the deep rainforest.',
    color: 'from-green-600 via-emerald-700 to-green-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #059669 0%, #064e3b 100%)',
    reelBg: REEL_BGS.JUNGLE,
    slotBg: '/jungle_bg.png',
    coverImage: '/slots/jungle_covernew.png',
  },
  {
    id: 'pirate-bounty',
    name: 'Pirate\'s Bounty',
    theme: 'PIRATE',
    rows: 3,
    reels: 7,
    scattersToTrigger: 3,
    description: 'Sail the seas for lost gold!',
    color: 'from-blue-600 via-blue-800 to-slate-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #0ea5e9 0%, #0f172a 100%)',
    reelBg: REEL_BGS.PIRATE,
    slotBg: '/pirate_bg.png',
    coverImage: '/pirate_cover.png',
  },
  {
    id: 'neon-vegas',
    name: 'Neon Vegas',
    theme: 'NEON',
    rows: 3,
    reels: 3,
    scattersToTrigger: 1,
    description: 'Scatter Roulette! Land the 💎 gem on reel 3 to spin the wheel!',
    color: 'from-fuchsia-600 via-purple-600 to-indigo-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #7c3aed 0%, #2e1065 100%)',
    reelBg: REEL_BGS.NEON,
    coverImage: '/newicon_neon.png',
  },
  {
    id: 'dragon-fortune',
    name: 'Oxgoldpower',
    theme: 'DRAGON',
    rows: 3,
    reels: 5,
    scattersToTrigger: 4,
    description: 'High Volatility. Needs 4 Scatters!',
    color: 'from-red-500 via-red-700 to-rose-950',
    bgImage: 'radial-gradient(circle at 50% 0%, #ef4444 0%, #450a0a 100%)',
    reelBg: REEL_BGS.DRAGON,
    slotBg: '/slots/dragon_bg.jpg',
    coverImage: '/newicon_dragon.png',
  },
  {
    id: 'olympus-ascend',
    name: 'Olympus Ascend',
    theme: 'OLYMPUS',
    rows: 4,
    reels: 6,
    scattersToTrigger: 3,
    description: 'Scatter Pays! 8+ matching symbols anywhere on the grid pays — no lines. Multiplier orbs sum together on every win.',
    color: 'from-sky-400 via-indigo-600 to-purple-950',
    bgImage: 'radial-gradient(circle at 50% 0%, #818cf8 0%, #2e1065 100%)',
    reelBg: REEL_BGS.OLYMPUS,
    slotBg: '/zeus_bg.png',
    coverImage: '/Zeus_cover.png',
  },
  BEAST_SLOT,
  {
    id: 'cosmic-cash',
    name: 'Cosmic Cash',
    theme: 'SPACE',
    rows: 3,
    reels: 6,
    scattersToTrigger: 3,
    description: 'Interstellar wins on a 3×6 Grid!',
    color: 'from-indigo-500 via-violet-700 to-purple-950',
    bgImage: 'radial-gradient(circle at 50% 0%, #6366f1 0%, #1e1b4b 100%)',
    reelBg: REEL_BGS.SPACE,
    slotBg: '/cosmic_bg.png',
    coverImage: '/cosmic_cover.png',
  },
  ANGRYFLOCK_SLOT,
  {
    id: 'deep-blue',
    name: 'Deep Blue',
    theme: 'UNDERWATER',
    rows: 3,
    reels: 5,
    scattersToTrigger: 3,
    description: 'Dive deep for sunken treasures.',
    color: 'from-cyan-500 via-blue-600 to-blue-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #0ea5e9 0%, #1e3a8a 100%)',
    reelBg: REEL_BGS.UNDERWATER,
    slotBg: '/deep_bg.png',
    coverImage: '/deep_cover.png',
  },
  {
    id: 'wild-west',
    name: 'Gold Rush',
    theme: 'WESTERN',
    rows: 3,
    reels: 5,
    scattersToTrigger: 4,
    description: 'Gunslinging action and gold bars.',
    color: 'from-orange-700 via-amber-800 to-yellow-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #b45309 0%, #451a03 100%)',
    reelBg: REEL_BGS.WESTERN,
    slotBg: '/gold_bg.png',
    coverImage: '/gold_cover.png',
  },
  {
    id: 'samurai-honor',
    name: 'Samurai Honor',
    theme: 'SAMURAI',
    rows: 3,
    reels: 5,
    scattersToTrigger: 3,
    description: 'Katana Wilds! Middle-reel wilds slash their whole reel wild and respin. Free-spin wilds stay locked in place.',
    color: 'from-red-700 via-red-900 to-black',
    bgImage: 'radial-gradient(circle at 50% 0%, #991b1b 0%, #450a0a 100%)',
    reelBg: REEL_BGS.SAMURAI,
    slotBg: '/samurai_bg.png',
    coverImage: '/samurai_cover.png',
  },
  PRINCESS_SLOT,
  {
    id: 'golden-lucky-pot',
    name: 'Golden Lucky Pot',
    theme: 'GOLDEN_POT',
    rows: 3,
    reels: 5,
    scattersToTrigger: 3,
    description: 'Chinese fortune — land 3 pots to trigger free spins!',
    color: 'from-yellow-500 via-amber-700 to-red-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #d97706 0%, #7f1d1d 100%)',
    reelBg: REEL_BGS.GOLDEN_POT,
    slotBg: '/goldenpot_bg.png',
    coverImage: '/slots/golden_covernew.jpg',
  },
  {
    id: 'lucky-leprechaun',
    name: 'Lucky Leprechaun',
    theme: 'LEPRECHAUN',
    rows: 3,
    reels: 6,
    scattersToTrigger: 3,
    description: 'Spin the Lucky Wheel! 3 scatters open the pot-of-gold wild wheel.',
    color: 'from-green-500 via-emerald-600 to-green-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #16a34a 0%, #052e16 100%)',
    reelBg: REEL_BGS.LEPRECHAUN,
    slotBg: '/leprechaun_bg.png',
    coverImage: '/slots/lucky_covernew.png',
  },
  {
    id: 'mystic-pets',
    name: 'Mystic Pets',
    theme: 'PETS',
    rows: 3,
    reels: 6,
    scattersToTrigger: 3,
    description: 'Summon the Companion Wheel! 3 paws spin switching wilds across the reels.',
    color: 'from-violet-500 via-fuchsia-600 to-purple-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #a855f7 0%, #2e1065 100%)',
    reelBg: REEL_BGS.PETS,
    slotBg: '/mystic_bg.png',
    coverImage: '/slots/mystic_covernew.png',
  },
  {
    id: 'dungeon-raid',
    name: 'Dungeon Raid',
    theme: 'MMORPG',
    rows: 3,
    reels: 6,
    scattersToTrigger: 3,
    description: 'Boss Battles! Free-spin wins strike the boss — slay it for bonus spins and a rising raid multiplier.',
    color: 'from-sky-600 via-indigo-800 to-slate-950',
    bgImage: 'radial-gradient(circle at 50% 0%, #0ea5e9 0%, #0f172a 100%)',
    reelBg: REEL_BGS.MMORPG,
    slotBg: '/dungeon_bg.png',
    coverImage: '/slots/fantasy_covernew.jpg',
  },
];

// --- Themed Symbol Maps ---
const JP_ICONS = {
  [SymbolType.JACKPOT_MINI]: '🥉', [SymbolType.JACKPOT_MINOR]: '🥈',
  [SymbolType.JACKPOT_MAJOR]: '🥇', [SymbolType.JACKPOT_MEGA]: '👑', [SymbolType.JACKPOT_GRAND]: '🏆',
  [SymbolType.COIN]: '🪙',
};
const SYMBOL_MAP: Record<GameTheme, Record<SymbolType, string>> = {
  NEON: {
    [SymbolType.TEN]: '/symbols/lemon.png', [SymbolType.JACK]: '/symbols/orange.png', [SymbolType.QUEEN]: '/symbols/grapefruit.png', [SymbolType.KING]: '/symbols/plum.png', [SymbolType.ACE]: '/symbols/watermelon.png',
    [SymbolType.GRAPE]: '/symbols/apple.png', [SymbolType.BELL]: '/symbols/bell.png', [SymbolType.BAR]: '/symbols/bar.png', [SymbolType.CHERRY]: '/symbols/cherry.png', [SymbolType.SEVEN]: '/symbols/seven.png',
    [SymbolType.WILD]: '/symbols/horseshoe.png', [SymbolType.SCATTER]: '/symbols/neon_bonus.png', ...JP_ICONS,
    [SymbolType.JACKPOT_MINI]: '/symbols/heart.png', [SymbolType.COIN]: '/symbols/coin.png',
  },
  EGYPT: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/egypt/grape.png', [SymbolType.BELL]: '/egypt/bell.png', [SymbolType.BAR]: '/egypt/bar.png', [SymbolType.CHERRY]: '/egypt/cherry.png', [SymbolType.SEVEN]: '/egypt/seven.png',
    [SymbolType.WILD]: '/egypt/wild.png', [SymbolType.SCATTER]: '/pharaoh_scatter.png', ...JP_ICONS, [SymbolType.COIN]: '/pharaoh_scatter.png'
  },
  DRAGON: {
    [SymbolType.TEN]: '/dragon/dragon-2.png', [SymbolType.JACK]: '/dragon/dragon-3.png', [SymbolType.QUEEN]: '/dragon/dragon-6.png', [SymbolType.KING]: '/dragon/dragon-5.png', [SymbolType.ACE]: '/dragon/dragon-4.png',
    [SymbolType.GRAPE]: '/dragon/dragon-7.png', [SymbolType.BELL]: '/dragon/dragon-8.png', [SymbolType.BAR]: '/dragon/dragon-9.png', [SymbolType.CHERRY]: '/dragon/dragon-10.png', [SymbolType.SEVEN]: '/dragon_seven.png',
    [SymbolType.WILD]: '/dragon/dragon-11.png', [SymbolType.SCATTER]: '/dragon/dragon-1.png', ...JP_ICONS
  },
  PIRATE: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/pirate_green.png', [SymbolType.BELL]: '/pirate_blue.png', [SymbolType.BAR]: '/pirate_purple.png', [SymbolType.CHERRY]: '/pirate_red.png', [SymbolType.SEVEN]: '/pirate_red.png',
    [SymbolType.WILD]: '/pirate_wild.png', [SymbolType.SCATTER]: '/pirate_scatter.png', ...JP_ICONS
  },
  SPACE: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/cosmic_green.png', [SymbolType.BELL]: '/cosmic_blue.png', [SymbolType.BAR]: '/cosmic_purple.png', [SymbolType.CHERRY]: '/cosmic_red.png', [SymbolType.SEVEN]: '/cosmic_red.png',
    [SymbolType.WILD]: '/cosmic_wild.png', [SymbolType.SCATTER]: '/cosmic_scatter.png', ...JP_ICONS
  },
  CANDY: {
    [SymbolType.TEN]: '/candy/sugar2.png', [SymbolType.JACK]: '/candy/sugar3.png', [SymbolType.QUEEN]: '/candy/sugar4.png', [SymbolType.KING]: '/candy/sugar5.png', [SymbolType.ACE]: '/candy/sugar6.png',
    [SymbolType.GRAPE]: '/candy/sugar7.png', [SymbolType.BELL]: '/candy/sugar8.png', [SymbolType.BAR]: '/candy/sugar9.png', [SymbolType.CHERRY]: '/candy/sugar11.png', [SymbolType.SEVEN]: '/candy/sugar11.png',
    [SymbolType.WILD]: '/sugar_wildnew.png', [SymbolType.SCATTER]: '/candy_scatter.png', ...JP_ICONS
  },
  JUNGLE: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/jungle_green.png', [SymbolType.BELL]: '/jungle_blue.png', [SymbolType.BAR]: '/jungle_purple.png', [SymbolType.CHERRY]: '/jungle_red.png', [SymbolType.SEVEN]: '/jungle_red.png',
    [SymbolType.WILD]: '/jungle_wild.png', [SymbolType.SCATTER]: '/jungle_scatter.png', ...JP_ICONS
  },
  UNDERWATER: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/deep_green.png', [SymbolType.BELL]: '/deep_blue.png', [SymbolType.BAR]: '/deep_purple.png', [SymbolType.CHERRY]: '/deep_red.png', [SymbolType.SEVEN]: '/deep_red.png',
    [SymbolType.WILD]: '/deep_wild.png', [SymbolType.SCATTER]: '/deep_scatter.png', ...JP_ICONS
  },
  WESTERN: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/gold_green.png', [SymbolType.BELL]: '/gold_blue.png', [SymbolType.BAR]: '/gold_purple.png', [SymbolType.CHERRY]: '/gold_red.png', [SymbolType.SEVEN]: '/gold_red.png',
    [SymbolType.WILD]: '/gold_wild.png', [SymbolType.SCATTER]: '/gold_scatter.png', ...JP_ICONS
  },
  SAMURAI: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/samurai_green.png', [SymbolType.BELL]: '/samurai_blue.png', [SymbolType.BAR]: '/samurai_purple.png', [SymbolType.CHERRY]: '/samurai_red.png', [SymbolType.SEVEN]: '/samurai_red.png',
    [SymbolType.WILD]: '/samurai_wild.png', [SymbolType.SCATTER]: '/samurai_scatter.png', ...JP_ICONS, [SymbolType.COIN]: '/samurai_scatter.png'
  },
  PIGGY: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/piggy_green.png', [SymbolType.BELL]: '/piggy_blue.png', [SymbolType.BAR]: '/piggy_purple.png', [SymbolType.CHERRY]: '/piggy_red.png', [SymbolType.SEVEN]: '/piggy_red.png',
    [SymbolType.WILD]: '/piggy_wild.png', [SymbolType.SCATTER]: '/piggy/pig.png', ...JP_ICONS, [SymbolType.COIN]: '/piggy_scatter.png'
  },
  GOLDEN_POT: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/lucky_green.png', [SymbolType.BELL]: '/lucky_blue.png', [SymbolType.BAR]: '/lucky_purple.png', [SymbolType.CHERRY]: '/lucky_red.png', [SymbolType.SEVEN]: '/lucky_red.png',
    [SymbolType.WILD]: '/lucky_wild.png', [SymbolType.SCATTER]: '/goldenpot_scatter.png', ...JP_ICONS
  },
  LEPRECHAUN: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/leprechaun_green.png', [SymbolType.BELL]: '/leprechaun_blue.png', [SymbolType.BAR]: '/leprechaun_purple.png', [SymbolType.CHERRY]: '/leprechaun_red.png', [SymbolType.SEVEN]: '/leprechaun_red.png',
    [SymbolType.WILD]: '/generic_WILD.png', [SymbolType.SCATTER]: '/leprechaun_scatter.png', ...JP_ICONS, [SymbolType.COIN]: '🍀'
  },
  ARCTIC: {
    [SymbolType.TEN]: '/arcticnew_10.png', [SymbolType.JACK]: '/arcticnew_j.png', [SymbolType.QUEEN]: '/arcticnew_q.png', [SymbolType.KING]: '/arcticnew_k.png', [SymbolType.ACE]: '/arcticnew_a.png',
    [SymbolType.GRAPE]: '/arcticnew_green.png', [SymbolType.BELL]: '/arcticnew_blue.png', [SymbolType.BAR]: '/arcticnew_purple.png', [SymbolType.CHERRY]: '/arcticnew_red.png', [SymbolType.SEVEN]: '/arcticnew_red.png',
    [SymbolType.WILD]: '/arcticnew_wild.png', [SymbolType.SCATTER]: '/arcticnew_scatter.png', ...JP_ICONS
  },
  PETS: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/mystic_green.png', [SymbolType.BELL]: '/mystic_blue.png', [SymbolType.BAR]: '/mystic_purple.png', [SymbolType.CHERRY]: '/mystic_red.png', [SymbolType.SEVEN]: '/mystic_red.png',
    [SymbolType.WILD]: '/pets_wild.png', [SymbolType.SCATTER]: '/pets_scatter.png', ...JP_ICONS, [SymbolType.COIN]: '🦴'
  },
  MMORPG: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/fantasy_green.png', [SymbolType.BELL]: '/fantasy_blue.png', [SymbolType.BAR]: '/fantasy_purple.png', [SymbolType.CHERRY]: '/fantasy_red.png', [SymbolType.SEVEN]: '/fantasy_red.png',
    [SymbolType.WILD]: '/fantasy_wild.png', [SymbolType.SCATTER]: '/fantasy_scatter.png', ...JP_ICONS, [SymbolType.COIN]: '/fantasy_scatter.png'
  },
  FARM: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/farm (1).png', [SymbolType.BELL]: '/farm (2).png', [SymbolType.BAR]: '/farm (3).png', [SymbolType.CHERRY]: '/farm (4).png', [SymbolType.SEVEN]: '/farm (4).png',
    [SymbolType.WILD]: '/farm_wild.png', [SymbolType.SCATTER]: '/farm_scatter.png', ...JP_ICONS
  },
  BEAST: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/beast (1).png', [SymbolType.BELL]: '/beast (2).png', [SymbolType.BAR]: '/beast (3).png', [SymbolType.CHERRY]: '/beast (4).png', [SymbolType.SEVEN]: '/beast (4).png',
    [SymbolType.WILD]: '/beast_wild.png', [SymbolType.SCATTER]: '/beast_scatter.png', ...JP_ICONS
  },
  ANGRYFLOCK: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/angryflock (1).png', [SymbolType.BELL]: '/angryflock (2).png', [SymbolType.BAR]: '/angryflock (3).png', [SymbolType.CHERRY]: '/angryflock (4).png', [SymbolType.SEVEN]: '/angryflock (4).png',
    [SymbolType.WILD]: '/angryflock_wild.png', [SymbolType.SCATTER]: '/angryflock_scatter.png', ...JP_ICONS
  },
  PRINCESS: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '/princess (1).png', [SymbolType.BELL]: '/princess (2).png', [SymbolType.BAR]: '/princess (3).png', [SymbolType.CHERRY]: '/princess (4).png', [SymbolType.SEVEN]: '/princess (4).png',
    [SymbolType.WILD]: '/princess_wild.png', [SymbolType.SCATTER]: '/princess_scatter.png', ...JP_ICONS
  },
  OLYMPUS: {
    [SymbolType.TEN]: '/zeus_lowred.png', [SymbolType.JACK]: '/zeus_lowgreen.png', [SymbolType.QUEEN]: '/zeus_lowblue.png', [SymbolType.KING]: '/zeus_lowpurple.png', [SymbolType.ACE]: '/zeus_lowpurple.png',
    [SymbolType.GRAPE]: '/zeus_ring.png', [SymbolType.BELL]: '/zeus_goblet.png', [SymbolType.BAR]: '/zeus_orb.png', [SymbolType.CHERRY]: '/zeus_crown.png', [SymbolType.SEVEN]: '/zeus_crown.png',
    [SymbolType.WILD]: '/zeus_wild.png', [SymbolType.SCATTER]: '/zeus_scatter.png', ...JP_ICONS
  },
  BUFFALO: {
    [SymbolType.TEN]: '/buffalo_lowred.png', [SymbolType.JACK]: '/buffalo_lowgreen.png', [SymbolType.QUEEN]: '/buffalo_lowblue.png', [SymbolType.KING]: '/buffalo_lowpurple.png', [SymbolType.ACE]: '/buffalo_lowpurple.png',
    [SymbolType.GRAPE]: '/buffalo_wolf.png', [SymbolType.BELL]: '/buffalo_eagle.png', [SymbolType.BAR]: '/buffalo_cougar.png', [SymbolType.CHERRY]: '/buffalo_buffalo.png', [SymbolType.SEVEN]: '/buffalo_buffalo.png',
    [SymbolType.WILD]: '/buffalo_wild.png', [SymbolType.SCATTER]: '/buffalo_scatter.png', ...JP_ICONS
  },
};

const TILE_BGS = {
    TRANSPARENT: '',
    GREEN:   'bg-gradient-to-b from-emerald-500 to-emerald-900',
    BLUE:    'bg-gradient-to-b from-blue-500 to-blue-900',
    PURPLE:  'bg-gradient-to-b from-purple-600 to-purple-950',
    RED:     'bg-gradient-to-b from-red-500 to-red-900',
    YELLOW:  'bg-gradient-to-b from-yellow-400 to-amber-800',
    WILD:    'bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-600 shadow-[0_4px_0_rgb(180,83,9)]',
    SCATTER: 'bg-gradient-to-b from-yellow-300 via-amber-400 to-yellow-600',
};

const getThemeFont = (theme: GameTheme) => {
    switch(theme) {
        case 'NEON':       return 'font-neon';
        case 'EGYPT':      return 'font-egypt';
        case 'DRAGON':     return 'font-dragon';
        case 'PIRATE':     return 'font-pirate';
        case 'SPACE':      return 'font-space';
        case 'CANDY':      return 'font-candy';
        case 'JUNGLE':     return 'font-jungle';
        case 'UNDERWATER': return 'font-underwater';
        case 'WESTERN':    return 'font-western';
        case 'SAMURAI':    return 'font-samurai';
        case 'PIGGY':      return 'font-piggy';
        case 'GOLDEN_POT': return 'font-dragon';
        case 'LEPRECHAUN': return 'font-jungle';
        case 'ARCTIC':     return 'font-space';
        default:           return 'font-titan';
    }
}

// Letter (10/J/Q/K/A) image "font" style per theme. Themes whose low symbols
// are already custom images (NEON fruits, DRAGON, CANDY) are intentionally omitted.
const REEL_FONT: Partial<Record<GameTheme, 'beveled' | 'carved' | 'cartoon'>> = {
  EGYPT: 'beveled', PIRATE: 'beveled', JUNGLE: 'beveled', WESTERN: 'beveled', SAMURAI: 'beveled', MMORPG: 'beveled',
  SPACE: 'beveled', UNDERWATER: 'beveled', GOLDEN_POT: 'beveled',
  PIGGY: 'beveled', LEPRECHAUN: 'beveled', PETS: 'beveled',
  FARM: 'beveled', BEAST: 'beveled', ANGRYFLOCK: 'beveled', PRINCESS: 'beveled',
};
const LETTER_FILE: Record<string, string> = {
  [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
};

export const GET_SYMBOLS = (theme: GameTheme): Record<SymbolType, SymbolConfig> => {
  const icons = SYMBOL_MAP[theme];
  const themeFont = getThemeFont(theme);
  const reelFont = REEL_FONT[theme];
  const letterIcon = (t: SymbolType, fallback: string) => reelFont ? `/${reelFont}_${LETTER_FILE[t]}.png` : fallback;

  // Letter/number cells: 3D text effect, transparent bg. Three tiers:
  //  10, J = plain white 3D  |  Q, K = purple 3D  |  A = amber/gold 3D (color-coded)
  const LTR = {
    TEN:   { style: `text-white font-black ${themeFont}`,        bg: TILE_BGS.TRANSPARENT, highlightClass: 'bg-white/20 shadow-[0_0_50px_rgba(255,255,255,0.8)] border-white/50' },
    JACK:  { style: `text-white font-black ${themeFont}`,        bg: TILE_BGS.TRANSPARENT, highlightClass: 'bg-white/20 shadow-[0_0_50px_rgba(255,255,255,0.8)] border-white/50' },
    QUEEN: { style: `text-violet-200 font-black ${themeFont}`,   bg: TILE_BGS.TRANSPARENT, highlightClass: 'bg-violet-500/40 shadow-[0_0_50px_rgba(139,92,246,0.9)] border-violet-300/60' },
    KING:  { style: `text-violet-200 font-black ${themeFont}`,   bg: TILE_BGS.TRANSPARENT, highlightClass: 'bg-violet-500/40 shadow-[0_0_50px_rgba(139,92,246,0.9)] border-violet-300/60' },
    ACE:   { style: `text-yellow-200 font-black ${themeFont}`,   bg: TILE_BGS.TRANSPARENT, highlightClass: 'bg-amber-400/40 shadow-[0_0_50px_rgba(245,158,11,0.9)] border-amber-300/60' },
  };

  const isDragon    = theme === 'DRAGON';
  const isNeon      = theme === 'NEON';
  const isCandy     = theme === 'CANDY';
  const isEgypt     = theme === 'EGYPT';
  const isPirate    = theme === 'PIRATE';
  const isPiggy     = theme === 'PIGGY';
  const isArctic    = theme === 'ARCTIC';
  const isPets      = theme === 'PETS';
  const isSpace     = theme === 'SPACE';
  const isUnderwater = theme === 'UNDERWATER';
  const isWestern   = theme === 'WESTERN';
  const isJungle    = theme === 'JUNGLE';
  const isSamurai   = theme === 'SAMURAI';
  const isLeprechaun = theme === 'LEPRECHAUN';
  const isGoldenPot  = theme === 'GOLDEN_POT';
  const isMmorpg    = theme === 'MMORPG';
  const isMystery   = theme === 'FARM' || theme === 'BEAST' || theme === 'ANGRYFLOCK' || theme === 'PRINCESS';
  const isOlympus   = theme === 'OLYMPUS';
  const isBuffalo   = theme === 'BUFFALO';
  const T = TILE_BGS.TRANSPARENT;
  // Egypt: override letter symbols with golden 3D style
  const egyptLtr = isEgypt ? {
    style: `text-amber-300 font-black ${themeFont}`,
    bg: T,
    highlightClass: 'bg-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.9)] border-amber-300/60',
  } : {};
  // All themes use image symbols now → always transparent tile bg
  const imgTheme = true;
  return {
    [SymbolType.TEN]:   { type: SymbolType.TEN,   icon: letterIcon(SymbolType.TEN, icons.TEN),     value: 0.5,  ...LTR.TEN,  ...egyptLtr, ...(isDragon && { imageScale: 0.85 }), ...((isCandy || isArctic) && { imageScale: 1.3 }), ...((isOlympus || isBuffalo) && { imageScale: 0.92 }), ...(reelFont && { imageScale: isUnderwater ? 0.62 : 0.85 }) },
    [SymbolType.JACK]:  { type: SymbolType.JACK,  icon: letterIcon(SymbolType.JACK, icons.JACK),   value: 0.75, ...LTR.JACK, ...egyptLtr, ...((isCandy || isArctic) && { imageScale: 1.3 }), ...((isOlympus || isBuffalo) && { imageScale: 0.92 }), ...(reelFont && { imageScale: isUnderwater ? 0.62 : 0.85 }) },
    [SymbolType.QUEEN]: { type: SymbolType.QUEEN, icon: letterIcon(SymbolType.QUEEN, icons.QUEEN), value: 1,    ...LTR.QUEEN, ...egyptLtr, ...(isDragon && { imageScale: 0.85 }), ...((isCandy || isArctic) && { imageScale: 1.3 }), ...((isOlympus || isBuffalo) && { imageScale: 0.92 }), ...(reelFont && { imageScale: isUnderwater ? 0.62 : 0.85 }) },
    [SymbolType.KING]:  { type: SymbolType.KING,  icon: letterIcon(SymbolType.KING, icons.KING),   value: 1.5,  ...LTR.KING, ...egyptLtr, ...((isCandy || isArctic) && { imageScale: 1.3 }), ...((isOlympus || isBuffalo) && { imageScale: 0.92 }), ...(reelFont && { imageScale: isUnderwater ? 0.62 : 0.85 }) },
    [SymbolType.ACE]:   { type: SymbolType.ACE,   icon: letterIcon(SymbolType.ACE, icons.ACE),     value: 2,    ...LTR.ACE,  ...egyptLtr, ...((isCandy || isArctic) && { imageScale: 1.3 }), ...((isOlympus || isBuffalo) && { imageScale: 0.92 }), ...(reelFont && { imageScale: isUnderwater ? 0.62 : 0.85 }) },
    [SymbolType.GRAPE]:   { type: SymbolType.GRAPE,   icon: icons.GRAPE, value: 2.5,  style: 'text-emerald-100 drop-shadow-md', bg: T, highlightClass: 'shadow-[0_0_50px_rgba(255,255,255,0.6)] border-white/50', ...(isUnderwater ? { imageScale: 1.7 } : isMystery ? { imageScale: 1.65 } : (isPirate || isArctic || isCandy || isEgypt || isSpace || isJungle || isWestern || isSamurai || isLeprechaun || isGoldenPot || isPets || isMmorpg || isOlympus || isBuffalo) ? { imageScale: 1.45 } : isPiggy ? { imageScale: 1.74 } : {}) },
    [SymbolType.BELL]:    { type: SymbolType.BELL,    icon: icons.BELL, value: 4.5,  style: 'text-blue-100 drop-shadow-[0_0_5px_#3b82f6]', bg: T, highlightClass: 'shadow-[0_0_50px_rgba(255,255,255,0.6)] border-white/50', ...(isUnderwater ? { imageScale: 1.7 } : isMystery ? { imageScale: 1.65 } : (isPirate || isArctic || isCandy || isEgypt || isSpace || isJungle || isWestern || isSamurai || isLeprechaun || isGoldenPot || isPets || isMmorpg || isOlympus || isBuffalo) ? { imageScale: 1.45 } : isPiggy ? { imageScale: 1.74 } : {}) },
    [SymbolType.BAR]:     { type: SymbolType.BAR,     icon: icons.BAR, value: 7.5,  style: 'text-purple-100 drop-shadow-[0_0_5px_#a855f7]', bg: T, highlightClass: 'shadow-[0_0_50px_rgba(255,255,255,0.6)] border-white/50', ...(isUnderwater ? { imageScale: 1.7 } : isMystery ? { imageScale: 1.65 } : (isPirate || isArctic || isCandy || isEgypt || isSpace || isJungle || isWestern || isSamurai || isLeprechaun || isGoldenPot || isPets || isMmorpg || isOlympus || isBuffalo) ? { imageScale: 1.45 } : isPiggy ? { imageScale: 1.74 } : {}) },
    [SymbolType.CHERRY]:  { type: SymbolType.CHERRY,  icon: icons.CHERRY, value: 11, style: 'text-red-100 drop-shadow-[0_0_5px_#ef4444]', bg: T, highlightClass: 'shadow-[0_0_50px_rgba(255,255,255,0.6)] border-white/50', ...(isUnderwater ? { imageScale: 1.7 } : isMystery ? { imageScale: 1.65 } : (isPirate || isArctic || isCandy || isEgypt || isSpace || isJungle || isWestern || isSamurai || isLeprechaun || isGoldenPot || isPets || isMmorpg || isOlympus || isBuffalo) ? { imageScale: 1.45 } : isPiggy ? { imageScale: 1.74 } : {}) },
    [SymbolType.SEVEN]:   { type: SymbolType.SEVEN,   icon: icons.SEVEN, value: 15.625, style: 'text-yellow-100 drop-shadow-[0_0_10px_#eab308]', bg: T, highlightClass: 'shadow-[0_0_50px_rgba(255,255,255,0.6)] border-white/50', ...(isUnderwater ? { imageScale: 1.7 } : isPiggy ? { imageScale: 2.1 } : isMystery ? { imageScale: 1.65 } : (isPirate || isArctic || isCandy || isEgypt || isSpace || isJungle || isWestern || isSamurai || isLeprechaun || isGoldenPot || isPets || isMmorpg || isOlympus || isBuffalo) ? { imageScale: 1.45 } : {}) },
    [SymbolType.WILD]:    { type: SymbolType.WILD,    icon: icons.WILD, value: 15.625, style: `text-yellow-900 font-black tracking-tighter drop-shadow-[0_1px_0_rgba(255,255,255,0.5)] ${themeFont}`, bg: T, highlightClass: 'shadow-[0_0_50px_rgba(255,215,0,0.9)] border-yellow-300/60', ...((isDragon || isEgypt) && { imageScale: 1.2 }), ...((isPirate || isArctic) && { imageScale: 1.3 }), ...(isCandy && { imageScale: 1.45 }), ...(isPiggy && { imageScale: 1.74 }), ...((isWestern || isLeprechaun) && { imageScale: 1.45 }), ...((isJungle || isMmorpg) && { imageScale: 1.6 }), ...((isGoldenPot || isPets) && { imageScale: 1.7 }), ...(isUnderwater && { imageScale: 1.7 }), ...(isMystery && { imageScale: 1.8 }), ...((isOlympus || isBuffalo) && { imageScale: 1.6 }) },
    [SymbolType.SCATTER]: { type: SymbolType.SCATTER, icon: icons.SCATTER, value: 0, style: 'text-white drop-shadow-[0_0_15px_#3F51B5]', bg: T, ...(isNeon && { imageScale: 1.7 }), ...(isDragon && { imageScale: 1.2 }), ...(isJungle ? { imageScale: 3.3 } : isPiggy ? { imageScale: 3.2 } : isGoldenPot ? { imageScale: 1.7 } : isPets ? { imageScale: 1.8 } : isMystery ? { imageScale: 1.95 } : (isPirate || isArctic || isCandy || isEgypt || isSpace || isWestern || isUnderwater || isLeprechaun || isSamurai) ? { imageScale: 1.5 } : isMmorpg ? { imageScale: 1.6 } : (isOlympus || isBuffalo) ? { imageScale: 1.5 } : {}) },
    [SymbolType.JACKPOT_MINI]:  { type: SymbolType.JACKPOT_MINI,  icon: '🥉', value: 0, style: 'drop-shadow-[0_0_12px_rgba(205,127,50,1)]',   bg: 'bg-amber-900/40',  highlightClass: 'bg-amber-600/40  shadow-[0_0_50px_rgba(205,127,50,0.9)]  border-amber-400/50' },
    [SymbolType.JACKPOT_MINOR]: { type: SymbolType.JACKPOT_MINOR, icon: '🥈', value: 0, style: 'drop-shadow-[0_0_12px_rgba(192,192,192,1)]',  bg: 'bg-gray-600/40',   highlightClass: 'bg-gray-400/40   shadow-[0_0_50px_rgba(192,192,192,0.9)] border-gray-300/50' },
    [SymbolType.JACKPOT_MAJOR]: { type: SymbolType.JACKPOT_MAJOR, icon: '🥇', value: 0, style: 'drop-shadow-[0_0_12px_rgba(255,215,0,1)]',    bg: 'bg-yellow-700/40', highlightClass: 'bg-yellow-500/40 shadow-[0_0_50px_rgba(255,215,0,0.9)]   border-yellow-300/50' },
    [SymbolType.JACKPOT_MEGA]:  { type: SymbolType.JACKPOT_MEGA,  icon: '👑', value: 0, style: 'drop-shadow-[0_0_15px_rgba(255,165,0,1)]',    bg: 'bg-orange-700/40', highlightClass: 'bg-orange-500/40 shadow-[0_0_50px_rgba(255,165,0,0.9)]   border-orange-300/50' },
    [SymbolType.JACKPOT_GRAND]: { type: SymbolType.JACKPOT_GRAND, icon: '🏆', value: 0, style: 'drop-shadow-[0_0_20px_rgba(255,50,50,1)]',    bg: 'bg-red-700/40',    highlightClass: 'bg-red-500/40    shadow-[0_0_50px_rgba(255,50,50,0.9)]   border-red-300/50' },
    [SymbolType.COIN]: { type: SymbolType.COIN, icon: icons[SymbolType.COIN] ?? '/symbols/coin.png', value: 3.5, style: 'drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]', bg: (isPiggy || imgTheme) ? TILE_BGS.TRANSPARENT : TILE_BGS.YELLOW, highlightClass: 'bg-yellow-500/40 shadow-[0_0_50px_rgba(234,179,8,0.9)] border-yellow-300/50', ...(isPiggy && { imageScale: 1.92 }), ...(isEgypt && { imageScale: 1.5 }), ...((isSamurai || isMmorpg) && { imageScale: 1.8 }) },
  };
};

// Per-theme icon used as background for jackpot cells (overlaid with color-coded tier text)
export const JACKPOT_ICONS: Partial<Record<GameTheme, string>> = {
  DRAGON: '/dragon-jackpot.png',
  EGYPT:  '/pharaoh_scatter.png',
  PIGGY:  '/piggy/pig.png',
};

// Generic per-tier jackpot icons used for themes without a custom background icon
export const GENERIC_JACKPOT_ICONS: Partial<Record<SymbolType, string>> = {
  [SymbolType.JACKPOT_MINI]:  '/scatter_mini.png',
  [SymbolType.JACKPOT_MINOR]: '/scatter_minor.png',
  [SymbolType.JACKPOT_MAJOR]: '/scatter_major.png',
  [SymbolType.JACKPOT_MEGA]:  '/scatter_mega.png',
  [SymbolType.JACKPOT_GRAND]: '/scatter_grand.png',
};

// Free-spin jackpot cell icons — the same art used on the pick-and-win reveals.
export const FREESPIN_JACKPOT_ICONS: Partial<Record<SymbolType, string>> = {
  [SymbolType.JACKPOT_MINI]:  '/freespinjackpot (1).png',
  [SymbolType.JACKPOT_MINOR]: '/freespinjackpot (2).png',
  [SymbolType.JACKPOT_MAJOR]: '/freespinjackpot (3).png',
  [SymbolType.JACKPOT_MEGA]:  '/freespinjackpot (4).png',
  [SymbolType.JACKPOT_GRAND]: '/freespinjackpot (5).png',
};

// Per-theme jackpot icon overrides (take priority over GENERIC_JACKPOT_ICONS)
export const THEME_JACKPOT_ICONS: Partial<Record<GameTheme, Partial<Record<SymbolType, string>>>> = {
  GOLDEN_POT: {
    [SymbolType.JACKPOT_MINI]:  '/asian_mini.png',
    [SymbolType.JACKPOT_MINOR]: '/asian_minor.png',
    [SymbolType.JACKPOT_MAJOR]: '/asian_major.png',
    [SymbolType.JACKPOT_MEGA]:  '/asian_mega.png',
    [SymbolType.JACKPOT_GRAND]: '/asian_grand.png',
  },
};

// Win / jackpot celebration popup art (rendered by WinPopup, JackpotCelebration, JackpotTicker)
export const WIN_TIER_IMAGES = [
  '/bigwin.png', '/greatwin.png', '/epicwin.png', '/megawin.png', '/ultimatewin.png',
  '/mini.png', '/minor.png', '/major.png', '/mega.png', '/grand.png',
  '/scatter_mini.png', '/scatter_minor.png', '/scatter_major.png', '/scatter_mega.png', '/scatter_grand.png',
  '/freespinjackpot (1).png', '/freespinjackpot (2).png', '/freespinjackpot (3).png', '/freespinjackpot (4).png', '/freespinjackpot (5).png',
  '/topbarjackpot (1).png', '/topbarjackpot (2).png', '/topbarjackpot (3).png', '/topbarjackpot (4).png', '/topbarjackpot (5).png',
];

const isImagePath = (s: unknown): s is string => typeof s === 'string' && s.startsWith('/');

// All image assets a single game needs: its bg + every image symbol + jackpot tile art.
export const getGameAssets = (game: GameConfig): string[] => {
  const set = new Set<string>();
  if (game.slotBg) set.add(game.slotBg);
  // Symbol icons (includes letter-font images, scatter, wild)
  const symbols = GET_SYMBOLS(game.theme);
  Object.values(symbols).forEach(cfg => { if (isImagePath(cfg.icon)) set.add(cfg.icon); });
  // Jackpot tile art (rendered in Reel.tsx, not part of SYMBOL_MAP)
  Object.values(GENERIC_JACKPOT_ICONS).forEach(v => { if (isImagePath(v)) set.add(v); });
  const themeJp = THEME_JACKPOT_ICONS[game.theme];
  if (themeJp) Object.values(themeJp).forEach(v => { if (isImagePath(v)) set.add(v); });
  const jp = JACKPOT_ICONS[game.theme];
  if (isImagePath(jp)) set.add(jp);
  return [...set];
};

// Every lobby cover image (small thumbnails shown in the game grid).
export const ALL_COVER_ASSETS: string[] = [...new Set(
  GAMES_CONFIG.map(g => g.coverImage).filter(isImagePath)
)];

// Every game asset across all themes — used for full background preload.
export const ALL_GAME_ASSETS: string[] = [...new Set([
  ...GAMES_CONFIG.flatMap(getGameAssets),
  ...WIN_TIER_IMAGES,
])];

export const WEIGHTS = [
  { type: SymbolType.TEN, weight: 35 },
  { type: SymbolType.JACK, weight: 30 },
  { type: SymbolType.QUEEN, weight: 30 },
  { type: SymbolType.KING, weight: 25 },
  { type: SymbolType.ACE, weight: 15 },
  { type: SymbolType.GRAPE, weight: 10 },
  { type: SymbolType.BELL, weight: 8 },
  { type: SymbolType.BAR, weight: 5 },
  { type: SymbolType.CHERRY, weight: 3.5 },
  { type: SymbolType.SEVEN, weight: 0 },
  { type: SymbolType.WILD, weight: 0.1 },
  { type: SymbolType.SCATTER, weight: 1.5 },
  { type: SymbolType.COIN, weight: 0 },
];

export const NEON_WEIGHTS = [
  { type: SymbolType.TEN,     weight: 25   },
  { type: SymbolType.JACK,    weight: 20   },
  { type: SymbolType.QUEEN,   weight: 18   },
  { type: SymbolType.KING,    weight: 15   },
  { type: SymbolType.ACE,     weight: 12   },
  { type: SymbolType.GRAPE,   weight: 10   },
  { type: SymbolType.BELL,    weight: 8    },
  { type: SymbolType.BAR,     weight: 6    },
  { type: SymbolType.CHERRY,  weight: 4    },
  { type: SymbolType.SEVEN,   weight: 0    },
  { type: SymbolType.WILD,    weight: 3    },
  { type: SymbolType.SCATTER, weight: 0.0625 },
];

export const FREE_SPIN_WEIGHTS = [
  { type: SymbolType.TEN, weight: 35 },
  { type: SymbolType.JACK, weight: 30 },
  { type: SymbolType.QUEEN, weight: 30 },
  { type: SymbolType.KING, weight: 25 },
  { type: SymbolType.ACE, weight: 15 },
  { type: SymbolType.GRAPE, weight: 10 },
  { type: SymbolType.BELL, weight: 8 },
  { type: SymbolType.BAR, weight: 5 },
  { type: SymbolType.CHERRY, weight: 3.5 },
  { type: SymbolType.SEVEN, weight: 0 },
  { type: SymbolType.WILD, weight: 0.1 },
  { type: SymbolType.SCATTER, weight: 1.5 },
  { type: SymbolType.COIN, weight: 0 },
];

export const GET_DYNAMIC_WEIGHTS = (isFreeSpin: boolean, spinsWithoutBonus: number) => {
    if (isFreeSpin) return FREE_SPIN_WEIGHTS;
    // Every 70 spins without a bonus, scatter chance increases by 20% (resets when free spin triggers)
    const bonusStacks = Math.floor(spinsWithoutBonus / 70);
    if (bonusStacks === 0) return WEIGHTS;
    const scatterMult = 1 + 0.2 * bonusStacks;
    return WEIGHTS.map(w => w.type === SymbolType.SCATTER ? { ...w, weight: w.weight * scatterMult } : w);
};

const PAYLINES_CACHE = new Map<string, Payline[]>();

export const GET_PAYLINES = (rowCount: number, colCount: number = 5): Payline[] => {
    const key = `${rowCount}x${colCount}`;
    if (PAYLINES_CACHE.has(key)) return PAYLINES_CACHE.get(key)!;
    const lines: Payline[] = [];
    const fillArr = (val: number) => Array(colCount).fill(val);
    
    for(let r=0; r<rowCount; r++) {
        lines.push({ id: r+1, indices: fillArr(r), color: '#ef4444' });
    }
    
    // Adjust diagonals for colCount
    if (rowCount >= 3 && colCount >= 3) {
        const v = Math.floor(rowCount / 2);
        const lastRow = rowCount - 1;
        
        // Simple V and Inverted V for 3x3 and others
        if (colCount === 3) {
            lines.push({ id: 100, indices: [0,1,2], color: '#eab308' });
            lines.push({ id: 101, indices: [2,1,0], color: '#a855f7' });
        } else {
            lines.push({ id: 100, indices: [0,1,2,1,0], color: '#eab308' });
            lines.push({ id: 101, indices: [2,1,0,1,2], color: '#a855f7' }); 
        }
    }
    
    if (rowCount >= 4 && colCount >= 5) {
         lines.push({ id: 102, indices: [0,1,2,3,2], color: '#06b6d4' });
         lines.push({ id: 103, indices: [3,2,1,0,1], color: '#ec4899' });
    }
    if (rowCount >= 5 && colCount >= 5) {
         lines.push({ id: 104, indices: [0,2,4,2,0], color: '#10b981' });
         lines.push({ id: 105, indices: [4,2,0,2,4], color: '#f97316' });
    }
    while(lines.length < 50) {
        const indices = Array(colCount).fill(0).map(() => Math.floor(Math.random() * rowCount));
        lines.push({
            id: lines.length + 1,
            indices,
            color: '#' + Math.floor(Math.random()*16777215).toString(16)
        });
    }
    PAYLINES_CACHE.set(key, lines);
    return lines;
};

export const INITIAL_BALANCE = 0;
export const INITIAL_GEMS = 0; 
export const BASE_XP_PER_SPIN = 1000; 
export const XP_BASE_REQ = 2000;
export const AUTO_SPIN_DELAY = 1500;

const GENERATE_SCALES = () => {
    const bets: number[] = [];
    const steps = 40;
    const minBet = 5000;
    const maxBet = 1.5e19; // 15 quintillion (bet scaling halved)
    const logMin = Math.log(minBet);
    const logMax = Math.log(maxBet);
    const scaleFactor = (logMax - logMin) / (steps - 1);

    for (let i = 0; i < steps; i++) {
        const rawValue = Math.exp(logMin + (i * scaleFactor));
        let rounded = rawValue;
        if (rawValue > 1e18) rounded = Math.round(rawValue / 1e18) * 1e18;
        else if (rawValue > 1e15) rounded = Math.round(rawValue / 1e15) * 1e15;
        else if (rawValue > 1e12) rounded = Math.round(rawValue / 1e12) * 1e12;
        else if (rawValue > 1e9) rounded = Math.round(rawValue / 1e9) * 1e9;
        else if (rawValue > 1e6) rounded = Math.round(rawValue / 1e6) * 1e6;
        else if (rawValue > 100000) rounded = Math.round(rawValue / 10000) * 10000;
        else rounded = Math.round(rawValue / 1000) * 1000;
        if (i === steps - 1) rounded = maxBet;
        bets.push(rounded);
    }
    return bets;
};
const SCALES = GENERATE_SCALES();
export const GET_ALL_BETS = () => SCALES;
export const MAX_BET_BY_LEVEL = (level: number): number => {
    const index = Math.min(Math.floor(level * 0.2), SCALES.length - 1);
    return SCALES[index];
};

export const CALCULATE_TIME_BONUS = (level: number): number => {
    // 50,000 * Level as base reward
    // More aggressive scaling
    return Math.max(50000, 100000 * Math.pow(level, 1.1));
};

export const SCALE_COIN_REWARD = (base: number, _level: number, maxBet?: number): number => {
    const factor = maxBet ? maxBet / 10000 : 1;
    return Math.floor(base * factor);
};

export const formatNumber = (num: number): string => {
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(1).replace(/\.0$/, '') + 'T';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
};

export const formatCommaNumber = (num: number): string => {
    if (!isFinite(num) || isNaN(num)) return '0';
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    // Only abbreviate when the full comma string would overflow (~13+ chars = >= 1B)
    if (abs >= 1e18) return sign + (abs / 1e18).toFixed(2).replace(/\.?0+$/, '') + 'Qi';
    if (abs >= 1e15) return sign + (abs / 1e15).toFixed(2).replace(/\.?0+$/, '') + 'Qd';
    if (abs >= 1e12) return sign + (abs / 1e12).toFixed(2).replace(/\.?0+$/, '') + 'T';
    if (abs >= 1e9)  return sign + (abs / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
    return num.toLocaleString('en-US');
};

export const formatWinNumber = (num: number): string => {
    if (num >= 100000) {
        return formatNumber(num);
    }
    return num.toLocaleString('en-US');
};

export const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
};

// Short formatter: abbreviates at 1M+ (6-digit max before suffix)
export const formatKShort = (n: number): string => {
    if (!isFinite(n) || isNaN(n)) return '0';
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs >= 1e18) return sign + (abs / 1e18).toFixed(1).replace(/\.0$/, '') + 'Qi';
    if (abs >= 1e15) return sign + (abs / 1e15).toFixed(1).replace(/\.0$/, '') + 'Qd';
    if (abs >= 1e12) return sign + (abs / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
    if (abs >= 1e9)  return sign + (abs / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (abs >= 1e6)  return sign + (abs / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    return sign + Math.round(abs).toLocaleString('en-US');
};

// Shared "run/cycle" difficulty scaler: rewards get 20% bigger each completed
// run, capped at 200% bigger (3x). Used by the Quest Path cycle and by each
// mini game's own run counter (both reset-and-repeat once their stages are done).
export const questDifficultyMult = (cycleCount: number) => Math.min(3, 1 + Math.max(0, cycleCount) * 0.2);

// RPG Roulette: every 10th stage (10, 20 within the 25-stage cycle) is a boss fight.
export const rpgIsBossStage = (stage: number): boolean => stage % 10 === 0;

// RPG Roulette: enemy HP scales gradually per stage, jumps 4x on boss stages, and
// scales harder again per run cycle (same questDifficultyMult curve as everything else).
export const rpgEnemyMaxHp = (stage: number, run: number): number => {
    const base = 20 * (1 + 0.08 * (stage - 1));
    const bossMult = rpgIsBossStage(stage) ? 4 : 1;
    return Math.round(base * bossMult * questDifficultyMult(run));
};

// Flavor names cycling by stage tier (every 5 stages) — normal enemy vs. its boss form.
export const RPG_ENEMY_NAMES = ['Slime', 'Goblin', 'Wolf', 'Golem', 'Wraith'];
export const RPG_BOSS_NAMES = ['Slime King', 'Goblin Chief', 'Alpha Wolf', 'Golem Titan', 'Wraith Lord'];
export const rpgEnemyName = (stage: number): string => {
    const tier = Math.floor((stage - 1) / 5) % RPG_ENEMY_NAMES.length;
    return rpgIsBossStage(stage) ? RPG_BOSS_NAMES[tier] : RPG_ENEMY_NAMES[tier];
};

// Coin formatter: shows full number with commas up to 15 raw digits.
// At 16+ digits, abbreviates with the smallest unit that keeps the shown number <= 15 digits.
// This maximizes visible digits: e.g. 1,500,000,000,000,000 → "1,500,000,000,000K" not "1.5T".
// maxDigits: show the full comma-separated number until it exceeds this many
// digits, then abbreviate with the smallest unit that fits within maxDigits.
export const formatK = (n: number, maxDigits = 15): string => {
    if (!isFinite(n) || isNaN(n)) return '0';
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';

    const digitCount = (v: number) => v < 1 ? 1 : Math.floor(Math.log10(v)) + 1;

    if (digitCount(abs) <= maxDigits) {
        return sign + Math.round(abs).toLocaleString('en-US');
    }

    const tiers = [
        { div: 1e3,  suffix: 'K'  },
        { div: 1e6,  suffix: 'M'  },
        { div: 1e9,  suffix: 'B'  },
        { div: 1e12, suffix: 'T'  },
        { div: 1e15, suffix: 'Qd' },
        { div: 1e18, suffix: 'Qi' },
        { div: 1e21, suffix: 'Sx' },
        { div: 1e24, suffix: 'Sp' },
        { div: 1e27, suffix: 'Oc' },
        { div: 1e30, suffix: 'No' },
    ];

    for (let i = 0; i < tiers.length; i++) {
        const { div, suffix } = tiers[i];
        if (abs < div) continue;
        const reduced = Math.round(abs / div);
        if (digitCount(reduced) <= maxDigits || i === tiers.length - 1) {
            return sign + reduced.toLocaleString('en-US') + suffix;
        }
    }
    return sign + Math.round(abs).toLocaleString('en-US');
};

// --- Mission & Battle Pass Generators ---
// 5x Rewards for Missions, Extra multiplier for Win/Bet coins
const MISSION_COIN_MULTIPLIER = 5; 

export const GENERATE_REPLACEMENT_MISSION = (level: number, frequency: MissionFrequency, maxBet?: number): Mission => {
    const mb = maxBet && maxBet > 0 ? maxBet : 10000;

    let possibleTypes = [MissionType.SPIN_COUNT, MissionType.WIN_COINS, MissionType.BET_COINS, MissionType.BIG_WIN_COUNT, MissionType.LEVEL_UP, MissionType.MAX_BET_SPIN];
    if (frequency === 'MONTHLY') possibleTypes = [MissionType.SPIN_COUNT, MissionType.WIN_COINS, MissionType.LEVEL_UP];

    const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
    let desc = "Spin the reels";
    let target = 0;

    const scale = 1 + (Math.random() * 1.2);

    switch(type) {
        case MissionType.SPIN_COUNT:
            desc = "Spin the reels";
            target = Math.ceil((frequency === 'DAILY' ? 125 + level * 5 : frequency === 'WEEKLY' ? 2500 : 12500) * scale);
            break;
        case MissionType.WIN_COINS:
            desc = "Win total coins";
            target = Math.ceil(mb * (frequency === 'DAILY' ? 12 : frequency === 'WEEKLY' ? 80 : 350) * scale);
            break;
        case MissionType.BET_COINS:
            desc = "Bet total coins";
            target = Math.ceil(mb * (frequency === 'DAILY' ? 20 : frequency === 'WEEKLY' ? 100 : 500) * scale);
            break;
        case MissionType.BIG_WIN_COUNT:
            desc = "Hit Big Wins";
            target = Math.ceil((frequency === 'DAILY' ? 10 : 200) * scale);
            break;
        case MissionType.LEVEL_UP:
            desc = "Level Up";
            target = Math.ceil(50 * scale);
            break;
        case MissionType.MAX_BET_SPIN:
            desc = "Spin on max bet";
            target = Math.ceil((frequency === 'DAILY' ? 30 : 300) * scale);
            break;
    }

    const baseXP = frequency === 'DAILY' ? 30 : frequency === 'WEEKLY' ? 1500 : 8000;
    const xpReward = Math.floor(baseXP * (1 + (level * 0.02)) * scale);
    const coinReward = Math.floor(mb * (frequency === 'DAILY' ? 5 : frequency === 'WEEKLY' ? 30 : 100) * scale);

    return {
        id: `${frequency.toLowerCase()}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        type: type,
        description: `${desc} ${formatNumber(target)}${type === MissionType.WIN_COINS || type === MissionType.BET_COINS ? '' : ' times'}`,
        target: Math.floor(target),
        current: 0,
        xpReward: xpReward,
        coinReward: coinReward,
        completed: false,
        claimed: false,
        frequency: frequency
    };
};

// 3 daily guild tasks — completing one pays the player coins and adds guild XP.
// Reuses the same event types Daily Missions already tracks (SPIN_COUNT, WIN_COINS,
// BIG_WIN_COUNT) so tracking guild-task progress just piggybacks on updateMissions.
// Each task rewards EITHER guild level XP or guild contribution points (never
// both, picked at random) plus always some coins — refreshing a single task
// rerolls all of this (and can come out bigger or smaller than before).
const GUILD_TASK_TEMPLATES: { type: import('./types').GuildTask['type']; base: number; desc: string }[] = [
    { type: 'SPIN_COUNT',    base: 60, desc: 'Spin the reels' },
    { type: 'WIN_COINS',     base: 8,  desc: 'Win total coins' },
    { type: 'BIG_WIN_COUNT', base: 5,  desc: 'Hit Big Wins' },
];
export const GENERATE_ONE_GUILD_TASK = (playerLevel: number, maxBet: number | undefined, slotIndex: number, refreshCount: number): import('./types').GuildTask => {
    const mb = maxBet && maxBet > 0 ? maxBet : 10000;
    const t = GUILD_TASK_TEMPLATES[slotIndex % GUILD_TASK_TEMPLATES.length];
    // Variance widens slightly with each refresh so re-rolling stays interesting.
    const variance = 0.7 + Math.random() * (0.6 + Math.min(0.4, refreshCount * 0.05));
    const target = t.type === 'SPIN_COUNT' ? Math.round((t.base + playerLevel * 3) * variance)
        : t.type === 'WIN_COINS' ? Math.floor(t.base * mb * variance)
        : Math.max(1, Math.round(t.base * variance));
    const rewardKind: import('./types').GuildTask['rewardKind'] = Math.random() < 0.5 ? 'GUILD_XP' : 'CONTRIBUTION';
    return {
        id: `guild-task-${Date.now()}-${slotIndex}-${refreshCount}-${Math.floor(Math.random() * 1e6)}`,
        type: t.type,
        description: `${t.desc} ${formatNumber(target)}${t.type === 'WIN_COINS' ? '' : ' times'}`,
        target,
        current: 0,
        rewardKind,
        pointsReward: Math.round((40 + slotIndex * 20) * variance),
        coinReward: Math.floor(mb * (2 + slotIndex) * variance),
        completed: false,
        claimed: false,
        refreshCount: 0,
    };
};
export const GENERATE_GUILD_TASKS = (playerLevel: number, maxBet?: number): import('./types').GuildTask[] =>
    GUILD_TASK_TEMPLATES.map((_, i) => GENERATE_ONE_GUILD_TASK(playerLevel, maxBet, i, 0));

export const GENERATE_DAILY_MISSIONS = (playerLevel: number, maxBet?: number): Mission[] => {
    const multiplier = Math.max(1, playerLevel);
    const missions: Mission[] = [];

    const templates = [
        { type: MissionType.SPIN_COUNT, base: 125, desc: "Spin the reels" },
        { type: MissionType.WIN_COINS, base: 5000000, desc: "Win total coins" },
        { type: MissionType.BET_COINS, base: 10000000, desc: "Bet total coins" },
        { type: MissionType.BIG_WIN_COUNT, base: 10, desc: "Hit Big Wins" },
        { type: MissionType.LEVEL_UP, base: 3, desc: "Level Up" },
        { type: MissionType.MAX_BET_SPIN, base: 30, desc: "Spin on max bet" },
    ];

    // Shuffle templates daily using date-based seed for consistent randomization per day
    const today = new Date();
    const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const seededRand = (n: number) => { const x = Math.sin(n * 9301 + dateSeed * 49297 + 233) * 12345; return x - Math.floor(x); };
    const shuffled = [...templates];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(seededRand(i) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 4 per day (first 3 have 2 stacks; 4th is golden with 4× harder req and 5× rewards)
    for (let i = 0; i < 4; i++) {
        const t = shuffled[i % shuffled.length];
        const scale = 1 + (Math.floor(i / 4) * 0.5);

        let target = t.base;
        const mb = maxBet && maxBet > 0 ? maxBet : 10000;
        if (t.type === MissionType.WIN_COINS || t.type === MissionType.BET_COINS) {
            target = mb * 10;
            target = Math.floor(target * scale);
        } else if (t.type === MissionType.SPIN_COUNT) {
             target = (t.base + (playerLevel * 5)) * scale;
        } else if (t.type === MissionType.MAX_BET_SPIN) {
             target = Math.ceil((t.base + playerLevel) * scale);
        } else {
             target = Math.ceil(t.base * scale);
        }

        const isGolden = i === 3;
        // XP decreases by 30% each successive mission; golden 4th gets 5× on top
        const baseXp = Math.floor(60 * Math.pow(0.7, i));
        const xpReward = isGolden ? baseXp * 5 : baseXp;
        // Coin reward: 1 max bet per 20 pass XP earned
        const coinReward = Math.floor((xpReward / 20) * mb);
        const finalTarget = isGolden ? Math.floor(target * 4) : Math.floor(target);

        missions.push({
            id: `daily-${Date.now()}-${i}`,
            type: t.type,
            description: `${t.desc} ${formatNumber(finalTarget)}${t.type === MissionType.WIN_COINS || t.type === MissionType.BET_COINS ? '' : ' times'}`,
            target: finalTarget,
            current: 0,
            xpReward,
            coinReward,
            completed: false,
            claimed: false,
            frequency: 'DAILY',
            ...(isGolden ? { isGolden: true } : { stacks: 2 }),
        });
    }

    return missions;
};

export const REGENERATE_MISSION_STACK = (
    mission: { type: MissionType; xpReward: number; coinReward: number },
    stacksCompleted: number,
    maxBet: number,
    playerLevel: number,
): { type: MissionType; description: string; target: number; xpReward: number; coinReward: number } => {
    const templates = [
        { type: MissionType.SPIN_COUNT,    desc: 'Spin the reels',    base: 125 },
        { type: MissionType.WIN_COINS,     desc: 'Win total coins',   base: 0   },
        { type: MissionType.BET_COINS,     desc: 'Bet total coins',   base: 0   },
        { type: MissionType.BIG_WIN_COUNT, desc: 'Hit Big Wins',      base: 10  },
        { type: MissionType.LEVEL_UP,      desc: 'Level Up',          base: 3   },
        { type: MissionType.MAX_BET_SPIN,  desc: 'Spin on max bet',   base: 30  },
    ];
    const mb = maxBet > 0 ? maxBet : 10000;
    const scale = Math.pow(1.2, stacksCompleted);

    // Pick a different template than the current one
    const currentIdx = templates.findIndex(t => t.type === mission.type);
    const nextIdx = (currentIdx + stacksCompleted) % templates.length;
    const t = templates[nextIdx];

    let target: number;
    if (t.type === MissionType.WIN_COINS || t.type === MissionType.BET_COINS) {
        target = Math.floor(mb * 10 * scale);
    } else if (t.type === MissionType.SPIN_COUNT) {
        target = Math.floor((125 + playerLevel * 5) * scale);
    } else if (t.type === MissionType.MAX_BET_SPIN) {
        target = Math.ceil((30 + playerLevel) * scale);
    } else {
        target = Math.ceil(t.base * scale);
    }

    const isCoinType = t.type === MissionType.WIN_COINS || t.type === MissionType.BET_COINS;
    const newXpReward = Math.floor(mission.xpReward * scale);
    return {
        type: t.type,
        description: `${t.desc} ${formatNumber(target)}${isCoinType ? '' : ' times'}`,
        target,
        xpReward:   newXpReward,
        coinReward: Math.floor((newXpReward / 20) * mb),
    };
};

export const GENERATE_WEEKLY_MISSIONS = (playerLevel: number, maxBet?: number): Mission[] => {
    const missions: Mission[] = [];

    // 6 per week
    const templates = [
        { type: MissionType.SPIN_COUNT, base: 2500, desc: "Weekly: Spin the reels" },
        { type: MissionType.WIN_COINS, base: 500000000, desc: "Weekly: Win total coins" },
        { type: MissionType.BIG_WIN_COUNT, base: 200, desc: "Weekly: Hit Big Wins" },
        { type: MissionType.BET_COINS, base: 1000000000, desc: "Weekly: Bet total coins" },
        { type: MissionType.LEVEL_UP, base: 10, desc: "Weekly: Level Up" },
        { type: MissionType.MAX_BET_SPIN, base: 300, desc: "Weekly: Spin on max bet" },
    ];

    templates.forEach((t, i) => {
        let target = t.base;
        if (t.type === MissionType.WIN_COINS || t.type === MissionType.BET_COINS) {
            const mb = maxBet && maxBet > 0 ? maxBet : 10000;
            target = mb * 70;
        }

        const xpReward = 1500 + (i * 500);
        const mb = maxBet && maxBet > 0 ? maxBet : 10000;
        const coinReward = Math.floor(mb * (30 + i * 8));

        missions.push({
            id: `weekly-${Date.now()}-${i}`,
            type: t.type,
            description: `${t.desc} ${formatNumber(target)}${t.type === MissionType.WIN_COINS || t.type === MissionType.BET_COINS ? '' : ' times'}`,
            target: target,
            current: 0,
            xpReward: xpReward,
            coinReward: coinReward, 
            completed: false,
            claimed: false,
            frequency: 'WEEKLY'
        });
    });
    return missions;
};

export const GENERATE_MONTHLY_MISSIONS = (playerLevel: number, maxBet?: number): Mission[] => {
    const missions: Mission[] = [];

    // 6 per month
    const templates = [
        { type: MissionType.SPIN_COUNT, base: 12500, desc: "Monthly: Spin the reels" },
        { type: MissionType.WIN_COINS, base: 5000000000, desc: "Monthly: Win total coins" },
        { type: MissionType.LEVEL_UP, base: 50, desc: "Monthly: Level Up" },
        { type: MissionType.BET_COINS, base: 10000000000, desc: "Monthly: Bet total coins" },
        { type: MissionType.SPIN_COUNT, base: 20000, desc: "Monthly: Spin the reels" },
        { type: MissionType.BIG_WIN_COUNT, base: 1000, desc: "Monthly: Hit Big Wins" },
    ];

    templates.forEach((t, i) => {
        let target = t.base;
        if (t.type === MissionType.WIN_COINS || t.type === MissionType.BET_COINS) {
            const mb = maxBet && maxBet > 0 ? maxBet : 10000;
            target = mb * 300;
        }

        const xpReward = 8000 + (i * 2000);
        const mb = maxBet && maxBet > 0 ? maxBet : 10000;
        const coinReward = Math.floor(mb * (100 + i * 20));

        missions.push({
            id: `monthly-${Date.now()}-${i}`,
            type: t.type,
            description: `${t.desc} ${formatNumber(target)}${t.type === MissionType.WIN_COINS || t.type === MissionType.BET_COINS ? '' : ' times'}`,
            target: target,
            current: 0,
            xpReward: xpReward,
            coinReward: coinReward, 
            completed: false,
            claimed: false,
            frequency: 'MONTHLY'
        });
    });
    return missions;
};

export const GENERATE_PASS_REWARDS = (maxBet: number = 10000): PassReward[] => {
    const rewards: PassReward[] = [];
    // FREE tier special pattern (cycles): Gems, Mini Game Tokens, Card Packs, XP
    const freeSpecials: { type: RewardType; fn: (i: number) => [number, string] }[] = [
        { type: 'DIAMONDS',     fn: (i) => { const v = i * 4; return [v, `${v} 💎`]; } },
        { type: 'MINI_CREDITS', fn: (_) => [2, '+2 Tokens'] },
        { type: 'CREDIT_BACK',  fn: (_) => [5, '+5 Card Packs'] },
        { type: 'XP_BOOST',     fn: (_) => [2, '2x XP 1h'] },
    ];
    // PREMIUM tier special pattern (cycles): Gems, Mini Game Tokens, Card Packs, XP
    const premSpecials: { type: RewardType; fn: (i: number) => [number, string] }[] = [
        { type: 'DIAMONDS',     fn: (i) => { const v = i * 20; return [v, `${v} 💎`]; } },
        { type: 'MINI_CREDITS', fn: (_) => [6, '+6 Tokens'] },
        { type: 'CREDIT_BACK',  fn: (_) => [2, '+2 Premium Packs'] },
        { type: 'XP_BOOST',     fn: (_) => [2, '2x XP 1h'] },
    ];

    for (let i = 1; i <= 50; i++) {
        // FREE TIER — every 10 levels: gems; odd = coins, even = special
        let typeFree: RewardType;
        let valueFree: number;
        let labelFree: string;
        if (i % 10 === 0) {
            typeFree = 'DIAMONDS'; valueFree = 100; labelFree = '100 💎';
        } else if (i % 2 === 1) {
            const v = Math.round(maxBet * i * 0.6);
            typeFree = 'COINS'; valueFree = v; labelFree = formatNumber(v);
        } else {
            const spec = freeSpecials[1 + ((i / 2 - 1) % (freeSpecials.length - 1))];
            typeFree = spec.type;
            [valueFree, labelFree] = spec.fn(i);
        }

        rewards.push({ id: `free-${i}`, level: i, type: typeFree, value: valueFree, label: labelFree, claimed: false, tier: 'FREE' });

        // PREMIUM TIER — every 10 levels: gems; 1 coin every 3 levels, rest specials
        let typePrem: RewardType;
        let valuePrem: number;
        let labelPrem: string;
        if (i % 10 === 0) {
            typePrem = 'DIAMONDS'; valuePrem = 500; labelPrem = '500 💎';
        } else if (i % 3 === 0) {
            const v = Math.round(maxBet * i * 2);
            typePrem = 'COINS'; valuePrem = v; labelPrem = formatNumber(v);
        } else {
            const spec = premSpecials[1 + ((i - 1) % (premSpecials.length - 1))];
            typePrem = spec.type;
            [valuePrem, labelPrem] = spec.fn(i);
        }

        rewards.push({ id: `prem-${i}`, level: i, type: typePrem, value: valuePrem, label: labelPrem, claimed: false, tier: 'PREMIUM' });
    }

    // Bonus "level 51" mega reward — a Premium-only grand coin prize worth 3× the
    // largest Premium coin reward. Claimable once the pass hits level 50.
    const lastPremCoin = rewards
        .filter(r => r.tier === 'PREMIUM' && r.type === 'COINS')
        .reduce((m, r) => Math.max(m, r.value), 0);
    const megaValue = Math.round(lastPremCoin * 3);
    rewards.push({ id: 'prem-mega', level: 51, type: 'COINS', value: megaValue, label: formatNumber(megaValue), claimed: false, tier: 'PREMIUM' });

    return rewards;
};

// --- Card Collection Generators ---

export const DUPLICATE_CREDIT_VALUES: Record<CardRarity, number> = {
    COMMON: 5,
    RARE: 10,
    EPIC: 50,
    LEGENDARY: 100
};

// Pack Costs in Pack Credits - 1 Card Per Draw
export const PACK_COSTS = {
    BASIC: { creditCost: 1, cardCount: 1 },
    SUPER: { creditCost: 2, cardCount: 1 },
    MEGA: { creditCost: 5, cardCount: 1 },
    ULTRA: { creditCost: 10, cardCount: 1 },
};

// 8 fixed collectible albums, 8 dedicated-art cards each (not tied to any slot's
// own symbols) — art files are named "Album {n} ({card}).png", 1-indexed.
interface AlbumCardDef { name: string; rarity: CardRarity; }
interface AlbumDef { id: string; name: string; cover: string; cards: AlbumCardDef[]; }
const ALBUM_DEFS: AlbumDef[] = [
    { id: 'album-1', name: 'Lucky Beginnings', cover: '/lucky.png', cards: [
        { name: 'Lucky Coin', rarity: 'COMMON' }, { name: 'Cherry', rarity: 'COMMON' }, { name: 'Horseshoe', rarity: 'COMMON' },
        { name: 'Four Leaf Clover', rarity: 'COMMON' }, { name: 'Lucky Dice', rarity: 'COMMON' }, { name: 'Gold Bell', rarity: 'COMMON' },
        { name: 'Lucky Key', rarity: 'COMMON' }, { name: 'Golden Piggy', rarity: 'RARE' },
    ]},
    { id: 'album-2', name: 'Casino Nights', cover: '/casino_nights.png', cards: [
        { name: 'Slot Machine', rarity: 'COMMON' }, { name: 'Poker Chips', rarity: 'COMMON' }, { name: 'Roulette Wheel', rarity: 'COMMON' },
        { name: 'Playing Cards', rarity: 'COMMON' }, { name: 'Cocktail Glass', rarity: 'COMMON' }, { name: 'Diamond Ring', rarity: 'COMMON' },
        { name: 'VIP Lounge', rarity: 'RARE' }, { name: 'Jackpot Bell', rarity: 'RARE' },
    ]},
    { id: 'album-3', name: 'High Roller Life', cover: '/high_roller.png', cards: [
        { name: 'Money Stack', rarity: 'COMMON' }, { name: 'Luxury Watch', rarity: 'COMMON' }, { name: 'Gold Briefcase', rarity: 'COMMON' },
        { name: 'Safe Vault', rarity: 'COMMON' }, { name: 'Champagne Bucket', rarity: 'COMMON' },
        { name: 'Sports Car', rarity: 'RARE' }, { name: 'Penthouse', rarity: 'RARE' }, { name: 'Private Jet', rarity: 'RARE' },
    ]},
    { id: 'album-4', name: 'Animal Fortune', cover: '/animal.png', cards: [
        { name: 'Lucky Cat', rarity: 'COMMON' }, { name: 'Panda', rarity: 'COMMON' }, { name: 'Owl', rarity: 'COMMON' }, { name: 'Fox', rarity: 'COMMON' },
        { name: 'Lion', rarity: 'RARE' }, { name: 'Wolf', rarity: 'RARE' }, { name: 'Eagle', rarity: 'RARE' },
        { name: 'Golden Dragon', rarity: 'EPIC' },
    ]},
    { id: 'album-5', name: 'Around the World', cover: '/around.png', cards: [
        { name: 'Eiffel Tower', rarity: 'COMMON' }, { name: 'Big Ben', rarity: 'COMMON' }, { name: 'Statue of Liberty', rarity: 'COMMON' },
        { name: 'Burj Khalifa', rarity: 'RARE' }, { name: 'Las Vegas Sign', rarity: 'RARE' }, { name: 'Tokyo Gate', rarity: 'RARE' },
        { name: 'Santorini', rarity: 'EPIC' }, { name: 'Northern Lights', rarity: 'EPIC' },
    ]},
    { id: 'album-6', name: 'Ancient Treasures', cover: '/ancient.png', cards: [
        { name: 'Ancient Coin', rarity: 'COMMON' }, { name: 'Stone Idol', rarity: 'COMMON' }, { name: 'Pharaoh Mask', rarity: 'COMMON' },
        { name: 'Aztec Calendar', rarity: 'RARE' }, { name: 'Viking Axe', rarity: 'RARE' },
        { name: 'Crystal Skull', rarity: 'EPIC' }, { name: 'Sun Temple', rarity: 'EPIC' },
        { name: 'Lost Golden City', rarity: 'LEGENDARY' },
    ]},
    { id: 'album-7', name: 'Mythical Legends', cover: '/mythical.png', cards: [
        { name: 'Unicorn', rarity: 'COMMON' }, { name: 'Griffin', rarity: 'COMMON' },
        { name: 'Phoenix', rarity: 'RARE' }, { name: 'Kraken', rarity: 'RARE' }, { name: 'Minotaur', rarity: 'RARE' },
        { name: 'Pegasus', rarity: 'EPIC' }, { name: 'Cerberus', rarity: 'EPIC' },
        { name: 'Zeus', rarity: 'LEGENDARY' },
    ]},
    { id: 'album-8', name: 'Casino Empire', cover: '/casino_empire.png', cards: [
        { name: 'VIP Card', rarity: 'COMMON' },
        { name: 'Diamond Crown', rarity: 'RARE' }, { name: 'Royal Vault', rarity: 'RARE' }, { name: 'Lucky Throne', rarity: 'RARE' },
        { name: 'Million Dollar Chip', rarity: 'EPIC' }, { name: 'Infinite Jackpot', rarity: 'EPIC' }, { name: 'Casino Palace', rarity: 'EPIC' },
        { name: 'King of Fortune', rarity: 'LEGENDARY' },
    ]},
];

// Exposed standalone so App.tsx can preload cover art at app boot without
// building the full deck objects just to read the cover paths.
export const ALBUM_COVER_ASSETS: string[] = ALBUM_DEFS.map(a => a.cover);

export const GENERATE_DECKS = (): Deck[] => ALBUM_DEFS.map((album, albumIdx) => ({
    gameId: album.id,
    gameName: album.name,
    // theme/symbolType below are unused placeholders — every card here has its
    // own dedicated art, none of it derived from a slot's symbol set.
    theme: 'PIGGY',
    coverImage: album.cover,
    cards: album.cards.map((c, cardIdx) => ({
        id: `${album.id}-${cardIdx + 1}`,
        symbolType: SymbolType.SEVEN,
        name: c.name,
        rarity: c.rarity,
        count: 0,
        icon: `/Album ${albumIdx + 1} (${cardIdx + 1}).png`,
        description: `${album.name} collectible.`,
    })),
    isCompleted: false,
    rewardClaimed: false,
    stage: 1,
}));

// Two INDEPENDENT systems on the same screen:
//
// 1) The classic 7-day Daily Login cycle. One reward claimed per day; after Day 7
//    is claimed it loops back to Day 1. Not a streak — claiming any day (even with
//    gaps) just advances to the next day in the cycle.
export const DAILY_LOGIN_TOTAL_DAYS = 7;
export const DAILY_LOGIN_REWARDS = [
    { day: 1, multiplier: 25,  gems: 0   },
    { day: 2, multiplier: 35,  gems: 0   },
    { day: 3, multiplier: 45,  gems: 0   },
    { day: 4, multiplier: 60,  gems: 0   },
    { day: 5, multiplier: 75,  gems: 0   },
    { day: 6, multiplier: 95,  gems: 0   },
    { day: 7, multiplier: 150, gems: 200 },
].map(r => ({ ...r, coins: r.multiplier }));

// 2) A separate 30-day CONSECUTIVE login streak, shown above the 7-day rewards.
// Milestones at days 3/8/15/22/30; missing a single calendar day resets the
// streak to 0. Independent reward table, alternating coins/gems, final
// milestone pays both.
export const LOGIN_STREAK_MILESTONES = [
    { days: 3,  multiplier: 25,     gems: 0   },
    { days: 8,  multiplier: 0,      gems: 100 },
    { days: 15, multiplier: 37.5,   gems: 0   },
    { days: 22, multiplier: 0,      gems: 150 },
    { days: 30, multiplier: 84.375, gems: 200 },
].map(r => ({ ...r, coins: r.multiplier }));