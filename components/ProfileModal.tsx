import React from 'react';
import { GameConfig } from '../types';
import { formatCommaNumber } from '../constants';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: {
        level: number;
        xp: number;
        xpToNextLevel: number;
        balance: number;
        diamonds: number;
        isVip?: boolean;
        stats?: {
            maxSingleWin: number;
            maxJackpotWin: number;
            totalCoinsWon: number;
            totalGemsEarned: number;
            totalSpins: number;
            recentSlots: string[];
        };
    };
    isPremium: boolean;
    recentGames: GameConfig[];
}

const StatRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-center gap-2 py-1">
        <span className="text-sm leading-none w-5 text-center">{icon}</span>
        <span className="text-white/50 text-[9px] uppercase tracking-wide flex-1">{label}</span>
        <span className="text-white font-black text-[10px] font-mono">{value}</span>
    </div>
);

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, player, isPremium, recentGames }) => {
    if (!isOpen) return null;

    const stats = player.stats || { maxSingleWin: 0, maxJackpotWin: 0, totalCoinsWon: 0, totalGemsEarned: 0, totalSpins: 0, recentSlots: [] };
    const xpPct = Math.min(100, Math.floor((player.xp / player.xpToNextLevel) * 100));

    const activeBenefits: { icon: string; label: string }[] = [];
    if (player.isVip) activeBenefits.push({ icon: '👑', label: 'VIP' });
    if (isPremium) activeBenefits.push({ icon: '📜', label: 'Pass' });

    return (
        <div
            className="fixed inset-0 z-[200] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(160deg,#3b0764 0%,#1e0438 60%,#0d0220 100%)' }}
        >
            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-2.5 pb-2"
                style={{ background: 'linear-gradient(180deg,#6b21a8,#4c1d95)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)', border: '2px solid rgba(255,255,255,0.2)' }}>
                    {player.level}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-black text-white text-sm uppercase tracking-wider leading-none">Player Profile</span>
                        {activeBenefits.map(b => (
                            <span key={b.label} className="text-[8px] font-black px-1.5 py-0.5 rounded-full"
                                style={{ background: 'rgba(168,85,247,0.3)', color: '#e9d5ff' }}>
                                {b.icon} {b.label}
                            </span>
                        ))}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <div className="h-full rounded-full" style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg,#a855f7,#d946ef)' }} />
                        </div>
                        <span className="text-white/40 text-[8px] font-bold shrink-0">{xpPct}%</span>
                    </div>
                    <div className="text-white/30 text-[8px] mt-0.5">Lv.{player.level} · {formatCommaNumber(player.xp)} / {formatCommaNumber(player.xpToNextLevel)} XP</div>
                </div>
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-x" /></div>
            </div>

            {/* Two-column body */}
            <div className="flex-1 flex min-h-0 gap-0">

                {/* LEFT — Stats */}
                <div className="flex-1 px-3 py-2.5 flex flex-col gap-0 overflow-y-auto no-scrollbar">
                    <div className="text-purple-300/40 text-[8px] font-black uppercase tracking-widest mb-1">Stats</div>
                    <StatRow icon="🪙" label="Balance" value={formatCommaNumber(player.balance)} />
                    <StatRow icon="💎" label="Gems" value={formatCommaNumber(player.diamonds)} />
                    <StatRow icon="🎰" label="Total Spins" value={formatCommaNumber(stats.totalSpins)} />
                    <StatRow icon="🏆" label="Max Win" value={formatCommaNumber(stats.maxSingleWin)} />
                    <StatRow icon="💰" label="Total Won" value={formatCommaNumber(stats.totalCoinsWon)} />
                    <StatRow icon="🎯" label="Max Jackpot" value={formatCommaNumber(stats.maxJackpotWin)} />
                </div>

                {/* RIGHT — Recent Slots */}
                <div className="flex-1 px-3 py-2.5 flex flex-col overflow-hidden">
                    <div className="text-purple-300/40 text-[8px] font-black uppercase tracking-widest mb-1">Recent Slots</div>
                    {recentGames.length > 0 ? (
                        <div className="flex-1 grid grid-cols-2 gap-1.5 content-start overflow-y-auto no-scrollbar">
                            {recentGames.map((game, i) => (
                                <div key={i} className="rounded-xl overflow-hidden flex flex-col"
                                    style={{ background: game.color || 'rgba(255,255,255,0.07)' }}>
                                    <div className="h-10 flex items-center justify-center text-2xl"
                                        style={{ background: 'rgba(0,0,0,0.35)' }}>🎰</div>
                                    <div className="text-white font-black text-[7px] uppercase tracking-wide text-center px-1 py-1 leading-tight">{game.name}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <span className="text-white/20 text-[9px]">No slots played yet</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
