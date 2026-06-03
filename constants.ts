


import { SymbolType, SymbolConfig, Payline, GameConfig, GameTheme, Mission, MissionType, PassReward, RewardType, Deck, Card, CardRarity, MissionFrequency } from './types';

export const SPIN_DURATION = 1000; 
export const REEL_DELAY = 150; 

// --- Visual Styles ---
const REEL_BGS: Record<GameTheme, string> = {
    NEON: 'bg-gradient-to-b from-[#0f0518] via-[#1a0b2e] to-[#0f0518]', 
    EGYPT: 'bg-gradient-to-b from-[#1a0f00] via-[#291500] to-[#1a0f00]', 
    DRAGON: 'bg-gradient-to-b from-[#1a0000] via-[#2b0505] to-[#1a0000]', 
    PIRATE: 'bg-gradient-to-b from-[#081c24] via-[#0e2a35] to-[#081c24]',
    SPACE: 'bg-gradient-to-b from-[#00001a] via-[#0d0d33] to-[#00001a]',
    CANDY: 'bg-gradient-to-b from-[#2e0b1a] via-[#451228] to-[#2e0b1a]',
    JUNGLE: 'bg-gradient-to-b from-[#052e16] via-[#064e3b] to-[#022c22]',
    UNDERWATER: 'bg-gradient-to-b from-[#0c4a6e] via-[#0369a1] to-[#082f49]',
    WESTERN: 'bg-gradient-to-b from-[#451a03] via-[#78350f] to-[#2e1005]',
    SAMURAI: 'bg-gradient-to-b from-[#300505] via-[#500a0a] to-[#1a0000]',
    PIGGY: 'bg-gradient-to-b from-[#500724] via-[#831843] to-[#500724]',
};

// --- Games Configuration ---
export const GAMES_CONFIG: GameConfig[] = [
  {
    id: 'piggy-riches',
    name: 'Piggy Riches',
    theme: 'PIGGY',
    rows: 3,
    reels: 5,
    scattersToTrigger: 3,
    description: 'Break the bank!',
    color: 'from-pink-500 via-rose-500 to-pink-800',
    bgImage: 'radial-gradient(circle at 50% 0%, #f472b6 0%, #831843 100%)',
    reelBg: REEL_BGS.PIGGY
  },
  {
    id: 'neon-vegas',
    name: 'Neon Vegas',
    theme: 'NEON',
    rows: 3,
    reels: 3,
    scattersToTrigger: 3,
    description: 'Classic 3x3 Action.',
    color: 'from-fuchsia-600 via-purple-600 to-indigo-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #7c3aed 0%, #2e1065 100%)',
    reelBg: REEL_BGS.NEON
  },
  {
    id: 'pharaoh-tomb',
    name: 'Pharaoh\'s Tomb',
    theme: 'EGYPT',
    rows: 4, 
    reels: 5,
    scattersToTrigger: 3, 
    description: 'Expanded Grid (5x4). Requires 3 Scatters.',
    color: 'from-yellow-500 via-amber-600 to-orange-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #d97706 0%, #451a03 100%)',
    reelBg: REEL_BGS.EGYPT
  },
  {
    id: 'dragon-fortune',
    name: 'Dragon\'s Fortune',
    theme: 'DRAGON',
    rows: 4,
    reels: 5,
    scattersToTrigger: 4,
    description: 'High Volatility. Needs 4 Scatters!',
    color: 'from-red-500 via-red-700 to-rose-950',
    bgImage: 'radial-gradient(circle at 50% 0%, #ef4444 0%, #450a0a 100%)',
    reelBg: REEL_BGS.DRAGON
  },
  {
    id: 'pirate-bounty',
    name: 'Pirate\'s Bounty',
    theme: 'PIRATE',
    rows: 3,
    reels: 5,
    scattersToTrigger: 3,
    description: 'Sail the seas for lost gold!',
    color: 'from-blue-600 via-blue-800 to-slate-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #0ea5e9 0%, #0f172a 100%)',
    reelBg: REEL_BGS.PIRATE
  },
  {
    id: 'cosmic-cash',
    name: 'Cosmic Cash',
    theme: 'SPACE',
    rows: 5,
    reels: 5,
    scattersToTrigger: 3,
    description: 'Interstellar wins on a 5x5 Grid!',
    color: 'from-indigo-500 via-violet-700 to-purple-950',
    bgImage: 'radial-gradient(circle at 50% 0%, #6366f1 0%, #1e1b4b 100%)',
    reelBg: REEL_BGS.SPACE
  },
  {
    id: 'sugar-rush',
    name: 'Sugar Rush',
    theme: 'CANDY',
    rows: 4,
    reels: 5,
    scattersToTrigger: 3,
    description: 'Sweet treats and tasty payouts!',
    color: 'from-pink-400 via-pink-600 to-rose-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #ec4899 0%, #831843 100%)',
    reelBg: REEL_BGS.CANDY
  },
  {
    id: 'jungle-rumble',
    name: 'Jungle Rumble',
    theme: 'JUNGLE',
    rows: 4,
    reels: 5,
    scattersToTrigger: 3,
    description: 'Wild wins in the deep rainforest.',
    color: 'from-green-600 via-emerald-700 to-green-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #059669 0%, #064e3b 100%)',
    reelBg: REEL_BGS.JUNGLE
  },
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
    reelBg: REEL_BGS.UNDERWATER
  },
  {
    id: 'wild-west',
    name: 'Gold Rush',
    theme: 'WESTERN',
    rows: 4,
    reels: 5,
    scattersToTrigger: 4,
    description: 'Gunslinging action and gold bars.',
    color: 'from-orange-700 via-amber-800 to-yellow-900',
    bgImage: 'radial-gradient(circle at 50% 0%, #b45309 0%, #451a03 100%)',
    reelBg: REEL_BGS.WESTERN
  },
  {
    id: 'samurai-honor',
    name: 'Samurai Honor',
    theme: 'SAMURAI',
    rows: 5,
    reels: 5,
    scattersToTrigger: 4,
    description: 'Sharp blades and sharper wins.',
    color: 'from-red-700 via-red-900 to-black',
    bgImage: 'radial-gradient(circle at 50% 0%, #991b1b 0%, #450a0a 100%)',
    reelBg: REEL_BGS.SAMURAI
  }
];

