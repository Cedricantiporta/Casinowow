
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
  COIN = 'COIN'
}

export type GameTheme = 'NEON' | 'EGYPT' | 'DRAGON' | 'PIRATE' | 'SPACE' | 'CANDY' | 'JUNGLE' | 'UNDERWATER' | 'WESTERN' | 'SAMURAI' | 'PIGGY' | 'GOLDEN_POT' | 'LEPRECHAUN' | 'ARCTIC' | 'PETS' | 'MMORPG' | 'FARM' | 'BEAST' | 'ANGRYFLOCK' | 'PRINCESS';

export interface SymbolConfig {
  type: SymbolType;
  icon: string;
  value: number;
  style: string;
  bg?: string;
  highlightClass?: string;
  imageScale?: number;
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
  coverImage?: string;
  slotBg?: string;
}

export enum GameStatus {
  IDLE = 'IDLE',
  SPINNING = 'SPINNING',
  STOPPING = 'STOPPING',
  WIN_ANIMATION = 'WIN_ANIMATION',
  SCATTER_SHOWCASE = 'SCATTER_SHOWCASE', 
  FREE_SPIN_INTRO = 'FREE_SPIN_INTRO',
  FREE_SPIN_OUTRO = 'FREE_SPIN_OUTRO',
  CASCADE = 'CASCADE'
}

export interface PlayerState {
  balance: number;
  diamonds: number; // Renamed to Gems in UI, keeping var name for stability
  tokens: number; // Renamed from cardCredits
  packCredits: number; // New currency for opening packs
  premiumPackCredits: number; // Premium pack credits
  piggyBank: number; // Accumulated free coins from bets
  level: number;
  xp: number;
  xpToNextLevel: number;
  autoSpin: boolean;
  xpMultiplier: number;
  xpBoostEndTime: number;
  collectBoostEndTime?: number;
  freeStashClaimed: boolean;
  isVip?: boolean;
  freeVipClaimed?: boolean;
  freeStashClaimedTime?: number;
  shopClaimedItems?: string[];
  vipXp?: number;
  vipLevel?: number;
  vipXpToNext?: number;
  vipExpiry?: number;
  jackpotRouletteLastTime?: number;
  stats?: {
    maxSingleWin: number;
    maxJackpotWin: number;
    totalCoinsWon: number;
    totalGemsEarned: number;
    totalSpins: number;
    recentSlots: string[];
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
    content: 'GEM' | 'REWARD' | 'BLANK' | 'BOMB' | 'BLOCK_2X' | 'BLOCK_3X' | 'BLOCK_4X';
    reward?: MiniGameReward;
    blockBase?: 'BLANK' | 'REWARD' | 'GEM';
    mult?: number;
}

export interface QuestState {
  credits: number;
  picks: number;
  wildStage: number; // Separated Stage
  diceStage: number; // Separated Stage
  max: 60;
  dicePosition: number;
  activeGame: 'NONE' | 'WILD' | 'DICE';
  wildGrid: WildGridCell[]; // Persistence for Wild Quest
  wildCredits: number;
  diceCredits: number;
}

export interface SlotQuestMission {
    id: string;
    type: 'WIN_COUNT' | 'SPIN_COUNT' | 'MAX_BET_SPIN' | 'WIN_COINS' | 'BET_COINS' | 'BIG_WIN_COUNT' | 'LEVEL_UP' | 'REACH_LEVEL';
    label: string;
    description: string;
    current: number;
    target: number;
}

export interface SlotQuestState {
    pathSlotIds: string[];
    currentPathIndex: number;
    missions: SlotQuestMission[];
}

export type RewardType = 'NOTHING' | 'COINS' | 'XP_BOOST' | 'CREDIT_BACK' | 'DIAMONDS' | 'PICKS' | 'GEM' | 'DICE_CREDITS' | 'BACK' | 'PACKS' | 'STAR';

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
  BIG_WIN_COUNT = 'BIG_WIN_COUNT',
  MAX_BET_SPIN = 'MAX_BET_SPIN'
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
  stacks?: number;
  isGolden?: boolean;
}

export interface PassReward {
  id: string;
  level: number;
  type: RewardType;
  value: number;
  label: string;
  claimed: boolean;
  claimedValue?: number;
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
