import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MiniGameReward, WildGridCell } from '../types';
import { formatNumber, formatCommaNumber } from '../constants';
import { audioService } from '../services/audioService';

interface MiniGameModalProps {
    isOpen: boolean;
    credits?: number;
    picks?: number;
    diceCredits?: number;
    wildCredits?: number;
    wildStage: number;
    diceStage: number;
    dicePosition: number;
    activeGame: 'NONE' | 'WILD' | 'DICE';
    savedGrid?: WildGridCell[];
    balance?: number;
    diamonds?: number;
    onSelectMode: (mode: 'NONE' | 'WILD' | 'DICE') => void;
    onBuyPicks: (amount: number, cost: number, currency: 'CREDITS' | 'GEMS') => void;
    onBuyQuestBundle?: (type: 'PICKS' | 'DICE', picks: number, dice: number, coins: number, gemCost: number, bonusGems: number) => void;
    onPickTile: (isGem: boolean, reward: MiniGameReward | null) => void;
    onBatchPick: (picksUsed: number, rewards: MiniGameReward[]) => void;
    onStageComplete: (bonusCoins: number, bonusDiamonds: number) => void;
    onGridUpdate?: (grid: WildGridCell[]) => void;
    onDiceRoll: (roll: number, newPosition: number, rewards: MiniGameReward[], isFinish: boolean) => void;
    onClose: () => void;
    playerLevel: number;
    maxBet?: number;
    onOpenGemShop?: () => void;
}

// Grid grows every 5 stages: 3 (1-5), 4 (6-10), 5 (11-15), 6 (16+)
const getGridSize = (stage: number) => Math.min(Math.floor((stage - 1) / 5) + 3, 6);
// Picks needed to open before the hidden gem appears: 2 at stage 1, +1 every 3 stages, max 12
const getGemRequirement = (stage: number) => Math.min(Math.floor((stage - 1) / 3) + 2, 12);
const GEM_COST = 100;

interface BoardStep {
    index: number;
    reward?: MiniGameReward;
    isFinish: boolean;
    isStart: boolean;
}

// --- 3D Dice Face Component ---
const DICE_DOTS: Record<number, number[]> = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

const DiceFace: React.FC<{ value: number; rolling: boolean; size?: number }> = ({ value, rolling, size = 72 }) => {
    const dots = DICE_DOTS[Math.max(1, Math.min(6, value))] || DICE_DOTS[1];
    return (
        <div className={`relative flex items-center justify-center select-none ${rolling ? 'animate-spin' : ''}`}
            style={{ width: size, height: size, background: 'linear-gradient(145deg,#ffffff,#e0e0e0)', borderRadius: Math.round(size * 0.18), boxShadow: `0 ${Math.round(size*0.07)}px 0 #aaa, 0 ${Math.round(size*0.12)}px ${Math.round(size*0.2)}px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.9)` }}>
            <div className="grid grid-cols-3 gap-0" style={{ width: size * 0.72, height: size * 0.72 }}>
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-center">
                        {dots.includes(i) && <div style={{ width: size * 0.14, height: size * 0.14, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%,#555,#111)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }} />}
                    </div>
                ))}
            </div>
        </div>
    );
};

const HDR = "linear-gradient(180deg,#6b21a8,#4c1d95)";

