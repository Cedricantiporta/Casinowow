import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioService } from '../services/audioService';
import { formatK } from '../constants';

// Lucky Leprechaun — Rainbow Trail. A Road-to-Riches-style trail bonus: each spin of
// the small wheel either advances 1-4 steps along a rising ladder of bet-multipliers
// or lands Collect, cashing out at the current step. Reaching the final step pays the
// full 100x cap. This mirrors the classic "trail/ladder" bonus round used across many
// real slot machines (Rainbow Riches being the best-known example).

const TRAIL = [1, 2, 3, 4, 5, 7, 9, 12, 15, 18, 22, 26, 30, 35, 40, 50, 60, 75, 90, 100];
const LAST_STEP = TRAIL.length - 1;

interface Seg { label: string; kind: 'advance' | 'collect'; amount: number; color: string; weight: number; }
const SEGMENTS: Seg[] = [
    { label: '+1', kind: 'advance', amount: 1, color: '#16a34a', weight: 30 },
    { label: '+2', kind: 'advance', amount: 2, color: '#0d9488', weight: 28 },
    { label: '+3', kind: 'advance', amount: 3, color: '#7c3aed', weight: 22 },
    { label: '+4', kind: 'advance', amount: 4, color: '#b45309', weight: 12 },
    { label: 'Collect', kind: 'collect', amount: 0, color: '#dc2626', weight: 8 },
];
const N = SEGMENTS.length;
const SEG_DEG = 360 / N;
const SPIN_MS = 3200;
const CS = 380; const MID = CS / 2; const R = 140;

const pickSeg = (excludeCollect: boolean): number => {
    const pool = excludeCollect ? SEGMENTS.map((s, i) => ({ s, i })).filter(x => x.s.kind !== 'collect') : SEGMENTS.map((s, i) => ({ s, i }));
    const total = pool.reduce((a, x) => a + x.s.weight, 0);
    let r = Math.random() * total;
    for (const x of pool) { r -= x.s.weight; if (r <= 0) return x.i; }
    return pool[pool.length - 1].i;
};

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function drawWheel(ctx: CanvasRenderingContext2D, angleDeg: number, bulbPhase: number) {
    const arcAngle = (Math.PI * 2) / N;
    const offsetAngle = -Math.PI / 2;
    const angle = angleDeg * Math.PI / 180;

    ctx.clearRect(0, 0, CS, CS);

    ctx.save();
    ctx.beginPath();
    ctx.arc(MID, MID, R + 22, 0, Math.PI * 2);
    ctx.fillStyle = '#052e16';
    ctx.shadowBlur = 34;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(MID, MID, R + 14, 0, Math.PI * 2);
    ctx.strokeStyle = '#03170c';
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.restore();

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
        ctx.strokeStyle = '#05230f';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, R - 8, startAng + 0.06, endAng - 0.06);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.restore();
    }
    for (let i = 0; i < N; i++) {
        const bisector = i * arcAngle + arcAngle / 2 + offsetAngle;
        ctx.save();
        ctx.rotate(bisector);
        ctx.save();
        ctx.translate(R * 0.62, 0);
        ctx.rotate(Math.PI / 2);
        ctx.font = `900 ${SEGMENTS[i].kind === 'collect' ? 15 : 30}px 'Titan One', cursive`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#03170c';
        ctx.lineWidth = 6;
        ctx.strokeText(SEGMENTS[i].label, 0, 0);
        ctx.fillText(SEGMENTS[i].label, 0, 0);
        ctx.restore();
        ctx.restore();
    }
    ctx.restore();

    const totalBulbs = 10;
    const bulbR = R + 19;
    const step = Math.floor(bulbPhase) % totalBulbs;
    for (let b = 0; b < totalBulbs; b++) {
        const bAng = (b * Math.PI * 2 / totalBulbs) - Math.PI / 2;
        const bx = MID + Math.cos(bAng) * bulbR;
        const by = MID + Math.sin(bAng) * bulbR;
        const isLit = b === step || b === (step + 1) % totalBulbs;
        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        if (isLit) {
            const g = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, 8);
            g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#fef08a'); g.addColorStop(1, '#ca8a04');
            ctx.fillStyle = g;
            ctx.shadowColor = '#fde047'; ctx.shadowBlur = 14;
            ctx.strokeStyle = '#422006';
        } else {
            ctx.fillStyle = '#1c2e20'; ctx.strokeStyle = '#03170c';
        }
        ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(MID, MID, 32, 0, Math.PI * 2);
    ctx.fillStyle = '#03170c';
    ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.fill();
    ctx.restore();
}

