import React, { useState } from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isMuted: boolean;
    onToggleMute: () => void;
    onRedeem: (code: string) => void;
    redeemedCodes: string[];
}

const REDEEM_CODES: Record<string, { title: string; description: string; icon: string; rewards: { icon: string; label: string }[] }> = {
    dev777: {
        title: 'Level Rush',
        description: 'Jumpstart your game with coins, gems and a level boost.',
        icon: '⚡',
        rewards: [
            { icon: '/symbols/coin.png', label: '+100,000,000,000 Coins' },
            { icon: '/symbols/diamond.png', label: '+10,000 Gems' },
            { icon: '/ui/star.png', label: 'Level 40' },
        ],
    },
    dev999: {
        title: 'COIN FLOOD',
        description: 'A massive coin injection added to your current balance.',
        icon: '/symbols/coin.png',
        rewards: [
            { icon: '/symbols/coin.png', label: '+100,000,000,000,000 Coins' },
        ],
    },
    dev1: {
        title: 'FULL PREMIUM',
        description: 'All premium features, boosts, and gems unlocked.',
        icon: '👑',
        rewards: [
            { icon: '/symbols/diamond.png', label: '+50,000 Gems' },
            { icon: '👑', label: 'VIP Status' },
            { icon: '🎫', label: 'Monthly Pass (Premium)' },
            { icon: '🚀', label: 'XP Boost ×3 — 24 Hours' },
        ],
    },
    dev111: {
        title: 'COIN NUKE',
        description: '10 Billion coins and 2,000 gems dropped straight to your wallet.',
        icon: '💥',
        rewards: [
            { icon: '/symbols/coin.png', label: '+10,000,000,000 Coins' },
            { icon: '/symbols/diamond.png', label: '+2,000 Gems' },
        ],
    },
    dev222: {
        title: 'GOD MODE',
        description: 'All premium features, VIP, and max boosts unlocked.',
        icon: '👑',
        rewards: [
            { icon: '👑', label: 'VIP + Monthly Pass' },
            { icon: '🚀', label: 'XP Boost ×5 — 7 Days' },
        ],
    },
    reset: {
        title: 'Reset Progress',
        description: 'Wipes ALL progress — coins, level, gems, missions, everything. This cannot be undone. The app will reload.',
        icon: '⚠️',
        rewards: [
            { icon: '🗑️', label: 'Erase all saved data' },
            { icon: '🔄', label: 'Start over from scratch' },
        ],
    },
};

