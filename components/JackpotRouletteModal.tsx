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
    { label: '2×',  color: '#111111', mult: 2,  baseWeight: 18 },
    { label: '4×',  color: '#111111', mult: 4,  baseWeight: 12 },
    { label: '6×',  color: '#111111', mult: 6,  baseWeight: 6  },
    { label: '2×',  color: '#111111', mult: 2,  baseWeight: 18 },
    { label: '8×',  color: '#111111', mult: 8,  baseWeight: 3  },
    { label: '4×',  color: '#111111', mult: 4,  baseWeight: 12 },
    { label: '2×',  color: '#111111', mult: 2,  baseWeight: 18 },
    { label: '10×', color: '#111111', mult: 10, baseWeight: 1  },
    { label: '4×',  color: '#111111', mult: 4,  baseWeight: 12 },
    { label: '6×',  color: '#111111', mult: 6,  baseWeight: 6  },
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

const SEG_TEXT: string[] = [
    '#ffffff', '#ffffff', '#ffffff',
    '#ffffff', '#ffffff', '#ffffff',
    '#ffffff', '#ffffff', '#ffffff', '#ffffff',
];

function drawWheel(ctx: CanvasRenderingContext2D, angleDeg: number, bulbPhase: number) {
    const arcAngle = (Math.PI * 2) / N;
    const offsetAngle = -Math.PI / 2;
    const angle = angleDeg * Math.PI / 180;

    ctx.clearRect(0, 0, CS, CS);

    // Drop shadow for 3-D depth
    ctx.save();
    ctx.beginPath();
    ctx.arc(MID, MID + 10, R + 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    (ctx as any).filter = 'blur(12px)';
    ctx.fill();
    ctx.restore();
    (ctx as any).filter = 'none';

    // Outer chassis ring — metallic
    ctx.save();
    const rimGrad = ctx.createRadialGradient(MID - 20, MID - 20, R + 2, MID, MID, R + 20);
    rimGrad.addColorStop(0, '#4b5563');
    rimGrad.addColorStop(0.55, '#1f2937');
    rimGrad.addColorStop(1, '#0d1117');
    ctx.beginPath();
    ctx.arc(MID, MID, R + 20, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.shadowBlur = 24; ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(MID, MID, R + 13, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Sectors (rotating)
    ctx.save();
    ctx.translate(MID, MID);
    ctx.rotate(angle);

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.clip();

    for (let i = 0; i < N; i++) {
        const startAng = i * arcAngle + offsetAngle;
        const endAng   = startAng + arcAngle;
        const bisector = startAng + arcAngle / 2;
        const is10 = SEGMENTS[i].mult === 10;

        // Base fill
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, startAng, endAng);
        ctx.closePath();
        ctx.fillStyle = SEGMENTS[i].color;
        ctx.fill();

        // 10× golden shimmer
        if (is10) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, R, startAng, endAng);
            ctx.closePath();
            const gg = ctx.createRadialGradient(Math.cos(bisector) * R * 0.45, Math.sin(bisector) * R * 0.45, 0, 0, 0, R);
            gg.addColorStop(0, 'rgba(255,240,80,0.50)');
            gg.addColorStop(1, 'rgba(160,90,0,0.25)');
            ctx.fillStyle = gg;
            ctx.fill();
        }

        // 3-D shading
        const sg = ctx.createRadialGradient(Math.cos(bisector) * R * 0.5, Math.sin(bisector) * R * 0.5, 0, 0, 0, R);
        sg.addColorStop(0,   'rgba(255,255,255,0.26)');
        sg.addColorStop(0.55,'rgba(255,255,255,0.04)');
        sg.addColorStop(1,   'rgba(0,0,0,0.32)');
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, startAng, endAng);
        ctx.closePath();
        ctx.fillStyle = sg;
        ctx.fill();
        ctx.restore();

        // Dividers
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, startAng, endAng);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();

        // Rim shine
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, R - 5, startAng + 0.04, endAng - 0.04);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 4.5;
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore(); // end clip

    // Labels
    for (let i = 0; i < N; i++) {
        const bisector = i * arcAngle + arcAngle / 2 + offsetAngle;
        const label = SEGMENTS[i].label;
        const is10 = SEGMENTS[i].mult === 10;
        ctx.save();
        ctx.rotate(bisector);
        ctx.translate(R * 0.74, 0);
        ctx.rotate(Math.PI / 2);
        const fs = label.length > 2 ? 24 : 30;
        ctx.font = `900 ${fs}px 'Titan One', cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 5;
        ctx.strokeText(label, 0, 0);
        if (is10) { ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 14; }
        ctx.fillStyle = SEG_TEXT[i] || '#1e1b4b';
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
        ctx.arc(rx, ry, 7, 0, Math.PI * 2);
        const rg = ctx.createRadialGradient(rx - 2, ry - 2, 1, rx, ry, 7);
        rg.addColorStop(0, '#e2e8f0'); rg.addColorStop(1, '#475569');
        ctx.fillStyle = rg;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.arc(rx - 1.5, ry - 1.5, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.restore();
    }
    ctx.restore(); // end rotate

    // Chasing bulbs (fixed)
    const totalBulbs = 14;
    const bulbR = R + 14;
    const step = Math.floor(bulbPhase) % totalBulbs;
    for (let b = 0; b < totalBulbs; b++) {
        const bAng = (b * Math.PI * 2 / totalBulbs) - Math.PI / 2;
        const bx = MID + Math.cos(bAng) * bulbR;
        const by = MID + Math.sin(bAng) * bulbR;
        const isLit = b === step || b === (step + 1) % totalBulbs || b === (step + 2) % totalBulbs;
        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        if (isLit) {
            const g = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, 8);
            g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#fef08a'); g.addColorStop(1, '#ca8a04');
            ctx.fillStyle = g;
            ctx.shadowColor = '#facc15'; ctx.shadowBlur = 16;
            ctx.strokeStyle = '#3f2203';
        } else {
            ctx.fillStyle = '#422006'; ctx.strokeStyle = '#1c1917';
        }
        ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    // Center hub
    ctx.save();
    const hubGrad = ctx.createRadialGradient(MID - 8, MID - 8, 2, MID, MID, 38);
    hubGrad.addColorStop(0, '#4b5563');
    hubGrad.addColorStop(0.5, '#1f2937');
    hubGrad.addColorStop(1, '#0d1117');
    ctx.beginPath();
    ctx.arc(MID, MID, 40, 0, Math.PI * 2);
    ctx.fillStyle = hubGrad;
    ctx.shadowBlur = 14; ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(MID, MID, 40, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
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
                <div className="flex flex-col gap-2.5 pr-4 py-4" style={{ minWidth: 138 }}>
                    {/* Title only — no close button */}
                    <span className="text-white font-tanker text-base leading-none">Jackpot</span>

                    {/* Base amount number — prominent */}
                    <div className="font-mono font-black text-white" style={{ fontSize: '1.05rem', lineHeight: 1 }}>
                        {formatCommaNumber(baseAmount)}
                    </div>

                    {/* Base amount label + collect multiplier row — always shown */}
                    <div className="flex items-center gap-1 flex-wrap" style={{ marginTop: -4 }}>
                        <span className="text-yellow-300/70 font-black" style={{ fontSize: 9 }}>Base amount</span>
                        <span className="flex items-center gap-0.5 font-black text-amber-300" style={{ fontSize: 9 }}>
                            <img src="/ui/exp_multiplier.png" alt="" style={{ width: 11, height: 11, objectFit: 'contain' }} />
                            Collect {collectMultiplier}×
                        </span>
                    </div>

                    {/* Multiplied total — always shown */}
                    <div className="font-mono font-black text-amber-300" style={{ fontSize: '0.85rem', lineHeight: 1 }}>
                        = {formatCommaNumber(baseAmount * collectMultiplier)}
                    </div>

                    {/* Win result (done phase) */}
                    {phase === 'done' && wonMult !== null && (
                        <div style={{ marginTop: 2 }}>
                            <div className="font-tanker text-yellow-300" style={{ fontSize: '1.2rem', lineHeight: 1 }}>{wonMult}× Win!</div>
                            <div className="font-mono font-black text-white" style={{ fontSize: '0.8rem' }}>+{formatCommaNumber(baseAmount * collectMultiplier * wonMult)}</div>
                        </div>
                    )}

                    {/* Action button — Claim only after spin, Spin before */}
                    <div style={{ marginTop: 4 }}>
                        {phase === 'done' && wonMult !== null ? (
                            <button onClick={() => onClaim(baseAmount * collectMultiplier * wonMult)} className="pill-green w-full">
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
        </div>
    );
};
