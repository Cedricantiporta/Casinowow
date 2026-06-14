import React, { useState } from 'react';
import { GameConfig } from '../types';
import { formatK } from '../constants';

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
        xpMultiplier?: number;
        xpBoostEndTime?: number;
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
    passBoostMultiplier?: number;
    passBoostEndTime?: number;
    recentGames: GameConfig[];
    profileEmoji?: string;
    onSetProfileEmoji?: (emoji: string) => void;
    onNavigateToGame?: (game: GameConfig) => void;
    albumsCompleted?: number;
    albumsTotal?: number;
}

const PROFILE_EMOJIS = ['🎭', '🦁', '🐲', '🦅', '🐺', '👾', '🤖'];

const THEME_ICONS: Record<string, string> = {
    PIGGY: '🐷', NEON: '🎰', EGYPT: '🦂', DRAGON: '🐉', PIRATE: '🏴‍☠️',
    SPACE: '👽', CANDY: '🧁', JUNGLE: '🦍', UNDERWATER: '🦈', WESTERN: '🤠',
    SAMURAI: '⚔️',
};

const StatRow: React.FC<{ icon: string; label: string; value: string; vip?: boolean }> = ({ icon, label, value, vip }) => (
    <div className="flex items-center gap-2.5 py-1.5">
        <span className="text-xl leading-none w-7 text-center">{icon}</span>
        <span className={`text-xs uppercase tracking-wide flex-1 font-bold ${vip ? 'text-yellow-300/60' : 'text-white/50'}`}>{label}</span>
        <span className={`font-black text-sm font-mono ${vip ? 'text-yellow-200' : 'text-white'}`}>{value}</span>
    </div>
);

