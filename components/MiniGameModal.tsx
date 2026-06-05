import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MiniGameReward, WildGridCell } from '../types';
import { formatNumber, formatCommaNumber } from '../constants';
import { audioService } from '../services/audioService';


interface MiniGameModalProps {
    isOpen: boolean;
    diceCredits: number;
    wildCredits: number;
    wildStage: number;
    diceStage: number;
    dicePosition: number;
    activeGame: 'NONE' | 'WILD' | 'DICE';
    savedGrid?: WildGridCell[];
    onSelectMode: (mode: 'NONE' | 'WILD' | 'DICE') => void;
    onBuyPicks: (amount: number, cost: number, currency: 'CREDITS' | 'GEMS') => void;
    onPickTile: (isGem: boolean, reward: MiniGameReward | null) => void;
    onBatchPick: (picksUsed: number, rewards: MiniGameReward[]) => void;
    onStageComplete: (bonusCoins: number, bonusDiamonds: number) => void;
    onGridUpdate?: (grid: WildGridCell[]) => void;
    onDiceRoll: (roll: number, newPosition: number, rewards: MiniGameReward[], isFinish: boolean) => void;
    onClose: () => void;
    playerLevel: number;
    maxBet?: number;
}

const GRID_SIZES = [3, 4, 5, 5, 6];
const EXCHANGE_RATE = 5;
const GEM_COST = 100;

interface BoardStep {
    index: number;
    reward?: MiniGameReward;
    isFinish: boolean;
    isStart: boolean;
}

// --- 3D Dice Face Component ---
const DICE_DOTS: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
};

