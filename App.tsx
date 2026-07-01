import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SymbolType, GameStatus, PlayerState, WinData, QuestState, MiniGameReward, GameConfig, GameTheme, MissionState, MissionType, PassReward, Mission, Deck, Card, DailyLoginState, WildGridCell, SlotQuestState, SlotQuestMission, ArenaState, Friend, FriendsState } from './types';
import { GAMES_CONFIG, GET_DYNAMIC_WEIGHTS, SPIN_DURATION, REEL_DELAY, INITIAL_BALANCE, GET_PAYLINES, XP_BASE_REQ, GET_ALL_BETS, MAX_BET_BY_LEVEL, formatNumber, formatCommaNumber, formatWinNumber, GET_SYMBOLS, AUTO_SPIN_DELAY, GENERATE_DAILY_MISSIONS, GENERATE_PASS_REWARDS, INITIAL_GEMS, PICKS_COST_IN_CREDITS, GENERATE_DECKS, CALCULATE_TIME_BONUS, DUPLICATE_CREDIT_VALUES, GENERATE_REPLACEMENT_MISSION, DAILY_LOGIN_REWARDS, PACK_COSTS, SCALE_COIN_REWARD, formatK, formatKShort, NEON_WEIGHTS, REGENERATE_MISSION_STACK, ALL_COVER_ASSETS } from './constants';
import { Reel, borderThemeFor } from './components/Reel';
import { ViperBorder } from './components/ViperBorder';
import { WinPopup } from './components/WinPopup';
import { LeftSidebar } from './components/LeftSidebar';
import { ShopModal } from './components/ShopModal';
import { PaymentModal, PaymentItem } from './components/PaymentModal';
import { detectCurrency, CurrencyInfo, PRODUCT_USD_CENTS, toStripeAmount, formatLocalPrice, getDeviceId } from './services/paymentService';
import { supabase } from './services/supabaseClient';
import { MiniGameModal } from './components/MiniGameModal';
import { Lobby } from './components/Lobby';
import { FreeSpinsWonPopup } from './components/FreeSpinsWonPopup';
import { LevelUpToast } from './components/LevelUpToast';
import { FreeSpinSummary } from './components/FreeSpinSummary';
import { BankruptcyModal } from './components/BankruptcyModal';
import { MissionPassModal } from './components/MissionPassModal';
import { CardCollectionModal } from './components/CardCollectionModal';
import { SlotQuestPanel, TYPE_ICON as QUEST_TYPE_ICON } from './components/SlotQuestPanel';
import { QuestPathModal } from './components/QuestPathModal';
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
import { LeaderboardModal } from './components/LeaderboardModal';
import { submitScore } from './services/leaderboardService';
import { ArenaModal, ArenaSideWidget } from './components/ArenaModal';
import { FriendsModal } from './components/FriendsModal';
import {
    canSend as friendCanSend, sendGiftAmount, toFriend, isRealPlayerId,
    IncomingRequest, sendFriendRequest, fetchIncomingRequests, acceptFriendRequest,
    fetchAcceptedForSender, ackSenderRequest, sendGiftToFriend, fetchIncomingGifts, markGiftClaimed,
} from './services/friendsService';
import { ArenaResultsModal } from './components/ArenaResultsModal';
import {
    initialArenaState, pointsForEvent, betTierMultiplier, getFinalBoard, positionOf,
    arenaReward, nextTier, outcomeFor, seasonPhase, phaseTimeRemaining, SEASON_TOTAL_MS, SEASON_ACTIVE_MS,
    winBonusPoints,
} from './services/arenaService';
import { DragonPickGrid } from './components/DragonPickModal';
import { NeonRouletteModal } from './components/NeonRouletteModal';
import { CandyRouletteModal, CandyWildConfig } from './components/CandyRouletteModal';
import { SpinCountRouletteModal } from './components/SpinCountRouletteModal';
import { ArcticPickGrid } from './components/ArcticPickGrid';

// Interface for persisted game state
interface SavedGameState {
    freeSpinsRemaining: number;
    totalFreeSpins: number;
    freeSpinsWon: number;
    freeSpinTotalWin: number;
    spinsWithoutBonus: number;
    grid: SymbolType[][];
    holdWinActive?: boolean;
    holdWinLockedGrid?: boolean[][];
    holdWinCoinValues?: number[][];
    holdWinJpGrid?: (string|null)[][];
    holdWinRespins?: number;
    pirateWalkActive?: boolean;
    pirateShipCol?: number;
    pirateShip2Col?: number;
    pirateWalkTotalWin?: number;
}

// Feature-theme aliasing: the lower-tier slots reuse a proven feature mechanic from one of the
// flagship themes. This map applies ONLY to bonus/feature logic — each slot keeps its own symbols,
// background and paylines (which are driven by selectedGame.theme directly, never by this alias).
// For every flagship/untouched game the alias is identity, so their behaviour is unchanged.
//   Deep Blue (UNDERWATER) → Arctic   : cascading reels + climbing multiplier
//   Gold Rush (WESTERN)     → Pirate   : walking wilds
//   Samurai Honor (SAMURAI) → Egypt    : hold & win respins
//   Lucky Leprechaun        → Candy    : bonus wheel (distinct pot-of-gold variant)
//   Jungle Rumble (JUNGLE)  → Space    : progressive-multiplier free spins
const FEATURE_THEME_MAP: Partial<Record<GameTheme, GameTheme>> = {
    JUNGLE: 'SPACE',
    WESTERN: 'PIRATE',
    LEPRECHAUN: 'CANDY',
    UNDERWATER: 'ARCTIC',
    SAMURAI: 'EGYPT',
    PETS: 'CANDY',      // Mystic Pets → Sugar Rush wild-wheel free spins (Companion Wheel)
    MMORPG: 'EGYPT',    // Dungeon Raid → Pharaoh hold & win respins (Loot Hold & Win)
};
const featureThemeOf = (t: GameTheme): GameTheme => FEATURE_THEME_MAP[t] ?? t;

// Mystery Symbol free-spins feature — shared by all four "creature" slots. During free
// spins, mystery tiles drop onto the reels and, once they stop, all reveal the SAME
// randomly-chosen symbol at once for big matching combos.
const MYSTERY_FEATURE_THEMES = new Set<GameTheme>(['FARM', 'BEAST', 'ANGRYFLOCK', 'PRINCESS']);
const MYSTERY_IMG: Partial<Record<GameTheme, string>> = {
    FARM:       '/farm_mystery.png',
    BEAST:      '/beast_mystery.png',
    ANGRYFLOCK: '/angryflock_mystery.png',
    PRINCESS:   '/princess_mystery.png',
};

