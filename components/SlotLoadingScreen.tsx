import React, { useEffect, useRef, useState } from 'react';
import { GameConfig } from '../types';
import { getGameAssets, WIN_TIER_IMAGES } from '../constants';

const THEME_IMG_ICON: Partial<Record<string, string>> = {
    DRAGON:     '/dragon/dragon-1.png',
    EGYPT:      '/pharaoh_scatter.png',
    NEON:       '/symbols/neon_bonus.png',
    CANDY:      '/candy_scatter.png',
    PIRATE:     '/pirate_scatter.png',
    PIGGY:      '/piggy/pig.png',
    ARCTIC:     '/arctic/snow.png',
    SPACE:      '/cosmic_scatter.png',
    JUNGLE:     '/jungle_scatter.png',
    UNDERWATER: '/deep_scatter.png',
    WESTERN:    '/gold_scatter.png',
    SAMURAI:    '/samurai_scatter.png',
    LEPRECHAUN: '/lucky_scatter.png',
    GOLDEN_POT: '/goldenpot_scatter.png',
    PETS:       '/pets_scatter.png',
    MMORPG:     '/fantasy_scatter.png',
    FARM:       '/farm_scatter.png',
    BEAST:      '/beast_scatter.png',
    ANGRYFLOCK: '/angryflock_scatter.png',
    PRINCESS:   '/princess_scatter.png',
};

function getImagesToPreload(game: GameConfig): string[] {
    const imgs = new Set<string>();

    // Theme loading icon
    const icon = THEME_IMG_ICON[game.theme];
    if (icon) imgs.add(icon);

    // Full game asset set: background, symbols, scatter/wild, jackpot tile art
    try {
        getGameAssets(game).forEach(src => imgs.add(src));
    } catch {}

    // Win tier celebration art
    WIN_TIER_IMAGES.forEach(src => imgs.add(src));

    return [...imgs];
}

interface Props {
    game: GameConfig;
}

export const SlotLoadingScreen: React.FC<Props> = ({ game }) => {
    const [progress, setProgress] = useState(0);
    const rafRef = useRef<number>(0);
    const imgIcon = THEME_IMG_ICON[game.theme];

    useEffect(() => {
        const images = getImagesToPreload(game);

        if (images.length === 0) {
            // Nothing to preload — run a short timed animation
            const start = performance.now();
            const duration = 500;
            const tick = (now: number) => {
                const p = Math.min(1, (now - start) / duration);
                setProgress(1 - Math.pow(1 - p, 2));
                if (p < 1) rafRef.current = requestAnimationFrame(tick);
            };
            rafRef.current = requestAnimationFrame(tick);
            return () => cancelAnimationFrame(rafRef.current);
        }

        // Preload all images, tracking progress
        let loaded = 0;
        const total = images.length;
        const refs = images.map(src => {
            const img = new window.Image();
            img.onload = img.onerror = () => {
                loaded++;
                setProgress(loaded / total);
            };
            img.src = src;
            return img;
        });
        return () => { refs.forEach(img => { img.onload = img.onerror = null; }); };
    }, [game.theme, game.slotBg]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div
            className="absolute inset-0 z-[500] flex flex-col items-center justify-center select-none"
            style={{ backgroundImage: 'url(/slot_loading_bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
            <div className="absolute inset-0 bg-black/50 pointer-events-none" />

            <div className="relative flex flex-col items-center gap-5">
                {/* Icon */}
                <div className="animate-bounce-sm" style={{ lineHeight: 1, filter: 'drop-shadow(0 0 24px rgba(255,255,255,0.35))' }}>
                    {imgIcon ? (
                        <img src={imgIcon} alt="" style={{ width: 80, height: 80, objectFit: 'contain' }} />
                    ) : (
                        <span style={{ fontSize: '5rem' }}>🎰</span>
                    )}
                </div>

                {/* Game name */}
                <div className="font-black text-white text-xl uppercase tracking-widest"
                    style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.2)' }}>
                    {game.name}
                </div>

                {/* Progress bar */}
                <div style={{ width: 220, height: 16, borderRadius: 9999, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, background: 'linear-gradient(180deg,#7fd0ff,#2b8fe8 60%,#1565b0)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5)', transition: 'width 0.15s ease', borderRadius: 9999 }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.9)', lineHeight: 1 }}>{Math.round(progress * 100)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
