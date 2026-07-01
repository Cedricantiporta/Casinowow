import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioService } from '../services/audioService';
import { containerShell } from './wheel3d';

export type AngryFlockWildColor = 'green' | 'blue' | 'purple' | 'red';

interface Seg {
    label: string;
    sub: string;
    color: string;
    bird: AngryFlockWildColor;
    weight: number;
}

// Each bird colour governs a distinct wild pattern for the whole free-spin
// session (applied per-spin in App.tsx's generateSmartGrid ANGRYFLOCK block):
//   green:  2-3 scattered single wilds
//   blue:   3-4 scattered single wilds
//   purple: 1-2 wild reels
//   red:    1 NEW sticky wild attempt per spin, persisting for the session (a
//           re-roll onto an already-sticky cell is just a no-op, not a reroll)
const SEGMENTS: Seg[] = [
    { label: 'GREEN',  sub: '2-3 Wilds',        color: '#16a34a', bird: 'green',  weight: 30 },
    { label: 'BLUE',   sub: '3-4 Wilds',        color: '#2563eb', bird: 'blue',   weight: 26 },
    { label: 'PURPLE', sub: '1-2 Wild Reels',   color: '#7c3aed', bird: 'purple', weight: 24 },
    { label: 'RED',    sub: 'Sticky Wilds',     color: '#dc2626', bird: 'red',    weight: 20 },
];

const N = SEGMENTS.length;
const SEG_DEG = 360 / N;
const SPIN_MS = 6500;

const CS = 480; const MID = CS / 2; const R = 175;

