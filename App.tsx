import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SymbolType, GameStatus, PlayerState, WinData, QuestState, MiniGameReward, GameConfig, MissionState, MissionType, PassReward, Mission, Deck, Card, DailyLoginState, WildGridCell } from './types';
import { GAMES_CONFIG, GET_DYNAMIC_WEIGHTS, SPIN_DURATION, REEL_DELAY, INITIAL_BALANCE, GET_PAYLINES, XP_BASE_REQ, GET_ALL_BETS, MAX_BET_BY_LEVEL, formatNumber, formatCommaNumber, formatWinNumber, GET_SYMBOLS, AUTO_SPIN_DELAY, GENERATE_DAILY_MISSIONS, GENERATE_WEEKLY_MISSIONS, GENERATE_MONTHLY_MISSIONS, GENERATE_PASS_REWARDS, INITIAL_GEMS, PICKS_COST_IN_CREDITS, GENERATE_DECKS, CALCULATE_TIME_BONUS, DUPLICATE_CREDIT_VALUES, GENERATE_REPLACEMENT_MISSION, DAILY_LOGIN_REWARDS, PACK_COSTS, SCALE_COIN_REWARD, formatK, formatKShort, NEON_WEIGHTS, REGENERATE_MISSION_STACK } from './constants';
import { Reel } from './components/Reel';
import { WinPopup } from './components/WinPopup';
import { LeftSidebar } from './components/LeftSidebar';
import { ShopModal } from './components/ShopModal';
import { MiniGameModal } from './components/MiniGameModal';
import { Lobby } from './components/Lobby';
import { FreeSpinsWonPopup } from './components/FreeSpinsWonPopup';
import { LevelUpToast } from './components/LevelUpToast';
import { FreeSpinSummary } from './components/FreeSpinSummary';
import { BankruptcyModal } from './components/BankruptcyModal';
import { MissionPassModal } from './components/MissionPassModal';
import { CardCollectionModal } from './components/CardCollectionModal';
import { SimpleCelebrationModal } from './components/SimpleCelebrationModal';
import { TimeBonusModal } from './components/TimeBonusModal';
import { LoginBonusModal } from './components/LoginBonusModal';
import { JackpotTicker } from './components/JackpotTicker';
import { PiggyBankModal } from './components/PiggyBankModal';
import { FeatureUnlockModal } from './components/FeatureUnlockModal';
import { SettingsModal } from './components/SettingsModal';
import { VipLoungeModal } from './components/VipLoungeModal';
import { MiniGamesHub } from './components/MiniGamesHub';
import { audioService } from './services/audioService';
import { jackpotService } from './services/jackpotService';
import { JackpotCelebration } from './components/JackpotCelebration';
import { StageCompleteModal } from './components/StageCompleteModal';
import { SlotLoadingScreen } from './components/SlotLoadingScreen';
import { PremiumModal } from './components/PremiumModal';
import { ProfileModal } from './components/ProfileModal';
import { InboxModal, InboxMessage } from './components/InboxModal';
import { DragonPickGrid } from './components/DragonPickModal';
import { NeonRouletteModal } from './components/NeonRouletteModal';
import { CandyRouletteModal, CandyWildConfig } from './components/CandyRouletteModal';
import { ArcticPickGrid } from './components/ArcticPickGrid';

// Interface for persisted game state
interface SavedGameState {
    freeSpinsRemaining: number;
    totalFreeSpins: number;
    freeSpinsWon: number;
    freeSpinTotalWin: number;
    spinsWithoutBonus: number;
    grid: SymbolType[][];
}

const getRandomSymbol = (isFreeSpin: boolean, spinsWithoutBonus: number): SymbolType => {
  const weights = GET_DYNAMIC_WEIGHTS(isFreeSpin, spinsWithoutBonus);
  const totalWeight = weights.reduce((acc, w) => acc + w.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of weights) {
    random -= item.weight;
    if (random <= 0) return item.type;
  }
  return SymbolType.TEN;
};

const ALL_BETS = GET_ALL_BETS();

// Adjusted Win Tiers
const getWinTier = (amount: number, bet: number): string | null => {
  const m = amount / (bet || 1);
  if (m >= 250) return 'ULTIMATE WIN'; 
  if (m >= 100) return 'MEGA WIN';     
  if (m >= 50) return 'EPIC WIN';      
  if (m >= 20) return 'GREAT WIN';     
  if (m >= 10) return 'BIG WIN';
  return null;
};

const formatBet = (num: number) => formatCommaNumber(num);

const ARCTIC_MULT_COLORS = [
    { solid: '#22c55e', border: '#16a34a', bg: '#052e16' },
    { solid: '#3b82f6', border: '#2563eb', bg: '#0c1a3a' },
    { solid: '#a855f7', border: '#7c3aed', bg: '#1a0535' },
    { solid: '#ef4444', border: '#b91c1c', bg: '#2d0a0a' },
    { solid: '#eab308', border: '#a16207', bg: '#2a1800' },
];

const ArcticMultiplierBar: React.FC<{ mults: number[]; stepIdx: number; isActive: boolean }> = ({ mults, stepIdx, isActive }) => (
    <div className="flex items-center justify-center gap-1.5 py-1.5 px-3">
        {mults.map((m, idx) => {
            const active = isActive && stepIdx === idx;
            const c = ARCTIC_MULT_COLORS[idx];
            return (
                <div key={idx} className="flex items-center justify-center rounded transition-all duration-200"
                    style={{ padding: '2px 8px', background: active ? c.solid : 'rgba(0,0,0,0.30)', border: 'none' }}>
                    <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(9px,1.6vw,12px)', color: active ? '#000' : 'rgba(0,0,0,0.65)', fontWeight: 900 }}>×{m}</span>
                </div>
            );
        })}
    </div>
);

const ArcticProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
    const pct = Math.min((progress / 250) * 100, 100);
    const full = progress >= 500;
    return (
        <div className="flex items-center justify-center py-1.5">
            <div className="relative overflow-hidden" style={{ width: '50%', height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }}>
                <div className="absolute inset-y-0 left-0 transition-all duration-500" style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg,#0369a1,#0ea5e9,#7dd3fc)',
                    boxShadow: full ? '0 0 8px rgba(34,211,238,0.9)' : '0 0 4px rgba(34,211,238,0.4)',
                    borderRadius: 3,
                }} />
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.15) 0%,transparent 55%)', borderRadius: 3 }} />
            </div>
        </div>
    );
};

const PRELOAD_ASSETS = [
    '/slots/piggy_bg.jpg', '/slots/egypt_bg.jpg', '/slots/arctic_bg.jpg',
    '/slots/dragon_bg.jpg', '/slots/pirate_bg.jpg', '/slots/candy_bg.png',
    '/symbols/coin.png', '/ui/pass.png',
    '/egypt/wild.png', '/symbols/seven.png', '/candy/sugar1.png',
    '/pirate/skull.png', '/piggy/pig.png', '/arctic/penguin.png', '/dragon/dragon-1.png',
];

