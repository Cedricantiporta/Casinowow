
import React, { useEffect, useState, useRef } from 'react';
import { SymbolType, SymbolConfig, GameTheme } from '../types';
import { WEIGHTS, NEON_WEIGHTS, GET_SYMBOLS } from '../constants';
import { GameConfig } from '../types';

interface ReelProps {
  id: number;
  symbols: SymbolType[];
  spinning: boolean;
  stopping: boolean;
  stopDelay: number;
  duration: number;
  onStop: () => void;
  winningIndices: number[];
  gameConfig: GameConfig;
  isScatterShowcase?: boolean;
  forcedSymbols?: SymbolType[];
  newCells?: boolean[];
  dissolving?: boolean;
  anticipation?: boolean;
}

const NO_SCATTER_THEMES = new Set(['PIGGY', 'LEPRECHAUN']);
const NO_SEVEN_THEMES = new Set(['DRAGON']);

const makeRandomSymbol = (excludeScatter: boolean, neon?: boolean, excludeSeven?: boolean) => {
  let weights = neon ? NEON_WEIGHTS : WEIGHTS;
  if (excludeScatter) weights = weights.filter(w => w.type !== SymbolType.SCATTER);
  if (excludeSeven) weights = weights.filter(w => w.type !== SymbolType.SEVEN);
  let sum = weights.reduce((acc, el) => acc + el.weight, 0);
  let rand = Math.random() * sum;
  for (let w of weights) {
    rand -= w.weight;
    if (rand <= 0) return w.type;
  }
  return neon ? SymbolType.TEN : SymbolType.TEN;
};

