import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { MiniGameReward } from '../types';
import { formatNumber } from '../constants';
import { audioService } from '../services/audioService';

export type RpgAction = 'ATTACK' | 'SKILL' | 'SHIELD' | 'LOOT' | 'NOTHING';

export interface RpgSpinResult {
    action: RpgAction;
    damage: number;
    rewards: MiniGameReward[];
}

interface WheelSeg {
    label: string;
    color: string;
    weight: number;
    action: RpgAction;
}

// 5-segment combat wheel: Attack is the common bread-and-butter hit, Skill is the
// rarer big hit, Shield refunds keys (the shared mini-game token), Loot pays out
// coins/gems, Nothing is a clean miss.
const SEGMENTS: WheelSeg[] = [
    { label: 'Attack', color: '#b91c1c', weight: 40, action: 'ATTACK' },
    { label: 'Shield', color: '#0e7490', weight: 20, action: 'SHIELD' },
    { label: 'Skill',  color: '#5b21b6', weight: 15, action: 'SKILL' },
    { label: 'Loot',   color: '#a16207', weight: 15, action: 'LOOT' },
    { label: 'Miss',   color: '#374151', weight: 10, action: 'NOTHING' },
];

const ATTACK_DAMAGE = 2;
const SKILL_DAMAGE = 10;

const N = SEGMENTS.length;
const SEG_DEG = 360 / N;
const SPIN_MS = 3400;
const CS = 480; // canvas backing resolution (2x pixel density)
const MID = CS / 2;
const R = 175;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const pickSeg = (): number => {
    const total = SEGMENTS.reduce((a, s) => a + s.weight, 0);
    let r = Math.random() * total;
    for (let i = 0; i < SEGMENTS.length; i++) { r -= SEGMENTS[i].weight; if (r <= 0) return i; }
    return SEGMENTS.length - 1;
};

