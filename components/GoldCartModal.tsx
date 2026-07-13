import React, { useState, useRef, useEffect } from 'react';
import { audioService } from '../services/audioService';
import { formatK, formatKShort } from '../constants';

// Gold Rush — Gold Cart Bonus. Money Train 2/3/4's "Money Cart" bonus: 3+ bonus
// symbols open this separate hold-and-spin grid, where every symbol carries a
// bet-multiple cash value. 3 respins; any symbol landing (in any empty cell) resets
// the counter to 3. Special modifier symbols act on the grid exactly like Money
// Train's real ones: Payer adds its value to every other symbol once, Collector
// absorbs the sum of every other symbol's value into itself, Sniper doubles 3 random
// other symbols. A fully-filled grid doubles the total (stand-in for Money Train's
// row-unlock escalation — a future pass could add literal row unlocks).

type CellKind = 'value' | 'payer' | 'collector' | 'sniper';
interface Cell { kind: CellKind; value: number; }

const COLS = 5, ROWS = 3;
const TOTAL_CELLS = COLS * ROWS;
const LAND_CHANCE = 0.10;
// The last few empty cells land much less often — filling the whole cart should be
// a rare climax, not a routine outcome.
const fillDecay = (emptyCount: number): number => {
    if (emptyCount <= 2) return 0.22;
    if (emptyCount <= 5) return 0.5;
    if (emptyCount <= 8) return 0.8;
    return 1.0;
};

const SPIN_MS = 620;
const RESPIN_DELAY_MS = 1300;

const rollValue = (bet: number): number => {
    const r = Math.random();
    if (r < 0.42) return bet * 1;
    if (r < 0.70) return bet * 2;
    if (r < 0.86) return bet * 3;
    if (r < 0.96) return bet * 5;
    return bet * 10;
};

const rollKind = (): CellKind => {
    const r = Math.random();
    if (r < 0.86) return 'value';
    if (r < 0.92) return 'payer';
    if (r < 0.97) return 'collector';
    return 'sniper';
};

const makeCell = (bet: number): Cell => {
    const kind = rollKind();
    if (kind === 'value') return { kind, value: rollValue(bet) };
    if (kind === 'payer') return { kind, value: bet * (Math.random() < 0.5 ? 1 : 2) };
    return { kind, value: 0 };
};

const KIND_ICON: Record<CellKind, string> = { value: '', payer: 'ti-coins', collector: 'ti-magnet', sniper: 'ti-target' };
const KIND_LABEL: Record<CellKind, string> = { value: '', payer: 'PAY', collector: 'COL', sniper: 'SNP' };
const KIND_MSG: Record<CellKind, string> = { value: '', payer: 'Payer!', collector: 'Collector!', sniper: 'Sniper!' };
const KIND_COLOR: Record<CellKind, string> = { value: '#ffd740', payer: '#4ade80', collector: '#60a5fa', sniper: '#f87171' };

interface AffectedCell { idx: number; color: string; }

// Resolves modifier effects for cells that just landed, in index order — a Payer adds
// its value to every other present cell once, a Collector absorbs the sum of every
// other present cell's value into itself, a Sniper doubles 3 random other present cells.
// Also reports which cells were touched by a modifier (for the highlight flash).
const applyLandings = (grid: (Cell | null)[], newIndices: number[]): { grid: (Cell | null)[]; messages: string[]; affected: AffectedCell[] } => {
    const next = [...grid];
    const messages: string[] = [];
    const affected: AffectedCell[] = [];
    for (const idx of newIndices) {
        const cell = next[idx];
        if (!cell) continue;
        if (cell.kind === 'payer') {
            for (let i = 0; i < next.length; i++) {
                if (i === idx || !next[i]) continue;
                next[i] = { ...next[i]!, value: next[i]!.value + cell.value };
                affected.push({ idx: i, color: KIND_COLOR.payer });
            }
            messages.push(KIND_MSG.payer);
        } else if (cell.kind === 'collector') {
            let sum = 0;
            for (let i = 0; i < next.length; i++) { if (i !== idx && next[i]) sum += next[i]!.value; }
            next[idx] = { ...cell, value: cell.value + sum };
            affected.push({ idx, color: KIND_COLOR.collector });
            messages.push(KIND_MSG.collector);
        } else if (cell.kind === 'sniper') {
            const others = next.map((c, i) => ({ c, i })).filter(x => x.i !== idx && x.c);
            for (let i = others.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [others[i], others[j]] = [others[j], others[i]];
            }
            others.slice(0, 3).forEach(({ i, c }) => {
                next[i] = { ...c!, value: c!.value * 2 };
                affected.push({ idx: i, color: KIND_COLOR.sniper });
            });
            messages.push(KIND_MSG.sniper);
        }
    }
    return { grid: next, messages, affected };
};