export const Reel: React.FC<ReelProps> = ({ id, symbols = [], spinning, stopping, stopDelay, duration, onStop, winningIndices, gameConfig, isScatterShowcase, forcedSymbols, newCells, dissolving, anticipation }) => {
  const [strip, setStrip] = useState<SymbolType[]>([]);
  const [landing, setLanding] = useState(false);
  const SYMBOL_CONFIGS = GET_SYMBOLS(gameConfig.theme);
  const VISIBLE_ROWS = gameConfig.rows;
  const noScatter = NO_SCATTER_THEMES.has(gameConfig.theme);
  const noSeven = NO_SEVEN_THEMES.has(gameConfig.theme);
  const isNeon = gameConfig.theme === 'NEON';
  const getRandSym = () => makeRandomSymbol(noScatter, isNeon, noSeven);

  // Initialize strip on mount or config change
  useEffect(() => {
    setStrip(Array(VISIBLE_ROWS).fill(null).map(getRandSym));
  }, [VISIBLE_ROWS, noScatter]); // eslint-disable-line

  // Effect 1: Handle Spin Start
  useEffect(() => {
    if (spinning && !stopping) {
      setLanding(false);
      setStrip(Array(VISIBLE_ROWS * 4).fill(null).map(getRandSym));
    }
  }, [spinning, stopping, VISIBLE_ROWS, noScatter]); // eslint-disable-line

  // Effect 2: Handle Stop Trigger
  useEffect(() => {
    if (stopping && !landing) {
        // stopDelay already includes any anticipation extension baked in by the parent
        const timer = setTimeout(() => {
            setLanding(true);

            // Set final strip: Random symbols on top + Final symbols at bottom
            const finalStrip = [
                ...Array(VISIBLE_ROWS).fill(null).map(getRandSym),
                ...symbols
            ];
            setStrip(finalStrip);
        }, stopDelay);
        return () => clearTimeout(timer);
    }
  }, [stopping, landing, stopDelay, symbols, VISIBLE_ROWS]);

  // Effect 3: Handle Animation Completion (Signal Parent)
  useEffect(() => {
      if (stopping && landing) {
          // Delay to allow bounce animation to play before notifying parent
          const delay = duration > 800 ? 400 : 200; 
          const timer = setTimeout(() => {
              onStop();
          }, delay);
          return () => clearTimeout(timer);
      }
  }, [stopping, landing, onStop, duration]);

  // --- Layout & Animation Logic ---

  // 1. Determine Content
  // During Spin: We double the strip to create a seamless loop for the slide animation
  const renderStrip = (!landing && spinning) ? [...strip, ...strip] : strip;
  
  // 2. Calculate Container Heights
  // We size the inner container so that 1 "View Height" = VISIBLE_ROWS items.
  // Total items / VISIBLE_ROWS = Multiplier of View Height.
  const totalItems = renderStrip.length;
  const containerHeightPercent = (totalItems / VISIBLE_ROWS) * 100;
  
  // 3. Calculate Scroll Offset (TranslateY)
  let translateY = '0%';
  
  if (landing) {
      const rowsToHide = totalItems - VISIBLE_ROWS;
      const shiftPercent = (rowsToHide / totalItems) * 100;
      translateY = `-${shiftPercent}%`;
  } 
  
  // Cascade display mode: bypass animation, show symbols directly
  if (forcedSymbols && forcedSymbols.length > 0) {
      return (
          <div
              className={`relative flex-1 overflow-hidden ${gameConfig.reelBg} min-w-0`}
              style={{ aspectRatio: `1 / ${gameConfig.theme === 'NEON' ? 2 : gameConfig.rows}` }}
          >
              <div className="w-full h-full flex flex-col">
                  {forcedSymbols.map((s, i) => {
                      const isWinner = winningIndices.includes(i);
                      const isNew = newCells?.[i] ?? false;
                      return (
                          <ReelCell
                              key={i}
                              symbol={s}
                              config={SYMBOL_CONFIGS[s]}
                              blur={false}
                              highlight={isWinner}
                              isScatterShowcase={false}
                              heightPercent={100 / gameConfig.rows}
                              theme={gameConfig.theme}
                              isLastCell={i === forcedSymbols.length - 1}
                              isNewCell={isNew}
                              dissolving={dissolving}
                              gameRows={gameConfig.rows}
                              gameReels={gameConfig.reels}
                          />
                      );
                  })}
              </div>
          </div>
      );
  }

  return (
    <div
        className={`relative flex-1 overflow-hidden ${gameConfig.reelBg} min-w-0`}
        style={{
            aspectRatio: `1 / ${gameConfig.theme === 'NEON' ? 2 : gameConfig.rows}`,
            ...(anticipation ? { boxShadow: '0 0 0 2px #fbbf24, 0 0 18px rgba(251,191,36,0.7)', transition: 'box-shadow 0.2s' } : {}),
        }}
    >
       {/* Scroll Wrapper - Static Position Adjustments */}
       <div 
            className="w-full absolute top-0 left-0 will-change-transform transition-transform duration-300 ease-out"
            style={{
                height: `${containerHeightPercent}%`, // Force container to be tall enough to hold all items
                transform: (!landing && spinning) ? 'none' : `translateY(${translateY})`, // Static scroll to result
            }}
       >
            {/* Animation Wrapper - Jiggle/Spin Effects */}
            <div className={`
                w-full h-full flex flex-col
                ${(!landing && spinning) ? 'animate-spin-blur' : ''} 
                ${(landing) ? 'animate-bounce-land' : ''}
            `}>
                {renderStrip.map((s, i) => {
                    // Determine if this specific cell is a winner
                    // Only relevant if landing. 
                    // In landing strip of length N, the visible rows are indices [N-V, ..., N-1].
                    // winningIndices are relative to the visible window (0..V-1).
                    // So if i is the index in the full strip:
                    // visibleRowIndex = i - (totalItems - VISIBLE_ROWS)
                    const visibleRowIndex = i - (totalItems - VISIBLE_ROWS);
                    const isWinner = landing && visibleRowIndex >= 0 && winningIndices.includes(visibleRowIndex);
                    const isShowcase = landing && visibleRowIndex >= 0 && isScatterShowcase && s === SymbolType.SCATTER;

                    return (
                        <ReelCell
                            key={i}
                            symbol={s}
                            config={SYMBOL_CONFIGS[s]}
                            blur={!landing && spinning}
                            highlight={isWinner}
                            isScatterShowcase={isShowcase}
                            heightPercent={100 / totalItems}
                            theme={gameConfig.theme}
                            isLastCell={i === renderStrip.length - 1}
                            dissolving={dissolving}
                            gameRows={gameConfig.rows}
                            gameReels={gameConfig.reels}
                        />
                    );
                })}
            </div>
       </div>

    </div>
  );
};

// No cell separators on any theme.
const getCellSeparatorStyle = (_theme: GameTheme, _isLastCell: boolean): React.CSSProperties => {
    return {};
};

const LETTER_DARK_BG: Partial<Record<GameTheme, string>> = {
    NEON:       '#0a0315',
    EGYPT:      '#150b00',
    DRAGON:     '#150000',
    PIRATE:     '#060f18',
    SPACE:      '#000010',
    CANDY:      '#250816',
    JUNGLE:     '#03200e',
    UNDERWATER: '#083248',
    WESTERN:    '#351402',
    SAMURAI:    '#1e0303',
    PIGGY:      '#3b0519',
};

