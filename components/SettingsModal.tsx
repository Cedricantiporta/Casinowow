import React, { useState } from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isMuted: boolean;
    onToggleMute: () => void;
    fastSpin: boolean;
    onToggleFastSpin: () => void;
    onDevMode: () => void;
}

const Toggle: React.FC<{ on: boolean; onToggle: () => void; label: string; sub?: string; icon: string }> = ({ on, onToggle, label, sub, icon }) => (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{icon}</span>
            <div>
                <div className="text-white font-black text-sm">{label}</div>
                {sub && <div className="text-purple-300/60 text-[10px] mt-0.5">{sub}</div>}
            </div>
        </div>
        <button
            onClick={onToggle}
            className="relative shrink-0 transition-all active:scale-95"
            style={{
                width: 48, height: 26, borderRadius: 13,
                background: on ? 'linear-gradient(180deg,#a855f7,#7c3aed)' : '#374151',
                boxShadow: on ? '0 2px 8px rgba(168,85,247,0.5)' : 'none',
                border: '1px solid rgba(255,255,255,0.15)',
            }}
        >
            <div className="absolute top-[3px] transition-all duration-200"
                style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                    left: on ? 26 : 4,
                }} />
        </button>
    </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen, onClose, isMuted, onToggleMute, fastSpin, onToggleFastSpin, onDevMode
}) => {
    const [devUnlocked, setDevUnlocked] = useState(false);
    const [devCode, setDevCode] = useState('');
    const DEV_CODE = 'dev777';

    if (!isOpen) return null;

    const handleDevActivate = () => {
        onDevMode();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[150] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(160deg,#3b0764 0%,#1e0438 60%,#0d0220 100%)' }}>

            {/* Top shimmer */}
            <div className="shrink-0 h-0.5 w-full" style={{ background: 'linear-gradient(90deg,transparent,#a855f7,transparent)' }} />

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3"
                style={{ background: 'linear-gradient(180deg,#6b21a8,#4c1d95)', borderBottom: '1.5px solid rgba(168,85,247,0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-arrow-left"></i></div>
                <span className="text-white font-black text-lg uppercase tracking-widest drop-shadow">⚙️ Settings</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

                {/* ── Audio ── */}
                <div>
                    <div className="text-purple-300 text-[9px] font-black uppercase tracking-[0.2em] mb-2 px-1">Audio</div>
                    <Toggle on={!isMuted} onToggle={onToggleMute} icon="🔊" label="Sound Effects" sub="Background music and SFX" />
                </div>

                {/* ── Gameplay ── */}
                <div>
                    <div className="text-purple-300 text-[9px] font-black uppercase tracking-[0.2em] mb-2 px-1">Gameplay</div>
                    <div className="flex flex-col gap-2">
                        <Toggle on={fastSpin} onToggle={onToggleFastSpin} icon="⚡" label="Fast Spin" sub="Instant reel stop, faster pace" />
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl opacity-50"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="flex items-center gap-3">
                                <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🃏</span>
                                <div>
                                    <div className="text-white font-black text-sm">Show Paylines</div>
                                    <div className="text-purple-300/60 text-[10px] mt-0.5">Highlight active win lines</div>
                                </div>
                            </div>
                            <span className="text-purple-400/60 text-[9px] font-bold uppercase tracking-wide">Coming Soon</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl opacity-50"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="flex items-center gap-3">
                                <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>📊</span>
                                <div>
                                    <div className="text-white font-black text-sm">Win Statistics</div>
                                    <div className="text-purple-300/60 text-[10px] mt-0.5">Track your win/loss history</div>
                                </div>
                            </div>
                            <span className="text-purple-400/60 text-[9px] font-bold uppercase tracking-wide">Coming Soon</span>
                        </div>
                    </div>
                </div>

                {/* ── Account ── */}
                <div>
                    <div className="text-purple-300 text-[9px] font-black uppercase tracking-[0.2em] mb-2 px-1">Account</div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="flex items-center gap-3">
                                <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>📧</span>
                                <div>
                                    <div className="text-white font-black text-sm">Notifications</div>
                                    <div className="text-purple-300/60 text-[10px] mt-0.5">Bonus alerts and updates</div>
                                </div>
                            </div>
                            <span className="text-purple-400/60 text-[9px] font-bold uppercase tracking-wide">Coming Soon</span>
                        </div>
                    </div>
                </div>

                {/* ── Developer ── */}
                <div>
                    <div className="text-purple-300/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2 px-1">Developer</div>
                    <div className="rounded-xl overflow-hidden"
                        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {!devUnlocked ? (
                            <div className="px-4 py-3 flex items-center gap-3">
                                <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🔒</span>
                                <div className="flex-1">
                                    <div className="text-white/40 font-black text-sm">Dev Mode</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            type="password"
                                            value={devCode}
                                            onChange={e => setDevCode(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && devCode === DEV_CODE) setDevUnlocked(true); }}
                                            placeholder="Enter code..."
                                            className="flex-1 bg-black/60 text-white text-xs px-2 py-1 rounded-lg border border-white/10 outline-none font-mono placeholder:text-white/20"
                                        />
                                        <button
                                            onClick={() => { if (devCode === DEV_CODE) setDevUnlocked(true); }}
                                            className="px-2 py-1 rounded-lg text-xs font-black text-white"
                                            style={{ background: 'linear-gradient(180deg,#7c3aed,#4c1d95)' }}>
                                            Unlock
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="px-4 py-3 flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🛠️</span>
                                    <div className="text-white font-black text-sm">Developer Mode</div>
                                    <div className="ml-auto text-green-400 text-[9px] font-black uppercase tracking-wide">Unlocked</div>
                                </div>
                                <div className="text-purple-200/60 text-[10px] leading-snug">
                                    Instantly sets Level 50, 9 Trillion Coins, 100,000 Gems
                                </div>
                                <button
                                    onClick={handleDevActivate}
                                    className="w-full py-2.5 rounded-xl font-black text-sm uppercase tracking-widest"
                                    style={{
                                        background: 'linear-gradient(180deg,#dc2626,#7f1d1d)',
                                        boxShadow: '0 4px 0 #450a0a, 0 6px 16px rgba(0,0,0,0.5)',
                                        border: '1px solid rgba(255,100,100,0.3)',
                                        color: 'white',
                                    }}>
                                    ⚡ Activate Dev Mode
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Version */}
                <div className="text-center text-purple-300/20 text-[9px] font-bold mt-2">v1.0.0 · Demo Build</div>
            </div>

            {/* Bottom shimmer */}
            <div className="shrink-0 h-0.5 w-full" style={{ background: 'linear-gradient(90deg,transparent,#a855f7,transparent)' }} />
        </div>
    );
};