export const ProfileModal: React.FC<ProfileModalProps> = ({
    isOpen, onClose, player, isPremium, passBoostMultiplier = 1, passBoostEndTime = 0,
    recentGames, profileEmoji = '', onSetProfileEmoji, onNavigateToGame,
    albumsCompleted = 0, albumsTotal = 0,
}) => {
    const [playerName] = useState(() => localStorage.getItem('playerName') || 'Player');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    if (!isOpen) return null;

    const vip = !!player.isVip;
    const stats = player.stats || { maxSingleWin: 0, maxJackpotWin: 0, totalCoinsWon: 0, totalGemsEarned: 0, totalSpins: 0, recentSlots: [] };
    const xpPct = Math.min(100, Math.floor((player.xp / player.xpToNextLevel) * 100));

    const bgStyle = vip
        ? 'linear-gradient(160deg,#3b1a00 0%,#1e0f00 60%,#0d0700 100%)'
        : 'linear-gradient(160deg,#3b0764 0%,#1e0438 60%,#0d0220 100%)';
    const headerStyle = vip
        ? 'linear-gradient(180deg,#c9801a 0%,#7a5000 100%)'
        : 'linear-gradient(180deg,#6b21a8,#4c1d95)';
    const xpBarStyle = vip
        ? 'linear-gradient(90deg,#f59e0b,#fde68a,#f59e0b)'
        : 'linear-gradient(90deg,#a855f7,#d946ef)';
    const labelColor = vip ? 'text-yellow-300/50' : 'text-white/30';

    return (
        <div className="fixed inset-0 z-[200] flex flex-col animate-pop-in select-none"
            style={{ background: bgStyle }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-2.5 pb-3"
                style={{ background: headerStyle, boxShadow: '0 4px 16px rgba(0,0,0,0.6)' }}>

                {/* Avatar — clickable emoji */}
                <div className="relative shrink-0">
                    <button
                        onClick={() => setShowEmojiPicker(v => !v)}
                        className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-3xl leading-none shrink-0 cursor-pointer transition-transform active:scale-95"
                        style={{ background: vip ? 'linear-gradient(135deg,#f59e0b,#b45309)' : 'linear-gradient(135deg,#a855f7,#7c3aed)', border: vip ? '2px solid #f0c000' : '2px solid rgba(255,255,255,0.25)' }}>
                        {profileEmoji ? profileEmoji : <i className="ti ti-user" style={{ fontSize: '1.6rem' }} />}
                    </button>
                    {/* Emoji picker dropdown */}
                    {showEmojiPicker && (
                        <div className="absolute top-14 left-0 z-50 rounded-2xl p-2 shadow-2xl flex flex-wrap gap-1.5"
                            style={{ background: 'rgba(20,5,40,0.97)', border: '1px solid rgba(255,255,255,0.15)', width: 160 }}>
                            {PROFILE_EMOJIS.map(e => (
                                <button key={e} onClick={() => { onSetProfileEmoji?.(e); setShowEmojiPicker(false); }}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-2xl transition-transform active:scale-90 hover:brightness-125"
                                    style={{ background: (profileEmoji && e === profileEmoji) ? (vip ? 'rgba(251,191,36,0.3)' : 'rgba(168,85,247,0.3)') : 'rgba(255,255,255,0.07)' }}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Name + level + XP bar */}
                <div className="flex-1 min-w-0">
                    {/* Name row with level */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-white text-sm uppercase tracking-wider leading-none">
                            {playerName}
                        </span>
                        <span className="font-black text-[10px] leading-none px-1.5 py-0.5 rounded-full"
                            style={{ background: vip ? 'rgba(251,191,36,0.2)' : 'rgba(168,85,247,0.2)', color: vip ? '#fde68a' : '#d8b4fe' }}>
                            LVL.{player.level}
                        </span>
                        {vip && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide"
                                style={{ background: '#991b1b', border: '1px solid #f0c000', color: '#fde68a' }}>VIP</span>
                        )}
                        {isPremium && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide"
                                style={{ background: '#14532d', border: '1px solid #86efac', color: '#bbf7d0' }}>Pass</span>
                        )}
                    </div>

                    {/* Thick XP bar with text inside */}
                    <div className="relative h-6 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.35)' }}>
                        <div className="absolute inset-0 rounded-full transition-all" style={{ width: `${xpPct}%`, background: xpBarStyle }} />
                        <div className="absolute inset-0 flex items-center justify-center px-2.5">
                            <span className="text-[10px] font-black leading-none" style={{ color: vip ? '#fde68a' : '#e9d5ff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                                {formatK(player.xp)} XP / {formatK(player.xpToNextLevel)} XP
                            </span>
                        </div>
                    </div>
                </div>

                <div className="round-btn cursor-pointer shrink-0" onClick={() => { setShowEmojiPicker(false); onClose(); }}
                    style={vip ? { background:'linear-gradient(180deg,#e0a820,#9a6800)', boxShadow:'0 2px 0 #5a3800' } : {}}>
                    <i className="ti ti-x" />
                </div>
            </div>

            {/* Two-column body */}
            <div className="flex-1 flex min-h-0" onClick={() => showEmojiPicker && setShowEmojiPicker(false)}>

                {/* LEFT — Stats */}
                <div className="flex-1 px-3 py-2 flex flex-col overflow-y-auto no-scrollbar">
                    <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${labelColor}`}>Stats</div>
                    <StatRow vip={vip} icon="🪙" label="Balance" value={formatK(player.balance)} />
                    <StatRow vip={vip} icon="💎" label="Gems" value={formatK(player.diamonds)} />
                    <StatRow vip={vip} icon="🎰" label="Total Spins" value={formatK(stats.totalSpins)} />
                    <StatRow vip={vip} icon="🏆" label="Max Win" value={formatK(stats.maxSingleWin)} />
                    <StatRow vip={vip} icon="💰" label="Total Won" value={formatK(stats.totalCoinsWon)} />
                    <StatRow vip={vip} icon="🎯" label="Max Jackpot" value={formatK(stats.maxJackpotWin)} />
                    <StatRow vip={vip} icon="📚" label="Albums" value={`${albumsCompleted}/${albumsTotal}`} />
                </div>

                {/* RIGHT — Recent Slots */}
                <div className="flex-1 px-3 py-2 flex flex-col overflow-hidden">
                    <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${labelColor}`}>Recent Slots</div>
                    {recentGames.length > 0 ? (
                        <div className="flex-1 grid grid-cols-3 gap-1.5 content-start overflow-y-auto no-scrollbar">
                            {recentGames.map((game, i) => {
                                const icon = THEME_ICONS[game.theme] || '🎰';
                                return (
                                    <button key={i} className="rounded-xl overflow-hidden flex flex-col cursor-pointer active:scale-95 transition-transform"
                                        style={{ background: 'rgba(0,0,0,0.25)' }}
                                        onClick={() => { onNavigateToGame?.(game); onClose(); }}>
                                        <div className={`h-11 flex items-center justify-center bg-gradient-to-br ${game.color}`}>
                                            <span className="text-2xl leading-none drop-shadow-lg">{icon}</span>
                                        </div>
                                        <div className="text-white font-black text-[8px] uppercase tracking-wide text-center px-0.5 py-1 leading-tight truncate">
                                            {game.name}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <span className={`text-xs ${labelColor}`}>No slots played yet</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