const DiceFace: React.FC<{ value: number; rolling: boolean; size?: number }> = ({ value, rolling, size = 72 }) => {
    const dots = DICE_DOTS[Math.max(1, Math.min(6, value))] || DICE_DOTS[1];
    return (
        <div
            className={`relative flex items-center justify-center select-none ${rolling ? 'animate-spin' : ''}`}
            style={{
                width: size, height: size,
                background: 'linear-gradient(145deg,#ffffff,#e0e0e0)',
                borderRadius: Math.round(size * 0.18),
                boxShadow: `0 ${Math.round(size*0.07)}px 0 #aaa, 0 ${Math.round(size*0.12)}px ${Math.round(size*0.2)}px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.9)`,
            }}
        >
            <div className="grid grid-cols-3 gap-0" style={{ width: size * 0.72, height: size * 0.72 }}>
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-center">
                        {dots.includes(i) && (
                            <div
                                style={{
                                    width: size * 0.14, height: size * 0.14,
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle at 35% 35%,#555,#111)',
                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Shared header styling ---
const HDR = "linear-gradient(180deg,#6b21a8,#4c1d95)";
const HDR_BORDER = "1.5px solid rgba(168,85,247,0.4)";

// --- Stat pill ---
const StatPill: React.FC<{ label: string; value: string | number; accent?: string }> = ({ label, value, accent = 'text-white' }) => (
    <div className="flex flex-col items-center px-3 py-1 rounded-xl"
        style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <span className="text-purple-300 text-[8px] font-bold uppercase tracking-wider leading-none">{label}</span>
        <span className={`${accent} font-black text-base leading-tight font-mono`}>{value}</span>
    </div>
);

// --- 3D Button ---
const Btn3D: React.FC<{ onClick?: () => void; disabled?: boolean; color?: string; shadow?: string; border?: string; className?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({
    onClick, disabled, color = 'linear-gradient(180deg,#a855f7,#7c3aed)', shadow = '0 4px 0 #3b0764', border = '1px solid rgba(255,255,255,0.2)', className = '', style, children
}) => (
    <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={`btn-3d font-black uppercase tracking-wide transition-all active:translate-y-[2px] ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'} ${className}`}
        style={{ background: disabled ? '#333' : color, boxShadow: disabled ? 'none' : shadow, border, ...style }}
    >
        {children}
    </button>
);

export const MiniGameModal: React.FC<MiniGameModalProps> = ({
    isOpen, diceCredits, wildCredits, wildStage, diceStage, dicePosition = 0, activeGame, savedGrid,
    onSelectMode, onBuyPicks, onPickTile, onBatchPick, onStageComplete, onGridUpdate, onDiceRoll, onClose, playerLevel, maxBet
}) => {
    const currentGridSize = GRID_SIZES[Math.min(wildStage - 1, GRID_SIZES.length - 1)];
    const totalCells = currentGridSize * currentGridSize;

    const [grid, setGrid] = useState<WildGridCell[]>([]);
    const [stageWinning, setStageWinning] = useState(false);

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
        const cells: WildGridCell[] = Array(totalCells).fill({ revealed: false, content: 'BLANK' });
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
                else reward = { type: 'DIAMONDS', value: 5, label: '5 💎' };
                cells[i] = { revealed: false, content: 'REWARD', reward };
            }
        }
        setGrid(cells);
        if (onGridUpdate) onGridUpdate(cells);
    }, [wildStage, totalCells, playerLevel, maxBet, onGridUpdate]);

    const initBoard = useCallback(() => {
        const newBoard: BoardStep[] = [];
        const baseCoin = (maxBet || 10000) * diceStage * 0.2;
        for (let i = 0; i <= boardLength; i++) {
            let reward: MiniGameReward | undefined;
            if (i > 0 && i < boardLength && Math.random() < 0.35) {
                const r = Math.random();
                if (r < 0.6) reward = { type: 'COINS', value: baseCoin, label: formatNumber(baseCoin) };
                else if (r < 0.8) reward = { type: 'COINS', value: baseCoin * 2.5, label: formatNumber(baseCoin * 2.5) };
                else if (r < 0.9) reward = { type: 'DIAMONDS', value: 50, label: '50 💎' };
                else reward = { type: 'PICKS', value: 1, label: '+1 Roll' };
            }
            newBoard.push({ index: i, isStart: i === 0, isFinish: i === boardLength, reward });
        }
        setBoard(newBoard);
        setVisualPosition(0);
    }, [boardLength, diceStage, playerLevel, maxBet]);

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
            const container = boardContainerRef.current;
            const el = container.children[visualPosition] as HTMLElement;
            if (el) container.scrollTo({ left: el.offsetLeft - container.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' });
        }
    }, [visualPosition, activeGame]);

    useEffect(() => {
        if (autoRoll && !isRolling && !isMoving && diceCredits > 0) {
            const t = setTimeout(handleRollDice, 1000);
            return () => clearTimeout(t);
        } else if (autoRoll && diceCredits <= 0) setAutoRoll(false);
    }, [autoRoll, isRolling, isMoving, diceCredits]);

    const handleTileClick = (index: number) => {
        if (wildCredits <= 0 || grid[index].revealed || stageWinning) return;
        const cell = grid[index];
        const newGrid = [...grid];
        newGrid[index] = { ...cell, revealed: true };
        setGrid(newGrid);
        if (onGridUpdate) onGridUpdate(newGrid);
        if (cell.content === 'GEM') {
            audioService.playGemFound();
            setStageWinning(true);
            setTimeout(() => { onStageComplete(50000 * wildStage, 10 * wildStage); setStageWinning(false); }, 2000);
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
            setTimeout(() => { onStageComplete(50000 * wildStage, 10 * wildStage); setStageWinning(false); }, 2000);
        } else { if (rewards.length > 0) audioService.playWinSmall(); else audioService.playStoneBreak(); }
    };

    const movePlayerStepByStep = async (start: number, end: number, collectedRewards: MiniGameReward[]) => {
        setIsMoving(true);
        const finalPos = Math.min(end, boardLength);
        for (let i = start + 1; i <= finalPos; i++) {
            setVisualPosition(i);
            audioService.playClick();
            const step = board.find(s => s.index === i);
            if (step?.reward) collectedRewards.push(step.reward);
            await new Promise(r => setTimeout(r, 400));
        }
        setIsMoving(false);
        const isFinish = finalPos >= boardLength;
        onDiceRoll(0, finalPos, collectedRewards, isFinish);
        if (isFinish) { audioService.playWinBig(); setAutoRoll(false); }
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
                movePlayerStepByStep(visualPosition, visualPosition + final, []);
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

    const handleBuyGems = () => { onBuyPicks(1, GEM_COST, 'GEMS'); audioService.playClick(); };

    if (!isOpen) return null;

    // ─── Shared topbar ───────────────────────────────────────────────
    const isWild = activeGame === 'WILD';
    const questTitle = isWild ? '🗿 Wild Quest' : '🎲 Dice Quest';

    return (
        <div className="fixed inset-0 z-[150] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(160deg,#3b0764 0%,#1e0438 60%,#0d0220 100%)' }}>

            {/* ── Topbar ── */}
            <div className="shrink-0 flex items-center gap-2 px-3 h-[44px] z-20"
                style={{ background: HDR, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-arrow-left"></i></div>
                <span className="font-black text-white text-sm uppercase tracking-widest drop-shadow">{questTitle}</span>
                <div className="flex-1 flex flex-col items-end justify-center">
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(253,230,138,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1 }}>Stage Prize</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, background: 'linear-gradient(180deg,#fff8a0,#ffd700 50%,#ff9500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))', whiteSpace: 'nowrap', lineHeight: 1.1 }}>
                        💰 {formatCommaNumber((maxBet || 10000) * (isWild ? wildStage : diceStage) * 10)}
                    </span>
                </div>
            </div>

            {/* ── WILD QUEST ── */}
            {activeGame === 'WILD' && (
                <div className="flex-1 flex overflow-hidden relative">
                    {/* Stage-clear overlay */}
                    {stageWinning && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.85)' }}>
                            <div style={{ fontSize: '72px', lineHeight: 1, filter: 'drop-shadow(0 0 24px rgba(96,165,250,0.8))' }} className="animate-bounce">💎</div>
                            <div className="mt-3 text-2xl font-black text-white uppercase tracking-widest">Stage Clear!</div>
                        </div>
                    )}

                    {/* Grid area — flex-1 */}
                    <div className="flex-1 flex items-center justify-center p-3">
                        <div className="relative p-3 rounded-2xl"
                            style={{
                                background: 'linear-gradient(160deg,#2e1065,#1a0a3e)',
                                border: '1.5px solid rgba(139,92,246,0.4)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.1)',
                            }}>
                            <div
                                className="grid gap-2"
                                style={{ gridTemplateColumns: `repeat(${currentGridSize}, minmax(0, 1fr))` }}
                            >
                                {grid.map((cell, i) => {
                                    const revealed = cell.revealed;
                                    const isGem = revealed && cell.content === 'GEM';
                                    const isReward = revealed && cell.content === 'REWARD';
                                    const icon = isGem ? '💎' : isReward
                                        ? (cell.reward?.type === 'COINS' ? '💰' : cell.reward?.type === 'PICKS' ? '⛏️' : '💎')
                                        : null;
                                    const tileSize = currentGridSize >= 6 ? 42 : currentGridSize >= 5 ? 48 : currentGridSize >= 4 ? 54 : 62;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleTileClick(i)}
                                            disabled={revealed || wildCredits <= 0}
                                            className="relative flex flex-col items-center justify-center rounded-xl active:translate-y-[2px] transition-all overflow-hidden"
                                            style={{
                                                width: tileSize,
                                                height: tileSize,
                                                background: revealed
                                                    ? (isGem ? 'linear-gradient(180deg,#1d4ed8,#1e3a8a)' : isReward ? 'linear-gradient(180deg,#15803d,#14532d)' : 'linear-gradient(180deg,#1f1f2e,#12121e)')
                                                    : 'linear-gradient(180deg,#7c3aed,#5b21b6)',
                                                boxShadow: revealed ? 'none' : '0 4px 0 #3b0764, 0 6px 12px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.18)',
                                                border: revealed ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(167,139,250,0.4)',
                                                cursor: revealed || wildCredits <= 0 ? 'default' : 'pointer',
                                            }}
                                        >
                                            {icon ? (
                                                <>
                                                    <span style={{ fontSize: currentGridSize >= 5 ? '1.1rem' : '1.4rem', lineHeight: 1 }}>{icon}</span>
                                                    {isReward && <span className="text-[7px] font-black text-white/80 mt-0.5 leading-none">{cell.reward?.label}</span>}
                                                </>
                                            ) : (
                                                <span className="text-purple-300/40 font-black text-lg">?</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right sidebar — stats + buy buttons */}
                    <div className="shrink-0 flex flex-col gap-3 p-3 justify-center"
                        style={{ width: 136, background: 'rgba(0,0,0,0.4)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                        {/* Stats */}
                        <StatPill label="Stage" value={wildStage} accent="text-fuchsia-300" />
                        <StatPill label="Credits" value={wildCredits} accent="text-yellow-300" />
                        {/* Buy buttons */}
                        <div className="flex flex-col gap-2 mt-1">
                            <Btn3D onClick={handleBuyGems}
                                color="linear-gradient(180deg,#0ea5e9,#0369a1)" shadow="0 3px 0 #0c4a6e"
                                className="w-full py-2 rounded-xl text-white" style={{ fontSize: '0.68rem' }}>
                                +1 Credit<br />{GEM_COST} 💎
                            </Btn3D>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DICE QUEST ── */}
            {activeGame === 'DICE' && (
                <>
                    {/* Board */}
                    <div className="flex-1 flex items-center justify-center relative w-full overflow-hidden px-2">
                        {/* Scroll arrows */}
                        <button onClick={() => boardContainerRef.current?.scrollBy({ left: -140, behavior: 'smooth' })}
                            className="absolute left-1 z-30 w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm"
                            style={{ background: 'linear-gradient(180deg,#7c3aed,#4c1d95)', boxShadow: '0 3px 0 #2e1065' }}>◀</button>
                        <button onClick={() => boardContainerRef.current?.scrollBy({ left: 140, behavior: 'smooth' })}
                            className="absolute right-1 z-30 w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm"
                            style={{ background: 'linear-gradient(180deg,#7c3aed,#4c1d95)', boxShadow: '0 3px 0 #2e1065' }}>▶</button>

                        <div
                            ref={boardContainerRef}
                            className="flex items-end gap-2 overflow-x-auto no-scrollbar px-[45%] py-4"
                            style={{ scrollBehavior: 'smooth' }}
                        >
                            {board.map((step) => {
                                const isHere = step.index === visualPosition;
                                const isPast = step.index < visualPosition;
                                const bg = step.isFinish
                                    ? 'linear-gradient(180deg,#f59e0b,#b45309)'
                                    : step.isStart
                                    ? 'linear-gradient(180deg,#22c55e,#15803d)'
                                    : isPast
                                    ? 'linear-gradient(180deg,#374151,#1f2937)'
                                    : 'linear-gradient(180deg,#7c3aed,#4c1d95)';
                                const shadow = step.isFinish ? '0 4px 0 #78350f' : step.isStart ? '0 4px 0 #14532d' : isPast ? '0 2px 0 #111' : '0 4px 0 #2e1065';

                                return (
                                    <div key={step.index}
                                        className="relative shrink-0 flex flex-col items-center justify-center rounded-xl"
                                        style={{
                                            width: 68, height: isHere ? 90 : 72,
                                            background: bg,
                                            boxShadow: `${shadow}, 0 6px 16px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.15)`,
                                            border: isHere ? '2px solid #fde68a' : '1px solid rgba(255,255,255,0.12)',
                                            transition: 'all 0.3s ease',
                                        }}>

                                        {/* Step number */}
                                        <span className="absolute top-1 left-1.5 text-[8px] font-black text-white/50">
                                            {step.isStart ? 'GO' : step.isFinish ? '🏆' : `#${step.index}`}
                                        </span>

                                        {/* Player avatar */}
                                        {isHere && (
                                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-10">
                                                <span style={{ fontSize: '1.6rem', lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>🤠</span>
                                            </div>
                                        )}

                                        {/* Reward or checkmark */}
                                        {isPast && !step.isStart ? (
                                            <span className="text-green-400 text-xl font-black">✓</span>
                                        ) : step.reward && !step.isFinish && !step.isStart ? (
                                            <div className="flex flex-col items-center gap-0.5 mt-2">
                                                <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>
                                                    {step.reward.type === 'COINS' ? '💰' : step.reward.type === 'DIAMONDS' ? '💎' : '⛏️'}
                                                </span>
                                                <span className="text-[8px] font-black text-white/80 bg-black/40 px-1 rounded leading-none">{step.reward.label}</span>
                                            </div>
                                        ) : step.isStart ? (
                                            <span className="text-xs font-black text-white mt-1">Start</span>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Controls footer — left: +rolls, center: dice+roll, right: stats */}
                    <div className="shrink-0 flex items-center px-3 py-2 gap-3"
                        style={{ background: 'rgba(0,0,0,0.45)', borderTop: '1px solid rgba(255,255,255,0.07)', minHeight: 100 }}>

                        {/* Left — buy roll buttons */}
                        <div className="flex flex-col gap-2" style={{ width: 130 }}>
                            <Btn3D onClick={handleBuyGems}
                                color="linear-gradient(180deg,#0ea5e9,#0369a1)" shadow="0 3px 0 #0c4a6e"
                                className="w-full py-2 rounded-xl text-white" style={{ fontSize: '0.68rem' }}>
                                +1 Credit · {GEM_COST} 💎
                            </Btn3D>
                        </div>

                        {/* Center — dice + roll button */}
                        <div className="flex-1 flex items-center justify-center gap-5">
                            <DiceFace value={diceValue} rolling={isRolling} size={72} />
                            <div className="flex flex-col items-center gap-1">
                                <button
                                    onMouseDown={handleRollMouseDown}
                                    onMouseUp={handleRollMouseUp}
                                    onMouseLeave={handleRollMouseUp}
                                    onTouchStart={handleRollMouseDown}
                                    onTouchEnd={handleRollMouseUp}
                                    disabled={diceCredits <= 0}
                                    className="relative w-20 h-20 rounded-full flex flex-col items-center justify-center font-black uppercase tracking-widest text-sm transition-all active:translate-y-[3px]"
                                    style={{
                                        background: autoRoll
                                            ? 'linear-gradient(180deg,#ef4444,#b91c1c)'
                                            : diceCredits > 0
                                            ? 'linear-gradient(180deg,#fbbf24,#d97706)'
                                            : '#374151',
                                        boxShadow: diceCredits > 0
                                            ? (autoRoll ? '0 5px 0 #7f1d1d, 0 8px 20px rgba(0,0,0,0.5)' : '0 5px 0 #92400e, 0 8px 20px rgba(0,0,0,0.5)')
                                            : 'none',
                                        border: '2px solid rgba(255,255,255,0.2)',
                                        color: diceCredits > 0 ? (autoRoll ? 'white' : '#1c1917') : '#6b7280',
                                        cursor: diceCredits <= 0 ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    <span className="text-lg leading-none">{autoRoll ? 'STOP' : 'ROLL'}</span>
                                    {diceCredits > 0 && <span className="text-[8px] opacity-70 leading-none mt-0.5">{autoRoll ? 'Auto On' : 'Hold=Auto'}</span>}
                                </button>
                                <span className="text-purple-300 text-[9px] font-bold uppercase tracking-wide">{diceCredits} rolls left</span>
                            </div>
                        </div>

                        {/* Right — stats */}
                        <div className="flex flex-col gap-2" style={{ width: 110 }}>
                            <StatPill label="Stage" value={diceStage} accent="text-fuchsia-300" />
                            <StatPill label="Credits" value={diceCredits} accent="text-yellow-300" />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
