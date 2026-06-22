import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioService } from '../services/audioService';
import { containerShell } from './wheel3d';

interface Seg {
    label: string;
    count: number;
    color: string;
    weight: number;
}

const SEGMENTS: Seg[] = [
    { label: '3',  count: 3,  color: '#be185d', weight: 35 },
    { label: '5',  count: 5,  color: '#7c3aed', weight: 30 },
    { label: '7',  count: 7,  color: '#db2777', weight: 20 },
    { label: '10', count: 10, color: '#9333ea', weight: 15 },
];

const N = SEGMENTS.length;
const SEG_DEG = 360 / N;
const SPIN_MS = 5500;

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

    // Outer chassis ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(MID, MID, R + 26, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1020';
    ctx.shadowBlur = 40;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(MID, MID, R + 17, 0, Math.PI * 2);
    ctx.strokeStyle = '#0f0a18';
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
        ctx.strokeStyle = '#1c0c1e';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Edge gloss
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, R - 10, startAng + 0.07, endAng - 0.07);
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.restore();
    }

    // Labels
    for (let i = 0; i < N; i++) {
        const bisector = i * arcAngle + arcAngle / 2 + offsetAngle;
        ctx.save();
        ctx.rotate(bisector);

        ctx.save();
        ctx.translate(R * 0.65, 0);
        ctx.rotate(Math.PI / 2);
        ctx.font = `900 42px 'Titan One', cursive`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#1c0c30';
        ctx.lineWidth = 8;
        ctx.strokeText(SEGMENTS[i].label, 0, -10);
        ctx.fillText(SEGMENTS[i].label, 0, -10);
        ctx.font = `900 13px sans-serif`;
        ctx.strokeStyle = '#1c0c30';
        ctx.lineWidth = 5;
        ctx.strokeText('SPINS', 0, 18);
        ctx.fillText('SPINS', 0, 18);
        ctx.restore();

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

    // Chasing bulbs
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
            g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#fbcfe8'); g.addColorStop(1, '#ec4899');
            ctx.fillStyle = g;
            ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 18;
            ctx.strokeStyle = '#4a0320';
        } else {
            ctx.fillStyle = '#6b1237'; ctx.strokeStyle = '#1c0017';
        }
        ctx.lineWidth = 2.5; ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    // Center hub
    ctx.save();
    ctx.beginPath();
    ctx.arc(MID, MID, 40, 0, Math.PI * 2);
    ctx.fillStyle = '#1c0824';
    ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.fill();
    ctx.restore();
}

interface Props { isOpen: boolean; onComplete: (count: number) => void; }
type Phase = 'ready' | 'spinning' | 'done';

export const SpinCountRouletteModal: React.FC<Props> = ({ isOpen, onComplete }) => {
    const [phase, setPhase] = useState<Phase>('ready');
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
        const finalDeg = a.angleDeg + 12 * 360 + extra;

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
            setPhase('ready'); setWonSeg(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[200] animate-pop-in select-none">
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-1">
                    {/* Wheel zone */}
                    <div className="relative" style={{ width: 300, height: 350 }}>
                        {/* Ticker arrow */}
                        <div ref={tickerRef} className="absolute z-20"
                            style={{ top: 27, left: '50%', transform: 'translateX(-50%)', transformOrigin: '50% 15%', width: 28, height: 44 }}>
                            <svg width={28} height={44} viewBox="0 0 40 62" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 2C10 2 2 10 2 20C2 30 12 56 20 60C28 56 38 30 38 20C38 10 30 2 20 2Z"
                                    fill="url(#scgrad)" stroke="#111827" strokeWidth="2.5"/>
                                <circle cx="20" cy="20" r="12" fill="#f472b6"/>
                                <circle cx="20" cy="20" r="5" fill="#fdf2f8"/>
                                <defs>
                                    <linearGradient id="scgrad" x1="20" y1="2" x2="20" y2="60" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stopColor="#f9a8d4"/>
                                        <stop offset="60%" stopColor="#ec4899"/>
                                        <stop offset="100%" stopColor="#be185d"/>
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>

                        {/* Canvas */}
                        <canvas ref={canvasRef} width={CS} height={CS}
                            style={{ position: 'absolute', top: 30, left: 0, width: 300, height: 300, filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.8))' }} />

                        {/* Center SPIN button */}
                        {phase === 'ready' && (
                            <button onClick={() => doSpinRef.current()}
                                className="absolute flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95"
                                style={{
                                    top: 30 + 150 - 34, left: 150 - 34, width: 68, height: 68, borderRadius: '50%',
                                    background: '#fdf5e2', border: '3px solid #25283d', zIndex: 30,
                                    boxShadow: '0 6px 14px rgba(0,0,0,0.6), inset 0 -5px 0 #edd8af, inset 0 5px 0 #ffffff',
                                }}>
                                <span className="font-black text-[#be185d] uppercase tracking-tight" style={{ fontSize: 18, fontFamily: 'Titan One, cursive', lineHeight: 1 }}>SPIN</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Result popup */}
            {phase === 'done' && wonSeg && (
                <div className="absolute inset-0 z-[210] flex items-center justify-center animate-pop-in">
                    <div className="flex flex-col items-center gap-3 rounded-3xl px-10 py-7 text-center overflow-hidden"
                        style={{ ...containerShell('candy'), maxWidth: 300 }}>
                        <div className="text-pink-100/70 text-[10px] font-black uppercase tracking-[0.25em]">You Won</div>
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="font-black text-white" style={{ fontSize: '3.5rem', lineHeight: 1, textShadow: '0 3px 10px rgba(0,0,0,0.55)' }}>{wonSeg.label}</span>
                            <div className="font-black text-white text-sm uppercase tracking-[0.2em]">Free Spins</div>
                        </div>
                        <button onClick={() => onComplete(wonSeg.count)} className="pill-green w-full mt-1">
                            <div className="pill-face" style={{ padding: '8px 12px', fontSize: '11px', background: 'linear-gradient(180deg,#f9a8d4,#db2777)' }}>Next: Wild Wheel →</div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