// Solid per-theme ripple colours for side-clicks on the slot background.
const RIPPLE_COLORS: Partial<Record<GameTheme, string>> = {
    NEON:       '#ff3df0',
    EGYPT:      '#ffc83d',
    DRAGON:     '#ff4d2e',
    PIRATE:     '#38e8ff',
    SPACE:      '#8b7dff',
    CANDY:      '#ff7ad1',
    JUNGLE:     '#54e36a',
    UNDERWATER: '#3ad6ff',
    WESTERN:    '#ffb52e',
    SAMURAI:    '#ff5a7a',
    PIGGY:      '#ff8ec4',
    GOLDEN_POT: '#ffcf3d',
    LEPRECHAUN: '#3ee389',
    ARCTIC:     '#7fe9ff',
    PETS:       '#ffa94d',
    MMORPG:     '#a98bff',
    FARM:       '#ffd23d',
    BEAST:      '#ff7a3d',
    ANGRYFLOCK: '#ff5e5e',
    PRINCESS:   '#ff9ae0',
};
const rippleColorFor = (theme: GameTheme): string => RIPPLE_COLORS[theme] ?? '#b450ff';

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
    const full = pct >= 100;
    return (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, pointerEvents: 'none' }}>
            <div style={{ position: 'relative', width: '100%', height: 6, borderRadius: 0, background: '#2a1800', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${pct}%`,
                    background: full
                        ? 'linear-gradient(90deg,#ffe566,#fffba0,#ffe566)'
                        : 'linear-gradient(90deg,#e69000,#ffd000,#ffe566,#ffd000,#e69000)',
                    boxShadow: full ? '0 0 6px rgba(255,230,80,0.95)' : '0 0 4px rgba(255,200,0,0.5)',
                    transition: 'width 0.5s ease',
                }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(255,255,255,0.18) 0%,transparent 60%)', pointerEvents: 'none' }} />
            </div>
        </div>
    );
};

// Startup assets: everything needed before and shortly after the lobby is shown.
// Slots load their own assets on demand via SlotLoadingScreen.
const SCATTER_JP_IMGS: Record<string, string> = {
    MINI:  '/scatter_mini.png',
    MINOR: '/scatter_minor.png',
    MAJOR: '/scatter_major.png',
    MEGA:  '/scatter_mega.png',
    GRAND: '/scatter_grand.png',
};

const STARTUP_ASSETS = [
    // initial load splash background
    '/initialload_bg.jpg',
    // lobby backgrounds
    '/lobby-bg.jpg', '/lobby-bg-vip.jpg',
    // slot loading screen background (shown while a game loads in)
    '/slot_loading_bg.png',
    // slot cover images (shown in lobby cards) — data-driven
    ...ALL_COVER_ASSETS,
    // bottom-bar + topbar UI icons
    '/ui/piggy.png', '/ui/missions.png', '/ui/collect.png', '/ui/cards.png',
    '/ui/pass.png', '/ui/games.png', '/ui/lobby.png', '/ui/exp_multiplier.png',
    '/ui/jackpot.png', '/ui/coinmine.png', '/ui/boost.png',
    // minigame / feature backgrounds + icons
    '/coinmine_bg.jpg', '/coinmine_rockicon.png', '/coinmine_bombicon.png',
    '/coinmine_coinicon.png', '/coinmine_gemicon.png', '/coinmine_pickaxe.png',
    '/coinmine_stageclearicon.png', '/coinmine_2xblock.png', '/coinmine_3xblock.png',
    '/dice_background.jpg', '/album_background.jpg',
    '/dice_backicon.png', '/dice_staricon.png', '/dice_blankicon.png', '/dice_starticon.png', '/dice_avatar.png',
    // card pack art (Draw Cards containers)
    '/card_normal.png', '/card_premium.png',
    // modal / UI assets
    '/ui/VIP.png', '/ui/bigbag.png', '/ui/dice.png', '/ui/double.png',
    '/ui/dragon_vase.png', '/ui/gems500.png', '/ui/gems5000.png',
    '/ui/gift_mail.png', '/ui/gift_store.png', '/ui/high_roller.png',
    '/ui/inbox.png', '/ui/lock.png', '/ui/mine_new.png', '/ui/minigames.png',
    '/ui/missions_new.png', '/ui/pick.png', '/ui/piggy_red.png',
    '/ui/rock.png', '/ui/roller.png', '/ui/stage_gem.png', '/ui/star.png',
    '/ui/cards_new.png',
    // currency symbols (used across many modals)
    '/symbols/coin.png', '/symbols/diamond.png', '/new_coinicon.png', '/topbar_levelstar.png',
    '/coinmine_3xtile.png', '/coinmine_4xtile.png',
    // card collection modal background
    '/cards_bg.png',
    // mission pass icons
    '/mission-levelup.png', '/mission-spin.png', '/mission-wincoin.png',
    '/pass-picksdice.png',
    // win celebration art (WinPopup, JackpotCelebration)
    '/bigwin.png', '/greatwin.png', '/epicwin.png', '/megawin.png', '/ultimatewin.png',
    '/new_bigwin.png', '/new_greatwin.png', '/new_epicwin.png', '/new_megawin.png', '/new_ultimatewin.png',
    // jackpot tier badges (pick-grid modals, JackpotCelebration)
    '/mini.png', '/minor.png', '/major.png', '/mega.png', '/grand.png',
    // jackpot tile overlays in reels (generic)
    '/mini_jackpot.png', '/minor_jackpot.png', '/major_jackpot.png', '/mega_jackpot.png', '/grand_jackpot.png',
    // jackpot tile overlays in reels (Asian / Golden Pot theme)
    '/asian_mini.png', '/asian_minor.png', '/asian_major.png', '/asian_mega.png', '/asian_grand.png',
    // jackpot ticker bar labels (shown above reels for all themes)
    '/topbar_mini.png', '/topbar_minor.png', '/topbar_major.png', '/topbar_mega.png', '/topbar_grand.png',
    '/asian_topbar_mini.png', '/asian_topbar_minor.png', '/asian_topbar_major.png', '/asian_topbar_mega.png', '/asian_topbar_grand.png',
    // profile pictures (player avatar selection)
    ...Array.from({ length: 12 }, (_, i) => `/Profile_pic (${i + 1}).png`),
    // shop coin / gem bundle icons
    '/coin_1.png', '/coin_2.png', '/coin_3.png', '/coin_4.png', '/coin_5.png',
    '/gem_1.png', '/gem_2.png', '/gem_3.png',
    // shop bonus wheel item icon
    '/bonus wheel shop.png',
    // events modal banners
    '/event (1).png', '/event (2).png',
    // scatter icons for all slot themes (preload so first-open is instant)
    '/symbols/neon_bonus.png', '/pharaoh_scatter.png', '/dragon/dragon-1.png', '/pirate_scatter.png',
    '/cosmic_scatter.png', '/candy_scatter.png', '/jungle_scatter.png', '/deep_scatter.png',
    '/gold_scatter.png', '/samurai_scatter.png', '/piggy/pig.png', '/goldenpot_scatter.png',
    '/leprechaun_scatter.png', '/arctic/snow.png', '/pets_scatter.png', '/fantasy_scatter.png',
    '/farm_scatter.png', '/beast_scatter.png', '/angryflock_scatter.png', '/princess_scatter.png',
    // generic jackpot tier cell icons (hold-win / free-spin overlays)
    '/scatter_mini.png', '/scatter_minor.png', '/scatter_major.png', '/scatter_mega.png', '/scatter_grand.png',
    // album dock icons
    '/album_draw.png', '/album_store.png', '/album_exchange.png',
    // piggy bank modal assets
    '/ui/piggy.png', '/ui/piggy_red.png',
    // pass / mission pass modal assets
    '/ui/pass.png', '/mission-levelup.png', '/mission-spin.png', '/mission-wincoin.png', '/pass-picksdice.png',
    // collect / bonus tile modal assets
    '/ui/collect.png', '/ui/boost.png',
    // minigames modal assets
    '/ui/minigames.png', '/ui/games.png', '/ui/dice.png', '/ui/double.png', '/ui/mine_new.png',
    // inbox modal assets
    '/ui/inbox.png', '/ui/gift_mail.png', '/ui/gift_store.png',
    // settings / profile modal assets
    '/ui/star.png', '/ui/bigbag.png',
    // VIP & VIP lounge modal assets
    '/ui/VIP.png', '/ui/high_roller.png', '/symbols/diamond.png',
];

const App: React.FC = () => {
  const toastCountRef = useRef(0);
  const [appReady, setAppReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const spinButtonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const [currentView, setCurrentView] = useState<'LOBBY' | 'GAME' | 'HIGH_LIMIT'>('LOBBY');
  const [selectedGame, setSelectedGame] = useState<GameConfig>(GAMES_CONFIG[0]);
  const [isHighLimit, setIsHighLimit] = useState(false);
  const [savedGameStates, setSavedGameStates] = useState<Record<string, SavedGameState>>(() => {
    try {
      const saved = localStorage.getItem('cw_saved_game_states');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [player, setPlayer] = useState<PlayerState>(() => {
    try {
      const saved = localStorage.getItem('cw_player');
      if (saved) return { ...{ balance: INITIAL_BALANCE, diamonds: INITIAL_GEMS, tokens: 0, packCredits: 0, premiumPackCredits: 0, piggyBank: 0, level: 1, xp: 0, xpToNextLevel: XP_BASE_REQ, autoSpin: false, xpMultiplier: 1, xpBoostEndTime: 0, collectBoostEndTime: 0, freeStashClaimedTime: 0, shopClaimedItems: [], vipXp: 0, vipLevel: 1, vipXpToNext: 500 }, ...JSON.parse(saved) };
    } catch {}
    return { balance: INITIAL_BALANCE, diamonds: INITIAL_GEMS, tokens: 0, packCredits: 0, premiumPackCredits: 0, piggyBank: 0, level: 1, xp: 0, xpToNextLevel: XP_BASE_REQ, autoSpin: false, xpMultiplier: 1, xpBoostEndTime: 0, collectBoostEndTime: 0, freeStashClaimedTime: 0, shopClaimedItems: [], vipXp: 0, vipLevel: 1, vipXpToNext: 500 };
  });
  
  // Ref to track player state to avoid stale closures in callbacks (like feature unlocks)
  const playerRef = useRef(player);
  const playerNameRef = useRef<string>('');
  const profileEmojiRef = useRef<string>('');
  useEffect(() => {
      playerRef.current = player;
  }, [player]);

  // Background leaderboard sync — runs every 5 minutes so stats are always up to date
  // without requiring the player to open the Ranking page.
  useEffect(() => {
      const buildPayload = () => {
          const p = playerRef.current;
          return {
              name: playerNameRef.current,
              avatar: profileEmojiRef.current,
              level: p.level,
              vipLevel: p.vipLevel ?? 0,
              score: p.balance,
              gems: p.diamonds,
              totalWon: p.stats?.totalCoinsWon || 0,
              maxJackpot: p.stats?.maxJackpotWin || 0,
              maxWin: p.stats?.maxSingleWin || 0,
          };
      };
      // Initial sync shortly after mount so new sessions register quickly.
      const initialTimer = setTimeout(() => submitScore(buildPayload()), 10_000);
      const interval = setInterval(() => submitScore(buildPayload()), 5 * 60_000);
      return () => { clearTimeout(initialTimer); clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync immediately on level-up (meaningful ranking event).
  useEffect(() => {
      if (player.level <= 1) return;
      submitScore({
          name: playerNameRef.current,
          avatar: profileEmojiRef.current,
          level: player.level,
          vipLevel: player.vipLevel ?? 0,
          score: player.balance,
          gems: player.diamonds,
          totalWon: player.stats?.totalCoinsWon || 0,
          maxJackpot: player.stats?.maxJackpotWin || 0,
          maxWin: player.stats?.maxSingleWin || 0,
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.level]);

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

  // Detect currency from IP and build local price table
  useEffect(() => {
      detectCurrency().then(c => {
          setCurrency(c);
          const prices: Record<string, string> = {};
          Object.entries(PRODUCT_USD_CENTS).forEach(([id, usdCents]) => {
              prices[id] = formatLocalPrice(toStripeAmount(usdCents, c), c);
          });
          setLocalPrices(prices);
      });
  }, []);

  // Claim any pending payment credits (from Stripe webhook) on app focus / mount
  useEffect(() => {
      const claimPendingCredits = async () => {
          if (typeof window === 'undefined') return;
          if (!supabase) return;
          const deviceId = getDeviceId();
          const { data, error } = await supabase
              .from('payment_credits')
              .select('id, type, amount')
              .eq('device_id', deviceId)
              .eq('claimed', false);
          if (error || !data || data.length === 0) return;
          for (const row of data) {
              if (row.type === 'COIN') {
                  setPlayer(p => ({ ...p, balance: p.balance + row.amount }));
                  triggerCoinAnim?.(row.amount);
              } else if (row.type === 'DIAMOND') {
                  setPlayer(p => ({ ...p, diamonds: p.diamonds + row.amount }));
              }
              await supabase.from('payment_credits').update({ claimed: true }).eq('id', row.id);
          }
          if (data.length > 0) {
              const totalCoins = data.filter(r => r.type === 'COIN').reduce((s, r) => s + r.amount, 0);
              const totalGems = data.filter(r => r.type === 'DIAMOND').reduce((s, r) => s + r.amount, 0);
              if (totalCoins > 0) setCelebrationMsg(`+${formatCommaNumber(totalCoins)} Coins added!`);
              else if (totalGems > 0) setCelebrationMsg(`+${totalGems} Gems added!`);
          }
      };
      claimPendingCredits();
      window.addEventListener('focus', claimPendingCredits);
      return () => window.removeEventListener('focus', claimPendingCredits);
  }, []);

  // Preload all startup assets
  useEffect(() => {
      let loaded = 0;
      const total = STARTUP_ASSETS.length;
      if (total === 0) { setAppReady(true); return; }
      const done = () => {
          loaded++;
          setLoadProgress(Math.round((loaded / total) * 100));
          if (loaded >= total) setAppReady(true);
      };
      STARTUP_ASSETS.forEach(src => {
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
          // Backfill the level-51 mega reward for saves created before it existed.
          if (Array.isArray(parsed.passRewards) && !parsed.passRewards.some((r: PassReward) => r.level === 51)) {
              const mega = GENERATE_PASS_REWARDS(10000).find(r => r.level === 51);
              if (mega) parsed.passRewards = [...parsed.passRewards, mega];
          }
          // Daily reset: if lastDailyReset is a different calendar day, regenerate daily missions
          const now = new Date();
          const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
          if (parsed.lastDailyReset !== todayKey) {
              const nonDaily = (parsed.activeMissions || []).filter((m: { frequency: string }) => m.frequency !== 'DAILY');
              return { ...parsed, lastDailyReset: todayKey, activeMissions: [...GENERATE_DAILY_MISSIONS(player.level, MAX_BET_BY_LEVEL(player.level)), ...nonDaily], passXpToNext: 100 };
          }
          return { ...parsed, passXpToNext: 100 };
      }
    } catch {}
    const todayKey = (() => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; })();
    return { lastDailyReset: todayKey, activeMissions: [...GENERATE_DAILY_MISSIONS(player.level, MAX_BET_BY_LEVEL(player.level))], passLevel: 1, passXP: 0, passXpToNext: 100, passRewards: GENERATE_PASS_REWARDS(10000), isPremium: false, premiumExpiry: 0, passBoostMultiplier: 1, passBoostEndTime: 0 };
  });
  const [decks, setDecks] = useState<Deck[]>(() => {
      try {
          const saved = localStorage.getItem('cw_decks');
          if (saved) {
              const savedDecks = JSON.parse(saved) as Deck[];
              const fresh = GENERATE_DECKS();
              return fresh.map(freshDeck => {
                  const savedDeck = savedDecks.find(d => d.gameId === freshDeck.gameId);
                  if (!savedDeck) return freshDeck;
                  return {
                      ...freshDeck,
                      cards: freshDeck.cards.map(freshCard => {
                          const savedCard = savedDeck.cards.find(c => c.id === freshCard.id);
                          return savedCard ? { ...freshCard, count: savedCard.count } : freshCard;
                      }),
                      isCompleted: savedDeck.isCompleted ?? false,
                      rewardClaimed: savedDeck.rewardClaimed ?? false,
                  };
              });
          }
      } catch {}
      return GENERATE_DECKS();
  });

  const [availableBets, setAvailableBets] = useState<number[]>(ALL_BETS);
  const [betIndex, setBetIndex] = useState(0);
  const currentBetRef = useRef(ALL_BETS[0]);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
    const [grid, setGrid] = useState<SymbolType[][]>(Array(GAMES_CONFIG[0].reels).fill(null).map(() => Array(GAMES_CONFIG[0].rows).fill(SymbolType.SEVEN)));
  const [targetGrid, setTargetGrid] = useState<SymbolType[][]>([]);
  // Mystery Symbol feature: cells covered by a mystery tile + whether they've revealed yet.
  const [mysteryCells, setMysteryCells] = useState<{ c: number; r: number }[]>([]);
  const [mysteryRevealed, setMysteryRevealed] = useState(false);
  const mysteryCellsRef = useRef<{ c: number; r: number }[]>([]);
  const mysteryCountRef = useRef<number>(0);
  const [winData, setWinData] = useState<WinData | null>(null);
  const [stoppedReels, setStoppedReels] = useState(0);
  const [instantStop, setInstantStop] = useState(false);
  const [fastSpin, setFastSpin] = useState(false);
  const [sidebarPage, setSidebarPage] = useState(0);
  const [showAutoSpinPopup, setShowAutoSpinPopup] = useState(false);
  const [autoSpinRemaining, setAutoSpinRemaining] = useState(-1);
  const autoSpinRemainingRef = useRef(-1);
  const [autoMaxBet, setAutoMaxBet] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEventsPopup, setShowEventsPopup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showVipLounge, setShowVipLounge] = useState(false);
  const [showFreeVipPopup, setShowFreeVipPopup] = useState(false);
  const [showMiniGamesHub, setShowMiniGamesHub] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const savedFastSpinRef = useRef<boolean>(false);
  // Autospin state captured when free spins begin, so we can resume normal autospins
  // once the free-spin round (and its summary) finishes.
  const savedAutoSpinRef = useRef<{ active: boolean; remaining: number }>({ active: false, remaining: -1 });
  // First-time-player onboarding: the 10th paid spin ever is guaranteed to trigger free
  // spins. lifetimeSpinsRef counts real (paid) spins; the flag fires the guarantee once.
  const lifetimeSpinsRef = useRef<number>(0);
  const firstFreeSpinDoneRef = useRef<boolean>(false);
  const forceFreeSpinRef = useRef<boolean>(false);
  useEffect(() => {
      try {
          lifetimeSpinsRef.current = JSON.parse(localStorage.getItem('cw_player') || '{}')?.stats?.totalSpins || 0;
          firstFreeSpinDoneRef.current = localStorage.getItem('cw_first_fs_done') === '1';
      } catch {}
  }, []);
  const [scatterAnticipation, setScatterAnticipation] = useState(false);
  const scatterAnticipationRef = useRef(false);
  const targetGridRef = useRef<SymbolType[][]>([]);
  const fastSpinRef = useRef(fastSpin);
  useEffect(() => { fastSpinRef.current = fastSpin; }, [fastSpin]);
  useEffect(() => {
    if (currentView === 'LOBBY') audioService.playLobbyMusic();
    else if (currentView === 'HIGH_LIMIT') audioService.playHighLimitMusic();
    else if (currentView === 'GAME') audioService.playSlotMusic(selectedGame.theme);
    else audioService.stopMusic();
  }, [currentView, selectedGame.theme]);
  useEffect(() => { autoSpinRemainingRef.current = autoSpinRemaining; }, [autoSpinRemaining]);
  useEffect(() => { targetGridRef.current = targetGrid; }, [targetGrid]);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);
  const [holdWinSummary, setHoldWinSummary] = useState<{ total: number; bet: number } | null>(null);
  const pendingHoldWinSummaryRef = useRef<{ total: number; bet: number } | null>(null);
  const [gemsClaimedPopup, setGemsClaimedPopup] = useState<number | null>(null);
  const [piggyGlow, setPiggyGlow] = useState(false);
  const [piggyShaking, setPiggyShaking] = useState(false);
  // Topbar piggy bank icon does an attention-grab shake every 10 seconds.
  useEffect(() => {
    const iv = setInterval(() => {
      setPiggyShaking(true);
      setTimeout(() => setPiggyShaking(false), 800);
    }, 10000);
    return () => clearInterval(iv);
  }, []);
  const [showXpTimer, setShowXpTimer] = useState(false);
  const [showXpPct, setShowXpPct] = useState(false);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [showCollectPopup, setShowCollectPopup] = useState(false);
  const [ripples, setRipples] = useState<{id:number;x:number;y:number;color:string}[]>([]);
  const rippleIdRef = useRef(0);
  const xpPctTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [activeModal, setActiveModal] = useState<'NONE' | 'SHOP' | 'COLLECTION' | 'MINIGAME' | 'MISSIONS' | 'TIME_BONUS' | 'LOGIN_BONUS' | 'PIGGY' | 'FEATURE_UNLOCK'>('NONE');
  const [missionInitialView, setMissionInitialView] = useState<'MISSIONS' | 'PASS'>('MISSIONS');
  const [shopInitialTab, setShopInitialTab] = useState<'COINS' | 'BOOSTS' | 'DIAMONDS'>('COINS');
  const [cardInitialTab, setCardInitialTab] = useState<'ALBUM' | 'PACKS'>('ALBUM');
  const [cardModalReturnTab, setCardModalReturnTab] = useState<'ALBUM' | 'PACKS' | null>(null);
  
  const [featureUnlockData, setFeatureUnlockData] = useState({ name: '', icon: '', description: '', action: () => {} });
  const [shownUnlocks, setShownUnlocks] = useState<Set<number>>(new Set());

  // ── Payment system ─────────────────────────────────────────────────────────
  const [paymentItem, setPaymentItem] = useState<PaymentItem | null>(null);
  const [currency, setCurrency] = useState<CurrencyInfo>({ code: 'USD', symbol: '$', rate: 1, zeroDecimal: false, country: 'Unknown' });
  const [localPrices, setLocalPrices] = useState<Record<string, string>>({});

  const [showFreeSpinsPopup, setShowFreeSpinsPopup] = useState(false);
  const [freeSpinsWon, setFreeSpinsWon] = useState(0);
  const [showBankruptcy, setShowBankruptcy] = useState(false);
  const [showWelcomeGift, setShowWelcomeGift] = useState(() => !localStorage.getItem('cw_welcome_claimed') && !localStorage.getItem('cw_player'));
  const [giftCountDone, setGiftCountDone] = useState(false);
  const [giftDisplayAmount, setGiftDisplayAmount] = useState(0);
  const [animBalance, setAnimBalance] = useState<number | null>(null);
  const [coinAnimating, setCoinAnimating] = useState(false);
  const coinAnimIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingLoginBonusRef = useRef(false);
  const hasLeftLobbyRef = useRef(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showPackToast, setShowPackToast] = useState(false);
  const [levelUpReward, setLevelUpReward] = useState(0);
  const [maxBetIncreased, setMaxBetIncreased] = useState(false);
  // Independent X/Y scale so the 844×390 canvas fills the entire screen edge-to-edge
  // (no letterbox side margins). Device aspect ratios are close enough to 844:390 that
  // the resulting stretch is imperceptible.
  const [mobileScale, setMobileScale] = useState<{ x: number; y: number }>({ x: 1, y: 1 });

  useEffect(() => {
    const updateScale = () => {
      setMobileScale({
        x: window.innerWidth / 844,
        y: window.innerHeight / 390,
      });
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('orientationchange', updateScale);
    };
  }, []);

  // Quest state initialized with separate stages, persisted to localStorage
  const [quest, setQuest] = useState<QuestState>(() => {
      const defaults: QuestState = { credits: 5, picks: 5, diceCredits: 5, wildCredits: 5, wildStage: 1, diceStage: 1, max: 60, dicePosition: 0, activeGame: 'NONE', wildGrid: [] };
      try {
          const saved = localStorage.getItem('cw_quest');
          if (saved) {
              const parsed = JSON.parse(saved);
              return { ...defaults, wildStage: parsed.wildStage || 1, diceStage: parsed.diceStage || 1, dicePosition: parsed.dicePosition || 0, wildGrid: parsed.wildGrid || [], diceCredits: parsed.diceCredits ?? 5, wildCredits: parsed.wildCredits ?? 5 };
          }
      } catch {}
      return defaults;
  });
  // Slot quest state — quest path + active missions
  // Handpicked order: variety of features (Hold&Win, respins, pick bonus, roulette, walking wilds, ice pick, cascade, expanding wilds)
  const QUEST_PATH_IDS = [
      'piggy-riches',   // Hold & Win + free spins
      'pharaoh-tomb',   // Hold & Win respins (Egypt)
      'dragon-fortune', // Pick and win bonus
      'neon-vegas',     // Scatter roulette
      'pirate-bounty',  // Walking wilds (7 reels)
      'arctic-freeze',  // Ice pick bonus
      'cosmic-cash',    // Supernova cascade
  ];
  const makeSlotMissions = (slotId: string, bet: number, stageIndex: number = 0, playerLevel: number = 1): SlotQuestMission[] => {
      const base = Math.max(bet, 1000);
      // Mission template builders — each stage draws a distinct trio so no two
      // stages feel identical (spin counts, big wins, total bet, level ups, etc).
      const M = {
          win:    (t: number): SlotQuestMission => ({ id: `${slotId}_win`,    type: 'WIN_COUNT',     label: 'Win',   description: `Win ${t} times`, current: 0, target: t }),
          spin:   (t: number): SlotQuestMission => ({ id: `${slotId}_spin`,   type: 'SPIN_COUNT',    label: 'Spin',  description: `Spin ${t} times`, current: 0, target: t }),
          maxbet: (t: number): SlotQuestMission => ({ id: `${slotId}_maxbet`, type: 'MAX_BET_SPIN',  label: 'Max',   description: `Spin ${t} times on Max Bet`, current: 0, target: t }),
          coins:  (mult: number): SlotQuestMission => ({ id: `${slotId}_coins`, type: 'WIN_COINS',   label: 'Coins', description: `Win a total of ${formatK(base * mult)} Coins`, current: 0, target: base * mult }),
          bet:    (mult: number): SlotQuestMission => ({ id: `${slotId}_bet`,   type: 'BET_COINS',   label: 'Bet',   description: `Bet a total of ${formatK(base * mult)} Coins`, current: 0, target: base * mult }),
          big:      (t: number): SlotQuestMission => ({ id: `${slotId}_big`,      type: 'BIG_WIN_COUNT',  label: 'Big',      description: `Land ${t} Big Wins`, current: 0, target: t }),
          freespin: (t: number): SlotQuestMission => ({ id: `${slotId}_freespin`, type: 'FREE_SPIN_COUNT', label: 'Bonus',    description: `Complete ${t} Free Spin${t !== 1 ? 's' : ''} or Respin${t !== 1 ? 's' : ''}`, current: 0, target: t }),
          level:    (t: number): SlotQuestMission => ({ id: `${slotId}_level`,    type: 'LEVEL_UP',       label: 'Level',    description: `Level up ${t} ${t === 1 ? 'time' : 'times'}`, current: 0, target: t }),
          reach:  (t: number): SlotQuestMission => ({ id: `${slotId}_reach`,  type: 'REACH_LEVEL',   label: 'Level', description: `Reach level ${t}`, current: Math.min(t, playerLevel), target: t }),
          bonus:  (t: number): SlotQuestMission => ({ id: `${slotId}_bonus`,  type: 'BONUS_TRIGGER', label: 'Bonus', description: `Complete ${t} Bonus game${t !== 1 ? 's' : ''}`, current: 0, target: t }),
      };
      const stages: SlotQuestMission[][] = [
          [M.reach(10),  M.win(20),    M.spin(30)],
          [M.spin(40),   M.level(5),   M.bet(80)],
          [M.win(25),    M.maxbet(10), M.coins(70)],
          [M.bonus(1),   M.spin(50),   M.bet(120)],
          [M.win(30),    M.level(2),   M.coins(90)],
          [M.maxbet(30), M.big(3),     M.bet(38)],
          [M.win(35),    M.spin(60),   M.coins(110)],
          [M.level(3),   M.big(6),     M.coins(140)],
      ];
      return stages[stageIndex % stages.length];
  };
  // Advance a slot-quest mission of the given type while playing the active path slot.
  const trackSlotQuest = (matchType: SlotQuestMission['type'], delta: number) => {
      if (delta <= 0 || !selectedGame) return;
      setSlotQuestState(prev => {
          if (!prev.missions.length || prev.pathSlotIds[prev.currentPathIndex] !== selectedGame.id) return prev;
          let changed = false;
          let justCompleted: SlotQuestMission | null = null;
          const updated = prev.missions.map(m => {
              if (m.type === matchType && m.current < m.target) {
                  changed = true;
                  const newCurrent = Math.min(m.target, m.current + delta);
                  const next = { ...m, current: newCurrent };
                  if (newCurrent >= m.target) justCompleted = next;
                  return next;
              }
              return m;
          });
          if (!changed) return prev;
          if (justCompleted) setTimeout(() => showQuestTaskComplete(justCompleted!), 0);
          const next = { ...prev, missions: updated };
          try { localStorage.setItem('cw_slot_quest', JSON.stringify(next)); } catch {}
          return next;
      });
  };
  // "Reach level X" missions track the absolute player level rather than a count.
  const trackSlotReachLevel = (level: number) => {
      if (!selectedGame) return;
      setSlotQuestState(prev => {
          if (!prev.missions.length || prev.pathSlotIds[prev.currentPathIndex] !== selectedGame.id) return prev;
          let changed = false;
          let justCompleted: SlotQuestMission | null = null;
          const updated = prev.missions.map(m => {
              if (m.type === 'REACH_LEVEL' && m.current < m.target) {
                  changed = true;
                  const newCurrent = Math.min(m.target, level);
                  const next = { ...m, current: newCurrent };
                  if (newCurrent >= m.target) justCompleted = next;
                  return next;
              }
              return m;
          });
          if (!changed) return prev;
          if (justCompleted) setTimeout(() => showQuestTaskComplete(justCompleted!), 0);
          const next = { ...prev, missions: updated };
          try { localStorage.setItem('cw_slot_quest', JSON.stringify(next)); } catch {}
          return next;
      });
  };
  const [slotQuestState, setSlotQuestState] = useState<SlotQuestState>(() => {
      try {
          const saved = localStorage.getItem('cw_slot_quest');
          if (saved) {
              const parsed = JSON.parse(saved);
              // Always use current QUEST_PATH_IDS to keep stage count in sync
              return { ...parsed, pathSlotIds: QUEST_PATH_IDS };
          }
      } catch {}
      return { pathSlotIds: QUEST_PATH_IDS, currentPathIndex: 0, missions: [] };
  });
  const [showQuestPath, setShowQuestPath] = useState(false);
  const [showQuestSidebar, setShowQuestSidebar] = useState(false);
  const [grandPrizePopup, setGrandPrizePopup] = useState<number | null>(null);

  // Arena ranking system
  const [arenaState, setArenaState] = useState<ArenaState>(() => {
      try {
          const saved = localStorage.getItem('cw_arena');
          if (saved) return { ...initialArenaState(Date.now()), ...JSON.parse(saved) };
      } catch {}
      return initialArenaState(Date.now());
  });
  const [showArena, setShowArena] = useState(false);
  const [showArenaResults, setShowArenaResults] = useState(false);

  // Friends — add top players / AI, send + collect a daily coin gift with each.
  const [friendsState, setFriendsState] = useState<FriendsState>(() => {
      try {
          const saved = localStorage.getItem('cw_friends');
          if (saved) return JSON.parse(saved);
      } catch {}
      return { friends: [] };
  });
  const [showFriends, setShowFriends] = useState(false);
  const [incomingFriendRequests, setIncomingFriendRequests] = useState<IncomingRequest[]>([]);
  const [pendingFriendRequestIds, setPendingFriendRequestIds] = useState<string[]>(() => {
      try { return JSON.parse(localStorage.getItem('cw_pending_friend_reqs') || '[]'); } catch { return []; }
  });
  const [questCreditToast, setQuestCreditToast] = useState<null | 'dice' | 'mine'>(null);
  const questCreditToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [questTaskCompleteToast, setQuestTaskCompleteToast] = useState<SlotQuestMission | null>(null);
  const questTaskCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showQuestTaskComplete = (mission: SlotQuestMission) => {
      setQuestTaskCompleteToast(mission);
      if (questTaskCompleteTimerRef.current) clearTimeout(questTaskCompleteTimerRef.current);
      questTaskCompleteTimerRef.current = setTimeout(() => setQuestTaskCompleteToast(null), 3000);
  };
  const arenaBetTierRef = useRef(0);          // last bet tier index, for AI scaling
  const arenaProcessedRef = useRef(0);        // last seasonId we ran end-of-season for
  // Arena unlocks once all quest stages are cleared OR the player reaches level 27.
  const arenaUnlocked = player.level >= 27 || slotQuestState.currentPathIndex >= QUEST_PATH_IDS.length;

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
  const [neonRouletteTotal, setNeonRouletteTotal] = useState(0);
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
  const arcticMidFreeSpinsRef = useRef(false);
  const [pendingArcticFreePick, setPendingArcticFreePick] = useState(false);
  const pirateJpTierRef = useRef<number | null>(null);
  // Captures the free-spin status at spin() call time so generateSmartGrid always gets the
  // right value even after freeSpinsRemaining has been decremented in the same render batch.
  const isCurrentFreeSpinRef = useRef(false);
  // Quest completion deferred until current bonus ends
  const pendingQuestCompleteRef = useRef(false);
  const prevQuestAllDoneRef = useRef(false);

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

  // Sugar Rush (CANDY) — two-stage bonus: spin count roulette → wild wheel roulette → free spins
  const [showSpinCountRoulette, setShowSpinCountRoulette] = useState(false);
  const [showCandyRoulette, setShowCandyRoulette] = useState(false);
  const candyWildConfigRef = useRef<CandyWildConfig | null>(null);
  const candyPendingColsRef = useRef<{ col: number; seedRow: number }[]>([]);
  const candySingleWildsRef = useRef<{ col: number; row: number }[]>([]);
  const [candyCols, setCandyCols] = useState<{ col: number; seedRow: number }[]>([]);
  const [candySingleWilds, setCandySingleWilds] = useState<{ col: number; row: number }[]>([]);
  const [candyFsSpinKey, setCandyFsSpinKey] = useState(0);
  // Counts wild-border commits in the current Sugar Rush free-spin session:
  // first commit pops in, later commits slide from the previous position.
  const candyCommitCountRef = useRef(0);
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

  // Golden Treasury collect multiplier — builds with qualifying spins.
  // 50 qualifying spins per tier: 1x → 2x(50) → 3x(100) → 4x(150) → 5x(200) → 10x(250).
  // A spin counts fully when bet ≥ 50% of max bet; otherwise it counts as half.
  const [treasuryMultProgress, setTreasuryMultProgress] = useState<number>(() => {
      try {
          const today = new Date().toDateString();
          const saved = localStorage.getItem('cw_treasury_mult');
          const date  = localStorage.getItem('cw_treasury_mult_date');
          if (date !== today) return 0;
          return parseFloat(saved || '0') || 0;
      } catch { return 0; }
  });
  useEffect(() => {
      try {
          localStorage.setItem('cw_treasury_mult', String(treasuryMultProgress));
          localStorage.setItem('cw_treasury_mult_date', new Date().toDateString());
      } catch {}
  }, [treasuryMultProgress]);
  const TREASURY_MULT_TIERS = [
      { mult: 1,  at: 0   },
      { mult: 2,  at: 50  },  // 50 to reach
      { mult: 3,  at: 150 },  // 100 more
      { mult: 4,  at: 300 },  // 150 more
      { mult: 5,  at: 500 },  // 200 more
      { mult: 10, at: 750 },  // 250 more
  ];
  const collectBoostActive = (player.collectBoostEndTime || 0) > Date.now();
  // Active event boosts (always on while events are running)
  const EVENT_EXP_BOOST = 0.20;   // +20% XP
  const EVENT_PIGGY_BOOST = 0.20; // +20% piggybank cap
  const treasuryMultiplier = (() => {
      let m = 1;
      for (const t of TREASURY_MULT_TIERS) if (treasuryMultProgress >= t.at) m = t.mult;
      return m;
  })();
  // Effective spin progress rate: VIP adds +50%, store 2x boost adds +100% (additive)
  const treasuryProgressRate = 1 + (player.isVip ? 0.5 : 0) + (collectBoostActive ? 1 : 0);

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
  const [newSlotIds, setNewSlotIds] = useState<string[]>(() => {
      try { return JSON.parse(localStorage.getItem('cw_new_slots') || '[]'); } catch { return []; }
  });
  const [stageCompletePopup, setStageCompletePopup] = useState<{ gameType: 'WILD' | 'DICE'; stage: number; coins: number; diamonds: number; autoAdvance?: boolean } | null>(null);
  const [jackpotWinTier, setJackpotWinTier] = useState<null | { name: string; color: string; icon: string; amount: number }>(null);
  const [pendingBigWin, setPendingBigWin] = useState(false);
  type ActiveToast = { type: 'LEVEL_UP'; level: number; reward: number; maxBetIncreased: boolean; newMaxBet: number } | { type: 'PACK' } | { type: 'CARD'; rarity: 'COMMON' | 'RARE'; cardName: string } | null;
  const [activeToast, setActiveToast] = useState<ActiveToast>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [slotUnlockToast, setSlotUnlockToast] = useState<(typeof GAMES_CONFIG)[0] | null>(null);
  const slotUnlockToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWinTierRef = useRef<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState<'VIP' | 'PASS' | null>(null);
  const [purchaseConfirm, setPurchaseConfirm] = useState<'VIP' | 'PASS' | null>(null);
  const [showNopay, setShowNopay] = useState(false);
  const [profileEmoji, setProfileEmoji] = useState(() => localStorage.getItem('cw_profile_emoji') || '/Profile_pic (3).png');
  // Player display name. On first run we mint a unique default like "Player38217645"
  // so the leaderboard isn't full of identical "Player" entries.
  const [playerName, setPlayerNameState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('playerName');
      if (saved) return saved;
      const generated = 'Player' + Math.floor(10000000 + Math.random() * 90000000);
      localStorage.setItem('playerName', generated);
      return generated;
    } catch {
      return 'Player';
    }
  });
  const [showInbox, setShowInbox] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  // Keep refs in sync so the background sync intervals don't hold stale closures.
  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);
  useEffect(() => { profileEmojiRef.current = profileEmoji; }, [profileEmoji]);

  // Persist a new display name locally and push it (with current stats) to the leaderboard.
  const handleSetPlayerName = (name: string) => {
    const trimmed = name.trim().slice(0, 20) || 'Player';
    setPlayerNameState(trimmed);
    try { localStorage.setItem('playerName', trimmed); } catch {}
    submitScore({
      name: trimmed,
      avatar: profileEmoji,
      level: player.level,
      vipLevel: player.vipLevel ?? 0,
      score: player.balance,
      gems: player.diamonds,
      totalWon: player.stats?.totalCoinsWon || 0,
      maxJackpot: player.stats?.maxJackpotWin || 0,
      maxWin: player.stats?.maxSingleWin || 0,
    });
  };
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

  // CANDY: the wild borders persist between free spins and slide from their previous
  // position to the next (handled by the CSS `left`/`top` transition on the overlay),
  // so no shuffle preview is used.
  useEffect(() => {
      setCandyShuffledCols(null);
      setCandyShuffledSingles(null);
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
      try { localStorage.setItem('cw_new_slots', JSON.stringify(newSlotIds)); } catch {}
  }, [newSlotIds]);
  useEffect(() => {
      try { localStorage.setItem('cw_bonus_timers', JSON.stringify(bonusTimers)); } catch {}
  }, [bonusTimers]);
  // Keep displayed timer rewards in sync with player level so display = claimed amount
  useEffect(() => {
      const mults = [5.0, 25.0, 100.0];
      const base = CALCULATE_TIME_BONUS(player.level);
      setBonusTimers(prev => prev.map(t => ({ ...t, reward: Math.floor(base * mults[t.id]) })));
  }, [player.level]);

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

          // Daily coin gift — days 1-10 (derive day from claimed inbox history, not separate counter)
          const hasTodayCoinGift = next.some(m => m.type === 'DAILY_COINS' && new Date(m.createdAt).toDateString() === todayStr);
          const claimedDays = next.filter(m => m.type === 'DAILY_COINS' && m.claimed).length;
          if (!hasTodayCoinGift && claimedDays < 10) {
              const day = claimedDays + 1;
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

  // Monthly rank rewards: check on mount if a new month has started and deliver gem rewards
  useEffect(() => {
      try {
          const now = new Date();
          const thisMonth = `${now.getFullYear()}-${now.getMonth()}`;
          const lastRewardMonth = localStorage.getItem('cw_last_reward_month') || '';
          if (lastRewardMonth && lastRewardMonth !== thisMonth) {
              const lastRank = Number(localStorage.getItem('cw_last_rank') || '0');
              const MONTHLY_GEMS: Record<number, number> = { 1: 10000, 2: 5000, 3: 2000 };
              const gems = MONTHLY_GEMS[lastRank] || 0;
              if (gems > 0) {
                  const monthName = new Date(now.getFullYear(), now.getMonth() - 1).toLocaleString('default', { month: 'long' });
                  const msgId = `monthly_rank_${lastRewardMonth}`;
                  setInbox(prev => {
                      if (prev.some(m => m.id === msgId)) return prev;
                      return [...prev, {
                          id: msgId,
                          type: 'MONTHLY_RANK' as const,
                          title: `${monthName} Rankings Reward`,
                          body: `You placed #${lastRank} last month! +${gems.toLocaleString()} Gems`,
                          claimed: false,
                          createdAt: Date.now(),
                          expiresAt: Date.now() + 7 * 86400000,
                      }];
                  });
              }
          }
          localStorage.setItem('cw_last_reward_month', thisMonth);
      } catch {}
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

  const triggerCoinAnim = (addAmount: number) => {
      if (addAmount <= 0) return;
      const start = playerRef.current.balance;
      const end = start + addAmount;
      if (coinAnimIntervalRef.current) clearInterval(coinAnimIntervalRef.current);
      setCoinAnimating(true);
      setAnimBalance(start);
      const steps = 20;
      const stepDuration = 1000 / steps;
      let step = 0;
      coinAnimIntervalRef.current = setInterval(() => {
          step++;
          audioService.playCoinTick();
          const progress = step / steps;
          const eased = 1 - Math.pow(1 - progress, 2);
          setAnimBalance(Math.round(start + (end - start) * eased));
          if (step >= steps) {
              clearInterval(coinAnimIntervalRef.current!);
              coinAnimIntervalRef.current = null;
              setAnimBalance(null);
              setCoinAnimating(false);
          }
      }, stepDuration);
  };

  const handleClaimInbox = (id: string) => {
      setInbox(prev => {
          const msg = prev.find(m => m.id === id);
          if (!msg) return prev;
          // Apply reward
          if (msg.type === 'WELCOME') {
              const amt = 5_000_000;
              setPlayer(p => ({ ...p, balance: p.balance + amt, diamonds: p.diamonds + 500 }));
              triggerCoinAnim(amt);
              setCelebrationMsg('+5,000,000 Coins · +500 Gems');
          } else if (msg.type === 'DAILY_COINS') {
              const day = claimedCoinGiftCount + 1;
              const amount = day * 50_000 * 20;
              setPlayer(p => ({ ...p, balance: p.balance + amount }));
              triggerCoinAnim(amount);
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
                  triggerCoinAnim(cashback);
                  setCelebrationMsg(`+${cashback.toLocaleString()} VIP Cashback`);
              }
          } else if (msg.type === 'MONTHLY_RANK') {
              const gemsMatch = msg.body.match(/\+([\d,]+) Gems/);
              const gems = gemsMatch ? Number(gemsMatch[1].replace(/,/g, '')) : 0;
              if (gems > 0) {
                  setPlayer(p => ({ ...p, diamonds: p.diamonds + gems }));
                  setCelebrationMsg(`+${gems.toLocaleString()} Gems`);
              }
          } else if (msg.type === 'FRIEND_GIFT') {
              const amtMatch = msg.body.match(/\+([\d,]+)/);
              const amt = amtMatch ? Number(amtMatch[1].replace(/,/g, '')) : 0;
              if (amt > 0) {
                  setPlayer(p => ({ ...p, balance: p.balance + amt }));
                  triggerCoinAnim(amt);
                  setCelebrationMsg(`+${amt.toLocaleString()} Coins`);
              }
              const giftId = Number(msg.id.replace('friendgift_', ''));
              if (giftId) markGiftClaimed(giftId);
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
      toastTimerRef.current = setTimeout(() => setActiveToast(null), 1500);
  };

  const openModal = (modal: 'NONE' | 'SHOP' | 'COLLECTION' | 'MINIGAME' | 'MISSIONS' | 'TIME_BONUS' | 'LOGIN_BONUS' | 'PIGGY' | 'FEATURE_UNLOCK') => {
      const currentLevel = playerRef.current.level;
      
      if (modal === 'MINIGAME' && currentLevel < 20) {
           setCelebrationMsg("Quest Unlocks at Level 20!");
           audioService.playStoneBreak();
           return;
      }
      if (modal === 'COLLECTION' && currentLevel < 30) {
          setCelebrationMsg("Cards Unlock at Level 30!");
          audioService.playStoneBreak();
          return;
      }
      if (modal === 'PIGGY' && currentLevel < 10) {
          setCelebrationMsg("Piggy Bank Unlocks at Level 10!");
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
      if (playerRef.current.level < 15) {
          setCelebrationMsg("Missions Unlock at Level 15!");
          audioService.playStoneBreak();
          return;
      }
      setMissionInitialView('MISSIONS');
      openModal('MISSIONS');
  };

  const openBattlePassModal = () => {
      if (playerRef.current.level < 10) {
          setCelebrationMsg("Mission Pass Unlocks at Level 10!");
          audioService.playStoneBreak();
          return;
      }
      setMissionInitialView('PASS');
      openModal('MISSIONS');
  };

  const handleOpenTimeBonus = () => {
      openModal('TIME_BONUS');
  };

  const handleOpenPiggyBank = () => {
      if (playerRef.current.level < 10) {
           setCelebrationMsg("Piggy Bank Unlocks at Level 10!");
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
          triggerCoinAnim(brokenAmount);
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
          setIsHighLimit(true);
          setCurrentView('HIGH_LIMIT');
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
      // _reward is timer.reward (always current-level base, kept in sync by useEffect)
      // Award exactly what was displayed: base × treasury multiplier
      const awardedReward = Math.floor(_reward * treasuryMultiplier);

      // Refresh for the next countdown cycle using fresh level calculation
      const mults = [5.0, 25.0, 100.0];
      const freshBase = Math.floor(CALCULATE_TIME_BONUS(player.level) * mults[id]);

      setBonusTimers(prev => prev.map(t => {
          if (t.id === id) {
              let nextWait = 300000; // 5m (Quick)
              if (id === 1) nextWait = 900000; // 15m (Super)
              if (id === 2) nextWait = 3600000; // 1H (Mega)
              return { ...t, endTime: now + nextWait, reward: freshBase };
          }
          return t;
      }));

      setPlayer(p => ({ ...p, balance: p.balance + awardedReward }));
      triggerCoinAnim(awardedReward);
      audioService.playWinBig();
      setCelebrationMsg(`+${formatCommaNumber(awardedReward)} Coins`);
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
          triggerCoinAnim(scaledCoins);
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
          // First-ever daily claim → gift 7 days of free VIP.
          if (!player.freeVipClaimed) {
              setTimeout(() => setShowFreeVipPopup(true), 700);
          }
      }
  };

  const handleClaimFreeVip = () => {
      const now = Date.now();
      setPlayer(p => ({ ...p, isVip: true, vipExpiry: Math.max(p.vipExpiry || 0, now) + 7 * 24 * 3600000, freeVipClaimed: true }));
      setShowFreeVipPopup(false);
      audioService.playWinBig();
      setTimeout(() => setShowVipLounge(true), 250);
  };

  const handleSlotQuestClaim = () => {
      if (!slotQuestState.missions.length || !slotQuestState.missions.every(m => m.current >= m.target)) return;
      const stageIdx = slotQuestState.currentPathIndex;
      const maxBetNow = MAX_BET_BY_LEVEL(player.level);
      // Stage reward: 10×, 20×, ... 70× of max bet per stage
      const stageReward = maxBetNow * (stageIdx + 1) * 20;
      // Grand prize on completing all 7 stages: +300× max bet
      const isLastStage = stageIdx + 1 >= QUEST_PATH_IDS.length;
      const grandPrize = isLastStage ? maxBetNow * 300 : 0;
      setPlayer(p => ({ ...p, balance: p.balance + stageReward + grandPrize }));
      setSlotQuestState(prev => {
          const nextIndex = prev.currentPathIndex + 1;
          const next = { ...prev, currentPathIndex: nextIndex, missions: [] };
          try { localStorage.setItem('cw_slot_quest', JSON.stringify(next)); } catch {}
          return next;
      });
      // Completing the final stage → show the grand prize claim popup
      if (isLastStage) {
          setShowQuestPath(false);
          setGrandPrizePopup(grandPrize);
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
    let lastTick = 0;
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
        const speed = 1 + p * 1.5;
        if (elapsed - lastTick >= Math.max(120, 200 / speed)) {
            audioService.playCoinTick(speed);
            lastTick = elapsed;
        }
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

  // Persist Arena state.
  useEffect(() => {
    try { localStorage.setItem('cw_arena', JSON.stringify(arenaState)); } catch {}
  }, [arenaState]);

  // Persist Friends state.
  useEffect(() => {
    try { localStorage.setItem('cw_friends', JSON.stringify(friendsState)); } catch {}
  }, [friendsState]);
  useEffect(() => {
    try { localStorage.setItem('cw_pending_friend_reqs', JSON.stringify(pendingFriendRequestIds)); } catch {}
  }, [pendingFriendRequestIds]);

  // Friends network poll — incoming requests, requests you sent that got
  // accepted (so you also gain the friend), and gifts friends sent you (routed
  // into the Inbox for collection). Runs on mount and every 30s.
  useEffect(() => {
    let alive = true;
    const poll = async () => {
        const [incoming, accepted, gifts] = await Promise.all([
            fetchIncomingRequests(),
            fetchAcceptedForSender(),
            fetchIncomingGifts(),
        ]);
        if (!alive) return;
        setIncomingFriendRequests(incoming);
        if (accepted.length > 0) {
            setFriendsState(prev => {
                const existing = new Set(prev.friends.map(f => f.id));
                const additions = accepted.filter(a => !existing.has(a.toDevice))
                    .map(a => ({ id: a.toDevice, name: a.toName, avatar: a.toAvatar, level: a.toLevel, isAI: false, addedAt: Date.now() }));
                return additions.length > 0 ? { ...prev, friends: [...prev.friends, ...additions] } : prev;
            });
            setPendingFriendRequestIds(prev => prev.filter(id => !accepted.some(a => a.toDevice === id)));
            accepted.forEach(a => ackSenderRequest(a.id));
        }
        if (gifts.length > 0) {
            setInbox(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const additions = gifts
                    .filter(g => !existingIds.has(`friendgift_${g.id}`))
                    .map(g => ({
                        id: `friendgift_${g.id}`, type: 'FRIEND_GIFT' as const,
                        title: `Gift from ${g.fromName}`, body: `+${g.amount.toLocaleString()} Coins`,
                        claimed: false, createdAt: g.createdAt,
                    }));
                return additions.length > 0 ? [...additions, ...prev] : prev;
            });
        }
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => { alive = false; clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arena season clock — processes end-of-season and rolls into the next one.
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setArenaState(prev => {
        const elapsed = now - prev.seasonStart;
        // Active phase ended → run end-of-season processing once.
        if (elapsed >= SEASON_TOTAL_MS) {
          // Whole season (incl. processing) has elapsed → start a fresh one.
          const processedThis = arenaProcessedRef.current === prev.seasonId;
          let tierIndex = prev.tierIndex;
          if (!processedThis && prev.points > 0) {
            // Player competed but app missed the processing window — settle it now.
            const board = getFinalBoard(prev, { id: 'you', name: playerName || 'You', avatar: profileEmoji, points: prev.points });
            const position = positionOf(board);
            tierIndex = nextTier(prev.tierIndex, position);
            const reward = arenaReward(position, MAX_BET_BY_LEVEL(player.level), prev.tierIndex);
            if (reward > 0) setPlayer(p => ({ ...p, balance: p.balance + reward }));
          }
          arenaProcessedRef.current = prev.seasonId; // don't reprocess
          return {
            ...prev,
            tierIndex,
            seasonId: prev.seasonId + 1,
            seasonStart: now,
            points: 0,
            refMult: betTierMultiplier(arenaBetTierRef.current),
            lastResult: null,
          };
        }
        if (elapsed >= SEASON_ACTIVE_MS && arenaProcessedRef.current !== prev.seasonId) {
          // Entering the 3-minute processing window — settle results.
          arenaProcessedRef.current = prev.seasonId;
          // Only players who actually spun (points > 0) joined the season. AFK
          // players are not ranked, promoted, demoted or rewarded.
          if (prev.points <= 0) return prev;
          const board = getFinalBoard(prev, { id: 'you', name: playerName || 'You', avatar: profileEmoji, points: prev.points });
          const position = positionOf(board);
          const newTier = nextTier(prev.tierIndex, position);
          const outcome = outcomeFor(prev.tierIndex, position);
          const reward = arenaReward(position, MAX_BET_BY_LEVEL(player.level), prev.tierIndex);
          if (reward > 0) setPlayer(p => ({ ...p, balance: p.balance + reward }));
          if (arenaUnlocked) setShowArenaResults(true);
          return {
            ...prev,
            tierIndex: newTier,
            lastResult: { seasonId: prev.seasonId, position, oldTier: prev.tierIndex, newTier, outcome, reward, pointsEarned: prev.points },
          };
        }
        return prev;
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName, profileEmoji, player.level]);

  useEffect(() => {
    try { localStorage.setItem('cw_saved_game_states', JSON.stringify(savedGameStates)); } catch {}
  }, [savedGameStates]);

  useEffect(() => {
    try { localStorage.setItem('cw_quest', JSON.stringify({ wildStage: quest.wildStage, diceStage: quest.diceStage, dicePosition: quest.dicePosition, wildGrid: quest.wildGrid, diceCredits: quest.diceCredits, wildCredits: quest.wildCredits })); } catch {}
  }, [quest.wildStage, quest.diceStage, quest.dicePosition, quest.wildGrid]);

  // When all slot quest missions complete, stop auto-spin and open the quest path modal.
  // If a bonus is still running, defer until it ends.
  useEffect(() => {
      const allDone = slotQuestState.missions.length > 0 && slotQuestState.missions.every(m => m.current >= m.target);
      if (allDone && !prevQuestAllDoneRef.current) {
          setPlayer(p => ({ ...p, autoSpin: false }));
          if (freeSpinsRemaining === 0 && !holdWinActive && !pirateWalkActive) {
              setTimeout(() => setShowQuestPath(true), 600);
          } else {
              pendingQuestCompleteRef.current = true;
          }
      }
      if (!allDone) pendingQuestCompleteRef.current = false;
      prevQuestAllDoneRef.current = allDone;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotQuestState.missions]);

  useEffect(() => {
      if (pendingQuestCompleteRef.current && freeSpinsRemaining === 0 && !holdWinActive && !pirateWalkActive) {
          pendingQuestCompleteRef.current = false;
          setTimeout(() => setShowQuestPath(true), 800);
      }
  }, [freeSpinsRemaining, holdWinActive, pirateWalkActive, status]);

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
    try { localStorage.setItem('cw_decks', JSON.stringify(decks)); } catch {}
  }, [decks]);

  useEffect(() => {
    try { localStorage.setItem('cw_login', JSON.stringify(loginState)); } catch {}
  }, [loginState]);

  const updateMissions = (type: MissionType, amount: number) => {
      if (player.level < 15) return;
      setMissionState(prev => {
          const visibleIds = new Set<string>();
          const frequencies = ['DAILY'];
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
          triggerCoinAnim(coinGain);
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
          const scaledValue = SCALE_COIN_REWARD(reward.value, player.level, currentBetRef.current);
          setMissionState(prev => ({ ...prev, passRewards: prev.passRewards.map(r => r.id === reward.id ? { ...r, claimed: true, claimedValue: scaledValue } : r) }));
          setPlayer(p => ({ ...p, balance: p.balance + scaledValue }));
          triggerCoinAnim(scaledValue);
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
              if (reward.tier === 'PREMIUM') {
                  setPlayer(p => ({ ...p, premiumPackCredits: (p.premiumPackCredits ?? 0) + reward.value }));
                  msg = `+${reward.value} Premium Packs`;
              } else {
                  setPlayer(p => ({ ...p, packCredits: p.packCredits + reward.value }));
                  msg = `+${reward.value} Card Packs`;
              }
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
      let totalPremPackCredits = 0;
      let totalPicks = 0;
      let totalDice = 0;
      let xpBoostApplied = false;

      rewardsToClaim.forEach(r => {
          if (r.type === 'COINS') totalCoins += SCALE_COIN_REWARD(r.value, player.level, currentBetRef.current);
          else if (r.type === 'DIAMONDS') totalDiamonds += r.value;
          else if (r.type === 'CREDIT_BACK') {
              if (r.tier === 'PREMIUM') totalPremPackCredits += r.value;
              else totalPackCredits += r.value;
          }
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
          premiumPackCredits: (p.premiumPackCredits ?? 0) + totalPremPackCredits,
      }));
      if (totalPicks > 0) {
          setQuest(q => ({ ...q, wildCredits: (q.wildCredits ?? 0) + totalPicks }));
      }
      if (totalDice > 0) {
          setQuest(q => ({ ...q, diceCredits: (q.diceCredits ?? 0) + totalDice }));
      }
      
      const claimedMap = new Map(rewardsToClaim.map(r => [
          r.id,
          r.type === 'COINS' ? SCALE_COIN_REWARD(r.value, player.level, currentBetRef.current) : undefined,
      ]));
      setMissionState(prev => ({
          ...prev,
          passRewards: prev.passRewards.map(r => claimedMap.has(r.id)
              ? { ...r, claimed: true, ...(claimedMap.get(r.id) !== undefined ? { claimedValue: claimedMap.get(r.id) } : {}) }
              : r),
      }));

      if (totalCoins > 0) triggerCoinAnim(totalCoins);
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
      triggerCoinAnim(reward);
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
              toastTimerRef.current = setTimeout(() => setActiveToast(null), 1500);
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

  useEffect(() => {
      const interval = setInterval(() => {
          setPiggyShaking(true);
          setTimeout(() => setPiggyShaking(false), 800);
      }, 40000);
      return () => clearInterval(interval);
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
              const arcticCascadeWildChance = freeSpinsRemaining > 0 ? 0.36 : 0.17;
              if (featureThemeOf(selectedGame.theme) === 'ARCTIC' && c >= 1 && c <= 3 && Math.random() < arcticCascadeWildChance) {
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
              audioService.playIceShatter();
              setTimeout(() => runCascadeRef.current!(newGrid, nextMult, newAccWin, result.winningCells), 350);
          }, 500);
      } else {
          // No further wins — keep cascade grid visible until next spin(); clear it there
          const winTier = getWinTier(accWin, bet);
          setWinData({ payout: accWin, winningLines: [], winningCells: [], isBigWin: !!winTier, scattersFound: 0, winType: winTier || undefined });
          awardArenaWin(accWin);
          setCascadeMultiplier(1);
          setCascadeTotalWin(0);
          if (totalFreeSpins === 0 && !holdWinRef.current.active && !pirateWalkRef.current.active) {
              setLastWinAmount(accWin);
          }
          setTimeout(() => {
              if (winTier) {
                  trackSlotQuest('BIG_WIN_COUNT', 1);
                  updateMissions(MissionType.BIG_WIN_COUNT, 1);
                  audioService.playWinTier(winTier);
                  setShowWinPopup(true);
                  setStatus(GameStatus.WIN_ANIMATION);
              } else if (accWin > 0) {
                  audioService.playWinSmall();
                  if (totalFreeSpins === 0 && !holdWinRef.current.active && !pirateWalkRef.current.active) {
                      setLastWinAmount(accWin);
                  }
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
      const ft = featureThemeOf(selectedGame.theme);
      // Read from ref so the last free spin still generates a free-spin grid even though
      // freeSpinsRemaining was already decremented to 0 in the same React render batch.
      const isFreeSpin = isCurrentFreeSpinRef.current;
      const newGrid: SymbolType[][] = [];
      const isSmallGrid = cols <= 3;
      let pirateShipSeeded = false;

      // EGYPT Hold and Win: generate respin grid keeping locked cells as COIN
      if (ft === 'EGYPT' && holdWinRef.current.active) {
          const lockedGrid = holdWinRef.current.lockedGrid;
          // Base 50% chance any coins appear; decreases 15% for each non-productive respin (last slot ~1%)
          const respinsUsed = 3 - holdWinRef.current.respins; // 0 on first respin, 1 on second, etc.
          let baseCoinChance = respinsUsed >= 2 ? 0.005 : Math.max(0, 0.50 - respinsUsed * 0.15);

          // Collect empty cell positions
          const emptyCells: {c: number, r: number}[] = [];
          for (let c = 0; c < cols; c++) {
              for (let r = 0; r < rows; r++) {
                  if (!lockedGrid[c]?.[r]) emptyCells.push({ c, r });
              }
          }

          // Reduce the chance of completing the full grid (Grand) by ~50%:
          // when the board is nearly full, halve the coin-fill chance.
          if (emptyCells.length <= 2) baseCoinChance *= 0.5;

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
              while (selectedGame.theme === 'PIGGY' && sym === SymbolType.SCATTER) {
                  sym = getRandomSymbol(isFreeSpin, spinsWithoutBonus);
              }
              // Mystery feature themes: scatter appears ~75% less often overall
              // (an additional 50% reduction stacked on top of the prior 50% cut).
              if (MYSTERY_FEATURE_THEMES.has(selectedGame.theme) && sym === SymbolType.SCATTER && Math.random() < 0.75) {
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
      // These themes never use full-column same-symbol matches (3-column "mega match").
      // Only GOLDEN_POT (untouched generic slot) keeps it among the lower-tier games.
      if (['NEON','PIGGY','LEPRECHAUN','EGYPT','ARCTIC','PIRATE','SPACE','CANDY','UNDERWATER','WESTERN','SAMURAI','JUNGLE','PETS','MMORPG'].includes(selectedGame.theme)) megaMatchActive = false;

      for(let c=0; c<cols; c++) {
           let eventTriggered = false;
           if (megaMatchActive && (cols > 3 ? (c >= 1 && c <= 3) : true)) {
                for(let r=0; r<rows; r++) newGrid[c][r] = megaMatchSymbol;
                eventTriggered = true;
           }
           
           if (!eventTriggered) {
               let wildStackChance = 0.0;
               const wildMult = isFreeSpin ? (isNeon ? 1.20 : 1.80) : (isNeon ? 0.80 : 1.0);
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
               // PIGGY: 20% higher wild rate + extend to extra columns
               if (selectedGame.theme === 'PIGGY') {
                   if (c === 5) wildStackChance = 0.21 * wildMult;
                   if (c === 6) wildStackChance = 0.252 * wildMult;
                   wildStackChance *= 1.2;
               }
               // DRAGON: no full-column wild stacks, only single-cell wilds
               if (selectedGame.theme === 'DRAGON') wildStackChance = 0;

               // DRAGON: scatter individual single-cell wilds across all columns
               if (selectedGame.theme === 'DRAGON' && !eventTriggered) {
                   const dragonWildChance = isFreeSpin ? 0.06 : 0.04;
                   for (let r = 0; r < rows; r++) {
                       if (newGrid[c][r] !== SymbolType.WILD && Math.random() < dragonWildChance) {
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
      if (ft === 'PIRATE' && !pirateWalkRef.current.active) {
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
          && !pirateShipSeeded && !(ft === 'PIRATE' && pirateWalkRef.current.active)) {
          const scatterRoll = Math.random() * 100;
          let targetScatters = 0;
          // 3×3 slots: 20% less free spin chance (raise thresholds so fewer scatters spawn)
          // Arctic: 1&2-scatter thresholds lowered by 10%; retrigger (s3) lowered extra 5% during free spins
          const isArctic = ft === 'ARCTIC';
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

      // EGYPT: inject coin symbols (1-6 cells) in base game; 6+ triggers Hold and Win (reused by Samurai)
      if (ft === 'EGYPT' && !isFreeSpin) {
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
      if (ft === 'ARCTIC') {
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

      // PIGGY: inject coin symbols (1-6 cells), 6+ triggers free spins
      if (selectedGame.theme === 'PIGGY') {
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
      if (ft === 'SPACE') {
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
      if (ft === 'CANDY') {
          candyPendingColsRef.current = [];
          candySingleWildsRef.current = [];
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

      // Jackpot cell injection: during free spins only, except ARCTIC and NEON.
      // PIRATE: jackpots spawn on non-ship reels for visual decoration; won only by separate chance roll below.
      if (isFreeSpin && ft !== 'ARCTIC' && ft !== 'NEON' && !MYSTERY_FEATURE_THEMES.has(selectedGame.theme)) {
          // CANDY gets 50% reduced jackpot spawn rates
          const jpScale = ft === 'CANDY' ? 0.5 : 1.0;
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
      if (ft === 'PIRATE' && pirateWalkRef.current.active) {
          const shipCol = pirateWalkRef.current.shipCol;
          if (shipCol >= 0 && shipCol < cols) {
              for (let r = 0; r < rows; r++) newGrid[shipCol][r] = SymbolType.WILD;
          }
          const ship2Col = pirateWalkRef.current.ship2Col;
          if (ship2Col >= 0 && ship2Col < cols) {
              for (let r = 0; r < rows; r++) newGrid[ship2Col][r] = SymbolType.WILD;
          }

          // Ghost Ship jackpot: only during free spins, 8% chance per walk-spin.
          if (isFreeSpin && Math.random() < 0.08) {
              const JP_PIRATE = [
                  { sym: SymbolType.JACKPOT_MINI,  w: 60 },
                  { sym: SymbolType.JACKPOT_MINOR, w: 25 },
                  { sym: SymbolType.JACKPOT_MAJOR, w: 10 },
                  { sym: SymbolType.JACKPOT_MEGA,  w: 4  },
                  { sym: SymbolType.JACKPOT_GRAND, w: 1  },
              ];
              const totalW = JP_PIRATE.reduce((a, j) => a + j.w, 0);
              let pick = Math.random() * totalW;
              let jpSym = JP_PIRATE[0].sym;
              let jpTier = 0;
              for (let ji = 0; ji < JP_PIRATE.length; ji++) {
                  pick -= JP_PIRATE[ji].w;
                  if (pick <= 0) { jpSym = JP_PIRATE[ji].sym; jpTier = ji; break; }
              }
              const targetShipCol = shipCol >= 0 ? shipCol : (ship2Col >= 0 ? ship2Col : -1);
              if (targetShipCol >= 0) {
                  const jpRow = Math.floor(Math.random() * rows);
                  newGrid[targetShipCol][jpRow] = jpSym;
                  pirateJpTierRef.current = jpTier;
              }
          }
      }

      // MYSTERY feature: during free spins, scatter mystery tiles across the grid that all
      // reveal the SAME randomly-chosen symbol. We set the underlying cells to that symbol now
      // (so win evaluation is automatic) and record which cells are masked by a mystery tile.
      mysteryCellsRef.current = [];
      if (MYSTERY_FEATURE_THEMES.has(selectedGame.theme) && isFreeSpin && Math.random() > 0.25) {
          // Reveal symbol — weighted toward mid/high pays; WILD is rarest outcome.
          const REVEAL_POOL = [
              { s: SymbolType.GRAPE,  w: 24 },
              { s: SymbolType.BELL,   w: 22 },
              { s: SymbolType.ACE,    w: 16 },
              { s: SymbolType.KING,   w: 14 },
              { s: SymbolType.BAR,    w: 14 },
              { s: SymbolType.CHERRY, w: 10 },
              { s: SymbolType.WILD,   w: 2  },
          ];
          const totW = REVEAL_POOL.reduce((a, p) => a + p.w, 0);
          let rr = Math.random() * totW;
          let revealSym = REVEAL_POOL[0].s;
          for (const p of REVEAL_POOL) { rr -= p.w; if (rr <= 0) { revealSym = p.s; break; } }

          // Eligible (plain) cells only — never overwrite scatter/wild/jackpot/coin.
          const plain: { c: number; r: number }[] = [];
          for (let c = 0; c < cols; c++) {
              for (let r = 0; r < rows; r++) {
                  const s = newGrid[c][r];
                  if (s !== SymbolType.SCATTER && s !== SymbolType.WILD && s !== SymbolType.COIN && !String(s).startsWith('JACKPOT')) {
                      plain.push({ c, r });
                  }
              }
          }
          // Mystery count: 1–15, weighted toward low end (15 = rarest).
          const COUNT_WEIGHTS = [25, 22, 15, 12, 8, 5, 4, 3, 2.5, 1.5, 1, 0.7, 0.5, 0.4, 0.3];
          const totalCW = COUNT_WEIGHTS.reduce((a, b) => a + b, 0);
          let cr = Math.random() * totalCW;
          let count = 1;
          for (let i = 0; i < COUNT_WEIGHTS.length; i++) { cr -= COUNT_WEIGHTS[i]; if (cr <= 0) { count = i + 1; break; } }
          count = Math.min(count, plain.length);
          for (let i = plain.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [plain[i], plain[j]] = [plain[j], plain[i]];
          }
          const chosen = plain.slice(0, count);
          chosen.forEach(({ c, r }) => { newGrid[c][r] = revealSym; });
          mysteryCellsRef.current = chosen;
          mysteryCountRef.current = chosen.length;
      }

      // First-time player guarantee: on the 10th paid spin, force a free-spin trigger.
      // PIGGY uses 6+ COIN cells to trigger (not SCATTER); all other slots use SCATTER.
      if (forceFreeSpinRef.current && !isFreeSpin) {
          if (selectedGame.theme === 'PIGGY') {
              // Place 6 coins in random eligible (non-wild, non-scatter) cells.
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
              for (let i = 0; i < Math.min(6, eligible.length); i++) {
                  newGrid[eligible[i].c][eligible[i].r] = SymbolType.COIN;
              }
          } else if (ft !== 'EGYPT') {
              // All non-Egypt, non-Piggy slots: drop enough scatters in distinct columns.
              const need = Math.min(selectedGame.scattersToTrigger || 3, cols);
              const colOrder = Array.from({ length: cols }, (_, i) => i);
              for (let i = colOrder.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [colOrder[i], colOrder[j]] = [colOrder[j], colOrder[i]];
              }
              for (let k = 0; k < need; k++) {
                  const c = colOrder[k];
                  const r = Math.floor(Math.random() * rows);
                  newGrid[c][r] = SymbolType.SCATTER;
              }
          }
          forceFreeSpinRef.current = false;
          firstFreeSpinDoneRef.current = true;
          try { localStorage.setItem('cw_first_fs_done', '1'); } catch {}
      }

      return newGrid;
  }, [selectedGame, freeSpinsRemaining, freeSpinsWon, spinsWithoutBonus]);

  const handleQuestModeSelect = (mode: 'NONE' | 'WILD' | 'DICE') => {
        setQuest(q => ({ ...q, activeGame: mode }));
  };

  const handleStageComplete = (gameType: 'WILD' | 'DICE', bonusCoins: number, bonusDiamonds: number, autoAdvance?: boolean) => {
      setPlayer(p => ({ ...p, balance: p.balance + bonusCoins, diamonds: p.diamonds + bonusDiamonds }));

      if (gameType === 'WILD') {
          setQuest(q => ({ ...q, wildStage: q.wildStage + 1, wildGrid: [] }));
      } else {
          setQuest(q => ({ ...q, diceStage: q.diceStage + 1, dicePosition: 0 }));
      }

      if (autoAdvance) {
          setStageCompletePopup(prev => prev ? { ...prev, autoAdvance: true } : prev);
      }
  };

  // Handler to update Wild Grid state from modal to maintain persistence
  const handleWildGridUpdate = (newGrid: WildGridCell[]) => {
      setQuest(q => ({ ...q, wildGrid: newGrid }));
  };

  const handleDiceRoll = (roll: number, newPosition: number, rewards: MiniGameReward[], isFinish: boolean, cost: number = 1) => {
      setQuest(q => ({ ...q, diceCredits: Math.max(0, q.diceCredits - cost), dicePosition: newPosition }));
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
          const bonusCoins = Math.floor(MAX_BET_BY_LEVEL(player.level) * (1.8 + 0.06 * quest.diceStage));
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
    if (showCandyRoulette || showSpinCountRoulette) return;
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
    isCurrentFreeSpinRef.current = isFreeSpin; // captured before state batch so generateSmartGrid sees the right value
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
          const cap = Math.floor(MAX_BET_BY_LEVEL(player.level) * 5 * (1 + EVENT_PIGGY_BOOST));
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
      // Golden Treasury multiplier progress: full credit when bet ≥ 50% of max bet, else half.
      {
          const maxBetNow = MAX_BET_BY_LEVEL(player.level) * (isHighLimit ? 10 : 1);
          const qualifies = currentBet >= maxBetNow * 0.5;
          setTreasuryMultProgress(prev => prev + (qualifies ? 1 : 0.5) * treasuryProgressRate);
      }
      updateMissions(MissionType.SPIN_COUNT, 1);
      updateMissions(MissionType.BET_COINS, currentBet);
      if (betIndex === availableBets.length - 1) updateMissions(MissionType.MAX_BET_SPIN, 1);
      // Track slot quest progress (per-spin: spin count, total bet, max-bet spins)
      trackSlotQuest('SPIN_COUNT', 1);
      trackSlotQuest('BET_COINS', currentBet);
      if (betIndex === availableBets.length - 1) trackSlotQuest('MAX_BET_SPIN', 1);
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
      // First-time player: guarantee the 10th paid spin triggers free spins (once ever).
      lifetimeSpinsRef.current += 1;
      if (!firstFreeSpinDoneRef.current && lifetimeSpinsRef.current >= 10) {
          forceFreeSpinRef.current = true;
      }
    } else if (isHoldWinRespin || isPirateWalk) {
        // Hold and Win / Ghost Ship respin: free, no missions, no stats
    } else {
        setFreeSpinsRemaining(prev => prev - 1);
        // SPACE: ramp the Supernova multiplier (+1 each free spin, capped ×15)
        if (featureThemeOf(selectedGame.theme) === 'SPACE') {
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
  }, [status, reelTransitioning, player.balance, availableBets, betIndex, freeSpinsRemaining, activeModal, showFreeSpinsPopup, showFreeSpinSummary, showCandyRoulette, showSpinCountRoulette, player.level, selectedGame.theme]);

  useEffect(() => {
    if (status === GameStatus.SPINNING && targetGrid.length === 0) {
      setTargetGrid(generateSmartGrid());
      // MYSTERY: arm the tile overlay for this spin (cleared each spin; populated only in free spins).
      setMysteryRevealed(false);
      setMysteryCells(mysteryCellsRef.current);
      // CANDY: keep the wild borders on screen at their previous position during the spin
      // so they slide to the new position once the reels stop (set in the completion handler).
    }
  }, [status, targetGrid.length, generateSmartGrid, selectedGame.theme, freeSpinsRemaining]);

  // Arctic free-spin jackpot: show popup only once spin is fully idle
  useEffect(() => {
    if (status === GameStatus.IDLE && pendingArcticFreePick && !showArcticPickModal && !reelTransitioning) {
        setPendingArcticFreePick(false);
        setPlayer(p => ({ ...p, autoSpin: false }));
        setTimeout(() => {
            setShowArcticTriggerPopup(true);
            setInstantStop(true);
            audioService.playBonusTrigger();
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
  }, [status, pendingArcticFreePick, showArcticPickModal, freeSpinsRemaining, reelTransitioning]);

  useEffect(() => {
    if (status === GameStatus.SPINNING && targetGrid.length > 0) {
        // Fast spin only applies while autospin is running — manual spins always play
        // at full speed.
        const effectiveFastSpin = fastSpin && player.autoSpin && freeSpinsRemaining === 0;
        const timeout = setTimeout(() => setStatus(GameStatus.STOPPING), effectiveFastSpin ? 50 : 500);
        return () => clearTimeout(timeout);
    }
  }, [status, targetGrid.length, fastSpin, player.autoSpin]);

  const handleReelStop = useCallback(() => {
    const ft = featureThemeOf(selectedGame.theme);
    setStoppedReels(prev => {
      const next = prev + 1;
      audioService.playReelStop();
      // Scatter anticipation: highlight remaining reels when (scattersToTrigger - 1) scatters found
      const stt = selectedGame.scattersToTrigger;
      if (!fastSpinRef.current && next < selectedGame.reels && stt >= 2 && stt < 100) {
          const tGrid = targetGridRef.current;
          let scattersSoFar = 0;
          for (let c = 0; c < next; c++) {
              if (tGrid[c]?.some(s => s === SymbolType.SCATTER)) scattersSoFar++;
          }
          if (scattersSoFar >= stt && scatterAnticipationRef.current) {
              scatterAnticipationRef.current = false;
              setScatterAnticipation(false);
          } else if (scattersSoFar >= 2 && scattersSoFar < stt && !scatterAnticipationRef.current) {
              scatterAnticipationRef.current = true;
              setScatterAnticipation(true);
          }
      }
      if (next === selectedGame.reels) {
        setScatterAnticipation(false);
        scatterAnticipationRef.current = false;

        // CANDY: sync the Wild Wheel overlay to the reels that just stopped. The first commit
        // of a free-spin session pops in; later commits slide from the previous position.
        if (ft === 'CANDY') {
            candyCommitCountRef.current += 1;
            setCandyCols(candyPendingColsRef.current);
            setCandySingleWilds(candySingleWildsRef.current);
            setCandyFsSpinKey(k => k + 1);
        }

        // EGYPT: Hold and Win respin handling
        if (ft === 'EGYPT' && holdWinRef.current.active) {
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
        if (ft === 'EGYPT' && !holdWinRef.current.active) {
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
                    setTimeout(() => {
                        audioService.playBonusTrigger();
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
                        }, 1800);
                    }, 900);
                }, 0);
                return next;
            }
        }

        // PIRATE: Ghost Ship Walking Wilds. The wild column "sails" one reel left per free respin
        // (the leftward step is taken in the IDLE auto-continue effect, so the overlay matches the screen).
        if (ft === 'PIRATE') {
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
        if (ft !== 'EGYPT') {
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
                     audioService.playBonusTrigger();
                     setShowNeonRoulette(true);
                     setNeonRouletteBet(betAmt);
                 }, 3000);
                 return next;
             }

             // CANDY: two-stage bonus — spin count roulette first, then wild wheel roulette.
             if (ft === 'CANDY') {
                 if (freeSpinsRemaining > 0) {
                     // Retrigger mid-feature: add spins, keep wild config.
                     const retrigerSpins = 5;
                     setFreeSpinsWon(retrigerSpins);
                     setTotalFreeSpins(prev => prev + retrigerSpins);
                     setShowFreeSpinsPopup(true);
                     audioService.playFreeSpinTrigger();
                 } else {
                     setStatus(GameStatus.SCATTER_SHOWCASE);
                     audioService.playScatterTrigger();
                     setSpinsWithoutBonus(0);
                     setTimeout(() => { audioService.playBonusTrigger(); setShowSpinCountRoulette(true); }, 1500);
                 }
                 return next;
             }

             const baseSpins = ft === 'ARCTIC'
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
                 audioService.playFreeSpinTrigger();
             } else {
                 setStatus(GameStatus.SCATTER_SHOWCASE);
                 audioService.playScatterTrigger();
                 setSpinsWithoutBonus(0);
                 setTimeout(() => {
                     audioService.playFreeSpinTrigger();
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
                // The trigger COINs also score as a payline (COIN→SEVEN on the base
                // game) — credit that line win first (silently), before entering free
                // spins, without disrupting the free-spin screen flow.
                calculateWin(targetGrid, true);
                const spinsWon = 10;
                setFreeSpinsWon(spinsWon);
                setTotalFreeSpins(prev => prev + spinsWon);
                if (freeSpinsRemaining > 0) {
                    setShowFreeSpinsPopup(true);
                    audioService.playFreeSpinTrigger();
                } else {
                    setStatus(GameStatus.SCATTER_SHOWCASE);
                    audioService.playScatterTrigger();
                    setSpinsWithoutBonus(0);
                    setTimeout(() => { audioService.playFreeSpinTrigger(); setShowFreeSpinsPopup(true); }, 2000);
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
                        setTimeout(() => {
                            setDragonPotShaking(false);
                            audioService.playBonusTrigger();
                            setShowDragonTriggerPopup(true);
                            setPlayer(p => ({ ...p, autoSpin: false }));
                        }, 3000);
                    }, 400);
                }
            }
        }
        if (ft === 'ARCTIC' && freeSpinsRemaining === 0) {
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
                        audioService.playBonusTrigger();
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

        // MYSTERY reveal: hold on the mystery tiles briefly, then lift them to expose the
        // shared symbol underneath before scoring the spin.
        if (mysteryCellsRef.current.length > 0) {
            const revealDelay = fastSpinRef.current ? 250 : 1050;
            const mysteryCount = mysteryCountRef.current;
            mysteryCellsRef.current = [];
            mysteryCountRef.current = 0;
            setTimeout(() => {
                setMysteryRevealed(true);
                // Full grid (15 cells) mystery = mini jackpot bonus
                if (mysteryCount >= 15) {
                    const jpAmts = jackpotService.getAmounts();
                    const jpAmount = jpAmts[0]; // MINI
                    setPlayer(p => ({ ...p, balance: p.balance + jpAmount }));
                    audioService.playJackpotSound('MINI');
                    setWinData({ payout: jpAmount, winningLines: [], winningCells: [], isBigWin: true, scattersFound: 0, winType: 'BIG WIN' });
                    trackSlotQuest('BIG_WIN_COUNT', 1);
                    updateMissions(MissionType.BIG_WIN_COUNT, 1);
                    setPendingBigWin(true);
                    pendingWinTierRef.current = 'BIG WIN';
                    setJackpotWinTier({ name: 'MINI', color: '#4ade80', icon: '', amount: jpAmount });
                    awardArenaWin(jpAmount);
                } else {
                    calculateWin(targetGrid);
                }
            }, revealDelay);
            return next;
        }

        calculateWin(targetGrid);
      }
      return next;
    });
  }, [targetGrid, selectedGame, freeSpinsRemaining, spinsWithoutBonus]);

  // creditOnly: pay out the line win and update stats/XP/arena, but skip all
  // status/popup/sound side-effects — used when a feature (e.g. Piggy free-spin
  // trigger) needs the payline win credited without taking over the screen flow.
  const calculateWin = (finalGrid: SymbolType[][], creditOnly = false) => {
    const ft = featureThemeOf(selectedGame.theme);
    const currentBet = availableBets[betIndex];
    let totalPayout = 0;
    const winningLines: number[] = [];
    const winningCells: {col: number, row: number}[] = [];
    const currentPaylines = GET_PAYLINES(selectedGame.rows, selectedGame.reels);

    const isPiggy = selectedGame.theme === 'PIGGY';
    // PIGGY: coins only substitute as wilds during free spins (not in the base game)
    const isCoinOrWild = (sym: SymbolType) => sym === SymbolType.WILD || (isPiggy && freeSpinsRemaining > 0 && sym === SymbolType.COIN);
    // PIGGY: on normal spins, COIN scores as SEVEN (scatter coin counts toward seven paylines)
    const normalizePiggy = (sym: SymbolType): SymbolType =>
        (isPiggy && freeSpinsRemaining === 0 && sym === SymbolType.COIN) ? SymbolType.SEVEN : sym;
    currentPaylines.forEach(line => {
      const symbols = line.indices.map((row, col) => normalizePiggy((finalGrid[col] && finalGrid[col][row]) ? finalGrid[col][row] : SymbolType.TEN));
      let matchLen = 1;
      let matchSymbol = symbols[0];
      for (let i = 1; i < symbols.length; i++) {
        const s = symbols[i];
        if (s === matchSymbol || isCoinOrWild(s) || isCoinOrWild(matchSymbol)) {
            if (isCoinOrWild(matchSymbol) && !isCoinOrWild(s)) {
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
            // PIGGY free spins: COIN as 2× wild — any COIN in the winning sequence doubles the line win
            const coinMult = (isPiggy && totalFreeSpins > 0 && symbols.slice(0, matchLen).some(s => s === SymbolType.COIN)) ? 2 : 1;
            const lineWin = Math.floor(currentBet * (baseValue / 3) * lenMult * neonMult * coinMult);
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

    // Mystery feature themes (Farm, Beast, AngryFlock, Princess): 20% win boost on line payouts
    if (MYSTERY_FEATURE_THEMES.has(selectedGame.theme)) {
        totalPayout = Math.floor(totalPayout * 1.2);
    }

    // SPACE: Supernova progressive multiplier applies to line wins during free spins.
    // No-win spin resets the multiplier back to ×1.
    if (ft === 'SPACE' && totalFreeSpins > 0) {
        if (totalPayout > 0) {
            totalPayout = Math.floor(totalPayout * spaceFsMultRef.current);
        } else {
            spaceFsMultRef.current = 1;
            setSpaceMultiplier(1);
        }
    }

    // ARCTIC: no jackpot logic — start cascade sequence (reused by Deep Blue)
    if (ft === 'ARCTIC') {
        setWinData({ payout: totalPayout, winningLines, winningCells, isBigWin: false, scattersFound: scatterCount, winType: undefined });
        // Award XP for arctic spins
        const arcticVipMult = player.isVip ? 3.0 : 1.0;
        const arcticSpinsAtMax = Math.max(1, player.level * 1.1);
        const arcticBetFraction = currentBet / MAX_BET_BY_LEVEL(player.level);
        const arcticXp = Math.floor((player.xpToNextLevel / arcticSpinsAtMax) * arcticBetFraction * player.xpMultiplier * arcticVipMult);
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
            setTimeout(() => { setCascadeDissolving(true); audioService.playIceShatter(); }, 400);
            setTimeout(() => runCascadeRef.current!(finalGrid, 2, totalPayout, winningCells), 700);
        } else {
            const effectiveFastSpin = fastSpin;
            setTimeout(() => setStatus(GameStatus.IDLE), effectiveFastSpin ? 50 : 500);
        }
        // Per-spin drops for Arctic (same logic as normal slots, halved chance)
        const arcticMaxBetIdx = availableBets.length - 1;
        const arcticQuestChance = Math.max(0.005, (0.10 - (arcticMaxBetIdx - betIndex) * 0.01) * 1.3 * 0.8) * 0.5;
        if (player.level >= 20 && Math.random() < arcticQuestChance) {
            gainQuestCredit(Math.random() < 0.5 ? 'dice' : 'mine');
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
    // Jackpot amounts: 15/30/100/500/1000× current bet
    const JP_BET_MULTIPLIERS = [15, 30, 100, 500, 1000];
    const jpAmounts = JP_BET_MULTIPLIERS.map(m => Math.floor(currentBet * m));
    let jackpotWon = false;

    // PIRATE Ghost Ship jackpot: awarded via the embedded wild-column JP symbol
    if (ft === 'PIRATE' && pirateJpTierRef.current !== null) {
        const tier = pirateJpTierRef.current;
        pirateJpTierRef.current = null;
        jackpotWon = true;
        totalPayout += jpAmounts[tier];
        const jpCells: {col: number, row: number}[] = [];
        finalGrid.forEach((col, c) => col.forEach((s, r) => {
            if (s === JP_WIN_TYPES[tier]) jpCells.push({ col: c, row: r });
        }));
        winningCells.push(...jpCells);
        audioService.playJackpotSound(JP_META[tier].name);
        setJackpotWinTier({ ...JP_META[tier], amount: jpAmounts[tier] });
    }

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
            audioService.playJackpotSound(JP_META[tier].name);
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

    // Arena points — every spin scores, scaled by bet tier; wins score more.
    // (Frozen while a season is processing.)
    arenaBetTierRef.current = betIndex;
    addArenaPoints(pointsForEvent(winTier, betIndex));

    if (totalFreeSpins > 0 && totalPayout > 0) setFreeSpinTotalWin(prev => prev + totalPayout);

    // PIRATE: tally Ghost Ship walk winnings for the end-of-feature summary
    if (pirateWalkRef.current.active && totalPayout > 0) {
        pirateWalkTotalWinRef.current += totalPayout;
        setPirateWalkTotalWin(pirateWalkTotalWinRef.current);
    }

    // Per-spin drops — scale with bet level (±2% per step from max bet), halved chance
    const maxBetIdx = availableBets.length - 1;
    const questChance = Math.max(0.005, (0.10 - (maxBetIdx - betIndex) * 0.01) * 1.3 * 0.8) * 0.5;
    if (player.level >= 20 && Math.random() < questChance) {
        gainQuestCredit(Math.random() < 0.5 ? 'dice' : 'mine');
    }
    if (player.level >= 30) {
        const cardRoll = Math.random();
        if (cardRoll < 0.035) handleCardDrop('RARE');
        else if (cardRoll < 0.105) handleCardDrop('COMMON');
    }

    if (totalPayout > 0) {
       setPlayer(p => ({ ...p, balance: p.balance + totalPayout }));

       const vipXpMult = player.isVip ? 3.0 : 1.0;
       const level15Mult = player.level > 15 ? 1.6 : 1.0;
       const spinsAtMaxBet = Math.max(1, player.level * 1.1);
       // XP is capped at the NORMAL lobby max bet — high-limit (bigger) bets grant no extra XP.
       const betFraction = Math.min(1, currentBet / MAX_BET_BY_LEVEL(player.level));
       const xpGained = Math.floor((player.xpToNextLevel / spinsAtMaxBet) * betFraction * player.xpMultiplier * vipXpMult * level15Mult);

       addXp(xpGained);
       if (player.isVip) addVipXp(1);
       updateMissions(MissionType.WIN_COINS, totalPayout);
       if (winTier) updateMissions(MissionType.BIG_WIN_COUNT, 1);
       // Track slot quest progress (wins, coins won, big wins)
       trackSlotQuest('WIN_COUNT', 1);
       trackSlotQuest('WIN_COINS', totalPayout);
       if (winTier) trackSlotQuest('BIG_WIN_COUNT', 1);

       // Base-game win amount shown in the bottom bar (persists until next spin).
       if (totalFreeSpins === 0 && !holdWinRef.current.active && !pirateWalkRef.current.active) {
           setLastWinAmount(totalPayout);
       }

       if (!creditOnly) {
       if (winTier) {
           if (jackpotWon) {
               // Store tier; fire sound + popup when jackpot celebration closes
               pendingWinTierRef.current = winTier;
               setPendingBigWin(true);
               setStatus(GameStatus.WIN_ANIMATION);
           } else if (!pirateWalkRef.current.active) {
               // Suppress win popup during Ghost Ship — total shown at end of feature
               audioService.playWinTier(winTier);
               setShowWinPopup(true);
               setStatus(GameStatus.WIN_ANIMATION);
           } else {
               // Win during Ghost Ship walk — no popup, auto-return to IDLE so walk can continue
               setStatus(GameStatus.WIN_ANIMATION);
               const effectiveFastSpin = fastSpin && totalFreeSpins === 0;
               setTimeout(() => setStatus(GameStatus.IDLE), effectiveFastSpin ? 150 : 500);
           }
       } else {
           audioService.playWinSmall();
           setStatus(GameStatus.WIN_ANIMATION);
           const effectiveFastSpin = fastSpin && totalFreeSpins === 0;
           setTimeout(() => setStatus(GameStatus.IDLE), effectiveFastSpin ? 150 : 500);
       }
       }
    } else {
       if (totalFreeSpins === 0 && !holdWinRef.current.active && !pirateWalkRef.current.active && !creditOnly) {
           setLastWinAmount(0);
       }
       if (!creditOnly) {
       const vipXpMultLoss = player.isVip ? 3.0 : 1.0;
       const level15MultLoss = player.level > 15 ? 1.6 : 1.0;
       const spinsAtMaxBetLoss = Math.max(1, player.level * 1.1);
       // XP capped at the NORMAL lobby max bet — high-limit bets grant no extra XP.
       const betFractionLoss = Math.min(1, currentBet / MAX_BET_BY_LEVEL(player.level));
       const lossXp = Math.floor((player.xpToNextLevel / spinsAtMaxBetLoss) * betFractionLoss * player.xpMultiplier * vipXpMultLoss * level15MultLoss);
       addXp(lossXp);
       if (player.isVip) addVipXp(1);
       const effectiveFastSpin = fastSpin && totalFreeSpins === 0;
       setTimeout(() => setStatus(GameStatus.IDLE), effectiveFastSpin ? 50 : 500);
       }
    }
  };

  // Add Arena points — but only during a season's active phase. While a season is
  // processing (the 3-minute window before the next one) accrual is frozen.
  const addArenaPoints = (pts: number) => {
      if (pts <= 0) return;
      // Apply an active Arena XP buff (from purchases / shop).
      const arenaMult = (player.arenaXpBoostEndTime || 0) > Date.now() ? (player.arenaXpMultiplier || 1) : 1;
      const total = Math.round(pts * arenaMult);
      setArenaState(prev => seasonPhase(prev, Date.now()) === 'active' ? { ...prev, points: prev.points + total } : prev);
  };

  // Friends — AI/top-player entries add instantly; real players (device ids)
  // go through a genuine cross-device friend request via Supabase.
  const meAsLocalPlayer = () => ({
      name: playerName, avatar: profileEmoji, level: player.level, vipLevel: player.vipLevel ?? 0,
      score: player.balance, gems: player.diamonds, totalWon: player.stats?.totalCoinsWon || 0,
      maxJackpot: player.stats?.maxJackpotWin || 0, maxWin: player.stats?.maxSingleWin || 0,
  });
  const handleAddFriend = (friend: Friend) => {
      if (!isRealPlayerId(friend.id)) {
          setFriendsState(prev => prev.friends.some(f => f.id === friend.id) ? prev : { ...prev, friends: [...prev.friends, friend] });
          return;
      }
      if (pendingFriendRequestIds.includes(friend.id) || friendsState.friends.some(f => f.id === friend.id)) return;
      sendFriendRequest(meAsLocalPlayer(), friend.id);
      setPendingFriendRequestIds(prev => [...prev, friend.id]);
  };
  const handleAcceptFriendRequest = (req: IncomingRequest) => {
      acceptFriendRequest(req.id);
      setFriendsState(prev => prev.friends.some(f => f.id === req.fromDevice) ? prev : {
          ...prev,
          friends: [...prev.friends, { id: req.fromDevice, name: req.fromName, avatar: req.fromAvatar, level: req.fromLevel, isAI: false, addedAt: Date.now() }],
      });
      setIncomingFriendRequests(prev => prev.filter(r => r.id !== req.id));
  };
  const handleSendGift = (friendId: string) => {
      const now = Date.now();
      const friend = friendsState.friends.find(f => f.id === friendId);
      if (!friend || !friendCanSend(friend, now)) return;
      setFriendsState(prev => ({ ...prev, friends: prev.friends.map(f => f.id === friendId ? { ...f, lastSentAt: now } : f) }));
      // Only real friends can actually receive the gift — it lands in their Inbox.
      if (isRealPlayerId(friendId)) {
          const amt = sendGiftAmount(MAX_BET_BY_LEVEL(player.level));
          sendGiftToFriend(meAsLocalPlayer(), friendId, amt);
      }
      setCelebrationMsg('Gift Sent!');
  };

  const gainQuestCredit = (type: 'dice' | 'mine') => {
      if (type === 'dice') setQuest(q => ({ ...q, diceCredits: Math.min(60, q.diceCredits + 1) }));
      else setQuest(q => ({ ...q, wildCredits: Math.min(60, q.wildCredits + 1) }));
      setQuestCreditToast(type);
      if (questCreditToastTimer.current) clearTimeout(questCreditToastTimer.current);
      questCreditToastTimer.current = setTimeout(() => setQuestCreditToast(null), 2000);
  };

  // Award Arena win-tier points for a feature win (jackpot, roulette, cascade,
  // respin, pick bonus) that happens outside the normal per-spin evaluation.
  const awardArenaWin = (amount: number) => {
      if (amount <= 0) return;
      const bet = currentBetRef.current || 1;
      addArenaPoints(winBonusPoints(getWinTier(amount, bet), arenaBetTierRef.current));
  };

  const addXp = (amount: number) => {
      setPlayer(prev => {
          // Base EXP increased by 50% across all sources
          let newXp = prev.xp + Math.floor(amount * 1.5 * (1 + EVENT_EXP_BOOST));
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
              trackSlotQuest('LEVEL_UP', newLevel - prev.level);
              trackSlotReachLevel(newLevel);
              setMissionState(prev => ({
                  ...prev,
                  passRewards: GENERATE_PASS_REWARDS(10000).map(r => {
                      const existing = prev.passRewards.find((pr: any) => pr.id === r.id);
                      return existing ? { ...r, claimed: existing.claimed } : r;
                  })
              }));

              // CHECK FEATURE UNLOCKS
              const justUnlocked = (level: number) => {
                  if (level === 10 && !shownUnlocks.has(10)) return true;
                  if (level === 15 && !shownUnlocks.has(15)) return true;
                  if (level === 20 && !shownUnlocks.has(20)) return true;
                  if (level === 30 && !shownUnlocks.has(30)) return true;
                  if (level === 40 && !shownUnlocks.has(40)) return true;
                  return false;
              };

              // CHECK SLOT UNLOCKS — derived from GAMES_CONFIG order so it always matches the
              // lobby (getUnlockLevel = idx*5+1) and auto-covers newly added slots.
              const justUnlockedSlot = (level: number) => {
                  if (shownUnlocks.has(level)) return null;
                  const idx = GAMES_CONFIG.findIndex((_, i) => (i === 0 ? 0 : i * 5 + 1) === level);
                  if (idx <= 0) return null;
                  const g = GAMES_CONFIG[idx];
                  return { id: g.id, name: g.name, icon: g.coverImage || '🎰', lvl: level };
              };

              setTimeout(() => {
                  const slotUnlock = justUnlockedSlot(newLevel);
                  if (slotUnlock) {
                       setShownUnlocks(prev => new Set(prev).add(slotUnlock.lvl));
                       if (newLevel > 20) {
                           // After level 20: compact top-right toast + lobby NEW badge
                           setNewSlotIds(prev => prev.includes(slotUnlock.id) ? prev : [...prev, slotUnlock.id]);
                           audioService.playUnlock();
                           const unlockConfig = GAMES_CONFIG.find(g => g.id === slotUnlock.id);
                           if (unlockConfig) {
                               setSlotUnlockToast(unlockConfig);
                               if (slotUnlockToastTimerRef.current) clearTimeout(slotUnlockToastTimerRef.current);
                               slotUnlockToastTimerRef.current = setTimeout(() => setSlotUnlockToast(null), 6000);
                           }
                       } else {
                           setFeatureUnlockData({
                               name: slotUnlock.name,
                               icon: GAMES_CONFIG.find(g => g.id === slotUnlock.id)?.coverImage || slotUnlock.icon,
                               description: 'New Game Unlocked! Play Now.',
                               action: () => {
                                   const config = GAMES_CONFIG.find(g => g.id === slotUnlock.id);
                                   if (config) {
                                       setActiveModal('NONE');
                                       setTimeout(() => { handleGameSelect(config); }, 100);
                                   }
                               }
                           });
                           setActiveModal('FEATURE_UNLOCK');
                           setTimeout(() => setActiveModal(m => m === 'FEATURE_UNLOCK' ? 'NONE' : m), 3000);
                       }
                  }
                  else if (justUnlocked(newLevel)) {
                      if (newLevel === 10) {
                          setFeatureUnlockData({
                              name: 'Piggy Bank',
                              icon: '/ui/piggy.png',
                              description: 'Save coins with every spin!',
                              action: () => {
                                  setActiveModal('NONE');
                                  setTimeout(() => openModal('PIGGY'), 50);
                              }
                          });
                          setShownUnlocks(prev => new Set(prev).add(10));
                      } else if (newLevel === 15) {
                          setFeatureUnlockData({
                              name: 'Missions',
                              icon: '/ui/missions.png',
                              description: 'Complete daily challenges!',
                              action: () => {
                                  setActiveModal('NONE');
                                  setTimeout(() => openMissionsModal(), 50);
                              }
                          });
                          setShownUnlocks(prev => new Set(prev).add(15));
                      } else if (newLevel === 20) {
                          setFeatureUnlockData({
                              name: 'Mini Games',
                              icon: '/minigameslobbyicon.png',
                              description: 'Play Dice & Coin Mine for rewards!',
                              action: () => {
                                  setActiveModal('NONE');
                                  setTimeout(() => { openModal('MINIGAME'); audioService.playClick(); }, 50);
                              }
                          });
                          setShownUnlocks(prev => new Set(prev).add(20));
                      } else if (newLevel === 30) {
                          setFeatureUnlockData({ 
                              name: 'Card Album',
                              icon: '/ui/cards.png',
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
                              icon: '/ui/VIP.png',
                              description: 'Unlock High Limit bets!',
                              action: () => { 
                                  setActiveModal('NONE');
                                  setTimeout(() => { setIsHighLimit(true); handleHeaderBack(); }, 50);
                              } 
                          });
                          setShownUnlocks(prev => new Set(prev).add(40));
                      }
                      setActiveModal('FEATURE_UNLOCK');
                      setTimeout(() => setActiveModal(m => m === 'FEATURE_UNLOCK' ? 'NONE' : m), 3000);
                  }
              }, 500);

              return { ...prev, balance: prev.balance + reward, level: newLevel, xp: newXp, xpToNextLevel: newReq };
          }
          return { ...prev, xp: newXp, xpToNextLevel: newReq };
      });
  };

  const addVipXp = (amount: number) => {
      setPlayer(prev => {
          const boosted = (prev.vipXpBoostEndTime || 0) > Date.now() ? (prev.vipXpBoostMultiplier || 1) : 1;
          let newVipXp = (prev.vipXp ?? 0) + Math.round(amount * boosted);
          let newVipLevel = prev.vipLevel ?? 1;
          let newVipXpToNext = 500 * newVipLevel;
          while (newVipXp >= newVipXpToNext) {
              newVipXp -= newVipXpToNext;
              newVipLevel++;
              newVipXpToNext = 500 * newVipLevel;
          }
          return { ...prev, vipXp: newVipXp, vipLevel: newVipLevel, vipXpToNext: newVipXpToNext };
      });
  };

  const handleWinPopupComplete = () => {
      setShowWinPopup(false);
      // Hold & Win just finished — show its collect summary after the celebration.
      if (pendingHoldWinSummaryRef.current) {
          setHoldWinSummary(pendingHoldWinSummaryRef.current);
          pendingHoldWinSummaryRef.current = null;
          return;
      }
      // If free spins just ended (no retrigger pending), show summary
      if (freeSpinsWon > 0 && freeSpinsRemaining === 0 && !showFreeSpinsPopup) {
          trackSlotQuest('FREE_SPIN_COUNT', 1);
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
          awardArenaWin(total);
          if (total > 0) {
              setStatus(GameStatus.WIN_ANIMATION);
              if (winTier) {
                  // Big-win celebration first, then the collect summary (deferred until it closes).
                  trackSlotQuest('BIG_WIN_COUNT', 1);
                  updateMissions(MissionType.BIG_WIN_COUNT, 1);
                  audioService.playWinTier(winTier);
                  pendingHoldWinSummaryRef.current = { total, bet: currentBet };
                  setShowWinPopup(true);
              } else {
                  audioService.playWinSmall();
                  setHoldWinSummary({ total, bet: currentBet });
              }
          } else {
              setStatus(GameStatus.IDLE);
          }
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
                  audioService.playJackpotSound(jpTier);
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
          audioService.playJackpotSound('GRAND');
          setJackpotWinTier({ name: 'GRAND', color: '#fbbf24', icon: '🏆', amount: grandBonus });
          hwCountContinuationRef.current = () => setTimeout(beginCounting, 240);
      } else {
          setTimeout(beginCounting, 320);
      }
  };

  const handleArcticPickWin = (tier: string, amount: number) => {
      setShowArcticPickModal(false);
      setPlayer(p => ({ ...p, balance: p.balance + amount }));
      const TIER_META: Record<string, { color: string; winType: string }> = {
          MINI:  { color: '#4ade80', winType: 'BIG WIN'      },
          MINOR: { color: '#67e8f9', winType: 'GREAT WIN'    },
          MAJOR: { color: '#d8b4fe', winType: 'EPIC WIN'     },
          MEGA:  { color: '#fda4af', winType: 'MEGA WIN'     },
          GRAND: { color: '#fde68a', winType: 'ULTIMATE WIN' },
      };
      const meta = TIER_META[tier] || { color: '#fde68a', winType: 'MEGA WIN' };
      audioService.playJackpotSound(tier);
      setWinData({ payout: amount, winningLines: [], winningCells: [], isBigWin: true, scattersFound: 0, winType: meta.winType });
      trackSlotQuest('BIG_WIN_COUNT', 1);
      updateMissions(MissionType.BIG_WIN_COUNT, 1);
      setPendingBigWin(true);
      pendingWinTierRef.current = meta.winType;
      setJackpotWinTier({ name: tier, color: meta.color, icon: '', amount });
      trackSlotQuest('BIG_WIN_COUNT', 1);
      updateMissions(MissionType.BIG_WIN_COUNT, 1);
      trackSlotQuest('BONUS_TRIGGER', 1);
      awardArenaWin(amount);
  };

  const handleDragonPickWin = (tier: string, amount: number) => {
      setShowDragonPickModal(false);
      setPlayer(p => ({ ...p, balance: p.balance + amount }));
      const TIER_META: Record<string, { color: string; winType: string }> = {
          MINI:  { color: '#4ade80', winType: 'BIG WIN'      },
          MINOR: { color: '#67e8f9', winType: 'GREAT WIN'    },
          MAJOR: { color: '#d8b4fe', winType: 'EPIC WIN'     },
          MEGA:  { color: '#fda4af', winType: 'MEGA WIN'     },
          GRAND: { color: '#fde68a', winType: 'ULTIMATE WIN' },
      };
      const meta = TIER_META[tier] || { color: '#fde68a', winType: 'MEGA WIN' };
      audioService.playJackpotSound(tier);
      setWinData({ payout: amount, winningLines: [], winningCells: [], isBigWin: true, scattersFound: 0, winType: meta.winType });
      trackSlotQuest('BIG_WIN_COUNT', 1);
      updateMissions(MissionType.BIG_WIN_COUNT, 1);
      setPendingBigWin(true);
      pendingWinTierRef.current = meta.winType;
      setJackpotWinTier({ name: tier, color: meta.color, icon: '', amount });
      trackSlotQuest('BIG_WIN_COUNT', 1);
      updateMissions(MissionType.BIG_WIN_COUNT, 1);
      trackSlotQuest('BONUS_TRIGGER', 1);
      awardArenaWin(amount);
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
      if (winTier) { trackSlotQuest('BIG_WIN_COUNT', 1); updateMissions(MissionType.BIG_WIN_COUNT, 1); audioService.playWinTier(winTier); setShowWinPopup(true); }
      trackSlotQuest('BONUS_TRIGGER', 1);
      awardArenaWin(prize);
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
          if (pendingWinTierRef.current) {
              audioService.playWinTier(pendingWinTierRef.current);
              pendingWinTierRef.current = null;
          }
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

  const handleGameSelect = (game: GameConfig, highLimit: boolean = false, fromQuest: boolean = false) => {
      setNewSlotIds(prev => prev.filter(id => id !== game.id));
      const gameIndex = GAMES_CONFIG.findIndex(g => g.id === game.id);
      const unlockLevel = gameIndex === 0 ? 0 : gameIndex * 5 + 1;

      const currentLevel = playerRef.current.level;

      // Quest path slots bypass the lobby level lock — they are unlocked via the quest only.
      if (!fromQuest && currentLevel < unlockLevel) {
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
          grid,
          holdWinActive: holdWinRef.current.active,
          holdWinLockedGrid: holdWinRef.current.lockedGrid,
          holdWinCoinValues: holdWinRef.current.coinValues,
          holdWinJpGrid: holdWinRef.current.jpGrid,
          holdWinRespins: holdWinRef.current.respins,
          pirateWalkActive: pirateWalkRef.current.active,
          pirateShipCol: pirateWalkRef.current.shipCol,
          pirateShip2Col: pirateWalkRef.current.ship2Col,
          pirateWalkTotalWin: pirateWalkTotalWinRef.current,
      };
      setSavedGameStates(prev => ({ ...prev, [selectedGame.id]: currentState }));

      // Show loading screen immediately, then set up the game
      // Preload slot music during the loading screen so it's ready when the game opens
      audioService.playSlotMusic(game.theme);
      setGameLoadingConfig(game);
      setTimeout(() => {
          setSelectedGame(game);
          // Generate slot quest missions when entering a new slot
          setSlotQuestState(prev => {
              const activePath = prev.pathSlotIds[prev.currentPathIndex];
              if (game.id === activePath && (!prev.missions || prev.missions.length === 0 || prev.missions[0].id.split('_')[0] !== game.id)) {
                  const newMissions = makeSlotMissions(game.id, currentBetRef.current, prev.currentPathIndex, player.level);
                  const next = { ...prev, missions: newMissions };
                  try { localStorage.setItem('cw_slot_quest', JSON.stringify(next)); } catch {}
                  return next;
              }
              return prev;
          });
          // Reset Mystery feature overlay when switching games.
          mysteryCellsRef.current = [];
          setMysteryCells([]);
          setMysteryRevealed(false);
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
          setLastWinAmount(null); // fresh slot → show "LET'S SPIN!" until first spin
          // Always stop auto spin on slot change
          setPlayer(p => ({ ...p, autoSpin: false }));
          setAutoSpinRemaining(-1);
          // Cancel any pending roulette timer and close roulette/win popups on game change
          if (neonRouletteTimerRef.current) { clearTimeout(neonRouletteTimerRef.current); neonRouletteTimerRef.current = null; }
          setShowNeonRoulette(false);
          setShowWinPopup(false);
          // Reset Ghost Ship walking-wilds state on game change
          pirateWalkRef.current = { active: false, shipCol: -1, ship2Col: -1 };
          pirateTriggerArmedRef.current = false;
          pirateDualShipRef.current = false;
          pirateWalkTotalWinRef.current = 0;
          pirateJpTierRef.current = null;
          setPirateWalkActive(false);
          setPirateShipCol(-1);
          setPirateShip2Col(-1);
          setPirateWalkTotalWin(0);
          // Reset Supernova multiplier on game change
          spaceFsMultRef.current = 1;
          setSpaceMultiplier(1);
          // Reset Candy Wild Wheel state on game change
          setShowSpinCountRoulette(false);
          setShowCandyRoulette(false);
          candyWildConfigRef.current = null;
          candyPendingColsRef.current = [];
          candySingleWildsRef.current = [];
          candyCommitCountRef.current = 0;
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
              if (savedState.holdWinActive) {
                  holdWinRef.current = {
                      active: true,
                      lockedGrid: savedState.holdWinLockedGrid ?? [],
                      coinValues: savedState.holdWinCoinValues ?? [],
                      jpGrid: savedState.holdWinJpGrid ?? [],
                      respins: savedState.holdWinRespins ?? 3,
                  };
                  setHoldWinActive(true);
                  setHoldWinLockedGrid(savedState.holdWinLockedGrid ?? []);
                  setHoldWinCoinValues(savedState.holdWinCoinValues ?? []);
                  setHoldWinJpGrid(savedState.holdWinJpGrid ?? []);
                  setHoldWinRespins(savedState.holdWinRespins ?? 3);
              }
              if (savedState.pirateWalkActive) {
                  pirateWalkRef.current = {
                      active: true,
                      shipCol: savedState.pirateShipCol ?? -1,
                      ship2Col: savedState.pirateShip2Col ?? -1,
                  };
                  pirateWalkTotalWinRef.current = savedState.pirateWalkTotalWin ?? 0;
                  setPirateWalkActive(true);
                  setPirateShipCol(savedState.pirateShipCol ?? -1);
                  setPirateShip2Col(savedState.pirateShip2Col ?? -1);
                  setPirateWalkTotalWin(savedState.pirateWalkTotalWin ?? 0);
              }
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
      savedAutoSpinRef.current = { active: player.autoSpin, remaining: autoSpinRemainingRef.current };
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
  const handleSpinCountComplete = (count: number) => {
      setFreeSpinsWon(count);
      setTotalFreeSpins(prev => prev + count);
      setShowSpinCountRoulette(false);
      setShowCandyRoulette(true);
  };

  const handleCandyRouletteComplete = (cfg: CandyWildConfig) => {
      candyWildConfigRef.current = cfg;
      candyCommitCountRef.current = 0;
      setCandyConfig(cfg);
      setShowCandyRoulette(false);
      // Normal → Free Spins transition (mirrors handleStartFreeSpins)
      savedAutoSpinRef.current = { active: player.autoSpin, remaining: autoSpinRemainingRef.current };
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
      trackSlotQuest('BONUS_TRIGGER', 1);
      const currentBet = availableBets[betIndex];
      const latestTotalWin = freeSpinTotalWinRef.current;
      const tier = latestTotalWin > 0 ? (getWinTier(latestTotalWin, currentBet) || 'BIG WIN') : null;

      // Resume the normal-spin autospin that was running before free spins triggered,
      // instead of forcing the player to re-enable it manually.
      const resumeAuto = savedAutoSpinRef.current.active;
      if (resumeAuto) {
          autoSpinRemainingRef.current = savedAutoSpinRef.current.remaining;
          setAutoSpinRemaining(savedAutoSpinRef.current.remaining);
          setPlayer(p => ({ ...p, autoSpin: true }));
      } else {
          setPlayer(p => ({ ...p, autoSpin: false }));
          setAutoSpinRemaining(-1);
      }
      savedAutoSpinRef.current = { active: false, remaining: -1 };

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
      candyCommitCountRef.current = 0;
      setCandyCols([]);
      setCandySingleWilds([]);
      setCandyConfig(null);
      // Hard-reset pirate walk so Ghost Ship state never bleeds into normal spins
      pirateWalkRef.current = { active: false, shipCol: -1, ship2Col: -1 };
      pirateTriggerArmedRef.current = false;
      pirateDualShipRef.current = false;
      pirateWalkTotalWinRef.current = 0;
      pirateJpTierRef.current = null;
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
                      audioService.playWinTier(tier);
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
                  trackSlotQuest('BONUS_TRIGGER', 1);
                  const won = pirateWalkTotalWinRef.current;
                  if (freeSpinsRemaining === 0) {
                      setTimeout(() => {
                          setCelebrationMsg(won > 0 ? `+${formatCommaNumber(won)}` : 'The Ghost Ship sailed away…');
                          if (won > 0) audioService.playWinBig();
                      }, 250);
                  }
                  // DO NOT call spin() here — the IDLE effect re-runs after pirateWalkActive flips false
                  // and will correctly show the free-spin summary (freeSpinsWon > 0) or auto-spin.
              } else if (activeModal === 'NONE' && !jackpotWinTier) {
                  pirateWalkRef.current.shipCol -= 1;
                  setPirateShipCol(pirateWalkRef.current.shipCol);

                  // Jackpot chance per column during free spins (rarest checked first so only one wins)
                  if (freeSpinsWon > 0) {
                      const jpAmts = jackpotService.getAmounts();
                      const JP_WALK = [
                          { name: 'GRAND', chance: 0.0005, idx: 4, color: '#fde68a', icon: '' },
                          { name: 'MEGA',  chance: 0.0015, idx: 3, color: '#fda4af', icon: '' },
                          { name: 'MAJOR', chance: 0.005,  idx: 2, color: '#d8b4fe', icon: '' },
                          { name: 'MINOR', chance: 0.015,  idx: 1, color: '#67e8f9', icon: '' },
                          { name: 'MINI',  chance: 0.03,   idx: 0, color: '#4ade80', icon: '' },
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
              if (activeModal === 'NONE' && !showFreeSpinsPopup && !showArcticPickModal && !pendingArcticFreePick && !jackpotWinTier) setTimeout(() => spin(), delay);
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
  }, [status, reelTransitioning, holdWinActive, pirateWalkActive, freeSpinsRemaining, player.autoSpin, freeSpinsWon, spin, fastSpin, activeModal, showFreeSpinsPopup, showFreeSpinSummary, jackpotWinTier, pendingArcticFreePick, showArcticPickModal]);

  const handleHeaderBack = () => {
    if (showCandyRoulette || showSpinCountRoulette) {
        // Bonus roulettes must resolve — ignore back to avoid losing the awarded free spins.
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
                grid,
                holdWinActive: holdWinRef.current.active,
                holdWinLockedGrid: holdWinRef.current.lockedGrid,
                holdWinCoinValues: holdWinRef.current.coinValues,
                holdWinJpGrid: holdWinRef.current.jpGrid,
                holdWinRespins: holdWinRef.current.respins,
                pirateWalkActive: pirateWalkRef.current.active,
                pirateShipCol: pirateWalkRef.current.shipCol,
                pirateShip2Col: pirateWalkRef.current.ship2Col,
                pirateWalkTotalWin: pirateWalkTotalWinRef.current,
            }
        }));
        setPlayer(p => ({ ...p, autoSpin: false }));
        setCurrentView('LOBBY');
    }
  };
  
  // Buffs granted alongside a coin/gem purchase, scaled by purchase tier (1–3).
  const PURCHASE_BUFFS = [
      null,
      { collectDays: 1, xpDays: 1, arenaDays: 1, dice: 2,  picks: 2,  packs: 2 },
      { collectDays: 3, xpDays: 2, arenaDays: 2, dice: 5,  picks: 5,  packs: 5 },
      { collectDays: 7, xpDays: 3, arenaDays: 3, dice: 10, picks: 10, packs: 10 },
  ];
  const purchaseTier = (cost?: number, gemAmount?: number): number => {
      if (gemAmount) return gemAmount >= 2500 ? 3 : gemAmount >= 500 ? 2 : 1;
      if (cost) return cost >= 499 ? 3 : cost >= 199 ? 2 : 1;
      return 1;
  };
  const grantPurchaseBuffs = (tier: number) => {
      const b = PURCHASE_BUFFS[tier];
      if (!b) return;
      const DAY = 86_400_000;
      const now = Date.now();
      setPlayer(p => ({
          ...p,
          collectBoostEndTime: Math.max(now, p.collectBoostEndTime || 0) + b.collectDays * DAY,
          xpMultiplier: 2, xpBoostEndTime: Math.max(now, p.xpBoostEndTime || 0) + b.xpDays * DAY,
          arenaXpMultiplier: 2, arenaXpBoostEndTime: Math.max(now, p.arenaXpBoostEndTime || 0) + b.arenaDays * DAY,
          packCredits: p.packCredits + b.packs,
      }));
      setQuest(q => ({ ...q, diceCredits: Math.min(60, q.diceCredits + b.dice), wildCredits: Math.min(60, q.wildCredits + b.picks) }));
  };

  const handleShopBuy = (type: 'COIN' | 'BOOST' | 'DIAMOND' | 'PASS_XP' | 'PACK_CREDIT' | 'COLLECT_BOOST' | 'ARENA_XP' | 'VIP_XP_BOOST', amount: number, duration?: number, cost?: number) => {
      if (cost) {
          if (type === 'BOOST' || type === 'PASS_XP' || type === 'PACK_CREDIT' || type === 'COLLECT_BOOST' || type === 'ARENA_XP' || type === 'VIP_XP_BOOST') {
             if (player.diamonds >= cost) {
                 setPlayer(p => ({...p, diamonds: p.diamonds - cost}));
                 if (type === 'BOOST') setPlayer(p => ({ ...p, xpMultiplier: 2, xpBoostEndTime: Math.max(Date.now(), p.xpBoostEndTime) + (duration || 0) }));
                 if (type === 'PASS_XP') setMissionState(prev => ({ ...prev, passBoostMultiplier: amount, passBoostEndTime: Date.now() + (duration || 0) }));
                 if (type === 'COLLECT_BOOST') setPlayer(p => ({ ...p, collectBoostEndTime: Math.max(Date.now(), p.collectBoostEndTime || 0) + (duration || 0) }));
                 if (type === 'ARENA_XP') setPlayer(p => ({ ...p, arenaXpMultiplier: amount, arenaXpBoostEndTime: Math.max(Date.now(), p.arenaXpBoostEndTime || 0) + (duration || 0) }));
                 if (type === 'VIP_XP_BOOST') setPlayer(p => ({ ...p, vipXpBoostMultiplier: amount, vipXpBoostEndTime: Math.max(Date.now(), p.vipXpBoostEndTime || 0) + (duration || 0) }));
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
          triggerCoinAnim(amount);
          setCelebrationMsg(`+${formatCommaNumber(amount)} Coins`);
          audioService.playWinBig();
          // Paid coin packs (cost > 0) also grant bonus buffs.
          if (cost && cost > 0) grantPurchaseBuffs(purchaseTier(cost));
      } else if (type === 'DIAMOND') {
          setPlayer(p => ({ ...p, diamonds: p.diamonds + amount }));
          setCelebrationMsg(`+${amount} Gems`);
          audioService.playWinBig();
          grantPurchaseBuffs(purchaseTier(undefined, amount));
      }
  };

  const handlePay = (productId: string, itemType: 'COIN' | 'DIAMOND', itemAmount: number, icon: string, label: string) => {
      setPaymentItem({ productId, itemType, itemAmount, icon, label });
  };

  const handlePaymentSuccess = (item: PaymentItem) => {
      setPaymentItem(null);
      // Optimistically credit — webhook will also fire but the DB unique constraint
      // on stripe_payment_intent_id prevents double-credit.
      if (item.itemType === 'COIN') {
          setPlayer(p => ({ ...p, balance: p.balance + item.itemAmount }));
          triggerCoinAnim(item.itemAmount);
          setCelebrationMsg(`+${formatCommaNumber(item.itemAmount)} Coins!`);
      } else {
          setPlayer(p => ({ ...p, diamonds: p.diamonds + item.itemAmount }));
          setCelebrationMsg(`+${item.itemAmount} Gems!`);
      }
      // Bonus buffs scaled by pack tier (parsed from productId, e.g. coin_5 / gem_3).
      const packNum = parseInt((item.productId.split('_')[1] || '1'), 10) || 1;
      const tier = item.itemType === 'DIAMOND'
          ? (item.itemAmount >= 2500 ? 3 : item.itemAmount >= 500 ? 2 : 1)
          : (packNum >= 5 ? 3 : packNum >= 3 ? 2 : 1);
      grantPurchaseBuffs(tier);
      audioService.playWinBig();
  };

  const handleClaimShopItem = (label: string) => {
      setPlayer(p => ({ ...p, shopClaimedItems: [...(p.shopClaimedItems || []), label] }));
  };

  const handleSpinPointerDown = (e: React.PointerEvent) => {
      e.preventDefault(); // prevent scroll / synthetic mouse events on touch
      if (pirateWalkRef.current.active) return;
      if (freeSpinsRemaining > 0) return;
      isLongPressRef.current = false;
      spinButtonTimeoutRef.current = setTimeout(() => {
          isLongPressRef.current = true;
          audioService.playClick();
          setShowAutoSpinPopup(true);
      }, 800);
  };
  const handleSpinPointerUp = (e: React.PointerEvent) => {
      e.preventDefault();
      if (spinButtonTimeoutRef.current) {
          clearTimeout(spinButtonTimeoutRef.current);
          spinButtonTimeoutRef.current = null;
      }
      if (isLongPressRef.current) return;
      if (pirateWalkRef.current.active) return;
      if (freeSpinsRemaining > 0) {
          if (status === GameStatus.SPINNING) {
              setInstantStop(true);
              setStatus(GameStatus.STOPPING);
              audioService.playClick();
          }
          return;
      }
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

  const showGoldHeader = (!!player.isVip && currentView === 'LOBBY') || currentView === 'HIGH_LIMIT' || (currentView === 'GAME' && isHighLimit);
  const freeCoinsAvailable = (Date.now() - (player.freeStashClaimedTime || 0)) > 86400000;
  const freeCoinsAmount = Math.floor(MAX_BET_BY_LEVEL(player.level) * 0.3);

  if (!appReady) {
      return (
          <div className="bg-[#0a0015] flex items-center justify-center overflow-hidden" style={{ position: 'fixed', inset: 0 }}>
              <div style={{ width: 844, height: 390, transform: `scale(${mobileScale.x}, ${mobileScale.y})`, transformOrigin: 'center center', position: 'relative', overflow: 'hidden', backgroundImage: 'url(/initialload_bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  <div style={{ position: 'absolute', bottom: '13%', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 220, height: 16, borderRadius: 9999, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden', position: 'relative' }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${loadProgress}%`, background: 'linear-gradient(180deg,#7fd0ff,#2b8fe8 60%,#1565b0)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5)', transition: 'width 0.2s ease', borderRadius: 9999 }} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.9)', lineHeight: 1 }}>{loadProgress}%</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div
      className="bg-[#0a0015] flex items-center justify-center overflow-hidden"
      style={{ position: 'fixed', inset: 0 }}
    >
      <div className="relative overflow-hidden rounded-none shadow-[0_0_80px_rgba(0,0,0,0.52)] bg-[#120024]"
        onClick={(e) => {
          if (showXpPopup) setShowXpPopup(false);
          if (showCollectPopup) setShowCollectPopup(false);
          // Ripple only when clicking the slot background (GAME view), never on interactive
          // elements or the reels themselves. Colour is a solid per-theme tint.
          const target = e.target as HTMLElement;
          const tag = target.tagName;
          const onSlotBg = currentView === 'GAME' && !!target.closest('[data-slot-bg="true"]') && !target.closest('[data-no-ripple="true"]');
          if (onSlotBg && tag !== 'BUTTON' && tag !== 'INPUT' && tag !== 'IMG') {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const scaleX = rect.width / 844;
            const scaleY = rect.height / 390;
            const x = (e.clientX - rect.left) / scaleX;
            const y = (e.clientY - rect.top) / scaleY;
            const color = rippleColorFor(selectedGame.theme);
            const id = ++rippleIdRef.current;
            setRipples(r => [...r, {id,x,y,color}]);
            audioService.playClick();
            setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 560);
          }
        }}
        style={{ width: 844, height: 390, transform: `scale(${mobileScale.x}, ${mobileScale.y})`, transformOrigin: 'center center' }}>
        <div className={`w-full h-full bg-casino-bg text-white font-body overflow-hidden flex flex-col ${selectedGame.bgImage}`}
          style={currentView === 'GAME' && selectedGame.slotBg ? { backgroundImage: `url(${selectedGame.slotBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : undefined}>
          <header className="w-full z-[100] flex justify-between items-center h-[29px] md:h-[35px] select-none overflow-visible shrink-0"
            style={showGoldHeader ?
              { background:'linear-gradient(180deg,#ffe24d 0%,#ffb31a 50%,#f57c00 100%)', borderBottom:'none', boxShadow:'inset 0 2px 6px rgba(0,0,0,0.6)' } :
              { background:'linear-gradient(180deg,#380870 0%,#6018a8 30%,#8028c8 55%,#a018d4 82%,#c510e0 100%)', borderBottom:'none', boxShadow:'inset 0 2px 6px rgba(0,0,0,0.6)' }}>
            {/* Bar B (Replicated from mockup - stats, lobby home, multipliers, mute) */}
            <div className="barB bar font-nunito w-full h-full flex items-center gap-1 md:gap-1.5 rounded-none p-1.5 px-1.5 md:px-3 relative" style={{ borderTop:'none', ...(showGoldHeader ? { background:'linear-gradient(180deg,#ffe24d 0%,#ffb31a 50%,#f57c00 100%)', borderColor:'#8b6200' } : {}) }}>

                {/* LEFT ZONE — Avatar + Coins + Gems */}
                <div className="flex items-center gap-1 md:gap-1.5 flex-1 min-w-0">
                    {/* Lobby Home Button */}
                    <div
                        onClick={currentView !== 'LOBBY' ? handleHeaderBack : () => setShowProfile(true)}
                        className="round-btn shrink-0 cursor-pointer"
                        style={{
                            ...(currentView === 'LOBBY' && profileEmoji?.startsWith('/Profile_pic')
                                ? { width: 32, height: 32, padding: 0, overflow: 'hidden', boxShadow: `inset 0 0 0 2px rgba(255,255,255,0.55), 0 0 0 2px ${player.isVip ? '#fbbf24' : '#a855f7'}, 0 1px 3px rgba(0,0,0,0.5)` }
                                : {}),
                            ...(showGoldHeader ? { background:'linear-gradient(180deg,#ffec70 0%,#ffbe2a 50%,#ff8c12 100%)', boxShadow:'0 2px 0 #5a3800' } : {}),
                        }}
                    >
                        {currentView !== 'LOBBY'
                            ? <i className="ti ti-arrow-left"></i>
                            : (profileEmoji?.startsWith('/Profile_pic')
                                ? <img src={profileEmoji} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                : <i className="ti ti-user" />)
                        }
                    </div>

                    {/* Coins + Gems pills */}
                    <div className="flex items-center gap-[3px] md:gap-1.5 min-w-0 flex-1">
                        <div className="currency-pill flex items-center gap-1 flex-1" style={{ overflow: 'visible', minWidth: '130px', maxWidth: 'none', ...(coinAnimating ? { boxShadow: '0 0 10px 2px rgba(255,220,0,0.6)', transition: 'box-shadow 0.2s' } : {}) }}>
                            <img src="/new_coinicon.png" alt="" style={{ width: 30, height: 30, objectFit: 'contain', flexShrink: 0, marginLeft: '-6px' }} />
                            <span className="num flex-1" style={{ paddingRight: '4px' }}>{formatK(animBalance !== null ? animBalance : player.balance)}</span>
                        </div>
                        <div className="currency-pill flex items-center gap-1 shrink-0" style={{ overflow: 'visible', minWidth: '72px', maxWidth: '110px' }}>
                            <img src="/symbols/diamond.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0, marginLeft: '-6px' }} />
                            <span className="num flex-1" style={{ paddingRight: '4px' }}>{formatK(player.diamonds)}</span>
                        </div>
                    </div>
                </div>

                {/* CENTER ZONE — Buy & Sale (persistent margins via header gap) */}
                <div className="flex items-center gap-1 shrink-0 z-10">
                    <div onClick={() => openShop('COINS')} className="btn green buyB shrink-0">
                        <div className="face text-center" style={{ overflow: 'hidden' }}>
                            <div className="absolute inset-y-0 w-8 bg-white/25 skew-x-[-20deg] animate-btn-shine pointer-events-none" style={{ zIndex: 2 }} />
                            <span className="lbl">BUY</span>
                        </div>
                    </div>
                    <div onClick={() => setShowPremiumModal(true)} className="btn pink saleB shrink-0">
                        <div className="face text-center" style={{ overflow: 'hidden' }}>
                            <div className="absolute inset-y-0 w-8 bg-white/25 skew-x-[-20deg] animate-btn-shine pointer-events-none" style={{ zIndex: 2, animationDelay: '1.5s' }} />
                            <span className="lbl">SALE</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT ZONE — Piggy + Level + XP + Settings + Events */}
                <div className="flex items-center gap-1 flex-1 min-w-0">
                    <div className="relative shrink-0" style={{ width: 34, height: 34 }} onClick={handleOpenPiggyBank}>
                        <img src="/ui/piggy.png" alt=""
                            style={{ width: 34, height: 34, objectFit: 'contain', cursor: 'pointer' }}
                            className={`active:scale-90 transition-transform ${piggyShaking ? 'animate-piggy-shake' : ''}`} />
                        {player.level >= 10 && player.piggyBank >= Math.floor(MAX_BET_BY_LEVEL(player.level) * 5 * (1 + EVENT_PIGGY_BOOST)) && (
                            <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                                style={{ bottom: 2, background: '#e01c1c', borderRadius: 6, padding: '1px 5px', fontSize: 7, fontWeight: 900, color: '#fff', letterSpacing: '0.06em', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                                FULL
                            </div>
                        )}
                    </div>

                    {/* Level Pill + Multiplier + XP popup */}
                    <div className="relative flex items-center gap-1 flex-1" style={{ minWidth: 95 }}>
                        {/* Level Pill */}
                        <div className="rtrack flex-1" onClick={() => setShowXpPopup(v => !v)} style={{ justifyContent: 'flex-start', gap: 4, paddingLeft: 2, paddingRight: 6, overflow: 'visible', maxWidth: 'none', cursor: 'pointer' }}>
                            <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 18, pointerEvents: 'none' }}>
                                {(() => {
                                    const xpBoostOn = (player.xpMultiplier || 1) > 1 && (player.xpBoostEndTime || 0) > Date.now();
                                    const pct = Math.min(100, (player.xp / player.xpToNextLevel) * 100);
                                    return <>
                                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 12, width: `${pct}%`, background: xpBoostOn ? 'linear-gradient(180deg,#ffe066,#e8a800 60%,#b07000)' : 'linear-gradient(180deg,#7fd0ff,#2b8fe8 60%,#1565b0)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)', transition: 'width 0.4s ease', overflow: 'hidden' }}>
                                            {/* Shine sweep */}
                                            <div className="absolute inset-y-0 w-5 bg-white/50 skew-x-[-20deg] animate-xp-bar-shine pointer-events-none" />
                                        </div>
                                    </>;
                                })()}
                            </div>
                            <img src="/topbar_levelstar.png" alt="" style={{ flexShrink: 0, width: 32, height: 32, objectFit: 'contain', position: 'relative', zIndex: 1, marginLeft: '-6px' }} />
                            <span className="rnum font-black" style={{ fontSize: '13px', letterSpacing: '0.02em', flex: 1, textAlign: 'center' }}>
                                {showXpPct ? `${Math.floor((player.xp / player.xpToNextLevel) * 100)}%` : `LV.${player.level}`}
                            </span>
                        </div>

                        {/* Collect multiplier indicator */}
                        <div className="relative shrink-0 flex items-center justify-center" onClick={() => setShowCollectPopup(v => !v)} style={{ width: 42, height: 42, cursor: 'pointer' }}>
                            <img src="/ui/exp_multiplier.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                            <span style={{ position: 'relative', zIndex: 1, fontSize: 13, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 1px 3px rgba(0,0,0,1)', marginTop: '-3px' }}>
                                {treasuryMultiplier}X
                            </span>
                        </div>

                        {/* Collect multiplier popup */}
                        {showCollectPopup && (() => {
                            const cbRemMs = Math.max(0, (player.collectBoostEndTime || 0) - Date.now());
                            const cbH = Math.floor(cbRemMs / 3600000);
                            const cbM = Math.floor((cbRemMs % 3600000) / 60000);
                            const curIdx = TREASURY_MULT_TIERS.reduce((best, t, i) => treasuryMultProgress >= t.at ? i : best, 0);
                            const curTier = TREASURY_MULT_TIERS[curIdx];
                            const nextTier = TREASURY_MULT_TIERS[curIdx + 1];
                            const collectPct = nextTier
                                ? Math.min(100, ((treasuryMultProgress - curTier.at) / (nextTier.at - curTier.at)) * 100)
                                : 100;
                            const nextMult = nextTier ? nextTier.mult : null;
                            const barColor = collectBoostActive
                                ? 'linear-gradient(180deg,#fbbf24,#d97706 60%,#b45309)'
                                : 'linear-gradient(180deg,#c084fc,#9333ea 60%,#6b21a8)';
                            return (
                                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 240, zIndex: 200, background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', borderRadius: 14, boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 24px rgba(0,0,0,0.8)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}
                                    onClick={e => e.stopPropagation()}>
                                    {/* Title */}
                                    <span style={{ color: 'white', fontSize: 12, fontWeight: 900 }}>Collect Boost</span>
                                    {/* Progress pill — two icons flanking the bar */}
                                    <div className="flex items-center gap-2">
                                        {/* Current multiplier icon */}
                                        <div className="relative flex items-center justify-center shrink-0" style={{ width: 36, height: 36 }}>
                                            <img src="/ui/exp_multiplier.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                                            <span style={{ position: 'relative', zIndex: 1, fontSize: 11, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 1px 3px rgba(0,0,0,1)', marginTop: '-2px' }}>{treasuryMultiplier}X</span>
                                        </div>
                                        {/* Bar */}
                                        <div className="flex-1 relative" style={{ height: 10, borderRadius: 8, background: 'rgba(0,0,0,0.35)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${collectPct}%`, background: barColor, borderRadius: 8, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)', transition: 'width 0.4s ease', overflow: 'hidden' }}>
                                                <div className="absolute inset-y-0 w-3 bg-white/40 skew-x-[-20deg] animate-xp-bar-shine pointer-events-none" />
                                            </div>
                                        </div>
                                        {/* Next multiplier icon */}
                                        <div className="relative flex items-center justify-center shrink-0" style={{ width: 36, height: 36, opacity: nextMult ? 1 : 0.5 }}>
                                            <img src="/ui/exp_multiplier.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.55 }} />
                                            <span style={{ position: 'relative', zIndex: 1, fontSize: 11, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 1px 3px rgba(0,0,0,1)', marginTop: '-2px' }}>{nextMult ? `${nextMult}X` : 'MAX'}</span>
                                        </div>
                                    </div>
                                    {(player.isVip || collectBoostActive) && <div style={{ height: 1, background: 'rgba(255,255,255,0.12)' }} />}
                                    {/* VIP boost row — only when VIP */}
                                    {player.isVip && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <i className="ti ti-crown" style={{ fontSize: 11, color: '#ffe066' }} />
                                                <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>VIP · faster progress</span>
                                            </div>
                                            <span style={{ color: '#ffe066', fontSize: 10, fontWeight: 900 }}>1.5× spins</span>
                                        </div>
                                    )}
                                    {/* Store collect boost row — only when active */}
                                    {collectBoostActive && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <i className="ti ti-bolt" style={{ fontSize: 11, color: '#a78bfa' }} />
                                                <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>Store Boost · {cbH}h {cbM}m</span>
                                            </div>
                                            <span style={{ color: '#a78bfa', fontSize: 10, fontWeight: 900 }}>+1× spins</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* XP details popup */}
                        {showXpPopup && (() => {
                            const boostActive = (player.xpMultiplier || 1) > 1 && (player.xpBoostEndTime || 0) > Date.now();
                            const rem = boostActive ? Math.max(0, (player.xpBoostEndTime || 0) - Date.now()) : 0;
                            const remH = Math.floor(rem / 3600000);
                            const remM = Math.floor((rem % 3600000) / 60000);
                            const vipBonusPct = player.isVip ? Math.round((player.vipLevel || 1) * 10) : 0;
                            const nextLevel = player.level + 1;
                            const nextReward = Math.floor(MAX_BET_BY_LEVEL(nextLevel) * (nextLevel % 5 === 0 ? 0.2 : 0.05));
                            return (
                                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 200, background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', borderRadius: 14, boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 24px rgba(0,0,0,0.8)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}
                                    onClick={e => e.stopPropagation()}>
                                    {/* Header — current level + XP numbers (no bar / % ) */}
                                    <div className="flex items-center justify-between">
                                        <span style={{ color: 'white', fontSize: 12, fontWeight: 900, letterSpacing: '0.04em' }}>Level {player.level}</span>
                                        <span style={{ color: '#d6b8ff', fontSize: 10, fontWeight: 700 }}>{player.xp.toLocaleString()} / {player.xpToNextLevel.toLocaleString()} XP</span>
                                    </div>

                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', marginLeft: 2, marginRight: 2 }} />

                                    {/* Next level reward */}
                                    <div className="flex items-center justify-between">
                                        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: 700 }}>Next Reward · Lv.{nextLevel}</span>
                                        <span className="flex items-center gap-1" style={{ color: '#ffe066', fontSize: 11, fontWeight: 900 }}>
                                            <img src="/new_coinicon.png" alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                                            {formatK(nextReward)}
                                        </span>
                                    </div>

                                    {/* 2X EXP boost with timer */}
                                    {boostActive && (
                                        <div className="flex items-center justify-between">
                                            <span style={{ color: '#86efac', fontSize: 10, fontWeight: 700 }}>
                                                {player.xpMultiplier}X EXP Boost
                                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, marginLeft: 4 }}>{String(remH).padStart(2,'0')}:{String(remM).padStart(2,'0')} left</span>
                                            </span>
                                            <span style={{ color: '#86efac', fontSize: 11, fontWeight: 900 }}>×{player.xpMultiplier}</span>
                                        </div>
                                    )}

                                    {/* VIP EXP boost percentage */}
                                    {player.isVip && (
                                        <div className="flex items-center justify-between">
                                            <span style={{ color: '#fcd34d', fontSize: 10, fontWeight: 700 }}>VIP Lv.{player.vipLevel || 1} EXP Boost</span>
                                            <span style={{ color: '#fcd34d', fontSize: 11, fontWeight: 900 }}>+{vipBonusPct}%</span>
                                        </div>
                                    )}

                                    {/* Event EXP boost — always-on */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <i className="ti ti-calendar" style={{ fontSize: 11, color: '#f87171' }} />
                                            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: 700 }}>Events Boost</span>
                                        </div>
                                        <span style={{ color: '#f87171', fontSize: 11, fontWeight: 900 }}>+20%</span>
                                    </div>

                                    {/* Speed-up CTA when no boost is running */}
                                    {!boostActive && (
                                        <button onClick={() => { setShowXpPopup(false); openShop('BOOSTS'); }}
                                            className="pill-green w-full mt-0.5">
                                            <div className="pill-face" style={{ padding: '7px 12px', fontSize: '11px' }}>Speed Up</div>
                                        </button>
                                    )}
                                </div>
                            );
                        })()}</div>

                    {/* Events pill — matches topbar currency pills; shine kept, glow removed */}
                    <button onClick={() => setShowEventsPopup(true)} className="shrink-0 cursor-pointer active:scale-95 transition-transform flex items-center justify-center rounded-full px-3 h-6 md:h-7 relative"
                        style={{ background: 'linear-gradient(180deg,#b91c1c,#7f1d1d,#450a0a)', border: '1px solid #38106e' }}>
                        <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none" style={{ zIndex: 1 }}>
                            <div className="absolute inset-y-0 w-4 bg-white/25 skew-x-[-20deg] animate-event-shine pointer-events-none" />
                        </div>
                        <span className="font-tanker tracking-wide relative" style={{ fontSize: 16, lineHeight: 1, color: '#ffffff', zIndex: 2 }}>Events</span>
                    </button>

                    {/* Settings button — far right */}
                    <div
                        onClick={() => showNeonRoulette ? handleNeonRouletteClose() : setShowSettings(true)}
                        className="round-btn shrink-0 cursor-pointer"
                        style={showGoldHeader ? { background:'linear-gradient(180deg,#ffec70 0%,#ffbe2a 50%,#ff8c12 100%)', boxShadow:'0 2px 0 #5a3800' } : {}}
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
                onOpenMine={handleWildQuestClaim}
                onOpenDice={handleDiceQuestClaim}
                onOpenQuestPath={() => setShowQuestPath(true)}
                onOpenMissions={openMissionsModal}
                onOpenBattlePass={openBattlePassModal}
                onClaimBonus={handleOpenTimeBonus}
                onOpenCollection={() => openModal('COLLECTION')}
                onOpenPiggyBank={handleOpenPiggyBank}
                onOpenRanking={() => setShowLeaderboard(true)}
                onOpenInbox={() => setShowInbox(true)}
                inboxCount={inbox.filter((m: any) => !m.claimed).length}
                onOpenHighRoller={handleOpenHighRoller}
                onOpenVipLounge={() => setShowVipLounge(true)}
                onOpenArena={() => setShowArena(true)}
                arena={arenaUnlocked ? arenaState : undefined}
                arenaPlayerName={playerName}
                arenaPlayerAvatar={profileEmoji}
                arenaMaxBet={MAX_BET_BY_LEVEL(player.level)}
                onOpenFriends={() => setShowFriends(true)}
                friends={friendsState.friends}
                friendRequestCount={incomingFriendRequests.length}
                onOpenLoginRewards={() => openModal('LOGIN_BONUS')}
                loginRewardReady={!loginState.claimedToday}
                onOpenGuild={() => setCelebrationMsg('Guild — Coming Soon!')}
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
                isJackpotReady={(Date.now() - (player.jackpotRouletteLastTime ?? 0)) >= 3 * 60 * 60 * 1000}
                questPathCurrentIndex={slotQuestState.currentPathIndex}
                newSlotIds={newSlotIds}
                bonusTimers={bonusTimers}
            />
        ) : (
            <div data-slot-bg="true" className="flex-1 flex flex-col items-center justify-start p-0 m-0 relative h-full pb-[56px] md:pb-[64px] max-w-3xl mx-auto w-full select-none min-h-0 gap-0">

                {/* Quest + Pass vertical panel — always visible in game view */}
                {(() => {
                    const qReady = false;
                    const passReady = missionState.passRewards.filter((r: any) => r.level <= missionState.passLevel && !r.claimed && (r.tier === 'FREE' || missionState.isPremium)).length;
                    const totalNotifs = passReady;
                    const isQuestLocked = player.level < 20;
                    const isPassLocked = player.level < 10;
                    const missReady = missionState.activeMissions.filter((m: any) => m.completed && !m.claimed).length;
                    const albumReady = decks.filter((d: any) => d.isCompleted && !d.rewardClaimed).length;
                    const pillStyle = { width:'100%', textAlign:'center' as const, fontSize:8, fontWeight:900, background:'linear-gradient(180deg,#a0f040,#4ab800)', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.5),0 2px 0 #1a6000', color:'#0a3000', borderRadius:8, padding:'2px 0', textShadow:'0 1px 0 rgba(255,255,255,0.3)', marginTop:'-6px' };
                    return (
                        <div className="absolute left-1 z-40 flex flex-col gap-1 items-center select-none"
                            style={{ background: isHighLimit ? 'linear-gradient(180deg,rgba(201,144,26,0.92),rgba(122,80,0,0.92))' : 'linear-gradient(180deg,rgba(124,63,181,0.92),rgba(74,24,128,0.92))', borderRadius:'21px', padding:'6px 6px 8px', boxShadow:'0 4px 14px rgba(0,0,0,0.5),inset 0 1px 1px rgba(255,255,255,0.18)', width:'66px', top:'38%', transform:'translateY(-38%)' }}>
                            {(() => {
                                const questInProgress = slotQuestState.currentPathIndex < QUEST_PATH_IDS.length;
                                const passBtn = (
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
                                );
                                return sidebarPage === 0 ? (<>
                                    {/* Slot 1: Quest when in progress, else Pass */}
                                    {questInProgress ? (
                                        <button onClick={() => setShowQuestPath(true)} className="relative flex flex-col items-center active:scale-95 transition-transform">
                                            <img src="/questlobbyicon.png" alt="" style={{ width: 54, height: 54, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                                            {(() => {
                                                const ms = slotQuestState.missions;
                                                const pct = ms.length > 0 ? Math.min(100, ms.reduce((s, m) => s + (m.target > 0 ? Math.min(1, m.current / m.target) : 0), 0) / ms.length * 100) : 0;
                                                return (
                                                    <div className="rtrack" style={{ height: 14, width: 48, marginTop: -3, padding: '0 3px', minWidth: 0 }}>
                                                        <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 18, pointerEvents: 'none' }}>
                                                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 12, width: `${pct}%`, background: 'linear-gradient(180deg,#4ade80,#16a34a 60%,#15803d)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)', transition: 'width 0.4s ease' }}>
                                                                <div className="absolute inset-y-0 w-5 bg-white/50 skew-x-[-20deg] animate-xp-bar-shine pointer-events-none" />
                                                            </div>
                                                        </div>
                                                        <span style={{ position: 'relative', zIndex: 1, fontSize: 8, fontWeight: 900, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>{Math.round(pct)}%</span>
                                                    </div>
                                                );
                                            })()}
                                        </button>
                                    ) : passBtn}
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
                                        <img src="/ui/coinmine.png" alt="" style={{ width: 54, height: 54, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                                        <div style={pillStyle}>Play</div>
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
                                        <div style={pillStyle}>Play</div>
                                    </button>
                                </>) : (<>
                                    {/* Pass moves here when Quest is on page 0 */}
                                    {questInProgress && passBtn}
                                    {/* Missions */}
                                    <button onClick={openMissionsModal} className="relative flex flex-col items-center active:scale-95 transition-transform">
                                        {missReady > 0 && (
                                            <div className="absolute top-1 right-1 w-4 h-4 bg-red-600 rounded-full border border-yellow-400 flex items-center justify-center text-[9px] text-white font-black z-10" style={{ WebkitTextStroke:'0.5px #000', paintOrder:'stroke fill' }}>
                                                {missReady}
                                            </div>
                                        )}
                                        <img src="/ui/missions_new.png" alt="" style={{ width: 54, height: 54, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                                        <div style={pillStyle}>Check</div>
                                    </button>
                                    {/* Album */}
                                    <button onClick={() => openModal('COLLECTION')} className="relative flex flex-col items-center active:scale-95 transition-transform">
                                        {(albumReady > 0 || player.packCredits > 0) && (
                                            <div className="absolute top-1 right-1 w-4 h-4 bg-red-600 rounded-full border border-yellow-400 flex items-center justify-center text-[9px] text-white font-black z-10" style={{ WebkitTextStroke:'0.5px #000', paintOrder:'stroke fill' }}>
                                                {albumReady > 0 ? albumReady : player.packCredits}
                                            </div>
                                        )}
                                        <img src="/ui/cards_new.png" alt="" style={{ width: 48, height: 48, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                                        <div style={pillStyle}>Check</div>
                                    </button>
                                </>);
                            })()}
                            {/* Page toggle pill — compact */}
                            <button
                                onClick={() => setSidebarPage(p => p === 0 ? 1 : 0)}
                                className="flex items-center justify-center active:scale-95 transition-transform mt-1"
                                style={{ width:36, height:16, borderRadius:8, background:'rgba(255,255,255,0.13)', border:'1px solid rgba(255,255,255,0.18)' }}>
                                <i className={`ti ${sidebarPage === 0 ? 'ti-chevron-down' : 'ti-chevron-up'}`} style={{ fontSize:10, color:'rgba(255,255,255,0.75)' }} />
                            </button>
                        </div>
                    );
                })()}

                {/* Quest-credit gained — flash the picks/dice icon over the reels for 2s */}
                {questCreditToast && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
                        <img
                            src="/pass-picksdice.png"
                            alt=""
                            className="animate-pot-shake"
                            style={{ width: 96, height: 96, objectFit: 'contain', filter: 'drop-shadow(0 4px 18px rgba(0,0,0,0.85))' }}
                        />
                    </div>
                )}

                {/* Quest task completed — brief banner, 3s auto-close */}
                {questTaskCompleteToast && (
                    <div className="absolute left-1/2 z-[60] pointer-events-none animate-pop-in" style={{ top: 8, transform: 'translateX(-50%)' }}>
                        <div className="flex items-center gap-2 rounded-full px-3 py-1.5"
                            style={{ background: 'linear-gradient(180deg,rgba(74,222,128,0.95),rgba(21,128,61,0.95))', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), 0 4px 14px rgba(0,0,0,0.5)' }}>
                            <i className="ti ti-check text-white" style={{ fontSize: 14 }} />
                            <span className="font-black text-white leading-none" style={{ fontSize: 11 }}>Task Complete</span>
                            <i className={`ti ${QUEST_TYPE_ICON[questTaskCompleteToast.type] || 'ti-star'} text-white/90`} style={{ fontSize: 12 }} />
                            <span className="font-bold text-white/90 leading-none" style={{ fontSize: 10 }}>{questTaskCompleteToast.description}</span>
                        </div>
                    </div>
                )}

                {/* Arena widget — right side, mirrors the left sidebar; live while spinning */}
                {arenaUnlocked && (
                    <div className="absolute right-1 z-40" style={{ top: '38%', transform: 'translateY(-38%)' }}>
                        <ArenaSideWidget
                            arena={arenaState}
                            playerName={playerName}
                            playerAvatar={profileEmoji}
                            maxBet={MAX_BET_BY_LEVEL(player.level)}
                            onOpen={() => setShowArena(true)}
                        />
                    </div>
                )}

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
                            {featureThemeOf(selectedGame.theme) === 'ARCTIC' ? (
                                freeSpinsRemaining > 0
                                    ? <ArcticMultiplierBar
                                        mults={[2, 3, 4, 5, 10]}
                                        stepIdx={Math.min(Math.max(cascadeMultiplier - 2, 0), 4)}
                                        isActive={status === GameStatus.CASCADE && cascadeMultiplier >= 2}
                                      />
                                    : <JackpotTicker slotIdx={GAMES_CONFIG.findIndex(g => g.id === selectedGame.id)} currentBet={availableBets[betIndex]} isSpinning={status === GameStatus.SPINNING || status === GameStatus.STOPPING} theme={selectedGame.theme} />
                            ) : (
                                <JackpotTicker slotIdx={GAMES_CONFIG.findIndex(g => g.id === selectedGame.id)} currentBet={availableBets[betIndex]} isSpinning={status === GameStatus.SPINNING || status === GameStatus.STOPPING} theme={selectedGame.theme} />
                            )}
                        </div>
                    );
                })()}

                <div className="flex-1 flex items-center justify-center w-full min-h-0 relative m-0 p-0">
                    {(() => {
                        return (
                    <div
                        data-no-ripple="true"
                        className={`relative z-10 h-full max-h-full overflow-hidden flex gap-0
                            ${reelTransitioning === 'out' ? 'animate-reel-out' : reelTransitioning === 'in' ? 'animate-reel-in' : ''}
                        `}
                        style={{ aspectRatio: selectedGame.theme === 'NEON' ? `${selectedGame.reels}/2` : `${selectedGame.reels}/${selectedGame.rows}` }}
                    >
                        {(() => {
                            // Pre-compute which reel starts the anticipation window so ALL remaining reels
                            // get the same +900 ms extension (not just the last one).
                            let anticipationStartReel = -1;
                            const _stt = selectedGame.scattersToTrigger;
                            // Fast spin only takes effect during autospin; manual spins keep
                            // full-speed reels and scatter anticipation.
                            const reelFast = fastSpin && player.autoSpin && freeSpinsRemaining === 0;
                            if (!reelFast && targetGrid.length > 0 && _stt >= 2 && _stt < 100) {
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
                                    if (!reelFast && anticipationStartReel !== -1 && i >= anticipationStartReel) {
                                        // Each anticipated reel gets its own sequential 900ms window
                                        return anticipationStartReel * REEL_DELAY + (i - anticipationStartReel + 1) * 900;
                                    }
                                    return i * (reelFast ? 50 : REEL_DELAY);
                                })()}
                                duration={reelFast ? 200 : SPIN_DURATION}
                                onStop={handleReelStop}
                                winningIndices={winData?.winningCells.filter(cell => cell.col === i).map(c => c.row) || []}
                                gameConfig={selectedGame}
                                isScatterShowcase={status === GameStatus.SCATTER_SHOWCASE}
                                forcedSymbols={cascadeGrid ? cascadeGrid[i] : undefined}
                                newCells={cascadeNewCells ? cascadeNewCells[i] : undefined}
                                dissolving={cascadeDissolving}
                                anticipation={isAnticipating && i === stoppedReels}
                                inFreeSpins={freeSpinsWon > 0}
                                instantStop={instantStop}
                            />
                            ));
                        })()}

                        {/* Arctic pick bonus progress bar — absolute overlay at top of reel area */}
                        {featureThemeOf(selectedGame.theme) === 'ARCTIC' && freeSpinsRemaining === 0 && !showArcticPickModal && (
                            <ArcticProgressBar progress={arcticSpinProgress} />
                        )}

                        {/* Mystery tile overlay — covers the masked cells until they reveal. */}
                        {MYSTERY_FEATURE_THEMES.has(selectedGame.theme) && mysteryCells.length > 0 && !mysteryRevealed && (
                            <div className="absolute inset-0 z-20 pointer-events-none flex gap-0">
                                {Array(selectedGame.reels).fill(null).map((_, c) => (
                                    <div key={c} className="flex-1 flex flex-col">
                                        {Array(selectedGame.rows).fill(null).map((_, r) => {
                                            const isM = mysteryCells.some(m => m.c === c && m.r === r);
                                            return (
                                                <div key={r} className="flex-1 relative flex items-center justify-center overflow-hidden">
                                                    {isM && (
                                                        <img
                                                            src={MYSTERY_IMG[selectedGame.theme]}
                                                            alt=""
                                                            className="w-full h-full object-contain select-none animate-bounce-sm"
                                                            style={{ filter: 'drop-shadow(0 0 10px rgba(255,215,80,0.7))' }}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Winning-cell viper borders — drawn in a top overlay so they're
                            never clipped/covered by neighbouring reels (shows on every side). */}
                        {winData && winData.winningCells.length > 0 && !holdWinActive &&
                         status !== GameStatus.SPINNING && status !== GameStatus.STOPPING && (
                            <div className="absolute inset-0 z-30 pointer-events-none flex gap-0">
                                {Array(selectedGame.reels).fill(null).map((_, c) => (
                                    <div key={c} className="flex-1 flex flex-col">
                                        {Array(selectedGame.rows).fill(null).map((_, r) => {
                                            const isWin = winData.winningCells.some(w => w.col === c && w.row === r);
                                            return (
                                                <div key={r} className="flex-1 relative">
                                                    {isWin && <ViperBorder theme={borderThemeFor(selectedGame.theme)} animate />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Hold and Win locked-cell overlay */}
                        {holdWinActive && featureThemeOf(selectedGame.theme) === 'EGYPT' && (() => {
                            // Coin icon for the active theme — drawn opaquely on locked cells so
                            // they stay visually "stuck" instead of spinning during respins.
                            const coinIcon = GET_SYMBOLS(selectedGame.theme)[SymbolType.COIN]?.icon;
                            return (
                            <div className="absolute inset-0 z-20 pointer-events-none flex gap-0">
                                {Array(selectedGame.reels).fill(null).map((_, c) => (
                                    <div key={c} className="flex-1 flex flex-col gap-0">
                                        {Array(selectedGame.rows).fill(null).map((_, r) => {
                                            const locked = holdWinLockedGrid[c]?.[r];
                                            const val = holdWinCoinValues[c]?.[r];
                                            const jpTier = holdWinJpGrid[c]?.[r];
                                            const JP_COLORS: Record<string, string> = { MINI: '#4ade80', MINOR: '#67e8f9', MAJOR: '#d8b4fe', MEGA: '#fda4af', GRAND: '#fde68a' };
                                            const isCounting = hwCountingCell?.c === c && hwCountingCell?.r === r;
                                            const GOLD = '#ffe600';
                                            const glowColor = isCounting ? 'rgba(255,255,255,0.9)' : (locked ? (jpTier ? JP_COLORS[jpTier] + 'cc' : 'rgba(255,230,0,0.85)') : 'transparent');
                                            return (
                                                <div key={r} className={`flex-1 relative flex items-center justify-center overflow-hidden ${isCounting ? 'animate-bounce-sm' : ''}`}
                                                    style={{
                                                        boxShadow: locked ? `0 0 ${isCounting ? 18 : 12}px ${glowColor}` : 'none',
                                                    }}>
                                                    {locked ? (
                                                        <>
                                                            {/* Full-size coin — always show behind both amounts and jackpot badges */}
                                                            {coinIcon && (
                                                                <img src={coinIcon} alt="" className="absolute inset-0 pointer-events-none select-none"
                                                                    style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 1 }} />
                                                            )}
                                                            <div className="relative flex flex-col items-center justify-center gap-0.5 w-full h-full">
                                                                {jpTier ? (
                                                                    <img src={SCATTER_JP_IMGS[jpTier] ?? `/${jpTier.toLowerCase()}.png`} alt={jpTier} style={{ width: 'clamp(40px,8.5vw,72px)', height: 'auto', objectFit: 'contain', filter: isCounting ? 'brightness(1.4)' : undefined }} />
                                                                ) : val ? (
                                                                    <span style={{ fontSize: 'clamp(13px,3vw,19px)', fontWeight: 900, color: '#ffffff', textShadow: '0 0 8px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,1), 0 2px 6px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,0.9)', lineHeight: 1 }}>
                                                                        {formatKShort(val)}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                            );
                        })()}

                        {/* Egypt coin meta overlay — show values on COIN cells during normal/free spins */}
                        {!holdWinActive && featureThemeOf(selectedGame.theme) === 'EGYPT' && egyptCoinMeta &&
                         status !== GameStatus.SPINNING && (
                            <div className="absolute inset-0 z-20 pointer-events-none flex gap-0">
                                {Array(selectedGame.reels).fill(null).map((_, c) => (
                                    <div key={c} className="flex-1 flex flex-col gap-0">
                                        {Array(selectedGame.rows).fill(null).map((_, r) => {
                                            const val = egyptCoinMeta.values[c]?.[r];
                                            const jpTier = egyptCoinMeta.jpGrid[c]?.[r];
                                            const JP_COLORS: Record<string, string> = { MINI: '#4ade80', MINOR: '#67e8f9', MAJOR: '#d8b4fe', MEGA: '#fda4af', GRAND: '#fde68a' };
                                            if (val === null || val === undefined) return <div key={r} className="flex-1" />;
                                            // Golden border/glow only during free spins; normal spins show the amount only.
                                            const showBorder = freeSpinsRemaining > 0;
                                            return (
                                                <div key={r} className="flex-1 relative flex items-center justify-center"
                                                    style={showBorder ? {
                                                        background: jpTier ? JP_COLORS[jpTier] + '35' : 'rgba(255,230,0,0.06)',
                                                        borderRadius: 0,
                                                        boxShadow: jpTier ? `inset 0 0 20px ${JP_COLORS[jpTier]}50, 0 0 14px ${JP_COLORS[jpTier]}60` : undefined,
                                                    } : { borderRadius: 0 }}>
                                                    {showBorder && <ViperBorder theme="gold" animate={false} />}
                                                    <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full">
                                                        {jpTier ? (
                                                            <img src={SCATTER_JP_IMGS[jpTier] ?? `/${jpTier.toLowerCase()}.png`} alt={jpTier} style={{ width: 'clamp(48px,10vw,80px)', height: 'auto', objectFit: 'contain', filter: `drop-shadow(0 0 8px ${JP_COLORS[jpTier]})` }} />
                                                        ) : (
                                                            <span style={{ fontSize: 'clamp(13px,3vw,19px)', fontWeight: 900, color: '#ffffff', textShadow: '0 0 8px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,1), 0 2px 6px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,0.9)', lineHeight: 1 }}>
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

                        {/* PIRATE Ghost Ship walking wilds — reused by Gold Rush (themed gold + galloping marker) */}
                        {pirateWalkActive && featureThemeOf(selectedGame.theme) === 'PIRATE' && pirateShipCol >= 0 && (() => {
                            const isWest = selectedGame.theme === 'WESTERN';
                            const edge = isWest ? '#ffcc33' : '#38e8ff';
                            const glowRGB = isWest ? '255,180,40' : '56,232,255';
                            return (
                            <div className="absolute inset-0 z-20 pointer-events-none flex gap-0.5 p-1">
                                {Array(selectedGame.reels).fill(null).map((_, c) => (
                                    <div key={c} className="flex-1 relative">
                                        {(c === pirateShipCol || c === pirateShip2Col) && (
                                            <div className="absolute inset-0 animate-pop-in"
                                                style={{
                                                    border: `2.5px solid ${edge}`,
                                                    borderRadius: 5,
                                                    boxShadow: `0 0 22px rgba(${glowRGB},0.85), inset 0 0 26px rgba(${glowRGB},0.35)`,
                                                    background: `linear-gradient(180deg,rgba(${glowRGB},0.18),rgba(20,80,120,0.05))`,
                                                }}>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            );
                        })()}


                        {/* PIRATE free-spin counter — shows remaining / total beneath the Ghost Ship banner */}
                        {featureThemeOf(selectedGame.theme) === 'PIRATE' && totalFreeSpins > 0 && (
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

                        {/* SPACE Supernova — progressive multiplier banner during free spins (reused by Jungle) */}
                        {featureThemeOf(selectedGame.theme) === 'SPACE' && totalFreeSpins > 0 && (
                            <div className="absolute -top-1 inset-x-0 flex justify-center z-30 pointer-events-none animate-pop-in">
                                <div style={{
                                    background: selectedGame.theme === 'JUNGLE' ? 'linear-gradient(180deg,#1f5e1a,#0a2a08)' : 'linear-gradient(180deg,#3b1a6e,#1a0a3a)',
                                    border: selectedGame.theme === 'JUNGLE' ? '2px solid #86efac' : '2px solid #c084fc',
                                    borderRadius: 999,
                                    padding: '4px 14px',
                                    boxShadow: selectedGame.theme === 'JUNGLE' ? '0 0 18px rgba(134,239,172,0.6), 0 4px 10px rgba(0,0,0,0.6)' : '0 0 18px rgba(192,132,252,0.6), 0 4px 10px rgba(0,0,0,0.6)',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}>
                                    <span className="font-black uppercase tracking-widest" style={{ fontSize: 'clamp(9px,2.4vw,13px)', color: selectedGame.theme === 'JUNGLE' ? '#dcfce7' : '#e9d5ff', textShadow: selectedGame.theme === 'JUNGLE' ? '0 0 8px rgba(134,239,172,0.9)' : '0 0 8px rgba(192,132,252,0.9)' }}>
                                        <img src="/ui/star.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block', marginRight: 3 }} />{selectedGame.theme === 'JUNGLE' ? 'Jungle Frenzy' : 'Supernova'}
                                    </span>
                                    <span className="font-black" style={{ fontSize: 'clamp(11px,3vw,16px)', color: '#fde68a', textShadow: '0 0 8px rgba(251,191,36,0.8)' }}>
                                        ×{spaceMultiplier}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* CANDY Wild Wheel — expanding wild-reel highlights */}
                        {featureThemeOf(selectedGame.theme) === 'CANDY' && totalFreeSpins > 0 && candyCols.length > 0 && (
                            <div className="absolute inset-0 z-20 pointer-events-none">
                                {(candyShuffledCols ?? candyCols).map((colInfo, idx) => (
                                    <div key={idx} className="absolute inset-y-1"
                                        style={{
                                            left: `calc(${(colInfo.col / selectedGame.reels) * 100}% + 2px)`,
                                            width: `calc(${(1 / selectedGame.reels) * 100}% - 4px)`,
                                            transition: 'left 0.4s cubic-bezier(0.4,0,0.2,1)',
                                            border: '2.5px solid #f9a8d4',
                                            borderRadius: 5,
                                            boxShadow: '0 0 22px rgba(236,72,153,0.8), inset 0 0 26px rgba(236,72,153,0.3)',
                                            background: 'linear-gradient(180deg,rgba(236,72,153,0.20),rgba(168,85,247,0.08))',
                                            animation: candyCommitCountRef.current <= 1 ? 'candyExpand 0.55s cubic-bezier(0.2,1.2,0.4,1) forwards, candyGlow 1.5s ease-in-out 0.55s infinite' : 'candyGlow 1.5s ease-in-out infinite',
                                        }} />
                                ))}
                            </div>
                        )}

                        {/* CANDY — individual wild cell containers (single-mode wilds) */}
                        {featureThemeOf(selectedGame.theme) === 'CANDY' && totalFreeSpins > 0 && candySingleWilds.length > 0 && (
                            <div className="absolute inset-0 z-20 pointer-events-none">
                                {(candyShuffledSingles ?? candySingleWilds).map((w, idx) => (
                                    <div key={idx} className="absolute"
                                        style={{
                                            left: `calc(${(w.col / selectedGame.reels) * 100}% + 2px)`,
                                            width: `calc(${(1 / selectedGame.reels) * 100}% - 4px)`,
                                            top: `calc(${(w.row / selectedGame.rows) * 100}% + 2px)`,
                                            height: `calc(${(1 / selectedGame.rows) * 100}% - 4px)`,
                                            transition: 'left 0.4s cubic-bezier(0.4,0,0.2,1), top 0.4s cubic-bezier(0.4,0,0.2,1)',
                                            border: '2px solid #f9a8d4',
                                            borderRadius: 4,
                                            background: 'rgba(236,72,153,0.12)',
                                            animation: candyCommitCountRef.current <= 1 ? 'candyExpand 0.4s cubic-bezier(0.2,1.2,0.4,1) forwards, candyGlow 1.5s ease-in-out 0.4s infinite' : 'candyGlow 1.5s ease-in-out infinite',
                                        }} />
                                ))}
                            </div>
                        )}

                        {/* CANDY Wild Wheel — feature banner above the reels */}
                        {featureThemeOf(selectedGame.theme) === 'CANDY' && totalFreeSpins > 0 && candyConfig && (
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
                        {showArcticPickModal && featureThemeOf(selectedGame.theme) === 'ARCTIC' && (
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
                                <div className="relative flex items-center justify-center tcard-gold p-2">
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
                                        style={{ width: 'clamp(68px,13vw,100px)', height: 'clamp(68px,13vw,100px)', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 2px 8px rgba(255,140,0,0.6))' }}
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

                    {/* Egypt HW respin counter — short yellow banner over the reels */}
                    {holdWinActive && featureThemeOf(selectedGame.theme) === 'EGYPT' && (
                        <div className="absolute z-30 flex items-center justify-center gap-1.5 px-4 py-0.5"
                            style={{ top: 0, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(180deg,#ffe24d 0%,#ffb31a 50%,#f57c00 100%)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 6px rgba(0,0,0,0.5)' }}>
                            <span style={{ fontSize: 11, color: '#5a3000', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Respins</span>
                            <span style={{ fontSize: 15, color: '#3a1d00', fontWeight: 900, lineHeight: 1 }}>{holdWinRespins}/3</span>
                        </div>
                    )}

                    {/* Slot Quest panel — always visible when in slot with active missions */}
                    {selectedGame && slotQuestState.missions.length > 0 && (
                        <SlotQuestPanel
                            missions={slotQuestState.missions}
                            activeSlotName={GAMES_CONFIG.find(g => g.id === slotQuestState.pathSlotIds[slotQuestState.currentPathIndex])?.name || ''}
                            isOnActiveSlot={selectedGame.id === slotQuestState.pathSlotIds[slotQuestState.currentPathIndex]}
                            rewardCoins={MAX_BET_BY_LEVEL(player.level) * (slotQuestState.currentPathIndex + 1) * 20}
                            allDone={slotQuestState.missions.every(m => m.current >= m.target)}
                            onOpenQuestPath={() => setShowQuestPath(true)}
                        />
                    )}
                </div>


            </div>
        )}
      </main>

      {currentView === 'GAME' && (
          <div className="fixed bottom-0 w-full z-50 flex flex-col select-none"
            style={isHighLimit ?
              { background:'linear-gradient(180deg,#ffe24d 0%,#ffb31a 50%,#f57c00 100%)', borderTop:'none' } :
              { background:'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', borderTop:'none' }}>
              {/* Bar A (Replicated from mockup - Bet details, Win panel, Spin trigger) */}
              <div className="barA bar font-nunito w-full flex items-stretch gap-1 md:gap-1.5 rounded-none p-1.5 px-3 md:px-6 h-[56px] md:h-[64px]"
                style={isHighLimit ? { background:'linear-gradient(180deg,#ffe24d 0%,#ffb31a 50%,#f57c00 100%)', borderColor:'#8b6200' } : {}}>
                  {/* Missions Button */}
                  {(() => {
                      const visibleDaily = missionState.activeMissions.filter((m: any) => m.frequency === 'DAILY').slice(0, 4);
                      const missReady = visibleDaily.filter((m: any) => m.completed && !m.claimed).length;
                      return (
                          <div onClick={openMissionsModal} className="icon-btn shrink-0 flex flex-col items-center justify-end relative"
                              style={isHighLimit ? { background:'linear-gradient(180deg,#ffec70 0%,#ffbe2a 50%,#ff8c12 100%)', borderColor:'#8b6200' } : {}}>
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
                          if (betIndex > 0 && status === GameStatus.IDLE && !player.autoSpin) {
                              setBetIndex(prev => prev - 1);
                              audioService.playClick();
                          }
                      }}
                      className={`pm shrink-0 ${betIndex === 0 || status !== GameStatus.IDLE || player.autoSpin || freeSpinsRemaining > 0 || pirateWalkActive ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                      style={isHighLimit ? { background: 'linear-gradient(180deg,#ffec70 0%,#ffbe2a 50%,#ff8c12 100%)', border: '1px solid #8b6200', color: '#fff' } : {}}
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
                          if (status === GameStatus.IDLE && !player.autoSpin) {
                              // Wrap back to the lowest bet when already at max.
                              setBetIndex(prev => prev >= availableBets.length - 1 ? 0 : prev + 1);
                              audioService.playClick();
                          }
                      }}
                      className={`pm shrink-0 ${status !== GameStatus.IDLE || player.autoSpin || freeSpinsRemaining > 0 || pirateWalkActive ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                      style={isHighLimit ? { background: 'linear-gradient(180deg,#ffec70 0%,#ffbe2a 50%,#ff8c12 100%)', border: '1px solid #8b6200', color: '#fff' } : {}}
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
                          ) : showNeonRoulette ? (
                              neonRouletteTotal > 0 ? formatK(neonRouletteTotal) : '—'
                          ) : freeSpinsRemaining > 0 ? (
                              formatK(freeSpinTotalWin)
                          ) : lastWinAmount === null ? (
                              // Fresh slot, no spin yet.
                              "LET'S SPIN!"
                          ) : (
                              // Base game: show the last win (or 0) — no "spinning" text.
                              formatK(lastWinAmount)
                          )}
                      </span>
                      <span className="total-win">
                          {hwCounting ? 'COUNTING...' : status === GameStatus.CASCADE ? `CASCADE  ×${cascadeMultiplier}` : holdWinActive ? 'HOLD & WIN' : pirateWalkActive ? 'GHOST SHIP' : showNeonRoulette ? 'ROULETTE' : freeSpinsRemaining > 0 ? `FREE SPINS: ${freeSpinsRemaining}` : 'TOTAL WIN'}
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
                      className={`flat blue maxbet shrink-0 ${status !== GameStatus.IDLE || betIndex === availableBets.length - 1 || freeSpinsRemaining > 0 || pirateWalkActive || player.autoSpin ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
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
                      onPointerDown={handleSpinPointerDown}
                      onPointerUp={handleSpinPointerUp}
                      onPointerLeave={() => { if (spinButtonTimeoutRef.current) { clearTimeout(spinButtonTimeoutRef.current); spinButtonTimeoutRef.current = null; isLongPressRef.current = false; } }}
                      className={`flat ${isStop ? 'red' : 'green'} spinA shrink-0 ${activeModal !== 'NONE' || !!reelTransitioning || showFreeSpinsPopup || showFreeSpinSummary || showCandyRoulette || showSpinCountRoulette || showWinPopup || !!jackpotWinTier || holdWinActive || status === GameStatus.CASCADE || showDragonPickModal || dragonPotShaking || showDragonTriggerPopup || showArcticPickModal || showArcticTriggerPopup || showEgyptHoldWinPopup ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                      style={{ touchAction: 'none' }}
                  >
                      <div className="flat-face" style={{ overflow: 'hidden' }}>
                          <div className="absolute inset-y-0 w-8 bg-white/20 skew-x-[-20deg] animate-btn-shine pointer-events-none" style={{ zIndex: 2, animationDelay: '2.5s' }} />
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
                    style={{ background: 'linear-gradient(160deg,#1e0438,#0d0220)' }}>
                    <div className="text-white text-[10px] font-black uppercase tracking-widest text-center">Auto Spin</div>
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
                    <div className="flex items-center justify-between px-0.5">
                        <div className="text-white font-black text-xs">Fast Spin</div>
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
    }} onBuy={handleShopBuy} onPay={handlePay} localPrices={localPrices} level={player.level} isFreeStashClaimed={!freeCoinsAvailable} freeCoinsAmount={freeCoinsAmount} freeCoinsAvailable={freeCoinsAvailable} initialTab={shopInitialTab} balance={player.balance} diamonds={player.diamonds} maxBet={MAX_BET_BY_LEVEL(player.level)} claimedItems={player.shopClaimedItems || []} onClaimItem={handleClaimShopItem} isVip={!!player.isVip} vipLevel={player.vipLevel || 1} />}

    <PaymentModal item={paymentItem} currency={currency} onClose={() => setPaymentItem(null)} onSuccess={handlePaymentSuccess} />

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
        onStageComplete={(bonusCoins, bonusDiamonds, autoAdvance) => handleStageComplete(quest.activeGame === 'DICE' ? 'DICE' : 'WILD', bonusCoins, bonusDiamonds, autoAdvance)}
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
          maxBet={currentBetRef.current}
          onOpenGemShop={() => { setActiveModal('NONE'); setTimeout(() => openShop('DIAMONDS'), 50); }}
          onOpenPremium={() => { setActiveModal('NONE'); setTimeout(() => setShowPremiumModal(true), 50); }}
      />}

      <TimeBonusModal isOpen={activeModal === 'TIME_BONUS'} onClose={() => setActiveModal('NONE')} timers={bonusTimers} onClaim={handleClaimTimeBonus}
          collectMultiplier={treasuryMultiplier}
          multProgress={treasuryMultProgress}
          jackpotLastTime={player.jackpotRouletteLastTime ?? 0}
          jackpotBaseAmount={MAX_BET_BY_LEVEL(player.level) * 7 * treasuryMultiplier}
          onJackpotClaim={(amount) => {
              setPlayer(p => ({ ...p, balance: p.balance + amount, jackpotRouletteLastTime: Date.now() }));
              triggerCoinAnim(amount);
              audioService.playWinBig();
              setCelebrationMsg(`+${formatCommaNumber(amount)} Coins`);
              awardArenaWin(amount);
          }} />
      
      <LoginBonusModal isOpen={activeModal === 'LOGIN_BONUS'} currentDay={loginState.currentDay} maxBet={MAX_BET_BY_LEVEL(player.level)} onClaim={handleClaimLoginBonus} />
      
    <PiggyBankModal isOpen={activeModal === 'PIGGY'} onClose={() => setActiveModal('NONE')} amount={player.piggyBank} diamonds={player.diamonds} onBreak={handleBreakPiggy} level={player.level} maxBet={MAX_BET_BY_LEVEL(player.level)} balance={player.balance} onOpenGemShop={() => openShop('DIAMONDS')} eventPiggyBoost={EVENT_PIGGY_BOOST} />

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

      {/* Quest Path page */}
      <QuestPathModal
          isOpen={showQuestPath}
          onClose={() => setShowQuestPath(false)}
          pathSlotIds={slotQuestState.pathSlotIds}
          currentPathIndex={slotQuestState.currentPathIndex}
          onPlaySlot={(slotId) => {
              const game = GAMES_CONFIG.find(g => g.id === slotId);
              if (game) handleGameSelect(game, false, true);
          }}
          maxBet={MAX_BET_BY_LEVEL(player.level)}
          allMissionsDone={slotQuestState.missions.length > 0 && slotQuestState.missions.every(m => m.current >= m.target)}
          onClaim={handleSlotQuestClaim}
      />

      {/* Grand Prize claim popup — shown after completing all quest stages */}
      {grandPrizePopup !== null && (
          <div className="absolute inset-0 z-[210] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-pop-in select-none">
              <div className="rounded-3xl overflow-hidden flex flex-col items-center px-7 py-7 mx-4"
                  style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 40px rgba(0,0,0,0.9)', maxWidth: 340 }}>
                  <i className="ti ti-trophy text-amber-300" style={{ fontSize: 44, filter: 'drop-shadow(0 0 14px rgba(251,191,36,0.7))' }} />
                  <span className="font-tanker text-amber-300 mt-2" style={{ fontSize: 28, lineHeight: 1, textShadow: '0 0 16px rgba(251,191,36,0.8)' }}>Congratulations!</span>
                  <span className="font-black text-white/80 mt-2 text-center" style={{ fontSize: 12 }}>You completed all Quest stages!</span>
                  <span className="font-bold text-white/55 mt-0.5 text-center" style={{ fontSize: 11 }}>Grand Prize Awarded</span>
                  <div className="flex items-center gap-2 mt-4">
                      <img src="/new_coinicon.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain', filter: 'drop-shadow(0 2px 10px rgba(251,191,36,0.8))' }} />
                      <span className="font-tanker text-yellow-300" style={{ fontSize: 34, lineHeight: 1, textShadow: '0 0 16px rgba(251,191,36,0.7)' }}>+{formatK(grandPrizePopup)}</span>
                  </div>
                  <button onClick={() => { setGrandPrizePopup(null); if (currentView === 'GAME') handleHeaderBack(); }} className="pill-green w-full mt-6">
                      <div className="pill-face" style={{ padding: '9px 12px', fontSize: '13px' }}>Claim &amp; Go to Lobby</div>
                  </button>
              </div>
          </div>
      )}

      {/* Dragon Trigger Popup */}
      {showDragonTriggerPopup && (
          <div className="absolute inset-0 z-[250] flex items-center justify-center backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div className="animate-pop-in flex flex-col items-center gap-4 rounded-2xl px-8 py-7"
                  style={{ background: 'linear-gradient(180deg,#ffcf33 0%,#c9901a 18%,#9a6800 45%,#5a3800 100%)', boxShadow: 'inset 0 1px 0 rgba(255,220,120,0.5), 0 8px 40px rgba(251,191,36,0.45)', maxWidth: 300, textAlign: 'center' }}>
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
                      className="pill-gold"
                  >
                      <div className="pill-face" style={{ padding: '9px 26px', fontSize: 'clamp(12px,2.2vw,16px)' }}>Let's Go!</div>
                  </button>
              </div>
          </div>
      )}

      {showEgyptHoldWinPopup && (
          <div className="absolute inset-0 z-[250] flex items-center justify-center backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div className="animate-pop-in flex flex-col items-center gap-4 rounded-2xl px-8 py-7"
                  style={{ background: 'linear-gradient(180deg,#b5701a 0%,#7a4500 30%,#3a2000 100%)', boxShadow: 'inset 0 1px 0 rgba(255,210,130,0.5), 0 8px 40px rgba(245,158,11,0.5)', maxWidth: 300, textAlign: 'center' }}>
                  <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>🏺</span>
                  <div className="font-black text-white uppercase tracking-widest" style={{ fontSize: 'clamp(14px,3vw,20px)', textShadow: '0 0 12px rgba(245,158,11,0.9)' }}>
                      Hold &amp; Win<br />Triggered!
                  </div>
                  <div className="text-amber-300 font-bold text-xs uppercase tracking-widest">6 Coins Landed!</div>
              </div>
          </div>
      )}

      {showArcticTriggerPopup && (
          <div className="absolute inset-0 z-[250] flex items-center justify-center backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div className="animate-pop-in flex flex-col items-center gap-4 rounded-2xl px-8 py-7"
                  style={{ background: 'linear-gradient(180deg,#1a6a8c 0%,#0a3a5a 35%,#001828 100%)', boxShadow: 'inset 0 1px 0 rgba(150,230,255,0.5), 0 8px 40px rgba(34,211,238,0.45)', maxWidth: 300, textAlign: 'center' }}>
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
          onRunningTotal={(total) => setNeonRouletteTotal(total)}
      />

      <SpinCountRouletteModal
          isOpen={showSpinCountRoulette}
          onComplete={handleSpinCountComplete}
      />

      <CandyRouletteModal
          isOpen={showCandyRoulette}
          freeSpins={freeSpinsWon}
          onComplete={handleCandyRouletteComplete}
      />

      <JackpotCelebration tier={jackpotWinTier} onClose={handleJackpotClose} />

      {/* Gems claimed popup */}
      {gemsClaimedPopup !== null && (
          <div className="absolute inset-0 z-[300] flex items-center justify-center animate-pop-in backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.2)' }} onClick={() => setGemsClaimedPopup(null)}>
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

      <StageCompleteModal
          isOpen={!!stageCompletePopup}
          gameType={stageCompletePopup?.gameType ?? 'DICE'}
          stage={stageCompletePopup?.stage ?? 1}
          coins={stageCompletePopup?.coins ?? 0}
          diamonds={stageCompletePopup?.diamonds ?? 0}
          autoAdvance={stageCompletePopup?.autoAdvance}
          onNext={() => setStageCompletePopup(null)}
      />


      {showFreeSpinsPopup &&<FreeSpinsWonPopup isOpen={showFreeSpinsPopup} count={freeSpinsWon} onComplete={handleStartFreeSpins} />}
      
      {showLevelUp && currentView === 'GAME' && <LevelUpToast level={player.level} reward={levelUpReward} maxBetIncreased={maxBetIncreased} newMaxBet={MAX_BET_BY_LEVEL(player.level)} onClose={() => setShowLevelUp(false)} />}

      {showPackToast && currentView === 'GAME' && (
          <div className="fixed top-[40px] right-2 z-[200] animate-pop-in pointer-events-none"
              style={{ background: 'linear-gradient(160deg,#2a0d52,#3b0764)', border: '1px solid rgba(150,90,255,0.3)', borderRadius: 14, padding: '10px 14px', boxShadow: '0 6px 20px rgba(0,0,0,0.7)' }}>
              <div className="flex items-center gap-2">
                  <img src="/card_normal.png" alt="" style={{ width: '1.8rem', height: '2.2rem', objectFit: 'contain', flexShrink: 0 }} />
                  <div>
                      <div className="font-black text-white text-xs uppercase tracking-widest">+1 Card Pack!</div>
                      <div className="text-purple-300 text-[9px] font-bold">Added to your stash</div>
                  </div>
              </div>
          </div>
      )}

      {slotUnlockToast && currentView === 'GAME' && (
          <div className="absolute top-[38px] right-2 z-[202] animate-pop-in" style={{ width: 130 }}>
              <div className="rounded-2xl overflow-hidden flex flex-col gap-1.5"
                  style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 6px 20px rgba(0,0,0,0.8)', padding: '8px' }}>
                  {slotUnlockToast.coverImage && (
                      <img src={slotUnlockToast.coverImage} alt="" style={{ width: '100%', height: 68, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                  )}
                  <div className="flex flex-col gap-0.5 text-center">
                      <div className="font-tanker text-white leading-none" style={{ fontSize: '0.8rem' }}>Unlocked!</div>
                      <div className="text-purple-200 font-bold leading-none" style={{ fontSize: 9 }}>{slotUnlockToast.name}</div>
                  </div>
                  <button onClick={() => { const c = slotUnlockToast; setSlotUnlockToast(null); handleGameSelect(c); }} className="pill-green w-full">
                      <div className="pill-face" style={{ padding: '5px 8px', fontSize: '9px' }}>Play Now →</div>
                  </button>
              </div>
          </div>
      )}

      {activeToast && (
          <div className="absolute top-[38px] right-2 z-[201] animate-pop-in pointer-events-none">
              <div className="rounded-2xl overflow-hidden flex items-center gap-2.5" style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 6px 20px rgba(0,0,0,0.8)', padding: '9px 13px' }}>
                  {activeToast.type === 'LEVEL_UP'
                      ? <img src="/topbar_levelstar.png" alt="" style={{ width: '1.4rem', height: '1.4rem', objectFit: 'contain', flexShrink: 0 }} />
                      : <img src="/card_normal.png" alt="" style={{ width: '1.4rem', height: '1.8rem', objectFit: 'contain', flexShrink: 0 }} />}
                  <div>
                      {activeToast.type === 'LEVEL_UP' ? (
                          <>
                              <div className="font-tanker text-white" style={{ fontSize: '0.95rem', lineHeight: 1.1 }}>Level {activeToast.level}!</div>
                              {activeToast.reward > 0 && <div className="text-purple-200 font-bold" style={{ fontSize: 9, marginTop: 2 }}>+{formatCommaNumber(activeToast.reward)} coins</div>}
                              {activeToast.maxBetIncreased && <div className="text-yellow-300 font-bold" style={{ fontSize: 9 }}>Max Bet ↑ {formatCommaNumber(activeToast.newMaxBet)}</div>}
                          </>
                      ) : activeToast.type === 'CARD' ? (
                          <>
                              <div className="font-tanker" style={{ fontSize: '0.95rem', lineHeight: 1.1, color: activeToast.rarity === 'RARE' ? '#fbbf24' : '#e2e8f0' }}>{activeToast.rarity === 'RARE' ? 'Rare' : 'Common'} Card!</div>
                              <div className="text-purple-200 font-bold" style={{ fontSize: 9, marginTop: 2 }}>{activeToast.cardName}</div>
                          </>
                      ) : (
                          <>
                              <div className="font-tanker text-white" style={{ fontSize: '0.95rem', lineHeight: 1.1 }}>+1 Card Pack!</div>
                              <div className="text-purple-200 font-bold" style={{ fontSize: 9, marginTop: 2 }}>Added to your stash</div>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      {showPurchaseModal && (
          <div className="absolute inset-0 z-[300] flex items-center justify-center backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.2)' }}
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
                  <button onClick={() => setShowPurchaseModal(null)} className="pill-purple w-full">
                      <div className="pill-face" style={{ padding: '8px 12px', fontSize: '11px', background: 'linear-gradient(180deg,#c084fc,#a855f7,#6d28d9)' }}>Confirm</div>
                  </button>
              </div>
          </div>
      )}

      {/* Side-click ripple effects */}
      {ripples.map(rp => (
          <div key={rp.id} className="ripple-fx" style={{ left: rp.x, top: rp.y, background: rp.color }} />
      ))}

      {showFreeSpinSummary && <FreeSpinSummary isOpen={showFreeSpinSummary} totalWin={freeSpinTotalWin} bet={availableBets[betIndex]} onClose={handleFreeSpinSummaryClose} />}
      {holdWinSummary && <FreeSpinSummary isOpen={true} totalWin={holdWinSummary.total} bet={holdWinSummary.bet} label="Hold & Win Complete" onClose={() => { const total = holdWinSummary.total; setHoldWinSummary(null); setStatus(GameStatus.IDLE); if (total > 0) setCelebrationMsg('+' + formatK(total)); trackSlotQuest('BONUS_TRIGGER', 1); }} />}
      
      {showWelcomeGift && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <div className="animate-pop-in flex flex-col items-center gap-3 rounded-3xl p-6 mx-4 text-center"
            style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)', maxWidth: 300, width: '100%' }}>
            <div className="font-black text-white text-lg tracking-wide">Welcome Gift</div>
            <div className="text-purple-200 text-xs font-bold">A special gift to start your journey</div>
            <div className="flex flex-col items-center gap-1 rounded-2xl px-5 py-3 w-full"
              style={{ background: 'linear-gradient(180deg,rgba(197,16,224,0.32) 0%,rgba(10,0,50,0.75) 100%)', boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4)' }}>
              <img src="/new_coinicon.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
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
                let lastTick2 = 0;
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
                    const spd = 1 + p2 * 1.5;
                    if (elapsed - lastTick2 >= Math.max(120, 200 / spd)) {
                        audioService.playCoinTick(spd);
                        lastTick2 = elapsed;
                    }
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

      {/* Events Popup */}
      {showEventsPopup && (
          <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/10 backdrop-blur-md p-4 animate-pop-in select-none" onClick={() => setShowEventsPopup(false)}>
              <div className="w-full max-w-sm rounded-3xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}
                  style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)', height: 280 }}>
                  {/* Header */}
                  <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 relative">
                      <span className="absolute left-0 right-0 text-center text-white font-tanker text-base drop-shadow pointer-events-none">Events</span>
                      <button className="round-btn cursor-pointer shrink-0 ml-auto z-10" onClick={() => setShowEventsPopup(false)}><i className="ti ti-x"></i></button>
                  </div>
                  {/* Event banners — vertically scrollable, ~1 banner tall, scrollbar hidden, no extra container */}
                  <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar gap-3 px-4 pb-4 min-h-0">
                      {['/event (1).png', '/event (2).png'].map((src, i) => (
                          <img key={i} src={src} alt=""
                              className="w-full rounded-2xl object-contain shrink-0"
                              style={{ display: 'block' }} />
                      ))}
                  </div>
              </div>
          </div>
      )}

      <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(audioService.toggleSfxMute())}
          isMusicMuted={isMusicMuted}
          onToggleMusic={() => setIsMusicMuted(audioService.toggleMusicMute())}
          redeemedCodes={redeemedCodes}
          onRedeem={(code) => {
              if (code === 'reset') {
                  try {
                      Object.keys(localStorage)
                          .filter(k => k.startsWith('cw_'))
                          .forEach(k => localStorage.removeItem(k));
                  } catch {}
                  window.location.reload();
                  return;
              }
              if (redeemedCodes.includes(code)) return;
              setRedeemedCodes(prev => {
                  const next = [...prev, code];
                  try { localStorage.setItem('cw_redeemed_codes', JSON.stringify(next)); } catch {}
                  return next;
              });
              if (code === 'dev777') {
                  setPlayer(p => ({ ...p, level: p.level + 40, diamonds: p.diamonds + 10_000, balance: p.balance + 100_000_000_000 }));
                  setCelebrationMsg('⚡ Level Rush! +100B Coins · +10K Gems · +40 Levels');
              } else if (code === 'dev999') {
                  setPlayer(p => ({ ...p, balance: p.balance + 100_000_000_000_000 }));
                  setCelebrationMsg('💰 Coin Flood! +100T Coins');
              } else if (code === 'dev1') {
                  const now = Date.now();
                  setPlayer(p => ({ ...p, diamonds: p.diamonds + 50_000, isVip: true, vipExpiry: Math.max(p.vipExpiry || 0, now) + 30 * 24 * 3600000, xpMultiplier: 3, xpBoostEndTime: now + 24 * 60 * 60 * 1000 }));
                  setMissionState(ms => ({
                      ...ms,
                      isPremium: true,
                      premiumExpiry: now + 30 * 24 * 60 * 60 * 1000,
                      passBoostMultiplier: 3,
                      passBoostEndTime: now + 24 * 60 * 60 * 1000,
                      passLevel: Math.min(50, (ms.passLevel || 1) + 20),
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
                      vipExpiry: Math.max(p.vipExpiry || 0, now) + 30 * 24 * 3600000,
                  }));
                  setMissionState(ms => ({
                      ...ms,
                      isPremium: true,
                      premiumExpiry: now + 365 * 24 * 60 * 60 * 1000,
                      passLevel: Math.min(50, (ms.passLevel || 1) + 20),
                  }));
                  setCelebrationMsg('👑 GOD MODE! VIP + Premium Pass');
              } else if (code === 'cstester') {
                  // dev111 × 3 + dev222: 30B coins, 6K gems, 30-day VIP, premium pass
                  const now = Date.now();
                  setPlayer(p => ({
                      ...p,
                      balance: p.balance + 30_000_000_000,
                      diamonds: p.diamonds + 6_000,
                      isVip: true,
                      vipExpiry: Math.max(p.vipExpiry || 0, now) + 30 * 24 * 3600000,
                  }));
                  setMissionState(ms => ({
                      ...ms,
                      isPremium: true,
                      premiumExpiry: now + 30 * 24 * 60 * 60 * 1000,
                      passLevel: Math.min(50, (ms.passLevel || 1) + 20),
                  }));
                  setCelebrationMsg('🧪 Tester Pack! +30B Coins · +6K Gems · 30-day VIP');
              } else if (code === 'casinoslop') {
                  const now = Date.now();
                  setPlayer(p => ({
                      ...p,
                      balance: p.balance + 10_000_000_000,
                      diamonds: p.diamonds + 1_000,
                      isVip: true,
                      vipExpiry: Math.max(p.vipExpiry || 0, now) + 3 * 24 * 3600000,
                  }));
                  setCelebrationMsg('🎰 +10B Coins · +1,000 Gems · 3-day VIP');
              } else if (code === 'beta1') {
                  const now = Date.now();
                  setPlayer(p => ({
                      ...p,
                      balance: p.balance + 50_000_000_000,
                      diamonds: p.diamonds + 2_000,
                      collectBoostEndTime: Math.max(p.collectBoostEndTime || 0, now) + 7 * 24 * 3600000,
                  }));
                  setCelebrationMsg('⚡ Beta Pack! +50B Coins · +2K Gems · 7-day Collect Boost');
              }
              audioService.playWinBig();
          }}
          onReset={async () => {
              // Push the reset state to the leaderboard so it doesn't keep showing stale
              // high scores, then clear local data. Device identity is preserved so the
              // same leaderboard row is reused (no orphaned duplicate).
              try {
                  await submitScore({
                      name: playerName,
                      avatar: profileEmoji,
                      level: 1,
                      vipLevel: 0,
                      score: INITIAL_BALANCE,
                      gems: INITIAL_GEMS,
                      totalWon: 0,
                      maxJackpot: 0,
                      maxWin: 0,
                  });
              } catch {}
              try {
                  const deviceId = localStorage.getItem('cw_device_id');
                  Object.keys(localStorage)
                      .filter(k => k.startsWith('cw_'))
                      .forEach(k => localStorage.removeItem(k));
                  if (deviceId) localStorage.setItem('cw_device_id', deviceId);
              } catch {}
              window.location.reload();
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
          vipExpiry={player.vipExpiry}
          onJoinVip={handleJoinVip}
          onOpenHighLimit={() => { setShowVipLounge(false); setTimeout(handleOpenHighRoller, 50); }}
          onOpenPremium={() => { setShowVipLounge(false); setTimeout(() => setShowPremiumModal(true), 50); }}
      />

      {/* First-time welcome gift — 7 days of free VIP */}
      {showFreeVipPopup && (
          <div className="absolute inset-0 z-[420] flex items-center justify-center select-none" style={{ background: 'rgba(0,0,0,0.75)' }}>
              <div className="animate-pop-in flex flex-col items-center gap-3 p-5 rounded-3xl text-center"
                  style={{ background: 'linear-gradient(180deg,rgba(168,85,247,0.7) 0%,rgba(201,144,26,0.7) 46%,rgba(40,12,70,0.97) 100%)', boxShadow: 'inset 0 1px 0 rgba(255,225,150,0.5), 0 8px 32px rgba(0,0,0,0.8)', maxWidth: 300 }}>
                  <img src="/ui/VIP.png" alt="" style={{ width: 92, height: 92, objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }} />
                  <div style={{ fontSize: '1.3rem', lineHeight: 1.1, fontFamily: "'Tanker', cursive", color: '#fde68a' }}>Welcome Gift!</div>
                  <div className="text-yellow-100 text-sm font-black leading-tight">You've received<br />7 Days of FREE VIP</div>
                  <button onClick={handleClaimFreeVip} className="pill-gold w-full" style={{ marginTop: 4 }}>
                      <div className="pill-face" style={{ padding: '9px 18px', fontSize: '12px' }}>Claim VIP</div>
                  </button>
              </div>
          </div>
      )}

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
          playerName={playerName}
          onSetPlayerName={handleSetPlayerName}
          onNavigateToGame={(game) => { setShowProfile(false); handleGameSelect(game as GameConfig); }}
          albumsCompleted={decks.filter(d => d.isCompleted).length}
          albumsTotal={decks.length}
          arenaTier={arenaState.tierIndex}
          unlockedAvatars={player.unlockedAvatars || []}
          onBuyAvatar={(path, cost) => {
              if (player.diamonds < cost) return;
              setPlayer(p => ({ ...p, diamonds: p.diamonds - cost, unlockedAvatars: [...(p.unlockedAvatars || []), path] }));
              setProfileEmoji(path);
              try { localStorage.setItem('cw_profile_emoji', path); } catch {}
              audioService.playClick();
          }}
      />

      <InboxModal
          isOpen={showInbox}
          onClose={() => setShowInbox(false)}
          messages={inbox.filter((m: any) => !m.claimed)}
          onClaim={handleClaimInbox}
      />

      <LeaderboardModal
          isOpen={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
          player={{
              name: playerName,
              avatar: profileEmoji,
              level: player.level,
              vipLevel: player.vipLevel ?? 0,
              score: player.balance,
              gems: player.diamonds,
              totalWon: player.stats?.totalCoinsWon || 0,
              maxJackpot: player.stats?.maxJackpotWin || 0,
              maxWin: player.stats?.maxSingleWin || 0,
          }}
          friendIds={friendsState.friends.map(f => f.id)}
          pendingFriendIds={pendingFriendRequestIds}
          onAddFriend={(entry) => handleAddFriend(toFriend(entry, Date.now()))}
      />

      {/* Arena ranking */}
      <ArenaModal
          isOpen={showArena}
          onClose={() => setShowArena(false)}
          arena={arenaState}
          playerName={playerName}
          playerAvatar={profileEmoji}
          maxBet={MAX_BET_BY_LEVEL(player.level)}
      />
      <ArenaResultsModal
          isOpen={showArenaResults && !!arenaState.lastResult}
          result={arenaState.lastResult || null}
          nextSeasonInMs={phaseTimeRemaining(arenaState, Date.now())}
          onClose={() => { setShowArenaResults(false); setArenaState(prev => ({ ...prev, lastResult: null })); }}
      />

      {/* Friends */}
      <FriendsModal
          isOpen={showFriends}
          onClose={() => setShowFriends(false)}
          friends={friendsState.friends}
          you={{
              name: playerName,
              avatar: profileEmoji,
              level: player.level,
              vipLevel: player.vipLevel ?? 0,
              score: player.balance,
              gems: player.diamonds,
              totalWon: player.stats?.totalCoinsWon || 0,
              maxJackpot: player.stats?.maxJackpotWin || 0,
              maxWin: player.stats?.maxSingleWin || 0,
          }}
          maxBet={MAX_BET_BY_LEVEL(player.level)}
          incomingRequests={incomingFriendRequests}
          pendingRequestIds={pendingFriendRequestIds}
          onAddFriend={handleAddFriend}
          onAcceptRequest={handleAcceptFriendRequest}
          onSendGift={handleSendGift}
      />

      {/* Purchase Unavailable Popup */}
      {showNopay && (
          <div className="absolute inset-0 z-[400] flex items-center justify-center bg-black/10 backdrop-blur-md animate-pop-in" onClick={() => setShowNopay(false)}>
              <div className="rounded-2xl overflow-hidden shadow-2xl max-w-[280px] w-full mx-4 flex flex-col items-center text-center px-6 py-6 gap-3" onClick={e => e.stopPropagation()}
                  style={{ background: 'linear-gradient(160deg,#1a0535,#2d0060)' }}>
                  <i className="ti ti-shopping-cart-off" style={{ fontSize: '2.5rem', color: '#a855f7' }} />
                  <div className="font-black text-white text-base uppercase tracking-widest">Purchase Unavailable</div>
                  <div className="text-purple-300/80 text-xs leading-relaxed">Real money purchases are not available at this time.</div>
                  <button onClick={() => setShowNopay(false)} className="pill-purple mt-1">
                      <div className="pill-face" style={{ padding: '8px 24px', fontSize: '11px', background: 'linear-gradient(180deg,#c084fc,#7c3aed,#4c1d95)' }}>Ok</div>
                  </button>
              </div>
          </div>
      )}

      {/* Purchase Confirmation Popup */}
      {purchaseConfirm && (
          <div className="absolute inset-0 z-[300] flex items-center justify-center bg-black/10 backdrop-blur-md animate-pop-in" onClick={() => setPurchaseConfirm(null)}>
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
                          { icon: '/topbar_levelstar.png', text: '+20% XP on all spins' },
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
                      <button onClick={() => setPurchaseConfirm(null)} className={`${purchaseConfirm === 'VIP' ? 'pill-gold' : 'pill-purple'} w-full`}>
                          <div className="pill-face" style={{ padding: '8px 12px', fontSize: '11px', ...(purchaseConfirm === 'VIP' ? { background: 'linear-gradient(180deg,#fbbf24,#d97706)', color: '#1c0a00' } : { background: 'linear-gradient(180deg,#c084fc,#a855f7,#6d28d9)' }) }}>Let's Go! 🎉</div>
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