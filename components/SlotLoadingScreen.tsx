import React, { useEffect, useRef, useState } from 'react';
import { GameConfig } from '../types';

const THEME_ICONS: Partial<Record<string, string>> = {
    EGYPT: '🗿', NEON: '🎰', DRAGON: '🐉', PIRATE: '🏴‍☠️', SPACE: '👽',
    CANDY: '🧁', JUNGLE: '🦍', UNDERWATER: '🦈', WESTERN: '🤠', SAMURAI: '⚔️',
    PIGGY: '🐷', LEPRECHAUN: '🍀', GOLDEN_POT: '🏮', ARCTIC: '🐧',
};

interface Props {
    game: GameConfig;
}

export const SlotLoadingScreen: React.FC<Props> = ({ game }) => {
    const [progress, setProgress] = useState(0);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const start = performance.now();
        const duration = 650;
        const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            // ease-out curve so it slows at the end
            setProgress(1 - Math.pow(1 - p, 2));
            if (p < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    const icon = THEME_ICONS[game.theme] ?? '🎰';

    return (
        <div
            className="absolute inset-0 z-[500] flex flex-col items-center justify-center select-none"
            style={{ background: game.bgImage ?? 'linear-gradient(180deg,#0a0015,#1a0035)' }}
        >
            {/* Subtle vignette */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />

            <div className="relative flex flex-col items-center gap-5">
                {/* Icon with pulse */}
                <div className="animate-bounce-sm" style={{ fontSize: '5rem', lineHeight: 1, filter: 'drop-shadow(0 0 24px rgba(255,255,255,0.35))' }}>
                    {icon}
                </div>

                {/* Game name */}
                <div className="font-black text-white text-xl uppercase tracking-widest"
                    style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.2)' }}>
                    {game.name}
                </div>

                {/* Progress bar */}
                <div className="w-52 h-[5px] rounded-full overflow-hidden bg-white/15">
                    <div
                        className="h-full rounded-full"
                        style={{
                            width: `${progress * 100}%`,
                            background: 'linear-gradient(90deg,rgba(255,255,255,0.4),rgba(255,255,255,0.9))',
                            boxShadow: '0 0 8px rgba(255,255,255,0.6)',
                            transition: 'width 16ms linear',
                        }}
                    />
                </div>

                <div className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">
                    Loading
                </div>
            </div>
        </div>
    );
};
