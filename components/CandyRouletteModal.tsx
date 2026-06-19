import React, { useEffect, useRef, useState } from 'react';
import { audioService } from '../services/audioService';
import { WheelDefs, WheelRim, WheelGloss, containerShell } from './wheel3d';

export interface CandyWildConfig {
    mode: 'single' | 'column';
    count: number;
}

interface Seg {
    label: string;
    sub: string;
    color: string;
    textColor: string;
    cfg: CandyWildConfig;
    weight: number;
}

// 7 wedges. Each awards a persistent "switching wild" setup for the free-spin round.
const SEGMENTS: Seg[] = [
    { label: '3', sub: 'WILDS',     color: '#be185d', textColor: '#fbcfe8', cfg: { mode: 'single', count: 3 }, weight: 26 },
    { label: '2', sub: 'WILD REELS',color: '#7c3aed', textColor: '#ddd6fe', cfg: { mode: 'column', count: 2 }, weight: 20 },
    { label: '4', sub: 'WILDS',     color: '#db2777', textColor: '#fce7f3', cfg: { mode: 'single', count: 4 }, weight: 18 },
    { label: '3', sub: 'WILD REELS',color: '#9333ea', textColor: '#f3e8ff', cfg: { mode: 'column', count: 3 }, weight: 14 },
    { label: '5', sub: 'WILDS',     color: '#e11d48', textColor: '#ffe4e6', cfg: { mode: 'single', count: 5 }, weight: 12 },
    { label: '4', sub: 'WILD REELS',color: '#6d28d9', textColor: '#ede9fe', cfg: { mode: 'column', count: 4 }, weight: 3  },
    { label: '6', sub: 'WILDS',     color: '#9f1239', textColor: '#ffe4e6', cfg: { mode: 'single', count: 6 }, weight: 2  },
];

const N = SEGMENTS.length;
const SEG_DEG = 360 / N;
const SPIN_MS = 6500;
const R = 110; const CX = 120; const CY = 120; const SZ = 240;

