import React, { useEffect, useRef, useState } from 'react';
import { formatCommaNumber } from '../constants';
import { audioService } from '../services/audioService';
import { WheelDefs, WheelRim, WheelGloss, containerShell } from './wheel3d';

interface Seg {
    label: string;
    color: string;
    textColor: string;
    mult?: number;
    jp?: string;
    baseWeight: number;
}

// 10 half-pie segments. Multipliers pay bet × mult and respin. Jackpots end the game.
const SEGMENTS: Seg[] = [
    { label: '2×',    color: '#1d4ed8', textColor: '#bfdbfe', mult: 2,  baseWeight: 28   },
    { label: '3×',    color: '#1a5c2b', textColor: '#bbf7d0', mult: 3,  baseWeight: 18   },
    { label: 'MINI',  color: '#064e3b', textColor: '#6ee7b7', jp: 'MINI',  baseWeight: 12  },
    { label: '4×',    color: '#5b21b6', textColor: '#ddd6fe', mult: 4,  baseWeight: 14   },
    { label: '5×',    color: '#166534', textColor: '#bbf7d0', mult: 5,  baseWeight: 8    },
    { label: 'MINOR', color: '#0c4a6e', textColor: '#7dd3fc', jp: 'MINOR', baseWeight: 5  },
    { label: 'MAJOR', color: '#6b21a8', textColor: '#d8b4fe', jp: 'MAJOR', baseWeight: 0.6},
    { label: '10×',   color: '#7c3aed', textColor: '#e9d5ff', mult: 10, baseWeight: 3    },
    { label: 'MEGA',  color: '#9f1239', textColor: '#fda4af', jp: 'MEGA',  baseWeight: 0.2},
    { label: 'GRAND', color: '#78350f', textColor: '#fde68a', jp: 'GRAND', baseWeight: 0.05},
];

// Jackpot chance per spin (0-indexed multCount). Spin 5+ is always jackpot.
// Spin 1: 50%, Spin 2: 60%, Spin 3: 75%, Spin 4: 90%, Spin 5+: 100%
const JP_CHANCE = [0.50, 0.60, 0.75, 0.90, 1.0];

const N = SEGMENTS.length;
const SEG_DEG = 360 / N;
const SPIN_MS = 12000;
const R = 110; const CX = 120; const CY = 120; const SZ = 240;

const pickSeg = (multCount: number): number => {
    const jpChance = JP_CHANCE[Math.min(multCount, 4)];
    const useJp = Math.random() < jpChance;
    const pool = useJp
        ? SEGMENTS.filter(s => s.jp !== undefined)
        : SEGMENTS.filter(s => s.mult !== undefined);
    const total = pool.reduce((a, s) => a + s.baseWeight, 0);
    let r = Math.random() * total;
    for (const s of pool) { r -= s.baseWeight; if (r <= 0) return SEGMENTS.indexOf(s); }
    return SEGMENTS.indexOf(pool[pool.length - 1]);
};

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const polarXY = (deg: number, r: number) => {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
};