const Btn3D: React.FC<{ onClick?: () => void; disabled?: boolean; color?: string; shadow?: string; className?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({
    onClick, disabled, color = 'linear-gradient(180deg,#a855f7,#7c3aed)', shadow = '0 4px 0 #3b0764', className = '', style, children
}) => (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
        className={`btn-3d font-black uppercase tracking-wide transition-all active:translate-y-[2px] ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
        style={{ background: disabled ? '#333' : color, boxShadow: disabled ? 'none' : shadow, border: '1px solid rgba(255,255,255,0.2)', ...style }}>
        {children}
    </button>
);

export const MiniGameModal: React.FC<MiniGameModalProps> = ({
    isOpen, diceCredits: diceCreditsRaw, wildCredits: wildCreditsRaw, wildStage, diceStage, dicePosition = 0, activeGame, savedGrid,
    balance = 0, diamonds = 0,
    onSelectMode, onBuyPicks, onBuyQuestBundle, onPickTile, onBatchPick, onStageComplete, onGridUpdate, onDiceRoll, onClose, playerLevel, maxBet, onOpenGemShop
}) => {
    const diceCredits = diceCreditsRaw ?? 0;
    const wildCredits = wildCreditsRaw ?? 0;
    const currentGridSize = getGridSize(wildStage);
    const totalCells = currentGridSize * currentGridSize;

    const [grid, setGrid] = useState<WildGridCell[]>([]);
    const [stageWinning, setStageWinning] = useState(false);
    const [stagePending, setStagePending] = useState(false);
    const [stageClearData, setStageClearData] = useState<{coins: number; gems: number} | null>(null);
    const [noPicksMsg, setNoPicksMsg] = useState(false);
    const [showBuyPopup, setShowBuyPopup] = useState<'PICKS' | 'DICE' | null>(null);
    const [explodingCells, setExplodingCells] = useState<Set<number>>(new Set());
    const [starBuff, setStarBuff] = useState(false);

    const [isRolling, setIsRolling] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [diceValue, setDiceValue] = useState(1);
    const [visualPosition, setVisualPosition] = useState(dicePosition);
    const visualPositionRef = useRef(dicePosition);
    const [board, setBoard] = useState<BoardStep[]>([]);
    const [autoRoll, setAutoRoll] = useState(false);
    const rollButtonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressRef = useRef(false);
    const mouseIsDownRef = useRef(false);

    const boardLength = 10 + ((diceStage - 1) * 5);
    const boardContainerRef = useRef<HTMLDivElement>(null);

    const initGrid = useCallback(() => {
        const cells: WildGridCell[] = Array(totalCells).fill(null).map(() => ({ revealed: false, content: 'BLANK' as const }));
        // Rock distribution: 30% blank, 40% coins (50% reduced), 20% picks, 10% diamonds
        // No gem is placed at init — it appears dynamically after enough rocks are opened
        const baseCoin = Math.floor((maxBet || 10000) * 0.125 * Math.pow(1.10, wildStage - 1));
        for (let i = 0; i < totalCells; i++) {
            const r = Math.random();
            if (r < 0.50) {
                // stays BLANK (50% of tiles)
            } else if (r < 0.83) {
                cells[i] = { revealed: false, content: 'REWARD', reward: { type: 'COINS', value: baseCoin, label: formatNumber(baseCoin) } };
            } else if (r < 0.915) {
                cells[i] = { revealed: false, content: 'REWARD', reward: { type: 'PICKS', value: 1, label: '+1 Pick' } };
            } else if (r < 0.97) {
                cells[i] = { revealed: false, content: 'REWARD', reward: { type: 'PICKS', value: 2, label: '+2 Picks' } };
            } else {
                cells[i] = { revealed: false, content: 'REWARD', reward: { type: 'DIAMONDS', value: 5, label: '+5 Gems' } };
            }
        }
        // Add bomb cells on blank tiles (~10% chance each)
        for (let i = 0; i < totalCells; i++) {
            if (cells[i].content === 'BLANK' && Math.random() < 0.10) {
                cells[i] = { revealed: false, content: 'BOMB' };
            }
        }
        setGrid(cells);
        if (onGridUpdate) onGridUpdate(cells);
    }, [wildStage, totalCells, maxBet, onGridUpdate]);

    // Place gem on a random unrevealed blank/reward tile once enough rocks have been opened
    const checkAndPlaceGem = useCallback((currentGrid: WildGridCell[]): WildGridCell[] => {
        if (currentGrid.some(c => c.content === 'GEM')) return currentGrid;
        const revealed = currentGrid.filter(c => c.revealed).length;
        if (revealed < getGemRequirement(wildStage)) return currentGrid;
        const candidates = currentGrid
            .map((c, i) => (!c.revealed && (c.content === 'BLANK' || c.content === 'REWARD')) ? i : -1)
            .filter(i => i !== -1);
        if (candidates.length === 0) return currentGrid;
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        const next = [...currentGrid];
        next[pick] = { revealed: false, content: 'GEM' };
        return next;
    }, [wildStage]);

    const initBoard = useCallback(() => {
        const newBoard: BoardStep[] = [];
        const baseCoin = Math.floor((maxBet || 10000) * 0.1 * Math.pow(1.10, diceStage - 1));
        const preGoalIndex = boardLength - 1;
        for (let i = 0; i <= boardLength; i++) {
            let reward: MiniGameReward | undefined;
            if (i > 0 && i < boardLength) {
                // 15% chance of BACK on the tile just before the goal (was 30%)
                if (i === preGoalIndex && Math.random() < 0.15) {
                    reward = { type: 'BACK', value: 0, label: 'BACK!' };
                } else {
                    const r = Math.random();
                    if (r < 0.04) {
                        reward = { type: 'BACK', value: 0, label: 'BACK!' };
                    } else if (r < 0.34) {
                        const v = Math.floor(baseCoin * (0.5 + Math.random()));
                        reward = { type: 'COINS', value: v, label: formatNumber(v) };
                    } else if (r < 0.44) {
                        reward = { type: 'PICKS', value: 1, label: '×1' };
                    } else if (r < 0.505) {
                        reward = { type: 'PICKS', value: 2, label: '×2' };
                    } else if (r < 0.595) {
                        const gems = Math.floor(Math.random() * 46) + 5;
                        reward = { type: 'DIAMONDS', value: gems, label: `+${gems}` };
                    } else if (r < 0.645) {
                        const packs = Math.floor(Math.random() * 10) + 1;
                        reward = { type: 'PACKS', value: packs, label: `+${packs}` };
                    }
                    // else: blank tile (~35%)
                }
            }
            newBoard.push({ index: i, isStart: i === 0, isFinish: i === boardLength, reward });
        }
        // Every 3rd stage, place one 5× coin tile on a random coin tile
        if (diceStage % 3 === 0) {
            const coinIndices = newBoard
                .filter(s => !s.isStart && !s.isFinish && s.reward?.type === 'COINS')
                .map(s => s.index);
            if (coinIndices.length > 0) {
                const pick = coinIndices[Math.floor(Math.random() * coinIndices.length)];
                const step = newBoard.find(s => s.index === pick)!;
                step.reward = { type: 'STAR', value: baseCoin * 5, label: '5×' };
            }
        }
        setBoard(newBoard);
        setVisualPosition(0);
        setStarBuff(false);
    }, [boardLength, diceStage, maxBet]);

    useEffect(() => {
        if (isOpen) {
            setStageWinning(false);
            setStageClearData(null);
            setStagePending(false);
        } else {
            setIsRolling(false);
            setIsMoving(false);
            setAutoRoll(false);
        }
    }, [isOpen, activeGame]);

    useEffect(() => {
        if (!isOpen) return;
        if (activeGame === 'WILD') {
            if (!(savedGrid && savedGrid.length > 0)) initGrid();
        }
        if (activeGame === 'DICE') {
            if (board.length === 0 || board[board.length - 1].index !== boardLength) initBoard();
            if (!isMoving) setVisualPosition(dicePosition);
        }
    }, [isOpen, initGrid, activeGame, initBoard, boardLength, dicePosition, board.length, isMoving]);

    // Restore saved grid without touching stage-clear state
    useEffect(() => {
        if (isOpen && activeGame === 'WILD' && savedGrid && savedGrid.length > 0) {
            setGrid(savedGrid);
        }
    }, [isOpen, activeGame, savedGrid]);

    useEffect(() => {
        if (activeGame === 'DICE' && boardContainerRef.current) {
            const container = boardContainerRef.current;
            if (dicePosition === 0) {
                // START is at bottom of reversed list — scroll to bottom
                const t = setTimeout(() => {
                    if (boardContainerRef.current) boardContainerRef.current.scrollTop = boardContainerRef.current.scrollHeight;
                }, 80);
                return () => clearTimeout(t);
            }
            const active = container.querySelector('[data-active="true"]') as HTMLElement;
            if (active && container.offsetHeight > 0) {
                const containerRect = container.getBoundingClientRect();
                const activeRect = active.getBoundingClientRect();
                const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
                const target = relativeTop - container.offsetHeight / 2 + active.offsetHeight / 2;
                container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
            }
        }
    }, [visualPosition, activeGame, dicePosition]);

    useEffect(() => { visualPositionRef.current = visualPosition; }, [visualPosition]);

    useEffect(() => {
        if (autoRoll && stageWinning && stageClearData) {
            const t = setTimeout(() => {
                onStageComplete(stageClearData.coins, stageClearData.gems);
                setStageClearData(null);
                setStageWinning(false);
            }, 1500);
            return () => clearTimeout(t);
        }
    }, [autoRoll, stageWinning, stageClearData]);

    useEffect(() => {
        if (autoRoll && !isRolling && !isMoving && !stageWinning && !stagePending && diceCredits > 0) {
            const t = setTimeout(handleRollDice, 1000);
            return () => clearTimeout(t);
        } else if (autoRoll && diceCredits <= 0) setAutoRoll(false);
    }, [autoRoll, isRolling, isMoving, stageWinning, stagePending, diceCredits]);

    const triggerStageClear = useCallback((coins: number, gems: number) => {
        audioService.playScatterTrigger();
        setStagePending(true);
        setTimeout(() => {
            setStagePending(false);
            setStageClearData({ coins, gems });
            setStageWinning(true);
        }, 2000);
    }, []);

    const handleTileClick = (index: number) => {
        if (grid[index].revealed || stageWinning || stagePending) return;
        if (wildCredits <= 0) {
            setNoPicksMsg(true);
            setTimeout(() => setNoPicksMsg(false), 2000);
            return;
        }
        const cell = grid[index];
        const newGrid = [...grid.map(c => ({ ...c }))];
        newGrid[index] = { ...cell, revealed: true };

        if (cell.content === 'BOMB') {
            // Collect up to 3 random unrevealed neighbors with explode animation
            const row = Math.floor(index / currentGridSize);
            const col = index % currentGridSize;
            const neighbors: number[] = [];
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = row + dr;
                    const nc = col + dc;
                    if (nr >= 0 && nr < currentGridSize && nc >= 0 && nc < currentGridSize) {
                        const ni = nr * currentGridSize + nc;
                        if (!newGrid[ni].revealed) neighbors.push(ni);
                    }
                }
            }
            for (let i = neighbors.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
            }
            const explodeCount = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
            const explodeTargets = neighbors.slice(0, explodeCount);
            setExplodingCells(new Set(explodeTargets));
            setGrid(newGrid);
            if (onGridUpdate) onGridUpdate(newGrid);
            audioService.playWinBig();
            setTimeout(() => {
                setExplodingCells(new Set());
                const finalGrid = newGrid.map(c => ({ ...c }));
                const surroundingRewards: MiniGameReward[] = [];
                let gemFoundFromBomb = false;
                for (const ni of explodeTargets) {
                    finalGrid[ni] = { ...finalGrid[ni], revealed: true };
                    if (finalGrid[ni].content === 'GEM') gemFoundFromBomb = true;
                    else if (finalGrid[ni].content === 'REWARD' && finalGrid[ni].reward) surroundingRewards.push(finalGrid[ni].reward!);
                }
                const finalGridWithGem = gemFoundFromBomb ? finalGrid : checkAndPlaceGem(finalGrid);
                setGrid(finalGridWithGem);
                if (onGridUpdate) onGridUpdate(finalGridWithGem);
                onBatchPick(1, surroundingRewards);
                if (gemFoundFromBomb) {
                    triggerStageClear(Math.floor((maxBet || 10000) * (3 + 0.1 * wildStage)), Math.floor(3 + 0.1 * wildStage));
                }
            }, 600);
            return;
        }

        const gridAfterGem = cell.content === 'GEM' ? newGrid : checkAndPlaceGem(newGrid);
        setGrid(gridAfterGem);
        if (onGridUpdate) onGridUpdate(gridAfterGem);
        if (cell.content === 'GEM') {
            audioService.playGemFound();
            triggerStageClear(Math.floor((maxBet || 10000) * (3 + 0.1 * wildStage)), Math.floor(3 + 0.1 * wildStage));
        } else if (cell.content === 'REWARD') {
            audioService.playWinSmall();
            onPickTile(false, cell.reward!);
        } else {
            audioService.playStoneBreak();
            onPickTile(false, null);
        }
    };

    const handleAutoPick = () => {
        if (wildCredits <= 0 || stageWinning || stagePending) return;
        const unrevealed = grid.map((c, i) => !c.revealed ? i : -1).filter(i => i !== -1);
        for (let i = unrevealed.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [unrevealed[i], unrevealed[j]] = [unrevealed[j], unrevealed[i]];
        }
        const count = Math.min(wildCredits, unrevealed.length);
        const newGrid = [...grid];
        const rewards: MiniGameReward[] = [];
        let gemFound = false;
        let used = 0;
        for (const idx of unrevealed.slice(0, count)) {
            used++;
            newGrid[idx] = { ...newGrid[idx], revealed: true };
            if (newGrid[idx].content === 'GEM') { gemFound = true; break; }
            else if (newGrid[idx].content === 'REWARD' && newGrid[idx].reward) rewards.push(newGrid[idx].reward!);
        }
        const autoGrid = gemFound ? newGrid : checkAndPlaceGem(newGrid);
        setGrid(autoGrid);
        if (onGridUpdate) onGridUpdate(autoGrid);
        if (used > 0) { onBatchPick(used, rewards); audioService.playClick(); }
        if (gemFound) {
            audioService.playGemFound();
            triggerStageClear(Math.floor((maxBet || 10000) * (3 + 0.1 * wildStage)), Math.floor(3 + 0.1 * wildStage));
        } else { if (rewards.length > 0) audioService.playWinSmall(); else audioService.playStoneBreak(); }
    };

    const movePlayerStepByStep = async (start: number, rollValue: number) => {
        setIsMoving(true);
        const endPos = Math.min(start + rollValue, boardLength);

        // Move forward step by step — no rewards collected mid-path
        for (let i = start + 1; i <= endPos; i++) {
            setVisualPosition(i);
            audioService.playClick();
            await new Promise(r => setTimeout(r, 380));
        }

        const isFinish = endPos >= boardLength;
        const landedStep = board.find(s => s.index === endPos);

        if (!isFinish && landedStep?.reward?.type === 'BACK') {
            // Move backward by the same roll value
            const backPos = Math.max(0, endPos - rollValue);
            await new Promise(r => setTimeout(r, 300));
            for (let i = endPos - 1; i >= backPos; i--) {
                setVisualPosition(i);
                audioService.playClick();
                await new Promise(r => setTimeout(r, 280));
            }
            // Collect reward at the tile where player landed after going back
            const backRewards: MiniGameReward[] = [{ type: 'BACK', value: 0, label: 'BACK!' }];
            const backPosStep = board.find(s => s.index === backPos);
            if (backPosStep?.reward && !backPosStep.isStart && backPosStep.reward.type !== 'BACK') {
                backRewards.push(backPosStep.reward);
                audioService.playWinSmall();
            }
            setIsMoving(false);
            onDiceRoll(rollValue, backPos, backRewards, false);
        } else {
            const rewards: MiniGameReward[] = [];
            if (landedStep?.reward && !isFinish && !landedStep.isStart) {
                rewards.push(landedStep.reward);
                // Star tile: apply 3× buff to all remaining coin/gem tiles
                if (landedStep.reward.type === 'STAR') {
                    setBoard(prev => prev.map(step => {
                        if ((step.reward?.type === 'COINS' || step.reward?.type === 'DIAMONDS') && step.index > endPos) {
                            const newValue = step.reward.value * 3;
                            return { ...step, reward: { ...step.reward, value: newValue, label: step.reward.type === 'COINS' ? formatNumber(newValue) : `+${Math.round(newValue)}` } };
                        }
                        return step;
                    }));
                    setStarBuff(true);
                    audioService.playWinBig();
                } else {
                    audioService.playWinSmall();
                }
            }
            setIsMoving(false);
            onDiceRoll(rollValue, endPos, rewards, isFinish);
            if (isFinish) { audioService.playWinBig(); }
        }
    };

    const handleNextStage = () => {
        if (!stageClearData) return;
        onStageComplete(stageClearData.coins, stageClearData.gems);
        setStageClearData(null);
        setStageWinning(false);
    };

    const handleRollDice = () => {
        if (diceCredits <= 0 || isRolling || isMoving) { if (diceCredits <= 0) setAutoRoll(false); return; }
        setIsRolling(true);
        audioService.playClick();
        let rolls = 0;
        const interval = setInterval(() => {
            setDiceValue(Math.floor(Math.random() * 6) + 1);
            rolls++;
            if (rolls > 12) {
                clearInterval(interval);
                const final = Math.floor(Math.random() * 6) + 1;
                setDiceValue(final);
                setIsRolling(false);
                movePlayerStepByStep(visualPositionRef.current, final);
            }
        }, 80);
    };

    const handleRollMouseDown = () => {
        if (diceCredits <= 0 || isRolling || isMoving) return;
        mouseIsDownRef.current = true;
        isLongPressRef.current = false;
        rollButtonTimeoutRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            if (!autoRoll) { setAutoRoll(true); audioService.playClick(); }
        }, 800);
    };

    const handleRollMouseUp = () => {
        if (!mouseIsDownRef.current) return;
        mouseIsDownRef.current = false;
        if (rollButtonTimeoutRef.current) { clearTimeout(rollButtonTimeoutRef.current); rollButtonTimeoutRef.current = null; }
        if (!isLongPressRef.current) {
            if (autoRoll) { setAutoRoll(false); audioService.playClick(); }
            else handleRollDice();
        }
    };

    if (!isOpen) return null;

    const isWild = activeGame === 'WILD';
    const questTitle = isWild ? 'CoinMine' : 'Fortune Trail';

    return (
        <div className="absolute inset-0 z-[150] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(160deg,#8028c8 0%,#6018a8 50%,#4a1090 100%)' }}>

            {/* Topbar */}
            <div className="relative shrink-0 flex items-center px-3 h-[38px] z-20"
                style={{ background: 'transparent' }}>
                {/* LEFT — currency pills */}
                <div className="flex items-center gap-1.5 shrink-0 z-10">
                    <div className="currency-pill flex items-center gap-1">
                        <div className="coin shrink-0">$</div>
                        <span className="num" style={{ fontSize: '10px' }}>{formatCommaNumber(balance)}</span>
                    </div>
                    <div className="currency-pill flex items-center gap-1">
                        <div className="gem shrink-0"></div>
                        <span className="num" style={{ fontSize: '10px' }}>{diamonds}</span>
                        {onOpenGemShop && (
                            <button onClick={() => { onClose(); setTimeout(onOpenGemShop, 50); }} className="pill-green" style={{ marginLeft: '2px' }}>
                                <div className="pill-face" style={{ padding: '1px 6px', fontSize: '8px' }}>Buy</div>
                            </button>
                        )}
                    </div>
                </div>
                {/* CENTER — title absolutely centered */}
                <span className="absolute left-0 right-0 text-center font-black text-white text-xs tracking-wide drop-shadow pointer-events-none">{questTitle}</span>
                {/* RIGHT — X */}
                <div className="round-btn cursor-pointer shrink-0 ml-auto z-10" onClick={onClose}><i className="ti ti-x"></i></div>
            </div>

            {/* ── COINMINE (Wild Quest) ── */}
            {activeGame === 'WILD' && (
                <div className="flex-1 flex overflow-hidden relative">
                    {noPicksMsg && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                            <div className="animate-pop-in px-5 py-3 rounded-2xl font-black text-white text-base uppercase tracking-widest"
                                style={{ background: 'rgba(0,0,0,0.9)', border: '2px solid #dc2626', boxShadow: '0 0 20px rgba(220,38,38,0.5)' }}>
                                <img src="/ui/pick.png" alt="" style={{ width: '1.2em', height: '1.2em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block', marginRight: 4 }} />No picks left!
                            </div>
                        </div>
                    )}
                    {stagePending && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-auto" style={{ background: 'rgba(0,0,0,0.72)' }}>
                            <div style={{ lineHeight: 1, filter: 'drop-shadow(0 0 32px rgba(96,165,250,1))' }} className="animate-vibrate">
                                <img src="/ui/stage_gem.png" alt="" style={{ width: '72px', height: '72px', objectFit: 'contain', display: 'block' }} />
                            </div>
                            <div className="mt-3 font-black text-white text-xl uppercase tracking-widest animate-pulse" style={{ textShadow: '0 0 20px rgba(96,165,250,0.9)' }}>Stage Clear!</div>
                        </div>
                    )}

                    {stageWinning && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.88)' }}>
                            <div style={{ lineHeight: 1, filter: 'drop-shadow(0 0 24px rgba(96,165,250,0.8))' }} className="animate-bounce"><img src="/ui/stage_gem.png" alt="" style={{ width: '80px', height: '80px', objectFit: 'contain', display: 'block' }} /></div>
                            <div className="mt-3 text-2xl font-black text-white uppercase tracking-widest">Stage Clear!</div>
                            {stageClearData && (
                                <>
                                    <div className="mt-3 flex flex-col items-center gap-1">
                                        <div className="font-black text-yellow-300 text-xl drop-shadow flex items-center gap-1"><img src="/symbols/coin.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> +{formatCommaNumber(stageClearData.coins)}</div>
                                        <div className="font-black text-blue-300 text-sm flex items-center gap-1"><img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> +{stageClearData.gems} Gems</div>
                                    </div>
                                    <button onClick={handleNextStage}
                                        className="mt-5 btn-3d px-8 py-2.5 rounded-xl font-black text-sm uppercase text-white tracking-widest"
                                        style={{ background: 'linear-gradient(180deg,#22c55e,#15803d)', boxShadow: '0 3px 0 #0a4a23' }}>
                                        Next Stage →
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Rock grid */}
                    <div className="flex-1 flex items-center justify-center p-3">
                        <div className="relative p-2">
                            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${currentGridSize}, minmax(0, 1fr))` }}>
                                {grid.map((cell, i) => {
                                    const revealed = cell.revealed;
                                    const isExploding = explodingCells.has(i);
                                    const isGem = revealed && cell.content === 'GEM';
                                    const isReward = revealed && cell.content === 'REWARD';
                                    const isBomb = cell.content === 'BOMB';
                                    const tileSize = currentGridSize >= 6 ? 56 : currentGridSize >= 5 ? 64 : currentGridSize >= 4 ? 72 : 84;
                                    const gemPrize = Math.floor((maxBet || 10000) * (3 + 0.1 * wildStage));
                                    const icon: React.ReactNode = isGem ? <img src="/symbols/diamond.png" alt="" style={{ width: tileSize * 0.62, height: tileSize * 0.62, objectFit: 'contain', display: 'inline-block' }} /> : isReward
                                        ? (cell.reward?.type === 'COINS' ? <img src="/symbols/coin.png" alt="" style={{ width: tileSize * 0.62, height: tileSize * 0.62, objectFit: 'contain', display: 'inline-block' }} /> : cell.reward?.type === 'PICKS' ? <img src="/ui/pick.png" alt="" style={{ width: tileSize * 0.62, height: tileSize * 0.62, objectFit: 'contain', display: 'inline-block' }} /> : <img src="/symbols/diamond.png" alt="" style={{ width: tileSize * 0.62, height: tileSize * 0.62, objectFit: 'contain', display: 'inline-block' }} />)
                                        : revealed && isBomb ? '💥' : null;
                                    const tileBg = revealed
                                        ? (isGem ? 'linear-gradient(180deg,#1d4ed8,#1e3a8a)' : isBomb ? 'linear-gradient(180deg,#b45309,#78350f)' : 'linear-gradient(180deg,#1f1f2e,#12121e)')
                                        : 'linear-gradient(180deg,#4c1d95,#2e1065)';
                                    return (
                                        <button key={i} onClick={() => handleTileClick(i)}
                                            disabled={revealed || wildCredits <= 0 || stageWinning || stagePending}
                                            className={`relative flex flex-col items-center justify-center rounded-xl active:translate-y-[2px] transition-all overflow-hidden${isExploding ? ' animate-bounce' : ''}`}
                                            style={{
                                                width: tileSize, height: tileSize,
                                                background: isExploding ? 'linear-gradient(180deg,#f97316,#c2410c)' : tileBg,
                                                boxShadow: isExploding ? '0 0 16px #f97316' : revealed ? 'none' : '0 4px 0 #1e0438, 0 6px 12px rgba(0,0,0,0.5)',
                                                border: revealed ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                                cursor: revealed || wildCredits <= 0 || stageWinning ? 'default' : 'pointer',
                                            }}>
                                            {isExploding ? (
                                                <span style={{ fontSize: tileSize * 0.72, lineHeight: 1 }}>💥</span>
                                            ) : revealed ? (
                                                icon ? (
                                                    <>
                                                        <span style={{ lineHeight: 1 }}>{icon}</span>
                                                        {isGem && <span style={{ fontSize: Math.max(8, tileSize * 0.16) }} className="font-black text-yellow-300 mt-0.5 leading-none text-center px-0.5">+{formatCommaNumber(gemPrize)}</span>}
                                                        {isReward && <span style={{ fontSize: Math.max(9, tileSize * 0.19) }} className="font-bold text-white/90 mt-0.5 leading-none">{cell.reward?.label}</span>}
                                                    </>
                                                ) : null
                                            ) : (
                                                <img src="/ui/rock.png" alt="" style={{ width: tileSize * 0.75, height: tileSize * 0.75, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right sidebar: stage counter, picks, buy button */}
                    <div className="shrink-0 flex flex-col items-center justify-center gap-2 px-2 py-3"
                        style={{ background: 'linear-gradient(180deg,rgba(160,60,255,0.3) 0%,rgba(160,60,255,0.3) 10%,rgba(10,0,50,0.75) 100%)', boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 4px 16px rgba(0,0,0,0.6)', width: 80, borderRadius: 16, margin: '8px 8px 8px 0', flexShrink: 0 }}>
                        <div className="flex flex-col items-center leading-none">
                            <span className="text-white/50 text-[8px] font-black tracking-widest">Stage</span>
                            <span className="font-black text-white text-2xl leading-none">{wildStage}</span>
                        </div>
                        <div className="w-full h-px bg-white/10" />
                        <div className="flex flex-col items-center leading-none">
                            <img src="/ui/pick.png" alt="" style={{ width: '1.4rem', height: '1.4rem', objectFit: 'contain' }} />
                            <span className="font-black text-white text-xl leading-none mt-0.5">{wildCredits}</span>
                            <span className="text-white/50 text-[8px] font-black">Picks</span>
                        </div>
                        <button onClick={() => setShowBuyPopup('PICKS')} className="pill-green w-full">
                            <div className="pill-face" style={{ padding: '5px 6px', fontSize: '9px' }}>Buy</div>
                        </button>
                    </div>
                </div>
            )}

            {/* ── FORTUNE TRAIL (Dice Quest) ── */}
            {/* ── FORTUNE TRAIL (Dice Quest) ── */}
            {activeGame === 'DICE' && (
                <div className="flex-1 flex overflow-hidden">
                    {/* S-shape board — scrollable, snaps back to player on roll */}
                    <div className="flex-1 flex overflow-hidden p-2">
                        <div ref={boardContainerRef} className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1.5 py-2">
                            {(() => {
                                // 8 main tiles per row + 1 bridge = 9 per segment
                                // Layout: 12-column CSS grid, tiles in cols 3-10, bridge at col 10 (even) or col 3 (odd)
                                const MAIN = 8;
                                const SEG = 9;
                                const numSegs = Math.ceil(board.length / SEG);
                                const segments = Array.from({ length: numSegs }, (_, si) => ({
                                    si,
                                    main: board.slice(si * SEG, si * SEG + MAIN),
                                    bridge: board[si * SEG + MAIN],
                                }));
                                const renderCell = (step: typeof board[0]) => {
                                    const isHere = step.index === visualPosition;
                                    const isFiveX = step.reward?.type === 'STAR';
                                    const isBuffed = starBuff && !isFiveX && (step.reward?.type === 'COINS' || step.reward?.type === 'DIAMONDS') && step.index > visualPosition;
                                    const bg = step.isFinish ? 'linear-gradient(180deg,#f59e0b,#b45309)'
                                        : step.isStart ? 'linear-gradient(180deg,#22c55e,#15803d)'
                                        : step.reward?.type === 'BACK' ? 'linear-gradient(180deg,#dc2626,#991b1b)'
                                        : isFiveX ? 'linear-gradient(180deg,#fbbf24,#d97706)'
                                        : step.reward?.type === 'COINS' ? 'linear-gradient(180deg,#ca8a04,#713f12)'
                                        : step.reward?.type === 'PICKS' ? 'linear-gradient(180deg,#7c3aed,#3b0764)'
                                        : step.reward?.type === 'DIAMONDS' ? 'linear-gradient(180deg,#0891b2,#0c4a6e)'
                                        : step.reward?.type === 'PACKS' ? 'linear-gradient(180deg,#d97706,#451a03)'
                                        : 'linear-gradient(180deg,#312e81,#1e1b4b)';
                                    const cellIcon: React.ReactNode = step.isFinish ? '🏆'
                                        : step.reward?.type === 'BACK' ? '⬅️'
                                        : isFiveX ? '⭐'
                                        : step.reward?.type === 'COINS' ? <img src="/symbols/coin.png" alt="" style={{ width: 'clamp(16px,3.5vw,22px)', height: 'clamp(16px,3.5vw,22px)', objectFit: 'contain', display: 'inline-block' }} />
                                        : step.reward?.type === 'PICKS' ? '🎲'
                                        : step.reward?.type === 'DIAMONDS' ? <img src="/symbols/diamond.png" alt="" style={{ width: 'clamp(16px,3.5vw,22px)', height: 'clamp(16px,3.5vw,22px)', objectFit: 'contain', display: 'inline-block' }} />
                                        : step.reward?.type === 'PACKS' ? '📦'
                                        : null;
                                    return (
                                        <div key={step.index}
                                            data-active={isHere ? 'true' : undefined}
                                            className={`relative flex flex-col items-center justify-center rounded-lg${isBuffed ? ' animate-pulse' : ''}`}
                                            style={{
                                                aspectRatio: '1',
                                                background: bg,
                                                overflow: 'hidden',
                                                boxShadow: isHere ? '0 0 0 2px #fde68a, 0 4px 12px rgba(0,0,0,0.5)'
                                                    : isBuffed ? '0 0 10px #fbbf24, 0 0 20px rgba(251,191,36,0.5), 0 3px 0 rgba(0,0,0,0.4)'
                                                    : isFiveX ? '0 0 8px #fbbf24, 0 3px 0 rgba(0,0,0,0.4)'
                                                    : '0 2px 0 rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)',
                                                border: isHere ? '2px solid #fde68a' : (isBuffed || isFiveX) ? '2px solid #fde68a' : '1px solid rgba(255,255,255,0.1)',
                                                transition: 'all 0.2s',
                                                transform: isHere ? 'scale(1.08)' : 'scale(1)',
                                            }}>
                                            <span className="absolute top-0.5 left-0.5 font-black text-white/30 leading-none" style={{ fontSize: 'clamp(5px,1vw,7px)' }}>
                                                {step.isStart ? '' : step.isFinish ? '' : step.index}
                                            </span>
                                            {isHere && (
                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                                                    <span style={{ fontSize: 'clamp(10px,2vw,14px)', lineHeight: 1 }}>🎲</span>
                                                </div>
                                            )}
                                            {step.isStart ? (
                                                <span style={{ fontSize: 'clamp(7px,1.8vw,10px)', fontWeight: 900, color: 'white', lineHeight: 1 }}>START</span>
                                            ) : cellIcon ? (
                                                <div className="flex flex-col items-center" style={{ gap: 1 }}>
                                                    <span style={{ lineHeight: 1, fontSize: 'clamp(14px,3vw,20px)' }}>{cellIcon}</span>
                                                    {step.reward?.label && step.reward.type !== 'BACK' && (
                                                        <span style={{ fontSize: 'clamp(7px,1.5vw,10px)', fontWeight: 900, color: 'white', lineHeight: 1, textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.reward.label}</span>
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                };
                                return [...segments].reverse().map(({ si, main, bridge }) => {
                                    const isEven = si % 2 === 0;
                                    // Single 12-column CSS grid per segment: cols 1-2 blank, cols 3-10 for 8 main tiles, cols 11-12 blank
                                    // Bridge (9th tile) sits at col 10 (even) or col 3 (odd) in row 1 — directly above the corner main tile in row 2
                                    return (
                                        <div key={si} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
                                            {bridge && (
                                                <div style={{ gridColumn: isEven ? 10 : 3, gridRow: 1, minWidth: 0 }}>
                                                    {renderCell(bridge)}
                                                </div>
                                            )}
                                            {main.map((step, idx) => (
                                                <div key={step.index} style={{ gridColumn: isEven ? 3 + idx : 10 - idx, gridRow: bridge ? 2 : 1, minWidth: 0 }}>
                                                    {renderCell(step)}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* Right sidebar — stage, dice counter, buy, dice face, roll button */}
                    <div className="shrink-0 flex flex-col items-center gap-2 px-2 py-3"
                        style={{ background: 'linear-gradient(180deg,rgba(160,60,255,0.3) 0%,rgba(160,60,255,0.3) 10%,rgba(10,0,50,0.75) 100%)', boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 4px 16px rgba(0,0,0,0.6)', width: 90, borderRadius: 16, margin: '8px 8px 8px 0', flexShrink: 0 }}>
                        <div className="flex flex-col items-center leading-none">
                            <span className="text-white/50 text-[8px] font-black tracking-widest">Stage</span>
                            <span className="font-black text-white text-2xl leading-none">{diceStage}</span>
                        </div>
                        <div className="w-full h-px bg-white/10" />
                        <div className="flex flex-col items-center leading-none">
                            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🎲</span>
                            <span className="font-black text-white text-xl leading-none mt-0.5">{diceCredits}</span>
                            <span className="text-white/50 text-[8px] font-black">Dice</span>
                        </div>
                        <button onClick={() => setShowBuyPopup('DICE')} className="pill-green w-full">
                            <div className="pill-face" style={{ padding: '5px 6px', fontSize: '9px' }}>Buy</div>
                        </button>
                        <div className="flex-1" />
                        <DiceFace value={diceValue} rolling={isRolling} size={52} />
                        <button
                            onMouseDown={handleRollMouseDown}
                            onMouseUp={handleRollMouseUp}
                            onMouseLeave={handleRollMouseUp}
                            onTouchStart={handleRollMouseDown}
                            onTouchEnd={handleRollMouseUp}
                            disabled={diceCredits <= 0}
                            className="w-full py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:translate-y-[2px]"
                            style={{
                                background: autoRoll ? 'linear-gradient(180deg,#ef4444,#b91c1c)' : diceCredits > 0 ? 'linear-gradient(180deg,#fbbf24,#d97706)' : '#374151',
                                boxShadow: diceCredits > 0 ? (autoRoll ? '0 3px 0 #7f1d1d' : '0 3px 0 #92400e') : 'none',
                                border: '2px solid rgba(255,255,255,0.15)',
                                color: diceCredits > 0 ? (autoRoll ? 'white' : '#1c1917') : '#6b7280',
                                cursor: diceCredits <= 0 ? 'not-allowed' : 'pointer',
                            }}>
                            {autoRoll ? 'STOP' : 'ROLL'}
                        </button>
                    </div>
                </div>
            )}

            {/* Buy Picks/Dice Popup */}
            {showBuyPopup && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowBuyPopup(null)}>
                    <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ width: 300, background: 'linear-gradient(180deg,#9030d8 0%,#6018a8 18%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}
                        onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                            <div className="flex-1">
                                <div className="text-white font-black text-sm leading-none">
                                    {showBuyPopup === 'PICKS' ? 'Buy Picks' : 'Buy Dice'}
                                </div>
                                <div className="text-purple-300/60 text-[10px] mt-0.5">Bundles include coin bonus</div>
                            </div>
                            <div className="currency-pill flex items-center gap-1 shrink-0" style={{ background: 'rgba(0,0,0,0.55)' }}>
                                <img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', marginLeft: '-2px' }} />
                                <span className="num text-xs">{diamonds}</span>
                                {onOpenGemShop && (
                                    <button onClick={() => { setShowBuyPopup(null); onClose(); setTimeout(onOpenGemShop, 50); }} className="pill-green">
                                        <div className="pill-face" style={{ padding: '2px 6px', fontSize: '9px' }}>Buy</div>
                                    </button>
                                )}
                            </div>
                            <div className="round-btn cursor-pointer shrink-0" onClick={() => setShowBuyPopup(null)}><i className="ti ti-x" /></div>
                        </div>
                        {/* Bundle options */}
                        <div className="px-3 pb-3 flex gap-2">
                            {(showBuyPopup === 'PICKS'
                                ? [
                                    { label: 'Starter', picks: 5,  dice: 0,  coins: Math.round((maxBet || 10000) * 25),  bonusGems: 0, gemCost: 150 },
                                    { label: 'Pro',     picks: 20, dice: 0,  coins: Math.round((maxBet || 10000) * 100), bonusGems: 0, gemCost: 500 },
                                ]
                                : [
                                    { label: 'Starter', picks: 0,  dice: 5,  coins: Math.round((maxBet || 10000) * 25),  bonusGems: 0, gemCost: 150 },
                                    { label: 'Pro',     picks: 0,  dice: 20, coins: Math.round((maxBet || 10000) * 100), bonusGems: 0, gemCost: 500 },
                                ]
                            ).map(opt => {
                                const canAfford = diamonds >= opt.gemCost;
                                return (
                                    <div key={opt.label}
                                        className="flex-1 rounded-2xl flex flex-col items-center p-3 gap-1.5"
                                        style={{ background: 'linear-gradient(180deg,rgba(160,60,255,0.3) 0%,rgba(160,60,255,0.3) 10%,rgba(10,0,50,0.75) 100%)', boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)', opacity: canAfford ? 1 : 0.5 }}>
                                        <div className="text-white font-black text-sm">{opt.label}</div>
                                        <div className="w-full flex flex-col gap-1 my-1">
                                            <div className="flex items-center gap-1.5 text-white text-xs font-bold">
                                                {showBuyPopup === 'PICKS' ? <img src="/ui/pick.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }} /> : <span>🎲</span>}
                                                <span>+{showBuyPopup === 'PICKS' ? opt.picks : opt.dice} {showBuyPopup === 'PICKS' ? 'Picks' : 'Dice'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-yellow-200 text-xs font-bold">
                                                <img src="/symbols/coin.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} />
                                                <span>+{formatCommaNumber(opt.coins)}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { if (!canAfford) return; onBuyQuestBundle?.(showBuyPopup, opt.picks, opt.dice, opt.coins, opt.gemCost, opt.bonusGems); setShowBuyPopup(null); }}
                                            className={`pill-green w-full ${!canAfford ? 'opacity-40' : ''}`}>
                                            <div className="pill-face" style={{ padding: '6px 8px', fontSize: '10px' }}>
                                                <img src="/symbols/diamond.png" alt="" style={{ width: '0.9em', height: '0.9em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block', marginRight: 3 }} />{opt.gemCost}
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