// Same chrome recipe as the other bonus wheels: chassis ring, per-wedge fill + edge
// gloss, rim rivets, chasing bulbs, center hub.
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
        ctx.translate(R * 0.68, 0);
        ctx.rotate(Math.PI / 2);
        const label = SEGMENTS[i].label;
        ctx.font = `900 26px 'Titan One', cursive`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#1c0c30';
        ctx.lineWidth = 6;
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
        ctx.arc(rx, ry, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#94a3b8';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rx - 2, ry - 2, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();

    // Chasing bulbs (gold, fixed — not rotating)
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
        ctx.arc(bx, by, 8, 0, Math.PI * 2);
        if (isLit) {
            const g = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, 9);
            g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#fef08a'); g.addColorStop(1, '#ca8a04');
            ctx.fillStyle = g;
            ctx.shadowColor = '#facc15'; ctx.shadowBlur = 16;
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
    ctx.arc(MID, MID, 36, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1836';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.fill();
    ctx.restore();
}

export interface RPGRouletteWheelHandle {
    spin: () => void;
}

interface RPGRouletteWheelProps {
    credits: number;
    stage: number;
    maxBet: number;
    onSpinResult: (result: RpgSpinResult) => void;
    onSpinningChange?: (spinning: boolean) => void;
}

export const RPGRouletteWheel = forwardRef<RPGRouletteWheelHandle, RPGRouletteWheelProps>(({ credits, stage, maxBet, onSpinResult, onSpinningChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tickerRef = useRef<HTMLDivElement>(null);
    const [spinning, setSpinning] = useState(false);
    const spinningRef = useRef(false);
    const creditsRef = useRef(credits);
    useEffect(() => { creditsRef.current = credits; }, [credits]);
    const stageRef = useRef(stage);
    useEffect(() => { stageRef.current = stage; }, [stage]);
    const maxBetRef = useRef(maxBet);
    useEffect(() => { maxBetRef.current = maxBet; }, [maxBet]);

    const animRef = useRef({ angleDeg: 0, bulbPhase: 0, tickerWiggle: 0, lastSector: -1 });
    const rafRef = useRef(0);
    const idleRafRef = useRef(0);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) drawWheel(ctx, animRef.current.angleDeg, animRef.current.bulbPhase);
    }, []);

    // Idle loop keeps the marquee bulbs chasing even while not spinning.
    useEffect(() => {
        const loop = () => {
            if (!spinningRef.current) {
                animRef.current.bulbPhase += 0.04;
                draw();
            }
            idleRafRef.current = requestAnimationFrame(loop);
        };
        idleRafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(idleRafRef.current);
    }, [draw]);

    useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

    // Rolls a Loot reward — mostly coins (scaling with stage/maxBet), occasionally gems.
    const rollLootReward = (): MiniGameReward => {
        const baseCoin = Math.floor((maxBetRef.current || 10000) * 0.10 * Math.pow(1.08, stageRef.current - 1));
        if (Math.random() < 0.18) {
            const gems = Math.random() < 0.5 ? 5 : 8;
            return { type: 'DIAMONDS', value: gems, label: `+${gems}` };
        }
        return { type: 'COINS', value: baseCoin, label: formatNumber(baseCoin) };
    };
    // Rolls a Shield reward — 1 key most of the time, occasionally 2.
    const rollShieldReward = (): MiniGameReward => {
        const keys = Math.random() < 0.3 ? 2 : 1;
        return { type: 'MINI_CREDITS', value: keys, label: `+${keys}` };
    };

    const spin = useCallback(() => {
        if (spinningRef.current || creditsRef.current <= 0) return;
        spinningRef.current = true;
        setSpinning(true);
        onSpinningChange?.(true);
        const idx = pickSeg();
        const a = animRef.current;
        const mid = idx * SEG_DEG + SEG_DEG / 2;
        const cur = ((a.angleDeg % 360) + 360) % 360;
        const targetMod = (360 - (mid % 360) + 360) % 360;
        let extra = targetMod - cur;
        if (extra < 0) extra += 360;
        const from = a.angleDeg;
        const to = from + 5 * 360 + extra;
        const start = Date.now();
        a.lastSector = -1;
        audioService.playWheelSpin();

        const loop = () => {
            const t = Math.min((Date.now() - start) / SPIN_MS, 1);
            a.angleDeg = from + (to - from) * easeOut(t);

            const mod = ((a.angleDeg % 360) + 360) % 360;
            const sector = Math.floor(mod / SEG_DEG) % N;
            if (sector !== a.lastSector && a.lastSector !== -1) {
                a.tickerWiggle = 22;
                audioService.playTick();
            }
            a.lastSector = sector;
            if (Math.abs(a.tickerWiggle) > 0.5) a.tickerWiggle *= -0.72;
            else a.tickerWiggle = 0;
            if (tickerRef.current) tickerRef.current.style.transform = `translateX(-50%) rotate(${a.tickerWiggle}deg)`;

            a.bulbPhase += 0.06;
            draw();
            if (t < 1) {
                rafRef.current = requestAnimationFrame(loop);
            } else {
                spinningRef.current = false;
                setSpinning(false);
                onSpinningChange?.(false);
                const seg = SEGMENTS[idx];
                if (seg.action === 'ATTACK') {
                    audioService.playWinSmall();
                    onSpinResult({ action: 'ATTACK', damage: ATTACK_DAMAGE, rewards: [] });
                } else if (seg.action === 'SKILL') {
                    audioService.playScatterTrigger();
                    onSpinResult({ action: 'SKILL', damage: SKILL_DAMAGE, rewards: [] });
                } else if (seg.action === 'SHIELD') {
                    audioService.playWinSmall();
                    onSpinResult({ action: 'SHIELD', damage: 0, rewards: [rollShieldReward()] });
                } else if (seg.action === 'LOOT') {
                    audioService.playWinSmall();
                    onSpinResult({ action: 'LOOT', damage: 0, rewards: [rollLootReward()] });
                } else {
                    onSpinResult({ action: 'NOTHING', damage: 0, rewards: [] });
                }
            }
        };
        rafRef.current = requestAnimationFrame(loop);
    }, [draw, onSpinResult, onSpinningChange]);

    useImperativeHandle(ref, () => ({ spin }), [spin]);

    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <div className="relative" style={{ width: 260, height: 260 }}>
                {/* Ticker — same teardrop marker as the bonus wheels */}
                <div ref={tickerRef} className="absolute z-20"
                    style={{ top: -6, left: '50%', transform: 'translateX(-50%)', transformOrigin: '50% 15%', width: 28, height: 44 }}>
                    <svg width={28} height={44} viewBox="0 0 40 62" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 2C10 2 2 10 2 20C2 30 12 56 20 60C28 56 38 30 38 20C38 10 30 2 20 2Z"
                            fill="url(#rpggrad)" stroke="#111827" strokeWidth="2.5" />
                        <circle cx="20" cy="20" r="12" fill="#78350f" />
                        <circle cx="20" cy="20" r="5" fill="#fdf5e2" />
                        <defs>
                            <linearGradient id="rpggrad" x1="20" y1="2" x2="20" y2="60" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#ffeaa0" />
                                <stop offset="60%" stopColor="#f3c451" />
                                <stop offset="100%" stopColor="#9a6a18" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <canvas ref={canvasRef} width={CS} height={CS}
                    style={{ width: 260, height: 260, filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.8))' }} />
            </div>
        </div>
    );
});
