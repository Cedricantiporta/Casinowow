import React, { useEffect, useRef, useState, useCallback } from 'react';
import { formatCommaNumber } from '../constants';
import { audioService } from '../services/audioService';

interface Seg {
    label: string;
    color: string;
    mult: number;
    baseWeight: number;
}

// 10 segments — higher multiplier = lower chance (weighted pick, like the neon/candy wheel)
const SEGMENTS: Seg[] = [
    { label: '2×',  color: '#6d28d9', mult: 2,  baseWeight: 18 },
    { label: '4×',  color: '#9333ea', mult: 4,  baseWeight: 12 },
    { label: '6×',  color: '#c026d3', mult: 6,  baseWeight: 6  },
    { label: '2×',  color: '#7c3aed', mult: 2,  baseWeight: 18 },
    { label: '8×',  color: '#db2777', mult: 8,  baseWeight: 3  },
    { label: '4×',  color: '#a21caf', mult: 4,  baseWeight: 12 },
    { label: '2×',  color: '#6d28d9', mult: 2,  baseWeight: 18 },
    { label: '10×', color: '#f59e0b', mult: 10, baseWeight: 1  },
    { label: '4×',  color: '#9333ea', mult: 4,  baseWeight: 12 },
    { label: '6×',  color: '#c026d3', mult: 6,  baseWeight: 6  },
];

const N = SEGMENTS.length;
const SEG_DEG = 360 / N;
const SPIN_MS = 9000;

// Canvas constants (2x pixel density, 240px display)
const CS = 480; const MID = CS / 2; const R = 175;

const pickSeg = (): number => {
    const total = SEGMENTS.reduce((a, s) => a + s.baseWeight, 0);
    let r = Math.random() * total;
    for (let i = 0; i < N; i++) { r -= SEGMENTS[i].baseWeight; if (r <= 0) return i; }
    return N - 1;
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
    ctx.fillStyle = '#2a1245';
    ctx.shadowBlur = 40;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(MID, MID, R + 17, 0, Math.PI * 2);
    ctx.strokeStyle = '#1a0a30';
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
        ctx.strokeStyle = '#2a1245';
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
        ctx.font = `900 26px 'Titan One', cursive`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#2a0c40';
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
        ctx.fillStyle = '#d8b4fe';
        ctx.strokeStyle = '#3b0764';
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
            ctx.fillStyle = '#581c87'; ctx.strokeStyle = '#1c1027';
        }
        ctx.lineWidth = 2.5; ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    // Center hub
    ctx.save();
    ctx.beginPath();
    ctx.arc(MID, MID, 40, 0, Math.PI * 2);
    ctx.fillStyle = '#2a1245';
    ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.fill();
    ctx.restore();
}

interface Props {
    isOpen: boolean;
    baseAmount: number;
    collectMultiplier?: number;
    onClaim: (amount: number) => void;
    onClose: () => void;
}
type Phase = 'ready' | 'spinning' | 'done';

