import React, { useState, useEffect } from 'react';
import { Deck, Card, CardRarity } from '../types';
import { formatNumber, PACK_COSTS, formatCommaNumber, GAMES_CONFIG } from '../constants';
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
    premiumPackCredits?: number;
    onBuyPremiumCredits?: (gemCost: number, credits: number) => void;
    onExchangeCards?: (exchanges: { deckId: string; cardIdx: number; removeCount: number }[]) => void;
    onGainGems?: (amount: number) => void;
    maxBet?: number;
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
    getDeckReward = (_deckId: string) => 0,
    premiumPackCredits = 0,
    onBuyPremiumCredits,
    onExchangeCards,
    onGainGems,
    maxBet = 10000
}) => {
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'ALBUM' | 'PACKS'>(initialTab || 'ALBUM');
    const [showPackBuyPopup, setShowPackBuyPopup] = useState<'standard' | 'premium' | null>(null);
    const [showExchangePanel, setShowExchangePanel] = useState(false);
    const [showDrawPopup, setShowDrawPopup] = useState(false);
    const [selectedDuplicateIds, setSelectedDuplicateIds] = useState<Set<string>>(new Set());
    const albumScrollRef = React.useRef<HTMLDivElement>(null);
    const deckCardsScrollRef = React.useRef<HTMLDivElement>(null);
    const packStoreScrollRef = React.useRef<HTMLDivElement>(null);
    const packStorePremiumRef = React.useRef<HTMLDivElement>(null);

    const scrollPackStore = (section: 'standard' | 'premium') => {
        if (!packStoreScrollRef.current) return;
        if (section === 'premium' && packStorePremiumRef.current) {
            packStoreScrollRef.current.scrollTo({ left: packStorePremiumRef.current.offsetLeft - 8, behavior: 'smooth' });
        } else {
            packStoreScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        }
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
            setShowDrawPopup(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab === 'PACKS' ? 'ALBUM' : initialTab);
            if (initialTab === 'PACKS') setShowDrawPopup(true);
        }
    }, [isOpen, initialTab]);

    const closePack = () => {
        setIsOpeningPack(false);
        setPackStage('DONE');
        setOpenedCards([]);
        setLastPackId(null);
    };

    const CARD_TIER: Record<CardRarity, {
        frame: string; inner: string; innerLocked: string; badgeText: string;
    }> = {
        COMMON: {
            frame: 'linear-gradient(145deg,#d0d8e4 0%,#7a8a9c 30%,#c8d4e0 55%,#9aaabb 80%,#d0d8e4 100%)',
            inner: 'linear-gradient(180deg,#9aa6b6 0%,#6b7888 12%,#54606e 28%,#3a434e 55%,#181d24 100%)',
            innerLocked: 'linear-gradient(180deg,#2a313c 0%,#1a1f26 40%,#0c0f14 100%)',
            badgeText: '#e0ecf8',
        },
        RARE: {
            frame: 'linear-gradient(145deg,#88c0f8 0%,#1a5abf 30%,#88c0f8 55%,#4488e0 80%,#88c0f8 100%)',
            inner: 'linear-gradient(180deg,#4f9bf5 0%,#2f6fe0 12%,#1f50c0 28%,#163a90 55%,#081230 100%)',
            innerLocked: 'linear-gradient(180deg,#1a2740 0%,#0f1a30 40%,#060c18 100%)',
            badgeText: '#dceaff',
        },
        EPIC: {
            frame: 'linear-gradient(145deg,#f09090 0%,#a01020 30%,#f09090 55%,#cc3040 80%,#f09090 100%)',
            inner: 'linear-gradient(180deg,#f05858 0%,#d62e2e 12%,#b01c1c 28%,#7a1414 55%,#2c0606 100%)',
            innerLocked: 'linear-gradient(180deg,#2c1414 0%,#1c0c0c 40%,#100404 100%)',
            badgeText: '#ffdde0',
        },
        LEGENDARY: {
            frame: 'linear-gradient(145deg,#ffe060 0%,#c08010 30%,#ffe060 55%,#e09828 80%,#ffe060 100%)',
            inner: 'linear-gradient(180deg,#fbbf24 0%,#e09010 12%,#c07408 28%,#8a4f06 55%,#2e1902 100%)',
            innerLocked: 'linear-gradient(180deg,#2c2008 0%,#1c1404 40%,#100a00 100%)',
            badgeText: '#fff3c4',
        },
    };

    // Keep for the tiny duplicate exchange cards
    const getCardBorder = (rarity: CardRarity): string => {
        switch(rarity) {
            case 'LEGENDARY': return '#fde68a';
            case 'EPIC': return '#f09090';
            case 'RARE': return '#88c0f8';
            default: return '#94a3b8';
        }
    };

    const rarityOrder: Record<CardRarity, number> = {
        'COMMON': 0, 'RARE': 1, 'EPIC': 2, 'LEGENDARY': 3
    };

    const handleDraw = (packId: string, count: number) => {
        setShowDrawPopup(false);
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
        { id: 'super', name: 'Standard', credits: packCredits, emoji: '🃏', img: '/card_normal.png', color: 'from-blue-700 to-blue-900', gemRate: 4.5 },
        { id: 'ultra', name: 'Premium',  credits: premiumPackCredits, emoji: '🎴', img: '/card_premium.png', color: 'from-yellow-600 to-yellow-800', gemRate: 18 },
    ];

    const abbrev18 = (n: number): string => {
        const s = formatCommaNumber(n);
        if (s.length <= 15) return s;
        const tiers: [number, string][] = [[1e15,'Q'],[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'K']];
        for (const [div, sfx] of tiers) {
            if (n >= div) return (n / div).toFixed(1).replace(/\.0$/, '') + sfx;
        }
        return s;
    };

    if (!isOpen) return null;

    const allDuplicates: { deckId: string; cardIdx: number; card: import('../types').Card; extraCount: number }[] = [];
    decks.forEach(deck => {
        deck.cards.forEach((card, idx) => {
            const extraCopies = (card.count || 0) - 1;
            if (extraCopies > 0) {
                const st = String(card.symbolType);
                if (!['TEN','JACK','QUEEN','KING','ACE'].includes(st) && !st.startsWith('JACKPOT') && card.icon !== '🪙') {
                    allDuplicates.push({ deckId: deck.gameId, cardIdx: idx, card, extraCount: extraCopies });
                }
            }
        });
    });

    const getExchangeGems = (ids: Set<string>) => {
        let gems = 0;
        allDuplicates.forEach(dup => {
            const key = `${dup.deckId}-${dup.cardIdx}`;
            if (!ids.has(key)) return;
            const perCard = dup.card.rarity === 'COMMON' ? 1 : dup.card.rarity === 'RARE' ? 2 : dup.card.rarity === 'EPIC' ? 4 : 10;
            gems += dup.extraCount * perCard;
        });
        return gems;
    };

    const handleExchangeDuplicates = (ids: Set<string>) => {
        if (ids.size === 0) return;
        const gems = getExchangeGems(ids);
        if (gems > 0) onGainGems?.(gems);
        const exchanges = allDuplicates
            .filter(dup => ids.has(`${dup.deckId}-${dup.cardIdx}`))
            .map(dup => ({ deckId: dup.deckId, cardIdx: dup.cardIdx, removeCount: dup.extraCount }));
        if (exchanges.length > 0) onExchangeCards?.(exchanges);
        setShowExchangePanel(false);
        setSelectedDuplicateIds(new Set());
    };

    const getDeckThemeEmoji = (theme: string) => {
        return theme === 'NEON' ? '🎰' : theme === 'EGYPT' ? '🦂' : theme === 'DRAGON' ? '🐉' : theme === 'PIRATE' ? '🏴‍☠️' : theme === 'SPACE' ? '👽' : theme === 'PIGGY' ? '🐷' : theme === 'CANDY' ? '🧁' : theme === 'JUNGLE' ? '🦍' : theme === 'UNDERWATER' ? '🦈' : theme === 'WESTERN' ? '🤠' : theme === 'SAMURAI' ? '⚔️' : '🃏';
    };

    const getDeckThemeBg = (theme: string) => {
        return theme === 'NEON' ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : theme === 'EGYPT' ? 'linear-gradient(135deg,#b45309,#78350f)' : theme === 'DRAGON' ? 'linear-gradient(135deg,#dc2626,#7f1d1d)' : theme === 'PIRATE' ? 'linear-gradient(135deg,#0369a1,#0c4a6e)' : theme === 'SPACE' ? 'linear-gradient(135deg,#1d4ed8,#0f172a)' : theme === 'CANDY' ? 'linear-gradient(135deg,#db2777,#9d174d)' : theme === 'JUNGLE' ? 'linear-gradient(135deg,#15803d,#14532d)' : theme === 'UNDERWATER' ? 'linear-gradient(135deg,#0891b2,#164e63)' : theme === 'WESTERN' ? 'linear-gradient(135deg,#ca8a04,#713f12)' : theme === 'SAMURAI' ? 'linear-gradient(135deg,#9f1239,#4c0519)' : theme === 'PIGGY' ? 'linear-gradient(135deg,#ec4899,#9d174d)' : 'linear-gradient(135deg,#475569,#1e293b)';
    };

    return (
        <div className="absolute inset-0 z-[150] flex flex-col animate-pop-in" style={{ background: 'linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)),url(/album_background.jpg) center/cover no-repeat' }}>
            {/* Duplicate Exchange — centered modal */}
            {showExchangePanel && (
                <div className="absolute inset-0 z-[175] flex items-center justify-center bg-black/10 backdrop-blur-md animate-pop-in"
                    onClick={() => { setShowExchangePanel(false); setSelectedDuplicateIds(new Set()); }}>
                    <div className="rounded-2xl overflow-hidden shadow-2xl flex flex-col relative"
                        style={{ width: 680, maxWidth: '94%', height: 440, maxHeight: '88%', background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}
                        onClick={e => e.stopPropagation()}>
                    <div className="shrink-0 flex items-center gap-2 px-3 py-2">
                        <span className="font-tanker text-white text-sm flex-1">Exchange Duplicates</span>
                        <button onClick={() => { setShowExchangePanel(false); setSelectedDuplicateIds(new Set()); }}
                            className="round-btn shrink-0"><i className="ti ti-x" /></button>
                    </div>
                    {allDuplicates.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-white/50 text-sm font-bold uppercase">No duplicates yet</div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto no-scrollbar p-2 grid grid-cols-10 gap-1.5 content-start">
                                {allDuplicates.map((dup) => {
                                    const key = `${dup.deckId}-${dup.cardIdx}`;
                                    const sel = selectedDuplicateIds.has(key);
                                    const borderColor = getCardBorder(dup.card.rarity);
                                    return (
                                        <button key={key} onClick={() => {
                                            setSelectedDuplicateIds(prev => {
                                                const next = new Set(prev);
                                                sel ? next.delete(key) : next.add(key);
                                                return next;
                                            });
                                        }} className="relative transition-all active:scale-95"
                                            style={{ aspectRatio: '2/3', borderRadius: 8, background: sel ? '#fde68a' : CARD_TIER[dup.card.rarity].frame, padding: 2, boxShadow: sel ? '0 0 10px #fde68aaa' : 'none' }}>
                                            {sel && <div className="absolute inset-0 z-10 rounded-lg" style={{ background: 'rgba(255,220,80,0.25)', borderRadius: 8 }} />}
                                            <div style={{ width: '100%', height: '100%', borderRadius: 6, background: CARD_TIER[dup.card.rarity].inner, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                                <div style={{ padding: '2px 2px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <span style={{ fontSize: 6, fontWeight: 900, textTransform: 'uppercase', background: CARD_TIER[dup.card.rarity].frame, color: CARD_TIER[dup.card.rarity].badgeText, padding: '1px 3px', borderRadius: 9999, lineHeight: 1.4 }}>{dup.card.rarity[0]}</span>
                                                    {dup.extraCount > 1 && (
                                                        <span style={{ fontSize: 6, fontWeight: 900, color: '#fde047', background: 'rgba(0,0,0,0.6)', padding: '1px 2px', borderRadius: 2, lineHeight: 1.4 }}>×{dup.extraCount}</span>
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {dup.card.icon.startsWith('/') ? (
                                                        <img src={dup.card.icon} alt="" style={{ width: '1.4rem', height: '1.4rem', objectFit: 'contain' }} />
                                                    ) : (
                                                        <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{dup.card.icon}</span>
                                                    )}
                                                </div>
                                                <div style={{ padding: '0 1px 2px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: 6, fontWeight: 700, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dup.card.name}</div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="shrink-0 flex items-center gap-2 px-3 py-2" style={{ background: 'rgba(0,0,0,0.5)' }}>
                                {(() => {
                                    const gems = getExchangeGems(selectedDuplicateIds);
                                    return (
                                        <div className="flex-1 flex items-center gap-2 flex-wrap">
                                            <span className="text-white/60 text-xs font-black uppercase tracking-wide shrink-0">{selectedDuplicateIds.size} Selected:</span>
                                            {gems > 0 ? <span className="text-blue-300 text-sm font-black shrink-0 flex items-center gap-1"><img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> {gems} Gems</span> : <span className="text-white/20 text-xs font-bold">—</span>}
                                        </div>
                                    );
                                })()}
                                <button onClick={() => setSelectedDuplicateIds(new Set(allDuplicates.map(d => `${d.deckId}-${d.cardIdx}`)))}
                                    className="pill-green">
                                    <div className="pill-face" style={{ padding: '4px 10px', fontSize: '10px' }}>All</div>
                                </button>
                                <button disabled={selectedDuplicateIds.size === 0}
                                    onClick={() => handleExchangeDuplicates(selectedDuplicateIds)}
                                    className={`pill-green${selectedDuplicateIds.size === 0 ? ' opacity-40' : ''}`}>
                                    <div className="pill-face" style={{ padding: '4px 10px', fontSize: '10px' }}>Exchange</div>
                                </button>
                            </div>
                        </>
                    )}
                    </div>
                </div>
            )}

            {/* Pack Opening Overlay */}
            {isOpeningPack && (
                <div className="absolute inset-0 z-[160] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-3">
                    {packStage === 'SHAKING' && (
                        <div className="text-6xl animate-bounce drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] pointer-events-none">{lastPackId === 'ultra' ? '🎴' : '🃏'}</div>
                    )}
                    {packStage === 'BURST' && (
                        <div className="text-6xl scale-125 transition-transform duration-300 opacity-0 pointer-events-none">💥</div>
                    )}
                    {packStage === 'REVEAL' && (
                        <div className="w-full h-full flex flex-col items-center justify-center animate-pop-in relative py-4">
                            <div className="flex-1 w-full max-w-2xl px-2 overflow-y-auto grid grid-cols-5 gap-2 content-center justify-items-center">
                                {openedCards.filter(card => { const st = String(card.symbolType); return !['TEN','JACK','QUEEN','KING','ACE'].includes(st) && !st.startsWith('JACKPOT') && card.icon !== '🪙'; }).map((card, i) => {
                                    const borderColor = getCardBorder(card.rarity);
                                    return (
                                    <div
                                        key={i}
                                        className="relative w-full max-w-[80px] animate-pop-in"
                                        style={{ animationDelay: `${i * 30}ms`, aspectRatio: '2/3', borderRadius: 12 }}
                                    >
                                        {/* Metallic frame */}
                                        <div style={{ position: 'absolute', inset: 0, borderRadius: 12, background: CARD_TIER[card.rarity].frame, padding: 3 }}>
                                            <div style={{ width: '100%', height: '100%', borderRadius: 9, background: CARD_TIER[card.rarity].inner, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                                                <div style={{ padding: '4px 4px 0', display: 'flex', justifyContent: 'center' }}>
                                                    <span style={{ fontSize: 6, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: CARD_TIER[card.rarity].frame, color: CARD_TIER[card.rarity].badgeText, padding: '1px 5px', borderRadius: 9999, lineHeight: 1.5 }}>
                                                        {card.rarity}
                                                    </span>
                                                </div>
                                                {card.isNew && <div className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[6px] font-black px-0.5 rounded z-20">NEW</div>}
                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {card.icon.startsWith('/') ? (
                                                        <img src={card.icon} alt="" style={{ width: '2.8rem', height: '2.8rem', objectFit: 'contain', filter: 'drop-shadow(0 1px 6px rgba(0,0,0,0.8))' }} />
                                                    ) : (
                                                        <span style={{ fontSize: '2.8rem', lineHeight: 1 }}>{card.icon}</span>
                                                    )}
                                                </div>
                                                <div style={{ padding: '0 3px 4px' }}>
                                                    <div style={{ background: CARD_TIER[card.rarity].frame, borderRadius: 4, padding: '2px 4px', textAlign: 'center', fontSize: 7, fontWeight: 900, color: CARD_TIER[card.rarity].badgeText, letterSpacing: '0.04em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                                                    {card.isDuplicate && <div style={{ textAlign: 'center', color: '#fde047', fontSize: 6, fontWeight: 900, textTransform: 'uppercase', marginTop: 1 }}>Dup</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                            <div className="shrink-0 mt-4 flex flex-col sm:flex-row gap-2 z-50 items-center bg-black/70 p-2.5 rounded-xl">
                                <button onClick={closePack} className="pill-green">
                                    <div className="pill-face" style={{ padding: '6px 16px', fontSize: '10px' }}>Close</div>
                                </button>
                                {lastPackId && (
                                    <div className="flex gap-1.5 items-center">
                                        <button onClick={() => { setPackStage('DONE'); setOpenedCards([]); setTimeout(() => handleDraw(lastPackId!, 1), 100); }}
                                            className="pill-green">
                                            <div className="pill-face" style={{ padding: '6px 14px', fontSize: '10px' }}>1×</div>
                                        </button>
                                        <button onClick={() => { setPackStage('DONE'); setOpenedCards([]); setTimeout(() => handleDraw(lastPackId!, 10), 100); }}
                                            className="pill-green relative">
                                            <div className="pill-face" style={{ padding: '6px 14px', fontSize: '10px' }}>10×</div>
                                            <span className="absolute top-0 right-0 bg-red-600 text-[6px] px-0.5 font-black text-white z-10">-10%</span>
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
            <div className="px-3 py-2 flex items-center gap-2 shrink-0 z-10">
                {selectedDeckId && (
                    <button onClick={() => setSelectedDeckId(null)} className="round-btn shrink-0">
                        <i className="ti ti-arrow-left"></i>
                    </button>
                )}
                <h2 className="text-white font-tanker text-base shrink-0">
                    {selectedDeckId ? decks.find(d => d.gameId === selectedDeckId)?.gameName : 'Album'}
                </h2>

                <div className="flex-1"></div>

                <div className="flex items-center gap-1.5 text-[10px]">
                    <div className="currency-pill flex items-center gap-1 shrink-0" style={{ background: 'rgba(0,0,0,0.55)' }}>
                        <div className="coin">$</div>
                        <span className="num">{formatNumber(balance)}</span>
                    </div>
                    <div className="currency-pill flex items-center gap-1 shrink-0" style={{ background: 'rgba(0,0,0,0.55)' }}>
                        <div className="gem"></div>
                        <span className="num">{formatNumber(diamonds)}</span>
                        <button onClick={() => onOpenShop('DIAMONDS')} className="pill-green" style={{ fontSize: '9px' }}>
                            <div className="pill-face" style={{ padding: '2px 6px', fontSize: '9px' }}>Buy</div>
                        </button>
                    </div>
                    <div className="currency-pill flex items-center gap-1 shrink-0">
                        <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>🃏</span>
                        <span className="num">{packCredits}</span>
                    </div>
                    <div className="currency-pill flex items-center gap-1 shrink-0">
                        <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>🎴</span>
                        <span className="num">{premiumPackCredits}</span>
                    </div>
                </div>
                <div className="round-btn cursor-pointer shrink-0 ml-1" onClick={onClose}><i className="ti ti-x"></i></div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-hidden no-scrollbar p-3 min-h-0">

                {/* ALBUM view */}
                {!selectedDeckId && (
                    <div className="flex flex-col h-full">
                        <div className="flex-1" />
                        {/* Album scroll strip — fixed height (half the available area) */}
                        <div ref={albumScrollRef} className="overflow-x-auto no-scrollbar shrink-0">
                            <div className="flex gap-3" style={{ minWidth: 'max-content', paddingBottom: 2 }}>
                                {decks.map(deck => {
                                    const collected = deck.cards.filter(c => c.count > 0).length;
                                    const isComplete = collected === 7;
                                    return (
                                        <div key={deck.gameId} className="flex-none flex flex-col items-center" style={{ width: 118 }}>
                                            <button onClick={() => setSelectedDeckId(deck.gameId)}
                                                className="w-full flex flex-col items-center p-2 rounded-xl active:scale-95 transition-transform"
                                                style={{ height: 138, background: 'linear-gradient(180deg,rgba(160,60,255,0.55) 0%,rgba(10,0,50,0.92) 100%)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.5), 0 3px 10px rgba(0,0,0,0.6)' }}>
                                                <div className="w-full flex-1 rounded-lg flex items-center justify-center overflow-hidden relative min-h-0"
                                                    style={{ background: getDeckThemeBg(deck.theme) }}>
                                                    {(() => {
                                                        const gameConf = GAMES_CONFIG.find(g => g.id === deck.gameId);
                                                        return gameConf?.coverImage
                                                            ? <img src={gameConf.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                                            : <div className="text-[3.5rem] drop-shadow-2xl leading-none">{getDeckThemeEmoji(deck.theme)}</div>;
                                                    })()}
                                                    {isComplete && <div className="absolute top-0.5 right-0.5 text-xs z-10">✅</div>}
                                                </div>
                                                <div className="mt-1 text-center w-full">
                                                    <h3 className="text-white font-black font-display text-[11px] truncate leading-none">{deck.gameName}</h3>
                                                    <div className="text-purple-300 font-bold text-[9px] mt-0.5">{collected}/7</div>
                                                </div>
                                            </button>
                                            {/* Per-album completion reward — outside the card container */}
                                            <div className="mt-1 text-center">
                                                <div className="text-yellow-300 font-black text-[9px]">{abbrev18(getDeckReward(deck.gameId))}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Grand reward row — reward centered, draw switcher far right */}
                        <div className="shrink-0 relative flex items-center justify-center mt-4 px-2">
                            <div className="text-center">
                                <div className="text-white font-black text-xs tracking-wide">Grand Reward</div>
                                <div className="text-white font-black font-mono leading-tight" style={{ fontSize: '2.4rem' }}>{abbrev18(grandPrize)}</div>
                            </div>
                            <button onClick={() => setShowDrawPopup(true)} className="pill-green absolute right-2">
                                <div className="pill-face" style={{ padding: '6px 14px', fontSize: '11px' }}>Draw Cards</div>
                            </button>
                        </div>

                        <div className="flex-1" />
                    </div>
                )}

                {/* Single Deck card view */}
                {selectedDeckId && (
                    <div className="flex flex-col h-full">
                        <div className="shrink-0 text-center mb-2">
                            <div className="text-yellow-400 text-[8px] font-black uppercase tracking-widest">Completion Reward</div>
                            <div className="text-white font-black text-lg font-mono leading-none">{formatCommaNumber(getDeckReward(selectedDeckId))}</div>
                            <div className="mt-1">
                                {decks.find(d => d.gameId === selectedDeckId)?.isCompleted ? (
                                    decks.find(d => d.gameId === selectedDeckId)?.rewardClaimed ? (
                                        <span className="text-gray-500 text-[9px] font-bold uppercase">Reward Claimed</span>
                                    ) : (
                                        <button onClick={() => onClaimDeckReward(selectedDeckId!, getDeckReward(selectedDeckId))} className="pill-green">
                                            <div className="pill-face" style={{ padding: '6px 20px', fontSize: '10px' }}>Claim Reward</div>
                                        </button>
                                    )
                                ) : (
                                    <span className="text-gray-500 text-[8px] font-bold uppercase">Collect all cards to claim</span>
                                )}
                            </div>
                        </div>
                        <div ref={deckCardsScrollRef} className="flex-1 overflow-x-auto no-scrollbar">
                            <div className="flex gap-2 h-full items-stretch min-w-max py-0.5">
                                {decks.find(d => d.gameId === selectedDeckId)?.cards
                                    .filter(card => {
                                        const st = String(card.symbolType);
                                        if (['TEN','JACK','QUEEN','KING','ACE'].includes(st)) return false;
                                        if (st.startsWith('JACKPOT')) return false;
                                        if (card.icon === '🪙') return false;
                                        return true;
                                    })
                                    .map((card, i) => {
                                    const borderColor = getCardBorder(card.rarity);
                                    const isLocked = card.count === 0;
                                    return (
                                        <div key={i}
                                            className="flex-none relative"
                                            style={{ width: 140, height: 220, borderRadius: 16, flexShrink: 0 }}>
                                            {/* Metallic frame border */}
                                            <div style={{ position: 'absolute', inset: 0, borderRadius: 16, background: isLocked ? 'linear-gradient(145deg,#3a4050,#252c38)' : CARD_TIER[card.rarity].frame, padding: 4 }}>
                                                <div style={{ width: '100%', height: '100%', borderRadius: 12, background: isLocked ? CARD_TIER[card.rarity].innerLocked : CARD_TIER[card.rarity].inner, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                                                    {/* Top: tier badge + count */}
                                                    <div style={{ padding: '8px 10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', background: isLocked ? 'rgba(255,255,255,0.08)' : CARD_TIER[card.rarity].frame, color: isLocked ? 'rgba(255,255,255,0.25)' : CARD_TIER[card.rarity].badgeText, padding: '2px 7px', borderRadius: 9999, lineHeight: 1.5 }}>
                                                            {card.rarity}
                                                        </span>
                                                        {card.count > 0 && (
                                                            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', background: 'rgba(0,0,0,0.5)', padding: '1px 5px', borderRadius: 4 }}>×{card.count}</span>
                                                        )}
                                                    </div>
                                                    {/* Middle: symbol */}
                                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {isLocked ? (
                                                            <img src="/ui/lock.png" alt="" style={{ width: '4rem', height: '4rem', objectFit: 'contain', opacity: 0.3 }} />
                                                        ) : card.icon.startsWith('/') ? (
                                                            <img src={card.icon} alt="" style={{ width: '4.9rem', height: '4.9rem', objectFit: 'contain', filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.9))' }} />
                                                        ) : (
                                                            <span style={{ fontSize: '4.9rem', lineHeight: 1 }}>{card.icon}</span>
                                                        )}
                                                    </div>
                                                    {/* Bottom: name plate */}
                                                    <div style={{ padding: '0 8px 10px' }}>
                                                        <div style={{ background: isLocked ? 'rgba(255,255,255,0.04)' : CARD_TIER[card.rarity].frame, borderRadius: 7, padding: '5px 8px', textAlign: 'center', fontSize: 11, fontWeight: 900, color: isLocked ? 'rgba(255,255,255,0.18)' : CARD_TIER[card.rarity].badgeText, letterSpacing: '0.05em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {card.name}
                                                        </div>
                                                    </div>
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

            {/* Draw Cards Popup — centered floating card */}
            {showDrawPopup && (
                <div className="absolute inset-0 z-[165] flex items-center justify-center bg-black/10 backdrop-blur-md animate-pop-in"
                    onClick={() => setShowDrawPopup(false)}>
                    <div className="rounded-2xl overflow-hidden shadow-2xl flex flex-col relative"
                        style={{ width: 680, maxWidth: '94%', height: 320, maxHeight: '88%', background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}
                        onClick={e => e.stopPropagation()}>
                        {/* Seamless topbar */}
                        <div className="shrink-0 flex items-center gap-2 px-3 py-2">
                            <span className="text-white font-tanker text-sm flex-1">Draw Cards</span>
                            <div className="flex items-center gap-1.5 text-[10px]">
                                <div className="currency-pill flex items-center gap-1 shrink-0" style={{ background: 'rgba(0,0,0,0.55)' }}>
                                    <div className="gem"></div>
                                    <span className="num">{formatNumber(diamonds)}</span>
                                </div>
                                <div className="currency-pill flex items-center gap-1 shrink-0">
                                    <span style={{ fontSize: '14px', lineHeight: 1 }}>🃏</span>
                                    <span className="num">{packCredits}</span>
                                </div>
                                <div className="currency-pill flex items-center gap-1 shrink-0">
                                    <span style={{ fontSize: '14px', lineHeight: 1 }}>🎴</span>
                                    <span className="num">{premiumPackCredits}</span>
                                </div>
                            </div>
                            <button onClick={() => setShowDrawPopup(false)} className="round-btn shrink-0"><i className="ti ti-x" /></button>
                        </div>

                        {/* Content — draw packs (left) + right-side actions (vertically centered) */}
                        <div className="flex-1 min-h-0 flex p-3 gap-3 items-stretch">
                            {/* Pack draw options */}
                            <div className="flex-1 flex gap-3 justify-center items-stretch min-h-0">
                                {packOptions.map(pack => {
                                    const canDrawOne = pack.credits >= 1;
                                    const canDrawTen = pack.credits >= 9;
                                    return (
                                        <div key={pack.id} className="flex flex-col items-center justify-between" style={{ width: 160 }}>
                                            {/* Card image as the pack container */}
                                            <div className="flex-1 min-h-0 flex items-center justify-center w-full relative">
                                                <img src={pack.img} alt={pack.name}
                                                    style={{ height: '100%', maxHeight: 160, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.55))' }} />
                                            </div>
                                            <div className="text-center mt-1 shrink-0">
                                                <div className="font-black text-white text-sm tracking-wide leading-none">{pack.name}</div>
                                                <div className="font-bold text-white/50 text-[11px] mt-0.5">{pack.credits} packs</div>
                                            </div>
                                            <div className="flex flex-col gap-1.5 mt-2 w-full shrink-0">
                                                <button onClick={() => handleDraw(pack.id, 1)} disabled={!canDrawOne}
                                                    className={`pill-green w-full${!canDrawOne ? ' opacity-40' : ''}`}>
                                                    <div className="pill-face" style={{ padding: '6px 8px', fontSize: '10px' }}>Draw 1×</div>
                                                </button>
                                                <button onClick={() => handleDraw(pack.id, 10)} disabled={!canDrawTen}
                                                    className={`pill-green w-full relative${!canDrawTen ? ' opacity-40' : ''}`}>
                                                    <div className="pill-face" style={{ padding: '6px 8px', fontSize: '10px' }}>Draw 10×</div>
                                                    {canDrawTen && <div className="absolute top-0 right-0 bg-red-600 text-[6px] px-0.5 font-black text-white z-10">-10%</div>}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Right side — vertically centered actions */}
                            <div className="shrink-0 flex flex-col justify-center gap-2" style={{ width: 140 }}>
                                <button onClick={() => setShowPackBuyPopup('standard')} className="pill-green w-full">
                                    <div className="pill-face" style={{ padding: '10px 8px', fontSize: '10px' }}>Buy Packs</div>
                                </button>
                                <button onClick={() => setShowExchangePanel(true)} className="pill-green w-full relative">
                                    <div className="pill-face" style={{ padding: '10px 8px', fontSize: '10px' }}>Exchange Duplicates</div>
                                    {allDuplicates.length > 0 && (
                                        <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-600 rounded-full border border-yellow-400 flex items-center justify-center px-0.5 z-10">
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{allDuplicates.length > 99 ? '99+' : allDuplicates.length}</span>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Card Pack Buy Popup */}
            {showPackBuyPopup && (
                <div className="absolute inset-0 z-[175] flex items-center justify-center bg-black/10 backdrop-blur-md"
                    onClick={() => setShowPackBuyPopup(null)}>
                    <div className="rounded-2xl overflow-hidden shadow-2xl flex flex-col relative"
                        style={{ width: 680, maxWidth: '94%', height: 250, maxHeight: '88%', background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}
                        onClick={e => e.stopPropagation()}>
                        {/* Seamless topbar */}
                        <div className="shrink-0 flex items-center gap-2 px-3 py-2 relative">
                            <span className="absolute left-0 right-0 text-center text-white font-tanker text-base pointer-events-none">Buy Packs</span>
                            <div className="flex items-center gap-1.5 ml-auto z-10">
                                <div className="currency-pill flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,0.55)' }}>
                                    <img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} />
                                    <span className="text-white font-black text-sm">{formatNumber(diamonds)}</span>
                                    <button onClick={() => { setShowPackBuyPopup(null); onOpenShop('DIAMONDS'); }} className="pill-green" style={{ fontSize: '9px' }}>
                                        <div className="pill-face" style={{ padding: '2px 6px', fontSize: '9px' }}>Buy</div>
                                    </button>
                                </div>
                                <button onClick={() => setShowPackBuyPopup(null)} className="round-btn"><i className="ti ti-x" /></button>
                            </div>
                        </div>
                        <div ref={packStoreScrollRef} className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar px-3 pb-3">
                            <div className="flex gap-3 h-full items-stretch" style={{ minWidth: 'max-content' }}>
                                <div className="flex flex-col justify-center shrink-0">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-blue-300/60"
                                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.2em' }}>
                                        Standard
                                    </div>
                                </div>
                                {[
                                    { name: 'Starter', emoji: '🃏', gemCost: 80, packs: 10, contents: ['10 Standard Packs', `+${formatCommaNumber(Math.round(maxBet * 25))} Coins`], bg: 'linear-gradient(160deg,#0f1f55,#1a35a0)', accent: '#3b82f6', shadowClr: '#1e3a8a', dotColor: 'text-blue-300', textColor: 'text-blue-100/80' },
                                    { name: 'Pro Bundle', emoji: '🃏', gemCost: 280, packs: 30, contents: ['30 Standard Packs', `+${formatCommaNumber(Math.round(maxBet * 100))} Coins`], bg: 'linear-gradient(160deg,#1e3a8a,#1d4ed8)', accent: '#60a5fa', shadowClr: '#1e3a8a', dotColor: 'text-blue-300', textColor: 'text-blue-100/80' },
                                ].map(opt => {
                                    const canAfford = diamonds >= opt.gemCost;
                                    return (
                                        <div key={opt.name} className="flex-none flex flex-col rounded-2xl overflow-hidden shrink-0"
                                            style={{ width: 140, background: opt.bg, opacity: canAfford ? 1 : 0.55 }}>
                                            <div className="px-3 pt-3 pb-1 flex items-start gap-2 flex-1">
                                                <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{opt.emoji}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-black text-white text-[10px] uppercase tracking-wide leading-none">{opt.name}</div>
                                                    <div className="mt-1.5 flex flex-col gap-0.5">
                                                        {opt.contents.map((c, ci) => (
                                                            <div key={ci} className="flex items-center gap-1">
                                                                <span className={`${opt.dotColor} text-[8px]`}>✦</span>
                                                                <span className={`${opt.textColor} text-[9px] font-bold leading-tight`}>{c}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="px-3 pb-3 pt-1 shrink-0">
                                                <button onClick={() => { if (!canAfford) { audioService.playError(); return; } audioService.playPurchase(); onBuyCredits(opt.gemCost, opt.packs); setShowPackBuyPopup(null); }}
                                                    disabled={!canAfford}
                                                    className="pill-green w-full">
                                                    <div className="pill-face" style={{ padding: '6px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                        <img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> {opt.gemCost}
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="w-2 shrink-0" />
                                <div ref={packStorePremiumRef} className="flex flex-col justify-center shrink-0">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-purple-300/60"
                                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.2em' }}>
                                        Premium
                                    </div>
                                </div>
                                {[
                                    { name: 'Starter', emoji: '🎴', gemCost: 320, packs: 10, contents: ['10 Premium Packs', `+${formatCommaNumber(Math.round(maxBet * 50))} Coins`], bg: 'linear-gradient(160deg,#2e1065,#5b21b6)', accent: '#a855f7', shadowClr: '#2e1065', dotColor: 'text-purple-300', textColor: 'text-purple-100/80' },
                                    { name: 'Pro Bundle', emoji: '🎴', gemCost: 1100, packs: 30, contents: ['30 Premium Packs', `+${formatCommaNumber(Math.round(maxBet * 200))} Coins`], bg: 'linear-gradient(160deg,#3b0764,#6d28d9)', accent: '#c084fc', shadowClr: '#3b0764', dotColor: 'text-purple-300', textColor: 'text-purple-100/80' },
                                ].map(opt => {
                                    const canAfford = diamonds >= opt.gemCost;
                                    const buyFn = onBuyPremiumCredits;
                                    return (
                                        <div key={opt.name} className="flex-none flex flex-col rounded-2xl overflow-hidden shrink-0"
                                            style={{ width: 140, background: opt.bg, opacity: canAfford ? 1 : 0.55 }}>
                                            <div className="px-3 pt-3 pb-1 flex items-start gap-2 flex-1">
                                                <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{opt.emoji}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-black text-white text-[10px] uppercase tracking-wide leading-none">{opt.name}</div>
                                                    <div className="mt-1.5 flex flex-col gap-0.5">
                                                        {opt.contents.map((c, ci) => (
                                                            <div key={ci} className="flex items-center gap-1">
                                                                <span className={`${opt.dotColor} text-[8px]`}>✦</span>
                                                                <span className={`${opt.textColor} text-[9px] font-bold leading-tight`}>{c}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="px-3 pb-3 pt-1 shrink-0">
                                                <button onClick={() => { if (!canAfford || !buyFn) { audioService.playError(); return; } audioService.playPurchase(); buyFn(opt.gemCost, opt.packs); setShowPackBuyPopup(null); }}
                                                    disabled={!canAfford}
                                                    className="pill-green w-full">
                                                    <div className="pill-face" style={{ padding: '6px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                        <img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> {opt.gemCost}
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