// 3D text-shadow per letter tier
const getLetter3DShadow = (symbol: SymbolType, theme?: GameTheme): string => {
    if (theme === 'EGYPT') {
        // Deep layered gold 3D to match the pharaoh artwork style
        return '1px 1px 0 #8b5000, 2px 2px 0 #6b3a00, 3px 3px 0 #4a2700, 4px 4px 10px rgba(0,0,0,0.95), 0 0 18px rgba(220,150,0,0.45)';
    }
    if (symbol === SymbolType.TEN || symbol === SymbolType.JACK) {
        return '1px 1px 0 rgba(0,0,0,0.8), 2px 2px 0 rgba(0,0,0,0.6), 3px 3px 0 rgba(0,0,0,0.4), 4px 4px 8px rgba(0,0,0,0.5)';
    }
    if (symbol === SymbolType.QUEEN || symbol === SymbolType.KING) {
        return '1px 1px 0 #2d0060, 2px 2px 0 #1a003a, 3px 3px 0 #0d001e, 4px 4px 8px rgba(0,0,0,0.8)';
    }
    if (symbol === SymbolType.ACE) {
        return '1px 1px 0 #7c3800, 2px 2px 0 #4a2000, 3px 3px 0 #2a1000, 4px 4px 8px rgba(0,0,0,0.8)';
    }
    return '';
};


