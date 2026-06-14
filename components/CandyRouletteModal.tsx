import React, { useEffect, useRef, useState } from 'react';

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
    { label: '4', sub: 'WILD REELS',color: '#6d28d9', textColor: '#ede9fe', cfg: { mode: 'column', count: 4 }, weight: 6  },
    { label: '6', sub: 'WILDS',     color: '#9f1239', textColor: '#ffe4e6', cfg: { mode: 'single', count: 6 }, weight: 4  },
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

    const rightContent = () => {
        switch (phase) {
            case 'ready':
                return (
                    <div className="flex flex-col gap-2 text-center select-none">
                        <div className="text-white font-black text-sm uppercase tracking-widest">🍬 Wild Wheel</div>
                        <div className="text-pink-200/60 text-xs leading-relaxed mt-2">Tap the wheel to spin!</div>
                        <div className="text-pink-200/35 text-[9px] mt-3 leading-relaxed">
                            Win persistent switching wilds<br />for all {freeSpins} free spins!
                        </div>
                    </div>
                );
            case 'spinning':
                return (
                    <div className="flex flex-col items-center gap-3 select-none">
                        <div className="text-white/40 text-[9px] uppercase tracking-widest animate-pulse">Spinning…</div>
                        <div className="font-black text-4xl transition-colors duration-75"
                            style={{ color: liveSeg.textColor, textShadow: `0 0 20px ${liveSeg.textColor}` }}>
                            {liveSeg.label}
                        </div>
                        <div className="text-white/25 text-[9px] uppercase tracking-wide mt-1">{liveSeg.sub}</div>
                    </div>
                );
            case 'done':
                return wonSeg ? (
                    <div className="flex flex-col items-center gap-2 select-none animate-pop-in">
                        <div className="text-white/50 text-[9px] uppercase tracking-widest">You Won</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-black text-5xl" style={{ color: wonSeg.textColor, textShadow: `0 0 20px ${wonSeg.textColor}` }}>{wonSeg.label}</span>
                        </div>
                        <div className="font-black text-white text-sm uppercase tracking-widest">{wonSeg.sub}</div>
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
                <div className="flex flex-col items-center justify-center gap-6 w-full h-full select-none">
                    <div className="animate-pop-in flex flex-col items-center gap-4 rounded-3xl px-8 py-7 text-center"
                        style={{ background: 'linear-gradient(160deg,#3b0420,#831843)', border: '2px solid #ec4899', boxShadow: '0 0 40px rgba(236,72,153,0.6)', maxWidth: 280 }}>
                        <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>🍬</div>
                        <div className="font-black text-white uppercase tracking-widest text-xl text-center" style={{ textShadow: '0 0 20px rgba(236,72,153,0.9)' }}>
                            Wild Wheel<br />Bonus!
                        </div>
                        <div className="text-pink-300 text-[11px] font-bold uppercase tracking-widest">{freeSpins} Free Spins</div>
                        <button onClick={() => setPhase('ready')}
                            className="btn-3d w-full py-3 rounded-2xl font-black text-sm uppercase tracking-widest"
                            style={{ background: 'linear-gradient(180deg,#f472b6,#db2777)', color: '#fff', boxShadow: '0 4px 0 #831843' }}>
                            Spin Now!
                        </button>
                    </div>
                </div>
            )}

            {phase !== 'prompt' && (
                <div className="flex flex-row items-center gap-6 select-none">
                    {/* Wheel */}
                    <div className="relative" style={{ width: SZ, height: SZ, cursor: phase === 'ready' ? 'pointer' : 'default' }}
                        onClick={phase === 'ready' ? doSpin : undefined}>

                        <div className="absolute z-20 pointer-events-none" style={{ top: CY - R - 14, left: '50%', transform: 'translateX(-50%)' }}>
                            <svg width={26} height={22}>
                                <polygon points="13,20 2,2 24,2" fill="#fbbf24" stroke="#78350f" strokeWidth={1.5} />
                            </svg>
                        </div>

                        <svg width={SZ} height={SZ} style={{ overflow: 'visible' }}>
                            <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke="#fbbf24" strokeWidth={3.5} />
                            <circle cx={CX} cy={CY} r={R + 5} fill="none" stroke="#92400e" strokeWidth={1.5} />

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
                                            <path d={slicePath(i)} fill={seg.color} stroke="#000" strokeWidth={1.5} />
                                            <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
                                                fill={seg.textColor} fontSize={20} fontWeight={900}
                                                fontFamily="'Titan One', cursive"
                                                style={{ transform: `rotate(${midDeg}deg)`, transformOrigin: `${lp.x}px ${lp.y}px` }}>
                                                {seg.label}
                                            </text>
                                            <text x={sp.x} y={sp.y} textAnchor="middle" dominantBaseline="middle"
                                                fill={seg.textColor} fontSize={6.5} fontWeight={900}
                                                style={{ transform: `rotate(${midDeg}deg)`, transformOrigin: `${sp.x}px ${sp.y}px`, letterSpacing: '0.05em' }}>
                                                {seg.sub}
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>

                            <circle cx={CX} cy={CY} r={22} fill="#3b0420" stroke="#ec4899" strokeWidth={3} />
                            <text x={CX} y={CY + 1} textAnchor="middle" dominantBaseline="middle" fontSize={16}>🍬</text>
                        </svg>

                        {phase === 'ready' && (
                            <div className="absolute pointer-events-none flex items-center justify-center"
                                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 66, height: 66, borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(59,4,32,0.97) 60%, rgba(59,4,32,0.6) 100%)',
                                    border: '2px solid rgba(236,72,153,0.7)', boxShadow: '0 0 20px rgba(236,72,153,0.5)' }}>
                                <span className="font-black text-white text-center uppercase animate-pulse" style={{ fontSize: 9, letterSpacing: '0.08em', lineHeight: 1.3 }}>
                                    TAP<br />TO<br />SPIN
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right info panel */}
                    <div className="flex flex-col items-center justify-center rounded-2xl px-5 py-5" style={{ background: '#831843', minWidth: 172, minHeight: 220 }}>
                        {rightContent()}
                        {phase === 'done' && wonSeg && (
                            <button onClick={() => onComplete(wonSeg.cfg)}
                                className="btn-3d w-full py-3 rounded-xl font-black uppercase tracking-widest text-white text-sm mt-4"
                                style={{ background: 'linear-gradient(180deg,#f472b6,#db2777)', boxShadow: '0 5px 0 #831843' }}>
                                Start Free Spins!
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
