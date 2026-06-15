import React, { useEffect, useRef, useState } from 'react';
import { GameConfig } from '../types';

const THEME_ICONS: Partial<Record<string, string>> = {
    PIRATE: '🏴‍☠️', SPACE: '👽',
    JUNGLE: '🦍', UNDERWATER: '🦈', WESTERN: '🤠', SAMURAI: '⚔️',
    PIGGY: '🐷', LEPRECHAUN: '🍀', GOLDEN_POT: '🏮', ARCTIC: '🐧',
};
const THEME_IMG_ICON: Partial<Record<string, string>> = {
    DRAGON: '/dragon/dragon-1.png',
    EGYPT:  '/egypt/scatter.png',
    NEON:   '/symbols/diamond.png',
    CANDY:  '/symbols/diamond.png',
    PIRATE: '/pirate/skull.png',
    PIGGY:  '/piggy/pig.png',
    ARCTIC: '/arctic/penguin.png',
    CANDY:  '/candy/sugar11.png',
};

const DRAGON_IMAGES = Array.from({ length: 11 }, (_, i) => `/dragon/dragon-${i + 1}.png`);

interface Props {
    game: GameConfig;
}

export const SlotLoadingScreen: React.FC<Props> = ({ game }) => {
    const [progress, setProgress] = useState(0);
    const rafRef = useRef<number>(0);
    const isDragon = game.theme === 'DRAGON';
    const imgIcon = THEME_IMG_ICON[game.theme];

    useEffect(() => {
        if (!isDragon) {
            // Non-dragon: simple timed progress bar
            const start = performance.now();
            const duration = 650;
            const tick = (now: number) => {
                const p = Math.min(1, (now - start) / duration);
                setProgress(1 - Math.pow(1 - p, 2));
                if (p < 1) rafRef.current = requestAnimationFrame(tick);
            };
            rafRef.current = requestAnimationFrame(tick);
            return () => cancelAnimationFrame(rafRef.current);
        }

        // Dragon: preload all symbol images, progress tracks actual loading
        let loaded = 0;
        const total = DRAGON_IMAGES.length;
        const imgs = DRAGON_IMAGES.map(src => {
            const img = new window.Image();
            img.onload = img.onerror = () => {
                loaded++;
                setProgress(loaded / total);
            };
            img.src = src;
            return img;
        });
        return () => { imgs.forEach(img => { img.onload = img.onerror = null; }); };
    }, [isDragon]);

    const icon = THEME_ICONS[game.theme];

    return (
        <div
            className="absolute inset-0 z-[500] flex flex-col items-center justify-center select-none"
            style={{ background: game.bgImage ?? 'linear-gradient(180deg,#0a0015,#1a0035)' }}
        >
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />

            <div className="relative flex flex-col items-center gap-5">
                {/* Icon */}
                <div className="animate-bounce-sm" style={{ lineHeight: 1, filter: 'drop-shadow(0 0 24px rgba(255,255,255,0.35))' }}>
                    {imgIcon ? (
                        <img src={imgIcon} alt="" style={{ width: 80, height: 80, objectFit: 'contain' }} />
                    ) : (
                        <span style={{ fontSize: '5rem' }}>{icon ?? '🎰'}</span>
                    )}
                </div>

                {/* Game name */}
                <div className="font-black text-white text-xl uppercase tracking-widest"
                    style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.2)' }}>
                    {game.name}
                </div>

                {/* Progress bar */}
                <div className="w-52 h-[5px] rounded-full overflow-hidden bg-white/15">
                    <div
                        className="h-full rounded-full transition-all duration-100"
                        style={{
                            width: `${progress * 100}%`,
                            background: 'linear-gradient(90deg,rgba(255,255,255,0.4),rgba(255,255,255,0.9))',
                            boxShadow: '0 0 8px rgba(255,255,255,0.6)',
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
