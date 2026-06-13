import React, { useEffect, useRef, useState } from 'react';
import { formatCommaNumber } from '../constants';

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

// As multCount increases, multiplier segments get progressively rarer
// 0→normal, 1→60%, 2→30%, 3→10%, 4+→0% (forced jackpot)
const MULT_SCALE = [1.0, 0.6, 0.3, 0.1, 0];

const N = SEGMENTS.length;
const SEG_DEG = 360 / N;
const SPIN_MS = 12000;
const R = 150; const CX = 165; const CY = 165; const SZ = 330;

const pickSeg = (multCount: number): number => {
    const scale = MULT_SCALE[Math.min(multCount, 4)];
    const weights = SEGMENTS.map(s => s.mult !== undefined ? s.baseWeight * scale : s.baseWeight);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < N; i++) { r -= weights[i]; if (r <= 0) return i; }
    // Fallback: pick first jackpot segment
    return SEGMENTS.findIndex(s => s.jp !== undefined);
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

interface Props { isOpen: boolean; bet: number; jackpotAmounts: number[]; onMultPayout?: (amount: number) => void; onComplete: (prize: number) => void; }
type Phase = 'prompt' | 'ready' | 'spinning' | 'mult_popup' | 'done';

export const NeonRouletteModal: React.FC<Props> = ({ isOpen, bet, jackpotAmounts, onMultPayout, onComplete }) => {
    const [phase, setPhase] = useState<Phase>('prompt');
    const [rotation, setRotation] = useState(0);
    const [liveSeg, setLiveSeg] = useState<Seg>(SEGMENTS[0]);
    const [wonSeg, setWonSeg] = useState<Seg | null>(null);
    const [showClaim, setShowClaim] = useState(false);
    const [prize, setPrize] = useState(0);
    const [multPayout, setMultPayout] = useState(0);   // amount shown in mult popup
    const [multCount, setMultCount] = useState(0);

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
                    // Jackpot: show claim popup
                    const amt = jpRef.current[JP_IDX[seg.jp!]] ?? betRef.current * 50;
                    setPrize(amt);
                    setPhase('done');
                    timerRef.current = setTimeout(() => setShowClaim(true), 500);
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
            setPrize(0);
            setMultCount(0);
            setMultPayout(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const rightContent = () => {
        switch (phase) {
            case 'ready':
                return (
                    <div className="flex flex-col gap-2 text-center select-none">
                        <div className="text-white font-black text-sm uppercase tracking-widest">💎 Scatter Roulette</div>
                        <div className="text-purple-200/60 text-xs leading-relaxed mt-2">
                            Tap the wheel to spin!
                        </div>
                        <div className="text-purple-200/35 text-[9px] mt-3 leading-relaxed">
                            Land multipliers to earn<br />bonus wins and respin.<br />Keep spinning until a jackpot!
                        </div>
                        <div className="text-purple-200/25 text-[9px] mt-2">Bet: {formatCommaNumber(bet)}</div>
                    </div>
                );
            case 'spinning':
                return (
                    <div className="flex flex-col items-center gap-3 select-none">
                        <div className="text-white/40 text-[9px] uppercase tracking-widest animate-pulse">Spinning…</div>
                        <div className="font-black text-3xl transition-colors duration-75"
                            style={{ color: liveSeg.textColor, textShadow: `0 0 20px ${liveSeg.textColor}` }}>
                            {liveSeg.label}
                        </div>
                        <div className="text-white/25 text-[9px] uppercase tracking-wide mt-1">
                            {liveSeg.mult !== undefined ? 'Multiplier' : liveSeg.jp ? `${liveSeg.jp} Jackpot` : ''}
                        </div>
                        {multCount > 0 && (
                            <div className="text-yellow-300/60 text-[10px] font-black mt-2">
                                Spin {multCount + 1} / max 5
                            </div>
                        )}
                    </div>
                );
            case 'mult_popup':
                return (
                    <div className="flex flex-col items-center gap-2 animate-pop-in select-none">
                        <div className="text-white/50 text-[9px] uppercase tracking-widest">Bonus Win!</div>
                        <div className="font-black text-2xl" style={{ color: wonSeg?.textColor }}>
                            {wonSeg?.label}
                        </div>
                        <div className="font-black text-white text-xl font-mono">
                            +{formatCommaNumber(multPayout)}
                        </div>
                        <div className="text-white/40 text-[9px] uppercase mt-1 animate-pulse">Respinning…</div>
                    </div>
                );
            case 'done':
                return wonSeg ? (
                    <div className="flex flex-col items-center gap-2 select-none">
                        <div className="font-black text-2xl" style={{ color: wonSeg.textColor, textShadow: `0 0 20px ${wonSeg.textColor}` }}>
                            {wonSeg.label}
                        </div>
                        <div className="text-white/50 text-xs uppercase tracking-wide">Jackpot!</div>
                    </div>
                ) : null;
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center animate-pop-in">

            {/* Prompt screen */}
            {phase === 'prompt' && (
                <div className="flex flex-col items-center justify-center gap-6 cursor-pointer w-full h-full select-none"
                    onClick={() => setPhase('ready')}>
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
                    <div className="relative"
                        style={{ width: SZ, height: SZ, cursor: phase === 'ready' ? 'pointer' : 'default' }}
                        onClick={phase === 'ready' ? () => doSpinRef.current(0) : undefined}>

                        {/* Arrow at 12 o'clock */}
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

                            {/* Center hub — always rendered so overlay can cover it */}
                            <circle cx={CX} cy={CY} r={22} fill="#0d0220" stroke="#7c3aed" strokeWidth={3} />
                            <text x={CX} y={CY + 1} textAnchor="middle" dominantBaseline="middle" fontSize={16}>💎</text>
                        </svg>

                        {/* "TAP TO SPIN" overlay — covers center hub, above SVG */}
                        {phase === 'ready' && (
                            <div className="absolute pointer-events-none flex items-center justify-center"
                                style={{
                                    top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: 90, height: 90,
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(13,2,32,0.97) 60%, rgba(13,2,32,0.6) 100%)',
                                    border: '2px solid rgba(147,51,234,0.7)',
                                    boxShadow: '0 0 20px rgba(147,51,234,0.5)',
                                }}>
                                <span className="font-black text-white text-center uppercase animate-pulse"
                                    style={{ fontSize: 9, letterSpacing: '0.08em', lineHeight: 1.3 }}>
                                    TAP<br />TO<br />SPIN
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right info panel */}
                    <div className="flex flex-col items-center justify-center rounded-2xl px-5 py-5"
                        style={{
                            background: 'rgba(13,2,32,0.93)',
                            border: '1.5px solid rgba(147,51,234,0.45)',
                            boxShadow: '0 0 40px rgba(147,51,234,0.35)',
                            minWidth: 172, minHeight: 220,
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
                        <div className="font-black font-mono text-white text-3xl">{formatCommaNumber(prize)}</div>
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
