import React, { useEffect, useRef, useState } from 'react';
import { formatCommaNumber } from '../constants';

interface Seg {
    label: string;
    color: string;
    textColor: string;
    mult?: number;
    jp?: string;
    weight: number;
}

// 10 half-pie segments — weighted. Multipliers cause respin, jackpots end the game.
const SEGMENTS: Seg[] = [
    { label: '2×',    color: '#1d4ed8', textColor: '#bfdbfe', mult: 2,  weight: 28   },
    { label: '3×',    color: '#1a5c2b', textColor: '#bbf7d0', mult: 3,  weight: 18   },
    { label: 'MINI',  color: '#064e3b', textColor: '#6ee7b7', jp: 'MINI',  weight: 12  },
    { label: '4×',    color: '#5b21b6', textColor: '#ddd6fe', mult: 4,  weight: 14   },
    { label: '5×',    color: '#166534', textColor: '#bbf7d0', mult: 5,  weight: 8    },
    { label: 'MINOR', color: '#0c4a6e', textColor: '#7dd3fc', jp: 'MINOR', weight: 5  },
    { label: 'MAJOR', color: '#6b21a8', textColor: '#d8b4fe', jp: 'MAJOR', weight: 0.6},
    { label: '10×',   color: '#7c3aed', textColor: '#e9d5ff', mult: 10, weight: 3    },
    { label: 'MEGA',  color: '#9f1239', textColor: '#fda4af', jp: 'MEGA',  weight: 0.2},
    { label: 'GRAND', color: '#78350f', textColor: '#fde68a', jp: 'GRAND', weight: 0.05},
];

const N = SEGMENTS.length;
const SEG_DEG = 360 / N;
const SPIN_MS = 12000;
const R = 150; const CX = 165; const CY = 165; const SZ = 330;
const W_TOTAL = SEGMENTS.reduce((s, g) => s + g.weight, 0);

