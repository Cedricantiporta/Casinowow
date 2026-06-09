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
}

// Grid grows every 5 stages: 3 (1-5), 4 (6-10), 5 (11-15), 6 (16+)
const getGridSize = (stage: number) => Math.min(Math.floor((stage - 1) / 5) + 3, 6);
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
    onSelectMode, onBuyPicks, onBuyQuestBundle, onPickTile, onBatchPick, onStageComplete, onGridUpdate, onDiceRoll, onClose, playerLevel, maxBet
}) => {
    const diceCredits = diceCreditsRaw ?? 0;
    const wildCredits = wildCreditsRaw ?? 0;
    const currentGridSize = getGridSize(wildStage);
    const totalCells = currentGridSize * currentGridSize;

    const [grid, setGrid] = useState<WildGridCell[]>([]);
    const [stageWinning, setStageWinning] = useState(false);
    const [noPicksMsg, setNoPicksMsg] = useState(false);
    const [showBuyPopup, setShowBuyPopup] = useState<'PICKS' | 'DICE' | null>(null);

    const [isRolling, setIsRolling] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [diceValue, setDiceValue] = useState(1);
    const [visualPosition, setVisualPosition] = useState(dicePosition);
    const [board, setBoard] = useState<BoardStep[]>([]);
    const [autoRoll, setAutoRoll] = useState(false);
    const rollButtonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressRef = useRef(false);

    const boardLength = 10 + ((diceStage - 1) * 5);
    const boardContainerRef = useRef<HTMLDivElement>(null);

    const initGrid = useCallback(() => {
        const cells: WildGridCell[] = Array(totalCells).fill(null).map(() => ({ revealed: false, content: 'BLANK' as const }));
        const gemIdx = Math.floor(Math.random() * totalCells);
        cells[gemIdx] = { revealed: false, content: 'GEM' };
        const baseCoin = (maxBet || 10000) * wildStage * 0.5;
        for (let i = 0; i < totalCells; i++) {
            if (i === gemIdx) continue;
            if (Math.random() < 0.3) {
                const r = Math.random();
                let reward: MiniGameReward = { type: 'COINS', value: baseCoin, label: formatNumber(baseCoin) };
                if (r < 0.5) { const h = baseCoin * 2; reward = { type: 'COINS', value: h, label: formatNumber(h) }; }
                else if (r < 0.7) reward = { type: 'PICKS', value: 1, label: '+1 Pick' };
                else if (r < 0.9) reward = { type: 'PICKS', value: 2, label: '+2 Picks' };
                else reward = { type: 'DIAMONDS', value: 5, label: '+5 Gems' };
                cells[i] = { revealed: false, content: 'REWARD', reward };
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

    const initBoard = useCallback(() => {
        const newBoard: BoardStep[] = [];
        const baseCoin = (maxBet || 10000) * diceStage * 0.2;
        const preGoalIndex = boardLength - 1;
        for (let i = 0; i <= boardLength; i++) {
            let reward: MiniGameReward | undefined;
            if (i > 0 && i < boardLength) {
                // 30% chance of BACK on the tile just before the goal
                if (i === preGoalIndex && Math.random() < 0.30) {
                    reward = { type: 'BACK', value: 0, label: 'BACK!' };
                } else {
                    const r = Math.random();
                    if (r < 0.12) {
                        reward = { type: 'BACK', value: 0, label: 'BACK!' };
                    } else if (r < 0.48) {
                        const v = Math.floor(baseCoin * (0.5 + Math.random()));
                        reward = { type: 'COINS', value: v, label: formatNumber(v) };
                    } else if (r < 0.63) {
                        reward = { type: 'PICKS', value: 1, label: '×1' };
                    } else if (r < 0.72) {
                        reward = { type: 'PICKS', value: 2, label: '×2' };
                    } else if (r < 0.84) {
                        const gems = Math.floor(Math.random() * 46) + 5;
                        reward = { type: 'DIAMONDS', value: gems, label: `+${gems}` };
                    } else if (r < 0.92) {
                        const packs = Math.floor(Math.random() * 10) + 1;
                        reward = { type: 'PACKS', value: packs, label: `+${packs}` };
                    }
                }
            }
            newBoard.push({ index: i, isStart: i === 0, isFinish: i === boardLength, reward });
        }
        setBoard(newBoard);
        setVisualPosition(0);
    }, [boardLength, diceStage, maxBet]);

    useEffect(() => {
        if (isOpen) {
            if (activeGame === 'WILD') {
                if (savedGrid && savedGrid.length > 0) setGrid(savedGrid);
                else initGrid();
            }
            if (activeGame === 'DICE') {
                if (board.length === 0 || board[board.length - 1].index !== boardLength) initBoard();
                if (!isMoving) setVisualPosition(dicePosition);
            }
            setStageWinning(false);
        } else {
            setIsRolling(false);
            setIsMoving(false);
            setAutoRoll(false);
        }
    }, [isOpen, initGrid, activeGame, initBoard, boardLength, dicePosition, board.length, isMoving, savedGrid]);

    useEffect(() => {
        if (activeGame === 'DICE' && boardContainerRef.current) {
            const active = boardContainerRef.current.querySelector('[data-active="true"]') as HTMLElement;
            if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [visualPosition, activeGame]);

    useEffect(() => {
        if (autoRoll && !isRolling && !isMoving && diceCredits > 0) {
            const t = setTimeout(handleRollDice, 1000);
            return () => clearTimeout(t);
        } else if (autoRoll && diceCredits <= 0) setAutoRoll(false);
    }, [autoRoll, isRolling, isMoving, diceCredits]);

    const handleTileClick = (index: number) => {
        if (grid[index].revealed || stageWinning) return;
        if (wildCredits <= 0) {
            setNoPicksMsg(true);
            setTimeout(() => setNoPicksMsg(false), 2000);
            return;
        }
        const cell = grid[index];
        const newGrid = [...grid.map(c => ({ ...c }))];
        newGrid[index] = { ...cell, revealed: true };

        if (cell.content === 'BOMB') {
            // Reveal all surrounding cells (up to 8)
            const row = Math.floor(index / currentGridSize);
            const col = index % currentGridSize;
            const surroundingRewards: MiniGameReward[] = [];
            let gemFoundFromBomb = false;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = row + dr;
                    const nc = col + dc;
                    if (nr >= 0 && nr < currentGridSize && nc >= 0 && nc < currentGridSize) {
                        const ni = nr * currentGridSize + nc;
                        if (!newGrid[ni].revealed) {
                            newGrid[ni] = { ...newGrid[ni], revealed: true };
                            if (newGrid[ni].content === 'GEM') gemFoundFromBomb = true;
                            else if (newGrid[ni].content === 'REWARD' && newGrid[ni].reward) surroundingRewards.push(newGrid[ni].reward!);
                        }
                    }
                }
            }
            setGrid(newGrid);
            if (onGridUpdate) onGridUpdate(newGrid);
            audioService.playWinBig();
            onBatchPick(1, surroundingRewards);
            if (gemFoundFromBomb) {
                setStageWinning(true);
                setTimeout(() => { onStageComplete(Math.round((maxBet || 10000) * wildStage * 10), 10 * wildStage); setStageWinning(false); }, 2000);
            }
            return;
        }

        setGrid(newGrid);
        if (onGridUpdate) onGridUpdate(newGrid);
        if (cell.content === 'GEM') {
            audioService.playGemFound();
            setStageWinning(true);
            setTimeout(() => { onStageComplete(Math.round((maxBet || 10000) * wildStage * 10), 10 * wildStage); setStageWinning(false); }, 2000);
        } else if (cell.content === 'REWARD') {
            audioService.playWinSmall();
            onPickTile(false, cell.reward!);
        } else {
            audioService.playStoneBreak();
            onPickTile(false, null);
        }
    };

    const handleAutoPick = () => {
        if (wildCredits <= 0 || stageWinning) return;
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
        setGrid(newGrid);
        if (onGridUpdate) onGridUpdate(newGrid);
        if (used > 0) { onBatchPick(used, rewards); audioService.playClick(); }
        if (gemFound) {
            audioService.playGemFound();
            setStageWinning(true);
            setTimeout(() => { onStageComplete(Math.round((maxBet || 10000) * wildStage * 10), 10 * wildStage); setStageWinning(false); }, 2000);
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
            setIsMoving(false);
            onDiceRoll(rollValue, backPos, [{ type: 'BACK', value: 0, label: 'BACK!' }], false);
        } else {
            const rewards: MiniGameReward[] = [];
            if (landedStep?.reward && !isFinish && !landedStep.isStart) {
                rewards.push(landedStep.reward);
                audioService.playWinSmall();
            }
            setIsMoving(false);
            onDiceRoll(rollValue, endPos, rewards, isFinish);
            if (isFinish) { audioService.playWinBig(); setAutoRoll(false); }
        }
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
                movePlayerStepByStep(visualPosition, final);
            }
        }, 80);
    };

    const handleRollMouseDown = () => {
        if (diceCredits <= 0 || isRolling || isMoving) return;
        isLongPressRef.current = false;
        rollButtonTimeoutRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            if (!autoRoll) { setAutoRoll(true); audioService.playClick(); }
        }, 800);
    };

    const handleRollMouseUp = () => {
        if (rollButtonTimeoutRef.current) { clearTimeout(rollButtonTimeoutRef.current); rollButtonTimeoutRef.current = null; }
        if (!isLongPressRef.current) {
            if (autoRoll) { setAutoRoll(false); audioService.playClick(); }
            else handleRollDice();
        }
    };

    if (!isOpen) return null;

    const isWild = activeGame === 'WILD';
    const questTitle = isWild ? '⛏️ CoinMine' : '🎲 Fortune Trail';

    return (
        <div className="fixed inset-0 z-[150] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(160deg,#3b0764 0%,#1e0438 60%,#0d0220 100%)' }}>

            {/* Topbar */}
            <div className="shrink-0 flex items-center gap-2 px-3 h-[38px] z-20"
                style={{ background: HDR, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-arrow-left"></i></div>
                <span className="font-black text-white text-xs uppercase tracking-widest drop-shadow shrink-0">{questTitle}</span>
                <div className="flex-1 flex items-center justify-center gap-1.5">
                    <div className="currency-pill flex items-center gap-1">
                        <div className="coin shrink-0">$</div>
                        <span className="num" style={{ fontSize: '10px' }}>{formatCommaNumber(balance)}</span>
                    </div>
                    <div className="currency-pill flex items-center gap-1">
                        <div className="gem shrink-0"></div>
                        <span className="num" style={{ fontSize: '10px' }}>{diamonds}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <span style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(253,230,138,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1 }}>Prize</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, background: 'linear-gradient(180deg,#fff8a0,#ffd700 50%,#ff9500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))', whiteSpace: 'nowrap', lineHeight: 1 }}>
                        {formatCommaNumber((maxBet || 10000) * (isWild ? wildStage : diceStage) * 10)}
                    </span>
                </div>
            </div>

            {/* ── COINMINE (Wild Quest) ── */}
            {activeGame === 'WILD' && (
                <div className="flex-1 flex overflow-hidden relative">
                    {noPicksMsg && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                            <div className="animate-pop-in px-5 py-3 rounded-2xl font-black text-white text-base uppercase tracking-widest"
                                style={{ background: 'rgba(0,0,0,0.9)', border: '2px solid #dc2626', boxShadow: '0 0 20px rgba(220,38,38,0.5)' }}>
                                ⛏️ No picks left!
                            </div>
                        </div>
                    )}
                    {stageWinning && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
                            <div style={{ fontSize: '72px', lineHeight: 1, filter: 'drop-shadow(0 0 24px rgba(96,165,250,0.8))' }} className="animate-bounce">💎</div>
                            <div className="mt-3 text-2xl font-black text-white uppercase tracking-widest">Stage Clear!</div>
                        </div>
                    )}

                    {/* Rock grid */}
                    <div className="flex-1 flex items-center justify-center p-3">
                        <div className="relative p-2">
                            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${currentGridSize}, minmax(0, 1fr))` }}>
                                {grid.map((cell, i) => {
                                    const revealed = cell.revealed;
                                    const isGem = revealed && cell.content === 'GEM';
                                    const isReward = revealed && cell.content === 'REWARD';
                                    const isBomb = cell.content === 'BOMB';
                                    const tileSize = currentGridSize >= 6 ? 56 : currentGridSize >= 5 ? 64 : currentGridSize >= 4 ? 72 : 84;
                                    const icon = isGem ? '💎' : isReward
                                        ? (cell.reward?.type === 'COINS' ? '🪙' : cell.reward?.type === 'PICKS' ? '⛏️' : '💎')
                                        : revealed && isBomb ? '💥' : null;
                                    const tileBg = revealed
                                        ? (isGem ? 'linear-gradient(180deg,#1d4ed8,#1e3a8a)' : isBomb ? 'linear-gradient(180deg,#b45309,#78350f)' : 'linear-gradient(180deg,#1f1f2e,#12121e)')
                                        : 'linear-gradient(180deg,#4c1d95,#2e1065)';
                                    return (
                                        <button key={i} onClick={() => handleTileClick(i)}
                                            disabled={revealed || wildCredits <= 0 || stageWinning}
                                            className="relative flex flex-col items-center justify-center rounded-xl active:translate-y-[2px] transition-all overflow-hidden"
                                            style={{
                                                width: tileSize, height: tileSize,
                                                background: tileBg,
                                                boxShadow: revealed ? 'none' : '0 4px 0 #1e0438, 0 6px 12px rgba(0,0,0,0.5)',
                                                border: revealed ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                                cursor: revealed || wildCredits <= 0 || stageWinning ? 'default' : 'pointer',
                                            }}>
                                            {revealed ? (
                                                icon ? (
                                                    <>
                                                        <span style={{ fontSize: tileSize * 0.62, lineHeight: 1 }}>{icon}</span>
                                                        {isReward && <span style={{ fontSize: Math.max(9, tileSize * 0.19) }} className="font-bold text-white/90 mt-0.5 leading-none">{cell.reward?.label}</span>}
                                                    </>
                                                ) : null
                                            ) : (
                                                <span style={{ fontSize: tileSize * 0.78, lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>🪨</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right sidebar: stage counter, picks, buy button */}
                    <div className="shrink-0 flex flex-col items-center justify-center gap-2 px-2 py-3"
                        style={{ background: 'rgba(0,0,0,0.35)', borderLeft: '1px solid rgba(255,255,255,0.06)', width: 80 }}>
                        <div className="flex flex-col items-center leading-none">
                            <span className="text-white/50 text-[8px] font-black uppercase tracking-widest">Stage</span>
                            <span className="font-black text-white text-2xl leading-none">{wildStage}</span>
                        </div>
                        <div className="w-full h-px bg-white/10" />
                        <div className="flex flex-col items-center leading-none">
                            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>⛏️</span>
                            <span className="font-black text-white text-xl leading-none mt-0.5">{wildCredits}</span>
                            <span className="text-white/50 text-[8px] font-black uppercase">Picks</span>
                        </div>
                        <Btn3D onClick={() => setShowBuyPopup('PICKS')}
                            color="linear-gradient(180deg,#0ea5e9,#0369a1)" shadow="0 3px 0 #0c4a6e"
                            className="w-full py-1.5 rounded-lg text-white" style={{ fontSize: '0.6rem' }}>
                            + Buy
                        </Btn3D>
                    </div>
                </div>
            )}

            {/* ── FORTUNE TRAIL (Dice Quest) ── */}
            {activeGame === 'DICE' && (
                <>
                    {/* S-shape board */}
                    <div className="flex-1 flex items-center justify-center w-full overflow-hidden p-2">
                        <div ref={boardContainerRef} className="overflow-y-auto no-scrollbar flex flex-col gap-1.5">
                            {(() => {
                                const COLS = 5;
                                const numRows = Math.ceil(board.length / COLS);
                                const rows = Array.from({ length: numRows }, (_, rowIdx) =>
                                    board.slice(rowIdx * COLS, rowIdx * COLS + COLS)
                                );
                                return [...rows].reverse().map((row, displayIdx) => {
                                    const rowIdx = rows.length - 1 - displayIdx;
                                    const isEven = rowIdx % 2 === 0;
                                    return (
                                        <div key={rowIdx} className="flex gap-1.5" style={{ flexDirection: isEven ? 'row' : 'row-reverse' }}>
                                            {row.map(step => {
                                                const isHere = step.index === visualPosition;
                                                const bg = step.isFinish ? 'linear-gradient(180deg,#f59e0b,#b45309)'
                                                    : step.isStart ? 'linear-gradient(180deg,#22c55e,#15803d)'
                                                    : step.reward?.type === 'BACK' ? 'linear-gradient(180deg,#dc2626,#991b1b)'
                                                    : step.reward?.type === 'COINS' ? 'linear-gradient(180deg,#ca8a04,#713f12)'
                                                    : step.reward?.type === 'PICKS' ? 'linear-gradient(180deg,#7c3aed,#3b0764)'
                                                    : step.reward?.type === 'DIAMONDS' ? 'linear-gradient(180deg,#0891b2,#0c4a6e)'
                                                    : step.reward?.type === 'PACKS' ? 'linear-gradient(180deg,#d97706,#451a03)'
                                                    : 'linear-gradient(180deg,#312e81,#1e1b4b)';
                                                const cellIcon = step.isFinish ? '🏆'
                                                    : step.reward?.type === 'BACK' ? '⬅️'
                                                    : step.reward?.type === 'COINS' ? '🪙'
                                                    : step.reward?.type === 'PICKS' ? '🎲'
                                                    : step.reward?.type === 'DIAMONDS' ? '💎'
                                                    : step.reward?.type === 'PACKS' ? '📦'
                                                    : null;
                                                return (
                                                    <div key={step.index}
                                                        data-active={isHere ? 'true' : undefined}
                                                        className="relative shrink-0 flex flex-col items-center justify-center rounded-lg"
                                                        style={{
                                                            width: 50, height: 50,
                                                            background: bg,
                                                            boxShadow: isHere
                                                                ? '0 0 0 2px #fde68a, 0 4px 12px rgba(0,0,0,0.5)'
                                                                : '0 3px 0 rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)',
                                                            border: isHere ? '2px solid #fde68a' : '1px solid rgba(255,255,255,0.1)',
                                                            transition: 'all 0.25s',
                                                            transform: isHere ? 'scale(1.1)' : 'scale(1)',
                                                        }}>
                                                        <span className="absolute top-0.5 left-1 text-[7px] font-black text-white/40 leading-none">
                                                            {step.isStart ? 'GO' : step.isFinish ? '' : `${step.index}`}
                                                        </span>
                                                        {isHere && (
                                                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                                                                <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>🎲</span>
                                                            </div>
                                                        )}
                                                        {step.isStart ? (
                                                            <span className="text-[9px] font-black text-white">START</span>
                                                        ) : cellIcon ? (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{cellIcon}</span>
                                                                {step.reward?.label && step.reward.type !== 'BACK' && (
                                                                    <span className="text-white font-black text-[8px] leading-none text-center px-0.5 truncate max-w-[46px]">{step.reward.label}</span>
                                                                )}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* Controls footer */}
                    <div className="shrink-0 flex items-center px-3 py-2 gap-4"
                        style={{ background: 'rgba(0,0,0,0.45)', borderTop: '1px solid rgba(255,255,255,0.07)', minHeight: 96 }}>

                        {/* Left — dice pill + buy */}
                        <div className="flex flex-col items-center gap-2 shrink-0">
                            <div className="currency-pill flex items-center gap-1.5 px-3 py-1.5">
                                <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🎲</span>
                                <span className="font-black text-white text-lg leading-none">{diceCredits}</span>
                                <span className="text-white/50 text-[10px] uppercase font-bold">Dice</span>
                            </div>
                            <Btn3D onClick={() => setShowBuyPopup('DICE')}
                                color="linear-gradient(180deg,#0ea5e9,#0369a1)" shadow="0 3px 0 #0c4a6e"
                                className="px-4 py-1.5 rounded-xl text-white" style={{ fontSize: '0.68rem' }}>
                                + Buy Dice
                            </Btn3D>
                        </div>

                        {/* Center — dice face + roll button */}
                        <div className="flex-1 flex items-center justify-center gap-4">
                            <DiceFace value={diceValue} rolling={isRolling} size={72} />
                            <button
                                onMouseDown={handleRollMouseDown}
                                onMouseUp={handleRollMouseUp}
                                onMouseLeave={handleRollMouseUp}
                                onTouchStart={handleRollMouseDown}
                                onTouchEnd={handleRollMouseUp}
                                disabled={diceCredits <= 0}
                                className="relative w-[88px] h-[88px] rounded-full flex flex-col items-center justify-center font-black uppercase tracking-widest transition-all active:translate-y-[3px]"
                                style={{
                                    background: autoRoll ? 'linear-gradient(180deg,#ef4444,#b91c1c)' : diceCredits > 0 ? 'linear-gradient(180deg,#fbbf24,#d97706)' : '#374151',
                                    boxShadow: diceCredits > 0 ? (autoRoll ? '0 5px 0 #7f1d1d, 0 8px 20px rgba(0,0,0,0.5)' : '0 5px 0 #92400e, 0 8px 20px rgba(0,0,0,0.5)') : 'none',
                                    border: '2px solid rgba(255,255,255,0.2)',
                                    color: diceCredits > 0 ? (autoRoll ? 'white' : '#1c1917') : '#6b7280',
                                    cursor: diceCredits <= 0 ? 'not-allowed' : 'pointer',
                                }}>
                                <span className="text-xl leading-none">{autoRoll ? 'STOP' : 'ROLL'}</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Buy Picks/Dice Popup */}
            {showBuyPopup && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowBuyPopup(null)}>
                    <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ width: 300, background: 'linear-gradient(160deg,#1a0535,#2d0060)' }}
                        onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                            <div>
                                <div className="text-white font-black text-base leading-none">
                                    {showBuyPopup === 'PICKS' ? '⛏️ Buy Picks' : '🎲 Buy Dice'}
                                </div>
                                <div className="text-purple-300/60 text-[10px] mt-0.5">Bundles include coins & gems bonus</div>
                            </div>
                            <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full">
                                <span className="text-sm">💎</span>
                                <span className="text-white font-black text-sm">{diamonds}</span>
                            </div>
                        </div>
                        {/* Bundle options */}
                        <div className="px-4 pb-4 flex gap-3">
                            {(showBuyPopup === 'PICKS'
                                ? [
                                    { label: 'Starter', picks: 5,  dice: 0,  coins: Math.round((maxBet || 10000) * 25),  bonusGems: 50,  gemCost: 150, color: 'linear-gradient(160deg,#052e16,#166534)' },
                                    { label: 'Pro',     picks: 20, dice: 0,  coins: Math.round((maxBet || 10000) * 100), bonusGems: 200, gemCost: 500, color: 'linear-gradient(160deg,#1e1b4b,#3730a3)' },
                                ]
                                : [
                                    { label: 'Starter', picks: 0,  dice: 5,  coins: Math.round((maxBet || 10000) * 25),  bonusGems: 50,  gemCost: 150, color: 'linear-gradient(160deg,#052e16,#166534)' },
                                    { label: 'Pro',     picks: 0,  dice: 20, coins: Math.round((maxBet || 10000) * 100), bonusGems: 200, gemCost: 500, color: 'linear-gradient(160deg,#1e1b4b,#3730a3)' },
                                ]
                            ).map(opt => {
                                const canAfford = diamonds >= opt.gemCost;
                                return (
                                    <button key={opt.label}
                                        onClick={() => { if (!canAfford) return; onBuyQuestBundle?.(showBuyPopup, opt.picks, opt.dice, opt.coins, opt.gemCost, opt.bonusGems); setShowBuyPopup(null); }}
                                        disabled={!canAfford}
                                        className="flex-1 rounded-2xl flex flex-col items-center p-3 gap-1.5"
                                        style={{ background: canAfford ? opt.color : 'rgba(0,0,0,0.5)', opacity: canAfford ? 1 : 0.5, border: '1px solid rgba(255,255,255,0.15)' }}>
                                        <div className="text-white font-black text-sm uppercase tracking-wider">{opt.label}</div>
                                        <div className="w-full flex flex-col gap-1 my-1">
                                            <div className="flex items-center gap-1.5 text-white text-xs font-bold">
                                                <span>{showBuyPopup === 'PICKS' ? '⛏️' : '🎲'}</span>
                                                <span>+{showBuyPopup === 'PICKS' ? opt.picks : opt.dice} {showBuyPopup === 'PICKS' ? 'Picks' : 'Dice'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-yellow-200 text-xs font-bold">
                                                <span>🪙</span>
                                                <span>+{formatCommaNumber(opt.coins)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-cyan-200 text-xs font-bold">
                                                <span>💎</span>
                                                <span>+{opt.bonusGems} Gems</span>
                                            </div>
                                        </div>
                                        <div className="w-full py-2 rounded-xl text-center font-black text-white text-sm"
                                            style={{ background: canAfford ? 'linear-gradient(180deg,#7c3aed,#4c1d95)' : 'rgba(0,0,0,0.4)', boxShadow: canAfford ? '0 3px 0 #2e1065' : 'none' }}>
                                            💎 {opt.gemCost}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