// --- Themed Symbol Maps ---
const SYMBOL_MAP: Record<GameTheme, Record<SymbolType, string>> = {
  NEON: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '🍒', [SymbolType.BELL]: '🍋', [SymbolType.BAR]: '💎', [SymbolType.CHERRY]: '7️⃣', [SymbolType.SEVEN]: '💸',
    [SymbolType.WILD]: 'WILD', [SymbolType.SCATTER]: '🎰'
  },
  EGYPT: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '🪲', [SymbolType.BELL]: '🪬', [SymbolType.BAR]: '⚖️', [SymbolType.CHERRY]: '🐦‍🔥', [SymbolType.SEVEN]: '🐆',
    [SymbolType.WILD]: 'WILD', [SymbolType.SCATTER]: '🗿'
  },
  DRAGON: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '🎋', [SymbolType.BELL]: '👘', [SymbolType.BAR]: '🔮', [SymbolType.CHERRY]: '👺', [SymbolType.SEVEN]: '🐲',
    [SymbolType.WILD]: 'WILD', [SymbolType.SCATTER]: '🌋'
  },
  PIRATE: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '💣', [SymbolType.BELL]: '🧭', [SymbolType.BAR]: '🏴‍☠️', [SymbolType.CHERRY]: '🦜', [SymbolType.SEVEN]: '⚓',
    [SymbolType.WILD]: 'WILD', [SymbolType.SCATTER]: '☠️'
  },
  SPACE: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '☄️', [SymbolType.BELL]: '🛰️', [SymbolType.BAR]: '🪐', [SymbolType.CHERRY]: '👾', [SymbolType.SEVEN]: '🌞',
    [SymbolType.WILD]: 'WILD', [SymbolType.SCATTER]: '🚀'
  },
  CANDY: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '🥝', [SymbolType.BELL]: '🫐', [SymbolType.BAR]: '🍇', [SymbolType.CHERRY]: '🍓', [SymbolType.SEVEN]: '🍭',
    [SymbolType.WILD]: 'WILD', [SymbolType.SCATTER]: '🧁'
  },
  JUNGLE: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '🍌', [SymbolType.BELL]: '🦜', [SymbolType.BAR]: '🐍', [SymbolType.CHERRY]: '🦍', [SymbolType.SEVEN]: '🐆',
    [SymbolType.WILD]: 'WILD', [SymbolType.SCATTER]: '🗿'
  },
  UNDERWATER: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '🐚', [SymbolType.BELL]: '🦞', [SymbolType.BAR]: '🐠', [SymbolType.CHERRY]: '🦈', [SymbolType.SEVEN]: '🔱',
    [SymbolType.WILD]: 'WILD', [SymbolType.SCATTER]: '🐡'
  },
  WESTERN: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '🌵', [SymbolType.BELL]: '👢', [SymbolType.BAR]: '🔫', [SymbolType.CHERRY]: '🤠', [SymbolType.SEVEN]: '💰',
    [SymbolType.WILD]: 'WILD', [SymbolType.SCATTER]: '⭐'
  },
  SAMURAI: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '🏮', [SymbolType.BELL]: '🍶', [SymbolType.BAR]: '⚔️', [SymbolType.CHERRY]: '👹', [SymbolType.SEVEN]: '🏯',
    [SymbolType.WILD]: 'WILD', [SymbolType.SCATTER]: '🌸'
  },
  PIGGY: {
    [SymbolType.TEN]: '10', [SymbolType.JACK]: 'J', [SymbolType.QUEEN]: 'Q', [SymbolType.KING]: 'K', [SymbolType.ACE]: 'A',
    [SymbolType.GRAPE]: '💵', [SymbolType.BELL]: '🔔', [SymbolType.BAR]: '🏦', [SymbolType.CHERRY]: '🔨', [SymbolType.SEVEN]: '🐷',
    [SymbolType.WILD]: 'WILD', [SymbolType.SCATTER]: '💰'
  }
};

