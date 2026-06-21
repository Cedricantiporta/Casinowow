
import React, { useEffect, useState, useRef } from 'react';
import { SymbolType, SymbolConfig, GameTheme } from '../types';
import { WEIGHTS, NEON_WEIGHTS, GET_SYMBOLS, JACKPOT_ICONS, GENERIC_JACKPOT_ICONS, THEME_JACKPOT_ICONS } from '../constants';
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
  inFreeSpins?: boolean;
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

export const Reel: React.FC<ReelProps> = ({ id, symbols = [], spinning, stopping, stopDelay, duration, onStop, winningIndices, gameConfig, isScatterShowcase, forcedSymbols, newCells, dissolving, anticipation, inFreeSpins }) => {
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
                              inFreeSpins={inFreeSpins}
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
            ...(anticipation ? (() => {
            const ANTICIP_COLORS = ['#00e8ff','#ff00cc','#aaff00','#ff6600','#cc00ff'];
            const c = ANTICIP_COLORS[id % ANTICIP_COLORS.length];
            return { boxShadow: `0 0 0 2px ${c}, 0 0 10px ${c}bb`, transition: 'box-shadow 0.15s' };
        })() : {}),
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
                            inFreeSpins={inFreeSpins}
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


// Per-theme win-cell border color — blue for cool/ocean themes, yellow for warm themes
const WIN_BORDER_COLORS: Partial<Record<GameTheme, string>> = {
    NEON:       '#38bdf8',
    PIRATE:     '#38bdf8',
    ARCTIC:     '#38bdf8',
    UNDERWATER: '#38bdf8',
    SPACE:      '#7c3aed',
    MMORPG:     '#38bdf8',
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
    inFreeSpins?: boolean,
}> = React.memo(({ symbol, blur, highlight, config, heightPercent, isScatterShowcase, theme, isLastCell, isNewCell, dissolving, gameRows = 3, gameReels = 6, inFreeSpins }) => {

    const isScatter = symbol === SymbolType.SCATTER;
    const isWild = symbol === SymbolType.WILD;
    const isImageIcon = typeof config?.icon === 'string' && config.icon.startsWith('/');
    const isLetter = !isImageIcon && theme !== 'NEON' && [SymbolType.TEN, SymbolType.JACK, SymbolType.QUEEN, SymbolType.KING, SymbolType.ACE].includes(symbol);


    const JP_TYPES = new Set<SymbolType>([
        SymbolType.JACKPOT_MINI, SymbolType.JACKPOT_MINOR, SymbolType.JACKPOT_MAJOR,
        SymbolType.JACKPOT_MEGA, SymbolType.JACKPOT_GRAND,
    ]);
    const isJackpot = JP_TYPES.has(symbol);

    // All cells use black bg; highlight/showcase add glow on top
    let bgClasses = 'bg-black';

    if (highlight) {
        bgClasses = 'bg-black shadow-[0_0_14px_rgba(255,229,0,0.55)] z-20';
    } else if (isScatter && isScatterShowcase) {
        bgClasses = 'bg-black border-2 border-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.7)] z-20';
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
                w-full flex items-center justify-center relative bg-black
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
                transition-all duration-300 overflow-visible
                ${bgClasses}
            `}
            style={undefined}
            >
                {highlight && (() => {
                    const wc = WIN_BORDER_COLORS[theme] ?? '#ffe500';
                    const wcFade = wc === '#ffe500' ? 'rgba(255,229,0,0.3)' : 'rgba(56,189,248,0.3)';
                    return (
                        <svg
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            style={{ zIndex: 25, overflow: 'visible' }}
                        >
                            {/* Outer compact glow halo */}
                            <rect x="0.5" y="0.5" width="99" height="99" fill="none"
                                stroke={wc} strokeWidth="4" strokeOpacity="0.22"
                                style={{ filter: 'blur(3px)' }} />
                            {/* Main animated dash — long streaks (almost touching), butt caps for sharp pointy ends */}
                            <rect x="1.5" y="1.5" width="97" height="97" fill="none"
                                stroke={wc} strokeWidth="3" strokeLinecap="butt"
                                strokeDasharray="190 10"
                                style={{
                                    filter: `drop-shadow(0 0 5px ${wc}) drop-shadow(0 0 10px ${wcFade})`,
                                    animation: 'snakeBorder 0.45s linear infinite',
                                }} />
                            {/* Bright white highlight — shorter dashes offset to ride the "head" of each streak */}
                            <rect x="1.5" y="1.5" width="97" height="97" fill="none"
                                stroke="rgba(255,255,255,0.88)" strokeWidth="1.2" strokeLinecap="butt"
                                strokeDasharray="80 120"
                                strokeDashoffset="-20"
                                style={{ animation: 'snakeBorder 0.45s linear infinite' }} />
                            {/* Dim trailing fade — rides the "tail" of each streak */}
                            <rect x="1.5" y="1.5" width="97" height="97" fill="none"
                                stroke={wc} strokeWidth="2" strokeLinecap="butt" strokeOpacity="0.45"
                                strokeDasharray="50 150"
                                strokeDashoffset="160"
                                style={{ animation: 'snakeBorder 0.45s linear infinite' }} />
                        </svg>
                    );
                })()}
                {/* Content wrapper */}
                <div className={`
                    relative flex flex-col items-center justify-center z-10 w-full h-full
                    ${activeBounce ? 'animate-bounce-sm' : ''}
                `}>
                    {isJackpot ? (
                        (THEME_JACKPOT_ICONS[theme]?.[symbol] || GENERIC_JACKPOT_ICONS[symbol] || JACKPOT_ICONS[theme]) ? (
                            <img
                                src={THEME_JACKPOT_ICONS[theme]?.[symbol] ?? GENERIC_JACKPOT_ICONS[symbol] ?? JACKPOT_ICONS[theme]}
                                alt=""
                                className="w-full h-full object-contain pointer-events-none select-none"
                            />
                        ) : null
                    ) : isImageIcon ? (
                        <img
                            src={config.icon}
                            alt=""
                            className={`select-none object-contain pointer-events-none${highlight && theme === 'PIGGY' ? ' animate-pulse' : ''}`}
                            style={{
                                width:    `${85 * cellScale * (config.imageScale ?? 1)}%`,
                                height:   `${85 * cellScale * (config.imageScale ?? 1)}%`,
                                ...(theme === 'UNDERWATER' || (theme === 'PIGGY' && isScatter) ? { position: 'absolute', width: `${85 * cellScale * (config.imageScale ?? 1)}%`, height: `${85 * cellScale * (config.imageScale ?? 1)}%`, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', ...(theme === 'PIGGY' ? { zIndex: 20 } : {}) } : {}),
                            }}
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

                    {isScatter && !blur && (!isImageIcon || theme === 'NEON' || theme === 'CANDY') && (
                        <div className="absolute bottom-0 w-full flex justify-center items-end pb-1 z-30">
                            <span
                                className="block font-titan font-black text-white tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)]"
                                style={{ fontSize: scatterLabelFs, textShadow: '0 0 4px black, 0 0 8px black' }}
                            >
                                BONUS
                            </span>
                        </div>
                    )}
                    {isWild && !blur && !isImageIcon && (
                        <div className="absolute bottom-0 w-full flex justify-center items-end pb-1 z-30">
                            <span
                                className="block font-titan font-black text-white tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)]"
                                style={{ fontSize: scatterLabelFs, textShadow: '0 0 4px black, 0 0 8px black' }}
                            >
                                WILD
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
