import React, { useState, useEffect } from 'react';
import { Deck, Card, CardRarity } from '../types';
import { formatNumber, PACK_COSTS, formatCommaNumber } from '../constants';
import { audioService } from '../services/audioService';

interface CardCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenShop: (tab?: 'COINS' | 'BOOSTS' | 'DIAMONDS') => void;
    initialTab?: 'ALBUM' | 'PACKS';
    decks: Deck[];
    onClaimDeckReward: (deckId: string, reward: number) => void;
    onBuyPack: (packId: string, drawCount: number) => Card[];
    onBuyCredits: (cost: number, credits: number) => void;
    onBuyCreditsWithTokens?: (amount: number, cost: number) => void;
    diamonds: number;
    playerLevel: number;
    tokens: number;
    packCredits: number;
    balance: number;
    grandPrize?: number;
    getDeckReward?: (deckId: string) => number;
}

export const CardCollectionModal: React.FC<CardCollectionModalProps> = ({
    isOpen,
    onClose,
    onOpenShop,
    initialTab,
    decks,
    onClaimDeckReward,
    onBuyPack,
    onBuyCredits,
    onBuyCreditsWithTokens,
    diamonds,
    playerLevel,
    tokens,
    packCredits,
    balance,
    grandPrize = 0,
    getDeckReward = (_deckId: string) => 0
}) => {
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'ALBUM' | 'PACKS'>(initialTab || 'ALBUM');
    const albumScrollRef = React.useRef<HTMLDivElement>(null);
    const deckCardsScrollRef = React.useRef<HTMLDivElement>(null);

    const scrollAlbum = (dir: 'LEFT' | 'RIGHT') => {
        albumScrollRef.current?.scrollBy({ left: dir === 'LEFT' ? -160 : 160, behavior: 'smooth' });
    };

    React.useEffect(() => {
        if (!isOpen) return;
        const addWheel = (el: HTMLDivElement | null) => {
            if (!el) return () => {};
            const handler = (e: WheelEvent) => { e.preventDefault(); el.scrollLeft += e.deltaY; };
            el.addEventListener('wheel', handler, { passive: false });
            return () => el.removeEventListener('wheel', handler);
        };
        const r1 = addWheel(albumScrollRef.current);
        const r2 = addWheel(deckCardsScrollRef.current);
        return () => { r1(); r2(); };
    }, [isOpen, selectedDeckId, activeTab]);

    const [isOpeningPack, setIsOpeningPack] = useState(false);
    const [lastPackId, setLastPackId] = useState<string | null>(null);
    const [openedCards, setOpenedCards] = useState<Card[]>([]);
    const [packStage, setPackStage] = useState<'SHAKING' | 'BURST' | 'REVEAL' | 'DONE'>('DONE');
    const [skipAnimation, setSkipAnimation] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSelectedDeckId(null);
            setIsOpeningPack(false);
            setPackStage('DONE');
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && initialTab) setActiveTab(initialTab);
    }, [isOpen, initialTab]);

    const closePack = () => {
        setIsOpeningPack(false);
        setPackStage('DONE');
        setOpenedCards([]);
        setLastPackId(null);
    };

    const getCardStyle = (rarity: CardRarity, isLocked: boolean) => {
        if (isLocked) {
            switch(rarity) {
                case 'LEGENDARY': return 'bg-[#3a2d10]/80 text-yellow-850 shadow-none grayscale-[0.5]';
                case 'EPIC': return 'bg-[#2d103a]/80 text-purple-850 shadow-none grayscale-[0.5]';
                case 'RARE': return 'bg-[#101d3a]/80 text-blue-850 shadow-none grayscale-[0.5]';
                default: return 'bg-[#1a1a1a]/80 text-gray-800 shadow-none grayscale-[0.8]';
            }
        }
        switch(rarity) {
            case 'LEGENDARY': return 'bg-yellow-950/90 text-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)] animate-pulse';
            case 'EPIC': return 'bg-purple-950/90 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]';
            case 'RARE': return 'bg-blue-950/90 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.4)]';
            default: return 'bg-gray-900/90 text-gray-400 shadow-none';
        }
    };

    const rarityOrder: Record<CardRarity, number> = {
        'COMMON': 0, 'RARE': 1, 'EPIC': 2, 'LEGENDARY': 3
    };

    const handleDraw = (packId: string, count: number) => {
        const cards = onBuyPack(packId, count);
        if (cards.length > 0) {
            cards.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);
            setLastPackId(packId);
            setOpenedCards(cards);
            setIsOpeningPack(true);
            if (skipAnimation) {
                setPackStage('REVEAL');
                audioService.playWinBig();
            } else {
                setPackStage('SHAKING');
                audioService.playClick();
                setTimeout(() => {
                    setPackStage('BURST');
                    audioService.playWinSmall();
                    setTimeout(() => {
                        setPackStage('REVEAL');
                        audioService.playWinBig();
                    }, 600);
                }, 1000);
            }
        } else {
            setIsOpeningPack(false);
        }
    };

    const packOptions = [
        { id: 'basic', name: 'Basic', info: PACK_COSTS.BASIC, color: 'from-gray-700 to-gray-900', icon: '📦' },
        { id: 'super', name: 'Super', info: PACK_COSTS.SUPER, color: 'from-blue-700 to-blue-900', icon: '💼' },
        { id: 'mega', name: 'Mega', info: PACK_COSTS.MEGA, color: 'from-purple-700 to-purple-900', icon: '🦄' },
        { id: 'ultra', name: 'Ultra', info: PACK_COSTS.ULTRA, color: 'from-yellow-600 to-yellow-800', icon: '👑' }
    ];

    const tokenExchanges = [
        { credits: 1, cost: 50 },
        { credits: 10, cost: 500 },
        { credits: 100, cost: 5000 }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex flex-col animate-pop-in" style={{ background: 'linear-gradient(160deg,#2e1065 0%,#0f0518 100%)' }}>
            {/* Pack Opening Overlay */}
            {isOpeningPack && (
                <div className="absolute inset-0 z-[160] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-3">
                    {packStage === 'SHAKING' && (
                        <div className="text-6xl animate-bounce drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] pointer-events-none">📦</div>
                    )}
                    {packStage === 'BURST' && (
                        <div className="text-6xl scale-125 transition-transform duration-300 opacity-0 pointer-events-none">💥</div>
                    )}
                    {packStage === 'REVEAL' && (
                        <div className="w-full h-full flex flex-col items-center justify-center animate-pop-in relative py-4">
                            <div className={`flex-1 w-full max-w-2xl px-2 overflow-y-auto grid gap-2 content-center justify-items-center ${openedCards.length >= 10 ? 'grid-cols-5' : 'grid-cols-3'}`}>
                                {openedCards.map((card, i) => (
                                    <div
                                        key={i}
                                        className={`relative aspect-[2/3] w-full ${openedCards.length >= 10 ? 'max-w-[80px]' : 'max-w-[100px]'} rounded-lg ${getCardStyle(card.rarity, false)} p-1.5 flex flex-col items-center justify-center animate-pop-in mt-3 ${card.rarity === 'LEGENDARY' ? 'animate-pulse duration-700' : ''}`}
                                        style={{ animationDelay: `${i * 30}ms` }}
                                    >
                                        <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider whitespace-nowrap shadow ${card.rarity === 'LEGENDARY' ? 'bg-yellow-500 text-black' : card.rarity === 'EPIC' ? 'bg-purple-600 text-white' : card.rarity === 'RARE' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'}`}>
                                            {card.rarity}
                                        </div>
                                        {card.isNew && <div className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[7px] font-black px-1 rounded animate-pulse z-20">NEW</div>}
                                        <div className="text-2xl mb-1 drop-shadow-md">{card.icon}</div>
                                        <div className="text-[8px] font-bold text-center bg-black/50 px-1 rounded truncate w-full">{card.name}</div>
                                        {card.isDuplicate && (
                                            <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center">
                                                <div className="text-yellow-400 text-[7px] font-bold uppercase bg-black/80 px-1 rounded">Dup</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="shrink-0 mt-4 flex flex-col sm:flex-row gap-2 z-50 items-center bg-black/70 p-2.5 rounded-xl">
                                <button onClick={closePack} className="px-5 py-1.5 bg-gray-700 rounded-lg text-white font-bold text-xs uppercase hover:bg-gray-600">Close</button>
                                {lastPackId && (
                                    <div className="flex gap-1.5 items-center">
                                        <button onClick={() => { setPackStage('DONE'); setOpenedCards([]); setTimeout(() => handleDraw(lastPackId!, 1), 100); }}
                                            className="px-4 py-1.5 bg-green-600 rounded-lg text-white font-bold text-xs uppercase">1x</button>
                                        <button onClick={() => { setPackStage('DONE'); setOpenedCards([]); setTimeout(() => handleDraw(lastPackId!, 10), 100); }}
                                            className="px-4 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg text-white font-bold text-xs uppercase relative overflow-hidden">
                                            10x
                                            <span className="absolute top-0 right-0 bg-red-600 text-[6px] px-0.5 font-black text-white">-10%</span>
                                        </button>
                                        <label className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-md cursor-pointer ml-1">
                                            <input type="checkbox" checked={skipAnimation} onChange={(e) => setSkipAnimation(e.target.checked)} className="w-3 h-3 text-yellow-500 rounded bg-gray-800 border-gray-600" />
                                            <span className="text-[8px] font-bold text-gray-300 uppercase leading-none">Skip</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

                {/* Header */}
                <div className="bg-gradient-to-r from-[#4c1d95] to-[#3b0764] px-3 py-2 flex items-center gap-2 shrink-0 z-10 shadow-lg">
                    {selectedDeckId && (
                        <button onClick={() => setSelectedDeckId(null)} className="round-btn shrink-0">
                            <i className="ti ti-arrow-left"></i>
                        </button>
                    )}
                    <h2 className="text-xs font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-fuchsia-200 uppercase tracking-wider shrink-0">
                        {selectedDeckId ? decks.find(d => d.gameId === selectedDeckId)?.gameName : 'Album'}
                    </h2>

                    {!selectedDeckId && (
                        <div className="flex items-center bg-black/30 p-0.5 rounded-lg ml-1">
                            <button onClick={() => setActiveTab('ALBUM')} className={`px-4 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'ALBUM' ? 'bg-yellow-500 text-black shadow-md' : 'text-gray-400'}`}>Decks</button>
                            <button onClick={() => setActiveTab('PACKS')} className={`px-4 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'PACKS' ? 'bg-yellow-500 text-black shadow-md' : 'text-gray-400'}`}>Draw</button>
                        </div>
                    )}

                    <div className="flex-1"></div>

                    <div className="flex items-center gap-1.5 text-[10px]">
                        <div className="currency-pill flex items-center gap-1 shrink-0">
                            <div className="coin">$</div>
                            <span className="num">{formatNumber(balance)}</span>
                        </div>
                        <div className="currency-pill flex items-center gap-1 shrink-0">
                            <div className="gem"></div>
                            <span className="num">{formatNumber(diamonds)}</span>
                        </div>
                        <div className="currency-pill flex items-center gap-1 shrink-0">
                            <span style={{ fontSize: '12px', lineHeight: 1, flexShrink: 0 }}>📦</span>
                            <span className="num" style={{ color: '#fb923c' }}>{packCredits}</span>
                        </div>
                        <button onClick={() => { onClose(); onOpenShop('BOOSTS'); }}
                            className="flex items-center justify-center font-black text-white shrink-0 transition-all active:scale-90"
                            style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(180deg,#a855f7,#7c3aed)', border: '1px solid rgba(255,255,255,0.25)', fontSize: '14px', lineHeight: 1, boxShadow: '0 2px 0 #3b0764' }}>
                            +
                        </button>
                        <div className="currency-pill flex items-center gap-1 shrink-0">
                            <span style={{ fontSize: '11px', lineHeight: 1, flexShrink: 0 }}>💳</span>
                            <span className="num">{formatNumber(tokens)}</span>
                        </div>
                    </div>
                    <div className="round-btn cursor-pointer shrink-0 ml-1" onClick={onClose}><i className="ti ti-x"></i></div>
                </div>

                {/* Horizontal scroll content */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar p-3 min-h-0">

                    {/* ALBUM view */}
                    {!selectedDeckId && activeTab === 'ALBUM' && (
                        <div className="flex flex-col h-full gap-2">
                            {/* Grand reward — no container, no emoji, just text */}
                            <div className="shrink-0 text-center leading-tight">
                                <div className="text-yellow-400 text-[9px] font-black uppercase tracking-widest">Grand Reward</div>
                                <div className="text-white font-black text-xl font-mono">{formatCommaNumber(grandPrize)}</div>
                            </div>

                            {/* Deck scroll — swipe/wheel only */}
                            <div ref={albumScrollRef} className="flex-1 overflow-x-auto flex items-stretch gap-3 no-scrollbar min-h-0">
                                {decks.map(deck => {
                                    const collected = deck.cards.filter(c => c.count > 0).length;
                                    const total = deck.cards.length;
                                    const isComplete = collected === total;
                                    return (
                                        <button key={deck.gameId} onClick={() => setSelectedDeckId(deck.gameId)}
                                            className="flex-none w-36 flex flex-col items-center bg-black/40 p-2 rounded-xl h-full active:scale-95 transition-transform">
                                            <div className={`w-full flex-1 bg-gradient-to-b ${deck.theme === 'NEON' ? 'from-purple-900 to-black' : deck.theme === 'EGYPT' ? 'from-orange-900 to-black' : 'from-gray-800 to-black'} rounded-lg flex items-center justify-center overflow-hidden relative min-h-0`}>
                                                <div className="text-[5rem] drop-shadow-2xl leading-none">{deck.theme === 'NEON' ? '🎰' : deck.theme === 'EGYPT' ? '🦂' : deck.theme === 'DRAGON' ? '🐉' : deck.theme === 'PIRATE' ? '🏴‍☠️' : deck.theme === 'SPACE' ? '👽' : deck.theme === 'PIGGY' ? '🐷' : '🃏'}</div>
                                                {isComplete && <div className="absolute top-1 right-1 text-sm">✅</div>}
                                                <div className="absolute bottom-1 bg-black/70 px-2 py-0.5 rounded-full">
                                                    <div className="text-yellow-400 font-mono font-black text-[11px]">+{formatNumber(getDeckReward(deck.gameId))}</div>
                                                </div>
                                            </div>
                                            <div className="mt-1.5 text-center w-full">
                                                <h3 className="text-white font-black font-display text-[13px] truncate leading-none">{deck.gameName}</h3>
                                                <div className="text-purple-300 font-bold text-[10px] uppercase mt-0.5">{collected}/{total}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* PACKS view — fills full width */}
                    {!selectedDeckId && activeTab === 'PACKS' && (
                        <div className="flex items-stretch gap-2 h-full w-full">
                            {/* Duplicate exchange column */}
                            <div className="flex-none w-32 bg-gray-900/60 rounded-xl p-2 flex flex-col gap-1.5 h-full">
                                <h3 className="text-green-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0"><span>💳</span> Dupe Exchange</h3>
                                <div className="flex flex-col gap-1.5 flex-1">
                                    {tokenExchanges.map((ex, idx) => (
                                        <button key={idx} onClick={() => onBuyCreditsWithTokens && onBuyCreditsWithTokens(ex.credits, ex.cost)}
                                            disabled={tokens < ex.cost}
                                            className={`btn-3d flex-1 flex flex-col items-center justify-center p-1.5 rounded-lg transition-all ${tokens >= ex.cost ? 'bg-gradient-to-b from-[#166534]/50 to-[#14532d]/50 border border-green-700/55 hover:brightness-110' : 'bg-gray-800/40 border border-gray-700/30 opacity-40 cursor-not-allowed'}`}>
                                            <span className="text-white text-[9px] font-bold">+{ex.credits} Credit</span>
                                            <div className="flex items-center gap-0.5 bg-black/40 px-1.5 py-0.5 rounded-full mt-0.5">
                                                <span className="text-green-400 font-mono text-[8px] font-bold">{ex.cost}</span>
                                                <span className="text-[8px]">💳</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Pack cards — flex-1 to fill remaining width */}
                            {packOptions.map(pack => {
                                const singleCost = pack.info.creditCost;
                                const bulkCost = Math.ceil((singleCost * 10) * 0.9);
                                const canDrawOne = packCredits >= singleCost;
                                const canDrawTen = packCredits >= bulkCost;
                                return (
                                    <div key={pack.id} className={`flex-1 min-w-[100px] rounded-xl overflow-hidden shadow-md flex flex-col bg-gradient-to-b ${pack.color} h-full`}>
                                        <div className="flex-1 flex flex-col items-center justify-center bg-black/20 py-4">
                                            <div className="text-4xl drop-shadow-md">{pack.icon}</div>
                                        </div>
                                        <div className="p-2 flex flex-col items-center text-center bg-black/40 w-full gap-1">
                                            <h3 className="text-xs font-black font-display text-white uppercase drop-shadow leading-none">{pack.name} Pack</h3>
                                            <button onClick={() => handleDraw(pack.id, 1)} disabled={!canDrawOne}
                                                className={`btn-3d w-full py-1 rounded-md font-bold text-white uppercase text-[9px] ${canDrawOne ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700'}`}>
                                                1x ({singleCost} 📦)
                                            </button>
                                            <button onClick={() => handleDraw(pack.id, 10)} disabled={!canDrawTen}
                                                className={`btn-3d w-full py-1 rounded-md font-bold text-white uppercase text-[9px] relative overflow-hidden ${canDrawTen ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:brightness-110' : 'bg-gray-700'}`}>
                                                10x ({bulkCost} 📦)
                                                {canDrawTen && <div className="absolute top-0 right-0 bg-red-600 text-[6px] px-0.5 font-black text-white">10% Off</div>}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Single Deck card view — horizontal row */}
                    {selectedDeckId && (
                        <div className="flex flex-col h-full">
                            {/* Completion reward — centered, no container */}
                            <div className="shrink-0 text-center mb-2">
                                <div className="text-yellow-400 text-[8px] font-black uppercase tracking-widest">🏆 Completion Reward</div>
                                <div className="text-white font-black text-lg font-mono leading-none">{formatCommaNumber(getDeckReward(selectedDeckId))}</div>
                                <div className="mt-1">
                                    {decks.find(d => d.gameId === selectedDeckId)?.isCompleted ? (
                                        decks.find(d => d.gameId === selectedDeckId)?.rewardClaimed ? (
                                            <span className="text-gray-500 text-[9px] font-bold uppercase">Reward Claimed</span>
                                        ) : (
                                            <button onClick={() => onClaimDeckReward(selectedDeckId!, getDeckReward(selectedDeckId))} className="btn-3d bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-1 rounded-lg font-black text-black text-[10px] uppercase shadow-md">Claim Reward</button>
                                        )
                                    ) : (
                                        <span className="text-gray-500 text-[8px] font-bold uppercase">Collect all cards to claim</span>
                                    )}
                                </div>
                            </div>
                            <div ref={deckCardsScrollRef} className="flex-1 overflow-x-auto no-scrollbar">
                                <div className="flex gap-2 h-full items-stretch min-w-max py-0.5">
                                    {decks.find(d => d.gameId === selectedDeckId)?.cards.map((card, i) => {
                                        const rarityColor = card.rarity === 'LEGENDARY' ? '#f59e0b' : card.rarity === 'EPIC' ? '#a855f7' : card.rarity === 'RARE' ? '#3b82f6' : '#6b7280';
                                        const isLocked = card.count === 0;
                                        return (
                                            <div key={i} className={`flex-none rounded-xl ${getCardStyle(card.rarity, isLocked)} flex flex-col items-center relative overflow-hidden`}
                                                style={{ width: '72px', border: `1.5px solid ${rarityColor}44` }}>
                                                {/* Card inner frame */}
                                                <div className="absolute inset-[4px] rounded-lg pointer-events-none" style={{ border: `1px solid ${rarityColor}30` }}></div>
                                                {/* Rarity corner badge top-left */}
                                                <div className="absolute top-1 left-1 z-10">
                                                    <span className={`text-[6px] font-black uppercase px-1 py-0.5 rounded-sm ${card.rarity === 'LEGENDARY' ? 'bg-yellow-500 text-black' : card.rarity === 'EPIC' ? 'bg-purple-600 text-white' : card.rarity === 'RARE' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'}`}>{card.rarity[0]}</span>
                                                </div>
                                                {/* Count badge top-right */}
                                                {card.count > 0 && (
                                                    <div className="absolute top-1 right-1 z-10">
                                                        <span className="text-[6px] font-bold bg-black/60 text-white px-1 py-0.5 rounded-sm">×{card.count}</span>
                                                    </div>
                                                )}
                                                {/* Icon — centered, large */}
                                                <div className="flex-1 flex items-center justify-center w-full">
                                                    <span className="text-3xl leading-none drop-shadow-md">{isLocked ? '🔒' : card.icon}</span>
                                                </div>
                                                {/* Name bar at bottom */}
                                                <div className="w-full shrink-0 px-1 pb-1.5">
                                                    <div className="text-[7px] font-black text-center w-full truncate leading-none py-0.5 rounded-sm"
                                                        style={{ background: `${rarityColor}22`, color: isLocked ? '#555' : 'white' }}>
                                                        {card.name}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
        </div>
    );
};
