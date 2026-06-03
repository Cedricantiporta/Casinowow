import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SymbolType, GameStatus, PlayerState, WinData, QuestState, MiniGameReward, GameConfig, MissionState, MissionType, PassReward, Mission, Deck, Card, DailyLoginState, WildGridCell } from './types';
import { GAMES_CONFIG, GET_DYNAMIC_WEIGHTS, SPIN_DURATION, REEL_DELAY, INITIAL_BALANCE, GET_PAYLINES, XP_BASE_REQ, GET_ALL_BETS, MAX_BET_BY_LEVEL, formatNumber, formatCommaNumber, formatWinNumber, GET_SYMBOLS, AUTO_SPIN_DELAY, GENERATE_DAILY_MISSIONS, GENERATE_WEEKLY_MISSIONS, GENERATE_MONTHLY_MISSIONS, GENERATE_PASS_REWARDS, INITIAL_GEMS, PICKS_COST_IN_CREDITS, GENERATE_DECKS, CALCULATE_TIME_BONUS, DUPLICATE_CREDIT_VALUES, GENERATE_REPLACEMENT_MISSION, DAILY_LOGIN_REWARDS, PACK_COSTS, SCALE_COIN_REWARD } from './constants';
import { Reel } from './components/Reel';
import { WinPopup } from './components/WinPopup';
import { PaylinesOverlay } from './components/PaylinesOverlay';
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
import { audioService } from './services/audioService';

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

const formatBet = (num: number) => {
    if (num >= 10000000000) return formatNumber(num);
    return formatCommaNumber(num);
};