const pickSeg = (): number => {
    const total = SEGMENTS.reduce((a, s) => a + s.weight, 0);
    let r = Math.random() * total;
    for (let i = 0; i < N; i++) { r -= SEGMENTS[i].weight; if (r <= 0) return i; }
    return N - 1;
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

interface Props { isOpen: boolean; freeSpins: number; onComplete: (cfg: CandyWildConfig) => void; }
type Phase = 'prompt' | 'ready' | 'spinning' | 'done';

export const CandyRouletteModal: React.FC<Props> = ({ isOpen, freeSpins, onComplete }) => {
    const [phase, setPhase] = useState<Phase>('prompt');
    const [rotation, setRotation] = useState(0);
    const [liveSeg, setLiveSeg] = useState<Seg>(SEGMENTS[0]);
    const [wonSeg, setWonSeg] = useState<Seg | null>(null);

    const totalRotRef = useRef(0);
    const spinFromRef = useRef(0);
    const spinToRef = useRef(0);
    const spinTimeRef = useRef(0);
    const trackRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearAll = () => { if (trackRef.current) { clearInterval(trackRef.current); trackRef.current = null; } };

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
                setLiveSeg(SEGMENTS[segIdx]);
                setWonSeg(SEGMENTS[segIdx]);
                setPhase('done');
            }
        }, 40);
    };

    useEffect(() => {
        if (!isOpen) {
            clearAll();
            totalRotRef.current = 0;
            setPhase('prompt');
            setRotation(0);
            setLiveSeg(SEGMENTS[0]);
            setWonSeg(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[200] animate-pop-in select-none">

            {/* Bonus prompt popup — new 3D gradient container */}
            {phase === 'prompt' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-pop-in flex flex-col items-center gap-2 rounded-3xl px-7 py-5 text-center overflow-hidden"
                        style={{ ...containerShell('candy'), maxWidth: 260 }}>
                        <div className="font-black text-white uppercase tracking-wide text-xl leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                            Wild Wheel Bonus
                        </div>
                        <div className="text-pink-100/80 text-[11px] font-black uppercase tracking-[0.2em]">{freeSpins} Free Spins</div>
                        <button onClick={() => setPhase('ready')}
                            className="btn-3d w-full py-2.5 rounded-2xl font-black text-sm uppercase tracking-widest mt-1"
                            style={{ background: 'linear-gradient(180deg,#f9a8d4,#db2777)', color: '#fff', boxShadow: '0 4px 0 #831843' }}>
                            Spin Now!
                        </button>
                    </div>
                </div>
            )}

            {/* Wheel — fixed location (lower, clears jackpot text), never moves */}
            {phase !== 'prompt' && (
                <div className="absolute" style={{ left: '50%', top: 92, transform: 'translateX(-50%)', width: SZ, height: SZ }}>
                    {/* Wheel */}
                    <div className="relative" style={{ width: SZ, height: SZ, cursor: phase === 'ready' ? 'pointer' : 'default' }}
                        onClick={phase === 'ready' ? doSpin : undefined}>

                        <div className="absolute z-20 pointer-events-none" style={{ top: CY - R - 14, left: '50%', transform: 'translateX(-50%)' }}>
                            <svg width={26} height={22}>
                                <polygon points="13,20 2,2 24,2" fill="#fbbf24" stroke="#78350f" strokeWidth={1.5} />
                            </svg>
                        </div>

                        <svg width={SZ} height={SZ} style={{ overflow: 'visible' }}>
                            <WheelDefs colors={SEGMENTS.map(s => s.color)} idPrefix="cw" />
                            <WheelRim idPrefix="cw" />

                            {/* Wedges (rotating) */}
                            <g style={{
                                transform: `rotate(${rotation}deg)`,
                                transformOrigin: `${CX}px ${CY}px`,
                                transition: phase === 'spinning' ? `transform ${SPIN_MS}ms cubic-bezier(0.05, 0.8, 0.3, 1)` : 'none',
                            }}>
                                {SEGMENTS.map((seg, i) => (
                                    <path key={i} d={slicePath(i)} fill={`url(#cw${i})`} />
                                ))}
                            </g>

                            {/* Glossy dome overlay (fixed) */}
                            <WheelGloss idPrefix="cw" />

                            {/* Labels (rotating, above gloss) */}
                            <g style={{
                                transform: `rotate(${rotation}deg)`,
                                transformOrigin: `${CX}px ${CY}px`,
                                transition: phase === 'spinning' ? `transform ${SPIN_MS}ms cubic-bezier(0.05, 0.8, 0.3, 1)` : 'none',
                            }}>
                                {SEGMENTS.map((seg, i) => {
                                    const midDeg = i * SEG_DEG + SEG_DEG / 2;
                                    const lp = polarXY(midDeg, R * 0.66);
                                    const sp = polarXY(midDeg, R * 0.42);
                                    return (
                                        <g key={i}>
                                            <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
                                                fill="#fff" fontSize={20} fontWeight={900}
                                                fontFamily="'Titan One', cursive"
                                                style={{ transform: `rotate(${midDeg}deg)`, transformOrigin: `${lp.x}px ${lp.y}px`, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))' }}>
                                                {seg.label}
                                            </text>
                                            <text x={sp.x} y={sp.y} textAnchor="middle" dominantBaseline="middle"
                                                fill="#fff" fontSize={6.5} fontWeight={900}
                                                style={{ transform: `rotate(${midDeg}deg)`, transformOrigin: `${sp.x}px ${sp.y}px`, letterSpacing: '0.05em', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}>
                                                {seg.sub}
                                            </text>
                                        </g>
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
                    </div>
                </div>
            )}

            {/* Result popup — new 3D gradient container (replaces below-wheel content) */}
            {phase === 'done' && wonSeg && (
                <div className="absolute inset-0 z-[210] flex items-center justify-center animate-pop-in">
                    <div className="flex flex-col items-center gap-3 rounded-3xl px-10 py-7 text-center overflow-hidden"
                        style={{ ...containerShell('candy'), maxWidth: 300 }}>
                        <div className="text-pink-100/70 text-[10px] font-black uppercase tracking-[0.25em]">You Won</div>
                        <span className="font-black text-white" style={{ fontSize: '3.5rem', lineHeight: 1, textShadow: '0 3px 10px rgba(0,0,0,0.55)' }}>{wonSeg.label}</span>
                        <div className="font-black text-white text-sm uppercase tracking-[0.2em]">{wonSeg.sub}</div>
                        <button onClick={() => onComplete(wonSeg.cfg)}
                            className="btn-3d w-full py-3 rounded-2xl font-black uppercase tracking-widest text-white text-sm mt-1"
                            style={{ background: 'linear-gradient(180deg,#f9a8d4,#db2777)', boxShadow: '0 4px 0 #831843' }}>
                            Start Free Spins!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
