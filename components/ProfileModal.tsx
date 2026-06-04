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

const StatCard: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex flex-col items-center gap-1 rounded-xl px-3 py-2.5"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <span className="text-xl leading-none">{icon}</span>
        <span className="text-white font-black text-sm font-mono leading-none">{value}</span>
        <span className="text-white/50 text-[9px] uppercase tracking-wider leading-none text-center">{label}</span>
    </div>
);

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, player, isPremium, recentGames }) => {
    if (!isOpen) return null;

    const stats = player.stats || { maxSingleWin: 0, maxJackpotWin: 0, totalCoinsWon: 0, totalGemsEarned: 0, totalSpins: 0, recentSlots: [] };
    const xpPct = Math.min(100, Math.floor((player.xp / player.xpToNextLevel) * 100));

    const activeBenefits: { icon: string; label: string; desc: string }[] = [];
    if (player.isVip) activeBenefits.push({ icon: '👑', label: 'VIP Lounge', desc: '20% cashback · Gold UI · High-Limit access' });
    if (isPremium) activeBenefits.push({ icon: '📜', label: 'Monthly Pass', desc: 'Premium rewards · XP booster · Gem rewards' });

    return (
        <div
            className="fixed inset-0 z-[200] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(180deg,#0d0814 0%,#180830 100%)' }}
        >
            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-3 pb-2 border-b border-white/10">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#4c1d95)', border: '2px solid rgba(255,255,255,0.2)' }}>
                    {player.level}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-black text-white text-base uppercase tracking-wider leading-none">
                        Player Profile
                        {player.isVip && <span className="ml-2 text-yellow-400 text-xs">👑 VIP</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg,#7c3aed,#a855f7)' }} />
                        </div>
                        <span className="text-white/60 text-[9px] font-bold shrink-0">{xpPct}%</span>
                    </div>
                    <div className="text-white/40 text-[9px] mt-0.5">Level {player.level} · {formatCommaNumber(player.xp)} / {formatCommaNumber(player.xpToNextLevel)} XP</div>
                </div>
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-x" /></div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 flex flex-col gap-4">

                {/* Stats Grid */}
                <div>
                    <div className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">Statistics</div>
                    <div className="grid grid-cols-3 gap-2">
                        <StatCard icon="🪙" label="Balance" value={formatCommaNumber(player.balance)} />
                        <StatCard icon="💎" label="Gems" value={formatCommaNumber(player.diamonds)} />
                        <StatCard icon="🎰" label="Total Spins" value={formatCommaNumber(stats.totalSpins)} />
                        <StatCard icon="🏆" label="Max Win" value={formatCommaNumber(stats.maxSingleWin)} />
                        <StatCard icon="💰" label="Total Won" value={formatCommaNumber(stats.totalCoinsWon)} />
                        <StatCard icon="🎯" label="Max Jackpot" value={formatCommaNumber(stats.maxJackpotWin)} />
                    </div>
                </div>

                {/* Active Benefits */}
                {activeBenefits.length > 0 && (
                    <div>
                        <div className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">Active Benefits</div>
                        <div className="flex flex-col gap-2">
                            {activeBenefits.map((b, i) => (
                                <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <span className="text-2xl leading-none">{b.icon}</span>
                                    <div>
                                        <div className="text-white font-black text-xs uppercase tracking-wide leading-none">{b.label}</div>
                                        <div className="text-white/50 text-[9px] mt-0.5">{b.desc}</div>
                                    </div>
                                    <span className="ml-auto text-[9px] font-black bg-green-600 text-white px-2 py-0.5 rounded-full uppercase">Active</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Slots */}
                {recentGames.length > 0 && (
                    <div>
                        <div className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">Recent Slots</div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {recentGames.map((game, i) => (
                                <div key={i} className="shrink-0 w-20 flex flex-col items-center gap-1 rounded-xl overflow-hidden"
                                    style={{ background: game.color || 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                    <div className="w-full h-12 flex items-center justify-center text-3xl"
                                        style={{ background: 'rgba(0,0,0,0.3)' }}>🎰</div>
                                    <div className="text-white font-black text-[8px] uppercase tracking-wide text-center px-1 pb-1.5 leading-tight">{game.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
