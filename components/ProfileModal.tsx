
import React, { useState } from 'react';
import { GameConfig } from '../types';
import { formatK } from '../constants';
import { AVATARS, isAvatarUnlocked, avatarRequirementLabel } from '../services/avatarService';

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
    playerName?: string;
    onSetPlayerName?: (name: string) => void;
    onNavigateToGame?: (game: GameConfig) => void;
    albumsCompleted?: number;
    albumsTotal?: number;
    arenaTier?: number;
    unlockedAvatars?: string[];
    onBuyAvatar?: (path: string, cost: number) => void;
}

// Profile pics 1-12. Only the first four are unlocked; the rest are locked.
const PROFILE_PICS = [
    '/Profile_pic (3).png', // penguin — first/default
    ...Array.from({ length: 12 }, (_, i) => `/Profile_pic (${i + 1}).png`).filter(p => p !== '/Profile_pic (3).png'),
];
const UNLOCKED_PIC_COUNT = 4;

const THEME_ICONS: Record<string, string> = {
    PIGGY: '🐷', NEON: '🎰', EGYPT: '🦂', DRAGON: '🐉', PIRATE: '🏴‍☠️',
    SPACE: '👽', CANDY: '🧁', JUNGLE: '🦍', UNDERWATER: '🦈', WESTERN: '🤠',
    SAMURAI: '⚔️',
};

