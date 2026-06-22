import React, { useEffect, useRef, useState, useCallback } from 'react';
import { formatCommaNumber } from '../constants';
import { audioService } from '../services/audioService';
import { containerShell } from './wheel3d';

interface Seg {
    label: string;
    color: string;
    textColor: string;
    mult?: number;
    jp?: string;
    baseWeight: number;
}

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

const JP_CHANCE = [0.50, 0.60, 0.75, 0.90, 1.0];
const N = SEGMENTS.length;
const SEG_DEG = 360 / N;
const SPIN_MS = 12000;
const JP_IDX: Record<string, number> = { MINI: 0, MINOR: 1, MAJOR: 2, MEGA: 3, GRAND: 4 };

// Canvas constants (2x pixel density, 240px display)
const CS = 480; const MID = CS / 2; const R = 175;

const pickSeg = (multCount: number): number => {
    const jpChance = JP_CHANCE[Math.min(multCount, 4)];
    const useJp = Math.random() < jpChance;
    const pool = useJp ? SEGMENTS.filter(s => s.jp) : SEGMENTS.filter(s => s.mult);
    const total = pool.reduce((a, s) => a + s.baseWeight, 0);
    let r = Math.random() * total;
    for (const s of pool) { r -= s.baseWeight; if (r <= 0) return SEGMENTS.indexOf(s); }
    return SEGMENTS.indexOf(pool[pool.length - 1]);
};

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function drawWheel(ctx: CanvasRenderingContext2D, angleDeg: number, bulbPhase: number) {
    const arcAngle = (Math.PI * 2) / N;
    const offsetAngle = -Math.PI / 2;
    const angle = angleDeg * Math.PI / 180;

    ctx.clearRect(0, 0, CS, CS);

    // Outer chassis ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(MID, MID, R + 26, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1830';
    ctx.shadowBlur = 40;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(MID, MID, R + 17, 0, Math.PI * 2);
    ctx.strokeStyle = '#0f0e20';
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.restore();

    // Sectors (rotating)
    ctx.save();
    ctx.translate(MID, MID);
    ctx.rotate(angle);

    for (let i = 0; i < N; i++) {
        const startAng = i * arcAngle + offsetAngle;
        const endAng = startAng + arcAngle;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, startAng, endAng);
        ctx.closePath();
        ctx.fillStyle = SEGMENTS[i].color;
        ctx.fill();
        ctx.strokeStyle = '#1c1836';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Edge gloss
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, R - 10, startAng + 0.07, endAng - 0.07);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.restore();
    }

    // Labels
    for (let i = 0; i < N; i++) {
        const bisector = i * arcAngle + arcAngle / 2 + offsetAngle;
        ctx.save();
        ctx.rotate(bisector);
        ctx.translate(R * 0.70, 0);
        ctx.rotate(Math.PI / 2);
        const label = SEGMENTS[i].label;
        const fs = label.length > 3 ? 19 : 26;
        ctx.font = `900 ${fs}px 'Titan One', cursive`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#1c0c30';
        ctx.lineWidth = 7;
        ctx.strokeText(label, 0, 0);
        ctx.fillText(label, 0, 0);
        ctx.restore();
    }

    // Rim rivets
    for (let i = 0; i < N; i++) {
        const ang = i * arcAngle + offsetAngle;
        const rx = Math.cos(ang) * R;
        const ry = Math.sin(ang) * R;
        ctx.save();
        ctx.beginPath();
        ctx.arc(rx, ry, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#94a3b8';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rx - 2, ry - 2, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();

    // Chasing bulbs (fixed, not rotating)
    const totalBulbs = 12;
    const bulbR = R + 23;
    const step = Math.floor(bulbPhase) % totalBulbs;
    for (let b = 0; b < totalBulbs; b++) {
        const bAng = (b * Math.PI * 2 / totalBulbs) - Math.PI / 2;
        const bx = MID + Math.cos(bAng) * bulbR;
        const by = MID + Math.sin(bAng) * bulbR;
        const isLit = b === step || b === (step + 1) % totalBulbs || b === (step + 2) % totalBulbs;
        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, 9, 0, Math.PI * 2);
        if (isLit) {
            const g = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, 10);
            g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#fef08a'); g.addColorStop(1, '#ca8a04');
            ctx.fillStyle = g;
            ctx.shadowColor = '#facc15'; ctx.shadowBlur = 18;
            ctx.strokeStyle = '#3f2203';
        } else {
            ctx.fillStyle = '#713f12'; ctx.strokeStyle = '#1c1917';
        }
        ctx.lineWidth = 2.5; ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    // Center hub
    ctx.save();
    ctx.beginPath();
    ctx.arc(MID, MID, 40, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1836';
    ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.fill();
    ctx.restore();
}

interface Props { isOpen: boolean; bet: number; jackpotAmounts: number[]; onMultPayout?: (amount: number) => void; onComplete: (prize: number) => void; onClose?: () => void; onRunningTotal?: (total: number) => void; }
type Phase = 'prompt' | 'ready' | 'spinning' | 'mult_popup' | 'done';

export const NeonRouletteModal: React.FC<Props> = ({ isOpen, bet, jackpotAmounts, onMultPayout, onComplete, onClose, onRunningTotal }) => {
    const [phase, setPhase] = useState<Phase>('prompt');
    const [wonSeg, setWonSeg] = useState<Seg | null>(null);
    const [multPayout, setMultPayout] = useState(0);
    const [multCount, setMultCount] = useState(0);
    const [totalMultWins, setTotalMultWins] = useState(0);
    const [showSummary, setShowSummary] = useState(false);
    const [summaryTotal, setSummaryTotal] = useState(0);
    const [prize, setPrize] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tickerRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const doSpinRef = useRef<(mc: number) => void>(() => {});

    const animRef = useRef({
        angleDeg: 0, fromDeg: 0, toDeg: 0,
        startTime: 0, spinning: false,
        lastSector: -1, tickerWiggle: 0, bulbPhase: 0,
    });

    const betRef = useRef(bet);
    const jpRef = useRef(jackpotAmounts);
    const multCountRef = useRef(0);
    useEffect(() => { betRef.current = bet; }, [bet]);
    useEffect(() => { jpRef.current = jackpotAmounts; }, [jackpotAmounts]);

    const stopTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

    const loop = useCallback(() => {
        const a = animRef.current;
        const canvas = canvasRef.current;

        if (a.spinning) {
            const elapsed = Date.now() - a.startTime;
            const t = Math.min(elapsed / SPIN_MS, 1);
            a.angleDeg = a.fromDeg + (a.toDeg - a.fromDeg) * easeOut(t);

            // Ticker wiggle on sector crossings
            const mod = ((a.angleDeg % 360) + 360) % 360;
            const sector = Math.floor(mod / SEG_DEG) % N;
            if (sector !== a.lastSector && a.lastSector !== -1) {
                a.tickerWiggle = 26;
                audioService.playTick();
            }
            a.lastSector = sector;

            if (t >= 1) { a.spinning = false; }
        }

        // Ticker wiggle decay
        if (Math.abs(a.tickerWiggle) > 0.5) a.tickerWiggle *= -0.72;
        else a.tickerWiggle = 0;
        if (tickerRef.current) tickerRef.current.style.transform = `translateX(-50%) rotate(${a.tickerWiggle}deg)`;

        // Bulbs
        a.bulbPhase += 0.06;

        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) drawWheel(ctx, a.angleDeg, a.bulbPhase);
        }

        rafRef.current = requestAnimationFrame(loop);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        animRef.current.bulbPhase = 0;
        rafRef.current = requestAnimationFrame(loop);
        return () => { cancelAnimationFrame(rafRef.current); stopTimer(); };
    }, [isOpen, loop]);

    const doSpin = (mc: number) => {
        const segIdx = pickSeg(mc);
        const a = animRef.current;
        const curMod = ((a.angleDeg % 360) + 360) % 360;
        const midDeg = segIdx * SEG_DEG + SEG_DEG / 2;
        const targetMod = (360 - midDeg % 360 + 360) % 360;
        let extra = targetMod - curMod;
        if (extra < 0) extra += 360;
        const finalDeg = a.angleDeg + 15 * 360 + extra;

        a.fromDeg = a.angleDeg;
        a.toDeg = finalDeg;
        a.startTime = Date.now();
        a.spinning = true;
        a.lastSector = -1;
        audioService.playWheelSpin();
        setPhase('spinning');

        timerRef.current = setTimeout(() => {
            const seg = SEGMENTS[segIdx];
            setWonSeg(seg);
            if (seg.mult !== undefined) {
                const payout = betRef.current * seg.mult;
                setMultPayout(payout);
                setTotalMultWins(prev => prev + payout);
                onMultPayout?.(payout);
                const newMc = mc + 1;
                multCountRef.current = newMc;
                setMultCount(newMc);
                setPhase('mult_popup');
                timerRef.current = setTimeout(() => { doSpinRef.current(newMc); }, 2500);
            } else {
                const amt = jpRef.current[JP_IDX[seg.jp!]] ?? betRef.current * 50;
                setPrize(amt);
                setPhase('done');
                setTotalMultWins(prev => {
                    setSummaryTotal(prev + amt);
                    return prev;
                });
                timerRef.current = setTimeout(() => setShowSummary(true), 500);
            }
        }, SPIN_MS + 100);
    };
    doSpinRef.current = doSpin;

    useEffect(() => {
        if (!isOpen) {
            stopTimer();
            cancelAnimationFrame(rafRef.current);
            const a = animRef.current;
            a.angleDeg = 0; a.fromDeg = 0; a.toDeg = 0; a.spinning = false;
            a.lastSector = -1; a.tickerWiggle = 0;
            multCountRef.current = 0;
            setPhase('prompt'); setWonSeg(null); setShowSummary(false);
            setPrize(0); setMultCount(0); setMultPayout(0); setTotalMultWins(0); setSummaryTotal(0);
            onRunningTotal?.(0);
        }
    }, [isOpen]);

    useEffect(() => { onRunningTotal?.(totalMultWins); }, [totalMultWins]);

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[200] animate-pop-in select-none">

            {/* Prompt */}
            {phase === 'prompt' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-pop-in flex flex-col items-center gap-2 rounded-3xl px-7 py-5 text-center overflow-hidden"
                        style={{ ...containerShell('neon'), maxWidth: 260 }}>
                        <div className="font-black text-white uppercase tracking-wide text-xl leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                            Roulette Bonus
                        </div>
                        <div className="text-sky-100/80 text-[11px] font-black uppercase tracking-[0.2em]">Bonus Round</div>
                        <button onClick={() => setPhase('ready')} className="pill-blue w-full mt-1">
                            <div className="pill-face" style={{ padding: '8px 12px', fontSize: '11px', background: 'linear-gradient(180deg,#38bdf8,#0ea5e9,#0369a1)' }}>Spin Now!</div>
                        </button>
                    </div>
                </div>
            )}

            {/* Wheel zone */}
            {phase !== 'prompt' && (
                <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 310, height: 390 }}>

                    {/* Ticker arrow — smaller, sits just at the rim */}
                    <div ref={tickerRef} className="absolute z-20"
                        style={{ top: 46, left: '50%', transform: 'translateX(-50%)', transformOrigin: '50% 15%', width: 28, height: 44 }}>
                        <svg width={28} height={44} viewBox="0 0 40 62" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 2C10 2 2 10 2 20C2 30 12 56 20 60C28 56 38 30 38 20C38 10 30 2 20 2Z"
                                fill="url(#tgrad)" stroke="#111827" strokeWidth="2.5"/>
                            <circle cx="20" cy="20" r="12" fill="#38bdf8"/>
                            <circle cx="20" cy="20" r="5" fill="#f8fafc"/>
                            <defs>
                                <linearGradient id="tgrad" x1="20" y1="2" x2="20" y2="60" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="#38bdf8"/>
                                    <stop offset="60%" stopColor="#0284c7"/>
                                    <stop offset="100%" stopColor="#0369a1"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>

                    {/* Canvas */}
                    <canvas ref={canvasRef} width={CS} height={CS}
                        style={{ position: 'absolute', top: 48, left: 0, width: 310, height: 310, filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.8))' }} />

                    {/* Center SPIN button */}
                    {phase === 'ready' && (
                        <button onClick={() => doSpinRef.current(0)}
                            className="absolute flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95"
                            style={{
                                top: 48 + 155 - 34, left: 155 - 34, width: 68, height: 68, borderRadius: '50%',
                                background: '#fdf5e2', border: '3px solid #25283d', zIndex: 30,
                                boxShadow: '0 6px 14px rgba(0,0,0,0.6), inset 0 -5px 0 #edd8af, inset 0 5px 0 #ffffff',
                            }}>
                            <span className="font-black text-[#7c3aed] uppercase tracking-tight" style={{ fontSize: 18, fontFamily: 'Titan One, cursive', lineHeight: 1 }}>SPIN</span>
                        </button>
                    )}

                    {/* Multiplier popup */}
                    {phase === 'mult_popup' && wonSeg && (
                        <div className="absolute z-30 animate-pop-in"
                            style={{ top: 48 + 100, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
                            <div className="flex flex-col items-center gap-1 rounded-2xl px-6 py-3 text-center overflow-hidden"
                                style={{ ...containerShell('neon'), minWidth: 160 }}>
                                <div className="text-sky-100/70 text-[9px] font-black uppercase tracking-[0.25em]">{wonSeg.label} Bonus</div>
                                <span className="font-black text-white text-2xl font-mono" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>+{formatCommaNumber(multPayout)}</span>
                                <span className="text-white/50 text-[9px] uppercase tracking-widest animate-pulse">Spinning again…</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Summary */}
            {showSummary && wonSeg && (
                <div className="absolute inset-0 z-[210] flex items-center justify-center animate-pop-in">
                    <div className="flex flex-col items-center gap-3 rounded-3xl px-10 py-7 select-none overflow-hidden"
                        style={{ ...containerShell('neon'), minWidth: 250 }}>
                        <div className="text-sky-100/70 text-[10px] font-black uppercase tracking-widest">Roulette Complete</div>
                        <div className="font-black uppercase tracking-wider text-center text-white"
                            style={{ fontSize: '2rem', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                            {wonSeg.jp} Jackpot
                        </div>
                        <div className="w-full flex flex-col gap-1.5 mt-1">
                            {totalMultWins > 0 && (
                                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                    <span className="text-white/70 text-[10px] uppercase tracking-wide">Multiplier Wins</span>
                                    <span className="font-black text-yellow-300 text-sm font-mono">+{formatCommaNumber(totalMultWins)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <span className="text-white/70 text-[10px] uppercase tracking-wide">Jackpot Prize</span>
                                <span className="font-black text-white text-sm font-mono">+{formatCommaNumber(prize)}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                                style={{ background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.35)' }}>
                                <span className="text-yellow-300 font-black text-[11px] uppercase tracking-wide">Total Won</span>
                                <span className="font-black text-yellow-300 text-base font-mono">+{formatCommaNumber(summaryTotal)}</span>
                            </div>
                        </div>
                        <button onClick={() => onComplete(prize)} className="pill-gold w-full mt-1">
                            <div className="pill-face" style={{ padding: '8px 12px', fontSize: '11px', background: 'linear-gradient(180deg,#fbbf24,#f59e0b)', color: '#1c0a00' }}>Claim All</div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
