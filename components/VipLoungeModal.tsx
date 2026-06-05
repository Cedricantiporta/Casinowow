import React from 'react';

interface VipLoungeModalProps {
    isOpen: boolean;
    onClose: () => void;
    isVip: boolean;
    onJoinVip: () => void;
}

const BENEFITS: { icon: string; title: string; desc: string }[] = [
    { icon: '🏷️', title: '20% Off Store',    desc: 'All packages discounted' },
    { icon: '🐷', title: '+10% Piggy Bank',   desc: 'Extra savings on every bet' },
    { icon: '🎰', title: 'High Limit Room',   desc: '4 exclusive VIP-level slots' },
    { icon: '⛏️', title: '+Quest Credits',    desc: 'Bonus credits per session' },
    { icon: '💰', title: '+Coin Bonus',        desc: 'Daily coin deposit' },
    { icon: '💎', title: '+Weekly Gems',       desc: 'Gem pack every week' },
    { icon: '⭐', title: '+20% XP',           desc: 'Level up faster on all spins' },
];

export const VipLoungeModal: React.FC<VipLoungeModalProps> = ({
    isOpen, onClose, isVip, onJoinVip
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex flex-col animate-pop-in select-none overflow-hidden"
            style={{ background: 'linear-gradient(160deg,#1c0900 0%,#2a1200 50%,#0f0600 100%)' }}>

            {/* Hero section */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 relative">
                {/* Back button */}
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-arrow-left"></i></div>

                {/* Crown + title */}
                <div className="flex items-center gap-2">
                    <span style={{ fontSize: '2rem', lineHeight: 1, filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.8))' }}>👑</span>
                    <span className="font-black text-xl uppercase tracking-widest"
                        style={{ background: 'linear-gradient(180deg,#fff8c0,#ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        VIP Lounge
                    </span>
                </div>

                {/* Status badge */}
                {isVip ? (
                    <div className="px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest"
                        style={{ background: 'linear-gradient(180deg,#fbbf24,#d97706)', color: '#1c0a00', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 2px 8px rgba(251,191,36,0.4)' }}>
                        ✓ ACTIVE
                    </div>
                ) : (
                    <div className="px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#9ca3af' }}>
                        LOCKED
                    </div>
                )}
            </div>

            {/* Benefits — 2-column grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-1">
                <div className="grid grid-cols-2 gap-2 h-full content-start">
                    {BENEFITS.map(b => (
                        <div key={b.title}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 relative overflow-hidden"
                            style={{
                                background: isVip ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${isVip ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.1)'}`,
                            }}>
                            {isVip && (
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
                                    style={{ background: 'linear-gradient(180deg,#fbbf24,#d97706)' }} />
                            )}
                            <span style={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0 }}>{b.icon}</span>
                            <div className="min-w-0">
                                <div className="font-black text-[11px] leading-none" style={{ color: isVip ? '#fde68a' : '#d1d5db' }}>{b.title}</div>
                                <div className="text-[9px] mt-0.5 leading-tight" style={{ color: isVip ? 'rgba(253,230,138,0.55)' : 'rgba(209,213,219,0.45)' }}>{b.desc}</div>
                            </div>
                            {isVip && <span className="ml-auto text-green-400 font-black text-sm shrink-0">✓</span>}
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA area — centered, constrained width */}
            <div className="shrink-0 flex flex-col items-center gap-2 px-4 py-3">
                {!isVip ? (
                    <>
                        <div className="flex items-center justify-between w-full max-w-sm rounded-xl px-4 py-2"
                            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
                            <div>
                                <div className="text-yellow-100 font-black text-base leading-none">₱ 0.00</div>
                                <div className="text-yellow-200/50 text-[9px] uppercase tracking-wide mt-0.5">Free with demo account</div>
                            </div>
                            <div className="text-yellow-400 font-black text-[9px] bg-yellow-900/40 px-2 py-0.5 rounded-full uppercase tracking-wide">Demo</div>
                        </div>
                        <button onClick={onJoinVip}
                            className="btn-3d font-black text-sm uppercase tracking-widest text-black relative overflow-hidden px-10 py-3 rounded-xl"
                            style={{ background: 'linear-gradient(180deg,#fff8a0,#f0c000 40%,#c08000)', boxShadow: '0 4px 0 #7a5000,0 6px 16px rgba(0,0,0,0.5)' }}>
                            <span className="relative z-10">👑 Join VIP Lounge</span>
                            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                        </button>
                    </>
                ) : (
                    <div className="text-yellow-200/60 text-[10px] text-center font-bold uppercase tracking-widest py-2">
                        ✓ VIP Active — Tap VIP Lounge in lobby to enter
                    </div>
                )}
            </div>

        </div>
    );
};
