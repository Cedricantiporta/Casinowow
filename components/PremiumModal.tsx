import React from 'react';

interface PremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    isVip: boolean;
    isPremium: boolean;
    onBuyVip: () => void;
    onBuyPremium: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, isVip, isPremium, onBuyVip, onBuyPremium }) => {
    if (!isOpen) return null;

    const vipBenefits = [
        { icon: '💰', text: '20% cashback on every spin (vs 10%)' },
        { icon: '📈', text: 'Higher max bet unlocked earlier' },
        { icon: '⭐', text: '2× XP from all spins' },
        { icon: '🏆', text: 'VIP gold UI theme' },
        { icon: '🎲', text: 'Access to High-Limit tables' },
        { icon: '🔓', text: 'All premium features unlocked' },
    ];

    const passBenefits = [
        { icon: '🎁', text: 'Premium mission reward track' },
        { icon: '💎', text: 'Exclusive gem rewards' },
        { icon: '🚀', text: 'Mission XP booster included' },
        { icon: '📜', text: 'Monthly bonus coins on claim' },
        { icon: '🌟', text: 'Prestige badge on profile' },
        { icon: '♾️', text: 'Unlimited daily bonus claims' },
    ];

    return (
        <div
            className="fixed inset-0 z-[200] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(180deg,#0d0814 0%,#1a0535 100%)' }}
        >
            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-3 pb-2">
                <span className="text-2xl">🏷️</span>
                <h2 className="font-black text-white text-lg uppercase tracking-widest flex-1">SALE</h2>
                <div className="round-btn cursor-pointer" onClick={onClose}><i className="ti ti-x" /></div>
            </div>

            {/* Side-by-side cards — fill remaining height */}
            <div className="flex-1 flex gap-4 px-4 py-4 min-h-0">

                {/* VIP Lounge Card */}
                <div
                    className="flex-1 flex flex-col rounded-2xl overflow-hidden"
                    style={{ background: 'linear-gradient(160deg,#2a1500,#5c3000,#2a1500)' }}
                >
                    {/* Card Header */}
                    <div className="shrink-0 flex items-center gap-3 px-4 py-3"
                        style={{ background: 'linear-gradient(180deg,rgba(251,191,36,0.15),transparent)' }}>
                        <span className="text-3xl leading-none">👑</span>
                        <div className="flex-1 min-w-0">
                            <div className="font-black text-yellow-300 text-base uppercase tracking-wider leading-none">VIP Lounge</div>
                            <div className="text-yellow-200/60 text-xs mt-0.5">Exclusive high-roller access</div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-yellow-200/40 text-xs line-through">₱ 999</span>
                                <span className="text-green-400 font-black text-sm uppercase">FREE</span>
                            </div>
                        </div>
                        {isVip && (
                            <span className="shrink-0 text-[10px] font-black bg-yellow-500 text-black px-2 py-0.5 rounded-full uppercase">ACTIVE</span>
                        )}
                    </div>

                    {/* Benefits */}
                    <div className="flex-1 px-4 py-3 flex flex-col gap-2 overflow-y-auto no-scrollbar">
                        {vipBenefits.map((b, i) => (
                            <div key={i} className="flex items-center gap-2 rounded-xl px-2.5 py-2"
                                style={{ background: 'rgba(251,191,36,0.07)' }}>
                                <span className="text-base leading-none shrink-0">{b.icon}</span>
                                <span className="text-yellow-100/90 text-xs leading-snug">{b.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="shrink-0 px-4 pb-4 pt-2">
                        <button
                            onClick={onBuyVip}
                            disabled={isVip}
                            className="w-full py-3 rounded-xl font-black uppercase text-sm btn-3d tracking-widest"
                            style={{
                                background: isVip ? 'rgba(0,0,0,0.4)' : 'linear-gradient(180deg,#fbbf24,#b45309)',
                                boxShadow: isVip ? 'none' : '0 4px 0 #78350f',
                                color: isVip ? 'rgba(255,255,255,0.4)' : '#fff',
                                cursor: isVip ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isVip ? '✓ Already Active' : '👑 Activate FREE'}
                        </button>
                    </div>
                </div>

                {/* Monthly Pass Card */}
                <div
                    className="flex-1 flex flex-col rounded-2xl overflow-hidden"
                    style={{ background: 'linear-gradient(160deg,#0e0030,#2d0060,#0e0030)' }}
                >
                    {/* Card Header */}
                    <div className="shrink-0 flex items-center gap-3 px-4 py-3"
                        style={{ background: 'linear-gradient(180deg,rgba(168,85,247,0.15),transparent)' }}>
                        <span className="text-3xl leading-none">📜</span>
                        <div className="flex-1 min-w-0">
                            <div className="font-black text-purple-300 text-base uppercase tracking-wider leading-none">Monthly Pass</div>
                            <div className="text-purple-200/60 text-xs mt-0.5">30-day premium mission rewards</div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-yellow-200/40 text-xs line-through">₱ 499</span>
                                <span className="text-green-400 font-black text-sm uppercase">FREE</span>
                            </div>
                        </div>
                        {isPremium && (
                            <span className="shrink-0 text-[10px] font-black bg-purple-500 text-white px-2 py-0.5 rounded-full uppercase">ACTIVE</span>
                        )}
                    </div>

                    {/* Benefits */}
                    <div className="flex-1 px-4 py-3 flex flex-col gap-2 overflow-y-auto no-scrollbar">
                        {passBenefits.map((b, i) => (
                            <div key={i} className="flex items-center gap-2 rounded-xl px-2.5 py-2"
                                style={{ background: 'rgba(168,85,247,0.07)' }}>
                                <span className="text-base leading-none shrink-0">{b.icon}</span>
                                <span className="text-purple-100/90 text-xs leading-snug">{b.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="shrink-0 px-4 pb-4 pt-2">
                        <button
                            onClick={onBuyPremium}
                            disabled={isPremium}
                            className="w-full py-3 rounded-xl font-black uppercase text-sm btn-3d tracking-widest"
                            style={{
                                background: isPremium ? 'rgba(0,0,0,0.4)' : 'linear-gradient(180deg,#a855f7,#6d28d9)',
                                boxShadow: isPremium ? 'none' : '0 4px 0 #4c1d95',
                                color: isPremium ? 'rgba(255,255,255,0.4)' : '#fff',
                                cursor: isPremium ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isPremium ? '✓ Already Active' : '📜 Activate FREE'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
