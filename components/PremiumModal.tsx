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
        '💰 20% cashback on every spin (vs 10%)',
        '📈 Higher max bet unlocked earlier',
        '⭐ 2× XP from all spins',
        '🏆 VIP gold UI theme',
        '🎲 Access to High-Limit tables',
        '🔓 All premium features unlocked',
    ];

    const passBenefits = [
        '🎁 Premium mission reward track',
        '💎 Exclusive gem rewards',
        '🚀 Mission XP booster included',
        '📜 Monthly bonus coins on claim',
        '🌟 Prestige badge on profile',
        '♾️ Unlimited daily bonus claims',
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div
                className="relative flex flex-col gap-4 p-5 rounded-3xl shadow-2xl max-w-[400px] w-full mx-3 animate-pop-in"
                style={{ background: 'linear-gradient(160deg,#1a003a,#2d0060,#1a003a)', border: '1.5px solid rgba(255,255,255,0.15)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="font-black text-white text-xl uppercase tracking-widest">🏅 Premium</h2>
                    <button onClick={onClose} className="round-btn text-white text-lg"><i className="ti ti-x" /></button>
                </div>

                {/* VIP Lounge Card */}
                <div className="rounded-2xl overflow-hidden border border-yellow-500/40" style={{ background: 'linear-gradient(135deg,#3d2200,#7a4a00,#3d2200)' }}>
                    <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                        <span className="text-2xl">👑</span>
                        <div>
                            <div className="font-black text-yellow-300 text-base uppercase tracking-wider">VIP Lounge</div>
                            <div className="text-yellow-200/70 text-xs">Exclusive high-roller access</div>
                        </div>
                        {isVip && <span className="ml-auto text-xs font-black bg-yellow-500 text-black px-2 py-0.5 rounded-full">ACTIVE</span>}
                    </div>
                    <ul className="px-4 pb-2 space-y-1">
                        {vipBenefits.map((b, i) => (
                            <li key={i} className="text-yellow-100/90 text-xs">{b}</li>
                        ))}
                    </ul>
                    <div className="px-4 pb-3">
                        <button
                            onClick={onBuyVip}
                            disabled={isVip}
                            className="w-full py-2 rounded-xl font-black uppercase text-sm btn-3d"
                            style={{
                                background: isVip ? '#555' : 'linear-gradient(180deg,#f59e0b,#b45309)',
                                boxShadow: isVip ? 'none' : '0 3px 0 #78350f',
                                color: '#fff',
                                opacity: isVip ? 0.6 : 1,
                            }}
                        >
                            {isVip ? '✓ Already Active' : 'Activate FREE'}
                        </button>
                    </div>
                </div>

                {/* Monthly Pass Card */}
                <div className="rounded-2xl overflow-hidden border border-purple-400/40" style={{ background: 'linear-gradient(135deg,#1e003d,#4a0080,#1e003d)' }}>
                    <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                        <span className="text-2xl">📜</span>
                        <div>
                            <div className="font-black text-purple-300 text-base uppercase tracking-wider">Monthly Pass</div>
                            <div className="text-purple-200/70 text-xs">30-day premium mission rewards</div>
                        </div>
                        {isPremium && <span className="ml-auto text-xs font-black bg-purple-500 text-white px-2 py-0.5 rounded-full">ACTIVE</span>}
                    </div>
                    <ul className="px-4 pb-2 space-y-1">
                        {passBenefits.map((b, i) => (
                            <li key={i} className="text-purple-100/90 text-xs">{b}</li>
                        ))}
                    </ul>
                    <div className="px-4 pb-3">
                        <button
                            onClick={onBuyPremium}
                            disabled={isPremium}
                            className="w-full py-2 rounded-xl font-black uppercase text-sm btn-3d"
                            style={{
                                background: isPremium ? '#555' : 'linear-gradient(180deg,#a855f7,#6d28d9)',
                                boxShadow: isPremium ? 'none' : '0 3px 0 #4c1d95',
                                color: '#fff',
                                opacity: isPremium ? 0.6 : 1,
                            }}
                        >
                            {isPremium ? '✓ Already Active' : 'Activate FREE'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
