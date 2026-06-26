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
    onStageComplete: (bonusCoins: number, bonusDiamonds: number, autoAdvance?: boolean) => void;
    onGridUpdate?: (grid: WildGridCell[]) => void;
    onDiceRoll: (roll: number, newPosition: number, rewards: MiniGameReward[], isFinish: boolean, cost?: number) => void;
    onClose: () => void;
    playerLevel: number;
    maxBet?: number;
    onOpenGemShop?: () => void;
}

// Grid dimensions cycle every 25 stages: 3×3, 3×4, 4×4, 5×4, 6×4, then resets
const getGridDimensions = (stage: number): { cols: number; rows: number } => {
    const cycle = (stage - 1) % 25;
    if (cycle < 5)  return { cols: 3, rows: 3 };
    if (cycle < 10) return { cols: 3, rows: 4 };
    if (cycle < 15) return { cols: 4, rows: 4 };
    if (cycle < 20) return { cols: 5, rows: 4 };
    return { cols: 6, rows: 4 };
};
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
        style={{ background: disabled ? '#333' : color, boxShadow: disabled ? 'none' : `${shadow}, inset 0 1px 0 rgba(255,255,255,0.15)`, ...style }}>
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
    const { cols: gridCols, rows: gridRows } = getGridDimensions(wildStage);
    const totalCells = gridCols * gridRows;

    const [grid, setGrid] = useState<WildGridCell[]>([]);
    const [stageWinning, setStageWinning] = useState(false);
    const [stagePending, setStagePending] = useState(false);
    const [stageClearData, setStageClearData] = useState<{coins: number; gems: number} | null>(null);
    const [noPicksMsg, setNoPicksMsg] = useState(false);
    const [showBuyPopup, setShowBuyPopup] = useState<'PICKS' | 'DICE' | null>(null);
    const [explodingCells, setExplodingCells] = useState<Set<number>>(new Set());
    const [shatteringCells, setShatteringCells] = useState<Set<number>>(new Set());
    const [starBuff, setStarBuff] = useState(false);

    const [isRolling, setIsRolling] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [diceValue, setDiceValue] = useState(1);
    const [visualPosition, setVisualPosition] = useState(dicePosition);
    const visualPositionRef = useRef(dicePosition);
    const [board, setBoard] = useState<BoardStep[]>([]);
    const [autoRoll, setAutoRoll] = useState(false);
    const [doubleRoll, setDoubleRoll] = useState(false);
    const [diceValue2, setDiceValue2] = useState(1);
    const [showDiceTip, setShowDiceTip] = useState(false);
    const rollButtonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressRef = useRef(false);
    const mouseIsDownRef = useRef(false);

    const boardLength = Math.round((10 + ((diceStage - 1) * 5)) * 1.4);
    const boardContainerRef = useRef<HTMLDivElement>(null);

    const initGrid = useCallback(() => {
        const cells: WildGridCell[] = Array(totalCells).fill(null).map(() => ({ revealed: false, content: 'BLANK' as const }));
        const baseCoin = Math.floor((maxBet || 10000) * 0.125 * Math.pow(1.10, wildStage - 1));
        for (let i = 0; i < totalCells; i++) {
            const r = Math.random();
            if (r < 0.50) {
                // stays BLANK
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
        // Add bomb cells on blank tiles
        for (let i = 0; i < totalCells; i++) {
            if (cells[i].content === 'BLANK' && Math.random() < 0.10) {
                cells[i] = { revealed: false, content: 'BOMB' };
            }
        }
        // Multiplier tiles: 2× always; 3× from stage 10; 4× from stage 15. Higher tiers are rarer.
        // Each multiplier tile ALWAYS hides a reward (never empty) and multiplies it by its factor.
        const num2x = Math.round((Math.floor(Math.random() * 2) + 1) * 1.6);          // 2–3 (most common)
        const num3x = wildStage >= 10 ? (Math.random() < 0.6 ? 1 : 0) : 0;            // fewer than 2×
        const num4x = wildStage >= 15 ? (Math.random() < 0.35 ? 1 : 0) : 0;           // fewest / rarest
        const blockCandidates = cells.map((c, i) => (c.content === 'BLANK' || c.content === 'REWARD') ? i : -1).filter(i => i !== -1);
        const relabel = (r: MiniGameReward, v: number): string =>
            r.type === 'COINS' ? formatNumber(v)
            : r.type === 'PICKS' ? `+${v} Pick${v > 1 ? 's' : ''}`
            : r.type === 'DIAMONDS' ? `+${v} Gems`
            : r.label;
        const placeBlock = (mult: 2 | 3 | 4) => {
            if (blockCandidates.length === 0) return;
            const randIdx = Math.floor(Math.random() * blockCandidates.length);
            const ci = blockCandidates.splice(randIdx, 1)[0];
            // Guarantee a reward: reuse the existing one, otherwise mint a coin reward.
            const baseReward: MiniGameReward = (cells[ci].content === 'REWARD' && cells[ci].reward)
                ? cells[ci].reward!
                : { type: 'COINS', value: baseCoin, label: formatNumber(baseCoin) };
            const mv = baseReward.value * mult;
            const multReward: MiniGameReward = { ...baseReward, value: mv, label: relabel(baseReward, mv) };
            const content = mult === 2 ? 'BLOCK_2X' : mult === 3 ? 'BLOCK_3X' : 'BLOCK_4X';
            cells[ci] = { revealed: false, content, blockBase: 'REWARD', reward: multReward, mult };
        };
        for (let b = 0; b < num4x; b++) placeBlock(4);
        for (let b = 0; b < num3x; b++) placeBlock(3);
        for (let b = 0; b < num2x; b++) placeBlock(2);
        setGrid(cells);
        if (onGridUpdate) onGridUpdate(cells);
    }, [wildStage, totalCells, maxBet, onGridUpdate]);

    const isBlock = (c: WildGridCell) => c.content === 'BLOCK_2X' || c.content === 'BLOCK_3X' || c.content === 'BLOCK_4X';

    // Stage prize (coins) reduced 40%; multiplied when the gem hides inside a multiplier tile
    const stagePrizeCoins = (mult: number = 1) => Math.floor((maxBet || 10000) * (1.8 + 0.06 * wildStage)) * mult;
    const stagePrizeGems = () => Math.floor(3 + 0.1 * wildStage);

    // Place gem on a random unrevealed blank/reward tile once enough rocks have been opened
    const checkAndPlaceGem = useCallback((currentGrid: WildGridCell[]): WildGridCell[] => {
        // Gem already placed (either as a GEM tile or hidden inside a multiplier block)
        if (currentGrid.some(c => c.content === 'GEM' || (isBlock(c) && c.blockBase === 'GEM'))) return currentGrid;
        const revealed = currentGrid.filter(c => c.revealed).length;
        if (revealed < getGemRequirement(wildStage)) return currentGrid;
        // Candidates: unrevealed blank/reward tiles, plus multiplier block tiles (gem can hide under a block)
        const candidates = currentGrid
            .map((c, i) => (!c.revealed && (c.content === 'BLANK' || c.content === 'REWARD' || isBlock(c))) ? i : -1)
            .filter(i => i !== -1);
        if (candidates.length === 0) return currentGrid;
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        const next = [...currentGrid];
        if (isBlock(next[pick])) {
            // Hide the gem under the block — breaking it reveals the next-stage tile (prize ×mult)
            next[pick] = { ...next[pick], blockBase: 'GEM' };
        } else {
            next[pick] = { revealed: false, content: 'GEM' };
        }
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
        if (isOpen && activeGame === 'DICE') {
            setShowDiceTip(true);
            const t = setTimeout(() => setShowDiceTip(false), 3500);
            return () => clearTimeout(t);
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
                // Only scroll if the avatar is near/past the visible edge — keeps the
                // board steady instead of recentering (and jittering) on every step.
                const margin = active.offsetHeight * 1.1;
                const aboveTop = activeRect.top < containerRect.top + margin;
                const belowBottom = activeRect.bottom > containerRect.bottom - margin;
                if (aboveTop || belowBottom) {
                    const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
                    const target = relativeTop - container.offsetHeight / 2 + active.offsetHeight / 2;
                    container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
                }
            }
        }
    }, [visualPosition, activeGame, dicePosition]);

    useEffect(() => { visualPositionRef.current = visualPosition; }, [visualPosition]);

    useEffect(() => {
        if (autoRoll && stageWinning && stageClearData) {
            const t = setTimeout(() => {
                onStageComplete(stageClearData.coins, stageClearData.gems, true);
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
        if (grid[index].revealed || stageWinning || stagePending || shatteringCells.has(index)) return;
        if (wildCredits <= 0) {
            setNoPicksMsg(true);
            setTimeout(() => setNoPicksMsg(false), 2000);
            return;
        }
        const cell = grid[index];
        const newGrid = [...grid.map(c => ({ ...c }))];

        // Handle multiplier block tile: takes 2 hits to clear. First hit cracks the block,
        // revealing the underlying reward/gem (still unrevealed); mult + reward are preserved.
        if (isBlock(cell)) {
            audioService.playStoneBreak();
            setShatteringCells(prev => new Set(prev).add(index));
            setTimeout(() => {
                setShatteringCells(prev => { const n = new Set(prev); n.delete(index); return n; });
                newGrid[index] = { ...cell, revealed: false, content: cell.blockBase ?? 'REWARD' };
                setGrid(newGrid);
                if (onGridUpdate) onGridUpdate(newGrid);
                onPickTile(false, null);
            }, 350);
            return;
        }

        if (cell.content === 'BOMB') {
            newGrid[index] = { ...cell, revealed: true };
            // Collect up to 3 random unrevealed neighbors with explode animation
            const row = Math.floor(index / gridCols);
            const col = index % gridCols;
            const neighbors: number[] = [];
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = row + dr;
                    const nc = col + dc;
                    if (nr >= 0 && nr < gridRows && nc >= 0 && nc < gridCols) {
                        const ni = nr * gridCols + nc;
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
                let bombGemMult = 1;
                for (const ni of explodeTargets) {
                    const t = finalGrid[ni];
                    if (isBlock(t)) {
                        // Bomb shatters the multiplier block completely — reveal whatever is underneath
                        const base = t.blockBase ?? 'REWARD';
                        if (base === 'GEM') {
                            finalGrid[ni] = { ...t, content: 'GEM', revealed: true };
                            gemFoundFromBomb = true;
                            bombGemMult = t.mult ?? 1;
                        } else if (t.reward) {
                            // reward is already multiplied at creation time
                            finalGrid[ni] = { ...t, content: 'REWARD', revealed: true };
                            surroundingRewards.push(t.reward);
                        } else {
                            finalGrid[ni] = { ...t, content: 'BLANK', revealed: true };
                        }
                        continue;
                    }
                    finalGrid[ni] = { ...t, revealed: true };
                    if (finalGrid[ni].content === 'GEM') gemFoundFromBomb = true;
                    else if (finalGrid[ni].content === 'REWARD' && finalGrid[ni].reward) surroundingRewards.push(finalGrid[ni].reward!);
                }
                const finalGridWithGem = gemFoundFromBomb ? finalGrid : checkAndPlaceGem(finalGrid);
                setGrid(finalGridWithGem);
                if (onGridUpdate) onGridUpdate(finalGridWithGem);
                onBatchPick(1, surroundingRewards);
                if (gemFoundFromBomb) {
                    triggerStageClear(stagePrizeCoins(bombGemMult), stagePrizeGems());
                }
            }, 600);
            return;
        }

        // Non-bomb, non-block: play shatter animation then reveal
        audioService.playStoneBreak();
        setShatteringCells(prev => new Set(prev).add(index));
        setTimeout(() => {
            setShatteringCells(prev => { const n = new Set(prev); n.delete(index); return n; });
            const latestGrid = [...grid.map(c => ({ ...c }))];
            latestGrid[index] = { ...cell, revealed: true };
            const gridAfterGem = cell.content === 'GEM' ? latestGrid : checkAndPlaceGem(latestGrid);
            setGrid(gridAfterGem);
            if (onGridUpdate) onGridUpdate(gridAfterGem);
            if (cell.content === 'GEM') {
                audioService.playGemFound();
                triggerStageClear(stagePrizeCoins(cell.mult ?? 1), stagePrizeGems());
            } else if (cell.content === 'REWARD') {
                audioService.playWinSmall();
                onPickTile(false, cell.reward!);
            } else {
                onPickTile(false, null);
            }
        }, 350);
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
        let autoGemMult = 1;
        let used = 0;
        for (const idx of unrevealed.slice(0, count)) {
            used++;
            const t = newGrid[idx];
            if (isBlock(t)) {
                // Auto-pick fully clears a multiplier block, revealing what's underneath
                const base = t.blockBase ?? 'REWARD';
                if (base === 'GEM') { newGrid[idx] = { ...t, content: 'GEM', revealed: true }; gemFound = true; autoGemMult = t.mult ?? 1; break; }
                else if (t.reward) { newGrid[idx] = { ...t, content: 'REWARD', revealed: true }; rewards.push(t.reward); }
                else { newGrid[idx] = { ...t, content: 'BLANK', revealed: true }; }
                continue;
            }
            newGrid[idx] = { ...t, revealed: true };
            if (newGrid[idx].content === 'GEM') { gemFound = true; break; }
            else if (newGrid[idx].content === 'REWARD' && newGrid[idx].reward) rewards.push(newGrid[idx].reward!);
        }
        const autoGrid = gemFound ? newGrid : checkAndPlaceGem(newGrid);
        setGrid(autoGrid);
        if (onGridUpdate) onGridUpdate(autoGrid);
        if (used > 0) { onBatchPick(used, rewards); audioService.playClick(); }
        if (gemFound) {
            audioService.playGemFound();
            triggerStageClear(stagePrizeCoins(autoGemMult), stagePrizeGems());
        } else { if (rewards.length > 0) audioService.playWinSmall(); else audioService.playStoneBreak(); }
    };

    const movePlayerStepByStep = async (start: number, rollValue: number, cost: number = 1) => {
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
            // Move back one spot (just before the BACK tile)
            const backPos = Math.max(0, endPos - 1);
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
                const r = backPosStep.reward;
                backRewards.push(cost >= 2 ? { ...r, value: r.value * 2 } : r);
                audioService.playWinSmall();
            }
            setIsMoving(false);
            onDiceRoll(rollValue, backPos, backRewards, false, cost);
        } else {
            const rewards: MiniGameReward[] = [];
            if (landedStep?.reward && !isFinish && !landedStep.isStart) {
                const r = landedStep.reward;
                rewards.push(cost >= 2 && r.type !== 'BACK' ? { ...r, value: r.value * 2 } : r);
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
                } else if (landedStep.reward.type === 'COINS') {
                    audioService.playCoin();
                } else if (landedStep.reward.type === 'DIAMONDS') {
                    audioService.playGemFound();
                } else {
                    audioService.playWinSmall();
                }
            }
            setIsMoving(false);
            onDiceRoll(rollValue, endPos, rewards, isFinish, cost);
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
        setShowDiceTip(false);
        const cost = doubleRoll ? 2 : 1;
        if (diceCredits < cost || isRolling || isMoving) { if (diceCredits < cost) setAutoRoll(false); return; }
        setIsRolling(true);
        audioService.playClick();
        let rolls = 0;
        const interval = setInterval(() => {
            setDiceValue(Math.floor(Math.random() * 6) + 1);
            if (doubleRoll) setDiceValue2(Math.floor(Math.random() * 6) + 1);
            rolls++;
            if (rolls > 12) {
                clearInterval(interval);
                const final1 = Math.floor(Math.random() * 6) + 1;
                const final2 = doubleRoll ? Math.floor(Math.random() * 6) + 1 : 0;
                setDiceValue(final1);
                if (doubleRoll) setDiceValue2(final2);
                setIsRolling(false);
                movePlayerStepByStep(visualPositionRef.current, doubleRoll ? final1 + final2 : final1, cost);
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
            style={{ background: activeGame === 'WILD' ? 'linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url(/coinmine_bg.jpg) center/cover no-repeat' : activeGame === 'DICE' ? 'linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url(/dice_background.jpg) center/cover no-repeat' : 'linear-gradient(160deg,#8028c8 0%,#6018a8 50%,#4a1090 100%)' }}>

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
                <span className="absolute left-0 right-0 text-center font-tanker text-white text-sm drop-shadow pointer-events-none">{questTitle}</span>
                {/* RIGHT — stage prize + X */}
                {activeGame !== 'NONE' && (
                    <span className="font-black text-white font-mono text-sm ml-auto mr-2 z-10 leading-none">
                        {formatCommaNumber(Math.floor((maxBet || 10000) * (1.8 + 0.06 * (activeGame === 'WILD' ? wildStage : diceStage))))}
                    </span>
                )}
                <div className="round-btn cursor-pointer shrink-0 z-10" onClick={onClose}><i className="ti ti-x"></i></div>
            </div>

            {/* ── COINMINE (Wild Quest) ── */}
            {activeGame === 'WILD' && (
                <div className="flex-1 flex overflow-hidden relative">
                <style>{`
                    @keyframes rockShatter{
                        0%{transform:scale(1) rotate(0deg);opacity:1}
                        20%{transform:scale(1.12) rotate(-4deg);opacity:1}
                        40%{transform:scale(0.92) rotate(4deg);opacity:0.9}
                        60%{transform:scale(1.06) rotate(-3deg);opacity:0.7}
                        80%{transform:scale(0.7) rotate(6deg);opacity:0.35}
                        100%{transform:scale(0.2) rotate(-10deg);opacity:0}
                    }
                    @keyframes shatterParticle{
                        0%{transform:translate(0,0) scale(1);opacity:1}
                        100%{transform:translate(var(--px),var(--py)) scale(0);opacity:0}
                    }
                `}</style>
                    {noPicksMsg && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                            <div className="animate-pop-in px-5 py-3 rounded-2xl font-black text-white text-base uppercase tracking-widest"
                                style={{ background: 'rgba(0,0,0,0.9)', border: '2px solid #dc2626', boxShadow: '0 0 20px rgba(220,38,38,0.5)' }}>
                                <img src="/ui/pick.png" alt="" style={{ width: '1.2em', height: '1.2em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block', marginRight: 4 }} />No picks left!
                            </div>
                        </div>
                    )}
                    {stagePending && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
                            <div className="font-black text-white uppercase tracking-widest animate-pulse" style={{ fontSize: '2.8rem', textShadow: '0 0 30px rgba(96,165,250,1), 0 2px 8px rgba(0,0,0,0.9)' }}>Stage Clear!</div>
                        </div>
                    )}


                    {/* Rock grid */}
                    <div className="flex-1 flex items-center justify-center p-3">
                        <div className="relative p-2">
                            <div className="grid" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, gap: 0 }}>
                                {grid.map((cell, i) => {
                                    const revealed = cell.revealed;
                                    const isExploding = explodingCells.has(i);
                                    const isGem = revealed && cell.content === 'GEM';
                                    const isReward = revealed && cell.content === 'REWARD';
                                    const isBomb = cell.content === 'BOMB';
                                    const maxDim = Math.max(gridCols, gridRows);
                                    const tileSize = maxDim >= 6 ? 78 : maxDim >= 5 ? 88 : maxDim >= 4 ? 100 : 114;
                                    const gemPrize = Math.floor((maxBet || 10000) * (1.8 + 0.06 * wildStage)) * (cell.mult ?? 1);

                                    const iconSrc = isExploding ? null
                                        : cell.content === 'BLOCK_4X' ? '/coinmine_4xtile.png'
                                        : cell.content === 'BLOCK_3X' ? '/coinmine_3xtile.png'
                                        : cell.content === 'BLOCK_2X' ? '/coinmine_3xblock.png'
                                        : !revealed ? '/coinmine_rockicon.png'
                                        : isGem ? '/coinmine_stageclearicon.png'
                                        : isBomb ? '/coinmine_bombicon.png'
                                        : isReward && cell.reward?.type === 'COINS' ? '/coinmine_coinicon.png'
                                        : isReward && cell.reward?.type === 'PICKS' ? '/coinmine_pickaxe.png'
                                        : isReward ? '/coinmine_gemicon.png'
                                        : null;

                                    const isShattering = shatteringCells.has(i);
                                    return (
                                        <button key={i} onClick={() => handleTileClick(i)}
                                            disabled={revealed || wildCredits <= 0 || stageWinning || stagePending || isShattering}
                                            className={`relative flex flex-col items-center justify-center transition-all${isExploding ? ' animate-bounce' : ''}`}
                                            style={{
                                                width: tileSize, height: tileSize,
                                                background: 'none',
                                                border: 'none',
                                                boxShadow: 'none',
                                                cursor: revealed || wildCredits <= 0 || stageWinning || isShattering ? 'default' : 'pointer',
                                                margin: '-4px',
                                            }}>
                                            {isExploding ? (
                                                <span style={{ fontSize: tileSize * 0.9, lineHeight: 1 }}>💥</span>
                                            ) : isShattering ? (
                                                <div className="relative" style={{ width: tileSize, height: tileSize }}>
                                                    <img src="/coinmine_rockicon.png" alt="" style={{ width: tileSize, height: tileSize, objectFit: 'contain', animation: 'rockShatter 0.35s ease-in forwards' }} />
                                                    {['#f97316','#fbbf24','#a3e635','#38bdf8'].map((color, pi) => {
                                                        const angle = (pi / 4) * Math.PI * 2;
                                                        const dist = tileSize * 0.45;
                                                        const px = Math.round(Math.cos(angle) * dist) + 'px';
                                                        const py = Math.round(Math.sin(angle) * dist) + 'px';
                                                        return <div key={pi} style={{ position: 'absolute', top: '50%', left: '50%', width: 6, height: 6, borderRadius: '50%', background: color, '--px': px, '--py': py, animation: 'shatterParticle 0.35s ease-out forwards' } as React.CSSProperties} />;
                                                    })}
                                                </div>
                                            ) : iconSrc ? (
                                                <div className="relative" style={{ width: tileSize, height: tileSize }}>
                                                    <img src={iconSrc} alt="" style={{ width: tileSize, height: tileSize, objectFit: 'contain' }} />
                                                    {isGem && <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: Math.max(8, tileSize * 0.17), fontWeight: 900, color: '#fde68a', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>+{formatCommaNumber(gemPrize)}</span>}
                                                    {isReward && <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: Math.max(9, tileSize * 0.19), fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>{cell.reward?.label}</span>}
                                                </div>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right sidebar: stage counter, picks, buy button */}
                    <div className="shrink-0 flex flex-col items-center justify-center gap-2 px-2 py-3"
                        style={{ background: 'rgba(10,0,40,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.3), 0 4px 16px rgba(0,0,0,0.6)', width: 80, borderRadius: 16, margin: '8px 8px 8px 0', flexShrink: 0 }}>
                        <div className="flex flex-col items-center leading-none">
                            <span className="text-white/50 text-[8px] font-black tracking-widest">Stage</span>
                            <span className="font-black text-white text-2xl leading-none">{wildStage}</span>
                        </div>
                        <div className="w-full h-px bg-white/10" />
                        <div className="flex flex-col items-center leading-none">
                            <img src="/coinmine_pickaxe.png" alt="" style={{ width: '1.6rem', height: '1.6rem', objectFit: 'contain' }} />
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
                    <style>{`@keyframes diceBounce{0%,100%{transform:translateY(-7%)}50%{transform:translateY(0)}}`}</style>
                    {/* S-shape board — scrollable, snaps back to player on roll */}
                    <div className="flex-1 flex overflow-hidden p-2">
                        <div ref={boardContainerRef} className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-0 py-1">
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
                                    const iconSrc: string = step.isStart ? '/dice_starticon.png'
                                        : step.isFinish ? '/coinmine_stageclearicon.png'
                                        : step.reward?.type === 'BACK' ? '/dice_backicon.png'
                                        : isFiveX ? '/dice_staricon.png'
                                        : step.reward?.type === 'COINS' ? '/coinmine_coinicon.png'
                                        : step.reward?.type === 'PICKS' ? '/coinmine_pickaxe.png'
                                        : step.reward?.type === 'DIAMONDS' ? '/coinmine_gemicon.png'
                                        : step.reward?.type === 'PACKS' ? '/coinmine_gemicon.png'
                                        : '/dice_blankicon.png';
                                    return (
                                        <div key={step.index}
                                            data-active={isHere ? 'true' : undefined}
                                            className={`relative flex items-center justify-center${isBuffed ? ' animate-pulse' : ''}`}
                                            style={{
                                                aspectRatio: '1',
                                                background: 'none',
                                                overflow: 'visible',
                                                boxShadow: 'none',
                                                border: 'none',
                                                transition: 'transform 0.2s',
                                                transform: isHere ? 'scale(1.18)' : 'scale(1)',
                                            }}>
                                            {isHere && (
                                                <>
                                                    <span className="absolute z-20 pointer-events-none font-black text-white text-center leading-none"
                                                        style={{ fontSize: 'clamp(8px,1.8vw,11px)', top: '-38%', left: 0, right: 0, textShadow: '0 1px 3px rgba(0,0,0,1)' }}>You</span>
                                                    <img src="/dice_avatar.png" alt="" className="absolute z-20 pointer-events-none"
                                                        style={{ width: '80%', top: '-18%', left: '10%', objectFit: 'contain', animation: 'diceBounce 1s ease-in-out infinite' }} />
                                                </>
                                            )}
                                            <div className="relative flex items-center justify-center w-full h-full">
                                                <img src={iconSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                                                {step.reward?.label && step.reward.type !== 'BACK' && step.reward.type !== 'STAR' && !step.isFinish && !step.isStart && (
                                                    <span className="absolute left-0 right-0 text-center font-black text-white leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,1)]" style={{ fontSize: 'clamp(11px,2.2vw,16px)', bottom: '25%' }}>{step.reward.label}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                };
                                return [...segments].reverse().map(({ si, main, bridge }) => {
                                    const isEven = si % 2 === 0;
                                    // 8-column grid: cols 1-8 for main tiles, bridge at col 8 (even) or col 1 (odd)
                                    return (
                                        <div key={si} style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 0 }}>
                                            {bridge && (
                                                <div style={{ gridColumn: isEven ? 8 : 1, gridRow: 1, minWidth: 0, margin: '-2px' }}>
                                                    {renderCell(bridge)}
                                                </div>
                                            )}
                                            {main.map((step, idx) => (
                                                <div key={step.index} style={{ gridColumn: isEven ? 1 + idx : 8 - idx, gridRow: bridge ? 2 : 1, minWidth: 0, margin: '-2px' }}>
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
                    <div className="shrink-0 flex flex-col items-center gap-2 px-2 py-3 relative"
                        style={{ background: 'linear-gradient(180deg,rgba(197,16,224,0.32) 0%,rgba(160,60,255,0.22) 20%,rgba(10,0,50,0.75) 100%)', boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 4px 16px rgba(0,0,0,0.6)', width: 90, borderRadius: 16, margin: '8px 8px 8px 0', flexShrink: 0 }}>
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
                        {/* Dice tooltip bubble */}
                        {showDiceTip && (
                            <div className="absolute pointer-events-none"
                                style={{ right: '100%', bottom: 80, marginRight: 8, zIndex: 20, width: 130 }}>
                                <div className="rounded-xl px-3 py-2 font-black text-white text-center leading-tight"
                                    style={{ fontSize: 10, background: 'rgba(0,0,0,0.88)', boxShadow: '0 2px 12px rgba(0,0,0,0.7)', border: '1.5px solid rgba(255,255,255,0.12)' }}>
                                    Tap to spin<br />Hold for auto roll
                                </div>
                                <div style={{ position: 'absolute', right: -6, bottom: 14, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '6px solid rgba(0,0,0,0.88)' }} />
                            </div>
                        )}
                        {doubleRoll ? (
                            <div className="flex flex-col items-center gap-1">
                                <DiceFace value={diceValue2} rolling={isRolling} size={36} />
                                <DiceFace value={diceValue} rolling={isRolling} size={36} />
                            </div>
                        ) : (
                            <DiceFace value={diceValue} rolling={isRolling} size={52} />
                        )}
                        <button
                            onMouseDown={handleRollMouseDown}
                            onMouseUp={handleRollMouseUp}
                            onMouseLeave={handleRollMouseUp}
                            onTouchStart={handleRollMouseDown}
                            onTouchEnd={handleRollMouseUp}
                            disabled={diceCredits <= 0}
                            className={`${autoRoll ? 'pill-red' : diceCredits <= 0 ? 'pill-green opacity-40' : 'pill-gold'} w-full`}>
                            <div className="pill-face" style={{ padding: '7px 8px', fontSize: '10px' }}>
                                {autoRoll ? 'Stop' : 'Roll'}
                            </div>
                        </button>
                        {/* Double Dice toggle */}
                        <button
                            onClick={() => setDoubleRoll(d => !d)}
                            className="w-full rounded-lg flex items-center justify-between px-2 transition-all"
                            style={{
                                height: 28,
                                background: doubleRoll ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.06)',
                                border: doubleRoll ? '1.5px solid rgba(251,191,36,0.6)' : '1.5px solid rgba(255,255,255,0.12)',
                            }}>
                            <span className="font-black text-[9px]" style={{ color: doubleRoll ? '#fbbf24' : 'rgba(255,255,255,0.5)' }}>Double Dice</span>
                            <div className="flex items-center justify-center rounded" style={{
                                width: 14, height: 14,
                                background: doubleRoll ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                                border: doubleRoll ? '1.5px solid #d97706' : '1.5px solid rgba(255,255,255,0.2)',
                                flexShrink: 0,
                            }}>
                                {doubleRoll && <i className="ti ti-check" style={{ fontSize: 9, color: '#1c1917', fontWeight: 900 }} />}
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Stage clear reward modal — centered, shown for both WILD and DICE */}
            {stageWinning && stageClearData && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="animate-pop-in rounded-2xl flex flex-col items-center gap-4 px-8 py-6 pointer-events-auto"
                        style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)', minWidth: 240 }}>
                        <div className="font-black text-yellow-300 uppercase tracking-widest" style={{ fontSize: '1.3rem', textShadow: '0 0 16px rgba(250,220,80,0.7)' }}>Stage Clear!</div>
                        <div className="flex flex-col items-center gap-1.5">
                            <span className="text-white font-black font-mono leading-none" style={{ fontSize: '1.8rem' }}>+{formatCommaNumber(stageClearData.coins)}</span>
                            {stageClearData.gems > 0 && <span className="text-white font-black text-xl font-mono leading-none">+{stageClearData.gems} 💎</span>}
                        </div>
                        <button onClick={handleNextStage} className="pill-green">
                            <div className="pill-face" style={{ padding: '8px 20px', fontSize: '12px' }}>Next →</div>
                        </button>
                    </div>
                </div>
            )}

            {/* Buy Picks/Dice Popup */}
            {showBuyPopup && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md"
                    onClick={() => setShowBuyPopup(null)}>
                    <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ width: 300, background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}
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
                                        style={{ background: 'linear-gradient(180deg,rgba(197,16,224,0.32) 0%,rgba(160,60,255,0.22) 20%,rgba(10,0,50,0.75) 100%)', boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)', opacity: canAfford ? 1 : 0.5 }}>
                                        <div className="text-white font-black text-sm">{opt.label}</div>
                                        <div className="w-full flex flex-col gap-1 my-1">
                                            <div className="flex items-center gap-1.5 text-white text-xs font-bold">
                                                {showBuyPopup === 'PICKS' ? <img src="/ui/pick.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }} /> : <span>🎲</span>}
                                                <span>+{showBuyPopup === 'PICKS' ? opt.picks : opt.dice} {showBuyPopup === 'PICKS' ? 'Picks' : 'Dice'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-yellow-200 text-xs font-bold">
                                                <img src="/new_coinicon.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} />
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