const pickSeg = (): number => {
    const total = SEGMENTS.reduce((a, s) => a + s.weight, 0);
    let r = Math.random() * total;
    for (let i = 0; i < N; i++) { r -= SEGMENTS[i].weight; if (r <= 0) return i; }
    return N - 1;
};

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function drawWheel(ctx: CanvasRenderingContext2D, angleDeg: number, bulbPhase: number) {
    const arcAngle = (Math.PI * 2) / N;
    const offsetAngle = -Math.PI / 2;
    const angle = angleDeg * Math.PI / 180;

    ctx.clearRect(0, 0, CS, CS);

    ctx.save();
    ctx.beginPath();
    ctx.arc(MID, MID + 10, R + 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    (ctx as any).filter = 'blur(12px)';
    ctx.fill();
    ctx.restore();
    (ctx as any).filter = 'none';

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

    ctx.save();
    ctx.translate(MID, MID);
    ctx.rotate(angle);

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.clip();

    for (let i = 0; i < N; i++) {
        const startAng = i * arcAngle + offsetAngle;
        const endAng = startAng + arcAngle;
        const bisector = startAng + arcAngle / 2;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, startAng, endAng);
        ctx.closePath();
        ctx.fillStyle = SEGMENTS[i].color;
        ctx.fill();

        const sg = ctx.createRadialGradient(Math.cos(bisector) * R * 0.5, Math.sin(bisector) * R * 0.5, 0, 0, 0, R);
        sg.addColorStop(0,   'rgba(255,255,255,0.24)');
        sg.addColorStop(0.55,'rgba(255,255,255,0.04)');
        sg.addColorStop(1,   'rgba(0,0,0,0.32)');
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, startAng, endAng);
        ctx.closePath();
        ctx.fillStyle = sg;
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, startAng, endAng);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0,0,0,0.60)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, R - 5, startAng + 0.05, endAng - 0.05);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 4.5;
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();

    for (let i = 0; i < N; i++) {
        const bisector = i * arcAngle + arcAngle / 2 + offsetAngle;
        ctx.save();
        ctx.rotate(bisector);
        ctx.translate(R * 0.72, 0);
        ctx.rotate(Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.lineWidth = 7;
        ctx.fillStyle = '#fff';

        ctx.font = `900 24px 'Titan One', cursive`;
        ctx.strokeText(SEGMENTS[i].label, 0, -10);
        ctx.fillText(SEGMENTS[i].label, 0, -10);

        ctx.font = `900 12px sans-serif`;
        ctx.lineWidth = 5;
        ctx.strokeText(SEGMENTS[i].sub, 0, 14);
        ctx.fillText(SEGMENTS[i].sub, 0, 14);
        ctx.restore();
    }

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
    ctx.restore();

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
            g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#fde68a'); g.addColorStop(1, '#ca8a04');
            ctx.fillStyle = g;
            ctx.shadowColor = '#facc15'; ctx.shadowBlur = 16;
            ctx.strokeStyle = '#3f2203';
        } else {
            ctx.fillStyle = '#422006'; ctx.strokeStyle = '#1c1917';
        }
        ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    ctx.save();
    const hubGrad = ctx.createRadialGradient(MID - 8, MID - 8, 2, MID, MID, 38);
    hubGrad.addColorStop(0, '#4b5563');
    hubGrad.addColorStop(0.5, '#1f2937');
    hubGrad.addColorStop(1, '#0d1117');
    ctx.beginPath();
    ctx.arc(MID, MID, 38, 0, Math.PI * 2);
    ctx.fillStyle = hubGrad;
    ctx.shadowBlur = 14; ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(MID, MID, 38, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

interface Props { isOpen: boolean; freeSpins: number; onComplete: (color: AngryFlockWildColor) => void; }
type Phase = 'prompt' | 'ready' | 'spinning' | 'done';

export const AngryFlockRouletteModal: React.FC<Props> = ({ isOpen, freeSpins, onComplete }) => {
    const [phase, setPhase] = useState<Phase>('prompt');
    const [wonSeg, setWonSeg] = useState<Seg | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tickerRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const doSpinRef = useRef<() => void>(() => {});

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

    const doSpin = () => {
        const segIdx = pickSeg();
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
            audioService.playFreeSpinTrigger();
            setPhase('done');
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
            setPhase('prompt'); setWonSeg(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[200] animate-pop-in select-none">

            {phase === 'prompt' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-pop-in flex flex-col items-center gap-2 rounded-3xl px-7 py-5 text-center overflow-hidden"
                        style={{ ...containerShell('candy'), maxWidth: 260 }}>
                        <div className="font-black text-white uppercase tracking-wide text-xl leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                            Bird Wheel Bonus
                        </div>
                        <div className="text-pink-100/80 text-[11px] font-black uppercase tracking-[0.2em]">{freeSpins} Free Spins</div>
                        <button onClick={() => setPhase('ready')} className="pill-pink w-full mt-1">
                            <div className="pill-face" style={{ padding: '8px 12px', fontSize: '11px', background: 'linear-gradient(180deg,#f9a8d4,#db2777)', color: '#fff', WebkitTextStroke: '0' }}>Spin Now!</div>
                        </button>
                    </div>
                </div>
            )}

            {phase !== 'prompt' && (
                <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 300, height: 350 }}>
                    <div ref={tickerRef} className="absolute z-20"
                        style={{ top: 27, left: '50%', transform: 'translateX(-50%)', transformOrigin: '50% 15%', width: 28, height: 44 }}>
                        <svg width={28} height={44} viewBox="0 0 40 62" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 2C10 2 2 10 2 20C2 30 12 56 20 60C28 56 38 30 38 20C38 10 30 2 20 2Z"
                                fill="url(#afgrad)" stroke="#111827" strokeWidth="2.5"/>
                            <circle cx="20" cy="20" r="12" fill="#f472b6"/>
                            <circle cx="20" cy="20" r="5" fill="#fdf2f8"/>
                            <defs>
                                <linearGradient id="afgrad" x1="20" y1="2" x2="20" y2="60" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="#f9a8d4"/>
                                    <stop offset="60%" stopColor="#ec4899"/>
                                    <stop offset="100%" stopColor="#be185d"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>

                    <canvas ref={canvasRef} width={CS} height={CS}
                        style={{ position: 'absolute', top: 30, left: 0, width: 300, height: 300, filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.8))' }} />

                    {phase === 'ready' && (
                        <button onClick={() => doSpinRef.current()}
                            className="absolute flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95"
                            style={{
                                top: 30 + 150 - 34, left: 150 - 34, width: 68, height: 68, borderRadius: '50%',
                                background: '#fdf5e2', border: '2px solid rgba(255,255,255,0.15)', zIndex: 30,
                                boxShadow: '0 6px 14px rgba(0,0,0,0.6), inset 0 -5px 0 #edd8af, inset 0 5px 0 #ffffff',
                            }}>
                            <span className="font-black text-[#be185d] uppercase tracking-tight" style={{ fontSize: 18, fontFamily: 'Titan One, cursive', lineHeight: 1 }}>SPIN</span>
                        </button>
                    )}
                </div>
            )}

            {phase === 'done' && wonSeg && (
                <div className="absolute inset-0 z-[210] flex items-center justify-center animate-pop-in">
                    <div className="flex flex-col items-center gap-3 rounded-3xl px-10 py-7 text-center overflow-hidden"
                        style={{ ...containerShell('candy'), maxWidth: 300 }}>
                        <div className="text-pink-100/70 text-[10px] font-black uppercase tracking-[0.25em]">You Won</div>
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="font-black leading-none" style={{ fontSize: '2.2rem', color: wonSeg.color, textShadow: '0 3px 10px rgba(0,0,0,0.55), 0 0 12px rgba(255,255,255,0.3)' }}>{wonSeg.label} Bird</span>
                            <div className="font-black text-white text-sm uppercase tracking-[0.2em]">{wonSeg.sub}</div>
                        </div>
                        <button onClick={() => onComplete(wonSeg.bird)} className="pill-pink w-full mt-1">
                            <div className="pill-face" style={{ padding: '8px 12px', fontSize: '11px', background: 'linear-gradient(180deg,#f9a8d4,#db2777)', color: '#fff', WebkitTextStroke: '0' }}>Start Free Spins!</div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
