
export enum SymbolType {
  TEN = 'TEN',
  JACK = 'JACK',
  QUEEN = 'QUEEN',
  KING = 'KING',
  ACE = 'ACE',
  GRAPE = 'GRAPE',
  BELL = 'BELL',
  BAR = 'BAR',
  CHERRY = 'CHERRY',
  SEVEN = 'SEVEN',
  WILD = 'WILD',
  SCATTER = 'SCATTER',
  JACKPOT_MINI = 'JACKPOT_MINI',
  JACKPOT_MINOR = 'JACKPOT_MINOR',
  JACKPOT_MAJOR = 'JACKPOT_MAJOR',
  JACKPOT_MEGA = 'JACKPOT_MEGA',
  JACKPOT_GRAND = 'JACKPOT_GRAND',
  COIN = 'COIN',
}

export type GameTheme = 'NEON' | 'EGYPT' | 'DRAGON' | 'PIRATE' | 'SPACE' | 'CANDY' | 'JUNGLE' | 'UNDERWATER' | 'WESTERN' | 'SAMURAI' | 'PIGGY';

export interface SymbolConfig {
  type: SymbolType;
  icon: string; 
  value: number; 
  style: string; 
  bg?: string; 
  highlightClass?: string;
}

export interface GameConfig {
  id: string;
  name: string;
  theme: GameTheme;
  rows: number;
  reels: number;
  scattersToTrigger: number;
  description: string;
  color: string;
  bgImage: string;
  reelBg: string; 
}

export enum GameStatus {
  IDLE = 'IDLE',
  SPINNING = 'SPINNING',
  STOPPING = 'STOPPING',
  WIN_ANIMATION = 'WIN_ANIMATION',
  SCATTER_SHOWCASE = 'SCATTER_SHOWCASE', 
  FREE_SPIN_INTRO = 'FREE_SPIN_INTRO', 
  FREE_SPIN_OUTRO = 'FREE_SPIN_OUTRO'
}

export interface PlayerState {
  balance: number;
  diamonds: number; // Renamed to Gems in UI, keeping var name for stability
  tokens: number; // Renamed from cardCredits
  packCredits: number; // New currency for opening packs
  piggyBank: number; // Accumulated free coins from bets
  level: number;
  xp: number;
  xpToNextLevel: number;
  autoSpin: boolean;
  xpMultiplier: number;
  xpBoostEndTime: number;
  freeStashClaimedTime?: number;  // timestamp of last claim, 0/undefined = never
  isVip?: boolean;
  shopClaimedItems?: string[];
  stats?: {
    maxSingleWin: number;
    maxJackpotWin: number;
    totalCoinsWon: number;
    totalGemsEarned: number;
    totalSpins: number;
    recentSlots: string[]; // game IDs, last 5
  };
}

export interface Payline {
  id: number;
  indices: number[]; 
  color: string;
}

export interface WinData {
  payout: number;
  winningLines: number[]; 
  winningCells: {col: number, row: number}[]; 
  isBigWin: boolean;
  scattersFound: number;
  winType?: string; 
}

export interface WildGridCell {
    revealed: boolean;
    content: 'GEM' | 'REWARD' | 'BLANK';
    reward?: MiniGameReward;
}

export interface QuestState {
  diceCredits: number;
  wildCredits: number;
  wildStage: number; // Separated Stage
  diceStage: number; // Separated Stage
  max: 60;
  dicePosition: number;
  activeGame: 'NONE' | 'WILD' | 'DICE';
  wildGrid: WildGridCell[]; // Persistence for Wild Quest
}

export type RewardType = 'NOTHING' | 'COINS' | 'XP_BOOST' | 'CREDIT_BACK' | 'DIAMONDS' | 'PICKS' | 'GEM' | 'PACKS' | 'BACK';

export interface MiniGameReward {
  type: RewardType;
  value: number;
  label: string;
}

// --- Mission System Types ---

export enum MissionType {
  SPIN_COUNT = 'SPIN_COUNT',
  WIN_COINS = 'WIN_COINS',
  BET_COINS = 'BET_COINS',
  LEVEL_UP = 'LEVEL_UP',
  BIG_WIN_COUNT = 'BIG_WIN_COUNT'
}

export type MissionFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Mission {
  id: string;
  type: MissionType;
  description: string;
  target: number;
  current: number;
  xpReward: number;
  coinReward: number; // New field
  completed: boolean;
  claimed: boolean;
  frequency: MissionFrequency;
}

export interface PassReward {
  id: string;
  level: number;
  type: RewardType;
  value: number;
  label: string;
  claimed: boolean;
  claimedValue?: number; // snapshot of actual coins at claim time — prevents display from re-scaling after collecting
  tier: 'FREE' | 'PREMIUM';
}

export interface MissionState {
  activeMissions: Mission[];
  passLevel: number;
  passXP: number;
  passXpToNext: number;
  passRewards: PassReward[]; 
  isPremium: boolean; 
  premiumExpiry: number; // Timestamp
  passBoostMultiplier: number;
  passBoostEndTime: number;
}

// --- Card Collection Types ---

export type CardRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface Card {
    id: string;
    symbolType: SymbolType;
    name: string;
    rarity: CardRarity;
    count: number;
    icon: string;
    description: string;
    isNew?: boolean;
    isDuplicate?: boolean;
    duplicateCredits?: number;
}

export interface Deck {
    gameId: string;
    gameName: string;
    theme: GameTheme;
    cards: Card[];
    isCompleted: boolean;
    rewardClaimed: boolean;
}

export interface DailyLoginState {
    currentDay: number; // 1-7
    claimedToday: boolean;
    lastClaimTime: number;
}
