import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SymbolType, GameStatus, PlayerState, WinData, QuestState, MiniGameReward, GameConfig, MissionState, MissionType, PassReward, Mission, Deck, Card, DailyLoginState, WildGridCell } from './types';
import { GAMES_CONFIG, GET_DYNAMIC_WEIGHTS, SPIN_DURATION, REEL_DELAY, INITIAL_BALANCE, GET_PAYLINES, XP_BASE_REQ, GET_ALL_BETS, MAX_BET_BY_LEVEL, formatNumber, formatCommaNumber, formatWinNumber, GET_SYMBOLS, AUTO_SPIN_DELAY, GENERATE_DAILY_MISSIONS, GENERATE_WEEKLY_MISSIONS, GENERATE_MONTHLY_MISSIONS, GENERATE_PASS_REWARDS, INITIAL_GEMS, PICKS_COST_IN_CREDITS, GENERATE_DECKS, CALCULATE_TIME_BONUS, DUPLICATE_CREDIT_VALUES, GENERATE_REPLACEMENT_MISSION, DAILY_LOGIN_REWARDS, PACK_COSTS, SCALE_COIN_REWARD, formatK } from './constants';
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
import { HighLimitLobby } from './components/HighLimitLobby';
import { audioService } from './services/audioService';
import { jackpotService } from './services/jackpotService';
import { JackpotCelebration } from './components/JackpotCelebration';
import { StageCompleteModal } from './components/StageCompleteModal';
import { PremiumModal } from './components/PremiumModal';
import { ProfileModal } from './components/ProfileModal';

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