interface Props { isOpen: boolean; bet: number; onComplete: (multiplier: number) => void; }
type Phase = 'board' | 'spinning' | 'busted';

export const RainbowTrailModal: React.FC<Props> = ({ isOpen, bet, onComplete }) => {
    const [phase, setPhase] = useState<Phase>('board');
    const [currentStep, setCurrentStep] = useState(0);
    const spinsPlayedRef = useRef(0);
    const trailRef = useRef<HTMLDivElement>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tickerRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const doSpinRef = useRef<() => void>(() => {});

    const animRef = useRef({ angleDeg: 0, fromDeg: 0, toDeg: 0, startTime: 0, spinning: false, lastSector: -1, tickerWiggle: 0, bulbPhase: 0 });

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
            if (sector !== a.lastSector && a.lastSector !== -1) { a.tickerWiggle = 22; audioService.playTick(); }
            a.lastSector = sector;
            if (t >= 1) a.spinning = false;
        }
        if (Math.abs(a.tickerWiggle) > 0.5) a.tickerWiggle *= -0.72; else a.tickerWiggle = 0;
        if (tickerRef.current) tickerRef.current.style.transform = `translateX(-50%) rotate(${a.tickerWiggle}deg)`;
        a.bulbPhase += 0.06;
        if (canvas) { const ctx = canvas.getContext('2d'); if (ctx) drawWheel(ctx, a.angleDeg, a.bulbPhase); }
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
            a.angleDeg = 0; a.fromDeg = 0; a.toDeg = 0; a.spinning = false; a.lastSector = -1; a.tickerWiggle = 0;
            setPhase('board'); setCurrentStep(0); spinsPlayedRef.current = 0;
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const el = trailRef.current;
        if (!el) return;
        const STEP_W = 46;
        el.scrollTo({ left: Math.max(0, currentStep * STEP_W - el.clientWidth / 2 + 23), behavior: 'smooth' });
    }, [isOpen, currentStep]);

    const doSpin = () => {
        const excludeCollect = spinsPlayedRef.current < 2;
        const segIdx = pickSeg(excludeCollect);
        const seg = SEGMENTS[segIdx];
        const a = animRef.current;
        const curMod = ((a.angleDeg % 360) + 360) % 360;
        const midDeg = segIdx * SEG_DEG + SEG_DEG / 2;
        const targetMod = (360 - midDeg % 360 + 360) % 360;
        let extra = targetMod - curMod;
        if (extra < 0) extra += 360;
        const finalDeg = a.angleDeg + 9 * 360 + extra;

        a.fromDeg = a.angleDeg; a.toDeg = finalDeg; a.startTime = Date.now(); a.spinning = true; a.lastSector = -1;
        audioService.playWheelSpin();
        setPhase('spinning');
        spinsPlayedRef.current += 1;

        timerRef.current = setTimeout(() => {
            if (seg.kind === 'collect') {
                setPhase('busted');
                audioService.playWinSmall();
            } else {
                setCurrentStep(prev => {
                    const next = Math.min(LAST_STEP, prev + seg.amount);
                    if (next >= LAST_STEP) audioService.playWinBig();
                    setPhase('board');
                    return next;
                });
            }
        }, SPIN_MS + 100);
    };
    doSpinRef.current = doSpin;

    if (!isOpen) return null;
    const currentMult = TRAIL[currentStep];
    const reachedEnd = currentStep >= LAST_STEP;

    return (
        <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-pop-in select-none">
            <div className="w-full max-w-[420px] rounded-3xl overflow-hidden flex flex-col"
                style={{ background: 'linear-gradient(180deg,#166534 0%,#14532d 30%,#052e16 100%)', boxShadow: 'inset 0 1px 0 rgba(190,255,210,0.35), 0 8px 32px rgba(0,0,0,0.85)' }}>

                <div className="flex flex-col items-center pt-4 pb-1">
                    <span className="font-black text-emerald-200/70" style={{ fontSize: 11 }}>Rainbow Trail</span>
                    <span className="font-tanker text-amber-300" style={{ fontSize: 22, lineHeight: 1.3, textShadow: '0 0 12px rgba(251,191,36,0.6)' }}>
                        {currentMult}× · {formatK(Math.floor(currentMult * bet))}
                    </span>
                </div>

                {/* Trail — horizontal scroll of steps */}
                <div ref={trailRef} className="flex items-center overflow-x-auto no-scrollbar px-4 py-3" style={{ gap: 0 }}>
                    {TRAIL.map((mult, i) => {
                        const isDone = i < currentStep;
                        const isActive = i === currentStep;
                        return (
                            <div key={i} className="flex flex-col items-center shrink-0" style={{ width: 46 }}>
                                <div className="flex items-center justify-center rounded-full font-black"
                                    style={{
                                        width: 34, height: 34, fontSize: 11,
                                        background: isActive ? 'linear-gradient(180deg,#fde047,#ca8a04)' : isDone ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.08)',
                                        color: isActive ? '#422006' : isDone ? '#bbf7d0' : 'rgba(255,255,255,0.35)',
                                        boxShadow: isActive ? '0 0 14px rgba(253,224,71,0.8)' : 'none',
                                    }}>
                                    {mult}×
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Wheel zone */}
                {!reachedEnd && (
                    <div className="flex flex-col items-center pb-2">
                        <div className="relative" style={{ width: 240, height: 280 }}>
                            <div ref={tickerRef} className="absolute z-20"
                                style={{ top: 20, left: '50%', transform: 'translateX(-50%)', transformOrigin: '50% 15%', width: 22, height: 34 }}>
                                <svg width={22} height={34} viewBox="0 0 40 62" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 2C10 2 2 10 2 20C2 30 12 56 20 60C28 56 38 30 38 20C38 10 30 2 20 2Z" fill="url(#rtgrad)" stroke="#111827" strokeWidth="2.5" />
                                    <circle cx="20" cy="20" r="12" fill="#fde047" />
                                    <circle cx="20" cy="20" r="5" fill="#fefce8" />
                                    <defs>
                                        <linearGradient id="rtgrad" x1="20" y1="2" x2="20" y2="60" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#fef08a" /><stop offset="60%" stopColor="#eab308" /><stop offset="100%" stopColor="#a16207" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                            <canvas ref={canvasRef} width={CS} height={CS}
                                style={{ position: 'absolute', top: 22, left: 0, width: 240, height: 240, filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.8))' }} />
                            {phase === 'board' && (
                                <button onClick={() => doSpinRef.current()}
                                    className="absolute flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95"
                                    style={{
                                        top: 22 + 120 - 28, left: 120 - 28, width: 56, height: 56, borderRadius: '50%',
                                        background: '#fdf5e2', border: '2px solid rgba(255,255,255,0.15)', zIndex: 30,
                                        boxShadow: '0 6px 14px rgba(0,0,0,0.6), inset 0 -4px 0 #edd8af, inset 0 4px 0 #ffffff',
                                    }}>
                                    <span className="font-black text-emerald-800" style={{ fontSize: 13, fontFamily: 'Titan One, cursive', lineHeight: 1 }}>Spin</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Collect button — always available at the board phase */}
                {phase === 'board' && !reachedEnd && (
                    <div className="px-5 pb-5">
                        <button onClick={() => setPhase('busted')} className="pill-green w-full">
                            <div className="pill-face" style={{ padding: '9px 12px', fontSize: '13px' }}>
                                Collect {formatK(Math.floor(currentMult * bet))}
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* Result popup — landed Collect, pressed Collect, or reached the final step */}
            {(phase === 'busted' || reachedEnd) && (
                <div className="absolute inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-pop-in"
                    style={{ pointerEvents: phase === 'busted' || reachedEnd ? 'auto' : 'none' }}>
                    <div className="flex flex-col items-center gap-2.5 rounded-3xl px-8 py-7 text-center overflow-hidden"
                        style={{ background: 'linear-gradient(180deg,#166534 0%,#14532d 30%,#052e16 100%)', boxShadow: 'inset 0 1px 0 rgba(190,255,210,0.35), 0 8px 32px rgba(0,0,0,0.85)', maxWidth: 300 }}>
                        <span className="font-black text-emerald-200/70" style={{ fontSize: 11 }}>{reachedEnd ? 'Pot of Gold!' : 'Trail Complete'}</span>
                        <span className="font-tanker text-amber-300" style={{ fontSize: 34, lineHeight: 1, textShadow: '0 0 16px rgba(251,191,36,0.7)' }}>
                            +{formatK(Math.floor(currentMult * bet))}
                        </span>
                        <button onClick={() => onComplete(currentMult)} className="pill-green w-full mt-2">
                            <div className="pill-face" style={{ padding: '9px 12px', fontSize: '13px' }}>Collect</div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