const pickSeg = (): number => {
    let r = Math.random() * W_TOTAL;
    for (let i = 0; i < N; i++) { r -= SEGMENTS[i].weight; if (r <= 0) return i; }
    return 0;
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

interface Props { isOpen: boolean; bet: number; jackpotAmounts: number[]; onComplete: (prize: number) => void; }
type Phase = 'prompt' | 'ready' | 'spinning' | 'done';

export const NeonRouletteModal: React.FC<Props> = ({ isOpen, bet, jackpotAmounts, onComplete }) => {
    const [phase, setPhase] = useState<Phase>('prompt');
    const [rotation, setRotation] = useState(0);
    const [liveSeg, setLiveSeg] = useState<Seg>(SEGMENTS[0]);
    const [wonSeg, setWonSeg] = useState<Seg | null>(null);
    const [showClaim, setShowClaim] = useState(false);
    const [prize, setPrize] = useState(0);
    const [isRespinning, setIsRespinning] = useState(false);

    const totalRotRef = useRef(0);
    const spinFromRef = useRef(0);
    const spinToRef = useRef(0);
    const spinTimeRef = useRef(0);
    const trackRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const respinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const betRef = useRef(bet);
    const jpRef = useRef(jackpotAmounts);
    const doSpinRef = useRef<() => void>(() => {});

    useEffect(() => { betRef.current = bet; }, [bet]);
    useEffect(() => { jpRef.current = jackpotAmounts; }, [jackpotAmounts]);

    const clearTracking = () => {
        if (trackRef.current) { clearInterval(trackRef.current); trackRef.current = null; }
        if (respinTimerRef.current) { clearTimeout(respinTimerRef.current); respinTimerRef.current = null; }
    };

    // Defined each render so it always closes over latest state setters; called via ref
    const doSpin = () => {
        const segIdx = pickSeg();
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
        setIsRespinning(false);

        clearTracking();
        trackRef.current = setInterval(() => {
            const elapsed = Date.now() - spinTimeRef.current;
            const t = Math.min(elapsed / SPIN_MS, 1);
            const currentRot = spinFromRef.current + (spinToRef.current - spinFromRef.current) * easeOut(t);
            const mod = ((currentRot % 360) + 360) % 360;
            const angleAtTop = (360 - mod + 360) % 360;
            const idx = Math.floor(angleAtTop / SEG_DEG) % N;
            setLiveSeg(SEGMENTS[idx]);

            if (t >= 1) {
                clearTracking();
                const seg = SEGMENTS[segIdx];
                setLiveSeg(seg);
                setWonSeg(seg);
                setPhase('done');

                if (seg.mult !== undefined) {
                    // Multiplier → auto-respin
                    setIsRespinning(true);
                    respinTimerRef.current = setTimeout(() => doSpinRef.current(), 2000);
                } else {
                    // Jackpot landed — show claim popup
                    const amt = jpRef.current[JP_IDX[seg.jp!]] ?? betRef.current * 50;
                    setPrize(amt);
                    setTimeout(() => setShowClaim(true), 500);
                }
            }
        }, 40);
    };
    doSpinRef.current = doSpin;

    useEffect(() => {
        if (!isOpen) {
            clearTracking();
            totalRotRef.current = 0;
            setPhase('prompt');
            setRotation(0);
            setLiveSeg(SEGMENTS[0]);
            setWonSeg(null);
            setShowClaim(false);
            setPrize(0);
            setIsRespinning(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const rightContent = () => {
        switch (phase) {
            case 'ready':
                return (
                    <div className="flex flex-col gap-3 text-center select-none">
                        <div className="text-white font-black text-sm uppercase tracking-widest">💎 Scatter Roulette</div>
                        <div className="text-purple-200/70 text-xs leading-relaxed mt-1">
                            Tap the wheel<br/>to spin!
                        </div>
                        <div className="text-purple-200/40 text-[10px] mt-3 leading-relaxed">
                            Spin until you<br/>hit a jackpot
                        </div>
                        <div className="text-purple-200/30 text-[9px] mt-1">
                            Multipliers respin automatically
                        </div>
                    </div>
                );
            case 'spinning':
                return (
                    <div className="flex flex-col items-center gap-3 select-none">
                        <div className="text-white/40 text-[9px] uppercase tracking-widest animate-pulse">Spinning…</div>
                        <div className="font-black text-3xl transition-all duration-75" style={{ color: liveSeg.textColor, textShadow: `0 0 20px ${liveSeg.textColor}` }}>
                            {liveSeg.label}
                        </div>
                        <div className="text-white/30 text-[9px] uppercase tracking-wide mt-1">
                            {liveSeg.mult !== undefined ? `×${liveSeg.mult} multiplier` : liveSeg.jp ? `${liveSeg.jp} jackpot` : ''}
                        </div>
                    </div>
                );
            case 'done':
                if (!wonSeg) return null;
                return (
                    <div className="flex flex-col items-center gap-3 animate-pop-in select-none">
                        <div className="font-black text-3xl" style={{ color: wonSeg.textColor, textShadow: `0 0 20px ${wonSeg.textColor}` }}>
                            {wonSeg.label}
                        </div>
                        {isRespinning && (
                            <div className="text-white/60 text-xs uppercase tracking-widest animate-pulse">Respinning…</div>
                        )}
                        {wonSeg.jp && !showClaim && (
                            <div className="text-white/60 text-xs uppercase tracking-wide">Jackpot!</div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center animate-pop-in">

            {/* Prompt screen — full screen, click anywhere to proceed */}
            {phase === 'prompt' && (
                <div
                    className="flex flex-col items-center justify-center gap-6 cursor-pointer w-full h-full select-none"
                    onClick={() => setPhase('ready')}
                >
                    <div style={{ fontSize: '4rem', lineHeight: 1 }}>💎</div>
                    <div className="font-black text-white uppercase tracking-widest text-2xl text-center"
                        style={{ textShadow: '0 0 30px rgba(147,51,234,0.9)' }}>
                        You Won a<br />Roulette Spin!
                    </div>
                    <div className="text-purple-300/60 text-sm animate-pulse mt-2">Tap anywhere to continue</div>
                </div>
            )}

            {/* Wheel + right panel */}
            {phase !== 'prompt' && (
                <div className="flex flex-row items-center gap-6 select-none">
                    {/* Wheel */}
                    <div
                        className="relative"
                        style={{ width: SZ, height: SZ, cursor: phase === 'ready' ? 'pointer' : 'default' }}
                        onClick={phase === 'ready' ? () => doSpinRef.current() : undefined}
                    >
                        {/* Arrow */}
                        <div className="absolute z-20 pointer-events-none"
                            style={{ top: CY - R - 18, left: '50%', transform: 'translateX(-50%)' }}>
                            <svg width={26} height={22}>
                                <polygon points="13,20 2,2 24,2" fill="#fbbf24" stroke="#78350f" strokeWidth={1.5} />
                            </svg>
                        </div>

                        <svg width={SZ} height={SZ} style={{ overflow: 'visible' }}>
                            <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke="#fbbf24" strokeWidth={3.5} />
                            <circle cx={CX} cy={CY} r={R + 5}  fill="none" stroke="#92400e" strokeWidth={1.5} />
                            <circle cx={CX} cy={CY} r={R}      fill="none" stroke="rgba(147,51,234,0.15)" strokeWidth={18} />

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
                                        <g key={i}>
                                            <path d={slicePath(i)} fill={seg.color} stroke="#000" strokeWidth={1.5} />
                                            <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
                                                fill={seg.textColor} fontSize={fs} fontWeight={900}
                                                fontFamily="'Titan One', cursive"
                                                style={{ transform: `rotate(${midDeg}deg)`, transformOrigin: `${lp.x}px ${lp.y}px` }}>
                                                {seg.label}
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>

                            {/* Tap-to-spin overlay hint */}
                            {phase === 'ready' && (
                                <g>
                                    <circle cx={CX} cy={CY} r={R - 4} fill="rgba(0,0,0,0.18)" />
                                    <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle"
                                        fill="rgba(255,255,255,0.7)" fontSize={13} fontWeight={900}
                                        fontFamily="'Titan One', cursive" letterSpacing="1">
                                        TAP TO SPIN
                                    </text>
                                </g>
                            )}

                            <circle cx={CX} cy={CY} r={22} fill="#0d0220" stroke="#7c3aed" strokeWidth={3} />
                            <text x={CX} y={CY + 1} textAnchor="middle" dominantBaseline="middle" fontSize={16}>💎</text>
                        </svg>
                    </div>

                    {/* Right info panel */}
                    <div className="flex flex-col items-center justify-center rounded-2xl px-5 py-5"
                        style={{
                            background: 'rgba(13,2,32,0.93)',
                            border: '1.5px solid rgba(147,51,234,0.45)',
                            boxShadow: '0 0 40px rgba(147,51,234,0.35)',
                            minWidth: 172,
                            minHeight: 220,
                        }}>
                        {rightContent()}
                    </div>
                </div>
            )}

            {/* Jackpot claim popup */}
            {showClaim && wonSeg && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center animate-pop-in">
                    <div className="flex flex-col items-center gap-4 rounded-3xl px-10 py-8"
                        style={{
                            background: 'linear-gradient(160deg,#1e003c,#0d0220,#1a0040)',
                            border: `2px solid ${wonSeg.textColor}66`,
                            boxShadow: `0 0 60px ${wonSeg.textColor}44, 0 0 120px rgba(0,0,0,0.8)`,
                        }}>
                        <div className="text-white/60 text-[10px] font-black uppercase tracking-widest">🎉 Jackpot!</div>
                        <div className="font-black uppercase tracking-wider text-center"
                            style={{ fontSize: '2.2rem', color: wonSeg.textColor, textShadow: `0 0 24px ${wonSeg.textColor}` }}>
                            {wonSeg.jp}
                        </div>
                        <div className="font-black font-mono text-white text-3xl">
                            {formatCommaNumber(prize)}
                        </div>
                        <div className="text-white/40 text-[9px] uppercase tracking-wide -mt-2">Coins Won</div>
                        <button
                            onClick={() => onComplete(prize)}
                            className="btn-3d px-10 py-3 rounded-xl font-black uppercase tracking-widest text-black text-base mt-2"
                            style={{ background: 'linear-gradient(180deg,#fbbf24,#f59e0b)', boxShadow: '0 5px 0 #92400e' }}>
                            Claim
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