const App: React.FC = () => {
  const toastCountRef = useRef(0);
  const spinButtonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const [currentView, setCurrentView] = useState<'LOBBY' | 'GAME'>('LOBBY');
  const [selectedGame, setSelectedGame] = useState<GameConfig>(GAMES_CONFIG[0]);
  const [isHighLimit, setIsHighLimit] = useState(false);
  const [savedGameStates, setSavedGameStates] = useState<Record<string, SavedGameState>>({});

  const [player, setPlayer] = useState<PlayerState>({
    balance: INITIAL_BALANCE,
    diamonds: INITIAL_GEMS,
    tokens: 0, 
    packCredits: 0, 
    piggyBank: 0,
    level: 1,
    xp: 0,
    xpToNextLevel: XP_BASE_REQ,
    autoSpin: false,
    xpMultiplier: 1,
    xpBoostEndTime: 0,
    freeStashClaimed: false
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

  // Effect to update Golden Treasury rewards when level changes
  useEffect(() => {
      const base = CALCULATE_TIME_BONUS(player.level);
      // Logic: Quick = 0.5x, Daily = 2.5x, Mega = 10x Base
      const multipliers = [0.5, 2.5, 10];
      setBonusTimers(prev => prev.map(t => ({
          ...t,
          reward: Math.floor(base * multipliers[t.id])
      })));
  }, [player.level]);

  const [missionState, setMissionState] = useState<MissionState>({
      activeMissions: [...GENERATE_DAILY_MISSIONS(1), ...GENERATE_WEEKLY_MISSIONS(1), ...GENERATE_MONTHLY_MISSIONS(1)],
      passLevel: 1,
      passXP: 0,
      passXpToNext: 500, 
      passRewards: GENERATE_PASS_REWARDS(),
      isPremium: false,
      premiumExpiry: 0,
      passBoostMultiplier: 1,
      passBoostEndTime: 0
  });
  const [decks, setDecks] = useState<Deck[]>(GENERATE_DECKS());

  const [availableBets, setAvailableBets] = useState<number[]>(ALL_BETS);
  const [betIndex, setBetIndex] = useState(0);
  const [autoMaxBet, setAutoMaxBet] = useState(false);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
    const [grid, setGrid] = useState<SymbolType[][]>(Array(GAMES_CONFIG[0].reels).fill(null).map(() => Array(3).fill(SymbolType.SEVEN)));
  const [targetGrid, setTargetGrid] = useState<SymbolType[][]>([]);
  const [winData, setWinData] = useState<WinData | null>(null);
  const [stoppedReels, setStoppedReels] = useState(0);
  const [fastSpin, setFastSpin] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const savedFastSpinRef = useRef<boolean>(false); 
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [piggyGlow, setPiggyGlow] = useState(false);
  
  const [activeModal, setActiveModal] = useState<'NONE' | 'SHOP' | 'COLLECTION' | 'MINIGAME' | 'MISSIONS' | 'TIME_BONUS' | 'LOGIN_BONUS' | 'PIGGY' | 'FEATURE_UNLOCK'>('NONE');
  const [missionInitialView, setMissionInitialView] = useState<'MISSIONS' | 'PASS'>('MISSIONS');
  const [shopInitialTab, setShopInitialTab] = useState<'COINS' | 'BOOSTS' | 'DIAMONDS'>('COINS');
  
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
      credits: 0, 
      picks: 2, 
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
  
  const [loginState, setLoginState] = useState<DailyLoginState>({
      currentDay: 1,
      claimedToday: false,
      lastClaimTime: 0
  });

  const [celebrationMsg, setCelebrationMsg] = useState<string>("");

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
  
  const handleBreakPiggy = () => {
      // Dynamic Cost: Base 50 Gems, +1 Gem per 20,000 Coins
      // Capped at 1000 Gems
      const rawCost = Math.max(50, Math.floor(player.piggyBank / 20000));
      const breakCost = Math.min(rawCost, 1000);

      if (player.diamonds >= breakCost && player.piggyBank > 0) {
          const brokenAmount = Math.floor(player.piggyBank);
          if (brokenAmount > 0) {
              setPlayer(p => ({ 
                  ...p, 
                  balance: p.balance + brokenAmount, 
                  diamonds: p.diamonds - breakCost,
                  piggyBank: 0 
              }));
              setCelebrationMsg(`+${formatCommaNumber(brokenAmount)} Coins`);
              audioService.playWinBig();
          }
      } else {
          if (player.diamonds < breakCost) setCelebrationMsg(`Need ${breakCost} Gems!`);
          else setCelebrationMsg("Bank is empty!");
          audioService.playStoneBreak();
      }
  };

  const handleToggleVIP = () => {
      if (playerRef.current.level < 40) {
          audioService.playStoneBreak();
          setCelebrationMsg("VIP Limit Unlocks at Level 40");
          return;
      }
      setIsHighLimit(prev => !prev);
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
          const scaledCoins = SCALE_COIN_REWARD(reward.coins, player.level);
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
    
    const normalBets = ALL_BETS.filter(b => b <= maxAllowed);
    const vipBets = ALL_BETS.map(b => b * 10).filter(b => b <= maxAllowed * 10 && b >= 100000);

    let allowed = isHighLimit ? vipBets : normalBets;
    
    if (allowed.length === 0) allowed = [isHighLimit ? 100000 : 10000];

    allowed = Array.from(new Set(allowed)).sort((a,b) => a-b);
    
    if (JSON.stringify(allowed) !== JSON.stringify(availableBets)) {
        const currentBet = availableBets[betIndex];
        setAvailableBets(allowed);
        if (autoMaxBet) {
             setBetIndex(allowed.length - 1);
        } else {
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
    } else if (autoMaxBet) {
         setBetIndex(allowed.length - 1);
    }
  }, [player.level, availableBets, betIndex, autoMaxBet, isHighLimit]); 

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
      setMissionState(prev => ({ ...prev, passRewards: prev.passRewards.map(r => r.id === reward.id ? { ...r, claimed: true } : r) }));
      
      let msg = "";
      if (reward.type === 'COINS') {
          const scaledValue = SCALE_COIN_REWARD(reward.value, player.level);
          setPlayer(p => ({ ...p, balance: p.balance + scaledValue }));
          msg = `+${formatCommaNumber(scaledValue)} Coins`;
      } else if (reward.type === 'DIAMONDS') {
          setPlayer(p => ({ ...p, diamonds: p.diamonds + reward.value }));
          msg = `+${reward.value} Gems`;
      } else if (reward.type === 'XP_BOOST') {
          setPlayer(p => ({ ...p, xpMultiplier: reward.value, xpBoostEndTime: Date.now() + 1800000 })); 
          msg = `${reward.value}x XP Boost`;
      } else if (reward.type === 'CREDIT_BACK') {
          setQuest(q => ({ ...q, credits: q.credits + reward.value }));
          msg = `+${reward.value} Credits`;
      } else if (reward.type === 'PICKS') {
          setQuest(q => ({ ...q, picks: q.picks + reward.value }));
          msg = `+${reward.value} Picks`;
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
      let totalCredits = 0;
      let totalPicks = 0;
      let xpBoostApplied = false;

      rewardsToClaim.forEach(r => {
          if (r.type === 'COINS') totalCoins += SCALE_COIN_REWARD(r.value, player.level);
          else if (r.type === 'DIAMONDS') totalDiamonds += r.value;
          else if (r.type === 'CREDIT_BACK') totalCredits += r.value;
          else if (r.type === 'PICKS') totalPicks += r.value;
          else if (r.type === 'XP_BOOST') {
              setPlayer(p => ({ ...p, xpMultiplier: r.value, xpBoostEndTime: Date.now() + 1800000 }));
              xpBoostApplied = true;
          }
      });

      setPlayer(p => ({
          ...p,
          balance: p.balance + totalCoins,
          diamonds: p.diamonds + totalDiamonds
      }));
      setQuest(q => ({
          ...q,
          credits: q.credits + totalCredits,
          picks: q.picks + totalPicks
      }));
      
      const ids = new Set(rewardsToClaim.map(r => r.id));
      setMissionState(prev => ({
          ...prev,
          passRewards: prev.passRewards.map(r => ids.has(r.id) ? { ...r, claimed: true } : r)
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
      const megaMatchProb = isFreeSpin ? 0.24 : 0.16; 
      
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

      for(let c=0; c<cols; c++) {
           let eventTriggered = false;
           if (megaMatchActive && (cols > 3 ? (c >= 1 && c <= 3) : true)) {
                for(let r=0; r<rows; r++) newGrid[c][r] = megaMatchSymbol;
                eventTriggered = true;
           }
           
           if (!eventTriggered) {
               let wildStackChance = 0.0;
               if (cols >= 5) {
                    if (c === 2) wildStackChance = 0.12; 
                    if (c === 3) wildStackChance = 0.16;
                    if (c === 4) wildStackChance = 0.24;
               } else if (isSmallGrid) {
                   if (c === 1) wildStackChance = 0.06;
                   if (c === 2) wildStackChance = 0.08;
               } else {
                   if (c === 1) wildStackChance = 0.15;
                   if (c === 2) wildStackChance = 0.20;
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

      const scatterRoll = Math.random() * 100;
      let targetScatters = 0;
      if (scatterRoll >= 60) targetScatters = 1;
      if (scatterRoll >= 82) targetScatters = 2;
      if (scatterRoll >= 99.0) targetScatters = 3;
      if (scatterRoll >= 99.75) targetScatters = 4;

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

      return newGrid;
  }, [selectedGame, freeSpinsRemaining, spinsWithoutBonus]);

  const handleQuestModeSelect = (mode: 'NONE' | 'WILD' | 'DICE') => {
        setQuest(q => ({ ...q, activeGame: mode }));
  };

  const handleStageComplete = (gameType: 'WILD' | 'DICE', bonusCoins: number, bonusDiamonds: number) => {
      const stage = gameType === 'WILD' ? quest.wildStage : quest.diceStage;
      const scaledBonus = 1000000 * stage * player.level; // Logic derived from MiniGameModal, ensure consistency
      
      setPlayer(p => ({ ...p, balance: p.balance + scaledBonus, diamonds: p.diamonds + bonusDiamonds }));
      
      // Separate Progress Logic
      if (gameType === 'WILD') {
          setQuest(q => ({ ...q, wildStage: q.wildStage + 1, wildGrid: [] })); 
      } else {
          setQuest(q => ({ ...q, diceStage: q.diceStage + 1, dicePosition: 0 })); 
      }
      
      setCelebrationMsg(`${gameType === 'WILD' ? 'Wild' : 'Dice'} Stage Complete! +${formatCommaNumber(scaledBonus)}`);
      audioService.playWinBig();
  };

  // Handler to update Wild Grid state from modal to maintain persistence
  const handleWildGridUpdate = (newGrid: WildGridCell[]) => {
      setQuest(q => ({ ...q, wildGrid: newGrid }));
  };

  const handleDiceRoll = (roll: number, newPosition: number, rewards: MiniGameReward[], isFinish: boolean) => {
      setQuest(q => ({ ...q, picks: Math.max(0, q.picks - 1), dicePosition: newPosition })); 
      let msgParts = [];
      let totalCoins = 0;
      rewards.forEach(r => { if (r.type === 'COINS') totalCoins += r.value; });
      if (totalCoins > 0) {
          setPlayer(p => ({ ...p, balance: p.balance + totalCoins }));
          msgParts.push(`${formatCommaNumber(totalCoins)} Coins`);
      }
      if (isFinish) {
          // Note: Logic here needs to match handleStageComplete regarding rewards scaling
          const bonusCoins = 2000000 * quest.diceStage * player.level; 
          setPlayer(p => ({ ...p, balance: p.balance + bonusCoins }));
          setQuest(q => ({ ...q, diceStage: q.diceStage + 1, dicePosition: 0 }));
          msgParts.push(`Stage Clear! +${formatCommaNumber(bonusCoins)}`);
      }
      if (msgParts.length > 0) {
          setCelebrationMsg(msgParts.join('\n'));
          audioService.playWinBig();
      }
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
      // Piggy Bank Logic: 1% of Bet, Capped. Only saves if Level >= 5.
      if (player.level >= 5) {
          const savings = currentBet * 0.01;
          const cap = player.level * 2500000;
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
    } else {
        setFreeSpinsRemaining(prev => prev - 1);
        updateMissions(MissionType.SPIN_COUNT, 1);
    }
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
    
    const winTier = getWinTier(totalPayout, currentBet);
    setWinData({ payout: totalPayout, winningLines, winningCells, isBigWin: !!winTier, scattersFound: scatterCount, winType: winTier || undefined });

    if (totalFreeSpins > 0 && totalPayout > 0) setFreeSpinTotalWin(prev => prev + totalPayout);

    if (totalPayout > 0) {
       setPlayer(p => ({ ...p, balance: p.balance + totalPayout }));
       
       const xpGained = Math.floor(Math.sqrt(currentBet) * 10 * player.xpMultiplier); 
       
       addXp(xpGained);
       updateMissions(MissionType.WIN_COINS, totalPayout);
       if (winTier) updateMissions(MissionType.BIG_WIN_COUNT, 1);
       if (player.level >= 20 && Math.random() > 0.5) {
           setQuest(q => ({ ...q, credits: Math.min(q.max, q.credits + 1) }));
       }

       if (winTier) {
           audioService.playWinBig();
           setShowWinPopup(true);
           setStatus(GameStatus.WIN_ANIMATION);
       } else {
           audioService.playWinSmall();
           setStatus(GameStatus.WIN_ANIMATION);
           const effectiveFastSpin = fastSpin;
           setTimeout(() => setStatus(GameStatus.IDLE), effectiveFastSpin ? 300 : 1000);
       }
    } else {
       const lossXp = Math.floor((Math.sqrt(currentBet) * 10 * 0.2) * player.xpMultiplier);
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
              const reward = newLevel * 10000;
              const oldMax = MAX_BET_BY_LEVEL(prev.level);
              const newMax = MAX_BET_BY_LEVEL(newLevel);
              if (toastCountRef.current < 10) {
                  setLevelUpReward(reward);
                  setShowLevelUp(true);
                  setMaxBetIncreased(newMax > oldMax);
                  toastCountRef.current += 1;
              }
              updateMissions(MissionType.LEVEL_UP, 1);

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
  const handleQuestClaim = () => {
      if (player.level < 20) {
           setCelebrationMsg("Quest Unlocks at Level 20!");
           audioService.playStoneBreak();
           return;
      }
      openModal('MINIGAME');
      audioService.playClick();
  };
  const handleBuyPicks = (amount: number, cost: number, currency: 'CREDITS' | 'GEMS') => {
      if (currency === 'CREDITS') {
          if (quest.credits >= cost) {
              setQuest(q => ({ ...q, credits: q.credits - cost, picks: q.picks + amount }));
              audioService.playClick();
          }
      } else {
          if (player.diamonds >= cost) {
              setPlayer(p => ({ ...p, diamonds: p.diamonds - cost }));
              setQuest(q => ({ ...q, picks: q.picks + amount }));
              audioService.playClick();
          }
      }
  };
  const handleMiniGamePick = (isGem: boolean, reward: MiniGameReward | null) => {
      setQuest(q => ({ ...q, picks: Math.max(0, q.picks - 1) }));
      if (reward) {
          if (reward.type === 'COINS') { 
              setPlayer(p => ({ ...p, balance: p.balance + reward.value })); 
              setCelebrationMsg(`+${formatCommaNumber(reward.value)} Coins`); 
          }
          else if (reward.type === 'DIAMONDS') { setPlayer(p => ({ ...p, diamonds: p.diamonds + reward.value })); setCelebrationMsg(`+${reward.value} Gems`); }
          else if (reward.type === 'XP_BOOST') { setPlayer(p => ({ ...p, xpMultiplier: 2, xpBoostEndTime: Date.now() + 1800000 })); setCelebrationMsg(`XP Boost!`); }
          else if (reward.type === 'PICKS') { setQuest(q => ({ ...q, picks: q.picks + reward.value })); setCelebrationMsg(`+${reward.value} Picks`); }
      }
  };

  const handleBatchPick = (picksUsed: number, rewards: MiniGameReward[]) => {
      setQuest(q => ({ ...q, picks: Math.max(0, q.picks - picksUsed) }));
      
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
      if (totalPicksFound > 0) setQuest(q => ({ ...q, picks: q.picks + totalPicksFound }));
      if (xpBoostFound) setPlayer(p => ({ ...p, xpMultiplier: 2, xpBoostEndTime: Date.now() + 1800000 }));

      const parts = [];
      if (totalCoins > 0) parts.push(`${formatCommaNumber(totalCoins)} Coins`);
      if (totalGems > 0) parts.push(`${totalGems} Gems`);
      if (totalPicksFound > 0) parts.push(`${totalPicksFound} Picks`);
      if (xpBoostFound) parts.push("XP Boost");
      
      if (parts.length > 0) {
          setCelebrationMsg(`Auto Pick: +${parts.join(', ')}`);
          audioService.playWinBig();
      }
  };

  const handleGameSelect = (game: GameConfig, highLimit: boolean = false) => {
      const gameIndex = GAMES_CONFIG.findIndex(g => g.id === game.id);
      let unlockLevel = 0;
      if (gameIndex >= 3) unlockLevel = 32 + (gameIndex - 3) * 10;
      
      // Use a fresh reference to player level if available, or ref
      const currentLevel = playerRef.current.level;

      if (currentLevel < unlockLevel) {
          audioService.playStoneBreak();
          setCelebrationMsg(`Locked! Unlock at Level ${unlockLevel}`);
          return;
      }
      
      if (highLimit && currentLevel < 40) {
          audioService.playStoneBreak();
          setCelebrationMsg("VIP Limit Unlocks at Level 40");
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
      setIsHighLimit(highLimit);
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
          setPlayer(p => ({ ...p, balance: p.balance + amount, freeStashClaimed: cost === 0 ? true : p.freeStashClaimed }));
          setCelebrationMsg(`+${formatCommaNumber(amount)} Coins`);
          audioService.playWinBig();
      } else if (type === 'DIAMOND') {
          setPlayer(p => ({ ...p, diamonds: p.diamonds + amount }));
          setCelebrationMsg(`+${amount} Gems`);
          audioService.playWinBig();
      }
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
                  if (status === GameStatus.SPINNING) setStatus(GameStatus.STOPPING);
              }
          }
      }
  };

  const getDeckReward = (level: number) => {
      return (1000000 + (level * 500000)) * 100; 
  };
  const getGrandAlbumReward = (level: number) => {
      return (10000000 + (level * 2000000)) * 10000;
  };

  return (
    <div className="min-h-screen min-w-full bg-[#0a0015] flex items-center justify-center overflow-hidden">
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.52)] bg-[#120024]" style={{ width: 844, height: 390, transform: `scale(${mobileScale})`, transformOrigin: 'top center' }}>
        <div className={`w-full h-full bg-casino-bg text-white font-body overflow-hidden flex flex-col ${selectedGame.bgImage}`}>
          <header className="w-full z-[100] bg-[#7c3fb5] border-b-2 border-[#2a0d55] flex justify-between items-center shadow-[0_8px_15px_rgba(0,0,0,0.6)] h-[29px] md:h-[35px] select-none overflow-visible shrink-0">
            {/* Bar B (Replicated from mockup - stats, lobby home, multipliers, mute) */}
            <div className="barB bar font-nunito w-full h-full flex items-center justify-between gap-1 md:gap-1.5 rounded-none p-1.5 px-3 md:px-6" style={{borderTop:'none'}}>
                {/* Lobby Home Button */}
                <div 
                    onClick={currentView !== 'LOBBY' ? handleHeaderBack : undefined}
                    className={`round-btn shrink-0 ${currentView === 'LOBBY' ? 'opacity-65 cursor-default' : ''}`}
                >
                    <i className="ti ti-home"></i>
                </div>

                {/* Separate Coins & Gems pills joined closely */}
                <div className="flex items-center gap-[3px] md:gap-1.5 flex-1 max-w-[290px] md:max-w-[430px] shrink-0">
                    {/* Separate Coins Pill — 30% longer than before */}
                    <div className="currency-pill flex-[4] max-w-[195px] md:max-w-[289px] flex items-center gap-1 shrink-0">
                        <div className="coin">$</div>
                        <span className="num flex-1">{formatCommaNumber(player.balance)}</span>
                    </div>

                    {/* Separate Gem Pill */}
                    <div className="currency-pill flex-[2] max-w-[100px] md:max-w-[148px] flex items-center gap-1 shrink-0">
                        <div className="gem"></div>
                        <span className="num flex-1">{formatCommaNumber(player.diamonds)}</span>
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
                        onClick={() => openShop('BOOSTS')}
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
                        className={`round-btn shrink-0 ml-1 ${player.level < 5 ? 'opacity-50 grayscale pointer-events-none' : ''} ${player.piggyBank > 0 ? 'animate-pulse' : ''}`}
                        title={player.level < 5 ? 'Unlocks at Level 5' : 'Piggy Bank'}
                    >
                        <span style={{fontSize:16}}>🐷</span>
                    </div>

                {/* Star Experience Progression (No pill shape container, 2x long, star + bar) */}
                <div className="flex items-center gap-1 shadow-none shrink-0 border-none bg-transparent">
                    <div className="star shrink-0"></div>
                    <div className="rtrack !flex-none w-[90px] md:w-[150px] overflow-hidden relative">
                        <div 
                            className="rfill" 
                            style={{ width: `${(player.xp / player.xpToNextLevel) * 100}%` }}
                        ></div>
                        <span className="rnum relative z-10 text-[9px] font-black">{player.level}</span>
                    </div>
                </div>

                {/* Active Multiplier indicator */}
                <div className="mult shrink-0">
                    x{player.xpMultiplier}
                </div>

                {/* Dynamic Mute round-btn */}
                <div 
                    onClick={() => setIsMuted(audioService.toggleMute())}
                    className="round-btn shrink-0"
                >
                    <i className={`ti ${isMuted ? 'ti-volume-3' : 'ti-volume'}`}></i>
                </div>
            </div>
      </header>

      <main className="relative pt-0 w-full flex-1 flex flex-col overflow-hidden min-h-0">
        {currentView === 'LOBBY' ? (
            <Lobby 
                onSelectGame={handleGameSelect} 
                onOpenQuest={handleQuestClaim}
                onOpenMissions={openMissionsModal}
                onOpenBattlePass={openBattlePassModal}
                onClaimBonus={handleOpenTimeBonus}
                onOpenCollection={() => openModal('COLLECTION')}
                onOpenPiggyBank={handleOpenPiggyBank}
                onToggleVIP={handleToggleVIP}
                questState={quest}
                missionState={missionState}
                nextTimeBonus={nextBonusTime}
                bonusAmount={CALCULATE_TIME_BONUS(player.level)}
                isHighLimit={isHighLimit}
                playerLevel={player.level}
            />
        ) : (
            <div className="flex-1 flex flex-col items-center justify-start p-0 m-0 relative h-full pb-[56px] md:pb-[64px] max-w-3xl mx-auto w-full select-none min-h-0 gap-0">

                {/* Quest + Pass vertical panel — always visible in game view */}
                {(() => {
                    const qReady = quest.credits >= quest.max;
                    const missReady = missionState.activeMissions.filter((m: any) => m.completed && !m.claimed).length;
                    const passReady = missionState.passRewards.filter((r: any) => r.level <= missionState.passLevel && !r.claimed).length;
                    const totalNotifs = missReady + passReady;
                    const isQuestLocked = player.level < 20;
                    const isPassLocked = player.level < 10;
                    return (
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 z-40 flex flex-col select-none"
                            style={{ background:'linear-gradient(180deg,#7c3fb5,#4a1880)', border:'1.5px solid #38106e', borderRadius:'21px', padding:'9px 6px', gap:'3px', boxShadow:'0 4px 14px rgba(0,0,0,0.6),inset 0 1px 1px rgba(255,255,255,0.18)', width:'69px' }}>
                            <button
                                onClick={!isQuestLocked ? handleQuestClaim : undefined}
                                className={`relative flex flex-col items-center justify-center gap-0.5 transition-transform ${isQuestLocked ? 'grayscale opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                                style={{ padding:'7px 3px' }}
                            >
                                {isQuestLocked
                                    ? <span className="text-2xl leading-none">🔒</span>
                                    : <>
                                        {qReady && <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border border-white animate-bounce z-10"></div>}
                                        <span className="text-[30px] leading-none">{quest.activeGame === 'DICE' ? '🎲' : quest.activeGame === 'WILD' ? '🗿' : '🗺️'}</span>
                                      </>
                                }
                                <span className="text-[11px] font-black text-white/90 uppercase tracking-wider leading-none">Quest</span>
                            </button>
                            <div style={{ height:'1px', background:'rgba(255,255,255,0.15)', margin:'0 6px' }}></div>
                            <button
                                onClick={!isPassLocked ? openBattlePassModal : undefined}
                                className={`relative flex flex-col items-center justify-center gap-0.5 transition-transform ${isPassLocked ? 'grayscale opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                                style={{ padding:'7px 3px' }}
                            >
                                {isPassLocked
                                    ? <span className="text-2xl leading-none">🔒</span>
                                    : <>
                                        {totalNotifs > 0 && (
                                            <div className="absolute -top-0.5 -right-0.5 w-6 h-6 bg-red-600 rounded-full border border-white flex items-center justify-center text-[11px] text-white font-bold z-10 animate-pulse">
                                                {totalNotifs}
                                            </div>
                                        )}
                                        <span className="text-[30px] leading-none">🎫</span>
                                      </>
                                }
                                <span className="text-[11px] font-black text-white/90 uppercase tracking-wider leading-none">Pass</span>
                            </button>
                        </div>
                    );
                })()}
                <div className="w-full z-10 p-0 m-0">
                    <JackpotTicker currentBet={availableBets[betIndex]} />
                    {isHighLimit && (
                        <div className="text-center mt-0">
                            <span className="bg-red-650 text-white text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-widest shadow-lg inline-block text-shadow-md">High Limit</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex items-center justify-center w-full min-h-0 relative m-0 p-0">
                    <div className={`relative z-10 bg-black/60 p-1 md:p-1.5 rounded-xl shadow-2xl flex gap-1 h-full max-h-full aspect-[5/3] overflow-hidden ${isHighLimit ? 'shadow-[0_0_30px_rgba(220,38,38,0.35)] animate-pulse' : ''}`}>
                        {grid.map((col, i) => (
                            <Reel 
                                key={i} 
                                id={i} 
                                symbols={targetGrid.length > 0 ? targetGrid[i] : col} 
                                spinning={status === GameStatus.SPINNING || status === GameStatus.STOPPING} 
                                stopping={status === GameStatus.STOPPING} 
                                stopDelay={i * (fastSpin && freeSpinsRemaining === 0 ? 50 : REEL_DELAY)} 
                                duration={fastSpin && freeSpinsRemaining === 0 ? 200 : SPIN_DURATION} 
                                onStop={handleReelStop} 
                                winningIndices={winData?.winningCells.filter(cell => cell.col === i).map(c => c.row) || []} 
                                gameConfig={selectedGame} 
                                isScatterShowcase={status === GameStatus.SCATTER_SHOWCASE} 
                            />
                        ))}
                        <PaylinesOverlay winData={winData} rowCount={selectedGame.rows} />
                    </div>
                </div>

            </div>
        )}
      </main>

      {currentView === 'GAME' && (
          <div className="fixed bottom-0 w-full z-50 bg-[#120024] border-t-2 border-[#2a0d55] shadow-[0_-10px_35px_rgba(0,0,0,0.85)] flex flex-col select-none">
              {/* Bar A (Replicated from mockup - Bet details, Win panel, Spin trigger) */}
              <div className="barA bar font-nunito w-full flex items-stretch gap-1 md:gap-1.5 rounded-none p-1.5 px-3 md:px-6 h-[56px] md:h-[64px]">
                  {/* Missions Button */}
                  <div 
                      onClick={openMissionsModal}
                      className="icon-btn shrink-0 flex flex-col items-center justify-end"
                  >
                      <i className="ti ti-target-arrow"></i>
                      <span>MISSIONS</span>
                  </div>

                  {/* Minus Bet */}
                  <div 
                      onClick={() => {
                          if (betIndex > 0 && status === GameStatus.IDLE) {
                              setBetIndex(prev => prev - 1);
                              audioService.playClick();
                          }
                      }}
                      className={`pm shrink-0 ${betIndex === 0 || status !== GameStatus.IDLE || autoMaxBet ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                  >
                      −
                  </div>

                  {/* Bet Display */}
                  <div className="bet-disp shrink-0 flex flex-col items-center justify-center">
                      <span className="bet-amt">{formatBet(availableBets[betIndex])}</span>
                      <span className="bet-lbl">TOTAL BET</span>
                  </div>

                  {/* Plus Bet */}
                  <div 
                      onClick={() => {
                          if (betIndex < availableBets.length - 1 && status === GameStatus.IDLE) {
                              setBetIndex(prev => prev + 1);
                              audioService.playClick();
                          }
                      }}
                      className={`pm shrink-0 ${(betIndex === availableBets.length - 1) || status !== GameStatus.IDLE || autoMaxBet ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                  >
                      +
                  </div>

                  {/* Win Panel */}
                  <div className="winpanel flex-1 flex flex-col items-center justify-center">
                      <span className="lets-spin">
                          {status === GameStatus.SPINNING || status === GameStatus.STOPPING ? (
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
                          if (status === GameStatus.IDLE) {
                              setBetIndex(availableBets.length - 1);
                              setAutoMaxBet(prev => !prev);
                              audioService.playClick();
                          }
                      }}
                      className={`flat blue maxbet shrink-0 ${status !== GameStatus.IDLE ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                  >
                      <div className="flat-face">
                          <div className="flat-in h-full">
                              <span className="lbl">MAX</span>
                              <span className="lbl">BET</span>
                          </div>
                      </div>
                  </div>

                  {/* Spin Button */}
                  <div 
                      onMouseDown={handleSpinMouseDown}
                      onMouseUp={handleSpinMouseUp}
                      onTouchStart={handleSpinMouseDown}
                      onTouchEnd={handleSpinMouseUp}
                      className={`flat green spinA shrink-0 ${activeModal !== 'NONE' || showFreeSpinsPopup ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
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
              </div>
          </div>
      )}

    <ShopModal isOpen={activeModal === 'SHOP'} onClose={() => setActiveModal('NONE')} onBuy={handleShopBuy} level={player.level} isFreeStashClaimed={player.freeStashClaimed} initialTab={shopInitialTab} balance={player.balance} diamonds={player.diamonds} />
      
      <CardCollectionModal 
          isOpen={activeModal === 'COLLECTION'} 
          onClose={() => setActiveModal('NONE')} 
          onOpenShop={openShop}
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
        credits={quest.credits} 
        picks={quest.picks} 
        wildStage={quest.wildStage}
        diceStage={quest.diceStage}
        dicePosition={quest.dicePosition}
        activeGame={quest.activeGame}
        savedGrid={quest.wildGrid} // Pass saved grid
        onSelectMode={handleQuestModeSelect}
        onBuyPicks={handleBuyPicks} 
        onPickTile={handleMiniGamePick} 
        onBatchPick={handleBatchPick} 
        onStageComplete={(bonusCoins, bonusDiamonds) => handleStageComplete(quest.activeGame === 'DICE' ? 'DICE' : 'WILD', bonusCoins, bonusDiamonds)} 
        onGridUpdate={handleWildGridUpdate} // Update grid
        onDiceRoll={handleDiceRoll}
        onClose={() => setActiveModal('NONE')} 
        playerLevel={player.level}
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
      />
      
      <TimeBonusModal isOpen={activeModal === 'TIME_BONUS'} onClose={() => setActiveModal('NONE')} timers={bonusTimers} onClaim={handleClaimTimeBonus} />
      
      <LoginBonusModal isOpen={activeModal === 'LOGIN_BONUS'} currentDay={loginState.currentDay} onClaim={handleClaimLoginBonus} />
      
    <PiggyBankModal isOpen={activeModal === 'PIGGY'} onClose={() => setActiveModal('NONE')} amount={player.piggyBank} diamonds={player.diamonds} onBreak={handleBreakPiggy} level={player.level} balance={player.balance} />

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

      {showWinPopup && <WinPopup amount={winData?.payout || 0} type={winData?.winType || ''} onComplete={handleWinPopupComplete} />}
      
      <SimpleCelebrationModal isOpen={!!celebrationMsg} message={celebrationMsg} onClose={handleCloseCelebration} />
      
      {showFreeSpinsPopup && <FreeSpinsWonPopup isOpen={showFreeSpinsPopup} count={freeSpinsWon} onComplete={handleStartFreeSpins} />}
      
      {showLevelUp && <LevelUpToast level={player.level} reward={levelUpReward} maxBetIncreased={maxBetIncreased} newMaxBet={MAX_BET_BY_LEVEL(player.level)} onClose={() => setShowLevelUp(false)} />}
      
      {showFreeSpinSummary && <FreeSpinSummary isOpen={showFreeSpinSummary} totalWin={freeSpinTotalWin} bet={availableBets[betIndex]} onClose={handleFreeSpinSummaryClose} />}
      
      <BankruptcyModal isOpen={showBankruptcy} onCollect={() => { setPlayer(p => ({ ...p, balance: p.balance + 100000 })); setShowBankruptcy(false); setCelebrationMsg("+100,000 Coins"); audioService.playWinBig(); }} />

        </div>
      </div>
    </div>
  );
};

export default App;