const TILE_BGS = {
    TRANSPARENT: '', 
    GREEN: 'bg-gradient-to-b from-emerald-700 to-emerald-900 shadow-[0_4px_0_rgb(6,78,59)]',
    BLUE: 'bg-gradient-to-b from-blue-700 to-blue-900 shadow-[0_4px_0_rgb(30,58,138)]',
    PURPLE: 'bg-gradient-to-b from-purple-700 to-purple-900 shadow-[0_4px_0_rgb(88,28,135)]',
    RED: 'bg-gradient-to-b from-red-700 to-red-900 shadow-[0_4px_0_rgb(127,29,29)]',
    YELLOW: 'bg-gradient-to-b from-yellow-600 to-yellow-800 shadow-[0_4px_0_rgb(161,98,7)]',
    WILD: 'bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-600 shadow-[0_4px_0_rgb(180,83,9)]',
    SCATTER: 'bg-gradient-to-b from-indigo-600 to-indigo-900 shadow-[0_4px_0_rgb(49,46,129)]',
};

const getThemeFont = (theme: GameTheme) => {
    switch(theme) {
        case 'NEON': return 'font-titan'; 
        case 'CANDY': return 'font-luckiest'; 
        case 'SPACE': return 'font-titan'; 
        case 'PIRATE': return 'font-luckiest'; 
        case 'DRAGON': return 'font-titan';
        case 'WESTERN': return 'font-luckiest';
        case 'SAMURAI': return 'font-titan';
        case 'JUNGLE': return 'font-luckiest';
        case 'PIGGY': return 'font-luckiest';
        default: return 'font-titan';
    }
}