const StatRow: React.FC<{ icon: string; label: string; value: string; pos: 'top' | 'mid' | 'bot' | 'only' }> = ({ icon, label, value, pos }) => {
    const radius = pos === 'top' ? '12px 12px 0 0' : pos === 'bot' ? '0 0 12px 12px' : pos === 'only' ? '12px' : '0';
    return (
        <div style={{ background: 'rgba(0,0,0,0.22)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45)', borderRadius: radius, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 22, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon.startsWith('/') ? (
                    <img src={icon} alt="" style={{ width: '1.1rem', height: '1.1rem', objectFit: 'contain' }} />
                ) : <span style={{ fontSize: '1rem', lineHeight: 1 }}>{icon}</span>}
            </span>
            <span className="flex-1 font-bold text-white font-nunito" style={{ fontSize: 11 }}>{label}</span>
            <span className="font-black text-white font-nunito" style={{ fontSize: 12 }}>{value}</span>
        </div>
    );
};

export const ProfileModal: React.FC<ProfileModalProps> = ({
    isOpen, onClose, player, isPremium, passBoostMultiplier = 1, passBoostEndTime = 0,
    recentGames, profileEmoji = '', onSetProfileEmoji, playerName: playerNameProp,
    onSetPlayerName, onNavigateToGame, albumsCompleted = 0, albumsTotal = 0,
    arenaTier = 0, unlockedAvatars = [], onBuyAvatar,
}) => {
    const avatarCtx = { level: player.level, isVip: !!player.isVip, arenaTier, unlockedAvatars };
    const playerName = playerNameProp ?? (localStorage.getItem('playerName') || 'Player');
    const [showPicPicker, setShowPicPicker] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState(playerName);

    const commitName = () => {
        const next = nameDraft.trim().slice(0, 20);
        if (next && next !== playerName) onSetPlayerName?.(next);
        setEditingName(false);
    };

    if (!isOpen) return null;

    const vip = !!player.isVip;
    const stats = player.stats || { maxSingleWin: 0, maxJackpotWin: 0, totalCoinsWon: 0, totalGemsEarned: 0, totalSpins: 0, recentSlots: [] };
    const xpPct = Math.min(100, Math.floor((player.xp / player.xpToNextLevel) * 100));

    const xpBoostOn = (player.xpMultiplier || 1) > 1 && (player.xpBoostEndTime || 0) > Date.now();
    const xpFillGradient = xpBoostOn
        ? 'linear-gradient(180deg,#ffe066,#e8a800 60%,#b07000)'
        : 'linear-gradient(180deg,#7fd0ff,#2b8fe8 60%,#1565b0)';

    const containerBg = vip
        ? 'linear-gradient(180deg,#c9901a 0%,#9a6800 18%,#5a3800 100%)'
        : 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)';
    const containerShadow = vip
        ? 'inset 0 1px 0 rgba(255,220,100,0.5), 0 8px 32px rgba(0,0,0,0.8)'
        : 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)';
    const xpBarBg = vip
        ? 'linear-gradient(180deg,#3a1800,#1e0c00)'
        : 'linear-gradient(180deg,#2a0d52,#1a0838)';
    const xpBarBorder = vip ? '#8b5e00' : '#38106e';

    // profileEmoji now stores either a pic path or empty
    const isPic = profileEmoji.startsWith('/Profile_pic');

    return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-pop-in select-none">
        <div className="w-full max-w-[560px] flex flex-col rounded-3xl overflow-hidden font-nunito"
            style={{ height: 'min(88%, 560px)', background: containerBg, boxShadow: containerShadow }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-2.5 pb-3">

                {/* Avatar */}
                <div className="relative shrink-0">
                    <button
                        onClick={() => setShowPicPicker(v => !v)}
                        className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-95"
                        style={vip
                            ? { background: 'linear-gradient(180deg,#e0a820,#9a6800)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.6), 0 0 0 2.5px #fbbf24, 0 2px 5px rgba(0,0,0,0.5)' }
                            : { background: 'linear-gradient(180deg,#9b6ce0,#5022a8)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.6), 0 0 0 2.5px #a855f7, 0 2px 5px rgba(0,0,0,0.5)' }
                        }>
                        {isPic
                            ? <img src={profileEmoji} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <i className="ti ti-user" style={{ fontSize: '1.6rem', color: 'rgba(255,255,255,0.7)' }} />
                        }
                    </button>
                    {showPicPicker && (
                        <div className="absolute top-14 left-0 z-50 rounded-2xl p-2 shadow-2xl flex flex-wrap gap-1.5"
                            style={{ background: 'rgba(20,5,40,0.97)', border: '1px solid rgba(255,255,255,0.15)', width: 200 }}>
                            {AVATARS.map((def) => {
                                const pic = def.path;
                                const unlocked = isAvatarUnlocked(def, avatarCtx);
                                const isGem = def.unlock.type === 'gems';
                                const buyable = !unlocked && isGem;
                                const canAfford = isGem && (def.unlock as any).cost <= player.diamonds;
                                const reqLabel = avatarRequirementLabel(def);
                                return (
                                    <button key={pic}
                                        onClick={() => {
                                            if (unlocked) { onSetProfileEmoji?.(pic); setShowPicPicker(false); return; }
                                            if (buyable && canAfford) onBuyAvatar?.(pic, (def.unlock as any).cost);
                                        }}
                                        className={`relative w-11 h-11 rounded-xl overflow-hidden transition-transform${unlocked || (buyable && canAfford) ? ' active:scale-90 hover:brightness-125' : ''}`}
                                        style={{ border: profileEmoji === pic ? `2px solid ${vip ? '#fbbf24' : '#a855f7'}` : '2px solid transparent', cursor: unlocked || (buyable && canAfford) ? 'pointer' : 'default' }}>
                                        <img src={pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: unlocked ? undefined : 'grayscale(1) brightness(0.4)' }} />
                                        {!unlocked && (
                                            <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-white/90" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                                                {isGem ? <i className="ti ti-diamond" style={{ fontSize: 11 }} /> : <i className="ti ti-lock" style={{ fontSize: 11 }} />}
                                                <span className="font-black leading-none" style={{ fontSize: 7.5 }}>{reqLabel}</span>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Name + level + XP bar */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        {editingName ? (
                            <input
                                autoFocus
                                value={nameDraft}
                                maxLength={20}
                                onChange={e => setNameDraft(e.target.value)}
                                onBlur={commitName}
                                onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setNameDraft(playerName); setEditingName(false); } }}
                                className="font-black text-white text-sm leading-none font-nunito bg-black/30 rounded-md px-2 py-1 outline-none"
                                style={{ width: 150, border: '1px solid rgba(255,255,255,0.25)' }}
                            />
                        ) : (
                            <button onClick={() => { setNameDraft(playerName); setEditingName(true); }}
                                className="flex items-center gap-1.5 active:scale-95 transition-transform">
                                <span className="font-black text-white text-sm tracking-wider leading-none font-nunito">
                                    {playerName}
                                </span>
                                <i className="ti ti-pencil" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }} />
                            </button>
                        )}
                        <span className="font-black text-[10px] leading-none text-white font-nunito">
                            Lv.{player.level}
                        </span>
                    </div>

                    {/* XP bar */}
                    <div className="relative h-[20px] overflow-hidden"
                        style={{ borderRadius: 18, background: xpBarBg, border: `1px solid ${xpBarBorder}`, boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.6)' }}>
                        <div className="absolute left-0 top-0 bottom-0 transition-all"
                            style={{ width: `${xpPct}%`, borderRadius: 12, background: xpFillGradient, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)' }} />
                        <div className="absolute inset-0 flex items-center justify-center px-2.5">
                            <span className="text-[9px] font-black leading-none text-white font-nunito" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)', position: 'relative', zIndex: 1 }}>
                                {formatK(player.xp)} / {formatK(player.xpToNextLevel)} XP
                            </span>
                        </div>
                    </div>
                </div>

                <div className="round-btn cursor-pointer shrink-0" onClick={() => { setShowPicPicker(false); onClose(); }}
                    style={vip ? { background:'linear-gradient(180deg,#e0a820,#9a6800)', boxShadow:'0 2px 0 #5a3800' } : {}}>
                    <i className="ti ti-x" />
                </div>
            </div>

            {/* Two-column body */}
            <div className="flex-1 flex min-h-0" onClick={() => showPicPicker && setShowPicPicker(false)}>

                {/* LEFT — Stats */}
                <div className="flex-1 px-3 py-2 flex flex-col overflow-y-auto no-scrollbar gap-0">
                    <div className="text-[9px] font-black mb-1.5 text-white font-nunito">Stats</div>
                    <div className="flex flex-col">
                        <StatRow pos="top" icon="/new_coinicon.png" label="Balance" value={formatK(player.balance)} />
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
                        <StatRow pos="mid" icon="/symbols/diamond.png" label="Gems" value={formatK(player.diamonds)} />
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
                        <StatRow pos="mid" icon="🎰" label="Total Spins" value={formatK(stats.totalSpins)} />
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
                        <StatRow pos="mid" icon="🏆" label="Max Win" value={formatK(stats.maxSingleWin)} />
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
                        <StatRow pos="mid" icon="/new_coinicon.png" label="Total Won" value={formatK(stats.totalCoinsWon)} />
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
                        <StatRow pos="bot" icon="🎯" label="Max Jackpot" value={formatK(stats.maxJackpotWin)} />
                    </div>
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
                                        <div className={`absolute inset-0 bg-gradient-to-br ${game.color}`} />
                                        {game.coverImage
                                            ? <img src={game.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                            : <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl leading-none drop-shadow-lg">{icon}</span></div>
                                        }
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