const ReelCell: React.FC<{
    symbol: SymbolType,
    blur?: boolean,
    highlight?: boolean,
    config: SymbolConfig,
    heightPercent: number,
    isScatterShowcase?: boolean,
    theme: GameTheme,
    isLastCell: boolean,
    isNewCell?: boolean,
    dissolving?: boolean,
    gameRows?: number,
    gameReels?: number,
}> = React.memo(({ symbol, blur, highlight, config, heightPercent, isScatterShowcase, theme, isLastCell, isNewCell, dissolving, gameRows = 3, gameReels = 6 }) => {

    const isScatter = symbol === SymbolType.SCATTER;
    const isWild = symbol === SymbolType.WILD;
    const isImageIcon = typeof config?.icon === 'string' && config.icon.startsWith('/');
    const isLetter = !isImageIcon && theme !== 'NEON' && [SymbolType.TEN, SymbolType.JACK, SymbolType.QUEEN, SymbolType.KING, SymbolType.ACE].includes(symbol);


    const JP_LABELS: Partial<Record<SymbolType, string>> = {
        [SymbolType.JACKPOT_MINI]:  'MINI',
        [SymbolType.JACKPOT_MINOR]: 'MINOR',
        [SymbolType.JACKPOT_MAJOR]: 'MAJOR',
        [SymbolType.JACKPOT_MEGA]:  'MEGA',
        [SymbolType.JACKPOT_GRAND]: 'GRAND',
    };
    const JP_BG_STYLES: Partial<Record<SymbolType, { border: string; glow: string; text: string; solidBg: string; darkColor: string }>> = {
        [SymbolType.JACKPOT_MINI]:  { border: '#16a34a', glow: 'rgba(34,197,94,0.8)',  text: 'white', solidBg: '#16a34a', darkColor: '#063d1a' },
        [SymbolType.JACKPOT_MINOR]: { border: '#0891b2', glow: 'rgba(6,182,212,0.8)',  text: 'white', solidBg: '#0891b2', darkColor: '#034d62' },
        [SymbolType.JACKPOT_MAJOR]: { border: '#7c3aed', glow: 'rgba(124,58,237,0.8)', text: 'white', solidBg: '#7c3aed', darkColor: '#3b0e8a' },
        [SymbolType.JACKPOT_MEGA]:  { border: '#dc2626', glow: 'rgba(220,38,38,0.8)',  text: 'white', solidBg: '#dc2626', darkColor: '#7a0d0d' },
        [SymbolType.JACKPOT_GRAND]: { border: '#d97706', glow: 'rgba(217,119,6,0.8)',  text: 'white', solidBg: '#d97706', darkColor: '#7a3e00' },
    };
    const isJackpot = symbol in JP_LABELS;
    const jpLabel = JP_LABELS[symbol];
    const jpStyle = isJackpot ? JP_BG_STYLES[symbol] : undefined;

    let bgClasses = isImageIcon ? 'bg-transparent' : (config?.bg || 'bg-transparent');

    if (highlight) {
        // Keep original bg color, add shiny border on top
        const borderColor = config?.highlightClass?.match(/border-(\S+)/)?.[1] ?? 'yellow-300/60';
        bgClasses = `${config?.bg || 'bg-transparent'} border-2 border-${borderColor} shadow-[0_0_12px_rgba(255,255,255,0.6)] z-20`;
    } else if (isScatter && isScatterShowcase) {
        bgClasses = 'border-2 border-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.7)] z-20';
    }
    if (isJackpot && !highlight) {
        bgClasses = '';
    }

    const activeBounce = highlight || isScatterShowcase;

    // Scale icons proportionally — cells shrink when more rows or more reels fill the same container
    const cellScale = Math.min(1.0, 3.0 / gameRows, 6.0 / gameReels);
    const emojiFontSize  = `${(3.0375  * cellScale).toFixed(3)}rem`;
    const letterFontSize = `${(2.73    * cellScale).toFixed(3)}rem`;
    const wildFontSize   = `${(1.296   * cellScale).toFixed(3)}rem`;
    const scatterLabelFs = `${(0.729   * cellScale).toFixed(3)}rem`;
    const iconFontSize   = isWild ? wildFontSize : isLetter ? letterFontSize : emojiFontSize;

    const separatorStyle = getCellSeparatorStyle(theme, isLastCell);

    return (
        <div
            className={`
                w-full flex items-center justify-center relative
                ${blur ? 'blur-[2px] opacity-80' : ''}
                ${isNewCell ? 'animate-drop-in' : ''}
                ${highlight && dissolving ? 'animate-dissolve-out' : ''}
                ${!isNewCell && !(highlight && dissolving) ? 'transition-all duration-300' : ''}
            `}
            style={{
                height: `${heightPercent}%`,
                ...separatorStyle,
            }}
        >
            <div className={`
                relative h-full w-full max-w-full rounded-none
                flex items-center justify-center
                transition-all duration-300 overflow-hidden
                ${bgClasses}
            `}
            style={
                isJackpot && !highlight && jpStyle ? { background: jpStyle.solidBg }
                : isLetter && !highlight ? { background: LETTER_DARK_BG[theme] ?? '#0a0a1a' }
                : undefined
            }
            >
                {/* Content wrapper */}
                <div className={`
                    relative flex flex-col items-center justify-center z-10 w-full h-full
                    ${activeBounce ? 'animate-bounce-sm' : ''}
                `}>
                    {isJackpot ? (
                        <span
                            className="font-titan font-black tracking-widest select-none text-white leading-none text-center px-1"
                            style={{
                                fontSize: `clamp(0.4rem, ${(1.8 * cellScale).toFixed(2)}vw, ${(1.0 * cellScale).toFixed(3)}rem)`,
                                textShadow: `0 1px 4px ${jpStyle?.darkColor ?? 'rgba(0,0,0,0.9)'}`,
                            }}
                        >
                            {jpLabel}
                        </span>
                    ) : isImageIcon ? (
                        <img
                            src={config.icon}
                            alt=""
                            className="select-none object-contain pointer-events-none"
                            style={{ width: `${85 * cellScale * (config.imageScale ?? 1)}%`, height: `${85 * cellScale * (config.imageScale ?? 1)}%` }}
                        />
                    ) : (
                        <div
                            className={`select-none transform ${config?.style || ''}`}
                            style={{
                                fontSize: iconFontSize,
                                ...(isLetter ? { textShadow: getLetter3DShadow(symbol, theme), color: theme === 'EGYPT' ? '#fbbf24' : '#ffffff' } : undefined),
                            }}
                        >
                            {config?.icon}
                        </div>
                    )}

                    {isScatter && !blur && (theme === 'NEON' || theme === 'PIRATE' || theme === 'CANDY' || theme === 'ARCTIC') && (
                        <div className="absolute bottom-0 w-full flex justify-center items-end pb-1 z-30">
                            <span
                                className="block font-titan font-black text-white tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)]"
                                style={{ fontSize: scatterLabelFs, textShadow: '0 0 4px black, 0 0 8px black' }}
                            >
                                {(theme === 'PIRATE' || theme === 'ARCTIC') ? 'SCATTER' : 'BONUS'}
                            </span>
                        </div>
                    )}
                    {isJackpot && !blur && (
                        <div
                            className="absolute inset-0 rounded-none pointer-events-none z-20"
                            style={{
                                border: `4px solid ${jpStyle?.border || '#f59e0b'}`,
                                boxShadow: `inset 0 0 14px ${jpStyle?.glow || 'rgba(245,158,11,0.5)'}, 0 0 10px ${jpStyle?.glow || 'rgba(245,158,11,0.5)'}`,
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
});