export const GET_SYMBOLS = (theme: GameTheme): Record<SymbolType, SymbolConfig> => {
  const icons = SYMBOL_MAP[theme];
  const themeFont = getThemeFont(theme);
  const letterStyle = `text-white font-black drop-shadow-sm ${themeFont}`;
  const letterHighlight = 'bg-white/10 shadow-[0_0_30px_rgba(255,255,255,0.8)] border-white/50';

  return {
    [SymbolType.TEN]:   { type: SymbolType.TEN,   icon: icons.TEN,   value: 0.5, style: letterStyle, bg: TILE_BGS.TRANSPARENT, highlightClass: letterHighlight },
    [SymbolType.JACK]:  { type: SymbolType.JACK,  icon: icons.JACK,  value: 0.75, style: letterStyle, bg: TILE_BGS.TRANSPARENT, highlightClass: letterHighlight },
    [SymbolType.QUEEN]: { type: SymbolType.QUEEN, icon: icons.QUEEN, value: 1, style: letterStyle, bg: TILE_BGS.TRANSPARENT, highlightClass: letterHighlight },
    [SymbolType.KING]:  { type: SymbolType.KING,  icon: icons.KING,  value: 1.5, style: letterStyle, bg: TILE_BGS.TRANSPARENT, highlightClass: letterHighlight },
    [SymbolType.ACE]:   { type: SymbolType.ACE,   icon: icons.ACE,   value: 2, style: letterStyle, bg: TILE_BGS.TRANSPARENT, highlightClass: letterHighlight },
    [SymbolType.GRAPE]:   { type: SymbolType.GRAPE,   icon: icons.GRAPE, value: 2.5,  style: 'text-emerald-100 drop-shadow-md', bg: TILE_BGS.GREEN, highlightClass: 'bg-emerald-600/40 shadow-[0_0_50px_rgba(5,150,105,0.8)] border-emerald-400/50' }, 
    [SymbolType.BELL]:    { type: SymbolType.BELL,    icon: icons.BELL, value: 4.5,  style: 'text-blue-100 drop-shadow-[0_0_5px_#3b82f6]', bg: TILE_BGS.BLUE, highlightClass: 'bg-blue-600/40 shadow-[0_0_50px_rgba(37,99,235,0.8)] border-blue-400/50' }, 
    [SymbolType.BAR]:     { type: SymbolType.BAR,     icon: icons.BAR, value: 7.5,  style: 'text-purple-100 drop-shadow-[0_0_5px_#a855f7]', bg: TILE_BGS.PURPLE, highlightClass: 'bg-purple-600/40 shadow-[0_0_50px_rgba(147,51,234,0.8)] border-purple-400/50' }, 
    [SymbolType.CHERRY]:  { type: SymbolType.CHERRY,  icon: icons.CHERRY, value: 11, style: 'text-red-100 drop-shadow-[0_0_5px_#ef4444]', bg: TILE_BGS.RED, highlightClass: 'bg-red-600/40 shadow-[0_0_50px_rgba(220,38,38,0.8)] border-red-400/50' },
    [SymbolType.SEVEN]:   { type: SymbolType.SEVEN,   icon: icons.SEVEN, value: 15.625, style: 'text-yellow-100 drop-shadow-[0_0_10px_#eab308]', bg: TILE_BGS.YELLOW, highlightClass: 'bg-yellow-600/40 shadow-[0_0_50px_rgba(234,179,8,0.8)] border-yellow-400/50' }, 
    [SymbolType.WILD]:    { type: SymbolType.WILD,    icon: 'WILD', value: 15.625, style: `text-yellow-900 font-black tracking-tighter drop-shadow-[0_1px_0_rgba(255,255,255,0.5)] ${themeFont}`, bg: TILE_BGS.WILD, highlightClass: 'bg-yellow-500/40 shadow-[0_0_50px_rgba(234,179,8,0.9)] border-yellow-400/50' },  
    [SymbolType.SCATTER]: { type: SymbolType.SCATTER, icon: icons.SCATTER, value: 0,   style: 'text-white drop-shadow-[0_0_15px_#3F51B5]', bg: TILE_BGS.SCATTER },
  };
};

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
  { type: SymbolType.SEVEN, weight: 2 },  
  { type: SymbolType.WILD, weight: 0.1 }, 
  { type: SymbolType.SCATTER, weight: 1.5 }, 
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
  { type: SymbolType.SEVEN, weight: 2 },  
  { type: SymbolType.WILD, weight: 0.1 }, 
  { type: SymbolType.SCATTER, weight: 1.5 }, 
];

export const GET_DYNAMIC_WEIGHTS = (isFreeSpin: boolean, spinsWithoutBonus: number) => {
    if (isFreeSpin) return FREE_SPIN_WEIGHTS;
    return WEIGHTS;
};

export const GET_PAYLINES = (rowCount: number, colCount: number = 5): Payline[] => {
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
    return lines;
};