const App: React.FC = () => {
  const toastCountRef = useRef(0);
  const spinButtonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const [currentView, setCurrentView] = useState<'LOBBY' | 'GAME' | 'HIGH_LIMIT'>('LOBBY');
  const [selectedGame, setSelectedGame] = useState<GameConfig>(GAMES_CONFIG[0]);
  const [isHighLimit, setIsHighLimit] = useState(false);
  const [savedGameStates, setSavedGameStates] = useState<Record<string, SavedGameState>>({});

  const [player, setPlayer] = useState<PlayerState>(() => {
    try {
      const saved = localStorage.getItem('cw_player');
      if (saved) return { ...{ balance: INITIAL_BALANCE, diamonds: INITIAL_GEMS, tokens: 0, packCredits: 0, piggyBank: 0, level: 1, xp: 0, xpToNextLevel: XP_BASE_REQ, autoSpin: false, xpMultiplier: 1, xpBoostEndTime: 0, freeStashClaimedTime: 0, shopClaimedItems: [] }, ...JSON.parse(saved) };
    } catch {}
    return { balance: INITIAL_BALANCE, diamonds: INITIAL_GEMS, tokens: 0, packCredits: 0, piggyBank: 0, level: 1, xp: 0, xpToNextLevel: XP_BASE_REQ, autoSpin: false, xpMultiplier: 1, xpBoostEndTime: 0, freeStashClaimedTime: 0, shopClaimedItems: [] };
  });
  
  // Ref to track player state to avoid stale closures in callbacks (like feature unlocks)
  const playerRef = useRef(player);
  useEffect(() => {
      playerRef.current = player;
  }, [player]);
  
  const [bonusTimers, setBonusTimers] = useState([
      { id: 0, endTime: 0, reward: 50000, label: 'Quick' }, 
      { id: 1, endTime: Date.now() + 900000, reward: 250000, label: 'Daily' }, 
      { id: 2, endTime: Date.now() + 3600000, reward: 1000000, label: 'Mega' } 
  ]);

  // Sync jackpot max bet with current level's max bet
  useEffect(() => {
      jackpotService.setMaxBet(MAX_BET_BY_LEVEL(player.level));
  }, [player.level]);

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

  // Effect to update Golden Treasury rewards when level changes
  useEffect(() => {
      const maxBet = MAX_BET_BY_LEVEL(player.level);
      // Quick = 5% maxBet, Daily = 25% maxBet, Mega = 100% maxBet
      const pcts = [0.05, 0.25, 1.0];
      setBonusTimers(prev => prev.map(t => ({
          ...t,
          reward: Math.floor(maxBet * pcts[t.id])
      })));
  }, [player.level]);

  const [missionState, setMissionState] = useState<MissionState>(() => {
    try {
      const saved = localStorage.getItem('cw_missions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { activeMissions: [...GENERATE_DAILY_MISSIONS(1), ...GENERATE_WEEKLY_MISSIONS(1), ...GENERATE_MONTHLY_MISSIONS(1)], passLevel: 1, passXP: 0, passXpToNext: 500, passRewards: GENERATE_PASS_REWARDS(10000), isPremium: false, premiumExpiry: 0, passBoostMultiplier: 1, passBoostEndTime: 0 };
  });
  const [decks, setDecks] = useState<Deck[]>(GENERATE_DECKS());

  const [availableBets, setAvailableBets] = useState<number[]>(ALL_BETS);
  const [betIndex, setBetIndex] = useState(0);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
    const [grid, setGrid] = useState<SymbolType[][]>(Array(GAMES_CONFIG[0].reels).fill(null).map(() => Array(3).fill(SymbolType.SEVEN)));
  const [targetGrid, setTargetGrid] = useState<SymbolType[][]>([]);
  const [winData, setWinData] = useState<WinData | null>(null);
  const [stoppedReels, setStoppedReels] = useState(0);
  const [instantStop, setInstantStop] = useState(false);
  const [fastSpin, setFastSpin] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showVipLounge, setShowVipLounge] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const savedFastSpinRef = useRef<boolean>(false); 
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [piggyGlow, setPiggyGlow] = useState(false);
  const [showXpTimer, setShowXpTimer] = useState(false);
  
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
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpReward, setLevelUpReward] = useState(0);
  const [maxBetIncreased, setMaxBetIncreased] = useState(false);
  const [mobileScale, setMobileScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const widthScale = window.innerWidth / 844;
      const heightScale = window.innerHeight / 390;
      setMobileScale(Math.min(1, widthScale, heightScale));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Quest state initialized with separate stages
  const [quest, setQuest] = useState<QuestState>({
      diceCredits: 5,
      wildCredits: 5,
      wildStage: 1,
      diceStage: 1,
      max: 60,
      dicePosition: 0,
      activeGame: 'NONE',
      wildGrid: []
  });
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0);
  const [totalFreeSpins, setTotalFreeSpins] = useState(0);
  const [freeSpinTotalWin, setFreeSpinTotalWin] = useState(0);
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

  useEffect(() => {
    setBetIndex(0);
    const unlockAudio = () => {
        audioService.toggleMute(); 
        audioService.toggleMute();
        document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    
    if (!loginState.claimedToday) {
        setTimeout(() => setActiveModal('LOGIN_BONUS'), 500);
    }
  }, []);

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

  const handleToggleVIP = () => {
      if (player.isVip) {
          setIsHighLimit(true);
          setCurrentView('HIGH_LIMIT');
      } else {
          setShowVipLounge(true);
      }
      audioService.playClick();
  };

  const handleJoinVip = () => {
      setPlayer(p => ({
          ...p,
          isVip: true,
          balance: p.balance + 500_000,
          diamonds: p.diamonds + 500,
      }));
      setShowVipLounge(false);
      setIsHighLimit(true);
      setCurrentView('HIGH_LIMIT');
      audioService.playClick();
  };

  const nextBonusTime = Math.min(...bonusTimers.map(t => t.endTime));

  const handleClaimTimeBonus = (id: number, _reward: number) => {
      const now = Date.now();
      const multipliers = [0.5, 2.5, 10];
      const base = CALCULATE_TIME_BONUS(player.level);
      
      const scaledReward = Math.floor(base * multipliers[id]);

      setBonusTimers(prev => prev.map(t => {
          if (t.id === id) {
              let nextWait = 900000; // 15m
              if (id === 1) nextWait = 3600000; // 1H
              if (id === 2) nextWait = 14400000; // 4H
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

  useEffect(() => {
    try { localStorage.setItem('cw_player', JSON.stringify(player)); } catch {}
  }, [player]);

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
              newReq = Math.floor(newReq * 1.2); 
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
          const newMission = GENERATE_REPLACEMENT_MISSION(player.level, mission.frequency);
          setMissionState(prev => {
              const others = prev.activeMissions.filter(m => m.id !== mission.id);
              return { ...prev, activeMissions: [...others, newMission] };
          });
          
          let msg = `+${formatCommaNumber(coinGain)} Coins & +${xpGain} XP`;
          if (isBoosted) msg += " (Boosted!)";
          setCelebrationMsg(msg);
          audioService.playWinBig();
      }
  };

  const handleFinishMission = (mission: Mission) => {
      const cost = Math.ceil(mission.xpReward / 50) * 10;
      if (player.diamonds >= cost && !mission.completed) {
          setPlayer(p => ({ ...p, diamonds: p.diamonds - cost }));
          setMissionState(prev => {
              const updated = prev.activeMissions.map(m => m.id === mission.id ? { ...m, current: m.target, completed: true } : m);
              return { ...prev, activeMissions: updated };
          });
          audioService.playWinSmall();
      }
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
              msg = `+${reward.value} Gems`;
          } else if (reward.type === 'XP_BOOST') {
              setPlayer(p => ({ ...p, xpMultiplier: reward.value, xpBoostEndTime: Date.now() + 1800000 }));
              msg = `${reward.value}x XP Boost`;
          } else if (reward.type === 'CREDIT_BACK') {
              setPlayer(p => ({ ...p, packCredits: p.packCredits + reward.value }));
              msg = `+${reward.value} Card Packs`;
          } else if (reward.type === 'PICKS') {
              setQuest(q => ({ ...q, wildCredits: q.wildCredits + reward.value }));
              msg = `+${reward.value} Picks`;
          } else if (reward.type === 'DICE_CREDITS') {
              setQuest(q => ({ ...q, diceCredits: q.diceCredits + reward.value }));
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
              setPlayer(p => ({ ...p, xpMultiplier: r.value, xpBoostEndTime: Date.now() + 1800000 }));
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
          setQuest(q => ({ ...q, wildCredits: q.wildCredits + totalPicks }));
      }
      if (totalDice > 0) {
          setQuest(q => ({ ...q, diceCredits: q.diceCredits + totalDice }));
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
      setMissionState(prev => ({ ...prev, isPremium: true, premiumExpiry: Date.now() + 2592000000 })); 
      setPlayer(p => ({ ...p, diamonds: p.diamonds + 100, balance: p.balance + 1000000 }));
      addPassXp(2000); 
      for(let i=0; i<20; i++) {
          setMissionState(prev => {
              const nextLevel = Math.min(50, prev.passLevel + 1);
              return { ...prev, passLevel: nextLevel };
          });
      }
      setCelebrationMsg("Premium Pass Unlocked! +20 Levels");
      audioService.playWinBig();
  };

  const handleBuyPassLevel = () => {
      if (player.diamonds >= 100 && missionState.passLevel < 50) {
          setPlayer(p => ({ ...p, diamonds: p.diamonds - 100 }));
          setMissionState(prev => ({ ...prev, passLevel: prev.passLevel + 1 }));
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

  const handleBuyPack = (packId: string, drawCount: number): Card[] => {
      let packInfo = PACK_COSTS.BASIC;
      if (packId === 'super') packInfo = PACK_COSTS.SUPER;
      if (packId === 'mega') packInfo = PACK_COSTS.MEGA;
      if (packId === 'ultra') packInfo = PACK_COSTS.ULTRA;

      let totalCost = packInfo.creditCost * drawCount;
      if (drawCount === 10) {
          totalCost = Math.ceil(totalCost * 0.9);
      }
      
      if (player.packCredits >= totalCost) {
          setPlayer(p => ({ ...p, packCredits: p.packCredits - totalCost }));
          
          const allDrawnCards: Card[] = [];
          let earnedTokens = 0;
          
          let tempDecks = decks.map(d => ({ ...d, cards: d.cards.map(c => ({...c})) }));
          const prevCompletedIds = decks.filter(d => d.isCompleted).map(d => d.gameId);

          for (let d = 0; d < drawCount; d++) {
              let rarityWeights = [0.98, 0.02, 0.0, 0.0]; 
              if (packId === 'ultra') rarityWeights = [0.0, 0.71, 0.25, 0.04]; 
              else if (packId === 'mega') rarityWeights = [0.24, 0.60, 0.15, 0.01]; 
              else if (packId === 'super') rarityWeights = [0.55, 0.40, 0.05, 0.0];

              const allCardsInTemp: { deckId: string, cardIndex: number, card: Card }[] = [];
              tempDecks.forEach(d => d.cards.forEach((c, idx) => allCardsInTemp.push({ deckId: d.gameId, cardIndex: idx, card: c })));
              
              const hasAnyCards = tempDecks.some(d => d.cards.some(c => c.count > 0));

              for(let i=0; i<packInfo.cardCount; i++) {
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
          const allCards: { deckIdx: number; cardIdx: number }[] = [];
          prev.forEach((deck, di) => {
              deck.cards.forEach((card, ci) => {
                  if (card.rarity === rarity) allCards.push({ deckIdx: di, cardIdx: ci });
              });
          });
          if (allCards.length === 0) return prev;
          const pick = allCards[Math.floor(Math.random() * allCards.length)];
          return prev.map((deck, di) => {
              if (di !== pick.deckIdx) return deck;
              const newCards = deck.cards.map((card, ci) =>
                  ci !== pick.cardIdx ? card : { ...card, count: card.count + 1 }
              );
              return { ...deck, cards: newCards, isCompleted: newCards.every(c => c.count > 0) };
          });
      });
  }, []);

  const generateSmartGrid = useCallback(() => {
      const cols = selectedGame.reels;
      const rows = selectedGame.rows;
      const isFreeSpin = freeSpinsRemaining > 0;
      const newGrid: SymbolType[][] = [];
      const isSmallGrid = cols <= 3;

      for(let c=0; c<cols; c++) {
          const colData: SymbolType[] = [];
          for(let r=0; r<rows; r++) {
              let sym = getRandomSymbol(isFreeSpin, spinsWithoutBonus);
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
      // NEON and PIGGY never use full-column same-symbol matches
      if (selectedGame.theme === 'NEON' || selectedGame.theme === 'PIGGY') megaMatchActive = false;

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
                    if (c === 2) wildStackChance = 0.12 * wildMult;
                    if (c === 3) wildStackChance = 0.16 * wildMult;
                    if (c === 4) wildStackChance = 0.24 * wildMult;
               } else if (isSmallGrid) {
                   // 3×3: base chances × 0.8 (20% less wild column spawns)
                   if (c === 1) wildStackChance = 0.06 * wildMult * 0.8;
                   if (c === 2) wildStackChance = 0.08 * wildMult * 0.8;
               } else {
                   if (c === 1) wildStackChance = 0.15 * wildMult;
                   if (c === 2) wildStackChance = 0.20 * wildMult;
               }
               // PIGGY: 20% higher wild rate + extend to all 7 columns
               if (selectedGame.theme === 'PIGGY') {
                   if (c === 5) wildStackChance = 0.30 * wildMult;
                   if (c === 6) wildStackChance = 0.36 * wildMult;
                   wildStackChance *= 1.2;
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

      // NEON uses jackpot cells instead of scatters; PIGGY uses coin cells
      if (selectedGame.theme !== 'NEON' && selectedGame.theme !== 'PIGGY') {
          const scatterRoll = Math.random() * 100;
          let targetScatters = 0;
          // 3×3 slots: 20% less free spin chance (raise thresholds so fewer scatters spawn)
          const s1 = isSmallGrid ? 68 : 60;
          const s2 = isSmallGrid ? 85.6 : 82;
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

      // Jackpot cell injection: during free spins for all slots; NEON always (20% boost)
      const isNeonJP = selectedGame.theme === 'NEON';
      if (freeSpinsRemaining > 0 || isNeonJP) {
          const neonBoost = isNeonJP ? 1.08 : 1.0;
          // 60/40 MINI:MINOR ratio; all tiers ~30% less than before to reduce 3-match frequency
          const JP_SPAWN = [
              { type: SymbolType.JACKPOT_MINI,  prob: 0.072 * neonBoost },
              { type: SymbolType.JACKPOT_MINOR, prob: 0.048 * neonBoost },
              { type: SymbolType.JACKPOT_MAJOR, prob: 0.015 * neonBoost },
              { type: SymbolType.JACKPOT_MEGA,  prob: 0.005 * neonBoost },
              { type: SymbolType.JACKPOT_GRAND, prob: 0.0015 * neonBoost },
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

      return newGrid;
  }, [selectedGame, freeSpinsRemaining, spinsWithoutBonus]);

  const handleQuestModeSelect = (mode: 'NONE' | 'WILD' | 'DICE') => {
        setQuest(q => ({ ...q, activeGame: mode }));
  };

  const handleStageComplete = (gameType: 'WILD' | 'DICE', bonusCoins: number, bonusDiamonds: number) => {
      const stage = gameType === 'WILD' ? quest.wildStage : quest.diceStage;
      const scaledBonus = 1000000 * stage * player.level;

      setPlayer(p => ({ ...p, balance: p.balance + scaledBonus, diamonds: p.diamonds + bonusDiamonds }));

      if (gameType === 'WILD') {
          setQuest(q => ({ ...q, wildStage: q.wildStage + 1, wildGrid: [] }));
      } else {
          setQuest(q => ({ ...q, diceStage: q.diceStage + 1, dicePosition: 0 }));
      }

      setStageCompletePopup({ gameType, stage, coins: scaledBonus, diamonds: bonusDiamonds });
      audioService.playWinBig();
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
          if (r.type === 'COINS') totalCoins += r.value;
          else if (r.type === 'DIAMONDS') totalGems += r.value;
          else if (r.type === 'PACKS') totalPacks += r.value;
          else if (r.type === 'PICKS') diceGained += r.value;
      });
      if (totalCoins > 0) { setPlayer(p => ({ ...p, balance: p.balance + totalCoins })); msgParts.push(`+${formatCommaNumber(totalCoins)} Coins`); }
      if (totalGems > 0) { setPlayer(p => ({ ...p, diamonds: p.diamonds + totalGems })); msgParts.push(`+${totalGems} 💎`); }
      if (totalPacks > 0) { setPlayer(p => ({ ...p, packCredits: p.packCredits + totalPacks })); msgParts.push(`+${totalPacks} 📦`); }
      if (diceGained > 0) { setQuest(q => ({ ...q, diceCredits: q.diceCredits + diceGained })); msgParts.push(`+${diceGained} 🎲`); }
      if (isFinish) {
          const bonusCoins = Math.round(MAX_BET_BY_LEVEL(player.level) * quest.diceStage * 10);
          setPlayer(p => ({ ...p, balance: p.balance + bonusCoins }));
          const currentStage = quest.diceStage;
          setQuest(q => ({ ...q, diceStage: q.diceStage + 1, dicePosition: 0 }));
          setStageCompletePopup({ gameType: 'DICE', stage: currentStage, coins: bonusCoins, diamonds: 0 });
      }
      if (msgParts.length > 0) { setCelebrationMsg(msgParts.join(' · ')); audioService.playWinBig(); }
  };

  const spin = useCallback(() => {
    if (status !== GameStatus.IDLE && status !== GameStatus.FREE_SPIN_INTRO) return;
    if (activeModal !== 'NONE') return; 
    if (showFreeSpinsPopup) return;

    const currentBet = availableBets[betIndex];
    const isFreeSpin = freeSpinsRemaining > 0;
    
    // Insufficient Funds Check
    if (!isFreeSpin && player.balance < currentBet) {
      if (player.balance < 10000) {
          setShowBankruptcy(true);
      } else {
          setCelebrationMsg("Not Enough Coins!");
          audioService.playStoneBreak();
      }
      setPlayer(p => ({ ...p, autoSpin: false })); 
      return;
    }

    if (!isFreeSpin) {
      // Piggy Bank Logic: 5% of Bet (10% if VIP), Capped. Only saves if Level >= 5.
      if (player.level >= 5) {
          const savings = currentBet * (player.isVip ? 0.10 : 0.05);
          const cap = MAX_BET_BY_LEVEL(player.level) * 5;
          setPlayer(prev => ({ 
              ...prev, 
              balance: prev.balance - currentBet,
              piggyBank: Math.min(prev.piggyBank + savings, cap)
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
      setPlayer(prev => ({
          ...prev,
          stats: {
              ...(prev.stats || { maxSingleWin: 0, maxJackpotWin: 0, totalCoinsWon: 0, totalGemsEarned: 0, totalSpins: 0, recentSlots: [] }),
              totalSpins: (prev.stats?.totalSpins || 0) + 1
          }
      }));
    } else {
        setFreeSpinsRemaining(prev => prev - 1);
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
    setStatus(GameStatus.SPINNING);
    setWinData(null);
    setStoppedReels(0);
    setTargetGrid([]); 
  }, [status, player.balance, availableBets, betIndex, freeSpinsRemaining, activeModal, showFreeSpinsPopup, player.level]);

  useEffect(() => {
    if (status === GameStatus.SPINNING && targetGrid.length === 0) {
      setTargetGrid(generateSmartGrid());
    }
  }, [status, targetGrid.length, generateSmartGrid]);

  useEffect(() => {
    if (status === GameStatus.SPINNING && targetGrid.length > 0) {
        const effectiveFastSpin = fastSpin;
        const timeout = setTimeout(() => setStatus(GameStatus.STOPPING), effectiveFastSpin ? 50 : 500);
        return () => clearTimeout(timeout);
    }
  }, [status, targetGrid.length, fastSpin]); 

  const handleReelStop = useCallback(() => {
    setStoppedReels(prev => {
      const next = prev + 1;
      audioService.playReelStop();
      if (next === selectedGame.reels) {
        let scatterCount = 0;
        const scatters: {col: number, row: number}[] = [];
        targetGrid.forEach((col, colIdx) => {
            col.forEach((sym, rowIdx) => {
                if (sym === SymbolType.SCATTER) {
                    scatterCount++;
                    scatters.push({ col: colIdx, row: rowIdx });
                }
            });
        });
        
        if (scatterCount >= selectedGame.scattersToTrigger) {
             const spinsWon = scatterCount === 3 ? 10 : scatterCount === 4 ? 15 : 20;
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
                const spinsWon = 15;
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

            const lineWin = Math.floor(currentBet * (baseValue / 3) * lenMult);
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

    // Per-spin drops (every spin, not just wins)
    if (player.level >= 20 && Math.random() < 0.20) {
        if (Math.random() < 0.5) {
            setQuest(q => ({ ...q, diceCredits: q.diceCredits + 1 }));
        } else {
            setQuest(q => ({ ...q, wildCredits: q.wildCredits + 1 }));
        }
    }
    if (player.level >= 30) {
        const cardRoll = Math.random();
        if (cardRoll < 0.10) handleCardDrop('RARE');
        else if (cardRoll < 0.30) handleCardDrop('COMMON');
    }

    if (totalPayout > 0) {
       setPlayer(p => ({ ...p, balance: p.balance + totalPayout }));

       const vipXpMult = player.isVip ? 1.2 : 1.0;
       const spinsAtMaxBet = Math.max(1, player.level * 1.1);
       const betFraction = currentBet / MAX_BET_BY_LEVEL(player.level);
       const xpGained = Math.floor((player.xpToNextLevel / spinsAtMaxBet) * betFraction * player.xpMultiplier * vipXpMult);

       addXp(xpGained);
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
           const effectiveFastSpin = fastSpin;
           setTimeout(() => setStatus(GameStatus.IDLE), effectiveFastSpin ? 150 : 500);
       }
    } else {
       const vipXpMultLoss = player.isVip ? 1.2 : 1.0;
       const spinsAtMaxBetLoss = Math.max(1, player.level * 1.1);
       const betFractionLoss = currentBet / MAX_BET_BY_LEVEL(player.level);
       const lossXp = Math.floor((player.xpToNextLevel / spinsAtMaxBetLoss) * betFractionLoss * player.xpMultiplier * vipXpMultLoss);
       addXp(lossXp);
       const effectiveFastSpin = fastSpin;
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

              // CHECK SLOT UNLOCKS
              const justUnlockedSlot = (level: number) => {
                  if (level === 32 && !shownUnlocks.has(32)) return { id: 'dragon-fortune', name: "Dragon's Fortune", icon: '🐉', lvl: 32 };
                  if (level === 42 && !shownUnlocks.has(42)) return { id: 'pirate-bounty', name: "Pirate's Bounty", icon: '🏴‍☠️', lvl: 42 };
                  if (level === 52 && !shownUnlocks.has(52)) return { id: 'cosmic-cash', name: "Cosmic Cash", icon: '👽', lvl: 52 };
                  if (level === 62 && !shownUnlocks.has(62)) return { id: 'sugar-rush', name: "Sugar Rush", icon: '🍭', lvl: 62 };
                  if (level === 72 && !shownUnlocks.has(72)) return { id: 'jungle-rumble', name: "Jungle Rumble", icon: '🌴', lvl: 72 };
                  if (level === 82 && !shownUnlocks.has(82)) return { id: 'deep-blue', name: "Deep Blue", icon: '🔱', lvl: 82 };
                  if (level === 92 && !shownUnlocks.has(92)) return { id: 'wild-west', name: "Gold Rush", icon: '🤠', lvl: 92 };
                  if (level === 102 && !shownUnlocks.has(102)) return { id: 'samurai-honor', name: "Samurai Honor", icon: '👹', lvl: 102 };
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
                  }
              }, 500);

              return { ...prev, balance: prev.balance + reward, level: newLevel, xp: newXp, xpToNextLevel: newReq };
          }
          return { ...prev, xp: newXp, xpToNextLevel: newReq };
      });
  };

  const handleWinPopupComplete = () => {
      setShowWinPopup(false);
      setStatus(GameStatus.IDLE);
  };

  const handleJackpotClose = () => {
      setJackpotWinTier(null);
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
          else if (reward.type === 'XP_BOOST') { setPlayer(p => ({ ...p, xpMultiplier: 2, xpBoostEndTime: Date.now() + 1800000 })); setCelebrationMsg(`XP Boost!`); }
          else if (reward.type === 'PICKS') { setQuest(q => ({ ...q, wildCredits: q.wildCredits + reward.value })); setCelebrationMsg(`+${reward.value} Credits`); }
      }
  };

  const handleBatchPick = (picksUsed: number, rewards: MiniGameReward[]) => {
      setQuest(q => ({ ...q, wildCredits: Math.max(0, q.wildCredits - picksUsed) }));

      let totalCoins = 0;
      let totalGems = 0;
      let totalPicksFound = 0;
      let xpBoostFound = false;

      rewards.forEach(r => {
          if (r.type === 'COINS') totalCoins += r.value;
          else if (r.type === 'DIAMONDS') totalGems += r.value;
          else if (r.type === 'PICKS') totalPicksFound += r.value;
          else if (r.type === 'XP_BOOST') xpBoostFound = true;
      });

      if (totalCoins > 0) setPlayer(p => ({ ...p, balance: p.balance + totalCoins }));
      if (totalGems > 0) setPlayer(p => ({ ...p, diamonds: p.diamonds + totalGems }));
      if (totalPicksFound > 0) setQuest(q => ({ ...q, wildCredits: q.wildCredits + totalPicksFound }));
      if (xpBoostFound) setPlayer(p => ({ ...p, xpMultiplier: 2, xpBoostEndTime: Date.now() + 1800000 }));

      const parts = [];
      if (totalCoins > 0) parts.push(`${formatCommaNumber(totalCoins)} Coins`);
      if (totalGems > 0) parts.push(`${totalGems} Gems`);
      if (totalPicksFound > 0) parts.push(`${totalPicksFound} Credits`);
      if (xpBoostFound) parts.push("XP Boost");

      if (parts.length > 0) {
          setCelebrationMsg(`Auto Pick: +${parts.join(', ')}`);
          audioService.playWinBig();
      }
  };

  const handleGameSelect = (game: GameConfig, highLimit: boolean = false) => {
      const gameIndex = GAMES_CONFIG.findIndex(g => g.id === game.id);
      const unlockLevel = gameIndex * 5;
      
      // Use a fresh reference to player level if available, or ref
      const currentLevel = playerRef.current.level;

      if (currentLevel < unlockLevel) {
          audioService.playStoneBreak();
          setCelebrationMsg(`Locked! Unlock at Level ${unlockLevel}`);
          return;
      }
      
const currentState: SavedGameState = {
          freeSpinsRemaining,
          totalFreeSpins,
          freeSpinsWon,
          freeSpinTotalWin,
          spinsWithoutBonus,
          grid
      };
      setSavedGameStates(prev => ({ ...prev, [selectedGame.id]: currentState }));
    const modifiedGame = { ...game, rows: 3 };
    setSelectedGame(modifiedGame);
      setPlayer(prev => {
          const newRecent = [game.id, ...(prev.stats?.recentSlots || []).filter(id => id !== game.id)].slice(0, 5);
          return { ...prev, stats: { ...(prev.stats || { maxSingleWin: 0, maxJackpotWin: 0, totalCoinsWon: 0, totalGemsEarned: 0, totalSpins: 0, recentSlots: [] }), recentSlots: newRecent } };
      });
      setIsHighLimit(highLimit);
      // Restore per-slot saved bet
      const savedBetStr = localStorage.getItem('cw_bet_' + game.id);
      if (savedBetStr) {
          const savedBetVal = Number(savedBetStr);
          const currentAllowed = ALL_BETS.filter(b => b <= MAX_BET_BY_LEVEL(player.level)).slice(-15);
          let closest = 0, minD = Infinity;
          currentAllowed.forEach((b, i) => { const d = Math.abs(b - savedBetVal); if (d < minD) { minD = d; closest = i; } });
          setBetIndex(closest);
      }
      setCurrentView('GAME');
      // Ensure we close any unlock modals when entering a game
      setActiveModal('NONE');
      setStatus(GameStatus.IDLE);
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
          setGrid(Array(game.reels).fill(null).map(() => Array(3).fill(SymbolType.SEVEN)));
          setWinData(null);
      }
      setTargetGrid([]); 
  };

  const handleStartFreeSpins = () => {
      setShowFreeSpinsPopup(false);
      setFreeSpinsRemaining(prev => prev + freeSpinsWon);
      savedFastSpinRef.current = fastSpin;
      setStatus(GameStatus.IDLE);
  };
  const handleFreeSpinSummaryClose = () => {
      setShowFreeSpinSummary(false);
      const currentBet = availableBets[betIndex];
      const tier = getWinTier(freeSpinTotalWin, currentBet);
      if (tier) {
          setWinData({ payout: freeSpinTotalWin, winningLines: [], winningCells: [], isBigWin: true, scattersFound: 0, winType: tier });
          audioService.playWinBig();
          setShowWinPopup(true);
          setStatus(GameStatus.WIN_ANIMATION);
      } else setStatus(GameStatus.IDLE);
      setFreeSpinsWon(0);
      setTotalFreeSpins(0);
      setFreeSpinTotalWin(0);
      setFastSpin(savedFastSpinRef.current);
      setTargetGrid([]);
  };

  useEffect(() => {
      if (status === GameStatus.IDLE) {
          if (freeSpinsRemaining > 0) {
              const delay = fastSpin ? 50 : 1200;
              if (activeModal === 'NONE' && !showFreeSpinsPopup) setTimeout(() => spin(), delay); 
          } else if (freeSpinsWon > 0 && !showFreeSpinsPopup) {
              setShowFreeSpinSummary(true);
          } else if (player.autoSpin) {
              if (activeModal === 'NONE') setTimeout(() => spin(), fastSpin ? 50 : AUTO_SPIN_DELAY);
          }
      }
  }, [status, freeSpinsRemaining, player.autoSpin, freeSpinsWon, spin, fastSpin, activeModal, showFreeSpinsPopup]);

  const handleHeaderBack = () => {
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
                 if (type === 'BOOST') setPlayer(p => ({ ...p, xpMultiplier: amount, xpBoostEndTime: Date.now() + (duration || 0) }));
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
      if (freeSpinsRemaining > 0) return; 
      isLongPressRef.current = false;
      spinButtonTimeoutRef.current = setTimeout(() => {
          isLongPressRef.current = true;
          if (!player.autoSpin) {
              setPlayer(p => ({ ...p, autoSpin: true }));
              audioService.playClick();
          }
      }, 800); 
  };

  const handleSpinMouseUp = () => {
      if (spinButtonTimeoutRef.current) {
          clearTimeout(spinButtonTimeoutRef.current);
          spinButtonTimeoutRef.current = null;
      }
      if (freeSpinsRemaining > 0) return;
      if (!isLongPressRef.current) {
          if (player.autoSpin) {
              setPlayer(p => ({ ...p, autoSpin: false }));
              audioService.playClick();
          } else {
              if (status === GameStatus.IDLE || (status === GameStatus.FREE_SPIN_INTRO && freeSpinsRemaining > 0)) {
                  spin();
              } else if (status === GameStatus.SPINNING || status === GameStatus.STOPPING) {
                  setInstantStop(true);
                  if (status === GameStatus.SPINNING) setStatus(GameStatus.STOPPING);
              }
          }
      }
  };

  const getDeckReward = (level: number) => MAX_BET_BY_LEVEL(level) * 100;
  const getGrandAlbumReward = (level: number) => MAX_BET_BY_LEVEL(level) * 1000;

  const showGoldHeader = isHighLimit || (player.isVip && currentView === 'LOBBY');
  const freeCoinsAvailable = (Date.now() - (player.freeStashClaimedTime || 0)) > 86400000;
  const freeCoinsAmount = Math.floor(MAX_BET_BY_LEVEL(player.level) * 0.3);

  return (
    <div className="min-h-screen min-w-full bg-[#0a0015] flex items-center justify-center overflow-hidden">
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.52)] bg-[#120024]" style={{ width: 844, height: 390, transform: `scale(${mobileScale})`, transformOrigin: 'top center' }}>
        <div className={`w-full h-full bg-casino-bg text-white font-body overflow-hidden flex flex-col ${selectedGame.bgImage}`}>
          <header className="w-full z-[100] border-b-2 flex justify-between items-center shadow-[0_8px_15px_rgba(0,0,0,0.6)] h-[29px] md:h-[35px] select-none overflow-visible shrink-0"
            style={showGoldHeader ? { background:'linear-gradient(180deg,#c9901a,#7a5000)', borderBottomColor:'#8b6200' } : { background:'#7c3fb5', borderBottomColor:'#2a0d55' }}>
            {/* Bar B (Replicated from mockup - stats, lobby home, multipliers, mute) */}
            <div className="barB bar font-nunito w-full h-full flex items-center justify-between gap-1 md:gap-1.5 rounded-none p-1.5 px-3 md:px-6" style={{ borderTop:'none', ...(showGoldHeader ? { background:'linear-gradient(180deg,#c9901a,#7a5000)', borderColor:'#8b6200' } : {}) }}>
                {/* Lobby Home Button */}
                <div
                    onClick={currentView !== 'LOBBY' ? handleHeaderBack : () => setShowProfile(true)}
                    className="round-btn shrink-0 cursor-pointer"
                    style={showGoldHeader ? { background:'linear-gradient(180deg,#e0a820,#9a6800)', boxShadow:'0 2px 0 #5a3800' } : {}}
                >
                    <i className={currentView !== 'LOBBY' ? 'ti ti-arrow-left' : 'ti ti-user'}></i>
                </div>

                {/* Separate Coins & Gems pills joined closely */}
                <div className="flex items-center gap-[3px] md:gap-1.5 flex-1 max-w-[290px] md:max-w-[430px] shrink-0">
                    {/* Separate Coins Pill — 30% longer than before */}
                    <div className="currency-pill flex-[4] max-w-[195px] md:max-w-[289px] flex items-center gap-1 shrink-0">
                        <div className="coin">$</div>
                        <span className="num flex-1">{formatK(player.balance)}</span>
                    </div>

                    {/* Separate Gem Pill */}
                    <div className="currency-pill flex-[2] max-w-[100px] md:max-w-[148px] flex items-center gap-1 shrink-0">
                        <div className="gem"></div>
                        <span className="num flex-1">{formatK(player.diamonds)}</span>
                    </div>
                </div>

                {/* Buy & Sale Buttons (Adjacent to each other) */}
                <div className="flex items-center gap-1 shrink-0">
                    {/* Buy Button */}
                    <div 
                        onClick={() => openShop('COINS')}
                        className="btn green buyB shrink-0"
                    >
                        <div className="face text-center">
                            <span className="lbl">BUY</span>
                        </div>
                    </div>

                    {/* Sale Button */}
                    <div
                        onClick={() => setShowPremiumModal(true)}
                        className="btn pink saleB shrink-0"
                    >
                        <div className="face text-center">
                            <span className="lbl">SALE</span>
                        </div>
                    </div>
                </div>

                    {/* Piggy Bank quick button (left icons) */}
                    <div
                        onClick={handleOpenPiggyBank}
                        className={`round-btn shrink-0 ml-1 relative ${player.level < 5 ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                        title={player.level < 5 ? 'Unlocks at Level 5' : 'Piggy Bank'}
                        style={showGoldHeader ? { background:'linear-gradient(180deg,#e0a820,#9a6800)', boxShadow:'0 2px 0 #5a3800', overflow:'visible' } : { overflow:'visible' }}
                    >
                        <span style={{fontSize:16}}>🐷</span>
                    </div>

                {/* Star Experience Progression (No pill shape container, 2x long, star + bar) */}
                <div className="flex items-center gap-1 shadow-none shrink-0 border-none bg-transparent ml-2">
                    <div className="star shrink-0"></div>
                    <div className="rtrack !flex-none w-[90px] md:w-[150px] overflow-hidden relative">
                        <div
                            className="rfill"
                            style={{ width: `${(player.xp / player.xpToNextLevel) * 100}%`, ...(player.xpMultiplier >= 2 ? { background: 'linear-gradient(180deg,#ffe04d,#d4a017 60%,#a07010)', boxShadow: 'inset 0 1px 1px rgba(255,255,180,0.7)' } : {}) }}
                        ></div>
                        <span className="rnum relative z-10 font-black" style={{ fontSize: '18px' }}>{player.level}</span>
                    </div>
                </div>

                {/* Active Multiplier indicator */}
                <div className="mult shrink-0 ml-2" style={showGoldHeader ? { background:'linear-gradient(180deg,#e0a820,#9a6800)', boxShadow:'0 2px 0 #5a3800' } : {}}>
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
                </div>

                {/* Settings button */}
                <div
                    onClick={() => setShowSettings(true)}
                    className="round-btn shrink-0"
                    style={showGoldHeader ? { background:'linear-gradient(180deg,#e0a820,#9a6800)', boxShadow:'0 2px 0 #5a3800' } : {}}
                >
                    <i className="ti ti-settings"></i>
                </div>
            </div>
      </header>

      <main className="relative pt-0 w-full flex-1 flex flex-col overflow-hidden min-h-0">
        {currentView === 'HIGH_LIMIT' && (
            <HighLimitLobby
                onBack={() => setCurrentView('LOBBY')}
                onSelectGame={handleGameSelect}
                playerLevel={player.level}
            />
        )}
        {currentView === 'LOBBY' ? (
            <Lobby
                onSelectGame={handleGameSelect}
                onOpenWildQuest={handleWildQuestClaim}
                onOpenDiceQuest={handleDiceQuestClaim}
                onOpenMissions={openMissionsModal}
                onOpenBattlePass={openBattlePassModal}
                onClaimBonus={handleOpenTimeBonus}
                onOpenCollection={() => openModal('COLLECTION')}
                onOpenPiggyBank={handleOpenPiggyBank}
                onOpenInbox={() => setCelebrationMsg("Inbox coming soon!")}
                onToggleVIP={handleToggleVIP}
                questState={quest}
                missionState={missionState}
                nextTimeBonus={nextBonusTime}
                bonusAmount={CALCULATE_TIME_BONUS(player.level)}
                isHighLimit={isHighLimit}
                isVip={!!player.isVip}
                playerLevel={player.level}
                currentBet={MAX_BET_BY_LEVEL(player.level)}
                piggyBank={player.piggyBank}
                piggyMaxBet={MAX_BET_BY_LEVEL(player.level)}
            />
        ) : (
            <div className="flex-1 flex flex-col items-center justify-start p-0 m-0 relative h-full pb-[56px] md:pb-[64px] max-w-3xl mx-auto w-full select-none min-h-0 gap-0">

                {/* Quest + Pass vertical panel — always visible in game view */}
                {(() => {
                    const qReady = false;
                    const missReady = missionState.activeMissions.filter((m: any) => m.completed && !m.claimed).length;
                    const passReady = missionState.passRewards.filter((r: any) => r.level <= missionState.passLevel && !r.claimed && (r.tier === 'FREE' || missionState.isPremium)).length;
                    const totalNotifs = missReady + passReady;
                    const isQuestLocked = player.level < 20;
                    const isPassLocked = player.level < 10;
                    return (
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 z-40 flex flex-col select-none"
                            style={{ background: isHighLimit ? 'linear-gradient(180deg,#c9901a,#7a5000)' : 'linear-gradient(180deg,#7c3fb5,#4a1880)', border: isHighLimit ? '1.5px solid #8b6200' : '1.5px solid #38106e', borderRadius:'21px', padding:'6px 6px', gap:'2px', boxShadow:'0 4px 14px rgba(0,0,0,0.6),inset 0 1px 1px rgba(255,255,255,0.18)', width:'69px' }}>
                            <button
                                onClick={!isQuestLocked ? handleWildQuestClaim : undefined}
                                className={`relative flex flex-col items-center justify-center gap-0.5 transition-transform ${isQuestLocked ? 'grayscale opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                                style={{ padding:'3px 3px' }}
                            >
                                {isQuestLocked
                                    ? <span className="text-[28px] leading-none">🔒</span>
                                    : <>
                                        {quest.wildCredits > 0 && (
                                            <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-600 rounded-full border-2 border-yellow-400 flex items-center justify-center text-[11px] text-white font-black z-10" style={{ WebkitTextStroke:'0.5px #000', paintOrder:'stroke fill' }}>
                                                {quest.wildCredits}
                                            </div>
                                        )}
                                        <span className="text-[36px] leading-none">🗿</span>
                                      </>
                                }
                                <span className="text-[11px] font-black text-white/90 uppercase tracking-wider leading-none">Wild</span>
                            </button>
                            <button
                                onClick={!isQuestLocked ? handleDiceQuestClaim : undefined}
                                className={`relative flex flex-col items-center justify-center gap-0.5 transition-transform ${isQuestLocked ? 'grayscale opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                                style={{ padding:'3px 3px' }}
                            >
                                {isQuestLocked
                                    ? <span className="text-[28px] leading-none">🔒</span>
                                    : <>
                                        {quest.diceCredits > 0 && (
                                            <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-600 rounded-full border-2 border-yellow-400 flex items-center justify-center text-[11px] text-white font-black z-10" style={{ WebkitTextStroke:'0.5px #000', paintOrder:'stroke fill' }}>
                                                {quest.diceCredits}
                                            </div>
                                        )}
                                        <span className="text-[36px] leading-none">🎲</span>
                                      </>
                                }
                                <span className="text-[11px] font-black text-white/90 uppercase tracking-wider leading-none">Dice</span>
                            </button>
                            <div style={{ height:'1px', background:'rgba(255,255,255,0.15)', margin:'0 6px' }}></div>
                            <button
                                onClick={!isPassLocked ? openBattlePassModal : undefined}
                                className={`relative flex flex-col items-center justify-center gap-0.5 transition-transform ${isPassLocked ? 'grayscale opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                                style={{ padding:'3px 3px' }}
                            >
                                {isPassLocked
                                    ? <span className="text-[28px] leading-none">🔒</span>
                                    : <>
                                        {totalNotifs > 0 && (
                                            <div className="absolute -top-0.5 -right-0.5 w-6 h-6 bg-red-600 rounded-full border-2 border-yellow-400 flex items-center justify-center text-[14px] text-white font-black z-10" style={{ WebkitTextStroke:'0.5px #000', paintOrder:'stroke fill' }}>
                                                {totalNotifs}
                                            </div>
                                        )}
                                        <span className="text-[36px] leading-none">🎫</span>
                                      </>
                                }
                                <span className="text-[11px] font-black text-white/90 uppercase tracking-wider leading-none">Pass</span>
                            </button>
                        </div>
                    );
                })()}
                <div className="w-full z-10 p-0 m-0">
                    <JackpotTicker slotIdx={GAMES_CONFIG.findIndex(g => g.id === selectedGame.id)} currentBet={availableBets[betIndex]} isSpinning={status === GameStatus.SPINNING || status === GameStatus.STOPPING} />
                </div>

                <div className="flex-1 flex items-center justify-center w-full min-h-0 relative m-0 p-0">
                    <div
                        className={`relative z-10 bg-black/60 p-1 md:p-1.5 shadow-2xl h-full max-h-full overflow-hidden
                            ${selectedGame.theme === 'PIGGY' ? 'flex gap-2' : 'flex gap-0.5'}
                            ${selectedGame.theme === 'EGYPT'   ? 'rounded-none border-[3px] border-yellow-600' : ''}
                            ${selectedGame.theme === 'WESTERN' ? 'rounded-lg border-[4px] border-amber-800' : ''}
                            ${selectedGame.theme === 'SPACE'   ? 'rounded-lg border-[2px] border-cyan-400' : ''}
                            ${selectedGame.theme === 'CANDY'   ? 'rounded-lg border-[3px] border-pink-300' : ''}
                            ${!['EGYPT','WESTERN','SPACE','CANDY'].includes(selectedGame.theme) ? 'rounded-xl' : ''}
                            ${isHighLimit ? 'shadow-[0_0_30px_rgba(220,180,0,0.4)]' : ''}
                        `}
                        style={{ aspectRatio: `${selectedGame.reels}/${selectedGame.rows}` }}
                    >
                        {grid.map((col, i) => (
                            <Reel 
                                key={i} 
                                id={i} 
                                symbols={targetGrid.length > 0 ? targetGrid[i] : col} 
                                spinning={status === GameStatus.SPINNING || status === GameStatus.STOPPING} 
                                stopping={status === GameStatus.STOPPING} 
                                stopDelay={instantStop ? 0 : i * (fastSpin && freeSpinsRemaining === 0 ? 50 : REEL_DELAY)}
                                duration={fastSpin && freeSpinsRemaining === 0 ? 200 : SPIN_DURATION} 
                                onStop={handleReelStop} 
                                winningIndices={winData?.winningCells.filter(cell => cell.col === i).map(c => c.row) || []} 
                                gameConfig={selectedGame} 
                                isScatterShowcase={status === GameStatus.SCATTER_SHOWCASE} 
                            />
                        ))}
                    </div>
                </div>


            </div>
        )}
      </main>

      {currentView === 'GAME' && (
          <div className="fixed bottom-0 w-full z-50 border-t-2 shadow-[0_-10px_35px_rgba(0,0,0,0.85)] flex flex-col select-none"
            style={isHighLimit ? { background:'linear-gradient(180deg,#2a1a00,#1a0f00)', borderTopColor:'#8b6200' } : { background:'#120024', borderTopColor:'#2a0d55' }}>
              {/* Bar A (Replicated from mockup - Bet details, Win panel, Spin trigger) */}
              <div className="barA bar font-nunito w-full flex items-stretch gap-1 md:gap-1.5 rounded-none p-1.5 px-3 md:px-6 h-[56px] md:h-[64px]"
                style={isHighLimit ? { background:'linear-gradient(180deg,#c9901a,#7a5000)', borderColor:'#8b6200' } : {}}>
                  {/* Missions Button */}
                  {(() => {
                      const missReady = missionState.activeMissions.filter((m: any) => m.completed && !m.claimed).length;
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
                      className={`pm shrink-0 ${betIndex === 0 || status !== GameStatus.IDLE || freeSpinsRemaining > 0 ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
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
                      className={`pm shrink-0 ${(betIndex === availableBets.length - 1) || status !== GameStatus.IDLE || freeSpinsRemaining > 0 ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                      style={isHighLimit ? { background: 'linear-gradient(180deg,#e0a820,#9a6800)', border: '1px solid #8b6200', color: '#fff' } : {}}
                  >
                      +
                  </div>

                  {/* Win Panel */}
                  <div className="winpanel flex-1 flex flex-col items-center justify-center">
                      <span className="lets-spin">
                          {freeSpinsRemaining > 0 ? (
                              formatCommaNumber(freeSpinTotalWin)
                          ) : status === GameStatus.SPINNING || status === GameStatus.STOPPING ? (
                              'SPINNING...'
                          ) : winData?.payout && winData.payout > 0 ? (
                              formatWinNumber(winData.payout)
                          ) : (
                              "LET'S SPIN!"
                          )}
                      </span>
                      <span className="total-win">
                          {freeSpinsRemaining > 0 ? `FREE SPINS: ${freeSpinsRemaining}` : 'TOTAL WIN'}
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
                      className={`flat blue maxbet shrink-0 ${status !== GameStatus.IDLE || betIndex === availableBets.length - 1 || freeSpinsRemaining > 0 ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
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
                      onTouchStart={handleSpinMouseDown}
                      onTouchEnd={handleSpinMouseUp}
                      className={`flat ${isStop ? 'red' : 'green'} spinA shrink-0 ${activeModal !== 'NONE' || showFreeSpinsPopup ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                  >
                      <div className="flat-face">
                          <div className="flat-in h-full">
                              <span className="lbl">
                                  {player.autoSpin ? 'STOP' : (status === GameStatus.SPINNING || status === GameStatus.STOPPING) ? 'STOP' : (freeSpinsRemaining > 0 ? 'AUTO' : 'SPIN')}
                              </span>
                              <span className="sub">
                                  {player.autoSpin ? 'AUTO ACTIVE' : 'HOLD FOR AUTOSPIN'}
                              </span>
                          </div>
                      </div>
                  </div>
                  );
                  })()}
              </div>
          </div>
      )}

    <ShopModal isOpen={activeModal === 'SHOP'} onClose={() => {
        setActiveModal('NONE');
        if (cardModalReturnTab) {
            const tab = cardModalReturnTab;
            setCardModalReturnTab(null);
            setTimeout(() => {
                setCardInitialTab(tab);
                setActiveModal('COLLECTION');
            }, 50);
        }
    }} onBuy={handleShopBuy} level={player.level} isFreeStashClaimed={!freeCoinsAvailable} freeCoinsAmount={freeCoinsAmount} freeCoinsAvailable={freeCoinsAvailable} initialTab={shopInitialTab} balance={player.balance} diamonds={player.diamonds} maxBet={MAX_BET_BY_LEVEL(player.level)} claimedItems={player.shopClaimedItems || []} onClaimItem={handleClaimShopItem} />
      
      <CardCollectionModal
          isOpen={activeModal === 'COLLECTION'}
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
          grandPrize={getGrandAlbumReward(player.level)}
          getDeckReward={(id) => getDeckReward(player.level)}
          balance={player.balance}
      />
      
      <MiniGameModal
        isOpen={activeModal === 'MINIGAME'}
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
        onGridUpdate={handleWildGridUpdate} // Update grid
        onDiceRoll={handleDiceRoll}
        onClose={() => setActiveModal('NONE')}
        playerLevel={player.level}
        maxBet={MAX_BET_BY_LEVEL(player.level)}
      />
      
      <MissionPassModal
          isOpen={activeModal === 'MISSIONS'}
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
          maxBet={MAX_BET_BY_LEVEL(player.level)}
      />
      
      <TimeBonusModal isOpen={activeModal === 'TIME_BONUS'} onClose={() => setActiveModal('NONE')} timers={bonusTimers} onClaim={handleClaimTimeBonus} />
      
      <LoginBonusModal isOpen={activeModal === 'LOGIN_BONUS'} currentDay={loginState.currentDay} maxBet={MAX_BET_BY_LEVEL(player.level)} onClaim={handleClaimLoginBonus} />
      
    <PiggyBankModal isOpen={activeModal === 'PIGGY'} onClose={() => setActiveModal('NONE')} amount={player.piggyBank} diamonds={player.diamonds} onBreak={handleBreakPiggy} level={player.level} maxBet={MAX_BET_BY_LEVEL(player.level)} balance={player.balance} />

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

      <JackpotCelebration tier={jackpotWinTier} onClose={handleJackpotClose} />
      <StageCompleteModal
          isOpen={stageCompletePopup !== null}
          gameType={stageCompletePopup?.gameType || 'WILD'}
          stage={stageCompletePopup?.stage || 1}
          coins={stageCompletePopup?.coins || 0}
          diamonds={stageCompletePopup?.diamonds || 0}
          onNext={() => setStageCompletePopup(null)}
      />
      {showWinPopup && <WinPopup amount={winData?.payout || 0} type={winData?.winType || ''} onComplete={handleWinPopupComplete} />}
      
      <SimpleCelebrationModal isOpen={!!celebrationMsg} message={celebrationMsg} onClose={handleCloseCelebration} />
      
      {showFreeSpinsPopup && <FreeSpinsWonPopup isOpen={showFreeSpinsPopup} count={freeSpinsWon} onComplete={handleStartFreeSpins} />}
      
      {showLevelUp && currentView === 'GAME' && <LevelUpToast level={player.level} reward={levelUpReward} maxBetIncreased={maxBetIncreased} newMaxBet={MAX_BET_BY_LEVEL(player.level)} onClose={() => setShowLevelUp(false)} />}
      
      {showFreeSpinSummary && <FreeSpinSummary isOpen={showFreeSpinSummary} totalWin={freeSpinTotalWin} bet={availableBets[betIndex]} onClose={handleFreeSpinSummaryClose} />}
      
      <BankruptcyModal isOpen={showBankruptcy} onCollect={() => { setPlayer(p => ({ ...p, balance: p.balance + 100000 })); setShowBankruptcy(false); setCelebrationMsg("+100,000 Coins"); audioService.playWinBig(); }} />

      <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(audioService.toggleMute())}
          fastSpin={fastSpin}
          onToggleFastSpin={() => setFastSpin(f => !f)}
          onRedeem={(code) => {
              if (code === 'dev777') {
                  setPlayer(p => ({ ...p, level: 50, balance: p.balance + 1_000_000_000_000 }));
                  setCelebrationMsg('⚡ Level Rush! +1T Coins · Level 50');
              } else if (code === 'dev999') {
                  setPlayer(p => ({ ...p, balance: p.balance + 100_000_000_000_000 }));
                  setCelebrationMsg('💰 Coin Flood! +100T Coins');
              } else if (code === 'dev1') {
                  const now = Date.now();
                  setPlayer(p => ({ ...p, diamonds: p.diamonds + 50_000, isVip: true, xpMultiplier: 3, xpBoostEndTime: now + 24 * 60 * 60 * 1000 }));
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
                  setCelebrationMsg('💰 +10B Coins · +2,000 Gems');
              } else if (code === 'dev222') {
                  const now = Date.now();
                  setPlayer(p => ({
                      ...p,
                      isVip: true,
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
                  setCelebrationMsg('👑 GOD MODE! All Premium · Max Boosts');
              }
              audioService.playWinBig();
          }}
      />

      <VipLoungeModal
          isOpen={showVipLounge}
          onClose={() => setShowVipLounge(false)}
          isVip={!!player.isVip}
          onJoinVip={handleJoinVip}
      />

      <PremiumModal
          isOpen={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          isVip={!!player.isVip}
          isPremium={missionState.isPremium}
          maxBet={MAX_BET_BY_LEVEL(player.level)}
          onBuyVip={() => {
              setPlayer(p => ({ ...p, isVip: true }));
              setShowPremiumModal(false);
          }}
          onBuyPremium={() => {
              setMissionState(prev => ({ ...prev, isPremium: true, premiumExpiry: Date.now() + 2592000000 }));
              setShowPremiumModal(false);
          }}
      />

      <ProfileModal
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          player={player}
          isPremium={missionState.isPremium}
          passBoostMultiplier={missionState.passBoostMultiplier}
          passBoostEndTime={missionState.passBoostEndTime}
          recentGames={GAMES_CONFIG.filter(g => (player.stats?.recentSlots || []).includes(g.id)).sort((a, b) => (player.stats?.recentSlots || []).indexOf(a.id) - (player.stats?.recentSlots || []).indexOf(b.id))}
      />

        </div>
      </div>
    </div>
  );
};

export default App;