export const JackpotRouletteModal: React.FC<Props> = ({ isOpen, baseAmount, collectMultiplier = 1, onClaim, onClose }) => {
    const [phase, setPhase] = useState<Phase>('ready');
    const [wonMult, setWonMult] = useState<number | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tickerRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const animRef = useRef({
        angleDeg: 0, fromDeg: 0, toDeg: 0,
        startTime: 0, spinning: false,
        lastSector: -1, tickerWiggle: 0, bulbPhase: 0,
    });

    const stopTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

    const loop = useCallback(() => {
        const a = animRef.current;
        const canvas = canvasRef.current;

        if (a.spinning) {
            const elapsed = Date.now() - a.startTime;
            const t = Math.min(elapsed / SPIN_MS, 1);
            a.angleDeg = a.fromDeg + (a.toDeg - a.fromDeg) * easeOut(t);

            const mod = ((a.angleDeg % 360) + 360) % 360;
            const sector = Math.floor(mod / SEG_DEG) % N;
            if (sector !== a.lastSector && a.lastSector !== -1) {
                a.tickerWiggle = 26;
                audioService.playTick();
            }
            a.lastSector = sector;

            if (t >= 1) { a.spinning = false; }
        }

        if (Math.abs(a.tickerWiggle) > 0.5) a.tickerWiggle *= -0.72;
        else a.tickerWiggle = 0;
        if (tickerRef.current) tickerRef.current.style.transform = `translateX(-50%) rotate(${a.tickerWiggle}deg)`;

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

    useEffect(() => {
        if (!isOpen) {
            stopTimer();
            cancelAnimationFrame(rafRef.current);
            const a = animRef.current;
            a.angleDeg = 0; a.fromDeg = 0; a.toDeg = 0; a.spinning = false;
            a.lastSector = -1; a.tickerWiggle = 0;
            setPhase('ready'); setWonMult(null);
        }
    }, [isOpen]);

    const doSpin = () => {
        if (phase !== 'ready') return;
        const segIdx = pickSeg();
        const a = animRef.current;
        const curMod = ((a.angleDeg % 360) + 360) % 360;
        const midDeg = segIdx * SEG_DEG + SEG_DEG / 2;
        const targetMod = (360 - midDeg % 360 + 360) % 360;
        let extra = targetMod - curMod;
        if (extra < 0) extra += 360;
        const finalDeg = a.angleDeg + 12 * 360 + extra;

        a.fromDeg = a.angleDeg;
        a.toDeg = finalDeg;
        a.startTime = Date.now();
        a.spinning = true;
        a.lastSector = -1;
        audioService.playWheelSpin();
        setPhase('spinning');

        timerRef.current = setTimeout(() => {
            setWonMult(SEGMENTS[segIdx].mult);
            setPhase('done');
        }, SPIN_MS + 100);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-pop-in select-none">
            <div className="rounded-3xl overflow-hidden flex flex-row items-center gap-0 relative"
                style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}>

                {/* Left — Wheel */}
                <div className="relative shrink-0" style={{ width: 220, height: 240 }}>
                    {/* Ticker arrow */}
                    <div ref={tickerRef} className="absolute z-20"
                        style={{ top: 6, left: '50%', transform: 'translateX(-50%)', transformOrigin: '50% 15%', width: 22, height: 34 }}>
                        <svg width={22} height={34} viewBox="0 0 40 62" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 2C10 2 2 10 2 20C2 30 12 56 20 60C28 56 38 30 38 20C38 10 30 2 20 2Z"
                                fill="url(#jtgrad)" stroke="#2a0c40" strokeWidth="2.5"/>
                            <circle cx="20" cy="20" r="12" fill="#fbbf24"/>
                            <circle cx="20" cy="20" r="5" fill="#fffbe6"/>
                            <defs>
                                <linearGradient id="jtgrad" x1="20" y1="2" x2="20" y2="60" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="#fde68a"/>
                                    <stop offset="60%" stopColor="#f59e0b"/>
                                    <stop offset="100%" stopColor="#b45309"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    {/* Canvas */}
                    <canvas ref={canvasRef} width={CS} height={CS}
                        style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 218, height: 218, filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.8))' }} />
                </div>

                {/* Right — Title, amount, action */}
                <div className="flex flex-col gap-3 pr-4 py-4" style={{ minWidth: 130 }}>
                    {/* Title + close */}
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-white font-tanker text-base leading-none">Jackpot</span>
                        {phase !== 'spinning' && <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-x"></i></div>}
                    </div>

                    {/* Base amount */}
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-yellow-300/70 text-[10px] font-black">Base amount</span>
                            {collectMultiplier > 1 && (
                                <span className="flex items-center gap-0.5 font-black text-amber-300" style={{ fontSize: 10 }}>
                                    <img src="/ui/exp_multiplier.png" alt="" style={{ width: 13, height: 13, objectFit: 'contain' }} />
                                    Collect {collectMultiplier}×
                                </span>
                            )}
                        </div>
                        <div className="font-mono font-black text-white" style={{ fontSize: '0.95rem' }}>{formatCommaNumber(baseAmount)}</div>
                    </div>

                    {/* Win result (done phase) */}
                    {phase === 'done' && wonMult !== null && (
                        <div>
                            <div className="font-tanker text-yellow-300" style={{ fontSize: '1.3rem', lineHeight: 1 }}>{wonMult}× Win!</div>
                            <div className="font-mono font-black text-white text-xs">+{formatCommaNumber(baseAmount * wonMult)}</div>
                        </div>
                    )}

                    {/* Action button */}
                    {phase === 'done' && wonMult !== null ? (
                        <button onClick={() => onClaim(baseAmount * wonMult)} className="pill-green w-full">
                            <div className="pill-face" style={{ padding: '6px 10px', fontSize: '11px' }}>Claim</div>
                        </button>
                    ) : (
                        <button onClick={doSpin} disabled={phase === 'spinning'} className={`pill-green w-full${phase === 'spinning' ? ' opacity-60' : ''}`}>
                            <div className="pill-face" style={{ padding: '6px 10px', fontSize: '11px' }}>{phase === 'spinning' ? 'Spinning…' : 'Spin'}</div>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
