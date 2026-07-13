import React, { useState } from 'react';
import { GameConfig, GameTheme, SymbolType } from '../types';
import { GET_PAYLINES, GET_SYMBOLS } from '../constants';

// Plain-language mechanic explainer per slot, for player-facing disclosure — every
// theme here maps 1:1 to the mechanic actually implemented in the spin engine.
const MECHANIC_INFO: Record<GameTheme, { title: string; body: string }> = {
    PIGGY: { title: 'Coin Bank Free Spins', body: 'Land 6 or more coin symbols to trigger free spins. During free spins, coins substitute as wilds and also pay directly into your bank.' },
    ARCTIC: { title: 'Cascading Wins + Climbing Multiplier', body: 'Winning symbols explode and new ones cascade down for chain reactions. A multiplier climbs with each consecutive win during free spins. Spin enough to fill the progress bar for a bonus pick round.' },
    CANDY: { title: 'Wild Wheel Free Spins', body: '3 scatters trigger free spins. A spin-count roulette decides how many spins you get, then a wild wheel roulette assigns a switching wild pattern across the reels for the whole session.' },
    EGYPT: { title: 'Hold & Win Respins', body: 'Land 6 or more coin symbols to lock them in place and trigger 3 respins. Every new coin that lands resets the respin count. Coins can carry cash values or jackpot tiers.' },
    BUFFALO: { title: 'Ways to Win + Wild Multipliers', body: 'No fixed paylines — matching symbols pay as long as they land on adjacent reels starting from the leftmost reel, in any row. Wilds carry random multipliers that boost the whole spin’s win.' },
    FARM: { title: 'Mystery Symbols', body: 'During free spins, mystery tiles drop onto the reels. Once they stop, every mystery tile reveals the same randomly chosen symbol at once for big matching combos.' },
    JUNGLE: { title: 'Colossal Symbol', body: 'A giant symbol can occupy the center of the reels, acting as one large matching block across multiple paylines at once.' },
    PIRATE: { title: 'Ghost Ship Walking Wilds', body: 'A wild reel boards from the right and sails one reel to the left every respin, turning that whole column wild each time it stops, until it sails off the left edge.' },
    NEON: { title: 'Scatter Roulette', body: 'Land a gem on the third reel to trigger a roulette wheel that can award multipliers or one of five jackpot tiers.' },
    DRAGON: { title: 'High-Volatility Pick Bonus', body: 'A rare 4-scatter trigger unlocks a pick-and-win bonus grid packed with jackpot tiers.' },
    OLYMPUS: { title: 'Scatter Pays + Multiplier Orbs', body: 'No fixed paylines — enough matching symbols anywhere on the board pay based on count. Multiplier orbs land on the reels and sum together to multiply the whole spin’s win, with wins cascading like Arctic Freeze.' },
    SPACE: { title: 'Supernova Progressive Multiplier', body: 'Free spins carry a multiplier that climbs by 1x after every winning spin, capped at 15x, applying to every win for the rest of the session.' },
    BEAST: { title: 'Roulette Wild Multiplier', body: '3 scatters trigger a roulette that picks one wild multiplier (2x-5x), applying to every wild-assisted win for the whole free-spin session.' },
    ANGRYFLOCK: { title: 'Two-Stage Roulette Bonus', body: '3 scatters trigger a spin-count roulette, then a bird-color roulette that assigns a wild pattern for the free-spin session — scattered wilds, wild reels, or sticky wilds that lock in place.' },
    GOLDEN_POT: { title: 'Three Fortune Pots', body: 'Spins, Jackpot and Multiplier pots fill gradually as you play. Once any pot is full, every full pot can burst together — awarding free spins, a jackpot tier, and a multiplier all at once.' },
    SAMURAI: { title: 'Katana Wilds', body: 'A wild landing on the middle reels slashes its whole reel into wilds, holds it, and triggers a free respin. During free spins, every wild that lands stays locked for the rest of the session.' },
    MMORPG: { title: 'Boss Battle', body: 'Free spins are a boss fight — every win strikes the boss. Slaying it grants bonus spins and a permanent damage multiplier, then summons a tougher boss. In the base game, a rare Loot Goblin can transmute low symbols into a bigger match.' },
    UNDERWATER: { title: 'Pearl Hold & Spin', body: 'Land 3 or more pearls connected in a chain (any shape) to lock the board and trigger 3 respins — every new linked pearl resets the count. Only pearls connected in a chain of 3+ pay; a lone or paired pearl stays locked but scores nothing. A jackpot pearl always pays on its own, linked or not.' },
    WESTERN: { title: 'Gold Cart Bonus', body: '3 or more bonus symbols open a hold-and-spin cart with 3 respins — any new symbol landing resets the count. Payer symbols boost every other symbol once, Collectors absorb everyone else’s value, and Snipers double random symbols. Filling the whole cart doubles the total.' },
    LEPRECHAUN: { title: 'Rainbow Trail', body: '3 scatters open a trail bonus — spin to climb a rising ladder of multipliers up to 100x, or collect any time. Rarely, a near-miss line gets nudged into a win.' },
    PETS: { title: 'Choose Your Companion', body: '3 scatters let you pick a companion before free spins start — each grants a different spin count and mechanic: multiplier wins, sticky wilds, symbol upgrades, or extra wilds.' },
    PRINCESS: { title: 'Enchanted Mirror', body: 'Free spins crown one Chosen Symbol. Land 3 or more of it anywhere and every reel containing it expands fully, then rescores.' },
};

