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
        <span className="text-xl leading-none w-7 text-center flex items-center justify-center">
            {icon.startsWith('/') ? (
                <img src={icon} alt="" style={{ width: '1.25rem', height: '1.25rem', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} />
            ) : icon}
        </span>
        <span className="text-xs flex-1 font-bold text-white font-nunito">{label}</span>
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

    const xpBoostOn = (player.xpMultiplier || 1) > 1 && (player.xpBoostEndTime || 0) > Date.now();
    const xpFillGradient = xpBoostOn
        ? 'linear-gradient(180deg,#ffe066,#e8a800 60%,#b07000)'
        : 'linear-gradient(180deg,#7fd0ff,#2b8fe8 60%,#1565b0)';

    return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-pop-in select-none">
        <div className="w-full max-w-[560px] flex flex-col rounded-3xl overflow-hidden font-nunito"
            style={{ height: 'min(88%, 560px)', background: 'linear-gradient(180deg,#9030d8 0%,#6018a8 18%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-2.5 pb-3">

                {/* Avatar — clickable emoji, styled like round-btn but large */}
                <div className="relative shrink-0">
                    <button
                        onClick={() => setShowEmojiPicker(v => !v)}
                        className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-3xl leading-none shrink-0 cursor-pointer transition-transform active:scale-95"
                        style={vip
                            ? { background: 'linear-gradient(180deg,#e0a820,#9a6800)', border: '1px solid #8b6200', boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.4)' }
                            : { background: 'linear-gradient(180deg,#9b6ce0,#5022a8)', border: '1px solid #38106e', boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.4)' }
                        }>
                        {profileEmoji ? profileEmoji : <i className="ti ti-user" style={{ fontSize: '1.6rem' }} />}
                    </button>
                    {showEmojiPicker && (
                        <div className="absolute top-14 left-0 z-50 rounded-2xl p-2 shadow-2xl flex flex-wrap gap-1.5"
                            style={{ background: 'rgba(20,5,40,0.97)', border: '1px solid rgba(255,255,255,0.15)', width: 160 }}>
                            {/* None option */}
                            <button
                                onClick={() => { onSetProfileEmoji?.(''); setShowEmojiPicker(false); }}
                                className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform active:scale-90 hover:brightness-125"
                                style={{ background: (!profileEmoji) ? (vip ? 'rgba(251,191,36,0.3)' : 'rgba(168,85,247,0.3)') : 'rgba(255,255,255,0.07)' }}>
                                <i className="ti ti-user" style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)' }} />
                            </button>
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
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-black text-white text-sm tracking-wider leading-none font-nunito">
                            {playerName}
                        </span>
                        <span className="font-black text-[10px] leading-none px-1.5 py-0.5 rounded-full font-nunito"
                            style={{ background: vip ? 'rgba(251,191,36,0.2)' : 'rgba(168,85,247,0.2)', color: vip ? '#fde68a' : '#d8b4fe' }}>
                            Lv.{player.level}
                        </span>
                        {vip && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full tracking-wide font-nunito"
                                style={{ background: '#991b1b', border: '1px solid #f0c000', color: '#fde68a' }}>VIP</span>
                        )}
                        {isPremium && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full tracking-wide font-nunito"
                                style={{ background: '#14532d', border: '1px solid #86efac', color: '#bbf7d0' }}>Pass</span>
                        )}
                    </div>

                    {/* XP bar — matches topbar rtrack design */}
                    <div className="relative h-[20px] overflow-hidden"
                        style={{ borderRadius: 18, background: 'linear-gradient(180deg,#2a0d52,#1a0838)', border: '1px solid #38106e', boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.6)' }}>
                        <div className="absolute left-0 top-0 bottom-0 transition-all"
                            style={{ width: `${xpPct}%`, borderRadius: 12, background: xpFillGradient, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)' }} />
                        <div className="absolute inset-0 flex items-center justify-center px-2.5">
                            <span className="text-[9px] font-black leading-none text-white font-nunito" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)', position: 'relative', zIndex: 1 }}>
                                {formatK(player.xp)} / {formatK(player.xpToNextLevel)} XP
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
                    <div className="text-[9px] font-black mb-1 text-white font-nunito">Stats</div>
                    <StatRow vip={vip} icon="/symbols/coin.png" label="Balance" value={formatK(player.balance)} />
                    <StatRow vip={vip} icon="/symbols/diamond.png" label="Gems" value={formatK(player.diamonds)} />
                    <StatRow vip={vip} icon="🎰" label="Total Spins" value={formatK(stats.totalSpins)} />
                    <StatRow vip={vip} icon="🏆" label="Max Win" value={formatK(stats.maxSingleWin)} />
                    <StatRow vip={vip} icon="/symbols/coin.png" label="Total Won" value={formatK(stats.totalCoinsWon)} />
                    <StatRow vip={vip} icon="🎯" label="Max Jackpot" value={formatK(stats.maxJackpotWin)} />
                    <StatRow vip={vip} icon="📚" label="Albums" value={`${albumsCompleted}/${albumsTotal}`} />
                </div>

                {/* RIGHT — Recent Slots */}
                <div className="flex-1 px-3 py-2 flex flex-col overflow-hidden">
                    <div className="text-[9px] font-black mb-1 text-white font-nunito">Recent Slots</div>
                    {recentGames.length > 0 ? (
                        <div className="flex-1 grid grid-cols-3 gap-1.5 content-start overflow-y-auto no-scrollbar">
                            {recentGames.map((game, i) => {
                                const icon = THEME_ICONS[game.theme] || '🎰';
                                return (
                                    <button key={i} className="rounded-xl overflow-hidden relative cursor-pointer active:scale-95 transition-transform"
                                        style={{ aspectRatio: '1/1' }}
                                        onClick={() => { onNavigateToGame?.(game); onClose(); }}>
                                        {/* Cover or gradient bg */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${game.color}`} />
                                        {game.coverImage
                                            ? <img src={game.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                            : <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl leading-none drop-shadow-lg">{icon}</span></div>
                                        }
                                        {/* Name overlay */}
                                        <div className="absolute bottom-0 left-0 right-0 px-0.5 pb-1 pt-3"
                                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)' }}>
                                            <div className="text-white font-black text-[8px] tracking-wide text-center leading-tight truncate font-nunito"
                                                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                                                {game.name}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <span className="text-xs text-white/40 font-nunito">No slots played yet</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </div>
    );
};