interface Props { isOpen: boolean; bet: number; triggerCount: number; onComplete: (total: number) => void; }
type Phase = 'active' | 'result';

const SPIN_GLYPHS = ['?', '$', '¤', '9', '7', '3'];

export const GoldCartModal: React.FC<Props> = ({ isOpen, bet, triggerCount, onComplete }) => {
    const [grid, setGrid] = useState<(Cell | null)[]>(() => Array(TOTAL_CELLS).fill(null));
    const [respins, setRespins] = useState(3);
    const [respinPulse, setRespinPulse] = useState(0);
    const [phase, setPhase] = useState<Phase>('active');
    const [flashMsg, setFlashMsg] = useState<{ text: string; color: string } | null>(null);
    const [finalTotal, setFinalTotal] = useState(0);
    const [wasFull, setWasFull] = useState(false);
    const [spinningIdx, setSpinningIdx] = useState<Set<number>>(new Set());
    const [spinGlyphs, setSpinGlyphs] = useState<Record<number, string>>({});
    const [justLandedIdx, setJustLandedIdx] = useState<Set<number>>(new Set());
    const [affectedCells, setAffectedCells] = useState<AffectedCell[]>([]);

    const initedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const landedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const affectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearTimers = () => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        if (flashTimerRef.current) { clearTimeout(flashTimerRef.current); flashTimerRef.current = null; }
        if (landedTimerRef.current) { clearTimeout(landedTimerRef.current); landedTimerRef.current = null; }
        if (affectedTimerRef.current) { clearTimeout(affectedTimerRef.current); affectedTimerRef.current = null; }
        if (flickerRef.current) { clearInterval(flickerRef.current); flickerRef.current = null; }
    };

    useEffect(() => {
        if (!isOpen) { initedRef.current = false; clearTimers(); return; }
        if (initedRef.current) return;
        initedRef.current = true;

        const seedCount = Math.min(Math.max(triggerCount, 3), TOTAL_CELLS);
        const positions = Array.from({ length: TOTAL_CELLS }, (_, i) => i);
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }
        const seedIdx = positions.slice(0, seedCount);

        setGrid(Array(TOTAL_CELLS).fill(null));
        setRespins(3);
        setPhase('active');
        setFinalTotal(0);
        setWasFull(false);
        setJustLandedIdx(new Set());
        setAffectedCells([]);
        audioService.playBonusTrigger();

        spinIn(seedIdx, Array(TOTAL_CELLS).fill(null));

        return () => clearTimers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const showFlash = (msg: string, color: string) => {
        setFlashMsg({ text: msg, color });
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => setFlashMsg(null), 1100);
    };

    const finish = (finalGrid: (Cell | null)[], full: boolean) => {
        const sum = finalGrid.reduce((s, c) => s + (c?.value || 0), 0);
        const total = full ? sum * 2 : sum;
        setWasFull(full);
        setFinalTotal(total);
        setPhase('result');
        audioService.playWinSmall();
    };

    // Plays the "reel tumble" reveal for a batch of newly-landing cells: flicker
    // random glyphs briefly, then settle into the real rolled values and resolve
    // modifier effects, then schedule the next respin (or finish if the grid is full).
    const spinIn = (newIdx: number[], baseGrid: (Cell | null)[]) => {
        setSpinningIdx(new Set(newIdx));
        setSpinGlyphs(Object.fromEntries(newIdx.map(i => [i, SPIN_GLYPHS[Math.floor(Math.random() * SPIN_GLYPHS.length)]])));
        audioService.playTick();
        flickerRef.current = setInterval(() => {
            setSpinGlyphs(prev => {
                const next = { ...prev };
                newIdx.forEach(i => { next[i] = SPIN_GLYPHS[Math.floor(Math.random() * SPIN_GLYPHS.length)]; });
                return next;
            });
        }, 90);

        timerRef.current = setTimeout(() => {
            if (flickerRef.current) { clearInterval(flickerRef.current); flickerRef.current = null; }
            setSpinningIdx(new Set());

            const withNew = [...baseGrid];
            newIdx.forEach(i => { withNew[i] = makeCell(bet); });
            const { grid: resolved, messages, affected } = applyLandings(withNew, newIdx);

            setGrid(resolved);
            setJustLandedIdx(new Set(newIdx));
            audioService.playWinSmall();
            if (landedTimerRef.current) clearTimeout(landedTimerRef.current);
            landedTimerRef.current = setTimeout(() => setJustLandedIdx(new Set()), 550);

            if (affected.length) {
                setAffectedCells(affected);
                if (affectedTimerRef.current) clearTimeout(affectedTimerRef.current);
                affectedTimerRef.current = setTimeout(() => setAffectedCells([]), 900);
            }
            if (messages.length) {
                const lastKind = (Object.keys(KIND_MSG) as CellKind[]).find(k => KIND_MSG[k] === messages[messages.length - 1]);
                showFlash(messages[messages.length - 1], lastKind ? KIND_COLOR[lastKind] : '#f59e0b');
            }

            setRespins(3);
            setRespinPulse(p => p + 1);

            const filled = resolved.every(c => !!c);
            if (filled) {
                setTimeout(() => finish(resolved, true), 500);
                return;
            }
            scheduleNext(resolved);
        }, SPIN_MS);
    };

    const scheduleNext = (currentGrid: (Cell | null)[]) => {
        timerRef.current = setTimeout(() => {
            const emptySlots = currentGrid.map((c, i) => (c ? -1 : i)).filter(i => i >= 0);
            const chance = LAND_CHANCE * fillDecay(emptySlots.length);
            const newIdx = emptySlots.filter(() => Math.random() < chance);

            if (newIdx.length === 0) {
                setRespins(prev => {
                    const nr = prev - 1;
                    audioService.playTick();
                    if (nr <= 0) { finish(currentGrid, false); }
                    else { scheduleNext(currentGrid); }
                    return nr;
                });
                return;
            }

            spinIn(newIdx, currentGrid);
        }, RESPIN_DELAY_MS);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-pop-in select-none">
            <div className="w-full max-w-[420px] rounded-3xl overflow-hidden flex flex-col"
                style={{ background: 'linear-gradient(180deg,#5a3a1c 0%,#3a2410 40%,#1a1006 100%)', boxShadow: 'inset 0 1px 0 rgba(255,214,140,0.35), inset 0 0 40px rgba(0,0,0,0.4), 0 8px 36px rgba(0,0,0,0.9)' }}>

                <div className="flex flex-col items-center pt-4 pb-2 relative">
                    <div className="flex items-center gap-1.5">
                        <i className="ti ti-coins" style={{ fontSize: 13, color: 'rgba(255,214,140,0.7)' }} />
                        <span className="font-black text-amber-200/70" style={{ fontSize: 11, letterSpacing: '0.03em' }}>Gold Cart Bonus</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                        {[0, 1, 2].map(i => (
                            <div key={`${i}-${respinPulse}`} className="rounded-full animate-pop-in" style={{
                                width: 9, height: 9,
                                background: i < respins ? '#ffd633' : 'rgba(255,255,255,0.15)',
                                boxShadow: i < respins ? '0 0 8px rgba(255,214,51,0.95)' : 'none',
                            }} />
                        ))}
                        <span className="font-black text-amber-100 ml-1" style={{ fontSize: 12 }}>Respins {Math.max(respins, 0)}/3</span>
                    </div>

                    {flashMsg && (
                        <div className="absolute top-1 animate-pop-in font-black text-white rounded-full px-3 py-0.5"
                            style={{ background: `linear-gradient(180deg,${flashMsg.color},#1a1006)`, fontSize: 12, boxShadow: `0 0 16px ${flashMsg.color}99` }}>
                            {flashMsg.text}
                        </div>
                    )}
                </div>

                {/* 5x3 grid */}
                <div className="px-4 pb-4">
                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                        {grid.map((cell, i) => {
                            const isSpinning = spinningIdx.has(i);
                            const justLanded = justLandedIdx.has(i);
                            const fx = affectedCells.find(a => a.idx === i);
                            const glowColor = cell ? KIND_COLOR[cell.kind] : null;
                            return (
                                <div key={i} className={`relative flex items-center justify-center rounded-lg overflow-hidden ${isSpinning ? 'animate-bounce-sm' : ''} ${justLanded ? 'animate-pop-in' : ''}`}
                                    style={{
                                        aspectRatio: '1 / 1',
                                        background: cell || isSpinning ? 'linear-gradient(180deg,#3a2410,#150d05)' : 'rgba(0,0,0,0.3)',
                                        boxShadow: fx
                                            ? `inset 0 0 0 2px ${fx.color}, 0 0 16px ${fx.color}cc`
                                            : cell
                                                ? `inset 0 0 0 2px ${glowColor}55, 0 0 ${justLanded ? 14 : 8}px ${glowColor}66`
                                                : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                                        transition: 'box-shadow 0.3s ease',
                                    }}>
                                    {isSpinning && (
                                        <span className="font-black" style={{ fontSize: 18, color: 'rgba(255,214,140,0.55)', filter: 'blur(0.3px)' }}>
                                            {spinGlyphs[i] ?? '?'}
                                        </span>
                                    )}
                                    {!isSpinning && cell && (
                                        <div className="flex flex-col items-center justify-center gap-0.5">
                                            {cell.kind !== 'value' ? (
                                                <i className={`ti ${KIND_ICON[cell.kind]}`} style={{ fontSize: 15, color: KIND_COLOR[cell.kind] }} />
                                            ) : (
                                                <i className="ti ti-coin" style={{ fontSize: 11, color: 'rgba(255,214,51,0.55)' }} />
                                            )}
                                            {cell.kind !== 'value' && (
                                                <span className="font-black" style={{ fontSize: 8, letterSpacing: '0.05em', color: KIND_COLOR[cell.kind] }}>
                                                    {KIND_LABEL[cell.kind]}
                                                </span>
                                            )}
                                            {cell.value > 0 && (
                                                <span className="font-black text-amber-100" style={{ fontSize: 'clamp(11px,3.2vw,15px)', textShadow: '0 0 6px rgba(0,0,0,0.9)' }}>
                                                    {formatKShort(cell.value)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {phase === 'result' && (
                <div className="absolute inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-pop-in">
                    <div className="flex flex-col items-center gap-2.5 rounded-3xl px-8 py-7 text-center overflow-hidden"
                        style={{ background: 'linear-gradient(180deg,#5a3a1c 0%,#3a2410 40%,#1a1006 100%)', boxShadow: 'inset 0 1px 0 rgba(255,214,140,0.35), 0 8px 32px rgba(0,0,0,0.9)', maxWidth: 300 }}>
                        <span className="font-black text-amber-200/70" style={{ fontSize: 11 }}>{wasFull ? 'Full Cart! Doubled!' : 'Gold Cart Total'}</span>
                        <span className="font-tanker text-amber-300" style={{ fontSize: 34, lineHeight: 1, textShadow: '0 0 16px rgba(251,191,36,0.7)' }}>
                            +{formatK(finalTotal)}
                        </span>
                        <button onClick={() => onComplete(finalTotal)} className="pill-gold w-full mt-2">
                            <div className="pill-face" style={{ padding: '9px 12px', fontSize: '13px' }}>Collect</div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