const slicePath = (i: number) => {
    const s = polarXY(i * SEG_DEG, R), e = polarXY((i + 1) * SEG_DEG, R);
    return `M ${CX} ${CY} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
};

const JP_IDX: Record<string, number> = { MINI: 0, MINOR: 1, MAJOR: 2, MEGA: 3, GRAND: 4 };

interface Props { isOpen: boolean; bet: number; jackpotAmounts: number[]; onMultPayout?: (amount: number) => void; onComplete: (prize: number) => void; onClose?: () => void; onRunningTotal?: (total: number) => void; }
type Phase = 'prompt' | 'ready' | 'spinning' | 'mult_popup' | 'done';

export const NeonRouletteModal: React.FC<Props> = ({ isOpen, bet, jackpotAmounts, onMultPayout, onComplete, onClose, onRunningTotal }) => {
    const [phase, setPhase] = useState<Phase>('prompt');
    const [rotation, setRotation] = useState(0);
    const [liveSeg, setLiveSeg] = useState<Seg>(SEGMENTS[0]);
    const [wonSeg, setWonSeg] = useState<Seg | null>(null);
    const [showClaim, setShowClaim] = useState(false);
    const [prize, setPrize] = useState(0);
    const [multPayout, setMultPayout] = useState(0);   // amount shown in mult popup
    const [multCount, setMultCount] = useState(0);
    const [totalMultWins, setTotalMultWins] = useState(0);  // running sum of multiplier wins
    const [showSummary, setShowSummary] = useState(false);  // end-of-roulette summary popup
    const [summaryTotal, setSummaryTotal] = useState(0);

    const totalRotRef = useRef(0);
    const spinFromRef = useRef(0);
    const spinToRef = useRef(0);
    const spinTimeRef = useRef(0);
    const trackRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const betRef = useRef(bet);
    const jpRef = useRef(jackpotAmounts);
    const multCountRef = useRef(0);
    const doSpinRef = useRef<(multCnt: number) => void>(() => {});

    useEffect(() => { betRef.current = bet; }, [bet]);
    useEffect(() => { jpRef.current = jackpotAmounts; }, [jackpotAmounts]);

    const clearAll = () => {
        if (trackRef.current) { clearInterval(trackRef.current); trackRef.current = null; }
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };

    const doSpin = (mc: number) => {
        const segIdx = pickSeg(mc);
        const cur = totalRotRef.current;
        const curMod = ((cur % 360) + 360) % 360;
        const midDeg = segIdx * SEG_DEG + SEG_DEG / 2;
        const targetMod = (360 - midDeg % 360 + 360) % 360;
        let extra = targetMod - curMod;
        if (extra < 0) extra += 360;
        const finalRot = cur + 15 * 360 + extra;

        totalRotRef.current = finalRot;
        spinFromRef.current = cur;
        spinToRef.current = finalRot;
        spinTimeRef.current = Date.now();

        setRotation(finalRot);
        setPhase('spinning');
        audioService.playWheelSpin();

        clearAll();
        trackRef.current = setInterval(() => {
            const elapsed = Date.now() - spinTimeRef.current;
            const t = Math.min(elapsed / SPIN_MS, 1);
            const currentRot = spinFromRef.current + (spinToRef.current - spinFromRef.current) * easeOut(t);
            const mod = ((currentRot % 360) + 360) % 360;
            const idx = Math.floor((360 - mod + 360) % 360 / SEG_DEG) % N;
            setLiveSeg(SEGMENTS[idx]);

            if (t >= 1) {
                clearAll();
                const seg = SEGMENTS[segIdx];
                setLiveSeg(seg);
                setWonSeg(seg);

                if (seg.mult !== undefined) {
                    // Multiplier: pay out and respin
                    const payout = betRef.current * seg.mult;
                    setMultPayout(payout);
                    setTotalMultWins(prev => prev + payout);
                    onMultPayout?.(payout);
                    const newMc = mc + 1;
                    multCountRef.current = newMc;
                    setMultCount(newMc);
                    setPhase('mult_popup');
                    // Show popup for 2.5s then respin
                    timerRef.current = setTimeout(() => {
                        doSpinRef.current(newMc);
                    }, 2500);
                } else {
                    // Jackpot: compute total and show summary popup
                    const amt = jpRef.current[JP_IDX[seg.jp!]] ?? betRef.current * 50;
                    setPrize(amt);
                    setPhase('done');
                    // Capture totalMultWins via functional update to get fresh value
                    setTotalMultWins(prev => {
                        setSummaryTotal(prev + amt);
                        return prev;
                    });
                    timerRef.current = setTimeout(() => setShowSummary(true), 500);
                }
            }
        }, 40);
    };
    doSpinRef.current = doSpin;

    useEffect(() => {
        if (!isOpen) {
            clearAll();
            totalRotRef.current = 0;
            multCountRef.current = 0;
            setPhase('prompt');
            setRotation(0);
            setLiveSeg(SEGMENTS[0]);
            setWonSeg(null);
            setShowClaim(false);
            setShowSummary(false);
            setPrize(0);
            setMultCount(0);
            setMultPayout(0);
            setTotalMultWins(0);
            setSummaryTotal(0);
            onRunningTotal?.(0);
        }
    }, [isOpen]);

    useEffect(() => { onRunningTotal?.(totalMultWins); }, [totalMultWins]);

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[200] animate-pop-in select-none">

            {/* Bonus prompt popup — new 3D gradient container */}
            {phase === 'prompt' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-pop-in flex flex-col items-center gap-2 rounded-3xl px-7 py-5 text-center overflow-hidden"
                        style={{ ...containerShell('neon'), maxWidth: 260 }}>
                        <div className="font-black text-white uppercase tracking-wide text-xl leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                            Roulette Bonus
                        </div>
                        <div className="text-sky-100/80 text-[11px] font-black uppercase tracking-[0.2em]">Bonus Round</div>
                        <button
                            onClick={() => setPhase('ready')}
                            className="btn-3d w-full py-2.5 rounded-2xl font-black text-sm uppercase tracking-widest mt-1"
                            style={{ background: 'linear-gradient(180deg,#93c5fd,#2563eb)', color: '#fff', boxShadow: '0 4px 0 #1e3a8a' }}>
                            Spin Now!
                        </button>
                    </div>
                </div>
            )}

            {/* Wheel — fixed location (lower, clears jackpot text), never moves */}
            {phase !== 'prompt' && (
                <div className="absolute" style={{ left: '50%', top: 92, transform: 'translateX(-50%)', width: SZ, height: SZ }}>
                    {/* Wheel */}
                    <div className="relative"
                        style={{ width: SZ, height: SZ, cursor: phase === 'ready' ? 'pointer' : 'default' }}
                        onClick={phase === 'ready' ? () => doSpinRef.current(0) : undefined}>

                        {/* Arrow at 12 o'clock */}
                        <div className="absolute z-20 pointer-events-none"
                            style={{ top: CY - R - 14, left: '50%', transform: 'translateX(-50%)' }}>
                            <svg width={26} height={22}>
                                <polygon points="13,20 2,2 24,2" fill="#fbbf24" stroke="#78350f" strokeWidth={1.5} />
                            </svg>
                        </div>

                        <svg width={SZ} height={SZ} style={{ overflow: 'visible' }}>
                            <WheelDefs colors={SEGMENTS.map(s => s.color)} idPrefix="nw" />
                            <WheelRim idPrefix="nw" />

                            {/* Wedges (rotating) */}
                            <g style={{
                                transform: `rotate(${rotation}deg)`,
                                transformOrigin: `${CX}px ${CY}px`,
                                transition: phase === 'spinning' ? `transform ${SPIN_MS}ms cubic-bezier(0.05, 0.8, 0.3, 1)` : 'none',
                            }}>
                                {SEGMENTS.map((seg, i) => (
                                    <path key={i} d={slicePath(i)} fill={`url(#nw${i})`} />
                                ))}
                            </g>

                            {/* Glossy dome overlay (fixed) */}
                            <WheelGloss idPrefix="nw" />

                            {/* Labels (rotating, above gloss) */}
                            <g style={{
                                transform: `rotate(${rotation}deg)`,
                                transformOrigin: `${CX}px ${CY}px`,
                                transition: phase === 'spinning' ? `transform ${SPIN_MS}ms cubic-bezier(0.05, 0.8, 0.3, 1)` : 'none',
                            }}>
                                {SEGMENTS.map((seg, i) => {
                                    const midDeg = i * SEG_DEG + SEG_DEG / 2;
                                    const lp = polarXY(midDeg, R * 0.72);
                                    const fs = seg.label.length > 3 ? 8 : seg.jp ? 10 : 9;
                                    return (
                                        <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
                                            fill="#fff" fontSize={fs} fontWeight={900}
                                            fontFamily="'Titan One', cursive"
                                            style={{ transform: `rotate(${midDeg}deg)`, transformOrigin: `${lp.x}px ${lp.y}px`, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}>
                                            {seg.label}
                                        </text>
                                    );
                                })}
                            </g>

                        </svg>

                        {phase === 'ready' && (
                            <div className="absolute pointer-events-none flex items-center justify-center"
                                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                <span className="font-black text-white text-center uppercase animate-pulse"
                                    style={{ fontSize: 11, letterSpacing: '0.14em', lineHeight: 1.5, textShadow: '0 2px 10px rgba(0,0,0,1), 0 0 24px rgba(0,0,0,0.9)' }}>
                                    TAP TO SPIN
                                </span>
                            </div>
                        )}

                        {/* Multiplier win popup — centered over wheel */}
                        {phase === 'mult_popup' && wonSeg && (
                            <div className="absolute z-30 pointer-events-none animate-pop-in"
                                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                <div className="flex flex-col items-center gap-1 rounded-2xl px-6 py-3 text-center overflow-hidden"
                                    style={{ ...containerShell('neon') }}>
                                    <div className="text-sky-100/70 text-[9px] font-black uppercase tracking-[0.25em]">{wonSeg.label} Bonus</div>
                                    <span className="font-black text-white text-2xl font-mono" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>+{formatCommaNumber(multPayout)}</span>
                                    <span className="text-white/50 text-[9px] uppercase tracking-widest animate-pulse">Spinning again…</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* End-of-roulette summary popup — new 3D gradient container */}
            {showSummary && wonSeg && (
                <div className="absolute inset-0 z-[210] flex items-center justify-center animate-pop-in">
                    <div className="flex flex-col items-center gap-3 rounded-3xl px-10 py-7 select-none overflow-hidden"
                        style={{ ...containerShell('neon'), minWidth: 250 }}>
                        <div className="text-sky-100/70 text-[10px] font-black uppercase tracking-widest">Roulette Complete</div>
                        <div className="font-black uppercase tracking-wider text-center text-white"
                            style={{ fontSize: '2rem', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                            {wonSeg.jp} Jackpot
                        </div>

                        {/* Breakdown */}
                        <div className="w-full flex flex-col gap-1.5 mt-1">
                            {totalMultWins > 0 && (
                                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.1)' }}>
                                    <span className="text-white/70 text-[10px] uppercase tracking-wide">Multiplier Wins</span>
                                    <span className="font-black text-yellow-300 text-sm font-mono">+{formatCommaNumber(totalMultWins)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl"
                                style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <span className="text-white/70 text-[10px] uppercase tracking-wide">Jackpot Prize</span>
                                <span className="font-black text-white text-sm font-mono">+{formatCommaNumber(prize)}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                                style={{ background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.35)' }}>
                                <span className="text-yellow-300 font-black text-[11px] uppercase tracking-wide">Total Won</span>
                                <span className="font-black text-yellow-300 text-base font-mono">+{formatCommaNumber(summaryTotal)}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => onComplete(prize)}
                            className="btn-3d w-full py-3 rounded-xl font-black uppercase tracking-widest text-black text-sm mt-1"
                            style={{ background: 'linear-gradient(180deg,#fbbf24,#f59e0b)', boxShadow: '0 5px 0 #92400e' }}>
                            Claim All
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