// These two evaluate wins by count/adjacency instead of fixed lines — showing line
// diagrams for them would misrepresent how they actually pay.
const NO_FIXED_PAYLINE_THEMES: GameTheme[] = ['BUFFALO', 'OLYMPUS'];

const KEY_SYMBOLS: { type: SymbolType; label: string }[] = [
    { type: SymbolType.WILD, label: 'Wild' },
    { type: SymbolType.SCATTER, label: 'Scatter' },
    { type: SymbolType.SEVEN, label: 'Seven' },
    { type: SymbolType.ACE, label: 'Ace' },
];

interface Props {
    isOpen: boolean;
    onClose: () => void;
    game: GameConfig;
}

type Tab = 'HOW' | 'PAYLINES';

export const GameInfoModal: React.FC<Props> = ({ isOpen, onClose, game }) => {
    const [tab, setTab] = useState<Tab>('HOW');
    if (!isOpen) return null;

    const info = MECHANIC_INFO[game.theme];
    const usesFixedPaylines = !NO_FIXED_PAYLINE_THEMES.includes(game.theme);
    const lines = usesFixedPaylines ? GET_PAYLINES(game.rows, game.reels) : [];
    const symbols = GET_SYMBOLS(game.theme);

    return (
        <div className="absolute inset-0 z-[220] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-pop-in select-none">
            <div className="w-full max-w-[480px] flex flex-col rounded-3xl overflow-hidden"
                style={{ maxHeight: '86vh', background: 'linear-gradient(180deg,#1e1b4b 0%,#0f0c29 100%)', boxShadow: 'inset 0 1px 0 rgba(196,181,253,0.25), 0 8px 32px rgba(0,0,0,0.85)' }}>

                <div className="shrink-0 flex items-center gap-2 px-4 pt-4 pb-2">
                    <span className="font-tanker text-white" style={{ fontSize: 17 }}>{game.name}</span>
                    <button className="round-btn cursor-pointer ml-auto" onClick={onClose}><i className="ti ti-x" /></button>
                </div>

                <div className="shrink-0 flex gap-2 px-4 pb-3">
                    <button onClick={() => setTab('HOW')} className="flex-1 rounded-xl py-2 transition-colors"
                        style={{ background: tab === 'HOW' ? 'linear-gradient(180deg,#8b5cf6,#5b21b6)' : 'rgba(255,255,255,0.06)' }}>
                        <span className="font-black text-white" style={{ fontSize: 12 }}>How it works</span>
                    </button>
                    <button onClick={() => setTab('PAYLINES')} className="flex-1 rounded-xl py-2 transition-colors"
                        style={{ background: tab === 'PAYLINES' ? 'linear-gradient(180deg,#8b5cf6,#5b21b6)' : 'rgba(255,255,255,0.06)' }}>
                        <span className="font-black text-white" style={{ fontSize: 12 }}>Paylines</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {tab === 'HOW' ? (
                        <div className="flex flex-col gap-3">
                            <div className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <span className="font-black text-violet-200" style={{ fontSize: 13 }}>{info.title}</span>
                                <p className="text-white/80 mt-1.5" style={{ fontSize: 12, lineHeight: 1.6 }}>{info.body}</p>
                            </div>
                            <div>
                                <span className="font-black text-white/50" style={{ fontSize: 10 }}>Key symbols</span>
                                <div className="grid grid-cols-4 gap-2 mt-2">
                                    {KEY_SYMBOLS.map(({ type, label }) => {
                                        const cfg = symbols[type];
                                        if (!cfg) return null;
                                        const isImg = cfg.icon.startsWith('/');
                                        return (
                                            <div key={type} className="flex flex-col items-center gap-1 rounded-xl py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                {isImg
                                                    ? <img src={cfg.icon} alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} />
                                                    : <span className="font-black text-white" style={{ fontSize: 20 }}>{cfg.icon}</span>}
                                                <span className="text-white/50" style={{ fontSize: 9 }}>{label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : usesFixedPaylines ? (
                        <div className="grid grid-cols-5 gap-2">
                            {lines.map((line, i) => (
                                <div key={line.id} className="flex flex-col items-center gap-1 rounded-lg py-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${game.reels}, 1fr)`, gap: 1, width: 44 }}>
                                        {Array.from({ length: game.reels }, (_, col) => (
                                            <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                {Array.from({ length: game.rows }, (_, row) => (
                                                    <div key={row} style={{
                                                        width: '100%', aspectRatio: '1', borderRadius: 1,
                                                        background: line.indices[col] === row ? line.color : 'rgba(255,255,255,0.1)',
                                                    }} />
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-white/40" style={{ fontSize: 8 }}>{i + 1}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <span className="font-black text-violet-200" style={{ fontSize: 13 }}>
                                {game.theme === 'BUFFALO' ? 'Ways to Win' : 'Scatter Pays'}
                            </span>
                            <p className="text-white/80 mt-1.5" style={{ fontSize: 12, lineHeight: 1.6 }}>
                                {game.theme === 'BUFFALO'
                                    ? 'This slot doesn’t use fixed paylines. Matching symbols pay as long as they land on adjacent reels starting from the leftmost reel, in any row.'
                                    : 'This slot doesn’t use fixed paylines. Enough matching symbols anywhere on the board pay based on how many land, regardless of position.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