const App: React.FC = () => {
  const toastCountRef = useRef(0);
  const [appReady, setAppReady] = useState(false);
  const spinButtonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const [currentView, setCurrentView] = useState<'LOBBY' | 'GAME' | 'HIGH_LIMIT'>('LOBBY');
  const [selectedGame, setSelectedGame] = useState<GameConfig>(GAMES_CONFIG[0]);
  const [isHighLimit, setIsHighLimit] = useState(false);
  const [savedGameStates, setSavedGameStates] = useState<Record<string, SavedGameState>>({});

  const [player, setPlayer] = useState<PlayerState>(() => {
    try {
      const saved = localStorage.getItem('cw_player');
      if (saved) return { ...{ balance: INITIAL_BALANCE, diamonds: INITIAL_GEMS, tokens: 0, packCredits: 0, premiumPackCredits: 0, piggyBank: 0, level: 1, xp: 0, xpToNextLevel: XP_BASE_REQ, autoSpin: false, xpMultiplier: 1, xpBoostEndTime: 0, freeStashClaimedTime: 0, shopClaimedItems: [], vipXp: 0, vipLevel: 1, vipXpToNext: 500 }, ...JSON.parse(saved) };
    } catch {}
    return { balance: INITIAL_BALANCE, diamonds: INITIAL_GEMS, tokens: 0, packCredits: 0, premiumPackCredits: 0, piggyBank: 0, level: 1, xp: 0, xpToNextLevel: XP_BASE_REQ, autoSpin: false, xpMultiplier: 1, xpBoostEndTime: 0, freeStashClaimedTime: 0, shopClaimedItems: [], vipXp: 0, vipLevel: 1, vipXpToNext: 500 };
  });
  
  // Ref to track player state to avoid stale closures in callbacks (like feature unlocks)
  const playerRef = useRef(player);
  useEffect(() => {
      playerRef.current = player;
  }, [player]);
  
  const [bonusTimers, setBonusTimers] = useState<{ id: number; endTime: number; reward: number; label: string }[]>(() => {
      try {
          const saved = localStorage.getItem('cw_bonus_timers');
          if (saved) return JSON.parse(saved);
      } catch {}
      const now = Date.now();
      return [
          { id: 0, endTime: now, reward: 500000, label: 'Quick' },
          { id: 1, endTime: now + 900000, reward: 2500000, label: 'Super' },
          { id: 2, endTime: now + 3600000, reward: 10000000, label: 'Mega' },
      ];
  });

  // Sync jackpot max bet with current level's max bet
  useEffect(() => {
      jackpotService.setMaxBet(MAX_BET_BY_LEVEL(player.level));
  }, [player.level]);

  // Preload game assets on first mount, then mark app as ready
  useEffect(() => {
      let loaded = 0;
      const total = PRELOAD_ASSETS.length;
      const done = () => { loaded++; if (loaded >= total) setAppReady(true); };
      PRELOAD_ASSETS.forEach(src => {
          const img = new Image();
          img.onload = done;
          img.onerror = done;
          img.src = src;
      });
  }, []);

  // Toggle XP mult display between multiplier and countdown every 15s when boost active
  useEffect(() => {
      const boostActive = (player.xpMultiplier || 1) > 1 && (player.xpBoostEndTime || 0) > Date.now();
      if (!boostActive) { setShowXpTimer(false); return; }
      const interval = setInterval(() => setShowXpTimer(prev => !prev), 15000);
      return () => clearInterval(interval);
  }, [player.xpMultiplier, player.xpBoostEndTime]);

  // Instantly dismiss level toast when leaving game view
  useEffect(() => {
      if (currentView !== 'GAME') setShowLevelUp(false);
  }, [currentView]);

  // Show XP % for 1 second when XP changes
  useEffect(() => {
      if (xpPctTimerRef.current) clearTimeout(xpPctTimerRef.current);
      setShowXpPct(true);
      xpPctTimerRef.current = setTimeout(() => setShowXpPct(false), 1000);
  }, [player.xp]);

  // Effect to update Golden Treasury rewards when level changes
  useEffect(() => {
      const maxBet = MAX_BET_BY_LEVEL(player.level);
      // Quick = 50% maxBet, Super = 250% maxBet, Mega = 1000% maxBet
      const pcts = [0.5, 2.5, 10.0];
      setBonusTimers(prev => prev.map(t => ({
          ...t,
          reward: Math.floor(maxBet * pcts[t.id])
      })));
  }, [player.level]);

  const [missionState, setMissionState] = useState<MissionState>(() => {
    try {
      const saved = localStorage.getItem('cw_missions');
      if (saved) {
          const parsed = JSON.parse(saved);
          // Daily reset: if lastDailyReset is a different calendar day, regenerate daily missions
          const now = new Date();
          const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
          if (parsed.lastDailyReset !== todayKey) {
              const level = parsed.passLevel || 1;
              const nonDaily = (parsed.activeMissions || []).filter((m: { frequency: string }) => m.frequency !== 'DAILY');
              return { ...parsed, lastDailyReset: todayKey, activeMissions: [...GENERATE_DAILY_MISSIONS(level), ...nonDaily], passXpToNext: 100 };
          }
          return { ...parsed, passXpToNext: 100 };
      }
    } catch {}
    const todayKey = (() => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; })();
    return { lastDailyReset: todayKey, activeMissions: [...GENERATE_DAILY_MISSIONS(1), ...GENERATE_WEEKLY_MISSIONS(1), ...GENERATE_MONTHLY_MISSIONS(1)], passLevel: 1, passXP: 0, passXpToNext: 100, passRewards: GENERATE_PASS_REWARDS(10000), isPremium: false, premiumExpiry: 0, passBoostMultiplier: 1, passBoostEndTime: 0 };
  });
  const [decks, setDecks] = useState<Deck[]>(GENERATE_DECKS());

  const [availableBets, setAvailableBets] = useState<number[]>(ALL_BETS);
  const [betIndex, setBetIndex] = useState(0);
  const currentBetRef = useRef(ALL_BETS[0]);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
    const [grid, setGrid] = useState<SymbolType[][]>(Array(GAMES_CONFIG[0].reels).fill(null).map(() => Array(GAMES_CONFIG[0].rows).fill(SymbolType.SEVEN)));
  const [targetGrid, setTargetGrid] = useState<SymbolType[][]>([]);
  const [winData, setWinData] = useState<WinData | null>(null);
  const [stoppedReels, setStoppedReels] = useState(0);
  const [instantStop, setInstantStop] = useState(false);
  const [fastSpin, setFastSpin] = useState(false);
  const [showAutoSpinPopup, setShowAutoSpinPopup] = useState(false);
  const [autoSpinRemaining, setAutoSpinRemaining] = useState(-1);
  const autoSpinRemainingRef = useRef(-1);
  const [autoMaxBet, setAutoMaxBet] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showVipLounge, setShowVipLounge] = useState(false);
  const [showMiniGamesHub, setShowMiniGamesHub] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const savedFastSpinRef = useRef<boolean>(false);
  const [scatterAnticipation, setScatterAnticipation] = useState(false);
  const scatterAnticipationRef = useRef(false);
  const targetGridRef = useRef<SymbolType[][]>([]);
  const fastSpinRef = useRef(fastSpin);
  useEffect(() => { fastSpinRef.current = fastSpin; }, [fastSpin]);
  useEffect(() => { autoSpinRemainingRef.current = autoSpinRemaining; }, [autoSpinRemaining]);
  useEffect(() => { targetGridRef.current = targetGrid; }, [targetGrid]);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [gemsClaimedPopup, setGemsClaimedPopup] = useState<number | null>(null);
  const [piggyGlow, setPiggyGlow] = useState(false);
  const [showXpTimer, setShowXpTimer] = useState(false);
  const [showXpPct, setShowXpPct] = useState(false);
  const xpPctTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [activeModal, setActiveModal] = useState<'NONE' | 'SHOP' | 'COLLECTION' | 'MINIGAME' | 'MISSIONS' | 'TIME_BONUS' | 'LOGIN_BONUS' | 'PIGGY' | 'FEATURE_UNLOCK'>('NONE');
  const [missionInitialView, setMissionInitialView] = useState<'MISSIONS' | 'PASS'>('MISSIONS');
  const [shopInitialTab, setShopInitialTab] = useState<'COINS' | 'BOOSTS' | 'DIAMONDS'>('COINS');
  const [cardInitialTab, setCardInitialTab] = useState<'ALBUM' | 'PACKS'>('ALBUM');
  const [cardModalReturnTab, setCardModalReturnTab] = useState<'ALBUM' | 'PACKS' | null>(null);
  
  const [featureUnlockData, setFeatureUnlockData] = useState({ name: '', icon: '', description: '', action: () => {} });
  const [shownUnlocks, setShownUnlocks] = useState<Set<number>>(new Set());

  const [showFreeSpinsPopup, setShowFreeSpinsPopup] = useState(false);
  const [freeSpinsWon, setFreeSpinsWon] = useState(0);
  const [showBankruptcy, setShowBankruptcy] = useState(false);
  const [showWelcomeGift, setShowWelcomeGift] = useState(() => !localStorage.getItem('cw_welcome_claimed') && !localStorage.getItem('cw_player'));
  const [giftCountDone, setGiftCountDone] = useState(false);
  const [giftDisplayAmount, setGiftDisplayAmount] = useState(0);
  const [animBalance, setAnimBalance] = useState<number | null>(null);
  const pendingLoginBonusRef = useRef(false);
  const hasLeftLobbyRef = useRef(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showPackToast, setShowPackToast] = useState(false);
  const [levelUpReward, setLevelUpReward] = useState(0);
  const [maxBetIncreased, setMaxBetIncreased] = useState(false);
  const [mobileScale, setMobileScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const widthScale = window.innerWidth / 844;
      const heightScale = window.innerHeight / 390;
      setMobileScale(Math.min(2, widthScale, heightScale));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Quest state initialized with separate stages, persisted to localStorage
  const [quest, setQuest] = useState<QuestState>(() => {
      const defaults: QuestState = { credits: 5, picks: 5, diceCredits: 5, wildCredits: 5, wildStage: 1, diceStage: 1, max: 60, dicePosition: 0, activeGame: 'NONE', wildGrid: [] };
      try {
          const saved = localStorage.getItem('cw_quest');
          if (saved) {
              const parsed = JSON.parse(saved);
              return { ...defaults, wildStage: parsed.wildStage || 1, diceStage: parsed.diceStage || 1, dicePosition: parsed.dicePosition || 0, wildGrid: parsed.wildGrid || [] };
          }
      } catch {}
      return defaults;
  });
  // Hold and Win state (Egypt / Pharaoh's Tomb)
  const [holdWinActive, setHoldWinActive] = useState(false);
  const [holdWinLockedGrid, setHoldWinLockedGrid] = useState<boolean[][]>([]);
  const [holdWinCoinValues, setHoldWinCoinValues] = useState<number[][]>([]);
  const [holdWinJpGrid, setHoldWinJpGrid] = useState<(string|null)[][]>([]);
  const [holdWinRespins, setHoldWinRespins] = useState(3);
  const holdWinRef = useRef({ active: false, lockedGrid: [] as boolean[][], coinValues: [] as number[][], jpGrid: [] as (string|null)[][], respins: 3 });
  // Egypt: coin values shown on all COIN cells (even before HW triggers)
  const [egyptCoinMeta, setEgyptCoinMeta] = useState<{values:(number|null)[][], jpGrid:(string|null)[][]} | null>(null);
  // HW end: counting animation state
  const [hwCounting, setHwCounting] = useState(false);
  const [hwCountingCell, setHwCountingCell] = useState<{c:number,r:number}|null>(null);
  const [hwCountingTotal, setHwCountingTotal] = useState(0);
  const hwCountContinuationRef = useRef<(() => void) | null>(null);

  const [cascadeMultiplier, setCascadeMultiplier] = useState(1);
  const [cascadeTotalWin, setCascadeTotalWin] = useState(0);
  const [cascadeGrid, setCascadeGrid] = useState<SymbolType[][] | null>(null);
  const [cascadeNewCells, setCascadeNewCells] = useState<boolean[][] | null>(null);
  const [cascadeDissolving, setCascadeDissolving] = useState(false);
  const [reelTransitioning, setReelTransitioning] = useState<false | 'out' | 'in'>(false);
  const runCascadeRef = useRef<(g: SymbolType[][], m: number, acc: number, wc: {col:number,row:number}[]) => void>();

  // Neon Vegas Scatter Roulette state
  const [showNeonRoulette, setShowNeonRoulette] = useState(false);
  const [neonRouletteBet, setNeonRouletteBet] = useState(0);
  const neonRouletteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showRouletteTriggerNotif, setShowRouletteTriggerNotif] = useState(false);
  const [showHRLoading, setShowHRLoading] = useState(false);

  // Dragon's Fortune Pick-and-Win state
  const [showDragonPickModal, setShowDragonPickModal] = useState(false);
  const [showDragonTriggerPopup, setShowDragonTriggerPopup] = useState(false);
  const [dragonPotShaking, setDragonPotShaking] = useState(false);
  const [dragonCoinAbsorbing, setDragonCoinAbsorbing] = useState(false);
  const dragonPickSpinsRef = useRef(0);
  const dragonPickBonusMultRef = useRef(0); // accumulated +5% per 100 spins

  // Egypt Hold & Win popup
  const [showEgyptHoldWinPopup, setShowEgyptHoldWinPopup] = useState(false);

  // Arctic Pick-and-Win state
  const [showArcticPickModal, setShowArcticPickModal] = useState(false);
  const [showArcticTriggerPopup, setShowArcticTriggerPopup] = useState(false);
  const [arcticSpinProgress, setArcticSpinProgress] = useState(0);
  const arcticPickSpinsRef = useRef(0);
  const arcticProgressRef = useRef(0);
  const arcticFreeSpinCountRef = useRef(0);
  const arcticJpPickTriggeredRef = useRef(false);
  const [pendingArcticFreePick, setPendingArcticFreePick] = useState(false);

  // Pirate's Bounty — Ghost Ship Walking Wilds state
  const [pirateWalkActive, setPirateWalkActive] = useState(false);
  const [pirateShipCol, setPirateShipCol] = useState(-1);
  const [pirateShip2Col, setPirateShip2Col] = useState(-1);
  const [pirateWalkTotalWin, setPirateWalkTotalWin] = useState(0);
  const pirateWalkRef = useRef({ active: false, shipCol: -1, ship2Col: -1 });
  const pirateWalkTotalWinRef = useRef(0);
  const pirateTriggerArmedRef = useRef(false);
  const pirateDualShipRef = useRef(false);
  const pirateShip2OffsetRef = useRef(0);

  // Cosmic Cash (SPACE) — Supernova progressive free-spin multiplier
  const [spaceMultiplier, setSpaceMultiplier] = useState(1);
  const spaceFsMultRef = useRef(1);

  // Sugar Rush (CANDY) — Wild Wheel: roulette picks persistent switching wilds for the free-spin round
  const [showCandyRoulette, setShowCandyRoulette] = useState(false);
  const candyWildConfigRef = useRef<CandyWildConfig | null>(null);
  const candyPendingColsRef = useRef<{ col: number; seedRow: number }[]>([]);
  const candySingleWildsRef = useRef<{ col: number; row: number }[]>([]);
  const [candyCols, setCandyCols] = useState<{ col: number; seedRow: number }[]>([]);
  const [candySingleWilds, setCandySingleWilds] = useState<{ col: number; row: number }[]>([]);
  const [candyFsSpinKey, setCandyFsSpinKey] = useState(0);
  const [candyConfig, setCandyConfig] = useState<CandyWildConfig | null>(null);
  const [candyShuffledCols, setCandyShuffledCols] = useState<{ col: number; seedRow: number }[] | null>(null);
  const [candyShuffledSingles, setCandyShuffledSingles] = useState<{ col: number; row: number }[] | null>(null);

  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0);
  const [totalFreeSpins, setTotalFreeSpins] = useState(0);
  const [freeSpinTotalWin, setFreeSpinTotalWin] = useState(0);
  const freeSpinTotalWinRef = useRef(0);
  useEffect(() => { freeSpinTotalWinRef.current = freeSpinTotalWin; }, [freeSpinTotalWin]);
  const [showFreeSpinSummary, setShowFreeSpinSummary] = useState(false);
  const [spinsWithoutBonus, setSpinsWithoutBonus] = useState(0);
  
  const [loginState, setLoginState] = useState<DailyLoginState>(() => {
      try {
          const saved = localStorage.getItem('cw_login');
          if (saved) {
              const parsed = JSON.parse(saved);
              const lastDate = new Date(parsed.lastClaimTime).toDateString();
              const today = new Date().toDateString();
              if (lastDate !== today) return { ...parsed, claimedToday: false };
              return parsed;
          }
      } catch {}
      return { currentDay: 1, claimedToday: false, lastClaimTime: 0 };
  });

  const [celebrationMsg, setCelebrationMsg] = useState<string>("");
  const [stageCompletePopup, setStageCompletePopup] = useState<{ gameType: 'WILD' | 'DICE'; stage: number; coins: number; diamonds: number } | null>(null);
  const [jackpotWinTier, setJackpotWinTier] = useState<null | { name: string; color: string; icon: string; amount: number }>(null);
  const [pendingBigWin, setPendingBigWin] = useState(false);
  type ActiveToast = { type: 'LEVEL_UP'; level: number; reward: number; maxBetIncreased: boolean; newMaxBet: number } | { type: 'PACK' } | { type: 'CARD'; rarity: 'COMMON' | 'RARE'; cardName: string } | null;
  const [activeToast, setActiveToast] = useState<ActiveToast>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState<'VIP' | 'PASS' | null>(null);
  const [purchaseConfirm, setPurchaseConfirm] = useState<'VIP' | 'PASS' | null>(null);
  const [showNopay, setShowNopay] = useState(false);
  const [profileEmoji, setProfileEmoji] = useState(() => localStorage.getItem('cw_profile_emoji') || '');
  const [showInbox, setShowInbox] = useState(false);
  const [gameLoadingConfig, setGameLoadingConfig] = useState<GameConfig | null>(null);
  const [inbox, setInbox] = useState<InboxMessage[]>(() => {
      try {
          const saved = localStorage.getItem('cw_inbox');
          if (saved) return JSON.parse(saved);
      } catch {}
      return [];
  });
  const [claimedCoinGiftCount, setClaimedCoinGiftCount] = useState<number>(() => {
      try { return Number(localStorage.getItem('cw_coin_gift_count') || '0'); } catch { return 0; }
  });
  const [vipBetTracking, setVipBetTracking] = useState<{ date: string; total: number }>(() => {
      try { return JSON.parse(localStorage.getItem('cw_vip_bets') || '{"date":"","total":0}'); } catch { return { date: '', total: 0 }; }
  });
  const [redeemedCodes, setRedeemedCodes] = useState<string[]>(() => {
      try { return JSON.parse(localStorage.getItem('cw_redeemed_codes') || '[]'); } catch { return []; }
  });

  // CANDY: shuffle wild container positions once when spin starts for a "switching" animation
  useEffect(() => {
      if (status === GameStatus.SPINNING && selectedGame.theme === 'CANDY' && totalFreeSpins > 0) {
          const reels = selectedGame.reels;
          const rows = selectedGame.rows;
          const cols = candyPendingColsRef.current;
          const singles = candySingleWildsRef.current;
          if (cols.length > 0) {
              const indices = Array.from({ length: reels }, (_, i) => i);
              for (let j = indices.length - 1; j > 0; j--) {
                  const k = Math.floor(Math.random() * (j + 1));
                  [indices[j], indices[k]] = [indices[k], indices[j]];
              }
              setCandyShuffledCols(cols.map((c, i) => ({ col: indices[i % reels], seedRow: c.seedRow })));
          }
          if (singles.length > 0) {
              const allPos = Array.from({ length: reels * rows }, (_, i) => ({ col: Math.floor(i / rows), row: i % rows }));
              for (let j = allPos.length - 1; j > 0; j--) {
                  const k = Math.floor(Math.random() * (j + 1));
                  [allPos[j], allPos[k]] = [allPos[k], allPos[j]];
              }
              setCandyShuffledSingles(allPos.slice(0, singles.length));
          }
      } else {
          setCandyShuffledCols(null);
          setCandyShuffledSingles(null);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, selectedGame.theme, selectedGame.reels, selectedGame.rows, totalFreeSpins]);

  // Persist inbox / coin-gift count / vip bet tracking to localStorage
  useEffect(() => {
      try { localStorage.setItem('cw_coin_gift_count', String(claimedCoinGiftCount)); } catch {}
  }, [claimedCoinGiftCount]);
  useEffect(() => {
      try { localStorage.setItem('cw_vip_bets', JSON.stringify(vipBetTracking)); } catch {}
  }, [vipBetTracking]);
  useEffect(() => {
      try { localStorage.setItem('cw_inbox', JSON.stringify(inbox)); } catch {}
  }, [inbox]);
  useEffect(() => {
      try { localStorage.setItem('cw_bonus_timers', JSON.stringify(bonusTimers)); } catch {}
  }, [bonusTimers]);

  // Generate daily inbox messages on mount
  useEffect(() => {
      const todayStr = new Date().toDateString();
      setInbox(prev => {
          const next = [...prev];

          // Welcome gift — one-time
          const hasWelcome = next.some(m => m.type === 'WELCOME');
          if (!hasWelcome) {
              next.push({
                  id: 'welcome',
                  type: 'WELCOME' as const,
                  title: 'Welcome Gift',
                  body: '+5,000,000 Coins · +500 Gems',
                  claimed: false,
                  createdAt: Date.now(),
              });
          }

          // Daily coin gift — days 1-10 (uses claimedCoinGiftCount, 20× amount)
          const hasTodayCoinGift = next.some(m => m.type === 'DAILY_COINS' && new Date(m.createdAt).toDateString() === todayStr);
          if (!hasTodayCoinGift && claimedCoinGiftCount < 10) {
              const day = claimedCoinGiftCount + 1;
              const amount = day * 50_000 * 20;
              next.push({
                  id: `daily_coins_${todayStr}`,
                  type: 'DAILY_COINS' as const,
                  title: `Daily Coin Gift — Day ${day}/10`,
                  body: `+${amount.toLocaleString()} Coins`,
                  claimed: false,
                  createdAt: Date.now(),
              });
          }

          // Daily pack gift — only once cards are unlocked (level 30)
          const hasTodayPackGift = next.some(m => m.type === 'DAILY_PACK' && new Date(m.createdAt).toDateString() === todayStr);
          const cardsUnlocked = playerRef.current.level >= 30;
          if (!hasTodayPackGift && cardsUnlocked) {
              const roll = Math.random();
              let packTitle = '';
              let packBody = '';
              if (roll < 0.33) {
                  packTitle = 'Daily Pack Gift';
                  packBody = '+5 Standard Card Packs';
              } else if (roll < 0.66) {
                  packTitle = 'Daily Premium Pack Gift';
                  packBody = '+2 Premium Card Packs';
              } else {
                  packTitle = 'Daily Gem Gift';
                  packBody = '+50 Gems';
              }
              next.push({
                  id: `daily_pack_${todayStr}`,
                  type: 'DAILY_PACK' as const,
                  title: packTitle,
                  body: packBody,
                  claimed: false,
                  createdAt: Date.now(),
              });
          }

          return next;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // VIP cashback: check on mount if previous day had VIP bets, and generate a cashback message
  useEffect(() => {
      const todayStr = new Date().toDateString();
      if (vipBetTracking.date && vipBetTracking.date !== todayStr && vipBetTracking.total > 0) {
          const cashback = Math.floor(vipBetTracking.total * 0.05);
          setInbox(prev => {
              const alreadyHas = prev.some(m => m.type === 'VIP_CASHBACK' && m.id === `vip_cashback_${vipBetTracking.date}`);
              if (alreadyHas) return prev;
              return [...prev, {
                  id: `vip_cashback_${vipBetTracking.date}`,
                  type: 'VIP_CASHBACK' as const,
                  title: 'VIP Daily Cashback',
                  body: `+${cashback.toLocaleString()} Coins (5% of yesterday's bets)`,
                  claimed: false,
                  createdAt: Date.now(),
              }];
          });
          setVipBetTracking({ date: '', total: 0 });
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClaimInbox = (id: string) => {
      setInbox(prev => {
          const msg = prev.find(m => m.id === id);
          if (!msg) return prev;
          // Apply reward
          if (msg.type === 'WELCOME') {
              setPlayer(p => ({ ...p, balance: p.balance + 5_000_000, diamonds: p.diamonds + 500 }));
              setCelebrationMsg('+5,000,000 Coins · +500 Gems');
          } else if (msg.type === 'DAILY_COINS') {
              const day = claimedCoinGiftCount + 1;
              const amount = day * 50_000 * 20;
              setPlayer(p => ({ ...p, balance: p.balance + amount }));
              setCelebrationMsg(`+${amount.toLocaleString()} Coins`);
              setClaimedCoinGiftCount(c => c + 1);
          } else if (msg.type === 'DAILY_PACK') {
              if (msg.body.includes('Premium')) {
                  setPlayer(p => ({ ...p, premiumPackCredits: (p.premiumPackCredits ?? 0) + 2 }));
                  setCelebrationMsg('+2 Premium Packs');
              } else if (msg.body.includes('Gem')) {
                  setPlayer(p => ({ ...p, diamonds: p.diamonds + 50 }));
                  setCelebrationMsg('+50 Gems');
              } else {
                  setPlayer(p => ({ ...p, packCredits: p.packCredits + 5 }));
                  setCelebrationMsg('+5 Card Packs');
              }
          } else if (msg.type === 'VIP_CASHBACK') {
              const cashback = Math.floor((msg.body.match(/\+([\d,]+)/) ? Number(msg.body.match(/\+([\d,]+)/)?.[1].replace(/,/g, '')) : 0));
              if (cashback > 0) {
                  setPlayer(p => ({ ...p, balance: p.balance + cashback }));
                  setCelebrationMsg(`+${cashback.toLocaleString()} VIP Cashback`);
              }
          }
          audioService.playWinBig();
          return prev.map(m => m.id === id ? { ...m, claimed: true } : m);
      });
  };

  useEffect(() => {
    setBetIndex(0);
    const unlockAudio = () => {
        audioService.toggleMute();
        audioService.toggleMute();
        document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);

    if (!loginState.claimedToday) {
        if (!localStorage.getItem('cw_player')) {
            // First-time player — defer login bonus until they return from Piggy Riches
            pendingLoginBonusRef.current = true;
        } else {
            setTimeout(() => setActiveModal('LOGIN_BONUS'), 500);
        }
    }
  }, []);

  const showToast = (toast: NonNullable<ActiveToast>) => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setActiveToast(toast);
      toastTimerRef.current = setTimeout(() => setActiveToast(null), 1000);
  };

  const openModal = (modal: 'NONE' | 'SHOP' | 'COLLECTION' | 'MINIGAME' | 'MISSIONS' | 'TIME_BONUS' | 'LOGIN_BONUS' | 'PIGGY' | 'FEATURE_UNLOCK') => {
      const currentLevel = playerRef.current.level;
      
      if (modal === 'MINIGAME' && currentLevel < 20) {
           setCelebrationMsg("Quest Unlocks at Level 20!");
           audioService.playStoneBreak();
           return;
      }
      if (modal === 'MISSIONS' && currentLevel < 10) {
          setCelebrationMsg("Missions Unlock at Level 10!");
          audioService.playStoneBreak();
          return;
      }
      if (modal === 'COLLECTION' && currentLevel < 30) {
          setCelebrationMsg("Cards Unlock at Level 30!");
          audioService.playStoneBreak();
          return;
      }
      if (modal === 'PIGGY' && currentLevel < 5) {
          setCelebrationMsg("Piggy Bank Unlocks at Level 5!");
          audioService.playStoneBreak();
          return;
      }
      
      setActiveModal(modal);
      if (modal !== 'NONE') audioService.playClick();
  };

  const openShop = (tab: 'COINS' | 'BOOSTS' | 'DIAMONDS' = 'COINS') => {
      setShopInitialTab(tab);
      setActiveModal('SHOP');
      audioService.playClick();
  }

  const openShopFromCards = (tab: 'COINS' | 'BOOSTS' | 'DIAMONDS' = 'COINS') => {
      setCardModalReturnTab('PACKS');
      setActiveModal('NONE');
      openShop(tab);
  };

  const openMissionsModal = () => {
      setMissionInitialView('MISSIONS');
      openModal('MISSIONS');
  };

  const openBattlePassModal = () => {
      setMissionInitialView('PASS');
      openModal('MISSIONS');
  };

  const handleOpenTimeBonus = () => {
      openModal('TIME_BONUS');
  };

  const handleOpenPiggyBank = () => {
      if (playerRef.current.level < 5) {
           setCelebrationMsg("Piggy Bank Unlocks at Level 5!");
           audioService.playStoneBreak();
           return;
      }
      openModal('PIGGY');
  };
  
  const handleBreakPiggy = (tierAmount: number, gemCost: number) => {
      const brokenAmount = Math.floor(player.piggyBank);
      if (brokenAmount > 0) {
          setPlayer(p => ({
              ...p,
              balance: p.balance + brokenAmount,
              diamonds: p.diamonds - gemCost,
              piggyBank: 0,
          }));
          setCelebrationMsg(`🐷 +${formatCommaNumber(brokenAmount)} Coins!`);
          audioService.playWinBig();
      } else {
          setCelebrationMsg("Piggy Bank is empty!");
          audioService.playStoneBreak();
      }
  };

  const handleOpenHighRoller = () => {
      if (currentView === 'HIGH_LIMIT') {
          setCurrentView('LOBBY');
          setIsHighLimit(false);
      } else if (player.level >= 35) {
          setShowHRLoading(true);
          setTimeout(() => {
              setShowHRLoading(false);
              setIsHighLimit(true);
              setCurrentView('HIGH_LIMIT');
          }, 1800);
      } else {
          setCelebrationMsg('High Roller unlocks at Level 35!');
      }
      audioService.playClick();
  };

  const handleJoinVip = () => {
      setShowVipLounge(false);
      setShowMiniGamesHub(false);
      setShowNopay(true);
      audioService.playClick();
  };

  const nextBonusTime = Math.min(...bonusTimers.map(t => t.endTime));

  const handleClaimTimeBonus = (id: number, _reward: number) => {
      const now = Date.now();
      const multipliers = [5.0, 25.0, 100.0];
      const base = CALCULATE_TIME_BONUS(player.level);

      const scaledReward = Math.floor(base * multipliers[id]);

      setBonusTimers(prev => prev.map(t => {
          if (t.id === id) {
              let nextWait = 300000; // 5m (Quick)
              if (id === 1) nextWait = 900000; // 15m (Super)
              if (id === 2) nextWait = 3600000; // 1H (Mega)
              return { ...t, endTime: now + nextWait, reward: scaledReward }; // Keep reward updated
          }
          return t;
      }));
      
      setPlayer(p => ({ ...p, balance: p.balance + scaledReward }));
      audioService.playWinBig();
      setCelebrationMsg(`+${formatCommaNumber(scaledReward)} Coins`);
  };
  
  const handleCloseCelebration = useCallback(() => {
      setCelebrationMsg("");
  }, []);
  
  const handleClaimLoginBonus = () => {
      const reward = DAILY_LOGIN_REWARDS.find(r => r.day === loginState.currentDay);
      if (reward) {
          const scaledCoins = reward.multiplier * MAX_BET_BY_LEVEL(player.level);
          setPlayer(p => ({ 
              ...p, 
              balance: p.balance + scaledCoins,
              diamonds: p.diamonds + reward.gems
          }));
          let nextDay = loginState.currentDay + 1;
          if (nextDay > 7) nextDay = 1;
          setLoginState({
              currentDay: nextDay,
              claimedToday: true,
              lastClaimTime: Date.now()
          });
          setActiveModal('NONE');
          let msg = `Day ${reward.day}: +${formatCommaNumber(scaledCoins)} Coins`;
          if (reward.gems > 0) msg += ` & ${reward.gems} Gems`;
          setCelebrationMsg(msg);
          audioService.playWinBig();
      }
  };

  useEffect(() => {
    const maxAllowed = MAX_BET_BY_LEVEL(player.level);
    
    // Only expose the top 15 bets at current level — lowest bets drop off as level increases
    const normalBets = ALL_BETS.filter(b => b <= maxAllowed).slice(-15);
    const vipBets = ALL_BETS.map(b => b * 10).filter(b => b <= maxAllowed * 10 && b >= 100000).slice(-15);

    let allowed = isHighLimit ? vipBets : normalBets;
    
    if (allowed.length === 0) allowed = [isHighLimit ? 100000 : 10000];

    allowed = Array.from(new Set(allowed)).sort((a,b) => a-b);
    
    if (JSON.stringify(allowed) !== JSON.stringify(availableBets)) {
        const currentBet = availableBets[betIndex];
        setAvailableBets(allowed);
        let closestIndex = 0;
        let minDiff = Infinity;
        allowed.forEach((b, i) => {
            const diff = Math.abs(b - currentBet);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        });
        setBetIndex(closestIndex);
    }
  }, [player.level, availableBets, betIndex, isHighLimit]);

  // Keep currentBetRef in sync for use inside callbacks
  useEffect(() => { currentBetRef.current = availableBets[betIndex]; }, [availableBets, betIndex]);

  // Save current bet per slot to localStorage whenever it changes in GAME view
  useEffect(() => {
      if (currentView === 'GAME' && availableBets[betIndex] !== undefined) {
          localStorage.setItem('cw_bet_' + selectedGame.id, String(availableBets[betIndex]));
      }
  }, [betIndex, currentView, selectedGame.id, availableBets]);

  useEffect(() => {
      if (player.xpBoostEndTime > 0) {
          const interval = setInterval(() => {
              if (Date.now() > player.xpBoostEndTime) {
                  setPlayer(p => ({ ...p, xpMultiplier: 1, xpBoostEndTime: 0 }));
                  clearInterval(interval);
              }
          }, 1000);
          return () => clearInterval(interval);
      }
  }, [player.xpBoostEndTime]);

  useEffect(() => {
      if (missionState.passBoostEndTime > 0) {
          const interval = setInterval(() => {
              if (Date.now() > missionState.passBoostEndTime) {
                  setMissionState(prev => ({ ...prev, passBoostMultiplier: 1, passBoostEndTime: 0 }));
                  clearInterval(interval);
              }
          }, 1000);
          return () => clearInterval(interval);
      }
  }, [missionState.passBoostEndTime]);

  // Gift coin count-up animation
  useEffect(() => {
    if (!showWelcomeGift) return;
    setGiftDisplayAmount(0);
    setGiftCountDone(false);
    const target = 10000000;
    const duration = 2000;
    const start = Date.now();
    const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        if (elapsed >= duration) {
            setGiftDisplayAmount(target);
            setGiftCountDone(true);
            clearInterval(interval);
            return;
        }
        const p = 1 - Math.pow(1 - elapsed / duration, 3);
        setGiftDisplayAmount(Math.floor(target * p));
    }, 16);
    return () => clearInterval(interval);
  }, [showWelcomeGift]);

  // Show login bonus only when returning to lobby after having left (e.g. after Piggy Riches)
  useEffect(() => {
    if (currentView !== 'LOBBY') {
        hasLeftLobbyRef.current = true;
        return;
    }
    if (hasLeftLobbyRef.current && pendingLoginBonusRef.current) {
        pendingLoginBonusRef.current = false;
        setTimeout(() => setActiveModal('LOGIN_BONUS'), 800);
    }
  }, [currentView]);

  useEffect(() => {
    try { localStorage.setItem('cw_player', JSON.stringify(player)); } catch {}
  }, [player]);

  useEffect(() => {
    try { localStorage.setItem('cw_quest', JSON.stringify({ wildStage: quest.wildStage, diceStage: quest.diceStage, dicePosition: quest.dicePosition, wildGrid: quest.wildGrid })); } catch {}
  }, [quest.wildStage, quest.diceStage, quest.dicePosition, quest.wildGrid]);

  // Expire VIP when 30-day window elapses
  useEffect(() => {
      if (player.isVip && player.vipExpiry && Date.now() > player.vipExpiry) {
          setPlayer(p => ({ ...p, isVip: false }));
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep only 4 daily missions, trim any extras
  useEffect(() => {
      setMissionState(prev => {
          const daily = prev.activeMissions.filter(m => m.frequency === 'DAILY');
          if (daily.length <= 4) return prev;
          const keep = new Set(daily.slice(0, 4).map(m => m.id));
          return { ...prev, activeMissions: prev.activeMissions.filter(m => m.frequency !== 'DAILY' || keep.has(m.id)) };
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem('cw_missions', JSON.stringify(missionState)); } catch {}
  }, [missionState]);

  useEffect(() => {
    try { localStorage.setItem('cw_login', JSON.stringify(loginState)); } catch {}
  }, [loginState]);

  const updateMissions = (type: MissionType, amount: number) => {
      if (player.level < 10) return; 
      setMissionState(prev => {
          const visibleIds = new Set<string>();
          const frequencies = ['DAILY', 'WEEKLY', 'MONTHLY'];
          frequencies.forEach(freq => {
              const visibleForFreq = prev.activeMissions.filter(m => m.frequency === freq && !m.claimed).slice(0, 4);
              visibleForFreq.forEach(m => visibleIds.add(m.id));
          });
          const updatedMissions = prev.activeMissions.map(m => {
              if (visibleIds.has(m.id) && m.type === type && !m.completed) {
                  const newCurrent = m.current + amount;
                  return { ...m, current: newCurrent, completed: newCurrent >= m.target };
              }
              return m;
          });
          return { ...prev, activeMissions: updatedMissions };
      });
  };

  const addPassXp = (amount: number) => {
      if (player.level < 10) return;
      setMissionState(prev => {
          let newPassXP = prev.passXP + amount;
          let newLevel = prev.passLevel;
          let newReq = prev.passXpToNext;
          while (newPassXP >= newReq && newLevel < 50) {
              newPassXP -= newReq;
              newLevel++;
              newReq = 100;
          }
          return { ...prev, passLevel: newLevel, passXP: newPassXP, passXpToNext: newReq };
      });
  };


  const handleClaimMissionReward = (mission: Mission) => {
      if (mission.completed && !mission.claimed) {
          const isBoosted = missionState.passBoostMultiplier > 1;
          const xpGain = mission.xpReward * (isBoosted ? missionState.passBoostMultiplier : 1);
          const coinGain = mission.coinReward;
          addPassXp(xpGain);
          setPlayer(p => ({ ...p, balance: p.balance + coinGain }));
          const remainingStacks = (mission.stacks ?? 1) - 1;
          if (remainingStacks > 0) {
              const stacksCompleted = 3 - remainingStacks;
              const newProps = REGENERATE_MISSION_STACK(mission, stacksCompleted, MAX_BET_BY_LEVEL(player.level), player.level);
              setMissionState(prev => ({
                  ...prev,
                  activeMissions: prev.activeMissions.map(m => m.id === mission.id
                      ? { ...m, ...newProps, current: 0, completed: false, claimed: false, stacks: remainingStacks }
                      : m),
              }));
          } else {
              setMissionState(prev => ({
                  ...prev,
                  activeMissions: prev.activeMissions.map(m => m.id === mission.id ? { ...m, claimed: true } : m),
              }));
          }
          let msg = `+${formatCommaNumber(coinGain)} Coins & +${xpGain} XP`;
          if (isBoosted) msg += " (Boosted!)";
          setCelebrationMsg(msg);
          audioService.playWinBig();
      }
  };

  const handleFinishMission = (mission: Mission) => {
      const cost = Math.max(1, Math.ceil(mission.xpReward / 5));
      if (mission.completed) return;
      if (player.diamonds < cost) {
          setCelebrationMsg("Not enough gems to skip this mission!");
          return;
      }
      setPlayer(p => ({ ...p, diamonds: p.diamonds - cost }));
      setMissionState(prev => {
          const updated = prev.activeMissions.map(m => m.id === mission.id ? { ...m, current: m.target, completed: true } : m);
          return { ...prev, activeMissions: updated };
      });
      audioService.playWinSmall();
  };

  const handleClaimPassReward = (reward: PassReward) => {
      if (reward.claimed) return;
      if (reward.tier === 'PREMIUM' && !missionState.isPremium) return;
      let msg = "";
      if (reward.type === 'COINS') {
          const scaledValue = SCALE_COIN_REWARD(reward.value, player.level, MAX_BET_BY_LEVEL(player.level));
          setMissionState(prev => ({ ...prev, passRewards: prev.passRewards.map(r => r.id === reward.id ? { ...r, claimed: true, claimedValue: scaledValue } : r) }));
          setPlayer(p => ({ ...p, balance: p.balance + scaledValue }));
          msg = `+${formatCommaNumber(scaledValue)} Coins`;
      } else {
          setMissionState(prev => ({ ...prev, passRewards: prev.passRewards.map(r => r.id === reward.id ? { ...r, claimed: true } : r) }));
          if (reward.type === 'DIAMONDS') {
              setPlayer(p => ({ ...p, diamonds: p.diamonds + reward.value }));
              setGemsClaimedPopup(reward.value);
              msg = `+${reward.value} Gems`;
          } else if (reward.type === 'XP_BOOST') {
              setPlayer(p => ({ ...p, xpMultiplier: 2, xpBoostEndTime: Math.max(Date.now(), p.xpBoostEndTime) + 3600000 }));
              msg = `${reward.value}x XP Boost`;
          } else if (reward.type === 'CREDIT_BACK') {
              setPlayer(p => ({ ...p, packCredits: p.packCredits + reward.value }));
              msg = `+${reward.value} Card Packs`;
          } else if (reward.type === 'PICKS') {
              setQuest(q => ({ ...q, wildCredits: (q.wildCredits ?? 0) + reward.value }));
              msg = `+${reward.value} Picks`;
          } else if (reward.type === 'DICE_CREDITS') {
              setQuest(q => ({ ...q, diceCredits: (q.diceCredits ?? 0) + reward.value }));
              msg = `+${reward.value} Dice`;
          }
      }
      setCelebrationMsg(msg);
      audioService.playWinBig();
  };

  const handleClaimAllMissions = () => {
      const rewardsToClaim = missionState.passRewards.filter(r => 
          r.level <= missionState.passLevel && 
          !r.claimed && 
          (r.tier === 'FREE' || (r.tier === 'PREMIUM' && missionState.isPremium))
      );
      if (rewardsToClaim.length === 0) return;

      let totalCoins = 0;
      let totalDiamonds = 0;
      let totalPackCredits = 0;
      let totalPicks = 0;
      let totalDice = 0;
      let xpBoostApplied = false;

      rewardsToClaim.forEach(r => {
          if (r.type === 'COINS') totalCoins += SCALE_COIN_REWARD(r.value, player.level, MAX_BET_BY_LEVEL(player.level));
          else if (r.type === 'DIAMONDS') totalDiamonds += r.value;
          else if (r.type === 'CREDIT_BACK') totalPackCredits += r.value;
          else if (r.type === 'PICKS') totalPicks += r.value;
          else if (r.type === 'DICE_CREDITS') totalDice += r.value;
          else if (r.type === 'XP_BOOST') {
              setPlayer(p => ({ ...p, xpMultiplier: 2, xpBoostEndTime: Math.max(Date.now(), p.xpBoostEndTime) + 3600000 }));
              xpBoostApplied = true;
          }
      });

      setPlayer(p => ({
          ...p,
          balance: p.balance + totalCoins,
          diamonds: p.diamonds + totalDiamonds,
          packCredits: p.packCredits + totalPackCredits,
      }));
      if (totalPicks > 0) {
          setQuest(q => ({ ...q, wildCredits: (q.wildCredits ?? 0) + totalPicks }));
      }
      if (totalDice > 0) {
          setQuest(q => ({ ...q, diceCredits: (q.diceCredits ?? 0) + totalDice }));
      }
      
      const claimedMap = new Map(rewardsToClaim.map(r => [
          r.id,
          r.type === 'COINS' ? SCALE_COIN_REWARD(r.value, player.level, MAX_BET_BY_LEVEL(player.level)) : undefined,
      ]));
      setMissionState(prev => ({
          ...prev,
          passRewards: prev.passRewards.map(r => claimedMap.has(r.id)
              ? { ...r, claimed: true, ...(claimedMap.get(r.id) !== undefined ? { claimedValue: claimedMap.get(r.id) } : {}) }
              : r),
      }));

      let msgParts = [];
      if(totalCoins > 0) msgParts.push(`${formatCommaNumber(totalCoins)} Coins`);
      if(totalDiamonds > 0) msgParts.push(`${totalDiamonds} Gems`);
      if(msgParts.length > 0) setCelebrationMsg(`+${msgParts.join(', ')}`);
      else if(xpBoostApplied) setCelebrationMsg("XP Boost Activated!");
      
      audioService.playWinBig();
  };

  const handleBuyPass = () => {
      setShowNopay(true);
  };

  const handleBuyPassLevel = () => {
      if (player.diamonds >= 100 && missionState.passLevel < 50) {
          setPlayer(p => ({ ...p, diamonds: p.diamonds - 100 }));
          setMissionState(prev => {
              const newLevel = prev.passLevel + 1;
              const milestone = prev.isPremium && newLevel % 10 === 0;
              return {
                  ...prev,
                  passLevel: newLevel,
                  ...(milestone ? { passBoostMultiplier: 2, passBoostEndTime: Date.now() + 60 * 60 * 1000 } : {}),
              };
          });
          audioService.playLevelUp();
      }
  };

  const handleBuyPackCredits = (cost: number, credits: number) => {
      if (player.diamonds >= cost) {
          setPlayer(p => ({ ...p, diamonds: p.diamonds - cost, packCredits: p.packCredits + credits }));
          setCelebrationMsg(`+${credits} Pack Credits`);
          audioService.playWinBig();
      } else {
          setCelebrationMsg("Not Enough Gems!");
          audioService.playStoneBreak();
      }
  }

  const handleBuyPremiumPackCredits = (gemCost: number, credits: number) => {
      if (player.diamonds >= gemCost) {
          setPlayer(p => ({ ...p, diamonds: p.diamonds - gemCost, premiumPackCredits: (p.premiumPackCredits ?? 0) + credits }));
          setCelebrationMsg(`+${credits} Premium Packs`);
          audioService.playWinBig();
      } else {
          setCelebrationMsg("Not Enough Gems!");
          audioService.playStoneBreak();
      }
  };

  const handleBuyPackCreditsWithTokens = (amount: number, cost: number) => {
      if (player.tokens >= cost) {
          setPlayer(p => ({ ...p, tokens: p.tokens - cost, packCredits: p.packCredits + amount }));
          setCelebrationMsg(`+${amount} Pack Credits`);
          audioService.playWinBig();
      } else {
          setCelebrationMsg("Not Enough Tokens!");
          audioService.playStoneBreak();
      }
  }

  const RARITY_TIERS: string[][] = [
      ['RARE'],
      ['RARE','RARE'],
      ['RARE','RARE','RARE'],
      ['RARE','RARE','EPIC'],
      ['RARE','RARE','RARE','EPIC'],
      ['RARE','EPIC','EPIC'],
      ['RARE','RARE','EPIC','EPIC'],
      ['RARE','RARE','RARE','EPIC','EPIC'],
      ['RARE','RARE','RARE','EPIC','LEGENDARY'],
      ['RARE','RARE','RARE','EPIC','EPIC','LEGENDARY'],
      ['RARE','RARE','RARE','EPIC','EPIC','EPIC','LEGENDARY'],
  ];

  const handleBuyPack = (packId: string, drawCount: number): Card[] => {
      const isPremiumPack = packId === 'ultra';
      const totalCost = drawCount === 10 ? 9 : drawCount;
      const availableCredits = isPremiumPack ? (player.premiumPackCredits ?? 0) : player.packCredits;

      if (availableCredits >= totalCost) {
          if (isPremiumPack) {
              setPlayer(p => ({ ...p, premiumPackCredits: (p.premiumPackCredits ?? 0) - totalCost }));
          } else {
              setPlayer(p => ({ ...p, packCredits: p.packCredits - totalCost }));
          }
          
          const allDrawnCards: Card[] = [];
          let earnedTokens = 0;

          let tempDecks = decks.map(d => ({ ...d, cards: d.cards.map(c => ({...c})) }));
          const prevCompletedIds = decks.filter(d => d.isCompleted).map(d => d.gameId);
          const completedCount = prevCompletedIds.length;
          const tierGuarantees = [...(RARITY_TIERS[Math.min(completedCount, RARITY_TIERS.length - 1)])];
          const drawRarities: string[] = [];
          if (drawCount === 10) {
              for (const r of tierGuarantees) drawRarities.push(r);
              while (drawRarities.length < 10) drawRarities.push('COMMON');
              for (let i = drawRarities.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [drawRarities[i], drawRarities[j]] = [drawRarities[j], drawRarities[i]];
              }
          }

          for (let d = 0; d < drawCount; d++) {
              let rarityWeights = [0.70, 0.29, 0.01, 0.0];
              if (packId === 'ultra') rarityWeights = [0.30, 0.50, 0.19, 0.01];
              else if (packId === 'mega') rarityWeights = [0.30, 0.50, 0.19, 0.01];
              else if (packId === 'super') rarityWeights = [0.70, 0.29, 0.01, 0.0];
              if (drawRarities[d] === 'RARE') rarityWeights = [0, 1, 0, 0];
              else if (drawRarities[d] === 'EPIC') rarityWeights = [0, 0, 1, 0];
              else if (drawRarities[d] === 'LEGENDARY') rarityWeights = [0, 0, 0, 1];

              const allCardsInTemp: { deckId: string, cardIndex: number, card: Card }[] = [];
              tempDecks.forEach(d => d.cards.forEach((c, idx) => {
                  const st = String(c.symbolType);
                  if (!['TEN','JACK','QUEEN','KING','ACE'].includes(st) && !st.startsWith('JACKPOT') && st !== 'COIN') {
                      allCardsInTemp.push({ deckId: d.gameId, cardIndex: idx, card: c });
                  }
              }));
              
              const hasAnyCards = tempDecks.some(d => d.cards.some(c => c.count > 0));

              for(let i=0; i<1; i++) {
                  let pickObj: { deckId: string, cardIndex: number, card: Card };
                  if (hasAnyCards && Math.random() < 0.4) { 
                       const ownedCards = allCardsInTemp.filter(x => tempDecks.find(d => d.gameId === x.deckId)?.cards[x.cardIndex].count! > 0);
                       if (ownedCards.length > 0) pickObj = ownedCards[Math.floor(Math.random() * ownedCards.length)];
                       else pickObj = allCardsInTemp[Math.floor(Math.random() * allCardsInTemp.length)];
                  } else {
                      const r = Math.random();
                      let targetRarity: any = 'COMMON';
                      if (r < rarityWeights[3]) targetRarity = 'LEGENDARY';
                      else if (r < rarityWeights[3] + rarityWeights[2]) targetRarity = 'EPIC';
                      else if (r < rarityWeights[3] + rarityWeights[2] + rarityWeights[1]) targetRarity = 'RARE';
                      
                      const pool = allCardsInTemp.filter(item => item.card.rarity === targetRarity);
                      pickObj = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : allCardsInTemp[Math.floor(Math.random() * allCardsInTemp.length)];
                  }

                  const deck = tempDecks.find(d => d.gameId === pickObj.deckId)!;
                  const card = deck.cards[pickObj.cardIndex];
                  
                  let cardResult = { ...card, isNew: false, isDuplicate: false, duplicateCredits: 0 };

                  const alreadyOwns = card.count || 0;
                  
                  if (alreadyOwns > 0) {
                       const creditVal = DUPLICATE_CREDIT_VALUES[card.rarity] || 10;
                       earnedTokens += creditVal;
                       cardResult.isDuplicate = true;
                       cardResult.duplicateCredits = creditVal;
                  } else {
                       cardResult.isNew = true;
                  }
                  card.count += 1; 
                  deck.isCompleted = deck.cards.every(c => c.count > 0);
                  allDrawnCards.push(cardResult);
              }
          }

          setDecks(tempDecks);

          if (earnedTokens > 0) {
               setPlayer(p => ({ ...p, tokens: p.tokens + earnedTokens }));
          }
          
          // Check for newly completed decks
          const newCompleted = tempDecks.filter(d => d.isCompleted && !prevCompletedIds.includes(d.gameId));
          if (newCompleted.length > 0) {
              const names = newCompleted.map(d => d.gameName).join(', ');
              // Slight delay to allow pack animation to finish or show simultaneously
              setTimeout(() => {
                  setCelebrationMsg(`${names} Deck Completed!`);
                  audioService.playWinBig();
              }, 1500);
          }
          
          return allDrawnCards;
      } else {
          setCelebrationMsg("Not enough Pack Credits!");
          return [];
      }
  };

  const handleClaimDeckReward = (deckId: string, reward: number) => {
      setDecks(prev => prev.map(d => d.gameId === deckId ? { ...d, rewardClaimed: true } : d));
      setPlayer(p => ({ ...p, balance: p.balance + reward }));
      setCelebrationMsg(`+${formatCommaNumber(reward)} Coins`);
      audioService.playWinBig();
  };

  const handleCardDrop = useCallback((rarity: 'COMMON' | 'RARE') => {
      setDecks(prev => {
          const allCards: { deckIdx: number; cardIdx: number; name: string }[] = [];
          prev.forEach((deck, di) => {
              deck.cards.forEach((card, ci) => {
                  if (card.rarity === rarity) allCards.push({ deckIdx: di, cardIdx: ci, name: card.name });
              });
          });
          if (allCards.length === 0) return prev;
          const pick = allCards[Math.floor(Math.random() * allCards.length)];
          setTimeout(() => {
              if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
              setActiveToast({ type: 'CARD', rarity, cardName: pick.name });
              toastTimerRef.current = setTimeout(() => setActiveToast(null), 2000);
          }, 0);
          return prev.map((deck, di) => {
              if (di !== pick.deckIdx) return deck;
              const newCards = deck.cards.map((card, ci) =>
                  ci !== pick.cardIdx ? card : { ...card, count: card.count + 1 }
              );
              return { ...deck, cards: newCards, isCompleted: newCards.every(c => c.count > 0) };
          });
      });
  }, []);

  const getHoldWinCoinValue = (bet: number): number => {
      const roll = Math.random();
      if (roll < 0.40) return bet * 1;
      if (roll < 0.60) return bet * 2;
      if (roll < 0.73) return bet * 3;
      if (roll < 0.83) return bet * 5;
      if (roll < 0.91) return bet * 10;
      if (roll < 0.96) return bet * 20;
      if (roll < 0.99) return bet * 50;
      return bet * 100;
  };

  const HW_JP_IDX: Record<string, number> = { MINI: 0, MINOR: 1, MAJOR: 2, MEGA: 3, GRAND: 4 };

  const rollHoldWinJackpot = (): string | null => {
      const r = Math.random();
      if (r < 0.001)  return 'GRAND';   // 0.1% (1% of jackpot ~10% chance)
      if (r < 0.011)  return 'MEGA';    // 1% (10% of jackpot ~10% chance)
      if (r < 0.031)  return 'MAJOR';   // 2%
      if (r < 0.061)  return 'MINOR';   // 3%
      if (r < 0.111)  return 'MINI';    // 5%
      return null;
  };

  // Cascade: remove winning cells and fill from top with new random symbols
  const compactGrid = (currentGrid: SymbolType[][], winCells: {col: number, row: number}[]): { grid: SymbolType[][], newCells: boolean[][] } => {
      const newCells: boolean[][] = [];
      const grid = currentGrid.map((col, c) => {
          const winRows = new Set(winCells.filter(wc => wc.col === c).map(wc => wc.row));
          const remaining = col.filter((_, r) => !winRows.has(r));
          const newCount = col.length - remaining.length;
          const newSyms = Array(newCount).fill(null).map(() => {
              // Arctic: wild chance on falling cells (boosted in free spins)
              const arcticCascadeWildChance = freeSpinsRemaining > 0 ? 0.24 : 0.17;
              if (selectedGame.theme === 'ARCTIC' && c >= 1 && c <= 3 && Math.random() < arcticCascadeWildChance) {
                  return SymbolType.WILD;
              }
              let sym: SymbolType;
              do { sym = getRandomSymbol(false, 0); }
              while (sym === SymbolType.SCATTER || String(sym).startsWith('JACKPOT') || sym === SymbolType.COIN);
              return sym;
          });
          newCells[c] = [...Array(newCount).fill(true), ...Array(remaining.length).fill(false)];
          return [...newSyms, ...remaining];
      });
      return { grid, newCells };
  };

  // Pure payline win evaluation (used for cascade steps)
  const computeGridWins = (finalGrid: SymbolType[][], bet: number): {
      payout: number; winningLines: number[]; winningCells: {col: number, row: number}[];
  } => {
      let totalPayout = 0;
      const winningLines: number[] = [];
      const winningCells: {col: number, row: number}[] = [];
      const currentPaylines = GET_PAYLINES(selectedGame.rows, selectedGame.reels);
      currentPaylines.forEach(line => {
          const syms = line.indices.map((row, col) => (finalGrid[col]?.[row]) || SymbolType.TEN);
          let matchLen = 1, matchSym = syms[0];
          for (let i = 1; i < syms.length; i++) {
              const s = syms[i];
              if (s === matchSym || s === SymbolType.WILD || matchSym === SymbolType.WILD) {
                  if (matchSym === SymbolType.WILD && s !== SymbolType.WILD) matchSym = s;
                  matchLen++;
              } else break;
          }
          if (matchLen >= 3) {
              const cfg = GET_SYMBOLS(selectedGame.theme)[matchSym];
              if (cfg) {
                  const lenMult = matchLen === 4 ? 2.0 : matchLen >= 5 ? 4.0 : 0.5;
                  const lineWin = Math.floor(bet * (cfg.value / 3) * lenMult);
                  if (lineWin > 0) {
                      totalPayout += lineWin;
                      winningLines.push(line.id);
                      for (let i = 0; i < matchLen; i++) winningCells.push({ col: i, row: line.indices[i] });
                  }
              }
          }
      });
      return { payout: totalPayout, winningLines, winningCells };
  };

  runCascadeRef.current = (currentCascadeGrid: SymbolType[][], mult: number, accWin: number, winCells: {col: number, row: number}[]) => {
      const { grid: newGrid, newCells } = compactGrid(currentCascadeGrid, winCells);
      setCascadeGrid(newGrid);
      setCascadeNewCells(newCells);
      setCascadeDissolving(false);
      const bet = currentBetRef.current;
      const result = computeGridWins(newGrid, bet);
      if (result.payout > 0) {
          const inFreeSpins = freeSpinsRemaining > 0;
          const effectiveMult = inFreeSpins ? mult : 1;
          const cascadeWin = result.payout * effectiveMult;
          const newAccWin = accWin + cascadeWin;
          setPlayer(p => ({ ...p, balance: p.balance + cascadeWin }));
          if (totalFreeSpins > 0) setFreeSpinTotalWin(p => p + cascadeWin);
          setCascadeMultiplier(effectiveMult);
          setCascadeTotalWin(newAccWin);
          setWinData({ payout: newAccWin, winningLines: result.winningLines, winningCells: result.winningCells, isBigWin: false, scattersFound: 0, winType: undefined });
          // Show new grid with drop-in, then dissolve winners before next cascade
          const nextMult = inFreeSpins ? mult + 1 : 1;
          setTimeout(() => {
              setCascadeDissolving(true);
              setTimeout(() => runCascadeRef.current!(newGrid, nextMult, newAccWin, result.winningCells), 350);
          }, 500);
      } else {
          // No further wins — keep cascade grid visible until next spin(); clear it there
          const winTier = getWinTier(accWin, bet);
          setWinData({ payout: accWin, winningLines: [], winningCells: [], isBigWin: !!winTier, scattersFound: 0, winType: winTier || undefined });
          setCascadeMultiplier(1);
          setCascadeTotalWin(0);
          setTimeout(() => {
              if (winTier) {
                  audioService.playWinBig();
                  setShowWinPopup(true);
                  setStatus(GameStatus.WIN_ANIMATION);
              } else if (accWin > 0) {
                  audioService.playWinSmall();
                  setStatus(GameStatus.WIN_ANIMATION);
                  setTimeout(() => setStatus(GameStatus.IDLE), 500);
              } else {
                  setStatus(GameStatus.IDLE);
              }
          }, 500);
      }
  };

  const generateSmartGrid = useCallback(() => {
      const cols = selectedGame.reels;
      const rows = selectedGame.rows;
      const isFreeSpin = freeSpinsRemaining > 0;
      const newGrid: SymbolType[][] = [];
      const isSmallGrid = cols <= 3;
      let pirateShipSeeded = false;

      // EGYPT Hold and Win: generate respin grid keeping locked cells as COIN
      if (selectedGame.theme === 'EGYPT' && holdWinRef.current.active) {
          const lockedGrid = holdWinRef.current.lockedGrid;
          // Base 50% chance any coins appear; decreases 15% for each non-productive respin (last slot ~1%)
          const respinsUsed = 3 - holdWinRef.current.respins; // 0 on first respin, 1 on second, etc.
          const baseCoinChance = respinsUsed >= 2 ? 0.005 : Math.max(0, 0.50 - respinsUsed * 0.15);

          // Collect empty cell positions
          const emptyCells: {c: number, r: number}[] = [];
          for (let c = 0; c < cols; c++) {
              for (let r = 0; r < rows; r++) {
                  if (!lockedGrid[c]?.[r]) emptyCells.push({ c, r });
              }
          }

          // Determine how many new coins to place
          const coinCellKeys = new Set<number>();
          if (emptyCells.length > 0 && Math.random() < baseCoinChance) {
              const cr = Math.random();
              const count = cr < 0.60 ? 1 : cr < 0.90 ? 2 : 3; // ~30% 1-coin, ~15% 2-coin, ~5% 3-coin (of baseCoinChance)
              const shuffled = [...emptyCells].sort(() => Math.random() - 0.5);
              for (let i = 0; i < Math.min(count, shuffled.length); i++) {
                  coinCellKeys.add(shuffled[i].c * rows + shuffled[i].r);
              }
          }

          for (let c = 0; c < cols; c++) {
              const col: SymbolType[] = [];
              for (let r = 0; r < rows; r++) {
                  if (lockedGrid[c]?.[r]) {
                      col.push(SymbolType.COIN);
                  } else if (coinCellKeys.has(c * rows + r)) {
                      col.push(SymbolType.COIN);
                  } else {
                      let sym = getRandomSymbol(false, spinsWithoutBonus);
                      while (sym === SymbolType.SCATTER || sym === SymbolType.COIN) {
                          sym = getRandomSymbol(false, spinsWithoutBonus);
                      }
                      col.push(sym);
                  }
              }
              newGrid.push(col);
          }
          return newGrid;
      }

      for(let c=0; c<cols; c++) {
          const colData: SymbolType[] = [];
          for(let r=0; r<rows; r++) {
              let sym = getRandomSymbol(isFreeSpin, spinsWithoutBonus);
              while ((selectedGame.theme === 'PIGGY' || selectedGame.theme === 'LEPRECHAUN') && sym === SymbolType.SCATTER) {
                  sym = getRandomSymbol(isFreeSpin, spinsWithoutBonus);
              }
              if (c === 2) {
                  const highPaying = [SymbolType.GRAPE, SymbolType.BELL, SymbolType.BAR, SymbolType.SEVEN, SymbolType.CHERRY];
                  if (highPaying.includes(sym) && Math.random() < 0.5) {
                      const lowPaying = [SymbolType.TEN, SymbolType.JACK, SymbolType.QUEEN, SymbolType.KING, SymbolType.ACE];
                      sym = lowPaying[Math.floor(Math.random() * lowPaying.length)];
                  }
              }
              colData.push(sym);
          }
          newGrid.push(colData);
      }

      if (Math.random() < 0.00001) {
           for(let c=0; c<cols; c++) {
               for(let r=0; r<rows; r++) {
                   newGrid[c][r] = SymbolType.WILD;
               }
           }
           setCelebrationMsg("ULTIMATE WILD SCREEN!");
           return newGrid;
      }
      
      let megaMatchActive = false;
      let megaMatchSymbol = SymbolType.TEN;
      const isNeon = selectedGame.theme === 'NEON';
      // 3×3 grids get 80% less same-cell stacks (mega match) + 20% less wilds
      const smallGridPenalty = isSmallGrid ? 0.20 : 1.0;
      const megaMatchProb = isFreeSpin ? 0.34 * smallGridPenalty : (isNeon ? 0.08 : 0.16) * smallGridPenalty;
      
      if (Math.random() < megaMatchProb) { 
            const targets = [SymbolType.GRAPE, SymbolType.BELL, SymbolType.BAR, SymbolType.CHERRY, SymbolType.SEVEN];
            megaMatchSymbol = targets[Math.floor(Math.random() * targets.length)];
            let active = true;
            if ([SymbolType.BAR, SymbolType.CHERRY, SymbolType.SEVEN].includes(megaMatchSymbol)) {
                const cancelChance = isFreeSpin ? 0.30 : 0.85;
                if (Math.random() < cancelChance) active = false;
            }
            if (active) megaMatchActive = true;
      }
      // NEON, PIGGY, LEPRECHAUN, EGYPT, ARCTIC, PIRATE, SPACE, and CANDY never use full-column same-symbol matches
      if (['NEON','PIGGY','LEPRECHAUN','EGYPT','ARCTIC','PIRATE','SPACE','CANDY'].includes(selectedGame.theme)) megaMatchActive = false;

      for(let c=0; c<cols; c++) {
           let eventTriggered = false;
           if (megaMatchActive && (cols > 3 ? (c >= 1 && c <= 3) : true)) {
                for(let r=0; r<rows; r++) newGrid[c][r] = megaMatchSymbol;
                eventTriggered = true;
           }
           
           if (!eventTriggered) {
               let wildStackChance = 0.0;
               const wildMult = isFreeSpin ? 1.20 : (isNeon ? 0.80 : 1.0);
               if (cols >= 5) {
                    if (c === 2) wildStackChance = 0.084 * wildMult;
                    if (c === 3) wildStackChance = 0.112 * wildMult;
                    if (c === 4) wildStackChance = 0.168 * wildMult;
               } else if (isSmallGrid) {
                   // 3×3: base chances × 0.8 (20% less wild column spawns)
                   if (c === 1) wildStackChance = 0.042 * wildMult * 0.8;
                   if (c === 2) wildStackChance = 0.056 * wildMult * 0.8;
               } else {
                   if (c === 1) wildStackChance = 0.105 * wildMult;
                   if (c === 2) wildStackChance = 0.14 * wildMult;
               }
               // PIGGY/LEPRECHAUN: 20% higher wild rate + extend to extra columns
               if (selectedGame.theme === 'PIGGY' || selectedGame.theme === 'LEPRECHAUN') {
                   if (c === 5) wildStackChance = 0.21 * wildMult;
                   if (c === 6) wildStackChance = 0.252 * wildMult;
                   wildStackChance *= 1.2;
               }
               // DRAGON: no full-column wild stacks, only single-cell wilds
               if (selectedGame.theme === 'DRAGON') wildStackChance = 0;

               // DRAGON: scatter individual single-cell wilds across all columns
               if (selectedGame.theme === 'DRAGON' && !eventTriggered) {
                   for (let r = 0; r < rows; r++) {
                       if (newGrid[c][r] !== SymbolType.WILD && Math.random() < 0.04) {
                           newGrid[c][r] = SymbolType.WILD;
                       }
                   }
               }

               if (c === 0) {
                    for(let r=0; r<rows; r++) {
                        if (newGrid[c][r] === SymbolType.WILD) {
                            if (Math.random() < 0.98) {
                                 newGrid[c][r] = getRandomSymbol(isFreeSpin, spinsWithoutBonus);
                                 if(newGrid[c][r] === SymbolType.WILD) newGrid[c][r] = SymbolType.TEN; 
                            }
                        }
                        if (Math.random() < 0.005) newGrid[c][r] = SymbolType.WILD;
                    }
               } else {
                    if (Math.random() < wildStackChance) {
                       eventTriggered = true;
                       const typeRoll = Math.random();
                       let wildsCount = rows; 
                       for(let i=0; i<wildsCount; i++) {
                           newGrid[c][i] = SymbolType.WILD;
                       }
                    }
               }
           }
           
           if (!eventTriggered) {
               const stackChance = isSmallGrid ? 0.01 : 0.05;
               if (Math.random() < stackChance) {
                   const colorRoll = Math.random();
                   let chosenSymbol = SymbolType.GRAPE;
                   if (colorRoll < 0.40) chosenSymbol = SymbolType.GRAPE; 
                   else if (colorRoll < 0.60) chosenSymbol = SymbolType.BAR; 
                   else if (colorRoll < 0.80) chosenSymbol = SymbolType.CHERRY; 
                   else if (colorRoll < 0.90) chosenSymbol = SymbolType.SEVEN; 
                   else chosenSymbol = SymbolType.BELL; 

                   eventTriggered = true;
                   for(let i=0; i<rows; i++) {
                       newGrid[c][i] = chosenSymbol;
                   }
               }
           }
      }

      // PIRATE: ~4% base-game chance for a Ghost Ship to board on the rightmost reel.
      // During free spins, Ghost Ship is GUARANTEED — no jackpot symbols during walk.
      // 20% chance of a second Ghost Ship boarding 1-3 cols to the left of the first.
      if (selectedGame.theme === 'PIRATE' && !pirateWalkRef.current.active) {
          if (isFreeSpin || freeSpinsWon > 0 || Math.random() < 0.04) {
              const lastCol = cols - 1;
              for (let r = 0; r < rows; r++) newGrid[lastCol][r] = SymbolType.WILD;
              if (isFreeSpin && cols >= 4 && Math.random() < 0.70) {
                  // Ship 2 starts off-screen to the right; distance 1-2 cols behind ship 1
                  pirateDualShipRef.current = true;
                  pirateShip2OffsetRef.current = 1 + Math.floor(Math.random() * 2); // 1 or 2
              }
              pirateShipSeeded = true;
              pirateTriggerArmedRef.current = true;
          }
      }

      // NEON uses jackpot cells instead of scatters; PIGGY uses coin cells.
      // PIRATE skips scatter injection while a Ghost Ship is boarding or walking (avoids double features).
      if (selectedGame.theme !== 'NEON' && selectedGame.theme !== 'PIGGY'
          && !pirateShipSeeded && !(selectedGame.theme === 'PIRATE' && pirateWalkRef.current.active)) {
          const scatterRoll = Math.random() * 100;
          let targetScatters = 0;
          // 3×3 slots: 20% less free spin chance (raise thresholds so fewer scatters spawn)
          // Arctic: 1&2-scatter thresholds lowered by 10%; retrigger (s3) lowered extra 5% during free spins
          const isArctic = selectedGame.theme === 'ARCTIC';
          const s1 = isSmallGrid ? 68 : (isArctic ? 50 : 60);
          const s2 = isSmallGrid ? 85.6 : (isArctic ? 72 : 82);
          const s3 = isSmallGrid ? 99.2 : 99.0;
          const s4 = isSmallGrid ? 99.8 : 99.75;
          if (scatterRoll >= s1) targetScatters = 1;
          if (scatterRoll >= s2) targetScatters = 2;
          if (scatterRoll >= s3) targetScatters = 3;
          if (scatterRoll >= s4) targetScatters = 4;

          if (selectedGame.theme === 'DRAGON') {
              if (scatterRoll >= 99.25) targetScatters = 4;
          }
          targetScatters = Math.min(targetScatters, cols);

          let currentScatters = 0;
          const scatterPositions: {c: number, r: number}[] = [];

          for(let c=0; c<cols; c++) {
              for(let r=0; r<rows; r++) {
                  if(newGrid[c][r] === SymbolType.SCATTER) {
                      currentScatters++;
                      scatterPositions.push({c, r});
                  }
              }
          }

          if (currentScatters < targetScatters) {
              let needed = targetScatters - currentScatters;
              let attempts = 0;
              while(needed > 0 && attempts < 200) {
                  const c = Math.floor(Math.random() * cols);
                  const r = Math.floor(Math.random() * rows);
                  const canOverwrite = newGrid[c][r] !== SymbolType.SCATTER && (newGrid[c][r] !== SymbolType.WILD || attempts > 100);

                  if (canOverwrite) {
                      const hasScatterInCol = newGrid[c].includes(SymbolType.SCATTER);
                      if (!hasScatterInCol) {
                          newGrid[c][r] = SymbolType.SCATTER;
                          needed--;
                      }
                  }
                  attempts++;
              }
          }
      }

      // EGYPT: inject coin symbols (1-6 cells) in base game; 6+ triggers Hold and Win
      if (selectedGame.theme === 'EGYPT' && !isFreeSpin) {
          const coinRoll = Math.random();
          let targetCoins = 0;
          if (coinRoll >= 0.994)      targetCoins = 6;
          else if (coinRoll >= 0.979) targetCoins = 5;
          else if (coinRoll >= 0.949) targetCoins = 4;
          else if (coinRoll >= 0.869) targetCoins = 3;
          else if (coinRoll >= 0.739) targetCoins = 2;
          else if (coinRoll >= 0.489) targetCoins = 1;
          if (targetCoins > 0) {
              const eligible: {c: number; r: number}[] = [];
              for (let c = 0; c < cols; c++) {
                  for (let r = 0; r < rows; r++) {
                      const s = newGrid[c][r];
                      if (s !== SymbolType.SCATTER && s !== SymbolType.WILD && !String(s).startsWith('JACKPOT')) {
                          eligible.push({c, r});
                      }
                  }
              }
              for (let i = eligible.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
              }
              for (let i = 0; i < Math.min(targetCoins, eligible.length); i++) {
                  newGrid[eligible[i].c][eligible[i].r] = SymbolType.COIN;
              }
          }
          // Replace any scatter symbols with a plain low symbol
          for (let c = 0; c < cols; c++) {
              for (let r = 0; r < rows; r++) {
                  if (newGrid[c][r] === SymbolType.SCATTER) newGrid[c][r] = SymbolType.TEN;
              }
          }
      }

      // NEON: replace any non-NEON symbols (coin, jackpot types) with NEON_WEIGHTS random
      if (selectedGame.theme === 'NEON') {
          const nwNoScatter = NEON_WEIGHTS.filter(w => w.type !== SymbolType.SCATTER);
          const nwNoScatterSum = nwNoScatter.reduce((a, w) => a + w.weight, 0);
          const pickNeonNoScatter = () => {
              let rand = Math.random() * nwNoScatterSum;
              for (const w of nwNoScatter) { rand -= w.weight; if (rand <= 0) return w.type; }
              return SymbolType.TEN;
          };
          // Scatter only allowed on column 2 (3rd reel)
          for (let c = 0; c < cols; c++) {
              for (let r = 0; r < rows; r++) {
                  if (c !== 2 && newGrid[c][r] === SymbolType.SCATTER) {
                      newGrid[c][r] = pickNeonNoScatter();
                  }
              }
          }
      }

      // ARCTIC: no jackpot or coin symbols — replace them with regular symbols
      // Then 10% chance to spawn a single wild on column 2, 3, or 4 (1-indexed)
      if (selectedGame.theme === 'ARCTIC') {
          for (let c = 0; c < cols; c++) {
              for (let r = 0; r < rows; r++) {
                  while (String(newGrid[c][r]).startsWith('JACKPOT') || newGrid[c][r] === SymbolType.COIN) {
                      newGrid[c][r] = getRandomSymbol(isFreeSpin, spinsWithoutBonus);
                  }
              }
          }
          // Wild chances: free spins heavily boosted
          const fullColChance = isFreeSpin ? 0.20 : 0.02;
          const singleWildChance = isFreeSpin ? 0.60 : 0.17;
          if (Math.random() < fullColChance) {
              for (let r = 0; r < rows; r++) {
                  if (newGrid[2]?.[r] !== SymbolType.SCATTER) newGrid[2][r] = SymbolType.WILD;
              }
          } else if (Math.random() < singleWildChance) {
              const wildCol = 1 + Math.floor(Math.random() * 3);
              const wildRow = Math.floor(Math.random() * rows);
              if (newGrid[wildCol]?.[wildRow] !== SymbolType.SCATTER) {
                  newGrid[wildCol][wildRow] = SymbolType.WILD;
              }
          }
      }

      // PIGGY / LEPRECHAUN: inject coin symbols (1-6 cells), 6+ triggers free spins
      if (selectedGame.theme === 'PIGGY' || selectedGame.theme === 'LEPRECHAUN') {
          const coinRoll = Math.random();
          let targetCoins = 0;
          if (coinRoll >= 0.989)     targetCoins = 6;  // ~1.1% → free spins
          else if (coinRoll >= 0.956) targetCoins = 5; // ~3.3%
          else if (coinRoll >= 0.901) targetCoins = 4; // ~5.5%
          else if (coinRoll >= 0.799) targetCoins = 3; // ~10.2%
          else if (coinRoll >= 0.617) targetCoins = 2; // ~18.2%
          else if (coinRoll >= 0.25)  targetCoins = 1; // ~36.7%
          // 0-24.9% → 0 coins (increased spawn rate ~10%)
          if (targetCoins > 0) {
              const eligible: {c: number; r: number}[] = [];
              for (let c = 0; c < cols; c++) {
                  for (let r = 0; r < rows; r++) {
                      const s = newGrid[c][r];
                      if (s !== SymbolType.SCATTER && s !== SymbolType.WILD && !String(s).startsWith('JACKPOT')) {
                          eligible.push({c, r});
                      }
                  }
              }
              for (let i = eligible.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
              }
              for (let i = 0; i < Math.min(targetCoins, eligible.length); i++) {
                  newGrid[eligible[i].c][eligible[i].r] = SymbolType.COIN;
              }
          }
      }

      // SPACE: Wild Planet reels. Base game ~6% drifts one middle reel fully WILD.
      // During Supernova free spins, reels can align fully WILD (≈55% one reel, 15% two).
      if (selectedGame.theme === 'SPACE') {
          if (isFreeSpin) {
              const roll = Math.random();
              let numWildReels = 0;
              if (roll < 0.15) numWildReels = 2;
              else if (roll < 0.55) numWildReels = 1;
              const chosen = new Set<number>();
              let guard = 0;
              while (chosen.size < numWildReels && guard < 30) {
                  chosen.add(Math.floor(Math.random() * cols));
                  guard++;
              }
              chosen.forEach(wc => {
                  for (let r = 0; r < rows; r++) {
                      if (newGrid[wc][r] !== SymbolType.SCATTER) newGrid[wc][r] = SymbolType.WILD;
                  }
              });
          } else if (Math.random() < 0.06) {
              const wc = 1 + Math.floor(Math.random() * Math.min(3, cols - 1));
              for (let r = 0; r < rows; r++) {
                  if (newGrid[wc][r] !== SymbolType.SCATTER) newGrid[wc][r] = SymbolType.WILD;
              }
          }
      }

      // CANDY: Wild Wheel free spins. The wheel-picked config places persistent "switching" wilds
      // that re-roll their positions each free spin. Single wilds = N wild cells; column wilds = N full WILD reels.
      if (selectedGame.theme === 'CANDY') {
          candyPendingColsRef.current = [];
          if (isFreeSpin && candyWildConfigRef.current) {
              const cfg = candyWildConfigRef.current;
              if (cfg.mode === 'column') {
                  const chosen = new Set<number>();
                  let guard = 0;
                  while (chosen.size < Math.min(cfg.count, cols) && guard < 80) { chosen.add(Math.floor(Math.random() * cols)); guard++; }
                  const placements: { col: number; seedRow: number }[] = [];
                  candySingleWildsRef.current = [];
                  chosen.forEach(c => {
                      const seedRow = Math.floor(Math.random() * rows);
                      placements.push({ col: c, seedRow });
                      for (let r = 0; r < rows; r++) newGrid[c][r] = SymbolType.WILD;
                  });
                  candyPendingColsRef.current = placements;
              } else {
                  candyPendingColsRef.current = [];
                  const placed: { c: number; r: number }[] = [];
                  let guard = 0;
                  while (placed.length < cfg.count && guard < 200) {
                      const c = Math.floor(Math.random() * cols), r = Math.floor(Math.random() * rows);
                      if (newGrid[c][r] !== SymbolType.SCATTER && !placed.some(p => p.c === c && p.r === r)) {
                          newGrid[c][r] = SymbolType.WILD;
                          placed.push({ c, r });
                      }
                      guard++;
                  }
                  candySingleWildsRef.current = placed.map(p => ({ col: p.c, row: p.r }));
              }
          }
      }

      // Jackpot cell injection: during free spins only, except ARCTIC, NEON, and PIRATE (Ghost Ship feature uses no jackpots)
      if (freeSpinsRemaining > 0 && selectedGame.theme !== 'ARCTIC' && selectedGame.theme !== 'NEON' && selectedGame.theme !== 'PIRATE') {
          // CANDY gets 50% reduced jackpot spawn rates
          const jpScale = selectedGame.theme === 'CANDY' ? 0.5 : 1.0;
          const JP_SPAWN = [
              { type: SymbolType.JACKPOT_MINI,  prob: 0.072 * jpScale },
              { type: SymbolType.JACKPOT_MINOR, prob: 0.048 * jpScale },
              { type: SymbolType.JACKPOT_MAJOR, prob: 0.015 * jpScale },
              { type: SymbolType.JACKPOT_MEGA,  prob: 0.005 * jpScale },
              { type: SymbolType.JACKPOT_GRAND, prob: 0.0015 * jpScale },
          ];
          const jpCellPositions: { c: number; r: number }[] = [];
          for (let c = 0; c < cols; c++) {
              for (let r = 0; r < rows; r++) {
                  if (newGrid[c][r] === SymbolType.SCATTER || newGrid[c][r] === SymbolType.WILD) continue;
                  if (jpCellPositions.length >= 4) break;
                  for (const jp of JP_SPAWN) {
                      if (Math.random() < jp.prob) {
                          newGrid[c][r] = jp.type;
                          jpCellPositions.push({ c, r });
                          break;
                      }
                  }
              }
              if (jpCellPositions.length >= 4) break;
          }
          // 50% chance: upgrade one random jackpot cell to GRAND or MEGA
          if (jpCellPositions.length > 0 && Math.random() < 0.5) {
              const pick = jpCellPositions[Math.floor(Math.random() * jpCellPositions.length)];
              newGrid[pick.c][pick.r] = Math.random() < 0.5 ? SymbolType.JACKPOT_GRAND : SymbolType.JACKPOT_MEGA;
          }
      }

      // PIRATE: while the Ghost Ship is walking, force all active ship columns to full WILD stacks.
      if (selectedGame.theme === 'PIRATE' && pirateWalkRef.current.active) {
          const shipCol = pirateWalkRef.current.shipCol;
          if (shipCol >= 0 && shipCol < cols) {
              for (let r = 0; r < rows; r++) newGrid[shipCol][r] = SymbolType.WILD;
          }
          const ship2Col = pirateWalkRef.current.ship2Col;
          if (ship2Col >= 0 && ship2Col < cols) {
              for (let r = 0; r < rows; r++) newGrid[ship2Col][r] = SymbolType.WILD;
          }
      }

      return newGrid;
  }, [selectedGame, freeSpinsRemaining, freeSpinsWon, spinsWithoutBonus]);

  const handleQuestModeSelect = (mode: 'NONE' | 'WILD' | 'DICE') => {
        setQuest(q => ({ ...q, activeGame: mode }));
  };

  const handleStageComplete = (gameType: 'WILD' | 'DICE', bonusCoins: number, bonusDiamonds: number) => {
      setPlayer(p => ({ ...p, balance: p.balance + bonusCoins, diamonds: p.diamonds + bonusDiamonds }));

      if (gameType === 'WILD') {
          setQuest(q => ({ ...q, wildStage: q.wildStage + 1, wildGrid: [] }));
      } else {
          setQuest(q => ({ ...q, diceStage: q.diceStage + 1, dicePosition: 0 }));
      }
  };

  // Handler to update Wild Grid state from modal to maintain persistence
  const handleWildGridUpdate = (newGrid: WildGridCell[]) => {
      setQuest(q => ({ ...q, wildGrid: newGrid }));
  };

  const handleDiceRoll = (roll: number, newPosition: number, rewards: MiniGameReward[], isFinish: boolean) => {
      setQuest(q => ({ ...q, diceCredits: Math.max(0, q.diceCredits - 1), dicePosition: newPosition }));
      const msgParts: string[] = [];
      let totalCoins = 0;
      let totalGems = 0;
      let totalPacks = 0;
      let diceGained = 0;
      rewards.forEach(r => {
          if (r.type === 'COINS' || r.type === 'STAR') totalCoins += r.value;
          else if (r.type === 'DIAMONDS') totalGems += r.value;
          else if (r.type === 'PACKS') totalPacks += r.value;
          else if (r.type === 'PICKS') diceGained += r.value;
      });
      if (totalCoins > 0) { setPlayer(p => ({ ...p, balance: p.balance + totalCoins })); msgParts.push(`+${formatCommaNumber(totalCoins)} Coins`); }
      if (totalGems > 0) { setPlayer(p => ({ ...p, diamonds: p.diamonds + totalGems })); msgParts.push(`+${totalGems} 💎`); }
      if (totalPacks > 0 && player.level >= 30) {
          const premChance = Math.min(0.20, 0.10 + Math.floor(player.level / 5) * 0.01);
          if (Math.random() < premChance) {
              setPlayer(p => ({ ...p, premiumPackCredits: (p.premiumPackCredits ?? 0) + totalPacks }));
              msgParts.push(`+${totalPacks} 🎴`);
          } else {
              setPlayer(p => ({ ...p, packCredits: p.packCredits + totalPacks }));
              msgParts.push(`+${totalPacks} 🃏`);
          }
      }
      if (diceGained > 0) { setQuest(q => ({ ...q, diceCredits: q.diceCredits + diceGained })); msgParts.push(`+${diceGained} 🎲`); }
      if (isFinish) {
          const bonusCoins = Math.floor(MAX_BET_BY_LEVEL(player.level) * (3 + 0.1 * quest.diceStage));
          setPlayer(p => ({ ...p, balance: p.balance + bonusCoins }));
          const currentStage = quest.diceStage;
          setQuest(q => ({ ...q, diceStage: q.diceStage + 1, dicePosition: 0 }));
          setStageCompletePopup({ gameType: 'DICE', stage: currentStage, coins: bonusCoins, diamonds: 0 });
      }
      if (msgParts.length > 0) { setCelebrationMsg(msgParts.join(' · ')); audioService.playWinBig(); }
  };

  const spin = useCallback(() => {
    if (status !== GameStatus.IDLE && status !== GameStatus.FREE_SPIN_INTRO) return;
    if (reelTransitioning) return;
    if (activeModal !== 'NONE') return;
    if (showFreeSpinsPopup) return;
    if (showFreeSpinSummary) return;
    if (showCandyRoulette) return;
    if (dragonPotShaking || showDragonTriggerPopup) return;
    if (showEgyptHoldWinPopup) return;

    // Auto max bet: snap to highest available bet before spinning
    if (autoMaxBet && freeSpinsRemaining === 0 && !holdWinRef.current.active && !pirateWalkRef.current.active) {
        setBetIndex(availableBets.length - 1);
    }
    const currentBet = autoMaxBet && freeSpinsRemaining === 0 && !holdWinRef.current.active && !pirateWalkRef.current.active
        ? availableBets[availableBets.length - 1]
        : availableBets[betIndex];
    const isFreeSpin = freeSpinsRemaining > 0;
    const isHoldWinRespin = holdWinRef.current.active;
    const isPirateWalk = pirateWalkRef.current.active;

    // Insufficient Funds Check
    if (!isFreeSpin && !isHoldWinRespin && !isPirateWalk && player.balance < currentBet) {
      if (player.balance < 10000) {
          setShowBankruptcy(true);
      } else {
          setCelebrationMsg("Not Enough Coins!");
          audioService.playStoneBreak();
      }
      setPlayer(p => ({ ...p, autoSpin: false })); 
      return;
    }

    if (!isFreeSpin && !isHoldWinRespin && !isPirateWalk) {
      // Piggy Bank Logic: 5% of Bet (10% if VIP), Capped. Only saves if Level >= 5.
      if (player.level >= 5) {
          const savings = currentBet * (player.isVip ? 0.10 : 0.05);
          const cap = MAX_BET_BY_LEVEL(player.level) * 5;
          setPlayer(prev => ({ 
              ...prev, 
              balance: prev.balance - currentBet,
              piggyBank: prev.piggyBank >= cap ? prev.piggyBank : Math.min(prev.piggyBank + savings, cap)
          }));
          // Trigger Piggy Glow
          setPiggyGlow(true);
          setTimeout(() => setPiggyGlow(false), 500);
      } else {
          setPlayer(prev => ({ ...prev, balance: prev.balance - currentBet }));
      }
      
      setSpinsWithoutBonus(prev => prev + 1);
      updateMissions(MissionType.SPIN_COUNT, 1);
      updateMissions(MissionType.BET_COINS, currentBet);
      if (betIndex === availableBets.length - 1) updateMissions(MissionType.MAX_BET_SPIN, 1);
      // Track VIP bets for end-of-day cashback
      if (player.isVip) {
          const today = new Date().toDateString();
          setVipBetTracking(prev => ({ date: today, total: (prev.date === today ? prev.total : 0) + currentBet }));
      }
      setPlayer(prev => ({
          ...prev,
          stats: {
              ...(prev.stats || { maxSingleWin: 0, maxJackpotWin: 0, totalCoinsWon: 0, totalGemsEarned: 0, totalSpins: 0, recentSlots: [] }),
              totalSpins: (prev.stats?.totalSpins || 0) + 1
          }
      }));
    } else if (isHoldWinRespin || isPirateWalk) {
        // Hold and Win / Ghost Ship respin: free, no missions, no stats
    } else {
        setFreeSpinsRemaining(prev => prev - 1);
        // SPACE: ramp the Supernova multiplier (+1 each free spin, capped ×15)
        if (selectedGame.theme === 'SPACE') {
            spaceFsMultRef.current = Math.min(8, spaceFsMultRef.current + 1);
            setSpaceMultiplier(spaceFsMultRef.current);
        }
        updateMissions(MissionType.SPIN_COUNT, 1);
        setPlayer(prev => ({
            ...prev,
            stats: {
                ...(prev.stats || { maxSingleWin: 0, maxJackpotWin: 0, totalCoinsWon: 0, totalGemsEarned: 0, totalSpins: 0, recentSlots: [] }),
                totalSpins: (prev.stats?.totalSpins || 0) + 1
            }
        }));
    }
    setInstantStop(false);
    setScatterAnticipation(false);
    scatterAnticipationRef.current = false;
    setCascadeGrid(null);
    setCascadeNewCells(null);
    setCascadeDissolving(false);
    setStatus(GameStatus.SPINNING);
    setWinData(null);
    setEgyptCoinMeta(null);
    setStoppedReels(0);
    setTargetGrid([]);
  }, [status, reelTransitioning, player.balance, availableBets, betIndex, freeSpinsRemaining, activeModal, showFreeSpinsPopup, showFreeSpinSummary, showCandyRoulette, player.level, selectedGame.theme]);

  useEffect(() => {
    if (status === GameStatus.SPINNING && targetGrid.length === 0) {
      setTargetGrid(generateSmartGrid());
      // CANDY: show wild containers immediately at spin start so borders appear before wilds land
      if (selectedGame.theme === 'CANDY' && freeSpinsRemaining > 0) {
          setCandyCols(candyPendingColsRef.current);
          setCandySingleWilds(candySingleWildsRef.current);
          setCandyFsSpinKey(k => k + 1);
      }
    }
  }, [status, targetGrid.length, generateSmartGrid, selectedGame.theme, freeSpinsRemaining]);

  // Arctic free-spin jackpot: show popup only once spin is fully idle
  useEffect(() => {
    if (status === GameStatus.IDLE && pendingArcticFreePick && !showArcticPickModal) {
        setPendingArcticFreePick(false);
        setPlayer(p => ({ ...p, autoSpin: false }));
        setTimeout(() => {
            setShowArcticTriggerPopup(true);
            setInstantStop(true);
            audioService.playScatterTrigger();
            setTimeout(() => {
                setShowArcticTriggerPopup(false);
                setReelTransitioning('out');
                setTimeout(() => {
                    setShowArcticPickModal(true);
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        setReelTransitioning('in');
                        setTimeout(() => setReelTransitioning(false), 1100);
                    }));
                }, 900);
            }, 3000);
        }, 300);
    }
  }, [status, pendingArcticFreePick, showArcticPickModal]);

  useEffect(() => {
    if (status === GameStatus.SPINNING && targetGrid.length > 0) {
        const effectiveFastSpin = fastSpin && freeSpinsRemaining === 0;
        const timeout = setTimeout(() => setStatus(GameStatus.STOPPING), effectiveFastSpin ? 50 : 500);
        return () => clearTimeout(timeout);
    }
  }, [status, targetGrid.length, fastSpin]); 

  const handleReelStop = useCallback(() => {
    setStoppedReels(prev => {
      const next = prev + 1;
      audioService.playReelStop();
      // Arctic scatter anticipation: highlight remaining reels when 2 scatters found; clear when 3rd lands
      if (!fastSpinRef.current && next < selectedGame.reels) {
          const tGrid = targetGridRef.current;
          let scattersSoFar = 0;
          for (let c = 0; c < next; c++) {
              if (tGrid[c]?.some(s => s === SymbolType.SCATTER)) scattersSoFar++;
          }
          if (scattersSoFar >= 3 && scatterAnticipationRef.current) {
              scatterAnticipationRef.current = false;
              setScatterAnticipation(false);
          } else if (scattersSoFar === 2 && !scatterAnticipationRef.current) {
              scatterAnticipationRef.current = true;
              setScatterAnticipation(true);
          }
      }
      if (next === selectedGame.reels) {
        setScatterAnticipation(false);
        scatterAnticipationRef.current = false;

        // CANDY: sync the Wild Wheel overlay to the reels that just stopped (replays the expand animation)
        if (selectedGame.theme === 'CANDY') {
            setCandyCols(candyPendingColsRef.current);
            setCandySingleWilds(candySingleWildsRef.current);
            setCandyFsSpinKey(k => k + 1);
        }

        // EGYPT: Hold and Win respin handling
        if (selectedGame.theme === 'EGYPT' && holdWinRef.current.active) {
            const lockedGrid = holdWinRef.current.lockedGrid;
            const coinValues = holdWinRef.current.coinValues;
            const jpGrid = holdWinRef.current.jpGrid;
            const currentBet = currentBetRef.current;
            const newLockedGrid = lockedGrid.map(c => [...c]);
            const newCoinValues = coinValues.map(c => [...c]);
            const newJpGrid = jpGrid.map(c => [...c]);
            let newCoinsFound = 0;
            targetGrid.forEach((col, c) => {
                col.forEach((sym, r) => {
                    if (!lockedGrid[c]?.[r] && sym === SymbolType.COIN) {
                        newCoinsFound++;
                        newLockedGrid[c][r] = true;
                        const jpTier = rollHoldWinJackpot();
                        newJpGrid[c][r] = jpTier;
                        if (jpTier) {
                            newCoinValues[c][r] = jackpotService.getAmounts()[HW_JP_IDX[jpTier]];
                        } else {
                            const roll = Math.random();
                            const mult = roll < 0.40 ? 1 : roll < 0.60 ? 2 : roll < 0.73 ? 3 : roll < 0.83 ? 5 : roll < 0.91 ? 10 : roll < 0.96 ? 20 : roll < 0.99 ? 50 : 100;
                            newCoinValues[c][r] = currentBet * mult;
                        }
                    }
                });
            });
            const lockedCount = newLockedGrid.reduce((s, col) => s + col.filter(Boolean).length, 0);
            const isFull = lockedCount === selectedGame.reels * selectedGame.rows;
            const newRespins = newCoinsFound > 0 ? 3 : holdWinRef.current.respins - 1;
            holdWinRef.current.lockedGrid = newLockedGrid;
            holdWinRef.current.coinValues = newCoinValues;
            holdWinRef.current.jpGrid = newJpGrid;
            holdWinRef.current.respins = newRespins;
            setHoldWinLockedGrid(newLockedGrid);
            setHoldWinCoinValues(newCoinValues);
            setHoldWinJpGrid(newJpGrid);
            setHoldWinRespins(newRespins);
            if (isFull || newRespins <= 0) {
                startHwCounting(newLockedGrid, newCoinValues, newJpGrid, isFull, currentBet);
            } else {
                setTimeout(() => setStatus(GameStatus.IDLE), 960);
            }
            return next;
        }

        // EGYPT: assign values to all COIN cells (shown on overlay) + trigger HW if 6+ (normal spins only)
        if (selectedGame.theme === 'EGYPT' && !holdWinRef.current.active) {
            const currentBet = currentBetRef.current;
            const preValues: (number|null)[][] = Array(selectedGame.reels).fill(null).map(() => Array(selectedGame.rows).fill(null));
            const preJpGrid: (string|null)[][] = Array(selectedGame.reels).fill(null).map(() => Array(selectedGame.rows).fill(null));
            let coinCount = 0;
            targetGrid.forEach((col, c) => {
                col.forEach((sym, r) => {
                    if (sym === SymbolType.COIN) {
                        coinCount++;
                        const jpTier = rollHoldWinJackpot();
                        preJpGrid[c][r] = jpTier;
                        preValues[c][r] = jpTier ? jackpotService.getAmounts()[HW_JP_IDX[jpTier]] : getHoldWinCoinValue(currentBet);
                    }
                });
            });
            setEgyptCoinMeta({ values: preValues, jpGrid: preJpGrid });
            if (coinCount >= 6 && freeSpinsRemaining === 0) {
                const lockedGrid: boolean[][] = Array(selectedGame.reels).fill(null).map(() => Array(selectedGame.rows).fill(false));
                const coinValues: number[][] = Array(selectedGame.reels).fill(null).map(() => Array(selectedGame.rows).fill(0));
                const jpGrid: (string|null)[][] = Array(selectedGame.reels).fill(null).map(() => Array(selectedGame.rows).fill(null));
                targetGrid.forEach((col, c) => {
                    col.forEach((sym, r) => {
                        if (sym === SymbolType.COIN) {
                            lockedGrid[c][r] = true;
                            coinValues[c][r] = preValues[c][r] || 0;
                            jpGrid[c][r] = preJpGrid[c][r];
                        }
                    });
                });
                holdWinRef.current = { active: false, lockedGrid, coinValues, jpGrid, respins: 3 };
                setTimeout(() => {
                    audioService.playScatterTrigger();
                    setSpinsWithoutBonus(0);
                    setStatus(GameStatus.SCATTER_SHOWCASE);
                    setShowEgyptHoldWinPopup(true);
                    setTimeout(() => {
                        setShowEgyptHoldWinPopup(false);
                        setReelTransitioning('out');
                        setTimeout(() => {
                            holdWinRef.current.active = true;
                            setHoldWinActive(true); setHoldWinLockedGrid(lockedGrid); setHoldWinCoinValues(coinValues); setHoldWinJpGrid(jpGrid); setHoldWinRespins(3);
                            setReelTransitioning('in');
                            setTimeout(() => { setReelTransitioning(false); setStatus(GameStatus.IDLE); }, 1100);
                        }, 900);
                    }, 2500);
                }, 0);
                return next;
            }
        }

        // PIRATE: Ghost Ship Walking Wilds. The wild column "sails" one reel left per free respin
        // (the leftward step is taken in the IDLE auto-continue effect, so the overlay matches the screen).
        if (selectedGame.theme === 'PIRATE') {
            if (pirateWalkRef.current.active) {
                calculateWin(targetGrid);
                return next;
            }
            if (pirateTriggerArmedRef.current) {
                // A Ghost Ship boarded the rightmost reel — begin the walk.
                pirateTriggerArmedRef.current = false;
                pirateWalkTotalWinRef.current = 0;
                setPirateWalkTotalWin(0);
                const dualShip = pirateDualShipRef.current;
                const ship2Start = dualShip ? selectedGame.reels - 1 + pirateShip2OffsetRef.current : -1;
                pirateDualShipRef.current = false;
                pirateShip2OffsetRef.current = 0;
                pirateWalkRef.current = { active: true, shipCol: selectedGame.reels - 1, ship2Col: ship2Start };
                setPirateWalkActive(true);
                setPirateShipCol(selectedGame.reels - 1);
                setPirateShip2Col(-1); // ship 2 starts off-screen
                audioService.playScatterTrigger();
                setSpinsWithoutBonus(0);
                calculateWin(targetGrid);
                return next;
            }
        }

        let scatterCount = 0;
        const scatters: {col: number, row: number}[] = [];
        if (selectedGame.theme !== 'EGYPT') {
        targetGrid.forEach((col, colIdx) => {
            col.forEach((sym, rowIdx) => {
                if (sym === SymbolType.SCATTER) {
                    scatterCount++;
                    scatters.push({ col: colIdx, row: rowIdx });
                }
            });
        });
        }

        if (scatterCount >= selectedGame.scattersToTrigger) {
             if (selectedGame.theme === 'NEON') {
                 setStatus(GameStatus.SCATTER_SHOWCASE);
                 audioService.playScatterTrigger();
                 setSpinsWithoutBonus(0);
                 const betAmt = currentBetRef.current;
                 if (neonRouletteTimerRef.current) clearTimeout(neonRouletteTimerRef.current);
                 neonRouletteTimerRef.current = setTimeout(() => {
                     neonRouletteTimerRef.current = null;
                     setShowNeonRoulette(true);
                     setNeonRouletteBet(betAmt);
                 }, 3000);
                 return next;
             }

             // CANDY: scatters open the Wild Wheel bonus, which picks the persistent wild setup before free spins begin.
             if (selectedGame.theme === 'CANDY') {
                 const spinsWon = 10;
                 setFreeSpinsWon(spinsWon);
                 setTotalFreeSpins(prev => prev + spinsWon);
                 if (freeSpinsRemaining > 0) {
                     // Retrigger mid-feature: just add spins, keep the current wild config.
                     setShowFreeSpinsPopup(true);
                     audioService.playWinBig();
                 } else {
                     setStatus(GameStatus.SCATTER_SHOWCASE);
                     audioService.playScatterTrigger();
                     setSpinsWithoutBonus(0);
                     setTimeout(() => setShowCandyRoulette(true), 1500);
                 }
                 return next;
             }

             const baseSpins = selectedGame.theme === 'ARCTIC'
                 ? 15
                 : selectedGame.theme === 'PIRATE'
                 ? scatterCount
                 : 10;
             const spinsWon = selectedGame.theme !== 'PIRATE' && scatterCount > 3
                 ? baseSpins + (scatterCount - 3) * 5
                 : baseSpins;
             setFreeSpinsWon(spinsWon);
             setTotalFreeSpins(prev => prev + spinsWon);

             if (freeSpinsRemaining > 0) {
                 setShowFreeSpinsPopup(true);
                 audioService.playWinBig();
             } else {
                 setStatus(GameStatus.SCATTER_SHOWCASE);
                 audioService.playScatterTrigger();
                 setSpinsWithoutBonus(0);
                 setTimeout(() => {
                     setShowFreeSpinsPopup(true);
                 }, 2000);
                 return next;
             }
        }

        // PIGGY: 6+ coin cells triggers free spins
        if (selectedGame.theme === 'PIGGY') {
            let coinCount = 0;
            targetGrid.forEach(col => col.forEach(sym => { if (sym === SymbolType.COIN) coinCount++; }));
            if (coinCount >= 6) {
                const spinsWon = 10;
                setFreeSpinsWon(spinsWon);
                setTotalFreeSpins(prev => prev + spinsWon);
                if (freeSpinsRemaining > 0) {
                    setShowFreeSpinsPopup(true);
                    audioService.playWinBig();
                } else {
                    setStatus(GameStatus.SCATTER_SHOWCASE);
                    audioService.playScatterTrigger();
                    setSpinsWithoutBonus(0);
                    setTimeout(() => { setShowFreeSpinsPopup(true); }, 2000);
                    return next;
                }
            }
        }

        // LEPRECHAUN: same coin-count mechanic as PIGGY — 6+ 🍀 cells trigger free spins
        if (selectedGame.theme === 'LEPRECHAUN') {
            let coinCount = 0;
            targetGrid.forEach(col => col.forEach(sym => { if (sym === SymbolType.COIN) coinCount++; }));
            if (coinCount >= 6) {
                const spinsWon = 10;
                setFreeSpinsWon(spinsWon);
                setTotalFreeSpins(prev => prev + spinsWon);
                if (freeSpinsRemaining > 0) {
                    setShowFreeSpinsPopup(true);
                    audioService.playWinBig();
                } else {
                    setStatus(GameStatus.SCATTER_SHOWCASE);
                    audioService.playScatterTrigger();
                    setSpinsWithoutBonus(0);
                    setTimeout(() => { setShowFreeSpinsPopup(true); }, 2000);
                    return next;
                }
            }
        }

        // DRAGON: coin absorb animation + count spins for Pick-and-Win trigger
        if (selectedGame.theme === 'DRAGON') {
            setDragonCoinAbsorbing(true);
            setTimeout(() => setDragonCoinAbsorbing(false), 600);
        }
        if (selectedGame.theme === 'DRAGON' && freeSpinsRemaining === 0) {
            dragonPickSpinsRef.current++;
            const spins = dragonPickSpinsRef.current;
            if (spins % 10 === 0) {
                const extraMult = Math.floor(spins / 100);
                const chance = Math.min(0.025 + extraMult * 0.0125, 0.2375);
                if (Math.random() < chance) {
                    dragonPickSpinsRef.current = 0;
                    dragonPickBonusMultRef.current = 0;
                    setTimeout(() => {
                        setDragonPotShaking(true);
                        setInstantStop(true);
                        audioService.playScatterTrigger();
                        setTimeout(() => {
                            setDragonPotShaking(false);
                            setShowDragonTriggerPopup(true);
                            setPlayer(p => ({ ...p, autoSpin: false }));
                        }, 3000);
                    }, 400);
                }
            }
        }
        if (selectedGame.theme === 'ARCTIC' && freeSpinsRemaining === 0) {
            arcticPickSpinsRef.current++;
            // Fill progress bar +1 to +5 per spin, cap at 250, stay full
            if (arcticProgressRef.current < 250) {
                const gain = Math.floor(Math.random() * 5) + 1;
                arcticProgressRef.current = Math.min(arcticProgressRef.current + gain, 250);
                setArcticSpinProgress(arcticProgressRef.current);
            }
            // When full (250), each spin has a chance to trigger pick jackpot
            if (arcticProgressRef.current >= 250) {
                const extraMult = Math.floor(arcticPickSpinsRef.current / 100);
                const chance = Math.min(0.025 + extraMult * 0.0125, 0.2375);
                if (Math.random() < chance) {
                    arcticProgressRef.current = 0;
                    arcticPickSpinsRef.current = 0;
                    setArcticSpinProgress(0);
                    setPlayer(p => ({ ...p, autoSpin: false }));
                    setTimeout(() => {
                        setShowArcticTriggerPopup(true);
                        setInstantStop(true);
                        audioService.playScatterTrigger();
                        setTimeout(() => {
                            setShowArcticTriggerPopup(false);
                            setReelTransitioning('out');
                            setTimeout(() => {
                                setShowArcticPickModal(true);
                                requestAnimationFrame(() => requestAnimationFrame(() => {
                                    setReelTransitioning('in');
                                    setTimeout(() => setReelTransitioning(false), 1100);
                                }));
                            }, 900);
                        }, 3000);
                    }, 400);
                }
            }
        }

        // Arctic free-spin JP pick chances:
        //   Spin 1: 10%  |  Every 5th spin: 7%  |  After first trigger: flat 3% every spin
        if (selectedGame.theme === 'ARCTIC' && freeSpinsRemaining > 0 && !showArcticPickModal && !pendingArcticFreePick) {
            arcticFreeSpinCountRef.current++;
            const spinNum = arcticFreeSpinCountRef.current;
            const alreadyTriggered = arcticJpPickTriggeredRef.current;
            let chance = 0;
            if (alreadyTriggered) {
                chance = 0.03;
            } else if (spinNum === 1) {
                chance = 0.10;
            } else if (spinNum % 5 === 0) {
                chance = 0.07;
            }
            if (chance > 0 && Math.random() < chance) {
                arcticJpPickTriggeredRef.current = true;
                setPendingArcticFreePick(true);
            }
        }

        calculateWin(targetGrid);
      }
      return next;
    });
  }, [targetGrid, selectedGame, freeSpinsRemaining, spinsWithoutBonus]);

  const calculateWin = (finalGrid: SymbolType[][]) => {
    const currentBet = availableBets[betIndex];
    let totalPayout = 0;
    const winningLines: number[] = [];
    const winningCells: {col: number, row: number}[] = [];
    const currentPaylines = GET_PAYLINES(selectedGame.rows, selectedGame.reels);

    currentPaylines.forEach(line => {
      const symbols = line.indices.map((row, col) => (finalGrid[col] && finalGrid[col][row]) ? finalGrid[col][row] : SymbolType.TEN);
      let matchLen = 1;
      let matchSymbol = symbols[0];
      for (let i = 1; i < symbols.length; i++) {
        const s = symbols[i];
        if (s === matchSymbol || s === SymbolType.WILD || matchSymbol === SymbolType.WILD) {
            if (matchSymbol === SymbolType.WILD && s !== SymbolType.WILD) {
                matchSymbol = s;
            } 
            matchLen++;
        } else break;
      }
      if (matchLen >= 3) {
        const symbolConfig = GET_SYMBOLS(selectedGame.theme)[matchSymbol];
        if (symbolConfig) {
            const baseValue = symbolConfig.value;
            let lenMult = matchLen === 4 ? 2.0 : matchLen >= 5 ? 4.0 : 0.5;
            if (matchLen === 3 && selectedGame.reels === 3) lenMult = 1.0; 

            const neonMult = selectedGame.theme === 'NEON' ? 1.588 : 1.0;
            const lineWin = Math.floor(currentBet * (baseValue / 3) * lenMult * neonMult);
            if (lineWin > 0) {
                totalPayout += lineWin;
                winningLines.push(line.id);
                for(let i=0; i<matchLen; i++) winningCells.push({ col: i, row: line.indices[i] });
            }
        }
      }
    });

    let scatterCount = 0;
    const scatterCells: {col: number, row: number}[] = [];
    finalGrid.forEach((col, c) => col.forEach((s, r) => {
        if (s === SymbolType.SCATTER) {
            scatterCount++;
            scatterCells.push({ col: c, row: r });
        }
    }));
    if (scatterCount >= selectedGame.scattersToTrigger) winningCells.push(...scatterCells);

    // SPACE: Supernova progressive multiplier applies to line wins during free spins.
    // No-win spin resets the multiplier back to ×1.
    if (selectedGame.theme === 'SPACE' && totalFreeSpins > 0) {
        if (totalPayout > 0) {
            totalPayout = Math.floor(totalPayout * spaceFsMultRef.current);
        } else {
            spaceFsMultRef.current = 1;
            setSpaceMultiplier(1);
        }
    }

    // ARCTIC: no jackpot logic — start cascade sequence
    if (selectedGame.theme === 'ARCTIC') {
        setWinData({ payout: totalPayout, winningLines, winningCells, isBigWin: false, scattersFound: scatterCount, winType: undefined });
        // Award XP for arctic spins
        const arcticVipMult = player.isVip ? 1.2 : 1.0;
        const arcticSpinsAtMax = Math.max(1, player.level * 1.1);
        const arcticBetFraction = currentBet / MAX_BET_BY_LEVEL(player.level);
        const arcticXp = Math.floor((player.xpToNextLevel / arcticSpinsAtMax) * arcticBetFraction * player.xpMultiplier * arcticVipMult * 2);
        addXp(arcticXp);
        if (totalPayout > 0) {
            setPlayer(prev => ({
                ...prev,
                balance: prev.balance + totalPayout,
                stats: {
                    maxSingleWin: Math.max(totalPayout, prev.stats?.maxSingleWin || 0),
                    maxJackpotWin: prev.stats?.maxJackpotWin || 0,
                    totalCoinsWon: (prev.stats?.totalCoinsWon || 0) + totalPayout,
                    totalGemsEarned: prev.stats?.totalGemsEarned || 0,
                    totalSpins: prev.stats?.totalSpins || 0,
                    recentSlots: prev.stats?.recentSlots || [],
                }
            }));
            if (totalFreeSpins > 0) setFreeSpinTotalWin(p => p + totalPayout);
            updateMissions(MissionType.WIN_COINS, totalPayout);
            setCascadeMultiplier(1);
            setCascadeTotalWin(totalPayout);
            setCascadeGrid([...finalGrid.map(c => [...c])]);
            setCascadeNewCells(null);
            setCascadeDissolving(false);
            setStatus(GameStatus.CASCADE);
            audioService.playWinSmall();
            // Dissolve winning cells at 400ms mark, then cascade runs at 700ms
            setTimeout(() => setCascadeDissolving(true), 400);
            setTimeout(() => runCascadeRef.current!(finalGrid, 2, totalPayout, winningCells), 700);
        } else {
            const effectiveFastSpin = fastSpin;
            setTimeout(() => setStatus(GameStatus.IDLE), effectiveFastSpin ? 50 : 500);
        }
        // Per-spin drops for Arctic (same logic as normal slots)
        const arcticMaxBetIdx = availableBets.length - 1;
        const arcticQuestChance = Math.max(0.005, (0.10 - (arcticMaxBetIdx - betIndex) * 0.01) * 1.3 * 0.8);
        if (player.level >= 20 && Math.random() < arcticQuestChance) {
            if (Math.random() < 0.5) {
                setQuest(q => ({ ...q, diceCredits: Math.min(60, q.diceCredits + 1) }));
            } else {
                setQuest(q => ({ ...q, wildCredits: Math.min(60, q.wildCredits + 1) }));
            }
        }
        if (player.level >= 30) {
            const cardRoll = Math.random();
            if (cardRoll < 0.035) handleCardDrop('RARE');
            else if (cardRoll < 0.105) handleCardDrop('COMMON');
        }
        return;
    }

    const JP_WIN_TYPES = [
        SymbolType.JACKPOT_MINI,
        SymbolType.JACKPOT_MINOR,
        SymbolType.JACKPOT_MAJOR,
        SymbolType.JACKPOT_MEGA,
        SymbolType.JACKPOT_GRAND,
    ];
    const JP_META = [
        { name: 'MINI',  color: '#cd7f32', icon: '🥉' },
        { name: 'MINOR', color: '#c0c0c0', icon: '🥈' },
        { name: 'MAJOR', color: '#ffd700', icon: '🥇' },
        { name: 'MEGA',  color: '#ff8c00', icon: '👑' },
        { name: 'GRAND', color: '#ff2244', icon: '🏆' },
    ];
    // Jackpot amounts: 10/20/30/50/100× current bet
    const JP_BET_MULTIPLIERS = [10, 20, 30, 50, 100];
    const jpAmounts = JP_BET_MULTIPLIERS.map(m => Math.floor(currentBet * m));
    let jackpotWon = false;
    JP_WIN_TYPES.forEach((jpType, tier) => {
        let jpCount = 0;
        const jpCells: {col: number, row: number}[] = [];
        finalGrid.forEach((col, c) => col.forEach((s, r) => {
            if (s === jpType) { jpCount++; jpCells.push({ col: c, row: r }); }
        }));
        if (jpCount >= 3) {
            jackpotWon = true;
            totalPayout += jpAmounts[tier];
            winningCells.push(...jpCells);
            setJackpotWinTier({ ...JP_META[tier], amount: jpAmounts[tier] });
        }
    });

    if (totalPayout > 0) {
        setPlayer(prev => ({
            ...prev,
            stats: {
                maxSingleWin: Math.max(totalPayout, prev.stats?.maxSingleWin || 0),
                maxJackpotWin: jackpotWon ? Math.max(
                    jpAmounts.reduce((a, b) => a + b, 0),
                    prev.stats?.maxJackpotWin || 0
                ) : (prev.stats?.maxJackpotWin || 0),
                totalCoinsWon: (prev.stats?.totalCoinsWon || 0) + totalPayout,
                totalGemsEarned: prev.stats?.totalGemsEarned || 0,
                totalSpins: prev.stats?.totalSpins || 0,
                recentSlots: prev.stats?.recentSlots || [],
            }
        }));
    }

    const winTier = getWinTier(totalPayout, currentBet);
    setWinData({ payout: totalPayout, winningLines, winningCells, isBigWin: !!winTier, scattersFound: scatterCount, winType: winTier || undefined });

    if (totalFreeSpins > 0 && totalPayout > 0) setFreeSpinTotalWin(prev => prev + totalPayout);

    // PIRATE: tally Ghost Ship walk winnings for the end-of-feature summary
    if (pirateWalkRef.current.active && totalPayout > 0) {
        pirateWalkTotalWinRef.current += totalPayout;
        setPirateWalkTotalWin(pirateWalkTotalWinRef.current);
    }

    // Per-spin drops — scale with bet level (±2% per step from max bet)
    const maxBetIdx = availableBets.length - 1;
    const questChance = Math.max(0.005, (0.10 - (maxBetIdx - betIndex) * 0.01) * 1.3 * 0.8);
    if (player.level >= 20 && Math.random() < questChance) {
        if (Math.random() < 0.5) {
            setQuest(q => ({ ...q, diceCredits: Math.min(60, q.diceCredits + 1) }));
        } else {
            setQuest(q => ({ ...q, wildCredits: Math.min(60, q.wildCredits + 1) }));
        }
    }
    if (player.level >= 30) {
        const cardRoll = Math.random();
        if (cardRoll < 0.035) handleCardDrop('RARE');
        else if (cardRoll < 0.105) handleCardDrop('COMMON');
    }

    if (totalPayout > 0) {
       setPlayer(p => ({ ...p, balance: p.balance + totalPayout }));

       const vipXpMult = player.isVip ? 1.2 : 1.0;
       const spinsAtMaxBet = Math.max(1, player.level * 1.1);
       const betFraction = currentBet / MAX_BET_BY_LEVEL(player.level);
       const xpGained = Math.floor((player.xpToNextLevel / spinsAtMaxBet) * betFraction * player.xpMultiplier * vipXpMult * 2);

       addXp(xpGained);
       if (player.isVip) addVipXp(Math.max(1, Math.floor(xpGained * 0.1)));
       updateMissions(MissionType.WIN_COINS, totalPayout);
       if (winTier) updateMissions(MissionType.BIG_WIN_COUNT, 1);

       if (winTier) {
           audioService.playWinBig();
           if (jackpotWon) {
               setPendingBigWin(true);
           } else {
               setShowWinPopup(true);
           }
           setStatus(GameStatus.WIN_ANIMATION);
       } else {
           audioService.playWinSmall();
           setStatus(GameStatus.WIN_ANIMATION);
           const effectiveFastSpin = fastSpin && totalFreeSpins === 0;
           setTimeout(() => setStatus(GameStatus.IDLE), effectiveFastSpin ? 150 : 500);
       }
    } else {
       const vipXpMultLoss = player.isVip ? 1.2 : 1.0;
       const spinsAtMaxBetLoss = Math.max(1, player.level * 1.1);
       const betFractionLoss = currentBet / MAX_BET_BY_LEVEL(player.level);
       const lossXp = Math.floor((player.xpToNextLevel / spinsAtMaxBetLoss) * betFractionLoss * player.xpMultiplier * vipXpMultLoss * 2);
       addXp(lossXp);
       if (player.isVip) addVipXp(Math.max(1, Math.floor(lossXp * 0.1)));
       const effectiveFastSpin = fastSpin && totalFreeSpins === 0;
       setTimeout(() => setStatus(GameStatus.IDLE), effectiveFastSpin ? 50 : 500);
    }
  };

  const addXp = (amount: number) => {
      setPlayer(prev => {
          let newXp = prev.xp + amount;
          let newLevel = prev.level;
          let newReq = prev.xpToNextLevel;
          let leveledUp = false;
          while (newXp >= newReq) {
              newLevel++;
              newXp -= newReq;
              newReq = Math.floor(newReq * 1.2);
              leveledUp = true;
          }
          if (leveledUp) {
              audioService.playLevelUp();
              const isMilestone = newLevel % 5 === 0;
              const reward = Math.floor(MAX_BET_BY_LEVEL(newLevel) * (isMilestone ? 0.2 : 0.05));
              const oldMax = MAX_BET_BY_LEVEL(prev.level);
              const newMax = MAX_BET_BY_LEVEL(newLevel);
              if (toastCountRef.current < 10) {
                  setLevelUpReward(reward);
                  setShowLevelUp(true);
                  setMaxBetIncreased(newMax > oldMax);
                  toastCountRef.current += 1;
                  setTimeout(() => setShowLevelUp(false), 2000);
              }
              updateMissions(MissionType.LEVEL_UP, 1);
              const newMaxBet2 = MAX_BET_BY_LEVEL(newLevel);
              setMissionState(prev => ({
                  ...prev,
                  passRewards: GENERATE_PASS_REWARDS(newMaxBet2).map(r => {
                      const existing = prev.passRewards.find((pr: any) => pr.id === r.id);
                      return existing ? { ...r, claimed: existing.claimed } : r;
                  })
              }));

              // CHECK FEATURE UNLOCKS
              const justUnlocked = (level: number) => {
                  if (level === 5 && !shownUnlocks.has(5)) return true;
                  if (level === 10 && !shownUnlocks.has(10)) return true;
                  if (level === 20 && !shownUnlocks.has(20)) return true;
                  if (level === 30 && !shownUnlocks.has(30)) return true;
                  if (level === 40 && !shownUnlocks.has(40)) return true;
                  return false;
              };

              // CHECK SLOT UNLOCKS — levels: idx*5+1 (6,11,16...) to avoid colliding with feature unlocks (5,10,20,30)
              const justUnlockedSlot = (level: number) => {
                  if (level === 6  && !shownUnlocks.has(6))  return { id: 'neon-vegas',       name: 'Neon Vegas',         icon: '🎰', lvl: 6  };
                  if (level === 11 && !shownUnlocks.has(11)) return { id: 'pharaoh-tomb',     name: "Pharaoh's Tomb",     icon: '🦂', lvl: 11 };
                  if (level === 16 && !shownUnlocks.has(16)) return { id: 'arctic-freeze',    name: 'Arctic Freeze',      icon: '🐧', lvl: 16 };
                  if (level === 21 && !shownUnlocks.has(21)) return { id: 'dragon-fortune',   name: "Dragon's Fortune",   icon: '🐉', lvl: 21 };
                  if (level === 26 && !shownUnlocks.has(26)) return { id: 'pirate-bounty',    name: "Pirate's Bounty",    icon: '🏴‍☠️', lvl: 26 };
                  if (level === 31 && !shownUnlocks.has(31)) return { id: 'cosmic-cash',      name: 'Cosmic Cash',        icon: '👽', lvl: 31 };
                  if (level === 36 && !shownUnlocks.has(36)) return { id: 'sugar-rush',       name: 'Sugar Rush',         icon: '🧁', lvl: 36 };
                  if (level === 41 && !shownUnlocks.has(41)) return { id: 'deep-blue',        name: 'Deep Blue',          icon: '🦈', lvl: 41 };
                  if (level === 46 && !shownUnlocks.has(46)) return { id: 'wild-west',        name: 'Gold Rush',          icon: '🤠', lvl: 46 };
                  if (level === 51 && !shownUnlocks.has(51)) return { id: 'samurai-honor',    name: 'Samurai Honor',      icon: '⚔️', lvl: 51 };
                  if (level === 56 && !shownUnlocks.has(56)) return { id: 'golden-lucky-pot', name: 'Golden Lucky Pot',   icon: '🏮', lvl: 56 };
                  if (level === 61 && !shownUnlocks.has(61)) return { id: 'lucky-leprechaun', name: 'Lucky Leprechaun',   icon: '🍀', lvl: 61 };
                  if (level === 66 && !shownUnlocks.has(66)) return { id: 'jungle-rumble',    name: 'Jungle Rumble',      icon: '🦍', lvl: 66 };
                  return null;
              };

              setTimeout(() => {
                  const slotUnlock = justUnlockedSlot(newLevel);
                  if (slotUnlock) {
                       setFeatureUnlockData({ 
                           name: slotUnlock.name, 
                           icon: slotUnlock.icon, 
                           description: 'New Game Unlocked! Play Now.', 
                           action: () => { 
                               // Find fresh config from constant to avoid closure issues
                               const config = GAMES_CONFIG.find(g => g.id === slotUnlock.id);
                               if (config) {
                                   setActiveModal('NONE'); // Force close unlock modal
                                   // Ensure we switch view and handle game select with a fresh config
                                   setTimeout(() => {
                                       handleGameSelect(config);
                                   }, 100); 
                               }
                           } 
                       });
                       setShownUnlocks(prev => new Set(prev).add(slotUnlock.lvl));
                       setActiveModal('FEATURE_UNLOCK');
                       setTimeout(() => setActiveModal(m => m === 'FEATURE_UNLOCK' ? 'NONE' : m), 5000);
                  }
                  else if (justUnlocked(newLevel)) {
                      if (newLevel === 5) {
                          setFeatureUnlockData({ 
                              name: 'Piggy Bank', 
                              icon: '🐷', 
                              description: 'Save coins with every spin!', 
                              action: () => { 
                                  setActiveModal('NONE');
                                  setTimeout(() => openModal('PIGGY'), 50);
                              } 
                          });
                          setShownUnlocks(prev => new Set(prev).add(5));
                      } else if (newLevel === 10) {
                          setFeatureUnlockData({ 
                              name: 'Missions', 
                              icon: '📜', 
                              description: 'Complete daily challenges!', 
                              action: () => { 
                                  setActiveModal('NONE');
                                  setTimeout(() => openMissionsModal(), 50);
                              } 
                          });
                          setShownUnlocks(prev => new Set(prev).add(10));
                      } else if (newLevel === 20) {
                          setFeatureUnlockData({ 
                              name: 'Quest', 
                              icon: '🗺️', 
                              description: 'Embark on an adventure!', 
                              action: () => { 
                                  setActiveModal('NONE');
                                  setTimeout(() => { openModal('MINIGAME'); audioService.playClick(); }, 50);
                              } 
                          });
                          setShownUnlocks(prev => new Set(prev).add(20));
                      } else if (newLevel === 30) {
                          setFeatureUnlockData({ 
                              name: 'Card Album', 
                              icon: '🃏', 
                              description: 'Collect cards for prizes!', 
                              action: () => { 
                                  setActiveModal('NONE');
                                  setTimeout(() => openModal('COLLECTION'), 50);
                              } 
                          });
                          setShownUnlocks(prev => new Set(prev).add(30));
                      } else if (newLevel === 40) {
                          setFeatureUnlockData({ 
                              name: 'VIP Limit', 
                              icon: '👑', 
                              description: 'Unlock High Limit bets!', 
                              action: () => { 
                                  setActiveModal('NONE');
                                  setTimeout(() => { setIsHighLimit(true); handleHeaderBack(); }, 50);
                              } 
                          });
                          setShownUnlocks(prev => new Set(prev).add(40));
                      }
                      setActiveModal('FEATURE_UNLOCK');
                      setTimeout(() => setActiveModal(m => m === 'FEATURE_UNLOCK' ? 'NONE' : m), 5000);
                  }
              }, 500);

              return { ...prev, balance: prev.balance + reward, level: newLevel, xp: newXp, xpToNextLevel: newReq };
          }
          return { ...prev, xp: newXp, xpToNextLevel: newReq };
      });
  };

  const addVipXp = (amount: number) => {
      setPlayer(prev => {
          let newVipXp = (prev.vipXp ?? 0) + amount;
          let newVipLevel = prev.vipLevel ?? 1;
          let newVipXpToNext = prev.vipXpToNext ?? 500;
          while (newVipXp >= newVipXpToNext) {
              newVipLevel++;
              newVipXp -= newVipXpToNext;
              newVipXpToNext = Math.floor(newVipXpToNext * 1.3);
          }
          return { ...prev, vipXp: newVipXp, vipLevel: newVipLevel, vipXpToNext: newVipXpToNext };
      });
  };

  const handleWinPopupComplete = () => {
      setShowWinPopup(false);
      // If free spins just ended, show summary immediately rather than going through IDLE
      if (freeSpinsWon > 0 && freeSpinsRemaining === 0) {
          setShowFreeSpinSummary(true);
      } else {
          setStatus(GameStatus.IDLE);
      }
  };

  const startHwCounting = (finalLockedGrid: boolean[][], finalCoinValues: number[][], finalJpGrid: (string|null)[][], isFull: boolean, currentBet: number) => {
      setStatus(GameStatus.WIN_ANIMATION);
      setHwCounting(true);
      setHwCountingTotal(0);

      const JP_COLORS_MAP: Record<string, string> = { MINI: '#22c55e', MINOR: '#22d3ee', MAJOR: '#a855f7', MEGA: '#f43f5e', GRAND: '#fbbf24' };
      const JP_ICONS_MAP: Record<string, string> = { MINI: '🟢', MINOR: '🔵', MAJOR: '🟣', MEGA: '🔴', GRAND: '🏆' };

      let runningTotal = 0;

      const finalize = (total: number) => {
          setHwCounting(false);
          setHwCountingCell(null);
          setHwCountingTotal(0);
          holdWinRef.current = { active: false, lockedGrid: [], coinValues: [], jpGrid: [], respins: 3 };
          setHoldWinActive(false); setHoldWinLockedGrid([]); setHoldWinCoinValues([]); setHoldWinJpGrid([]); setHoldWinRespins(3);
          setPlayer(p => ({ ...p, balance: p.balance + total }));
          const winTier = getWinTier(total, currentBet);
          setWinData({ payout: total, winningLines: [], winningCells: [], isBigWin: !!winTier, scattersFound: 0, winType: winTier || undefined });
          if (winTier) { audioService.playWinBig(); setShowWinPopup(true); setStatus(GameStatus.WIN_ANIMATION); }
          else if (total > 0) { audioService.playWinSmall(); setStatus(GameStatus.WIN_ANIMATION); setTimeout(() => setStatus(GameStatus.IDLE), 500); }
          else setStatus(GameStatus.IDLE);
      };

      const beginCounting = () => {
          const cells: {c:number,r:number}[] = [];
          for (let c = 0; c < finalLockedGrid.length; c++) {
              for (let r = 0; r < (finalLockedGrid[c]?.length || 0); r++) {
                  if (finalLockedGrid[c][r]) cells.push({ c, r });
              }
          }

          const countNext = (idx: number) => {
              if (idx >= cells.length) { finalize(runningTotal); return; }
              const { c, r } = cells[idx];
              const cellValue = finalCoinValues[c]?.[r] || 0;
              const jpTier = finalJpGrid[c]?.[r];
              runningTotal += cellValue;
              setHwCountingCell({ c, r });
              setHwCountingTotal(runningTotal);
              audioService.playWinSmall();
              if (jpTier) {
                  setJackpotWinTier({ name: jpTier, color: JP_COLORS_MAP[jpTier], icon: JP_ICONS_MAP[jpTier], amount: cellValue });
                  hwCountContinuationRef.current = () => setTimeout(() => countNext(idx + 1), 1000);
                  return;
              }
              setTimeout(() => countNext(idx + 1), 1000);
          };
          countNext(0);
      };

      if (isFull) {
          const grandBonus = currentBet * 100;
          runningTotal += grandBonus;
          setHwCountingTotal(grandBonus);
          setJackpotWinTier({ name: 'GRAND', color: '#fbbf24', icon: '🏆', amount: grandBonus });
          hwCountContinuationRef.current = () => setTimeout(beginCounting, 240);
      } else {
          setTimeout(beginCounting, 320);
      }
  };

  const handleArcticPickWin = (tier: string, amount: number) => {
      setShowArcticPickModal(false);
      setPlayer(p => ({ ...p, balance: p.balance + amount }));
      const TIER_META: Record<string, { color: string; icon: string }> = {
          MINI:  { color: '#4ade80', icon: '🥉' },
          MINOR: { color: '#67e8f9', icon: '🥈' },
          MAJOR: { color: '#d8b4fe', icon: '🥇' },
          MEGA:  { color: '#fda4af', icon: '👑' },
          GRAND: { color: '#fde68a', icon: '🏆' },
      };
      const meta = TIER_META[tier] || { color: '#fde68a', icon: '🏆' };
      setJackpotWinTier({ name: tier, color: meta.color, icon: meta.icon, amount });
  };

  const handleDragonPickWin = (tier: string, amount: number) => {
      setShowDragonPickModal(false);
      setPlayer(p => ({ ...p, balance: p.balance + amount }));
      const TIER_META: Record<string, { color: string; icon: string }> = {
          MINI:  { color: '#4ade80', icon: '🥉' },
          MINOR: { color: '#67e8f9', icon: '🥈' },
          MAJOR: { color: '#d8b4fe', icon: '🥇' },
          MEGA:  { color: '#fda4af', icon: '👑' },
          GRAND: { color: '#fde68a', icon: '🏆' },
      };
      const meta = TIER_META[tier] || { color: '#fde68a', icon: '🏆' };
      setJackpotWinTier({ name: tier, color: meta.color, icon: meta.icon, amount });
  };

  const handleNeonRouletteClose = () => {
      setShowNeonRoulette(false);
      setStatus(GameStatus.IDLE);
  };

  const handleNeonRouletteComplete = (prize: number) => {
      setShowNeonRoulette(false);
      setStatus(GameStatus.IDLE);
      setPlayer(p => ({ ...p, balance: p.balance + prize, autoSpin: false }));
      const currentBet = availableBets[betIndex];
      const winTier = getWinTier(prize, currentBet);
      setWinData({ payout: prize, winningLines: [], winningCells: [], isBigWin: !!winTier, scattersFound: 0, winType: winTier || undefined });
      if (winTier) setShowWinPopup(true);
  };

  const handleJackpotClose = () => {
      setJackpotWinTier(null);
      if (hwCountContinuationRef.current) {
          const cont = hwCountContinuationRef.current;
          hwCountContinuationRef.current = null;
          cont();
          return;
      }
      if (pendingBigWin) {
          setPendingBigWin(false);
          setShowWinPopup(true);
      }
  };
  const handleQuestClaim = () => {
      if (player.level < 20) {
           setCelebrationMsg("Quest Unlocks at Level 20!");
           audioService.playStoneBreak();
           return;
      }
      openModal('MINIGAME');
      audioService.playClick();
  };

  const handleWildQuestClaim = () => {
      if (player.level < 20) {
          setCelebrationMsg("Quest Unlocks at Level 20!");
          audioService.playStoneBreak();
          return;
      }
      setQuest(q => ({ ...q, activeGame: 'WILD' }));
      openModal('MINIGAME');
      audioService.playClick();
  };

  const handleDiceQuestClaim = () => {
      if (player.level < 20) {
          setCelebrationMsg("Quest Unlocks at Level 20!");
          audioService.playStoneBreak();
          return;
      }
      setQuest(q => ({ ...q, activeGame: 'DICE' }));
      openModal('MINIGAME');
      audioService.playClick();
  };
  const handleBuyPicks = (amount: number, cost: number, currency: 'CREDITS' | 'GEMS') => {
      if (currency === 'GEMS') {
          if (player.diamonds >= cost) {
              setPlayer(p => ({ ...p, diamonds: p.diamonds - cost }));
              if (quest.activeGame === 'DICE') {
                  setQuest(q => ({ ...q, diceCredits: q.diceCredits + amount }));
              } else {
                  setQuest(q => ({ ...q, wildCredits: q.wildCredits + amount }));
              }
              audioService.playClick();
          }
      }
  };
  const handleBuyQuestBundle = (type: 'PICKS' | 'DICE', picks: number, dice: number, coins: number, gemCost: number, bonusGems: number = 0) => {
      if (player.diamonds < gemCost) { setCelebrationMsg('Not Enough Gems!'); audioService.playStoneBreak(); return; }
      setPlayer(p => ({ ...p, diamonds: p.diamonds - gemCost + bonusGems, balance: p.balance + coins }));
      if (picks > 0) setQuest(q => ({ ...q, wildCredits: q.wildCredits + picks }));
      if (dice > 0) setQuest(q => ({ ...q, diceCredits: q.diceCredits + dice }));
      audioService.playWinBig();
      setCelebrationMsg(`Bundle claimed!`);
  };
  const handleMiniGamePick = (isGem: boolean, reward: MiniGameReward | null) => {
      setQuest(q => ({ ...q, wildCredits: Math.max(0, q.wildCredits - 1) }));
      if (reward) {
          if (reward.type === 'COINS') {
              setPlayer(p => ({ ...p, balance: p.balance + reward.value }));
              setCelebrationMsg(`+${formatCommaNumber(reward.value)} Coins`);
          }
          else if (reward.type === 'DIAMONDS') { setPlayer(p => ({ ...p, diamonds: p.diamonds + reward.value })); setCelebrationMsg(`+${reward.value} Gems`); }
          else if (reward.type === 'XP_BOOST') { setPlayer(p => ({ ...p, xpMultiplier: 2, xpBoostEndTime: Math.max(Date.now(), p.xpBoostEndTime) + 3600000 })); setCelebrationMsg(`2× XP Boost!`); }
          else if (reward.type === 'PICKS') { setQuest(q => ({ ...q, wildCredits: q.wildCredits + reward.value })); setCelebrationMsg(`+${reward.value} Credits`); }
          else if (reward.type === 'CREDIT_BACK') {
              const premChance = Math.min(0.20, 0.10 + Math.floor(player.level / 5) * 0.01);
              if (Math.random() < premChance) {
                  setPlayer(p => ({ ...p, premiumPackCredits: (p.premiumPackCredits ?? 0) + reward.value }));
                  setCelebrationMsg(`+${reward.value} 🎴 Premium Packs!`);
              } else {
                  setPlayer(p => ({ ...p, packCredits: p.packCredits + reward.value }));
                  setCelebrationMsg(`+${reward.value} 🃏 Card Packs!`);
              }
          }
      }
  };

  const handleBatchPick = (picksUsed: number, rewards: MiniGameReward[]) => {
      setQuest(q => ({ ...q, wildCredits: Math.max(0, q.wildCredits - picksUsed) }));

      let totalCoins = 0;
      let totalGems = 0;
      let totalPicksFound = 0;
      let xpBoostFound = false;
      let totalPacks = 0;
      let totalPremPacks = 0;

      rewards.forEach(r => {
          if (r.type === 'COINS') totalCoins += r.value;
          else if (r.type === 'DIAMONDS') totalGems += r.value;
          else if (r.type === 'PICKS') totalPicksFound += r.value;
          else if (r.type === 'XP_BOOST') xpBoostFound = true;
          else if (r.type === 'CREDIT_BACK') {
              const premChance = Math.min(0.20, 0.10 + Math.floor(player.level / 5) * 0.01);
              if (Math.random() < premChance) totalPremPacks += r.value;
              else totalPacks += r.value;
          }
      });

      if (totalCoins > 0) setPlayer(p => ({ ...p, balance: p.balance + totalCoins }));
      if (totalGems > 0) setPlayer(p => ({ ...p, diamonds: p.diamonds + totalGems }));
      if (totalPicksFound > 0) setQuest(q => ({ ...q, wildCredits: q.wildCredits + totalPicksFound }));
      if (xpBoostFound) setPlayer(p => ({ ...p, xpMultiplier: 2, xpBoostEndTime: Math.max(Date.now(), p.xpBoostEndTime) + 3600000 }));
      if (totalPacks > 0) setPlayer(p => ({ ...p, packCredits: p.packCredits + totalPacks }));
      if (totalPremPacks > 0) setPlayer(p => ({ ...p, premiumPackCredits: (p.premiumPackCredits ?? 0) + totalPremPacks }));

      const parts = [];
      if (totalCoins > 0) parts.push(`${formatCommaNumber(totalCoins)} Coins`);
      if (totalGems > 0) parts.push(`${totalGems} Gems`);
      if (totalPicksFound > 0) parts.push(`${totalPicksFound} Credits`);
      if (xpBoostFound) parts.push("XP Boost");
      if (totalPacks > 0) parts.push(`${totalPacks} 🃏 Packs`);
      if (totalPremPacks > 0) parts.push(`${totalPremPacks} 🎴 Prem Packs`);

      if (parts.length > 0) {
          setCelebrationMsg(`Auto Pick: +${parts.join(', ')}`);
          audioService.playWinBig();
      }
  };

  const handleGameSelect = (game: GameConfig, highLimit: boolean = false) => {
      const gameIndex = GAMES_CONFIG.findIndex(g => g.id === game.id);
      const unlockLevel = gameIndex === 0 ? 0 : gameIndex * 5 + 1;

      const currentLevel = playerRef.current.level;

      if (currentLevel < unlockLevel) {
          audioService.playStoneBreak();
          setCelebrationMsg(`Locked! Unlock at Level ${unlockLevel}`);
          return;
      }

      // Save current slot state before leaving
      const currentState: SavedGameState = {
          freeSpinsRemaining,
          totalFreeSpins,
          freeSpinsWon,
          freeSpinTotalWin,
          spinsWithoutBonus,
          grid
      };
      setSavedGameStates(prev => ({ ...prev, [selectedGame.id]: currentState }));

      // Show loading screen immediately, then set up the game
      setGameLoadingConfig(game);
      setTimeout(() => {
          setSelectedGame(game);
          setPlayer(prev => {
              const newRecent = [game.id, ...((prev.stats?.recentSlots as string[]) || []).filter((id: string) => id !== game.id)].slice(0, 5);
              return { ...prev, stats: { ...(prev.stats || { maxSingleWin: 0, maxJackpotWin: 0, totalCoinsWon: 0, totalGemsEarned: 0, totalSpins: 0, recentSlots: [] }), recentSlots: newRecent } };
          });
          setIsHighLimit(highLimit);
          const savedBetStr = localStorage.getItem('cw_bet_' + game.id);
          if (savedBetStr) {
              const savedBetVal = Number(savedBetStr);
              const currentAllowed = highLimit
                  ? ALL_BETS.map(b => b * 10).filter(b => b <= MAX_BET_BY_LEVEL(playerRef.current.level) * 10 && b >= 100000).slice(-15)
                  : ALL_BETS.filter(b => b <= MAX_BET_BY_LEVEL(playerRef.current.level)).slice(-15);
              if (currentAllowed.length === 0) {
                  setBetIndex(0);
              } else {
                  let closest = 0, minD = Infinity;
                  currentAllowed.forEach((b, i) => { const d = Math.abs(b - savedBetVal); if (d < minD) { minD = d; closest = i; } });
                  setBetIndex(closest);
              }
          }
          setCurrentView('GAME');
          setActiveModal('NONE');
          setStatus(GameStatus.IDLE);
          // Cancel any pending roulette timer and close roulette/win popups on game change
          if (neonRouletteTimerRef.current) { clearTimeout(neonRouletteTimerRef.current); neonRouletteTimerRef.current = null; }
          setShowNeonRoulette(false);
          setShowWinPopup(false);
          // Reset Ghost Ship walking-wilds state on game change
          pirateWalkRef.current = { active: false, shipCol: -1, ship2Col: -1 };
          pirateTriggerArmedRef.current = false;
          pirateDualShipRef.current = false;
          pirateWalkTotalWinRef.current = 0;
          setPirateWalkActive(false);
          setPirateShipCol(-1);
          setPirateShip2Col(-1);
          setPirateWalkTotalWin(0);
          // Reset Supernova multiplier on game change
          spaceFsMultRef.current = 1;
          setSpaceMultiplier(1);
          // Reset Candy Wild Wheel state on game change
          setShowCandyRoulette(false);
          candyWildConfigRef.current = null;
          candyPendingColsRef.current = [];
          candySingleWildsRef.current = [];
          setCandyCols([]);
          setCandySingleWilds([]);
          setCandyConfig(null);
          const savedState = savedGameStates[game.id];
          if (savedState) {
              setFreeSpinsRemaining(savedState.freeSpinsRemaining);
              setTotalFreeSpins(savedState.totalFreeSpins);
              setFreeSpinsWon(savedState.freeSpinsWon);
              setFreeSpinTotalWin(savedState.freeSpinTotalWin);
              setSpinsWithoutBonus(savedState.spinsWithoutBonus);
              setGrid(savedState.grid);
              setWinData(null);
          } else {
              setFreeSpinsRemaining(0);
              setTotalFreeSpins(0);
              setFreeSpinsWon(0);
              setFreeSpinTotalWin(0);
              setSpinsWithoutBonus(0);
              setGrid(Array(game.reels).fill(null).map(() => Array(game.rows).fill(SymbolType.SEVEN)));
              setWinData(null);
          }
          setTargetGrid([]);
          setGameLoadingConfig(null);
      }, 700);
  };

  const handleStartFreeSpins = () => {
      setShowFreeSpinsPopup(false);
      if (freeSpinsRemaining > 0) {
          // Retrigger during free spins — no transition animation
          setFreeSpinsRemaining(prev => prev + freeSpinsWon);
          setStatus(GameStatus.IDLE);
          return;
      }
      // Normal → Free Spins: 2-second transition animation
      // SPACE: reset the Supernova multiplier for a fresh feature
      spaceFsMultRef.current = 1;
      // Arctic: reset free-spin JP pick counters for the new session
      arcticFreeSpinCountRef.current = 0;
      arcticJpPickTriggeredRef.current = false;
      setSpaceMultiplier(1);
      setReelTransitioning('out');
      setTimeout(() => {
          setFreeSpinsRemaining(prev => prev + freeSpinsWon);
          savedFastSpinRef.current = fastSpin;
          setStatus(GameStatus.IDLE);
          requestAnimationFrame(() => requestAnimationFrame(() => {
              setReelTransitioning('in');
              setTimeout(() => setReelTransitioning(false), 1100);
          }));
      }, 900);
  };
  const handleCandyRouletteComplete = (cfg: CandyWildConfig) => {
      candyWildConfigRef.current = cfg;
      setCandyConfig(cfg);
      setShowCandyRoulette(false);
      // Normal → Free Spins transition (mirrors handleStartFreeSpins)
      setReelTransitioning('out');
      setTimeout(() => {
          setFreeSpinsRemaining(prev => prev + freeSpinsWon);
          savedFastSpinRef.current = fastSpin;
          setStatus(GameStatus.IDLE);
          requestAnimationFrame(() => requestAnimationFrame(() => {
              setReelTransitioning('in');
              setTimeout(() => setReelTransitioning(false), 1100);
          }));
      }, 900);
  };

  const handleFreeSpinSummaryClose = () => {
      setShowFreeSpinSummary(false);
      const currentBet = availableBets[betIndex];
      const latestTotalWin = freeSpinTotalWinRef.current;
      const tier = latestTotalWin > 0 ? getWinTier(latestTotalWin, currentBet) : null;

      // Reset all feature state immediately so the slot is clean on the way back
      setFreeSpinsWon(0);
      setTotalFreeSpins(0);
      setFreeSpinTotalWin(0);
      freeSpinTotalWinRef.current = 0;
      setFastSpin(savedFastSpinRef.current);
      setTargetGrid([]);
      spaceFsMultRef.current = 1;
      setSpaceMultiplier(1);
      candyWildConfigRef.current = null;
      candyPendingColsRef.current = [];
      candySingleWildsRef.current = [];
      setCandyCols([]);
      setCandySingleWilds([]);
      setCandyConfig(null);
      // Hard-reset pirate walk so Ghost Ship state never bleeds into normal spins
      pirateWalkRef.current = { active: false, shipCol: -1, ship2Col: -1 };
      pirateTriggerArmedRef.current = false;
      pirateDualShipRef.current = false;
      pirateWalkTotalWinRef.current = 0;
      setPirateWalkActive(false);
      setPirateShipCol(-1);
      setPirateShip2Col(-1);
      setPirateWalkTotalWin(0);

      // Transition animation: fade the reels out (free-spin theme) then back in (normal theme)
      setReelTransitioning('out');
      setTimeout(() => {
          requestAnimationFrame(() => requestAnimationFrame(() => {
              setReelTransitioning('in');
              setTimeout(() => {
                  setReelTransitioning(false);
                  if (tier) {
                      setWinData({ payout: latestTotalWin, winningLines: [], winningCells: [], isBigWin: true, scattersFound: 0, winType: tier });
                      audioService.playWinBig();
                      setShowWinPopup(true);
                      setStatus(GameStatus.WIN_ANIMATION);
                  } else {
                      setStatus(GameStatus.IDLE);
                  }
              }, 1100);
          }));
      }, 900);
  };

  useEffect(() => {
      if (status === GameStatus.IDLE && !reelTransitioning) {
          if (pirateWalkRef.current.active) {
              // Ghost Ship Walking Wilds: sail one reel left each respin until it sails off the left edge.
              if (pirateWalkRef.current.shipCol <= 0) {
                  // Ship has cleared the leftmost reel — end the feature.
                  pirateWalkRef.current.active = false;
                  pirateWalkRef.current.ship2Col = -1;
                  setPirateWalkActive(false);
                  setPirateShipCol(-1);
                  setPirateShip2Col(-1);
                  const won = pirateWalkTotalWinRef.current;
                  setTimeout(() => {
                      setCelebrationMsg(won > 0 ? `👻 Ghost Ship Bounty: +${formatCommaNumber(won)}!` : '👻 The Ghost Ship sailed away…');
                      if (won > 0) audioService.playWinBig();
                  }, 250);
                  // DO NOT call spin() here — the IDLE effect re-runs after pirateWalkActive flips false
                  // and will correctly show the free-spin summary (freeSpinsWon > 0) or auto-spin.
              } else if (activeModal === 'NONE' && !jackpotWinTier) {
                  pirateWalkRef.current.shipCol -= 1;
                  setPirateShipCol(pirateWalkRef.current.shipCol);

                  // Jackpot chance per column during free spins (rarest checked first so only one wins)
                  if (freeSpinsWon > 0) {
                      const jpAmts = jackpotService.getAmounts();
                      const JP_WALK = [
                          { name: 'GRAND', chance: 0.0005, idx: 4, color: '#fde68a', icon: '🏆' },
                          { name: 'MEGA',  chance: 0.0015, idx: 3, color: '#fda4af', icon: '👑' },
                          { name: 'MAJOR', chance: 0.005,  idx: 2, color: '#d8b4fe', icon: '🥇' },
                          { name: 'MINOR', chance: 0.015,  idx: 1, color: '#67e8f9', icon: '🥈' },
                          { name: 'MINI',  chance: 0.03,   idx: 0, color: '#4ade80', icon: '🥉' },
                      ] as const;
                      for (const tier of JP_WALK) {
                          if (Math.random() < tier.chance) {
                              const amount = jpAmts[tier.idx];
                              setPlayer(p => ({ ...p, balance: p.balance + amount }));
                              setTimeout(() => setJackpotWinTier({ name: tier.name, color: tier.color, icon: tier.icon, amount }), 400);
                              break;
                          }
                      }
                  }

                  if (pirateWalkRef.current.ship2Col >= 0) {
                      pirateWalkRef.current.ship2Col -= 1;
                      const s2 = pirateWalkRef.current.ship2Col;
                      setPirateShip2Col(s2 >= 0 && s2 < selectedGame.reels ? s2 : -1);
                  }
                  setTimeout(() => spin(), fastSpin ? 150 : 950);
              }
          } else if (holdWinActive) {
              // Auto-continue Hold and Win respins
              if (activeModal === 'NONE') setTimeout(() => spin(), fastSpin ? 100 : 1080);
          } else if (freeSpinsRemaining > 0) {
              const delay = 1200;
              if (activeModal === 'NONE' && !showFreeSpinsPopup && !showArcticPickModal) setTimeout(() => spin(), delay);
          } else if (freeSpinsWon > 0 && !showFreeSpinsPopup && !showFreeSpinSummary) {
              setShowFreeSpinSummary(true);
          } else if (player.autoSpin && !showFreeSpinSummary && freeSpinsWon === 0) {
              if (activeModal === 'NONE') {
                  if (autoSpinRemainingRef.current === 0) {
                      setPlayer(p => ({ ...p, autoSpin: false }));
                      setAutoSpinRemaining(-1);
                  } else {
                      if (autoSpinRemainingRef.current > 0) {
                          autoSpinRemainingRef.current--;
                          setAutoSpinRemaining(autoSpinRemainingRef.current);
                      }
                      setTimeout(() => spin(), fastSpin ? 50 : AUTO_SPIN_DELAY);
                  }
              }
          }
      }
  }, [status, reelTransitioning, holdWinActive, pirateWalkActive, freeSpinsRemaining, player.autoSpin, freeSpinsWon, spin, fastSpin, activeModal, showFreeSpinsPopup, showFreeSpinSummary, jackpotWinTier]);

  const handleHeaderBack = () => {
    if (showCandyRoulette) {
        // Wild Wheel bonus must resolve — ignore back to avoid losing the awarded free spins.
        return;
    }
    if (showNeonRoulette) {
        handleNeonRouletteClose();
        return;
    }
    if (activeModal !== 'NONE') {
        setActiveModal('NONE');
    } else if (currentView === 'HIGH_LIMIT') {
        setIsHighLimit(false);
        setCurrentView('LOBBY');
    } else if (currentView === 'GAME') {
        setSavedGameStates(prev => ({
            ...prev,
            [selectedGame.id]: {
                freeSpinsRemaining,
                totalFreeSpins,
                freeSpinsWon,
                freeSpinTotalWin,
                spinsWithoutBonus,
                grid
            }
        }));
        setPlayer(p => ({ ...p, autoSpin: false }));
        setCurrentView('LOBBY');
    }
  };
  
  const handleShopBuy = (type: 'COIN' | 'BOOST' | 'DIAMOND' | 'PASS_XP' | 'PACK_CREDIT', amount: number, duration?: number, cost?: number) => {
      if (cost) {
          if (type === 'BOOST' || type === 'PASS_XP' || type === 'PACK_CREDIT') {
             if (player.diamonds >= cost) {
                 setPlayer(p => ({...p, diamonds: p.diamonds - cost}));
                 if (type === 'BOOST') setPlayer(p => ({ ...p, xpMultiplier: 2, xpBoostEndTime: Math.max(Date.now(), p.xpBoostEndTime) + (duration || 0) }));
                 if (type === 'PASS_XP') setMissionState(prev => ({ ...prev, passBoostMultiplier: amount, passBoostEndTime: Date.now() + (duration || 0) }));
                 if (type === 'PACK_CREDIT') {
                     setPlayer(p => ({ ...p, packCredits: p.packCredits + amount }));
                     setCelebrationMsg(`+${amount} Pack Credits`);
                 } else {
                     setCelebrationMsg("Boost Activated!");
                 }
                 audioService.playWinBig();
             } else {
                 setCelebrationMsg("Not Enough Gems!");
                 audioService.playStoneBreak();
             }
             return;
          }
      }
      
      if (type === 'COIN') {
          setPlayer(p => ({ ...p, balance: p.balance + amount, freeStashClaimedTime: cost === 0 ? Date.now() : p.freeStashClaimedTime }));
          setCelebrationMsg(`+${formatCommaNumber(amount)} Coins`);
          audioService.playWinBig();
      } else if (type === 'DIAMOND') {
          setPlayer(p => ({ ...p, diamonds: p.diamonds + amount }));
          setCelebrationMsg(`+${amount} Gems`);
          audioService.playWinBig();
      }
  };

  const handleClaimShopItem = (label: string) => {
      setPlayer(p => ({ ...p, shopClaimedItems: [...(p.shopClaimedItems || []), label] }));
  };

  const handleSpinMouseDown = () => {
      if (freeSpinsRemaining > 0 || pirateWalkRef.current.active) return;
      isLongPressRef.current = false;
      spinButtonTimeoutRef.current = setTimeout(() => {
          isLongPressRef.current = true;
          audioService.playClick();
          setShowAutoSpinPopup(true);
      }, 800);
  };

  const handleSpinMouseUp = () => {
      if (spinButtonTimeoutRef.current) {
          clearTimeout(spinButtonTimeoutRef.current);
          spinButtonTimeoutRef.current = null;
      }
      if (isLongPressRef.current) return;
      if (freeSpinsRemaining > 0 || pirateWalkRef.current.active) return;
      if (player.autoSpin) {
          setPlayer(p => ({ ...p, autoSpin: false }));
          setAutoSpinRemaining(-1);
          audioService.playClick();
      } else {
          if (status === GameStatus.IDLE || (status === GameStatus.FREE_SPIN_INTRO && freeSpinsRemaining > 0)) {
              spin();
          } else if (status === GameStatus.SPINNING || status === GameStatus.STOPPING) {
              setInstantStop(true);
              if (status === GameStatus.SPINNING) setStatus(GameStatus.STOPPING);
          }
      }
  };

  const getDeckReward = (deckId: string, level: number) => {
      const idx = GAMES_CONFIG.findIndex(g => g.id === deckId);
      const pct = 0.5 + Math.max(0, idx) * 0.10;
      return Math.round(MAX_BET_BY_LEVEL(level) * 100 * pct);
  };
  const getGrandAlbumReward = (level: number) => MAX_BET_BY_LEVEL(level) * 1000;

  const showGoldHeader = !!player.isVip && (currentView === 'LOBBY' || currentView === 'HIGH_LIMIT');
  const freeCoinsAvailable = (Date.now() - (player.freeStashClaimedTime || 0)) > 86400000;
  const freeCoinsAmount = Math.floor(MAX_BET_BY_LEVEL(player.level) * 0.3);

  if (!appReady) {
      return (
          <div style={{ position: 'fixed', inset: 0, background: '#0a0015', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
              <div style={{ fontSize: '4.5rem', lineHeight: 1 }}>🎰</div>
              <div style={{ fontFamily: "'Titan One', cursive", fontWeight: 900, fontSize: 28, background: 'linear-gradient(180deg,#fff8c0,#ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: 2 }}>
                  Scatter Pa More
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Loading…</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {[0,1,2].map(i => (
                      <div key={i} className="animate-bounce" style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffd700', animationDelay: `${i * 0.18}s` }} />
                  ))}
              </div>
          </div>
      );
  }

  return (
    <div
      className="bg-[#0a0015] flex items-center justify-center overflow-hidden"
      style={{ position: 'fixed', inset: 0 }}
    >
      <div className="relative overflow-hidden rounded-none shadow-[0_0_80px_rgba(0,0,0,0.52)] bg-[#120024]" style={{ width: 844, height: 390, transform: `scale(${mobileScale})`, transformOrigin: 'center center' }}>
        <div className={`w-full h-full bg-casino-bg text-white font-body overflow-hidden flex flex-col ${selectedGame.bgImage}`}
          style={currentView === 'GAME' && selectedGame.slotBg ? { backgroundImage: `url(${selectedGame.slotBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : undefined}>
          <header className="w-full z-[100] flex justify-between items-center h-[29px] md:h-[35px] select-none overflow-visible shrink-0"
            style={showGoldHeader ?
              { background:'linear-gradient(180deg,#c9901a,#7a5000)', borderBottom:'none', boxShadow:'0 8px 24px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.7)' } :
              { background:'linear-gradient(180deg,#c060ff,#8020e0)', borderBottom:'none', boxShadow:'0 8px 24px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.7)' }}>
            {/* Bar B (Replicated from mockup - stats, lobby home, multipliers, mute) */}
            <div className="barB bar font-nunito w-full h-full flex items-center gap-1 md:gap-1.5 rounded-none p-1.5 px-3 md:px-6" style={{ borderTop:'none', ...(showGoldHeader ? { background:'linear-gradient(180deg,#c9901a,#7a5000)', borderColor:'#8b6200' } : {}) }}>

                {/* LEFT ZONE — Avatar + Coins + Gems */}
                <div className="flex items-center gap-1 md:gap-1.5 flex-1 min-w-0">
                    {/* Lobby Home Button */}
                    <div
                        onClick={currentView !== 'LOBBY' ? handleHeaderBack : () => setShowProfile(true)}
                        className="round-btn shrink-0 cursor-pointer"
                        style={showGoldHeader ? { background:'linear-gradient(180deg,#e0a820,#9a6800)', boxShadow:'0 2px 0 #5a3800' } : {}}
                    >
                        {currentView !== 'LOBBY'
                            ? <i className="ti ti-arrow-left"></i>
                            : (profileEmoji ? <span className="text-base leading-none">{profileEmoji}</span> : <i className="ti ti-user" />)
                        }
                    </div>

                    {/* Coins + Gems pills */}
                    <div className="flex items-center gap-[3px] md:gap-1.5 min-w-0">
                        <div className="currency-pill flex items-center gap-1 shrink-0" style={{ overflow: 'visible', minWidth: '150px', maxWidth: '220px' }}>
                            <img src="/symbols/coin.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0, marginLeft: '-6px' }} />
                            <span className="num flex-1" style={{ paddingRight: '4px' }}>{formatK(animBalance !== null ? animBalance : player.balance)}</span>
                        </div>
                        <div className="currency-pill flex items-center gap-1 shrink-0" style={{ overflow: 'visible', minWidth: '72px', maxWidth: '110px' }}>
                            <img src="/symbols/diamond.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0, marginLeft: '-6px' }} />
                            <span className="num flex-1" style={{ paddingRight: '4px' }}>{formatK(player.diamonds)}</span>
                        </div>
                    </div>
                </div>

                {/* CENTER ZONE — Buy & Sale (truly centered) */}
                <div className="flex items-center gap-1 shrink-0">
                    <div onClick={() => openShop('COINS')} className="btn green buyB shrink-0">
                        <div className="face text-center"><span className="lbl">BUY</span></div>
                    </div>
                    <div onClick={() => setShowPremiumModal(true)} className="btn yellow saleB shrink-0">
                        <div className="face text-center"><span className="lbl">SALE</span></div>
                    </div>
                </div>

                {/* RIGHT ZONE — Piggy + Level + XP + Settings */}
                <div className="flex items-center gap-1 flex-1 justify-end">
                    <img src="/ui/piggy.png" alt="" onClick={handleOpenPiggyBank}
                        style={{ width: 34, height: 34, objectFit: 'contain', cursor: 'pointer', flexShrink: 0, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))' }}
                        className="shrink-0 active:scale-90 transition-transform" />

                    {/* Level Pill */}
                    <div className="rtrack !flex-none w-[110px] md:w-[145px]" style={{ justifyContent: 'flex-start', gap: 4, paddingLeft: 2, paddingRight: 6, overflow: 'visible' }}>
                        <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 10, pointerEvents: 'none' }}>
                            {(() => {
                                const xpBoostOn = (player.xpMultiplier || 1) > 1 && (player.xpBoostEndTime || 0) > Date.now();
                                return <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(100, (player.xp / player.xpToNextLevel) * 100)}%`, background: xpBoostOn ? 'linear-gradient(180deg,#ffe066,#e8a800 60%,#b07000)' : 'linear-gradient(180deg,#7fd0ff,#2b8fe8 60%,#1565b0)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)', transition: 'width 0.4s ease' }} />;
                            })()}
                        </div>
                        <img src="/ui/star.png" alt="" style={{ flexShrink: 0, width: 32, height: 32, objectFit: 'contain', position: 'relative', zIndex: 1, marginLeft: '-6px' }} />
                        <span className="rnum font-black" style={{ fontSize: '13px', letterSpacing: '0.02em', flex: 1, textAlign: 'center' }}>
                            {showXpPct ? `${Math.floor((player.xp / player.xpToNextLevel) * 100)}%` : `LV.${player.level}`}
                        </span>
                    </div>

                    {/* Active Multiplier indicator */}
                    <div className="relative shrink-0 flex items-center justify-center" style={{ width: 34, height: 34 }}>
                        <img src="/ui/exp_multiplier.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                        <span style={{ position: 'relative', zIndex: 1, fontSize: 12, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 1px 3px rgba(0,0,0,1)', marginTop: '-3px' }}>
                            {(() => {
                                const boostActive = (player.xpMultiplier || 1) > 1 && (player.xpBoostEndTime || 0) > Date.now();
                                if (boostActive && showXpTimer) {
                                    const rem = Math.max(0, (player.xpBoostEndTime || 0) - Date.now());
                                    const h = Math.floor(rem / 3600000);
                                    const m = Math.floor((rem % 3600000) / 60000);
                                    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                                }
                                return `x${player.xpMultiplier}`;
                            })()}
                        </span>
                    </div>

                    {/* Settings button */}
                    <div
                        onClick={() => showNeonRoulette ? handleNeonRouletteClose() : setShowSettings(true)}
                        className="round-btn shrink-0 cursor-pointer"
                        style={showGoldHeader ? { background:'linear-gradient(180deg,#e0a820,#9a6800)', boxShadow:'0 2px 0 #5a3800' } : {}}
                    >
                        <i className="ti ti-settings"></i>
                    </div>
                </div>
            </div>
      </header>

      <main className="relative pt-0 w-full flex-1 flex flex-col overflow-hidden min-h-0">
        {(currentView === 'LOBBY' || currentView === 'HIGH_LIMIT') ? (
            <Lobby
                onSelectGame={handleGameSelect}
                onOpenWildQuest={handleWildQuestClaim}
                onOpenDiceQuest={handleDiceQuestClaim}
                onOpenMiniGames={() => setShowMiniGamesHub(true)}
                onOpenMissions={openMissionsModal}
                onOpenBattlePass={openBattlePassModal}
                onClaimBonus={handleOpenTimeBonus}
                onOpenCollection={() => openModal('COLLECTION')}
                onOpenPiggyBank={handleOpenPiggyBank}
                onOpenInbox={() => setShowInbox(true)}
                inboxCount={inbox.filter((m: any) => !m.claimed).length}
                onOpenHighRoller={handleOpenHighRoller}
                onOpenVipLounge={() => setShowVipLounge(true)}
                questState={quest}
                missionState={missionState}
                nextTimeBonus={nextBonusTime}
                bonusAmount={CALCULATE_TIME_BONUS(player.level)}
                isHighLimit={currentView === 'HIGH_LIMIT'}
                isVip={!!player.isVip}
                playerLevel={player.level}
                currentBet={MAX_BET_BY_LEVEL(player.level)}
                piggyBank={player.piggyBank}
                piggyMaxBet={MAX_BET_BY_LEVEL(player.level)}
                packCredits={player.packCredits}
                premiumPackCredits={player.premiumPackCredits ?? 0}
            />
        ) : (
            <div className="flex-1 flex flex-col items-center justify-start p-0 m-0 relative h-full pb-[56px] md:pb-[64px] max-w-3xl mx-auto w-full select-none min-h-0 gap-0">

                {/* Quest + Pass vertical panel — always visible in game view */}
                {(() => {
                    const qReady = false;
                    const visibleDailyMissions = missionState.activeMissions.filter((m: any) => m.frequency === 'DAILY').slice(0, 4);
                    const missReady = visibleDailyMissions.filter((m: any) => m.completed && !m.claimed).length;
                    const passReady = missionState.passRewards.filter((r: any) => r.level <= missionState.passLevel && !r.claimed && (r.tier === 'FREE' || missionState.isPremium)).length;
                    const totalNotifs = missReady + passReady;
                    const isQuestLocked = player.level < 20;
                    const isPassLocked = player.level < 10;
                    return (
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1 items-center select-none"
                            style={{ background: isHighLimit ? 'linear-gradient(180deg,#c9901a,#7a5000)' : 'linear-gradient(180deg,#7c3fb5,#4a1880)', borderRadius:'21px', padding:'6px 6px 8px', boxShadow:'0 4px 14px rgba(0,0,0,0.6),inset 0 1px 1px rgba(255,255,255,0.18)', width:'66px' }}>
                            {/* Mine */}
                            <button
                                onClick={!isQuestLocked ? handleWildQuestClaim : undefined}
                                className={`relative flex flex-col items-center transition-transform ${isQuestLocked ? 'grayscale opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                            >
                                {quest.wildCredits > 0 && !isQuestLocked && (
                                    <div className="absolute top-1 right-1 w-4 h-4 bg-red-600 rounded-full border border-yellow-400 flex items-center justify-center text-[9px] text-white font-black z-10" style={{ WebkitTextStroke:'0.5px #000', paintOrder:'stroke fill' }}>
                                        {quest.wildCredits}
                                    </div>
                                )}
                                <img src="/ui/mine_new.png" alt="" style={{ width: 54, height: 54, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                                <div style={{ width:'100%', textAlign:'center', fontSize:8, fontWeight:900, background:'linear-gradient(180deg,#a0f040,#4ab800)', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.5),0 2px 0 #1a6000', color:'#0a3000', borderRadius:8, padding:'2px 0', textShadow:'0 1px 0 rgba(255,255,255,0.3)', marginTop:'-6px' }}>Play</div>
                            </button>
                            {/* Dice */}
                            <button
                                onClick={!isQuestLocked ? handleDiceQuestClaim : undefined}
                                className={`relative flex flex-col items-center transition-transform ${isQuestLocked ? 'grayscale opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                            >
                                {quest.diceCredits > 0 && !isQuestLocked && (
                                    <div className="absolute top-1 right-1 w-4 h-4 bg-red-600 rounded-full border border-yellow-400 flex items-center justify-center text-[9px] text-white font-black z-10" style={{ WebkitTextStroke:'0.5px #000', paintOrder:'stroke fill' }}>
                                        {quest.diceCredits}
                                    </div>
                                )}
                                <img src="/ui/dice.png" alt="" style={{ width: 54, height: 54, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                                <div style={{ width:'100%', textAlign:'center', fontSize:8, fontWeight:900, background:'linear-gradient(180deg,#a0f040,#4ab800)', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.5),0 2px 0 #1a6000', color:'#0a3000', borderRadius:8, padding:'2px 0', textShadow:'0 1px 0 rgba(255,255,255,0.3)', marginTop:'-6px' }}>Play</div>
                            </button>
                            {/* Pass */}
                            <button
                                onClick={!isPassLocked ? openBattlePassModal : undefined}
                                className={`relative flex flex-col items-center transition-transform ${isPassLocked ? 'grayscale opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                            >
                                {totalNotifs > 0 && !isPassLocked && (
                                    <div className="absolute top-1 right-1 w-4 h-4 bg-red-600 rounded-full border border-yellow-400 flex items-center justify-center text-[9px] text-white font-black z-10" style={{ WebkitTextStroke:'0.5px #000', paintOrder:'stroke fill' }}>
                                        {totalNotifs}
                                    </div>
                                )}
                                <img src="/ui/pass.png" alt="" style={{ width: 54, height: 54, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                                <div style={{ width:'100%', textAlign:'center', fontSize:8, fontWeight:900, background:'linear-gradient(180deg,#2a2a2a,#111)', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.12),0 2px 0 #000', color:'#fde68a', borderRadius:8, padding:'2px 0', marginTop:'-6px' }}>LV.{missionState.passLevel}</div>
                            </button>
                        </div>
                    );
                })()}
                {(() => {
                    const JP_BG: Record<string, string> = {
                        DRAGON:     'linear-gradient(180deg,rgba(120,20,0,0.6),rgba(50,0,0,0.6))',
                        EGYPT:      'linear-gradient(180deg,rgba(100,70,0,0.6),rgba(50,30,0,0.6))',
                        NEON:       'linear-gradient(180deg,rgba(80,0,130,0.6),rgba(30,0,70,0.6))',
                        CANDY:      'linear-gradient(180deg,rgba(140,0,80,0.6),rgba(70,0,40,0.6))',
                        PIRATE:     'linear-gradient(180deg,rgba(50,25,0,0.6),rgba(25,10,0,0.6))',
                        PIGGY:      'linear-gradient(180deg,rgba(120,0,70,0.6),rgba(60,0,40,0.6))',
                        ARCTIC:     'linear-gradient(180deg,rgba(0,50,100,0.6),rgba(0,20,55,0.6))',
                        WESTERN:    'linear-gradient(180deg,rgba(80,40,0,0.6),rgba(40,15,0,0.6))',
                        SPACE:      'linear-gradient(180deg,rgba(0,20,80,0.6),rgba(0,5,40,0.6))',
                        JUNGLE:     'linear-gradient(180deg,rgba(0,60,20,0.6),rgba(0,25,8,0.6))',
                        UNDERWATER: 'linear-gradient(180deg,rgba(0,30,90,0.6),rgba(0,10,50,0.6))',
                        SAMURAI:    'linear-gradient(180deg,rgba(80,0,0,0.6),rgba(30,0,0,0.6))',
                        LEPRECHAUN: 'linear-gradient(180deg,rgba(0,70,20,0.6),rgba(0,30,8,0.6))',
                        GOLDEN_POT: 'linear-gradient(180deg,rgba(100,65,0,0.6),rgba(50,28,0,0.6))',
                    };
                    return (
                        <div className="w-full z-10 p-0 m-0">
                            {selectedGame.theme === 'ARCTIC' ? (
                                showArcticPickModal
                                    ? <JackpotTicker slotIdx={GAMES_CONFIG.findIndex(g => g.id === selectedGame.id)} currentBet={availableBets[betIndex]} isSpinning={false} />
                                    : freeSpinsRemaining > 0
                                        ? <ArcticMultiplierBar
                                            mults={[2, 3, 4, 5, 10]}
                                            stepIdx={Math.min(Math.max(cascadeMultiplier - 2, 0), 4)}
                                            isActive={status === GameStatus.CASCADE && cascadeMultiplier >= 2}
                                          />
                                        : <ArcticProgressBar progress={arcticSpinProgress} />
                            ) : (
                                <JackpotTicker slotIdx={GAMES_CONFIG.findIndex(g => g.id === selectedGame.id)} currentBet={availableBets[betIndex]} isSpinning={status === GameStatus.SPINNING || status === GameStatus.STOPPING} />
                            )}
                        </div>
                    );
                })()}

                <div className="flex-1 flex items-center justify-center w-full min-h-0 relative m-0 p-0">
                    {(() => {
                        const REEL_BORDER: Record<string, { cls: string; shadow: string }> = {
                            DRAGON:     { cls: 'rounded-xl border-[3px] border-orange-600',   shadow: '0 0 22px rgba(234,88,12,0.55),inset 0 0 10px rgba(180,40,0,0.2)' },
                            EGYPT:      { cls: 'rounded-none border-[3px] border-yellow-500', shadow: '0 0 20px rgba(234,179,8,0.5),inset 0 0 8px rgba(160,110,0,0.15)' },
                            NEON:       { cls: 'rounded-xl border-[2px] border-fuchsia-500',  shadow: '0 0 24px rgba(217,70,239,0.65),inset 0 0 12px rgba(160,0,220,0.2)' },
                            CANDY:      { cls: 'rounded-2xl border-[3px] border-pink-300',    shadow: '0 0 20px rgba(249,168,212,0.6),inset 0 0 8px rgba(219,39,119,0.15)' },
                            PIRATE:     { cls: 'rounded-lg border-[4px] border-amber-700',    shadow: '0 0 14px rgba(180,83,9,0.45)' },
                            PIGGY:      { cls: 'rounded-2xl border-[3px] border-pink-400',    shadow: '0 0 18px rgba(244,114,182,0.5)' },
                            ARCTIC:     { cls: 'rounded-xl border-[2px] border-cyan-300',     shadow: '0 0 22px rgba(103,232,249,0.5),inset 0 0 10px rgba(0,200,240,0.1)' },
                            WESTERN:    { cls: 'rounded-lg border-[4px] border-amber-800',    shadow: '0 0 12px rgba(120,50,0,0.45)' },
                            SPACE:      { cls: 'rounded-xl border-[2px] border-cyan-400',     shadow: '0 0 26px rgba(34,211,238,0.65),inset 0 0 12px rgba(0,200,255,0.15)' },
                            JUNGLE:     { cls: 'rounded-xl border-[3px] border-green-500',    shadow: '0 0 16px rgba(34,197,94,0.5)' },
                            UNDERWATER: { cls: 'rounded-xl border-[2px] border-blue-400',     shadow: '0 0 22px rgba(96,165,250,0.5),inset 0 0 10px rgba(0,80,200,0.1)' },
                            SAMURAI:    { cls: 'rounded border-[3px] border-red-800',          shadow: '0 0 16px rgba(185,28,28,0.55)' },
                            LEPRECHAUN: { cls: 'rounded-xl border-[3px] border-emerald-400',  shadow: '0 0 18px rgba(52,211,153,0.5)' },
                            GOLDEN_POT: { cls: 'rounded-xl border-[3px] border-yellow-400',   shadow: '0 0 22px rgba(250,204,21,0.55),inset 0 0 10px rgba(180,130,0,0.1)' },
                        };
                        return (
                    <div
                        className={`relative z-10 h-full max-h-full overflow-hidden flex gap-0
                            ${reelTransitioning === 'out' ? 'animate-reel-out' : reelTransitioning === 'in' ? 'animate-reel-in' : ''}
                        `}
                        style={{ aspectRatio: selectedGame.theme === 'NEON' ? `${selectedGame.reels}/2` : `${selectedGame.reels}/${selectedGame.rows}` }}
                    >
                        {(() => {
                            // Pre-compute which reel starts the anticipation window so ALL remaining reels
                            // get the same +900 ms extension (not just the last one).
                            let anticipationStartReel = -1;
                            if (!fastSpin && targetGrid.length > 0) {
                                let sc = 0;
                                for (let c = 0; c < targetGrid.length - 1; c++) {
                                    if (targetGrid[c]?.some(s => s === SymbolType.SCATTER)) {
                                        sc++;
                                        if (sc >= 2) { anticipationStartReel = c + 1; break; }
                                    }
                                }
                            }
                            const isAnticipating = scatterAnticipation || (anticipationStartReel !== -1 && stoppedReels >= anticipationStartReel);
                            return grid.map((col, i) => (
                            <Reel
                                key={i}
                                id={i}
                                symbols={targetGrid.length > 0 ? targetGrid[i] : col}
                                spinning={status === GameStatus.SPINNING || status === GameStatus.STOPPING}
                                stopping={status === GameStatus.STOPPING}
                                stopDelay={instantStop ? 0 : (() => {
                                    if (!fastSpin && anticipationStartReel !== -1 && i >= anticipationStartReel) {
                                        // Each anticipated reel gets its own sequential 900ms window
                                        return anticipationStartReel * REEL_DELAY + (i - anticipationStartReel + 1) * 900;
                                    }
                                    return i * (fastSpin && freeSpinsRemaining === 0 ? 50 : REEL_DELAY);
                                })()}
                                duration={fastSpin && freeSpinsRemaining === 0 ? 200 : SPIN_DURATION}
                                onStop={handleReelStop}
                                winningIndices={winData?.winningCells.filter(cell => cell.col === i).map(c => c.row) || []}
                                gameConfig={selectedGame}
                                isScatterShowcase={status === GameStatus.SCATTER_SHOWCASE}
                                forcedSymbols={cascadeGrid ? cascadeGrid[i] : undefined}
                                newCells={cascadeNewCells ? cascadeNewCells[i] : undefined}
                                dissolving={cascadeDissolving}
                                anticipation={isAnticipating && i === stoppedReels}
                            />
                            ));
                        })()}

                        {/* Hold and Win locked-cell overlay */}
                        {holdWinActive && selectedGame.theme === 'EGYPT' && (
                            <div className="absolute inset-0 z-20 pointer-events-none flex gap-0.5 p-1">
                                {Array(selectedGame.reels).fill(null).map((_, c) => (
                                    <div key={c} className="flex-1 flex flex-col gap-0.5">
                                        {Array(selectedGame.rows).fill(null).map((_, r) => {
                                            const locked = holdWinLockedGrid[c]?.[r];
                                            const val = holdWinCoinValues[c]?.[r];
                                            const jpTier = holdWinJpGrid[c]?.[r];
                                            const JP_COLORS: Record<string, string> = { MINI: '#4ade80', MINOR: '#67e8f9', MAJOR: '#d8b4fe', MEGA: '#fda4af', GRAND: '#fde68a' };
                                            const isCounting = hwCountingCell?.c === c && hwCountingCell?.r === r;
                                            const borderColor = isCounting ? '#ffffff' : (locked ? (jpTier ? JP_COLORS[jpTier] : '#fbbf24') : 'transparent');
                                            const glowColor = isCounting ? 'rgba(255,255,255,0.9)' : (locked ? (jpTier ? JP_COLORS[jpTier] + 'cc' : 'rgba(251,191,36,0.8)') : 'transparent');
                                            return (
                                                <div key={r} className={`flex-1 relative flex items-center justify-center ${isCounting ? 'animate-bounce-sm' : ''}`}
                                                    style={{
                                                        border: `2px solid ${borderColor}`,
                                                        boxShadow: locked ? `0 0 ${isCounting ? 18 : 10}px ${glowColor}, inset 0 0 8px ${jpTier ? JP_COLORS[jpTier] + '44' : 'rgba(251,191,36,0.25)'}` : 'none',
                                                        background: locked ? (isCounting ? 'rgba(255,255,255,0.12)' : (jpTier ? JP_COLORS[jpTier] + '18' : 'rgba(251,191,36,0.08)')) : 'transparent',
                                                        borderRadius: 3,
                                                    }}>
                                                    {locked ? (
                                                        <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full">
                                                            {jpTier ? (
                                                                <span style={{ fontSize: 'clamp(9px,2vw,13px)', fontWeight: 900, color: isCounting ? '#ffffff' : JP_COLORS[jpTier], textShadow: '0 0 6px rgba(0,0,0,1)', lineHeight: 1, letterSpacing: '0.04em' }}>
                                                                    {jpTier}
                                                                </span>
                                                            ) : val ? (
                                                                <span style={{ fontSize: 'clamp(10px,2.2vw,14px)', fontWeight: 900, color: '#ffffff', textShadow: '0 0 4px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,0.9)', lineHeight: 1 }}>
                                                                    {formatKShort(val)}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Egypt coin meta overlay — show values on COIN cells during normal/free spins */}
                        {!holdWinActive && selectedGame.theme === 'EGYPT' && egyptCoinMeta &&
                         status !== GameStatus.SPINNING && (
                            <div className="absolute inset-0 z-20 pointer-events-none flex gap-0.5 p-1">
                                {Array(selectedGame.reels).fill(null).map((_, c) => (
                                    <div key={c} className="flex-1 flex flex-col gap-0.5">
                                        {Array(selectedGame.rows).fill(null).map((_, r) => {
                                            const val = egyptCoinMeta.values[c]?.[r];
                                            const jpTier = egyptCoinMeta.jpGrid[c]?.[r];
                                            const JP_COLORS: Record<string, string> = { MINI: '#4ade80', MINOR: '#67e8f9', MAJOR: '#d8b4fe', MEGA: '#fda4af', GRAND: '#fde68a' };
                                            if (val === null || val === undefined) return <div key={r} className="flex-1" />;
                                            return (
                                                <div key={r} className="flex-1 relative flex items-center justify-center"
                                                    style={{
                                                        border: `2px solid ${jpTier ? JP_COLORS[jpTier] : '#fbbf24'}`,
                                                        boxShadow: `0 0 8px ${jpTier ? JP_COLORS[jpTier] + 'aa' : 'rgba(251,191,36,0.6)'}`,
                                                        background: jpTier ? JP_COLORS[jpTier] + '15' : 'rgba(251,191,36,0.06)',
                                                        borderRadius: 3,
                                                    }}>
                                                    <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full">
                                                        {jpTier ? (
                                                            <span style={{ fontSize: 'clamp(9px,2vw,13px)', fontWeight: 900, color: JP_COLORS[jpTier], textShadow: '0 0 6px rgba(0,0,0,1)', lineHeight: 1, letterSpacing: '0.04em' }}>
                                                                {jpTier}
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: 'clamp(10px,2.2vw,14px)', fontWeight: 900, color: '#ffffff', textShadow: '0 0 4px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,0.9)', lineHeight: 1 }}>
                                                                {formatKShort(val)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* PIRATE Ghost Ship — glowing wild column highlight + ship marker (dual ships supported) */}
                        {pirateWalkActive && selectedGame.theme === 'PIRATE' && pirateShipCol >= 0 && (
                            <div className="absolute inset-0 z-20 pointer-events-none flex gap-0.5 p-1">
                                {Array(selectedGame.reels).fill(null).map((_, c) => (
                                    <div key={c} className="flex-1 relative">
                                        {(c === pirateShipCol || c === pirateShip2Col) && (
                                            <div className="absolute inset-0 flex items-start justify-center animate-pop-in"
                                                style={{
                                                    border: '2.5px solid #38e8ff',
                                                    borderRadius: 5,
                                                    boxShadow: '0 0 22px rgba(56,232,255,0.85), inset 0 0 26px rgba(56,232,255,0.35)',
                                                    background: 'linear-gradient(180deg,rgba(56,232,255,0.18),rgba(20,80,120,0.05))',
                                                }}>
                                                <span style={{ fontSize: 'clamp(20px,5vw,34px)', lineHeight: 1, marginTop: '-2px', filter: 'drop-shadow(0 0 8px rgba(56,232,255,0.9))' }}>🚢</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}


                        {/* PIRATE free-spin counter — shows remaining / total beneath the Ghost Ship banner */}
                        {selectedGame.theme === 'PIRATE' && totalFreeSpins > 0 && (
                            <div className="absolute -bottom-1 inset-x-0 flex justify-center z-30 pointer-events-none">
                                <div style={{
                                    background: 'linear-gradient(180deg,#06212b,#030e14)',
                                    border: '1.5px solid rgba(56,232,255,0.5)',
                                    borderRadius: 999,
                                    padding: '2px 10px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.7)',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}>
                                    <span className="font-black text-cyan-200" style={{ fontSize: 'clamp(9px,2.2vw,12px)' }}>
                                        FREE SPINS
                                    </span>
                                    <span className="font-black text-yellow-300" style={{ fontSize: 'clamp(10px,2.4vw,13px)' }}>
                                        {freeSpinsRemaining}/{totalFreeSpins}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* SPACE Supernova — progressive multiplier banner during free spins */}
                        {selectedGame.theme === 'SPACE' && totalFreeSpins > 0 && (
                            <div className="absolute -top-1 inset-x-0 flex justify-center z-30 pointer-events-none animate-pop-in">
                                <div style={{
                                    background: 'linear-gradient(180deg,#3b1a6e,#1a0a3a)',
                                    border: '2px solid #c084fc',
                                    borderRadius: 999,
                                    padding: '4px 14px',
                                    boxShadow: '0 0 18px rgba(192,132,252,0.6), 0 4px 10px rgba(0,0,0,0.6)',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}>
                                    <span className="font-black uppercase tracking-widest" style={{ fontSize: 'clamp(9px,2.4vw,13px)', color: '#e9d5ff', textShadow: '0 0 8px rgba(192,132,252,0.9)' }}>
                                        <img src="/ui/star.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block', marginRight: 3 }} />Supernova
                                    </span>
                                    <span className="font-black" style={{ fontSize: 'clamp(11px,3vw,16px)', color: '#fde68a', textShadow: '0 0 8px rgba(251,191,36,0.8)' }}>
                                        ×{spaceMultiplier}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* CANDY Wild Wheel — expanding wild-reel highlights */}
                        {selectedGame.theme === 'CANDY' && totalFreeSpins > 0 && candyCols.length > 0 && (
                            <div className="absolute inset-0 z-20 pointer-events-none">
                                {(candyShuffledCols ?? candyCols).map((colInfo, idx) => (
                                    <div key={idx} className="absolute inset-y-1"
                                        style={{
                                            left: `calc(${(colInfo.col / selectedGame.reels) * 100}% + 2px)`,
                                            width: `calc(${(1 / selectedGame.reels) * 100}% - 4px)`,
                                            transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
                                            border: '2.5px solid #f9a8d4',
                                            borderRadius: 5,
                                            boxShadow: '0 0 22px rgba(236,72,153,0.8), inset 0 0 26px rgba(236,72,153,0.3)',
                                            background: 'linear-gradient(180deg,rgba(236,72,153,0.20),rgba(168,85,247,0.08))',
                                            animation: candyShuffledCols ? 'candyGlow 1.5s ease-in-out infinite' : 'candyExpand 0.55s cubic-bezier(0.2,1.2,0.4,1) forwards, candyGlow 1.5s ease-in-out 0.55s infinite',
                                        }} />
                                ))}
                            </div>
                        )}

                        {/* CANDY — individual wild cell containers (single-mode wilds) */}
                        {selectedGame.theme === 'CANDY' && totalFreeSpins > 0 && candySingleWilds.length > 0 && (
                            <div className="absolute inset-0 z-20 pointer-events-none">
                                {(candyShuffledSingles ?? candySingleWilds).map((w, idx) => (
                                    <div key={idx} className="absolute"
                                        style={{
                                            left: `calc(${(w.col / selectedGame.reels) * 100}% + 2px)`,
                                            width: `calc(${(1 / selectedGame.reels) * 100}% - 4px)`,
                                            top: `calc(${(w.row / selectedGame.rows) * 100}% + 2px)`,
                                            height: `calc(${(1 / selectedGame.rows) * 100}% - 4px)`,
                                            transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1), top 0.25s cubic-bezier(0.4,0,0.2,1)',
                                            border: '2px solid #f9a8d4',
                                            borderRadius: 4,
                                            background: 'rgba(236,72,153,0.12)',
                                            animation: candyShuffledSingles ? 'candyGlow 1.5s ease-in-out infinite' : 'candyExpand 0.4s cubic-bezier(0.2,1.2,0.4,1) forwards, candyGlow 1.5s ease-in-out 0.4s infinite',
                                        }} />
                                ))}
                            </div>
                        )}

                        {/* CANDY Wild Wheel — feature banner above the reels */}
                        {selectedGame.theme === 'CANDY' && totalFreeSpins > 0 && candyConfig && (
                            <div className="absolute -top-1 inset-x-0 flex justify-center z-30 pointer-events-none animate-pop-in">
                                <div style={{
                                    background: 'linear-gradient(180deg,#9d174d,#500724)',
                                    border: '2px solid #f472b6',
                                    borderRadius: 999,
                                    padding: '4px 14px',
                                    boxShadow: '0 0 18px rgba(236,72,153,0.6), 0 4px 10px rgba(0,0,0,0.6)',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}>
                                    <span className="font-black uppercase tracking-widest" style={{ fontSize: 'clamp(9px,2.4vw,13px)', color: '#fce7f3', textShadow: '0 0 8px rgba(236,72,153,0.9)' }}>
                                        🍬 {candyConfig.count} {candyConfig.mode === 'column' ? 'Wild Reels' : 'Wilds'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Dragon Pick-and-Win grid — renders inside reel container as absolute overlay */}
                        {showDragonPickModal && selectedGame.theme === 'DRAGON' && (
                            <DragonPickGrid
                                jackpotAmounts={jackpotService.getAmounts()}
                                currentBet={availableBets[betIndex]}
                                onWin={handleDragonPickWin}
                                rows={selectedGame.rows}
                                cols={selectedGame.reels}
                            />
                        )}

                        {/* Arctic Pick-and-Win grid — same layout as Dragon, ice cube theme */}
                        {showArcticPickModal && selectedGame.theme === 'ARCTIC' && (
                            <ArcticPickGrid
                                jackpotAmounts={jackpotService.getAmounts()}
                                currentBet={availableBets[betIndex]}
                                onWin={handleArcticPickWin}
                                rows={selectedGame.rows}
                                cols={selectedGame.reels}
                            />
                        )}
                    </div>
                        );
                    })()}

                    {/* Dragon pot — absolute right so reel grid stays centered */}
                    {selectedGame.theme === 'DRAGON' && freeSpinsRemaining === 0 && (
                        <div className="flex flex-col items-center justify-center gap-2 absolute" style={{ right: 0, top: '50%', transform: 'translateY(-50%)' }}>
                            <div className="flex flex-col items-center gap-1.5">
                                <div className="relative flex items-center justify-center rounded-xl p-2"
                                    style={{ background: 'linear-gradient(160deg,#1a0800,#3a1200)', border: '1.5px solid rgba(251,191,36,0.4)', boxShadow: '0 4px 16px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,180,0,0.15)' }}>
                                    {dragonCoinAbsorbing && (
                                        <span
                                            className="animate-coin-absorb"
                                            style={{ position: 'absolute', fontSize: 'clamp(18px,3.5vw,28px)', lineHeight: 1, top: '-14px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}
                                        >🪙</span>
                                    )}
                                    <img
                                        src="/ui/dragon_vase.png"
                                        alt=""
                                        className={dragonPotShaking ? 'animate-vibrate' : ''}
                                        style={{ width: 'clamp(52px,10vw,80px)', height: 'clamp(52px,10vw,80px)', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 2px 8px rgba(255,140,0,0.6))' }}
                                    />
                                </div>
                                <div className="flex flex-row items-center gap-1">
                                    {[10, 20, 30, 40, 50].map((threshold, idx) => {
                                        const filled = dragonPickSpinsRef.current >= threshold;
                                        return (
                                            <div key={idx} className="rounded-full" style={{
                                                width: 7, height: 7,
                                                background: filled ? '#fbbf24' : 'rgba(255,255,255,0.15)',
                                                boxShadow: filled ? '0 0 5px rgba(251,191,36,0.9)' : 'none',
                                            }} />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Egypt HW respin counter — absolute right so reel grid stays centered */}
                    {holdWinActive && selectedGame.theme === 'EGYPT' && (
                        <div className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg absolute"
                            style={{ right: 0, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(251,191,36,0.5)', boxShadow: '0 0 10px rgba(251,191,36,0.3)' }}>
                            <span style={{ fontSize: 'clamp(7px,1.3vw,10px)', color: '#fbbf24', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>RESPINS</span>
                            <span style={{ fontSize: 'clamp(14px,2.8vw,20px)', color: '#fde68a', fontWeight: 900, textShadow: '0 0 10px rgba(251,191,36,0.8)', lineHeight: 1 }}>
                                {holdWinRespins}/3
                            </span>
                        </div>
                    )}
                </div>


            </div>
        )}
      </main>

      {currentView === 'GAME' && (
          <div className="fixed bottom-0 w-full z-50 flex flex-col select-none"
            style={isHighLimit ?
              { background:'linear-gradient(180deg,#2a1a00,#1a0f00)', borderTop:'none', boxShadow:'0 -10px 35px rgba(0,0,0,0.85)' } :
              { background:'#0a001a', borderTop:'none', boxShadow:'0 -10px 35px rgba(0,0,0,0.85)' }}>
              {/* Bar A (Replicated from mockup - Bet details, Win panel, Spin trigger) */}
              <div className="barA bar font-nunito w-full flex items-stretch gap-1 md:gap-1.5 rounded-none p-1.5 px-3 md:px-6 h-[56px] md:h-[64px]"
                style={isHighLimit ? { background:'linear-gradient(180deg,#c9901a,#7a5000)', borderColor:'#8b6200' } : {}}>
                  {/* Missions Button */}
                  {(() => {
                      const visibleDaily = missionState.activeMissions.filter((m: any) => m.frequency === 'DAILY').slice(0, 4);
                      const missReady = visibleDaily.filter((m: any) => m.completed && !m.claimed).length;
                      return (
                          <div onClick={openMissionsModal} className="icon-btn shrink-0 flex flex-col items-center justify-end relative"
                              style={isHighLimit ? { background:'linear-gradient(180deg,#e0a820,#9a6800)', borderColor:'#8b6200' } : {}}>
                              {missReady > 0 && (
                                  <div className="absolute top-0 right-0 w-4 h-4 bg-red-600 rounded-full border border-yellow-400 flex items-center justify-center text-[9px] text-white font-black z-10" style={{ WebkitTextStroke:'0.5px #000', paintOrder:'stroke fill' }}>{missReady}</div>
                              )}
                              <i className="ti ti-target-arrow"></i>
                              <span>MISSIONS</span>
                          </div>
                      );
                  })()}

                  {/* Minus Bet */}
                  <div
                      onClick={() => {
                          if (betIndex > 0 && status === GameStatus.IDLE) {
                              setBetIndex(prev => prev - 1);
                              audioService.playClick();
                          }
                      }}
                      className={`pm shrink-0 ${betIndex === 0 || status !== GameStatus.IDLE || freeSpinsRemaining > 0 || pirateWalkActive ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                      style={isHighLimit ? { background: 'linear-gradient(180deg,#e0a820,#9a6800)', border: '1px solid #8b6200', color: '#fff' } : {}}
                  >
                      −
                  </div>

                  {/* Bet Display */}
                  <div className="bet-disp shrink-0 flex flex-col items-center justify-center">
                      <span className="bet-amt">{formatBet(availableBets[betIndex])}</span>
                      <span className="bet-lbl" style={{ color: isHighLimit ? '#ffffff' : '#c79bff' }}>TOTAL BET</span>
                  </div>

                  {/* Plus Bet */}
                  <div
                      onClick={() => {
                          if (betIndex < availableBets.length - 1 && status === GameStatus.IDLE) {
                              setBetIndex(prev => prev + 1);
                              audioService.playClick();
                          }
                      }}
                      className={`pm shrink-0 ${(betIndex === availableBets.length - 1) || status !== GameStatus.IDLE || freeSpinsRemaining > 0 || pirateWalkActive ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                      style={isHighLimit ? { background: 'linear-gradient(180deg,#e0a820,#9a6800)', border: '1px solid #8b6200', color: '#fff' } : {}}
                  >
                      +
                  </div>

                  {/* Win Panel */}
                  <div className="winpanel flex-1 flex flex-col items-center justify-center">
                      <span className="lets-spin">
                          {hwCounting ? (
                              formatK(hwCountingTotal)
                          ) : status === GameStatus.CASCADE && cascadeTotalWin > 0 ? (
                              formatK(cascadeTotalWin)
                          ) : holdWinActive ? (
                              formatK(holdWinCoinValues.reduce((s, col) => s + col.reduce((a, v) => a + v, 0), 0))
                          ) : pirateWalkActive ? (
                              formatK(pirateWalkTotalWin)
                          ) : freeSpinsRemaining > 0 ? (
                              formatK(freeSpinTotalWin)
                          ) : status === GameStatus.SPINNING || status === GameStatus.STOPPING ? (
                              'SPINNING...'
                          ) : winData?.payout && winData.payout > 0 ? (
                              formatK(winData.payout)
                          ) : (
                              "LET'S SPIN!"
                          )}
                      </span>
                      <span className="total-win">
                          {hwCounting ? 'COUNTING...' : status === GameStatus.CASCADE ? `CASCADE  ×${cascadeMultiplier}` : holdWinActive ? 'HOLD & WIN' : pirateWalkActive ? 'GHOST SHIP' : freeSpinsRemaining > 0 ? `FREE SPINS: ${freeSpinsRemaining}` : 'TOTAL WIN'}
                      </span>
                  </div>

                  {/* Max Bet */}
                  <div
                      onClick={() => {
                          if (status === GameStatus.IDLE && betIndex !== availableBets.length - 1) {
                              setBetIndex(availableBets.length - 1);
                              audioService.playClick();
                          }
                      }}
                      className={`flat blue maxbet shrink-0 ${status !== GameStatus.IDLE || betIndex === availableBets.length - 1 || freeSpinsRemaining > 0 || pirateWalkActive ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                  >
                      <div className="flat-face">
                          <div className="flat-in h-full">
                              <span className="lbl">MAX</span>
                              <span className="lbl">BET</span>
                          </div>
                      </div>
                  </div>

                  {/* Spin Button */}
                  {(() => {
                      const isStop = player.autoSpin || status === GameStatus.SPINNING || status === GameStatus.STOPPING;
                      return (
                  <div
                      onMouseDown={handleSpinMouseDown}
                      onMouseUp={handleSpinMouseUp}
                      onTouchStart={(e) => { e.preventDefault(); handleSpinMouseDown(); }}
                      onTouchEnd={(e) => { e.preventDefault(); handleSpinMouseUp(); }}
                      className={`flat ${isStop ? 'red' : 'green'} spinA shrink-0 ${activeModal !== 'NONE' || !!reelTransitioning || showFreeSpinsPopup || showFreeSpinSummary || showCandyRoulette || showWinPopup || !!jackpotWinTier || holdWinActive || status === GameStatus.CASCADE || showDragonPickModal || dragonPotShaking || showDragonTriggerPopup || showArcticPickModal || showArcticTriggerPopup || showEgyptHoldWinPopup ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                  >
                      <div className="flat-face">
                          <div className="flat-in h-full">
                              <span className="lbl">
                                  {player.autoSpin ? 'STOP' : (status === GameStatus.SPINNING || status === GameStatus.STOPPING) ? 'STOP' : (freeSpinsRemaining > 0 ? 'AUTO' : 'SPIN')}
                              </span>
                              <span className="sub">
                                  {player.autoSpin
                                      ? (autoSpinRemaining > 0 ? `AUTO · ${autoSpinRemaining}` : 'AUTO ACTIVE')
                                      : 'HOLD FOR AUTOSPIN'}
                              </span>
                          </div>
                      </div>
                  </div>
                  );
                  })()}
              </div>
          </div>
      )}

    {/* Auto-spin popup — fixed relative to scaled game container, appears above spin button on long press */}
    {showAutoSpinPopup && (
        <>
            <div className="absolute inset-0 z-[180]" onClick={() => setShowAutoSpinPopup(false)} />
            <div className="absolute z-[181] animate-pop-in select-none"
                style={{ bottom: 68, right: 6, width: 200 }}>
                <div className="rounded-2xl px-3 py-3 flex flex-col gap-2.5"
                    style={{ background: 'linear-gradient(160deg,#1e0438,#0d0220)', border: '2px solid #7c3aed', boxShadow: '0 0 24px rgba(124,58,237,0.7)' }}>
                    <div className="text-purple-300 text-[10px] font-black uppercase tracking-widest text-center">Auto Spin</div>
                    <div className="grid grid-cols-4 gap-1.5">
                        {[50, 100, 500, -1].map(count => (
                            <button key={count}
                                onClick={() => {
                                    setAutoSpinRemaining(count);
                                    setPlayer(p => ({ ...p, autoSpin: true }));
                                    setShowAutoSpinPopup(false);
                                    audioService.playClick();
                                }}
                                className="rounded-xl py-2 font-black text-xs text-white active:scale-95 transition-transform"
                                style={{ background: player.autoSpin && autoSpinRemaining === count ? 'linear-gradient(180deg,#a855f7,#7c3aed)' : 'linear-gradient(180deg,#6d28d9,#4c1d95)', boxShadow: '0 3px 0 #2e1065' }}>
                                {count === -1 ? '∞' : count}
                            </button>
                        ))}
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="flex items-center justify-between px-0.5">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">⚡</span>
                            <div>
                                <div className="text-white font-black text-xs">Fast Spin</div>
                                <div className="text-purple-300/50 text-[9px]">Instant reel stop</div>
                            </div>
                        </div>
                        <button
                            onClick={() => { setFastSpin(f => !f); audioService.playClick(); }}
                            className="relative shrink-0"
                            style={{ width: 38, height: 21, borderRadius: 11, background: fastSpin ? 'linear-gradient(180deg,#a855f7,#7c3aed)' : '#374151', boxShadow: fastSpin ? '0 2px 8px rgba(168,85,247,0.5)' : 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <div style={{ position: 'absolute', top: 2, left: fastSpin ? 19 : 2, width: 17, height: 17, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', transition: 'left 0.2s' }} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    )}

    {activeModal === 'SHOP' && <ShopModal isOpen onClose={() => {
        setActiveModal('NONE');
        if (cardModalReturnTab) {
            const tab = cardModalReturnTab;
            setCardModalReturnTab(null);
            setTimeout(() => {
                setCardInitialTab(tab);
                setActiveModal('COLLECTION');
            }, 50);
        }
    }} onBuy={handleShopBuy} level={player.level} isFreeStashClaimed={!freeCoinsAvailable} freeCoinsAmount={freeCoinsAmount} freeCoinsAvailable={freeCoinsAvailable} initialTab={shopInitialTab} balance={player.balance} diamonds={player.diamonds} maxBet={MAX_BET_BY_LEVEL(player.level)} claimedItems={player.shopClaimedItems || []} onClaimItem={handleClaimShopItem} isVip={!!player.isVip} vipLevel={player.vipLevel || 1} />}

      {activeModal === 'COLLECTION' && <CardCollectionModal
          isOpen
          onClose={() => setActiveModal('NONE')}
          onOpenShop={openShopFromCards}
          initialTab={cardInitialTab}
          decks={decks}
          onClaimDeckReward={handleClaimDeckReward}
          onBuyPack={handleBuyPack}
          onBuyCredits={handleBuyPackCredits}
          onBuyCreditsWithTokens={handleBuyPackCreditsWithTokens}
          diamonds={player.diamonds}
          playerLevel={player.level}
          tokens={player.tokens}
          packCredits={player.packCredits}
          premiumPackCredits={player.premiumPackCredits ?? 0}
          onBuyPremiumCredits={handleBuyPremiumPackCredits}
          onExchangeCards={(exchanges) => {
              setDecks(prev => prev.map(deck => {
                  const updates = exchanges.filter(e => e.deckId === deck.gameId);
                  if (updates.length === 0) return deck;
                  return { ...deck, cards: deck.cards.map((card, idx) => {
                      const u = updates.find(e => e.cardIdx === idx);
                      return u ? { ...card, count: Math.max(1, card.count - u.removeCount) } : card;
                  })};
              }));
          }}
          onGainGems={(amount) => { setPlayer(p => ({ ...p, diamonds: p.diamonds + amount })); setGemsClaimedPopup(amount); }}
          grandPrize={getGrandAlbumReward(player.level)}
          getDeckReward={(id) => getDeckReward(id, player.level)}
          balance={player.balance}
          maxBet={MAX_BET_BY_LEVEL(player.level)}
      />}

      {activeModal === 'MINIGAME' && <MiniGameModal
        isOpen
        diceCredits={quest.diceCredits}
        wildCredits={quest.wildCredits}
        wildStage={quest.wildStage}
        diceStage={quest.diceStage}
        dicePosition={quest.dicePosition}
        activeGame={quest.activeGame}
        savedGrid={quest.wildGrid}
        balance={player.balance}
        diamonds={player.diamonds}
        onSelectMode={handleQuestModeSelect}
        onBuyPicks={handleBuyPicks}
        onBuyQuestBundle={handleBuyQuestBundle}
        onPickTile={handleMiniGamePick}
        onBatchPick={handleBatchPick}
        onStageComplete={(bonusCoins, bonusDiamonds) => handleStageComplete(quest.activeGame === 'DICE' ? 'DICE' : 'WILD', bonusCoins, bonusDiamonds)}
        onGridUpdate={handleWildGridUpdate}
        onDiceRoll={handleDiceRoll}
        onClose={() => setActiveModal('NONE')}
        playerLevel={player.level}
        maxBet={MAX_BET_BY_LEVEL(player.level)}
        onOpenGemShop={() => { setActiveModal('NONE'); setTimeout(() => openShop('DIAMONDS'), 50); }}
      />}

      {activeModal === 'MISSIONS' && <MissionPassModal
          isOpen
          initialView={missionInitialView}
          onClose={() => setActiveModal('NONE')}
          missionState={missionState}
          diamonds={player.diamonds}
          balance={player.balance}
          onClaimReward={handleClaimPassReward}
          onFinishMission={handleFinishMission}
          onClaimMissionReward={handleClaimMissionReward}
          onBuyPass={handleBuyPass}
          onBuyLevel={handleBuyPassLevel}
          onClaimAll={handleClaimAllMissions}
          playerLevel={player.level}
          maxBet={MAX_BET_BY_LEVEL(player.level) * (isHighLimit ? 10 : 1)}
          onOpenGemShop={() => { setActiveModal('NONE'); setTimeout(() => openShop('DIAMONDS'), 50); }}
          onOpenPremium={() => { setActiveModal('NONE'); setTimeout(() => setShowPremiumModal(true), 50); }}
      />}

      <TimeBonusModal isOpen={activeModal === 'TIME_BONUS'} onClose={() => setActiveModal('NONE')} timers={bonusTimers} onClaim={handleClaimTimeBonus} />
      
      <LoginBonusModal isOpen={activeModal === 'LOGIN_BONUS'} currentDay={loginState.currentDay} maxBet={MAX_BET_BY_LEVEL(player.level)} onClaim={handleClaimLoginBonus} />
      
    <PiggyBankModal isOpen={activeModal === 'PIGGY'} onClose={() => setActiveModal('NONE')} amount={player.piggyBank} diamonds={player.diamonds} onBreak={handleBreakPiggy} level={player.level} maxBet={MAX_BET_BY_LEVEL(player.level)} balance={player.balance} onOpenGemShop={() => openShop('DIAMONDS')} />

      <FeatureUnlockModal 
        isOpen={activeModal === 'FEATURE_UNLOCK'} 
        featureName={featureUnlockData.name} 
        icon={featureUnlockData.icon} 
        description={featureUnlockData.description} 
        onOpenFeature={() => { 
            // Correctly trigger the action passed
            featureUnlockData.action();
        }} 
        onClose={() => setActiveModal('NONE')} 
      />

      {gameLoadingConfig && <SlotLoadingScreen game={gameLoadingConfig} />}

      {/* Dragon Trigger Popup */}
      {showDragonTriggerPopup && (
          <div className="absolute inset-0 z-[250] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
              <div className="animate-pop-in flex flex-col items-center gap-4 rounded-2xl px-8 py-7"
                  style={{ background: 'linear-gradient(160deg,#1a0000,#380000)', border: '2px solid #fbbf24', boxShadow: '0 0 40px rgba(251,191,36,0.5)', maxWidth: 300, textAlign: 'center' }}>
                  <img src="/ui/dragon_vase.png" alt="" style={{ width: '3.5rem', height: '3.5rem', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(255,140,0,0.7))' }} />
                  <div className="font-black text-white uppercase tracking-widest" style={{ fontSize: 'clamp(14px,3vw,20px)', textShadow: '0 0 12px rgba(251,191,36,0.8)' }}>
                      JACKPOT PICK<br />TRIGGERED!
                  </div>
                  <button
                      onClick={() => {
                          setShowDragonTriggerPopup(false);
                          setReelTransitioning('out');
                          setTimeout(() => {
                              setShowDragonPickModal(true);
                              requestAnimationFrame(() => requestAnimationFrame(() => {
                                  setReelTransitioning('in');
                                  setTimeout(() => setReelTransitioning(false), 1100);
                              }));
                          }, 900);
                      }}
                      className="font-black uppercase tracking-widest rounded-xl px-6 py-2.5"
                      style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#1a0000', fontSize: 'clamp(12px,2.2vw,16px)', boxShadow: '0 4px 18px rgba(251,191,36,0.6)' }}
                  >LET'S GO!</button>
              </div>
          </div>
      )}

      {showEgyptHoldWinPopup && (
          <div className="absolute inset-0 z-[250] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.82)' }}>
              <div className="animate-pop-in flex flex-col items-center gap-4 rounded-2xl px-8 py-7"
                  style={{ background: 'linear-gradient(160deg,#2a1400,#4a2600)', border: '2px solid #f59e0b', boxShadow: '0 0 40px rgba(245,158,11,0.6)', maxWidth: 300, textAlign: 'center' }}>
                  <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>🏺</span>
                  <div className="font-black text-white uppercase tracking-widest" style={{ fontSize: 'clamp(14px,3vw,20px)', textShadow: '0 0 12px rgba(245,158,11,0.9)' }}>
                      Hold &amp; Win<br />Triggered!
                  </div>
                  <div className="text-amber-300 font-bold text-xs uppercase tracking-widest">6 Coins Landed!</div>
              </div>
          </div>
      )}

      {showArcticTriggerPopup && (
          <div className="absolute inset-0 z-[250] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
              <div className="animate-pop-in flex flex-col items-center gap-4 rounded-2xl px-8 py-7"
                  style={{ background: 'linear-gradient(160deg,#001428,#00080f)', border: '2px solid #22d3ee', boxShadow: '0 0 40px rgba(34,211,238,0.5)', maxWidth: 300, textAlign: 'center' }}>
                  <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>❄️</span>
                  <div className="font-black text-white uppercase tracking-widest" style={{ fontSize: 'clamp(14px,3vw,20px)', textShadow: '0 0 12px rgba(34,211,238,0.8)' }}>
                      JACKPOT PICK<br />TRIGGERED!
                  </div>
              </div>
          </div>
      )}


      <NeonRouletteModal
          isOpen={showNeonRoulette}
          bet={neonRouletteBet}
          jackpotAmounts={jackpotService.getAmounts()}
          onMultPayout={(amount) => setPlayer(p => ({ ...p, balance: p.balance + amount }))}
          onComplete={handleNeonRouletteComplete}
          onClose={handleNeonRouletteClose}
      />

      <CandyRouletteModal
          isOpen={showCandyRoulette}
          freeSpins={freeSpinsWon}
          onComplete={handleCandyRouletteComplete}
      />

      <JackpotCelebration tier={jackpotWinTier} onClose={handleJackpotClose} />

      {/* Gems claimed popup */}
      {gemsClaimedPopup !== null && (
          <div className="absolute inset-0 z-[300] flex items-center justify-center animate-pop-in" onClick={() => setGemsClaimedPopup(null)}>
              <div className="flex flex-col items-center gap-3 rounded-2xl px-10 py-7 select-none"
                  style={{ background: 'linear-gradient(160deg,#1e3a5f,#0d1f3c)', boxShadow: '0 0 60px rgba(96,165,250,0.4)' }}>
                  <div className="text-5xl">💎</div>
                  <div className="font-black text-white text-base uppercase tracking-widest">Gems Claimed!</div>
                  <div className="font-black font-mono text-blue-300 text-3xl">+{gemsClaimedPopup.toLocaleString('en-US')}</div>
                  <div className="text-white/40 text-[9px] uppercase tracking-wide">Tap to close</div>
              </div>
          </div>
      )}

      {showWinPopup && winData && winData.payout > 0 && winData.winType && (
          <WinPopup amount={winData.payout} type={winData.winType} onComplete={handleWinPopupComplete} />
      )}
      
      <SimpleCelebrationModal isOpen={!!celebrationMsg} message={celebrationMsg} onClose={handleCloseCelebration} />

      {showHRLoading && (
          <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center"
              style={{ background: 'linear-gradient(160deg,#1c0a00,#3a1800,#0f0600)' }}>
              <div className="animate-pop-in flex flex-col items-center gap-4">
                  <span style={{ fontSize: '4rem', lineHeight: 1 }}>🎰</span>
                  <div className="font-black text-2xl uppercase tracking-widest"
                      style={{ background: 'linear-gradient(180deg,#fff8c0,#ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      High Roller
                  </div>
                  <div className="text-yellow-200/60 text-[11px] font-bold uppercase tracking-widest">Entering VIP Floor...</div>
                  <div className="flex gap-1 mt-2">
                      {[0,1,2].map(i => (
                          <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                              style={{ background: '#ffd700', animationDelay: `${i * 0.15}s` }} />
                      ))}
                  </div>
              </div>
          </div>
      )}

      {showFreeSpinsPopup &&<FreeSpinsWonPopup isOpen={showFreeSpinsPopup} count={freeSpinsWon} onComplete={handleStartFreeSpins} />}
      
      {showLevelUp && currentView === 'GAME' && <LevelUpToast level={player.level} reward={levelUpReward} maxBetIncreased={maxBetIncreased} newMaxBet={MAX_BET_BY_LEVEL(player.level)} onClose={() => setShowLevelUp(false)} />}

      {showPackToast && currentView === 'GAME' && (
          <div className="fixed top-[40px] right-2 z-[200] animate-pop-in pointer-events-none"
              style={{ background: 'linear-gradient(160deg,#1a0535,#3b0764)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
              <div className="flex items-center gap-2">
                  <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🃏</span>
                  <div>
                      <div className="font-black text-white text-xs uppercase tracking-widest">+1 Card Pack!</div>
                      <div className="text-purple-300 text-[9px] font-bold">Added to your stash</div>
                  </div>
              </div>
          </div>
      )}

      {activeToast && (
          <div className="fixed top-[40px] right-2 z-[201] animate-pop-in pointer-events-none"
              style={{ background: 'linear-gradient(160deg,#1a0535,#3b0764)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
              <div className="flex items-center gap-2">
                  {activeToast.type === 'LEVEL_UP'
                      ? <img src="/ui/star.png" alt="" style={{ width: '1.6rem', height: '1.6rem', objectFit: 'contain' }} />
                      : <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🃏</span>}
                  <div>
                      {activeToast.type === 'LEVEL_UP' ? (
                          <>
                              <div className="font-black text-white text-xs uppercase tracking-widest">Level {activeToast.level}!</div>
                              {activeToast.reward > 0 && <div className="text-purple-300 text-[9px] font-bold">+{formatCommaNumber(activeToast.reward)} coins</div>}
                              {activeToast.maxBetIncreased && <div className="text-yellow-300 text-[9px] font-bold">Max Bet ↑ {formatCommaNumber(activeToast.newMaxBet)}</div>}
                          </>
                      ) : activeToast.type === 'CARD' ? (
                          <>
                              <div className="font-black text-xs uppercase tracking-widest" style={{ color: activeToast.rarity === 'RARE' ? '#fbbf24' : '#e2e8f0' }}>{activeToast.rarity === 'RARE' ? 'Rare' : 'Common'} Card!</div>
                              <div className="text-purple-300 text-[9px] font-bold">{activeToast.cardName}</div>
                          </>
                      ) : (
                          <>
                              <div className="font-black text-white text-xs uppercase tracking-widest">+1 Card Pack!</div>
                              <div className="text-purple-300 text-[9px] font-bold">Added to your stash</div>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      {showPurchaseModal && (
          <div className="absolute inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}
              onClick={() => setShowPurchaseModal(null)}>
              <div className="animate-pop-in rounded-2xl px-6 py-5 flex flex-col items-center gap-3 text-center"
                  style={{ background: 'linear-gradient(160deg,#1a0535,#3b0764)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 16px 48px rgba(0,0,0,0.8)', maxWidth: 280 }}
                  onClick={e => e.stopPropagation()}>
                  <span style={{ fontSize: '2.5rem' }}>{showPurchaseModal === 'VIP' ? '👑' : '📜'}</span>
                  <div className="font-black text-white text-sm uppercase tracking-widest">
                      {showPurchaseModal === 'VIP' ? 'VIP Lounge Activated!' : 'Monthly Pass Unlocked!'}
                  </div>
                  <div className="flex flex-col gap-1.5 w-full text-left">
                      {(showPurchaseModal === 'VIP'
                          ? ['10% Piggy Bank savings', '2× XP from spins', 'High-Limit Room access', 'VIP gold UI theme', '5% daily cashback (Inbox)', '+Weekly gems']
                          : ['Premium reward track', 'Exclusive gem rewards', 'XP mission booster', 'Monthly bonus coins', 'Prestige profile badge', 'Unlimited daily bonus']
                      ).map((b, i) => (
                          <div key={i} className="flex items-center gap-2">
                              <span className={`text-xs shrink-0 ${showPurchaseModal === 'VIP' ? 'text-yellow-400' : 'text-purple-400'}`}>✦</span>
                              <span className="text-white/90 text-[11px]">{b}</span>
                          </div>
                      ))}
                  </div>
                  <button onClick={() => setShowPurchaseModal(null)}
                      className="btn-3d w-full py-2.5 rounded-xl font-black text-white uppercase text-sm tracking-widest"
                      style={{ background: 'linear-gradient(180deg,#a855f7,#6d28d9)', boxShadow: '0 3px 0 #4c1d95' }}>
                      Confirm
                  </button>
              </div>
          </div>
      )}

      {showFreeSpinSummary && <FreeSpinSummary isOpen={showFreeSpinSummary} totalWin={freeSpinTotalWin} bet={availableBets[betIndex]} onClose={handleFreeSpinSummaryClose} />}
      
      {showWelcomeGift && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)' }}>
          <div className="animate-pop-in flex flex-col items-center gap-3 rounded-3xl p-6 mx-4 text-center"
            style={{ background: 'linear-gradient(180deg,#9030d8 0%,#6018a8 18%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)', maxWidth: 300, width: '100%' }}>
            <div className="font-black text-white text-lg tracking-wide">Welcome Gift</div>
            <div className="text-purple-200 text-xs font-bold">A special gift to start your journey</div>
            <div className="flex flex-col items-center gap-1 rounded-2xl px-5 py-3 w-full"
              style={{ background: 'linear-gradient(180deg,rgba(160,60,255,0.3) 0%,rgba(10,0,50,0.75) 100%)', boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4)' }}>
              <img src="/symbols/coin.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
              <div className="font-black text-yellow-300 text-2xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {giftDisplayAmount.toLocaleString('en-US')}
              </div>
            </div>
            <button
              disabled={!giftCountDone}
              onClick={() => {
                if (!giftCountDone) return;
                try { localStorage.setItem('cw_welcome_claimed', '1'); } catch {}
                setShowWelcomeGift(false);
                const target = 10000000;
                const duration = 1500;
                const start = Date.now();
                const iv = setInterval(() => {
                    const elapsed = Date.now() - start;
                    if (elapsed >= duration) {
                        setAnimBalance(null);
                        setPlayer(p => ({ ...p, balance: p.balance + target }));
                        clearInterval(iv);
                        handleGameSelect(GAMES_CONFIG[0]);
                        return;
                    }
                    const p2 = 1 - Math.pow(1 - elapsed / duration, 3);
                    setAnimBalance(Math.floor(target * p2));
                }, 16);
              }}
              className="pill-green w-full"
              style={{ opacity: giftCountDone ? 1 : 0.5, pointerEvents: giftCountDone ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
              <div className="pill-face" style={{ padding: '10px 0', fontSize: '12px' }}>Claim</div>
            </button>
          </div>
        </div>
      )}

      <BankruptcyModal isOpen={showBankruptcy} onCollect={() => { setPlayer(p => ({ ...p, balance: p.balance + 100000 })); setShowBankruptcy(false); setCelebrationMsg("+100,000 Coins"); audioService.playWinBig(); }} />

      <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(audioService.toggleMute())}
          redeemedCodes={redeemedCodes}
          onRedeem={(code) => {
              if (redeemedCodes.includes(code)) return;
              setRedeemedCodes(prev => {
                  const next = [...prev, code];
                  try { localStorage.setItem('cw_redeemed_codes', JSON.stringify(next)); } catch {}
                  return next;
              });
              if (code === 'dev777') {
                  setPlayer(p => ({ ...p, level: 50, balance: p.balance + 100_000_000_000 }));
                  setCelebrationMsg('⚡ Level Rush! +100B Coins · Level 50');
              } else if (code === 'dev999') {
                  setPlayer(p => ({ ...p, balance: p.balance + 100_000_000_000_000 }));
                  setCelebrationMsg('💰 Coin Flood! +100T Coins');
              } else if (code === 'dev1') {
                  const now = Date.now();
                  setPlayer(p => ({ ...p, diamonds: p.diamonds + 50_000, isVip: true, vipExpiry: now + 30 * 24 * 3600000, xpMultiplier: 3, xpBoostEndTime: now + 24 * 60 * 60 * 1000 }));
                  setMissionState(ms => ({
                      ...ms,
                      isPremium: true,
                      premiumExpiry: now + 30 * 24 * 60 * 60 * 1000,
                      passBoostMultiplier: 3,
                      passBoostEndTime: now + 24 * 60 * 60 * 1000,
                  }));
                  setCelebrationMsg('👑 Full Premium Unlocked!');
              } else if (code === 'dev111') {
                  setPlayer(p => ({
                      ...p,
                      balance: p.balance + 10_000_000_000,
                      diamonds: p.diamonds + 2_000,
                  }));
                  setCelebrationMsg('💎 +10B Coins · +2,000 Gems');
              } else if (code === 'dev222') {
                  const now = Date.now();
                  setPlayer(p => ({
                      ...p,
                      isVip: true,
                      vipExpiry: now + 30 * 24 * 3600000,
                      xpMultiplier: 5,
                      xpBoostEndTime: now + 7 * 24 * 60 * 60 * 1000,
                  }));
                  setMissionState(ms => ({
                      ...ms,
                      isPremium: true,
                      premiumExpiry: now + 365 * 24 * 60 * 60 * 1000,
                      passBoostMultiplier: 5,
                      passBoostEndTime: now + 7 * 24 * 60 * 60 * 1000,
                  }));
                  setCelebrationMsg('👑 GOD MODE! VIP+Pass · 5× XP');
              }
              audioService.playWinBig();
          }}
      />

      <VipLoungeModal
          isOpen={showVipLounge}
          onClose={() => setShowVipLounge(false)}
          isVip={!!player.isVip}
          playerLevel={player.level}
          vipLevel={player.vipLevel ?? 1}
          vipXp={player.vipXp ?? 0}
          vipXpToNext={player.vipXpToNext ?? 500}
          onJoinVip={handleJoinVip}
          onOpenHighLimit={() => { setShowVipLounge(false); setTimeout(handleOpenHighRoller, 50); }}
          onOpenPremium={() => { setShowVipLounge(false); setTimeout(() => setShowPremiumModal(true), 50); }}
      />

      <MiniGamesHub
          isOpen={showMiniGamesHub}
          onClose={() => setShowMiniGamesHub(false)}
          onOpenWildQuest={() => { setShowMiniGamesHub(false); setTimeout(handleWildQuestClaim, 50); }}
          onOpenDiceQuest={() => { setShowMiniGamesHub(false); setTimeout(handleDiceQuestClaim, 50); }}
          wildCredits={quest.wildCredits}
          diceCredits={quest.diceCredits}
          isQuestLocked={player.level < 20}
      />

      <PremiumModal
          isOpen={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          isVip={!!player.isVip}
          isPremium={missionState.isPremium}
          maxBet={MAX_BET_BY_LEVEL(player.level)}
          onBuyVip={() => { setShowPremiumModal(false); setShowNopay(true); }}
          onBuyPremium={() => { setShowPremiumModal(false); setShowNopay(true); }}
          onBuyBundle={() => { setShowPremiumModal(false); setShowNopay(true); }}
      />

      <ProfileModal
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          player={player}
          isPremium={missionState.isPremium}
          passBoostMultiplier={missionState.passBoostMultiplier}
          passBoostEndTime={missionState.passBoostEndTime}
          recentGames={GAMES_CONFIG.filter(g => (player.stats?.recentSlots || []).includes(g.id)).sort((a, b) => (player.stats?.recentSlots || []).indexOf(a.id) - (player.stats?.recentSlots || []).indexOf(b.id))}
          profileEmoji={profileEmoji}
          onSetProfileEmoji={(e) => { setProfileEmoji(e); try { localStorage.setItem('cw_profile_emoji', e); } catch {} }}
          onNavigateToGame={(game) => { setShowProfile(false); handleGameSelect(game as GameConfig); }}
          albumsCompleted={decks.filter(d => d.isCompleted).length}
          albumsTotal={decks.length}
      />

      <InboxModal
          isOpen={showInbox}
          onClose={() => setShowInbox(false)}
          messages={inbox.filter((m: any) => !m.claimed)}
          onClaim={handleClaimInbox}
      />

      {/* Purchase Unavailable Popup */}
      {showNopay && (
          <div className="absolute inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-pop-in" onClick={() => setShowNopay(false)}>
              <div className="rounded-2xl overflow-hidden shadow-2xl max-w-[280px] w-full mx-4 flex flex-col items-center text-center px-6 py-6 gap-3" onClick={e => e.stopPropagation()}
                  style={{ background: 'linear-gradient(160deg,#1a0535,#2d0060)' }}>
                  <i className="ti ti-shopping-cart-off" style={{ fontSize: '2.5rem', color: '#a855f7' }} />
                  <div className="font-black text-white text-base uppercase tracking-widest">Purchase Unavailable</div>
                  <div className="text-purple-300/80 text-xs leading-relaxed">Real money purchases are not available at this time.</div>
                  <button onClick={() => setShowNopay(false)} className="btn-3d mt-1 px-6 py-2 rounded-xl font-black text-xs uppercase text-white"
                      style={{ background: 'linear-gradient(180deg,#7c3aed,#4c1d95)', boxShadow: '0 3px 0 #2e1065' }}>
                      Ok
                  </button>
              </div>
          </div>
      )}

      {/* Purchase Confirmation Popup */}
      {purchaseConfirm && (
          <div className="absolute inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-pop-in" onClick={() => setPurchaseConfirm(null)}>
              <div className="rounded-2xl overflow-hidden shadow-2xl max-w-[300px] w-full mx-4 flex flex-col" onClick={e => e.stopPropagation()}
                  style={{ background: purchaseConfirm === 'VIP' ? 'linear-gradient(160deg,#2a1500,#5c3000)' : 'linear-gradient(160deg,#0e0030,#2d0060)' }}>
                  <div className="px-5 pt-5 pb-3 flex flex-col items-center text-center">
                      <div style={{ fontSize: '3rem', lineHeight: 1, filter: purchaseConfirm === 'VIP' ? 'drop-shadow(0 0 16px rgba(251,191,36,0.8))' : 'drop-shadow(0 0 16px rgba(168,85,247,0.8))' }}>
                          {purchaseConfirm === 'VIP' ? '👑' : '📜'}
                      </div>
                      <div className="font-black text-base uppercase tracking-widest mt-2"
                          style={{ background: purchaseConfirm === 'VIP' ? 'linear-gradient(180deg,#fff8c0,#ffd700)' : 'linear-gradient(180deg,#e9d5ff,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                          {purchaseConfirm === 'VIP' ? 'VIP Activated!' : 'Monthly Pass Activated!'}
                      </div>
                      <div className="text-white/50 text-[10px] mt-0.5 uppercase tracking-wide">
                          {purchaseConfirm === 'VIP' ? 'Welcome to the VIP Lounge' : '30-day premium rewards unlocked'}
                      </div>
                  </div>
                  <div className="px-4 pb-3 flex flex-col gap-1.5">
                      {(purchaseConfirm === 'VIP' ? [
                          { icon: '🏷️', text: '20% Off Store' },
                          { icon: '🐷', text: '+10% Piggy Bank savings' },
                          { icon: '🎰', text: 'High Limit Room access' },
                          { icon: '💰', text: '5% Daily Cashback via Inbox' },
                          { icon: '💎', text: '+Weekly Gems' },
                          { icon: '/ui/star.png', text: '+20% XP on all spins' },
                      ] : [
                          { icon: '🎁', text: 'Double Rewards on every level' },
                          { icon: '⚡', text: '+20 Levels instant boost' },
                          { icon: '💎', text: 'Exclusive Gems on premium tiers' },
                          { icon: '⛏️', text: 'Bonus Quest Picks' },
                      ]).map(b => (
                          <div key={b.text} className="flex items-center gap-2">
                              {b.icon.startsWith('/') ? <img src={b.icon} alt="" style={{ width: '1rem', height: '1rem', objectFit: 'contain', flexShrink: 0 }} /> : <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>{b.icon}</span>}
                              <span className="text-white/80 text-[10px] font-bold leading-tight">{b.text}</span>
                          </div>
                      ))}
                  </div>
                  <div className="px-4 pb-4">
                      <button onClick={() => setPurchaseConfirm(null)}
                          className="btn-3d w-full py-2.5 rounded-xl font-black text-sm uppercase tracking-widest text-black"
                          style={{ background: purchaseConfirm === 'VIP' ? 'linear-gradient(180deg,#fbbf24,#d97706)' : 'linear-gradient(180deg,#a855f7,#6d28d9)', boxShadow: '0 3px 0 rgba(0,0,0,0.5)', color: purchaseConfirm === 'VIP' ? '#1c0a00' : '#fff' }}>
                          Let's Go! 🎉
                      </button>
                  </div>
              </div>
          </div>
      )}

        </div>
      </div>
    </div>
  );
};

export default App;