export const INITIAL_BALANCE = 100000;
export const INITIAL_GEMS = 500; 
export const BASE_XP_PER_SPIN = 1000; 
export const XP_BASE_REQ = 2000;
export const AUTO_SPIN_DELAY = 1500;
export const PICKS_COST_IN_CREDITS = 5; 

const GENERATE_SCALES = () => {
    const bets: number[] = [];
    const steps = 30; 
    const minBet = 10000; 
    const maxBet = 1500000000000; 
    const logMin = Math.log(minBet);
    const logMax = Math.log(maxBet);
    const scaleFactor = (logMax - logMin) / (steps - 1);

    for (let i = 0; i < steps; i++) {
        const rawValue = Math.exp(logMin + (i * scaleFactor));
        let rounded = rawValue;
        if (rawValue > 100000000000) rounded = Math.round(rawValue / 100000000000) * 100000000000; 
        else if (rawValue > 1000000000) rounded = Math.round(rawValue / 1000000000) * 1000000000; 
        else if (rawValue > 1000000) rounded = Math.round(rawValue / 1000000) * 1000000; 
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
    // Doubled max bet relative to level compared to previous
    const index = Math.min(Math.floor(level), SCALES.length - 1);
    return SCALES[index];
};

export const CALCULATE_TIME_BONUS = (level: number): number => {
    // 50,000 * Level as base reward
    // More aggressive scaling
    return Math.max(50000, 100000 * Math.pow(level, 1.1));
};

export const SCALE_COIN_REWARD = (base: number, level: number): number => {
    return Math.floor(base * (1 + (level * 0.1)));
};

export const formatNumber = (num: number): string => {
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(1).replace(/\.0$/, '') + 'T';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
};

export const formatCommaNumber = (num: number): string => {
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

// --- Mission & Battle Pass Generators ---
// 5x Rewards for Missions, Extra multiplier for Win/Bet coins
const MISSION_COIN_MULTIPLIER = 5; 

export const GENERATE_REPLACEMENT_MISSION = (level: number, frequency: MissionFrequency): Mission => {
    const multiplier = frequency === 'DAILY' ? Math.max(1, level) : 
                       frequency === 'WEEKLY' ? Math.max(1, level * 5) : 
                       Math.max(1, level * 10);

    let possibleTypes = [MissionType.SPIN_COUNT, MissionType.WIN_COINS, MissionType.BET_COINS, MissionType.BIG_WIN_COUNT];
    if (frequency === 'MONTHLY') possibleTypes = [MissionType.SPIN_COUNT, MissionType.WIN_COINS, MissionType.LEVEL_UP];

    const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
    let base = 500; 
    let desc = "Spin the reels";
    
    switch(type) {
        case MissionType.SPIN_COUNT: 
            base = frequency === 'DAILY' ? 125 : frequency === 'WEEKLY' ? 2500 : 12500;
            desc = "Spin the reels"; 
            break;
        case MissionType.WIN_COINS: 
            base = frequency === 'DAILY' ? 5000000 : frequency === 'WEEKLY' ? 500000000 : 5000000000;
            desc = "Win total coins"; 
            break;
        case MissionType.BET_COINS: 
            base = 10000000; 
            desc = "Bet total coins"; 
            break;
        case MissionType.BIG_WIN_COUNT: 
            base = frequency === 'DAILY' ? 10 : 200;
            desc = "Hit Big Wins"; 
            break;
        case MissionType.LEVEL_UP: 
            base = 50; 
            desc = "Level Up"; 
            break;
    }

    let target = base;
    if (type === MissionType.WIN_COINS || type === MissionType.BET_COINS) {
            // Reduced to 2.5x (1/4 of previous 10x)
            target = Math.floor(base * multiplier * 2.5);
            if (frequency === 'MONTHLY') target *= 10; 
    } else if (type === MissionType.SPIN_COUNT && frequency === 'DAILY') {
            target = base + (level * 5); 
    }
    
    const scale = 1 + (Math.random() * 1.5);
    target = Math.ceil(target * scale);

    const baseXP = frequency === 'DAILY' ? 30 : frequency === 'WEEKLY' ? 1500 : 8000;
    const xpReward = Math.floor(baseXP * (1 + (level * 0.02)) * scale);
    
    // 1 Million Coins per 10 XP
    const coinReward = Math.floor((xpReward / 10) * 1000000);

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

export const GENERATE_DAILY_MISSIONS = (playerLevel: number): Mission[] => {
    const multiplier = Math.max(1, playerLevel); 
    const missions: Mission[] = [];
    
    const templates = [
        { type: MissionType.SPIN_COUNT, base: 125, desc: "Spin the reels" },
        { type: MissionType.WIN_COINS, base: 5000000, desc: "Win total coins" },
        { type: MissionType.BET_COINS, base: 10000000, desc: "Bet total coins" },
        { type: MissionType.BIG_WIN_COUNT, base: 10, desc: "Hit Big Wins" },
    ];

    // 10 per day
    for (let i = 0; i < 10; i++) {
        const t = templates[i % templates.length];
        const scale = 1 + (Math.floor(i / 4) * 0.5); 

        let target = t.base;
        if (t.type === MissionType.WIN_COINS || t.type === MissionType.BET_COINS) {
             // Reduced to 2.5x (1/4 of previous 10x)
             target = Math.floor(t.base * multiplier * scale * 2.5);
        } else if (t.type === MissionType.SPIN_COUNT) {
             target = (t.base + (playerLevel * 5)) * scale; 
        } else {
             target = Math.ceil(t.base * scale);
        }
        
        const xpReward = 30 + (i * 15);
        // 1m per 10 xp
        const coinReward = Math.floor((xpReward / 10) * 1000000);
        
        missions.push({
            id: `daily-${Date.now()}-${i}`,
            type: t.type,
            description: `${t.desc} ${formatNumber(target)}${t.type === MissionType.WIN_COINS || t.type === MissionType.BET_COINS ? '' : ' times'}`,
            target: Math.floor(target),
            current: 0,
            xpReward: xpReward, 
            coinReward: coinReward, 
            completed: false,
            claimed: false,
            frequency: 'DAILY'
        });
    }

    return missions;
};

export const GENERATE_WEEKLY_MISSIONS = (playerLevel: number): Mission[] => {
    const missions: Mission[] = [];
    
    // 6 per week
    const templates = [
        { type: MissionType.SPIN_COUNT, base: 2500, desc: "Weekly: Spin the reels" },
        { type: MissionType.WIN_COINS, base: 500000000, desc: "Weekly: Win total coins" },
        { type: MissionType.BIG_WIN_COUNT, base: 200, desc: "Weekly: Hit Big Wins" },
        { type: MissionType.BET_COINS, base: 1000000000, desc: "Weekly: Bet total coins" },
        { type: MissionType.SPIN_COUNT, base: 3000, desc: "Weekly: Spin the reels" },
        { type: MissionType.WIN_COINS, base: 750000000, desc: "Weekly: Win total coins" },
    ];

    templates.forEach((t, i) => {
        let target = t.base;
        if (t.type === MissionType.WIN_COINS || t.type === MissionType.BET_COINS) {
             // Reduced to 2.5x (1/4 of previous 10x)
             target = Math.floor(t.base * Math.max(1, playerLevel / 2) * 2.5);
        }
        
        const xpReward = 1500 + (i * 500);
        const coinReward = Math.floor((xpReward / 10) * 1000000);

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

export const GENERATE_MONTHLY_MISSIONS = (playerLevel: number): Mission[] => {
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
             // Reduced to 2.5x (1/4 of previous 10x)
             target = Math.floor(t.base * 10 * Math.max(1, playerLevel) * 2.5);
        }
        
        const xpReward = 8000 + (i * 2000);
        const coinReward = Math.floor((xpReward / 10) * 1000000);

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

export const GENERATE_PASS_REWARDS = (): PassReward[] => {
    const rewards: PassReward[] = [];
    for (let i = 1; i <= 50; i++) {
        // FREE TIER
        // Pattern: 5 Coins, then 1 Special
        let typeFree: RewardType = 'COINS';
        let valueFree = 100000 * i * 5; 
        let labelFree = formatNumber(valueFree);

        if (i === 40) {
            typeFree = 'XP_BOOST';
            valueFree = 2;
            labelFree = "2x XP";
        } else if (i % 6 === 0) {
            // Special Item every 6th level
            const variant = (i / 6) % 3;
            if (variant === 0) {
                 typeFree = 'DIAMONDS';
                 valueFree = i * 2;
                 labelFree = `${valueFree} 💎`;
            } else if (variant === 1) {
                 typeFree = 'CREDIT_BACK';
                 valueFree = 10;
                 labelFree = "+10 Credits";
            } else {
                 typeFree = 'PICKS';
                 valueFree = 2;
                 labelFree = "+2 Picks";
            }
        }

        rewards.push({
            id: `free-${i}`,
            level: i,
            type: typeFree,
            value: valueFree,
            label: labelFree,
            claimed: false,
            tier: 'FREE'
        });

        // PREMIUM TIER
        let typePrem: RewardType = 'COINS';
        let valuePrem = valueFree * 10; 
        let labelPrem = formatNumber(valuePrem);

        if (i % 20 === 0) {
            // Premium XP Boost every 20 levels (20, 40)
            typePrem = 'XP_BOOST';
            valuePrem = 5; 
            labelPrem = "5x XP";
        } else if (i % 6 === 0) {
            // Special Item matching free tier flow but boosted
            const variant = (i / 6) % 3;
            if (variant === 0) {
                 typePrem = 'DIAMONDS';
                 valuePrem = (i * 2) * 5; 
                 labelPrem = `${valuePrem} 💎`;
            } else if (variant === 1) {
                 typePrem = 'PICKS';
                 valuePrem = 5;
                 labelPrem = "+5 Picks";
            } else {
                 typePrem = 'CREDIT_BACK';
                 valuePrem = 50;
                 labelPrem = "+50 Credits";
            }
        }

        rewards.push({
            id: `prem-${i}`,
            level: i,
            type: typePrem,
            value: valuePrem,
            label: labelPrem,
            claimed: false,
            tier: 'PREMIUM'
        });
    }
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

const determineRarity = (symbol: SymbolType): CardRarity => {
    if ([SymbolType.SCATTER].includes(symbol)) return 'LEGENDARY';
    if ([SymbolType.WILD, SymbolType.SEVEN].includes(symbol)) return 'EPIC';
    if ([SymbolType.BAR, SymbolType.BELL, SymbolType.CHERRY].includes(symbol)) return 'RARE';
    return 'COMMON';
};

const getSymbolDescription = (symbol: SymbolType): string => {
    switch(symbol) {
        case SymbolType.SCATTER: return "Triggers the bonus feature.";
        case SymbolType.WILD: return "Substitutes for other symbols.";
        case SymbolType.SEVEN: return "A classic lucky number.";
        case SymbolType.CHERRY: return "Sweet and valuable.";
        case SymbolType.BAR: return "High value stacked symbol.";
        case SymbolType.BELL: return "Rings in the wins.";
        case SymbolType.GRAPE: return "Juicy rewards.";
        default: return "A standard reel symbol.";
    }
};

export const GENERATE_DECKS = (): Deck[] => {
    return GAMES_CONFIG.map(game => {
        const symbols = SYMBOL_MAP[game.theme];
        const cards: Card[] = Object.values(SymbolType).map(type => {
            const icon = symbols[type];
            if (!icon) return null;
            
            return {
                id: `${game.id}-${type}`,
                symbolType: type,
                name: type.charAt(0) + type.slice(1).toLowerCase(),
                rarity: determineRarity(type),
                count: 0, // Start owned 0
                icon: icon,
                description: getSymbolDescription(type)
            };
        }).filter(c => c !== null) as Card[];

        return {
            gameId: game.id,
            gameName: game.name,
            theme: game.theme,
            cards: cards,
            isCompleted: false,
            rewardClaimed: false
        };
    });
};

export const DAILY_LOGIN_REWARDS = [
    { day: 1, coins: 50000, gems: 0 },
    { day: 2, coins: 100000, gems: 0 },
    { day: 3, coins: 250000, gems: 5 },
    { day: 4, coins: 500000, gems: 0 },
    { day: 5, coins: 1000000, gems: 10 },
    { day: 6, coins: 2500000, gems: 20 },
    { day: 7, coins: 10000000, gems: 50 }
];