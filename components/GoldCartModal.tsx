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
const LAND_CHANCE = 0.13;

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

const KIND_LABEL: Record<CellKind, string> = { value: '', payer: 'PAY', collector: 'COL', sniper: 'SNP' };
const KIND_MSG: Record<CellKind, string> = { value: '', payer: 'Payer!', collector: 'Collector!', sniper: 'Sniper!' };

// Resolves modifier effects for cells that just landed, in index order — a Payer adds
// its value to every other present cell once, a Collector absorbs the sum of every
// other present cell's value into itself, a Sniper doubles 3 random other present cells.
const applyLandings = (grid: (Cell | null)[], newIndices: number[]): { grid: (Cell | null)[]; messages: string[] } => {
    const next = [...grid];
    const messages: string[] = [];
    for (const idx of newIndices) {
        const cell = next[idx];
        if (!cell) continue;
        if (cell.kind === 'payer') {
            for (let i = 0; i < next.length; i++) {
                if (i === idx || !next[i]) continue;
                next[i] = { ...next[i]!, value: next[i]!.value + cell.value };
            }
            messages.push(KIND_MSG.payer);
        } else if (cell.kind === 'collector') {
            let sum = 0;
            for (let i = 0; i < next.length; i++) { if (i !== idx && next[i]) sum += next[i]!.value; }
            next[idx] = { ...cell, value: cell.value + sum };
            messages.push(KIND_MSG.collector);
        } else if (cell.kind === 'sniper') {
            const others = next.map((c, i) => ({ c, i })).filter(x => x.i !== idx && x.c);
            for (let i = others.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [others[i], others[j]] = [others[j], others[i]];
            }
            others.slice(0, 3).forEach(({ i, c }) => { next[i] = { ...c!, value: c!.value * 2 }; });
            messages.push(KIND_MSG.sniper);
        }
    }
    return { grid: next, messages };
};

interface Props { isOpen: boolean; bet: number; triggerCount: number; onComplete: (total: number) => void; }
type Phase = 'active' | 'result';

export const GoldCartModal: React.FC<Props> = ({ isOpen, bet, triggerCount, onComplete }) => {
    const [grid, setGrid] = useState<(Cell | null)[]>(() => Array(TOTAL_CELLS).fill(null));
    const [respins, setRespins] = useState(3);
    const [phase, setPhase] = useState<Phase>('active');
    const [flashMsg, setFlashMsg] = useState<string | null>(null);
    const [finalTotal, setFinalTotal] = useState(0);
    const [wasFull, setWasFull] = useState(false);
    const initedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimers = () => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        if (flashTimerRef.current) { clearTimeout(flashTimerRef.current); flashTimerRef.current = null; }
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
        const seeded: (Cell | null)[] = Array(TOTAL_CELLS).fill(null);
        seedIdx.forEach(p => { seeded[p] = makeCell(bet); });
        const { grid: resolved, messages } = applyLandings(seeded, seedIdx);

        setGrid(resolved);
        setRespins(3);
        setPhase('active');
        setFinalTotal(0);
        setWasFull(false);
        if (messages.length) showFlash(messages[messages.length - 1]);
        audioService.playBonusTrigger();
        scheduleNext(resolved, 3);

        return () => clearTimers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const showFlash = (msg: string) => {
        setFlashMsg(msg);
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

    const scheduleNext = (currentGrid: (Cell | null)[], currentRespins: number) => {
        timerRef.current = setTimeout(() => {
            const emptyIdx = currentGrid.map((c, i) => (c ? -1 : i)).filter(i => i >= 0);
            const newIdx = emptyIdx.filter(() => Math.random() < LAND_CHANCE);

            if (newIdx.length === 0) {
                const nr = currentRespins - 1;
                setRespins(nr);
                audioService.playTick();
                if (nr <= 0) { finish(currentGrid, false); return; }
                scheduleNext(currentGrid, nr);
                return;
            }

            const withNew = [...currentGrid];
            newIdx.forEach(i => { withNew[i] = makeCell(bet); });
            const { grid: resolved, messages } = applyLandings(withNew, newIdx);
            setGrid(resolved);
            setRespins(3);
            audioService.playWinSmall();
            if (messages.length) showFlash(messages[messages.length - 1]);

            const filled = resolved.every(c => !!c);
            if (filled) { finish(resolved, true); return; }
            scheduleNext(resolved, 3);
        }, 1300);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-pop-in select-none">
            <div className="w-full max-w-[420px] rounded-3xl overflow-hidden flex flex-col"
                style={{ background: 'linear-gradient(180deg,#6b4423 0%,#4a2e15 35%,#241608 100%)', boxShadow: 'inset 0 1px 0 rgba(255,214,140,0.3), 0 8px 32px rgba(0,0,0,0.85)' }}>

                <div className="flex flex-col items-center pt-4 pb-2 relative">
                    <span className="font-black text-amber-200/70" style={{ fontSize: 11 }}>Gold Cart Bonus</span>
                    <div className="flex items-center gap-1.5 mt-1">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="rounded-full" style={{
                                width: 9, height: 9,
                                background: i < respins ? '#ffd633' : 'rgba(255,255,255,0.15)',
                                boxShadow: i < respins ? '0 0 6px rgba(255,214,51,0.9)' : 'none',
                            }} />
                        ))}
                        <span className="font-black text-amber-100 ml-1" style={{ fontSize: 12 }}>Respins {Math.max(respins, 0)}/3</span>
                    </div>

                    {flashMsg && (
                        <div className="absolute top-1 animate-pop-in font-black text-white rounded-full px-3 py-0.5"
                            style={{ background: 'linear-gradient(180deg,#f59e0b,#b45309)', fontSize: 12, boxShadow: '0 0 14px rgba(245,158,11,0.8)' }}>
                            {flashMsg}
                        </div>
                    )}
                </div>

                {/* 5x3 grid */}
                <div className="px-4 pb-4">
                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                        {grid.map((cell, i) => (
                            <div key={i} className="relative flex items-center justify-center rounded-lg overflow-hidden"
                                style={{
                                    aspectRatio: '1 / 1',
                                    background: cell ? 'linear-gradient(180deg,#3a2410,#1c1206)' : 'rgba(0,0,0,0.25)',
                                    boxShadow: cell ? 'inset 0 0 0 2px rgba(255,214,140,0.35), 0 0 10px rgba(255,180,40,0.4)' : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                                }}>
                                {cell && (
                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                        {cell.kind !== 'value' && (
                                            <span className="font-black" style={{
                                                fontSize: 9, letterSpacing: '0.04em',
                                                color: cell.kind === 'payer' ? '#86efac' : cell.kind === 'collector' ? '#93c5fd' : '#fca5a5',
                                            }}>
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
                        ))}
                    </div>
                </div>
            </div>

            {phase === 'result' && (
                <div className="absolute inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-pop-in">
                    <div className="flex flex-col items-center gap-2.5 rounded-3xl px-8 py-7 text-center overflow-hidden"
                        style={{ background: 'linear-gradient(180deg,#6b4423 0%,#4a2e15 35%,#241608 100%)', boxShadow: 'inset 0 1px 0 rgba(255,214,140,0.3), 0 8px 32px rgba(0,0,0,0.85)', maxWidth: 300 }}>
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
