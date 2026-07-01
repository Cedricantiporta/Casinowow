import React, { useState, useEffect } from 'react';

interface Props {
    onOpenBattlePass: () => void;
    onOpenVipLounge: () => void;
}

const PAGES = [
    { img: '/lobby_mission.png', alt: 'Mission Pass' },
    { img: '/lobby_vip.png', alt: 'VIP Lounge' },
];

const AUTO_SWITCH_MS = 4000;

// Mission Pass and VIP Lounge share one lobby card slot, swapped with page dots
// (and auto-rotating on a timer) instead of taking up two separate card slots.
export const PassVipLobbyCard: React.FC<Props> = ({ onOpenBattlePass, onOpenVipLounge }) => {
    const [page, setPage] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setPage(p => (p + 1) % PAGES.length), AUTO_SWITCH_MS);
        return () => clearInterval(t);
        // Restart the auto-rotate timer fresh whenever the page changes (including
        // manual dot taps), so a manual pick doesn't get flipped away too soon.
    }, [page]);

    return (
        <div
            className="row-span-2 relative overflow-hidden snap-center shrink-0"
            style={{ width: 116, alignSelf: 'stretch', borderRadius: 16, boxShadow: '0 6px 18px rgba(0,0,0,0.6)' }}>
            <button
                onClick={page === 0 ? onOpenBattlePass : onOpenVipLounge}
                className="absolute inset-0 w-full h-full active:scale-95 transition-transform">
                <img src={PAGES[page].img} alt={PAGES[page].alt} className="absolute inset-0 w-full h-full" style={{ objectFit: 'cover', borderRadius: 16 }} />
            </button>
            <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5 z-10 pointer-events-none">
                {PAGES.map((_, i) => (
                    <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setPage(i); }}
                        className="pointer-events-auto rounded-full transition-all"
                        style={{
                            width: i === page ? 14 : 6, height: 6,
                            background: i === page ? '#fff' : 'rgba(255,255,255,0.5)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
                        }}
                    />
                ))}
            </div>
        </div>
    );
};