const Toggle: React.FC<{ on: boolean; onToggle: () => void; label: string; sub?: string; icon: string }> = ({ on, onToggle, label, sub, icon }) => (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2.5">
            <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{icon}</span>
            <div>
                <div className="text-white font-black text-xs">{label}</div>
                {sub && <div className="text-purple-300/50 text-[9px] mt-0.5">{sub}</div>}
            </div>
        </div>
        <button
            onClick={onToggle}
            className="relative shrink-0 transition-all active:scale-95"
            style={{
                width: 42, height: 23, borderRadius: 12,
                background: on ? 'linear-gradient(180deg,#a855f7,#7c3aed)' : '#374151',
                boxShadow: on ? '0 2px 8px rgba(168,85,247,0.5)' : 'none',
                border: '1px solid rgba(255,255,255,0.12)',
            }}
        >
            <div className="absolute top-[2.5px] transition-all duration-200"
                style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                    left: on ? 22 : 3,
                }} />
        </button>
    </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen, onClose, isMuted, onToggleMute, onRedeem, redeemedCodes
}) => {
    const [redeemInput, setRedeemInput] = useState('');
    const [pendingCode, setPendingCode] = useState<string | null>(null);
    const [errorShake, setErrorShake] = useState(false);

    if (!isOpen) return null;

    const handleRedeem = () => {
        const code = redeemInput.trim().toLowerCase();
        if (REDEEM_CODES[code]) {
            if (redeemedCodes.includes(code)) {
                setErrorShake(true);
                setTimeout(() => setErrorShake(false), 500);
                return;
            }
            setPendingCode(code);
            setRedeemInput('');
        } else {
            setErrorShake(true);
            setTimeout(() => setErrorShake(false), 500);
        }
    };

    const handleClaim = () => {
        if (pendingCode) {
            onRedeem(pendingCode);
            setPendingCode(null);
        }
    };

    const codeInfo = pendingCode ? REDEEM_CODES[pendingCode] : null;

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-pop-in select-none">
        <div className="w-full max-w-[600px] flex flex-col rounded-3xl overflow-hidden"
            style={{ height: 'min(88%, 680px)', background: 'linear-gradient(180deg,#9030d8 0%,#6018a8 18%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 relative">
                <span className="absolute left-0 right-0 text-center text-white font-black text-base drop-shadow pointer-events-none">Settings</span>
                <div className="flex items-center gap-2 ml-auto z-10">
                    <span className="text-purple-300/30 text-[9px] font-bold tracking-widest">v1.0.0</span>
                    <button className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-x"></i></button>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="flex-1 overflow-hidden flex gap-0">

                {/* LEFT — Toggles */}
                <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">

                    <div>
                        <div className="text-purple-400/60 text-[8px] font-black mb-1.5 px-0.5">Audio</div>
                        <Toggle on={!isMuted} onToggle={onToggleMute} icon="🔊" label="Sound Effects" sub="Music and SFX" />
                    </div>

                </div>

                {/* RIGHT — Redeem */}
                <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
                    <div>
                        <div className="text-purple-400/60 text-[8px] font-black mb-1.5 px-0.5">Redeem Code</div>
                        <div className="rounded-xl p-3 flex flex-col gap-2"
                            style={{ background: 'linear-gradient(180deg,rgba(160,60,255,0.3) 0%,rgba(160,60,255,0.3) 10%,rgba(10,0,50,0.75) 100%)', boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)' }}>
                            <p className="text-purple-200/50 text-[9px] leading-snug">Enter a code to claim special rewards.</p>
                            <div className={`flex gap-2 ${errorShake ? 'animate-[shake_0.4s_ease]' : ''}`}>
                                <input
                                    type="text"
                                    value={redeemInput}
                                    onChange={e => setRedeemInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleRedeem(); }}
                                    placeholder="Enter code..."
                                    className="flex-1 bg-black/50 text-white text-xs px-3 py-2 rounded-lg border border-white/10 outline-none font-mono placeholder:text-white/25 focus:border-purple-500/60"
                                />
                                <button onClick={handleRedeem} className="pill-green">
                                    <div className="pill-face" style={{ padding: '6px 14px', fontSize: '10px' }}>Redeem</div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* About */}
                    <div>
                        <div className="text-purple-400/60 text-[8px] font-black mb-1.5 px-0.5">About</div>
                        <div className="rounded-xl p-3 flex flex-col gap-1.5"
                            style={{ background: 'linear-gradient(180deg,rgba(160,60,255,0.3) 0%,rgba(160,60,255,0.3) 10%,rgba(10,0,50,0.75) 100%)', boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)' }}>
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🎰</span>
                                <div>
                                    <div className="text-white font-black text-xs">CasinoWow</div>
                                    <div className="text-purple-300/40 text-[9px]">For entertainment only · No real money</div>
                                </div>
                            </div>
                            <div className="text-purple-300/30 text-[8px] leading-relaxed">
                                All coins and gems are virtual and have no real-world value. This game does not offer real-money gambling.
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Reward Preview Popup */}
            {codeInfo && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-pop-in">
                    <div className="relative w-64 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.4)]"
                        style={{ background: 'linear-gradient(160deg,#4c1d95,#1e0438)' }}>

                        {/* Shimmer top */}

                        <div className="px-5 py-5 flex flex-col items-center gap-3">
                            <div className="text-center">
                                <div className="text-white font-black text-base uppercase tracking-widest">{codeInfo.title}</div>
                                <div className="text-purple-300/70 text-[10px] mt-0.5 leading-snug">{codeInfo.description}</div>
                            </div>

                            {/* Rewards list */}
                            <div className="w-full flex flex-col gap-1.5 mt-1">
                                {codeInfo.rewards.slice(0, 3).map((r, i) => (
                                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                                        style={{ background: 'rgba(255,255,255,0.07)' }}>
                                        {r.icon.startsWith('/') ? (
                                            <img src={r.icon} alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block', fontSize: '1rem' }} />
                                        ) : (
                                            <span className="text-base">{r.icon}</span>
                                        )}
                                        <span className="text-white font-black text-xs">{r.label}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 w-full mt-1">
                                <button
                                    onClick={() => setPendingCode(null)}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide text-white/60 transition-all active:scale-95"
                                    style={{ background: 'rgba(255,255,255,0.08)' }}>
                                    Cancel
                                </button>
                                <button onClick={handleClaim} className="pill-green flex-[2]">
                                    <div className="pill-face" style={{ padding: '10px 12px' }}>Claim Reward</div>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
        </div>
    );
};
