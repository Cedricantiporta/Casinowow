import React from 'react';

interface VipLoungeModalProps {
    isOpen: boolean;
    onClose: () => void;
    isVip: boolean;
    isHighLimit: boolean;
    onJoinVip: () => void;
    onToggleHighLimit: () => void;
}

const BENEFITS = [
    { icon: '🏷️', title: '20% Off Store',        desc: 'All gem & coin packages discounted' },
    { icon: '🐷', title: '+10% Piggy Bank',       desc: 'Every bet fills the piggy 10% more' },
    { icon: '🎰', title: 'High Limit Room',        desc: 'Exclusive access to VIP-level bets' },
    { icon: '⛏️', title: '+Quest Credits',         desc: 'Bonus credits each quest session' },
    { icon: '💰', title: '+Coin Bonus',            desc: 'Daily coin deposit to your balance' },
    { icon: '💎', title: '+Weekly Gems',           desc: 'Gem pack delivered every week' },
    { icon: '⭐', title: '+20% XP',               desc: 'Level up 20% faster on all spins' },
];

export const VipLoungeModal: React.FC<VipLoungeModalProps> = ({
    isOpen, onClose, isVip, isHighLimit, onJoinVip, onToggleHighLimit
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(160deg,#1a0a00 0%,#2d1000 40%,#0a0000 100%)' }}>

            {/* Gold shimmer top */}
            <div className="shrink-0 h-0.5 w-full" style={{ background: 'linear-gradient(90deg,transparent,#f0c000,#fff8a0,#f0c000,transparent)' }} />

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3"
                style={{ background: 'linear-gradient(180deg,#92400e,#78350f)', borderBottom: '1.5px solid rgba(251,191,36,0.4)', boxShadow: '0 4px 12px rgba(0,0,0,0.6)' }}>
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-arrow-left"></i></div>
                <span className="text-white font-black text-lg uppercase tracking-widest drop-shadow flex-1"
                    style={{ background: 'linear-gradient(180deg,#fff8c0,#ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    👑 VIP Lounge
                </span>
                {isVip && (
                    <div className="shrink-0 px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-widest"
                        style={{ background: 'linear-gradient(180deg,#fbbf24,#d97706)', color: '#1c0a00', border: '1px solid rgba(255,255,255,0.3)' }}>
                        ACTIVE
                    </div>
                )}
            </div>

            {/* Hero */}
            <div className="shrink-0 flex flex-col items-center py-3 relative">
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse 70% 100% at 50% 50%,rgba(251,191,36,0.1),transparent)' }} />
                <div style={{ fontSize: '56px', lineHeight: 1, filter: 'drop-shadow(0 0 16px rgba(251,191,36,0.7))' }}>👑</div>
                {!isVip ? (
                    <p className="mt-1 text-yellow-200/60 text-[10px] font-bold uppercase tracking-[0.2em]">
                        Join to unlock all perks
                    </p>
                ) : (
                    <p className="mt-1 text-yellow-300 text-[10px] font-black uppercase tracking-[0.2em]">
                        All perks active
                    </p>
                )}
            </div>

            {/* Benefits list */}
            <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2 pb-2">
                {BENEFITS.map(b => (
                    <div key={b.title}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 relative overflow-hidden"
                        style={{
                            background: isVip ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${isVip ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.08)'}`,
                        }}>
                        {isVip && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.5"
                                style={{ background: 'linear-gradient(180deg,#fbbf24,#d97706)' }} />
                        )}
                        <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>{b.icon}</span>
                        <div className="flex-1 min-w-0">
                            <div className={`font-black text-xs uppercase tracking-wide leading-none ${isVip ? 'text-yellow-200' : 'text-white/70'}`}>{b.title}</div>
                            <div className="text-yellow-200/40 text-[9px] mt-0.5 leading-snug">{b.desc}</div>
                        </div>
                        {isVip && <span className="text-green-400 text-sm font-black shrink-0">✓</span>}
                    </div>
                ))}

                {/* High Limit Room toggle (VIP only) */}
                {isVip && (
                    <button
                        onClick={onToggleHighLimit}
                        className="w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest mt-1 relative overflow-hidden transition-all active:scale-[0.98]"
                        style={isHighLimit ? {
                            background: 'linear-gradient(180deg,#ef4444,#b91c1c)',
                            boxShadow: '0 4px 0 #7f1d1d, 0 6px 16px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255,150,150,0.3)',
                            color: 'white',
                        } : {
                            background: 'linear-gradient(180deg,#fbbf24,#d97706)',
                            boxShadow: '0 4px 0 #92400e, 0 6px 16px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            color: '#1c0a00',
                        }}>
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                        <span className="relative z-10">
                            {isHighLimit ? '🚪 Exit High Limit Room' : '🎰 Enter High Limit Room'}
                        </span>
                    </button>
                )}
            </div>

            {/* Footer CTA */}
            <div className="shrink-0 px-4 pb-4 pt-2">
                {!isVip ? (
                    <>
                        <div className="flex items-center justify-between rounded-xl px-4 py-2 mb-2"
                            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
                            <div>
                                <div className="text-yellow-100 font-black text-base leading-none">₱ 0.00</div>
                                <div className="text-yellow-200/50 text-[9px] uppercase tracking-wide mt-0.5">Free with demo account</div>
                            </div>
                            <div className="text-yellow-400 font-black text-xs bg-yellow-900/40 px-2 py-0.5 rounded-full uppercase tracking-wide">Demo</div>
                        </div>
                        <button onClick={onJoinVip}
                            className="btn-3d w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest text-black relative overflow-hidden"
                            style={{ background: 'linear-gradient(180deg,#fff8a0,#f0c000 40%,#c08000)', boxShadow: '0 4px 0 #7a5000,0 6px 16px rgba(0,0,0,0.5)' }}>
                            <span className="relative z-10">👑 Join VIP Lounge</span>
                            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                        </button>
                    </>
                ) : (
                    <div className="text-center text-yellow-300/40 text-[9px] font-bold uppercase tracking-widest">VIP Membership Active · All Perks Enabled</div>
                )}
            </div>

            {/* Gold shimmer bottom */}
            <div className="shrink-0 h-0.5 w-full" style={{ background: 'linear-gradient(90deg,transparent,#f0c000,#fff8a0,#f0c000,transparent)' }} />
        </div>
    );
};
