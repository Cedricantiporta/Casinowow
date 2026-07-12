# Slot Uniqueness Rework — Master Plan

Goal: every "replica" slot gets its own headline mechanic so no two slots share the
same feature. Work is split into 4 batches of ~2 slots. Each batch is an independent,
shippable unit meant to be executed by a separate agent session.

## How to execute a batch (read this first)

1. Work on branch `claude/casino-game-review-krw8p5` (or the branch the session assigns).
2. Read this whole file once, then your batch section in detail. The Engine Primer and
   Gotchas sections below are **required reading** — they encode hard-won facts about
   this codebase that are not obvious from skimming.
3. Implement only your batch's two slots. Do not refactor flagship slots, do not touch
   other replicas' behavior.
4. For each slot: remove its `FEATURE_THEME_MAP` alias (if any), update its lobby
   `description` in `constants.ts`, implement the new mechanic, add resets/persistence,
   add the UI, then verify (see Verification Playbook) — `npx tsc --noEmit` must be
   clean and the feature must be observed firing in a real headless-browser session.
5. Commit with a clear message and push. Do not create a PR unless asked.
6. UI rules from CLAUDE.md apply to everything you render: no ALL CAPS text, no colored
   or thick container borders (subtle grey only if truly needed), no line separators,
   no emojis in new UI (existing engine toasts are fine), three font sizes only.

## Current state audit

22 slots total. 15 already have a dedicated identity ("flagships"), 7 are replicas.

Flagships (do not touch): Piggy Riches (coin bank free spins), Arctic Freeze (cascades +
climbing multiplier + pick bonus), Sugar Rush (Wild Wheel free spins), Pharaoh's Tomb
(Hold & Win respins), Buffalo Thunder (Ways to Win + wild multipliers + collect),
Barnyard Bonanza (mystery symbols), Jungle Rumble (colossal 3x3 center symbol),
Pirate's Bounty (Ghost Ship walking wilds), Neon Vegas (scatter roulette, 3x3),
Oxgoldpower/DRAGON (4-scatter high volatility + pick bonus), Olympus Ascend (scatter
pays + multiplier orbs), Cosmic Cash (Supernova progressive FS multiplier), Beast Rage
(roulette-picked wild multiplier), Angry Flock (two-stage roulette bonus), Golden Lucky
Pot (pot drip every 10th spin — semi-flagship, gets an optional upgrade in Batch 4).

Replicas and their new identities:

| Slot | Theme key | Today (borrowed from) | New identity | Batch |
|---|---|---|---|---|
| Samurai Honor | `SAMURAI` | Hold & Win (Egypt) | Katana Wilds: expanding-wild respin + sticky-wild free spins | 1 |
| Dungeon Raid | `MMORPG` | Hold & Win (Egypt) | Boss Battle free spins + Loot Goblin dead-spin transform | 1 |
| Deep Blue | `UNDERWATER` | Cascades (Arctic) | Win Both Ways + Kraken wild reels on dead spins | 2 |
| Gold Rush | `WESTERN` | Walking wilds (Pirate) | Dynamite dead-spin wilds + High Noon duel gamble | 2 |
| Lucky Leprechaun | `LEPRECHAUN` | Wild Wheel (Candy) | Rainbow Trail board bonus + Leprechaun Luck nudge | 3 |
| Mystic Pets | `PETS` | Wild Wheel (Candy) | Choose Your Companion: 4 selectable free-spin styles | 3 |
| Princess Realm | `PRINCESS` | Mystery symbols (Farm) | Enchanted Mirror: expanding chosen symbol free spins | 4 |
| Golden Lucky Pot | `GOLDEN_POT` | (own drip, generic FS) | Fortune Pots: instant-pay pots during free spins | 4 |

After all batches: Hold & Win belongs to Egypt alone, walking wilds to Pirate alone,
the Wild Wheel to Candy alone, mystery symbols to Farm alone, cascades to
Arctic/Olympus alone.

## Engine primer (App.tsx is a ~8000-line monolith — these are the load-bearing parts)

Search for these anchors; line numbers drift, names don't.

- **`FEATURE_THEME_MAP`** (top of App.tsx): maps a replica theme to the flagship theme
  whose *feature logic* it borrows. `featureThemeOf(theme)` is used all over the spin
  engine as `ft`. De-aliasing a slot = deleting its entry here. After deleting, grep
  `ft === '<FLAGSHIP>'` and `featureThemeOf` to confirm the replica no longer enters the
  flagship's branches (it won't — but read each site once).
- **`MYSTERY_FEATURE_THEMES`** (near the map): set of themes using Farm's mystery
  feature. Princess Realm is removed from this set in Batch 4. Membership also controls
  a 0.84x line-payout adjustment in `calculateWin`, a scatter-frequency reduction and a
  mega-match reduction in `generateSmartGrid` — removal automatically reverts all three.
- **`generateSmartGrid`** (useCallback, ~line 3000): builds each spin's target grid.
  Ordered phases: base random fill → theme scatter filters → JUNGLE colossal block →
  mega-match → **wild column stacks** (`wildStackChance` — note this seeds FULL columns;
  set it to 0 for any theme whose feature needs single wilds, like DRAGON does) →
  PIRATE ship seeding → generic scatter injection (`targetScatters` thresholds) →
  EGYPT coin injection → per-theme wild/feature blocks (CANDY, ANGRYFLOCK) → free-spin
  jackpot-cell injection → PIGGY guaranteed jackpot → PIRATE walk stamping → MYSTERY
  tiles. Add new per-theme blocks after the PIRATE walk-stamping block.
- **`spin()`** (~line 3960): guards → `isCurrentFreeSpinRef.current = isFreeSpin` →
  balance deduction. Three branches: paid spin / **free respin** (`isHoldWinRespin ||
  isPirateWalk` — "free, no missions, no stats") / free spin (decrements
  `freeSpinsRemaining`). A new respin-type feature adds its flag to the middle branch
  plus the autoMaxBet + insufficient-funds conditions above it.
- **`handleReelStop`** (~line 4150): runs once per reel; the `next ===
  selectedGame.reels` block is the settle path. Order: CANDY sync → EGYPT hold&win →
  PIRATE walk → scatter count + **generic scatter trigger** (fresh trigger does
  `SCATTER_SHOWCASE` → popup → `return next` **without** calling `calculateWin` — line
  wins on trigger spins are not paid, by design) → PIGGY coins → DRAGON/ARCTIC/OLYMPUS
  accumulators → MYSTERY reveal → BUFFALO reveal → `calculateWin(targetGrid)`.
  New pre-scoring features (transform a settled grid, expand wilds, etc.) go right
  before that final `calculateWin` call, each ending with `return next`.
- **`calculateWin(finalGrid, creditOnly)`** (~line 4676): fixed left-to-right payline
  loop (wild substitution, `matchLen >= 3`, `lenMult` 0.5/2.0/4.0), theme multipliers
  (NEON 1.588x, PIGGY coin 2x, BEAST roulette mult), then theme payout adjustments
  (MYSTERY 0.84x, JUNGLE 0.5x, SPACE Supernova, OLYMPUS orbs), then the cascade branch
  for ARCTIC/OLYMPUS, then jackpot-cell awards, then payout credit + XP/missions/arena +
  status transitions (WIN_ANIMATION → IDLE timeouts). Per-theme FS win multipliers
  belong next to the SPACE block. OLYMPUS/BUFFALO bypass paylines entirely via
  `scatterPaysEvaluate` / `waysToWinEvaluate` (both exist in constants.ts — reusable).
- **IDLE auto-continue effect** (search `Ghost Ship Walking Wilds: sail one reel`):
  the `useEffect` on `status === GameStatus.IDLE` that drives pirate-walk steps,
  hold&win respins (`setTimeout(() => spin(), fastSpin ? 100 : 1080)`), free-spin
  auto-spins, the free-spin summary, and autospin. A new respin feature adds an
  `else if` branch here + its state in the dep array.
- **`handleStartFreeSpins`**: generic FreeSpinsWonPopup confirm. Fresh-session branch
  (after the retrigger early-return) is where per-theme FS session state initializes
  (SPACE resets Supernova here). Retriggers must NOT reset session state.
- **`handleFreeSpinSummaryClose`**: end of a FS session — resets ANGRYFLOCK sticky
  wilds, BEAST multiplier, pirate walk. Add new FS-session state resets here.
- **`handleGameSelect`** (search `Reset Ghost Ship walking-wilds state on game change`):
  hard-resets every feature's refs/state on slot change, then restores `savedGameStates
  [game.id]` (type `SavedGameState`, top of file) — freeSpinsRemaining, hold&win state,
  pirate walk state. New features with cross-exit state add optional fields to
  `SavedGameState`, save them in **`handleHeaderBack`** (search `pirateWalkActive:
  pirateWalkRef.current.active`), restore them here, and reset them in the reset block.
- **Forced redraw of settled reels** (critical): once a reel has stopped it does NOT
  re-render from the `symbols` prop. To visibly change a settled grid (add wilds,
  transform symbols) you must mirror the Buffalo collect-reveal pattern (search
  `forcedSymbols path the cascade engine uses`): `setTargetGrid(newGrid)` +
  `setCascadeGrid(copy)` + `setCascadeNewCells(mask)` + `setCascadeDissolving(false)`.
  `spin()` clears all three at the start of the next spin.
- **Sticky wilds pattern**: `angryFlockStickyWildsRef` (red bird) — a ref of
  `{col,row}[]`, re-stamped onto every new FS grid in `generateSmartGrid`, cleared on
  session end / game change. Copy this shape for any sticky feature.
- **Banner pattern**: SPACE Supernova banner JSX (search `SPACE Supernova — progressive
  multiplier banner`) — absolutely-positioned pill above the reels, `totalFreeSpins > 0`
  gate. Column-highlight overlay pattern: CANDY wild wheel (search `CANDY Wild Wheel —
  expanding wild-reel highlights`) — `left: calc((col/reels)*100% + 2px)`, width
  `calc((1/reels)*100% - 4px)`.
- **Bonus-picker modal pattern**: `BeastRouletteModal` / `AngryFlockRouletteModal` /
  `SpinCountRouletteModal` + their `handle*Complete` callbacks in App.tsx, each ending
  with the same `setReelTransitioning('out') → setFreeSpinsRemaining(prev => prev +
  freeSpinsWon) → 'in'` transition. New pick/board bonuses copy one of these end-to-end
  (modal component + show-state + spin() guard + `handleHeaderBack` guard + completion
  handler).
- **Per-cell metadata pattern**: Buffalo `buffaloWildMultGridRef` / Olympus
  `olympusOrbGridRef` — a parallel grid of numbers mirrored into state at spin start
  (see the `status === SPINNING && targetGrid.length === 0` effect), rendered by
  Reel.tsx via dedicated props (`wildMultValues`, `orbValues`).

## Gotchas (each of these has bitten before)

- `isCurrentFreeSpinRef.current`, not `freeSpinsRemaining`, tells you whether the spin
  that just settled was a free spin — `freeSpinsRemaining` already reads 0 during the
  LAST free spin's settle. Use `!isCurrentFreeSpinRef.current` to gate base-game-only
  features and `totalFreeSpins > 0` to gate in-session logic inside `calculateWin`.
- `wildStackChance` in `generateSmartGrid` spawns FULL wild columns at ~8-17% on reels
  3-5 (x1.8 during free spins). Any feature built on single wilds must zero it for its
  theme (see the DRAGON line).
- The generic scatter-trigger branch `return next`s without scoring the spin; features
  placed after it in `handleReelStop` silently don't run on trigger spins. That's fine —
  the free spins take precedence.
- Respin-type features must strip SCATTER cells from their respin grids (see EGYPT's
  strip loop), or a mid-respin scatter trigger will interleave two features.
- Free-spin jackpot-cell injection (search `Jackpot cell injection`) runs for any
  non-excluded theme — sticky/expansion features should treat `JACKPOT_*` cells as
  ineligible (check `String(s).startsWith('JACKPOT')`).
- Both the IDLE auto-continue effect and `spin()` have long dependency arrays — add any
  new state you reference or the closure goes stale.
- Reset new feature state in ALL THREE places: `handleGameSelect` (slot switch),
  `handleFreeSpinSummaryClose` (session end), and your feature's own terminal branch.
- Tailwind is loaded via CDN in index.html — blocked in sandboxed browsers; ignore
  `tailwind is not defined` console errors during headless verification.
- localStorage keys: `cw_player` (level/balance), `cw_quest`, `cw_saved_game_states`,
  `cw_bet_<gameId>`, `cw_first_fs_done` (set it to skip the guaranteed-first-FS pity),
  `cw_welcome_claimed`, `cw_login`. Seed these before reload for deterministic tests.

## Mechanics inventory (real-slot staples this codebase does NOT have yet)

Normal spin: win both ways (Starburst) · expanding full-reel wild + held respin
(Starburst) · random dead-spin rescue features (Fruit Shop/Finn) · reel nudge ·
win gamble/double-up (pub slots) · random symbol transform.
Free spins: sticky wilds (Dead or Alive) · expanding chosen symbol (Book of Dead) ·
pick-your-bonus-style volatility choice · boss/HP progression · symbol upgrades.
Bonus rounds: trail/ladder board with collect-or-advance (Rainbow Riches).
Deliberately out of scope for this rework: Megaways variable rows, Buy Bonus button
(good future monetization feature), multi-level progressives.

Every one of the above is assigned to exactly one slot below — keep it that way.

---

## Batch 1 — Samurai Honor + Dungeon Raid (the two Hold & Win clones)

### 1A. Samurai Honor (`SAMURAI`, 3x5) — "Katana Wilds"

Identity: base game — a wild landing on reels 2-4 slashes its whole reel into wilds,
holds it, and awards a free respin; fresh middle-reel wilds during the respin chain it.
Free spins — every wild that lands sticks in place for the rest of the session.

1. `constants.ts` config: `scattersToTrigger: 999 → 3`; description → e.g.
   `'Katana Wilds! Middle-reel wilds slash their whole reel wild and respin. Free-spin wilds stay locked in place.'`
2. Delete `SAMURAI: 'EGYPT'` from `FEATURE_THEME_MAP` (update its comment).
3. State (next to the Angry Flock refs):
   ```tsx
   const samuraiRespinRef = useRef<{ active: boolean; heldCols: number[] }>({ active: false, heldCols: [] });
   const [samuraiHeldCols, setSamuraiHeldCols] = useState<number[]>([]);
   const samuraiStickyWildsRef = useRef<{ col: number; row: number }[]>([]);
   const [samuraiStickyCount, setSamuraiStickyCount] = useState(0);
   ```
4. `generateSmartGrid`: zero `wildStackChance` for SAMURAI (next to the DRAGON line).
   Add a SAMURAI block after the PIRATE walk-stamping block:
   - respin active → ~14% per open middle reel to seed one single wild (chain chance),
     stamp all `heldCols` fully WILD, strip all SCATTERs from the grid;
   - base game → ~4.5% per middle reel (cols 1-3) to seed one single wild;
   - free spin → seed 0-2 new wilds (one roll: `<0.10` → 2, `<0.55` → 1, else 0),
     re-stamp all sticky wilds, then add EVERY wild cell on the final grid (seeded or
     natural) to the sticky ref and `setSamuraiStickyCount`. Eligibility: skip SCATTER
     and `JACKPOT_*` cells.
5. `spin()`: `const isSamuraiRespin = samuraiRespinRef.current.active;` — add to the
   autoMaxBet conditions (2 lines), the insufficient-funds condition, the paid-spin
   condition, and the free-respin middle branch.
6. `handleReelStop`, right before the final `calculateWin(targetGrid)`, gated
   `selectedGame.theme === 'SAMURAI' && !isCurrentFreeSpinRef.current`:
   - Find wilds on open middle cols (`for c in 1..3`, skip already-held): if any →
     copy grid, fill those cols WILD, `samuraiRespinRef = { active: true, heldCols:
     merged }`, `setSamuraiHeldCols`, `setSpinsWithoutBonus(0)`, forced-redraw
     (targetGrid + cascadeGrid + newCells mask of the slashed cols), toast
     `'Katana Slash! Respin'`, `audioService.playScatterTrigger()`, then
     `setTimeout(() => calculateWin(expanded), 900); return next;`
   - else if `samuraiRespinRef.current.active` (respin landed nothing new): clear the
     ref + state, `trackSlotQuest('BONUS_TRIGGER', 1)`, `calculateWin(targetGrid);
     return next;` (the held wilds are already in this grid — the respin pays again,
     which is correct Starburst behavior).
7. IDLE auto-continue effect: after the `holdWinActive` branch add
   `else if (samuraiHeldCols.length > 0) { if (activeModal === 'NONE') setTimeout(() =>
   spin(), fastSpin ? 100 : 1080); }` and put `samuraiHeldCols` in the dep array.
8. `handleStartFreeSpins` fresh branch: clear sticky ref + count (fresh session).
   Retrigger branch: leave sticky wilds alone (they persist through retriggers).
9. Resets in `handleGameSelect` + `handleFreeSpinSummaryClose`; persistence via
   `SavedGameState` optional fields `samuraiStickyWilds`, `samuraiHeldCols` (save in
   `handleHeaderBack`, restore in `handleGameSelect`, respin ref re-armed if heldCols
   non-empty — the IDLE effect will resume it automatically).
10. Spin-button guards: `handleSpinPointerDown/Up` early-return when
    `samuraiRespinRef.current.active` (same as pirate walk).
11. UI: (a) held-column glow overlay — copy the CANDY column-highlight geometry, red
    glow via boxShadow only, NO border; (b) small `Locked Wilds ×N` pill during free
    spins — copy the SPACE banner, shadow instead of border.

Tuning intent: base-game slash event ≈ every ~7 spins; chain chance 14% per open reel;
FS ends with roughly 4-8 locked wilds. Full-line wins after a slash are the feature's
payoff — no extra payout dampener to start; note in the commit if it plays hot.

### 1B. Dungeon Raid (`MMORPG`, 3x6) — "Boss Battle" + "Loot Goblin"

Identity: free spins are a boss fight — every win strikes the boss (damage = win in
bet-multiples, after multiplier); slaying it grants +2 spins, +1 raid multiplier
(applies to every later FS win), and summons a 1.6x-tougher boss. Base game: a rare
Loot Goblin transmutes all 10/J/Q cells into one random higher symbol on a dead spin
and rescores it.

1. `constants.ts`: `scattersToTrigger: 999 → 3`; description → e.g.
   `'Boss Battles! Free-spin wins strike the boss — slay it for bonus spins and a rising raid multiplier.'`
2. Delete `MMORPG: 'EGYPT'` from `FEATURE_THEME_MAP`.
3. State: `mmorpgBossRef = useRef<{level; hp; maxHp; mult} | null>(null)` +
   `mmorpgBossUi` state mirror.
4. `handleStartFreeSpins` fresh branch, when theme is MMORPG:
   `mmorpgBossRef.current = { level: 1, hp: 12, maxHp: 12, mult: 1 }` + UI mirror.
5. `calculateWin`, next to the SPACE Supernova block:
   ```tsx
   if (selectedGame.theme === 'MMORPG' && totalFreeSpins > 0 && mmorpgBossRef.current && totalPayout > 0) {
       const boss = mmorpgBossRef.current;
       totalPayout = Math.floor(totalPayout * boss.mult);
       boss.hp -= Math.max(1, Math.round(totalPayout / currentBet));
       if (boss.hp <= 0) {
           boss.level += 1; boss.mult = Math.min(10, boss.mult + 1);
           boss.maxHp = Math.round(boss.maxHp * 1.6); boss.hp = boss.maxHp;
           setFreeSpinsRemaining(prev => prev + 2);
           setTotalFreeSpins(prev => prev + 2);
           setCelebrationMsg(`Boss Slain! +2 Spins · ×${boss.mult}`);
           audioService.playWinBig();
       }
       setMmorpgBossUi({ ...boss });
   }
   ```
6. Loot Goblin — needs a pure dead-spin check. Add near `calculateWin` a
   `gridHasLineWin(g)` helper: iterate `GET_PAYLINES(rows, reels)`, wild-substituting
   match walk, return true on any `len >= 3`. Then in `handleReelStop` right before the
   final `calculateWin`, gated `theme === 'MMORPG' && !isCurrentFreeSpinRef.current &&
   scatterCount < scattersToTrigger && Math.random() < 0.055 && !gridHasLineWin(targetGrid)`:
   transmute every TEN/JACK/QUEEN cell to one rolled symbol (GRAPE 40% / BELL 30% /
   BAR 20% / CHERRY 10%), forced-redraw with the transmuted cells as the newCells mask,
   toast `'Loot Goblin!'`, `playBonusTrigger`, `setTimeout(() => calculateWin(upgraded),
   900); return next;`. (Transform may still not line up a win — acceptable, the goblin
   "tried".)
7. Resets: boss → null in `handleGameSelect` reset block + `handleFreeSpinSummaryClose`.
   Persistence: optional `mmorpgBoss` field in `SavedGameState` (save/restore).
8. UI: boss pill above the reels during free spins (SPACE banner pattern, shadow not
   border): `Boss Lv N` + a ~74px HP bar (red fill, `width%` = hp/maxHp, 0.4s width
   transition) + `×mult`.

### Batch 1 verification checklist
- `npx tsc --noEmit` clean.
- Samurai: seed a base-game grid with a middle-reel wild (or temporarily raise the
  4.5% seed to 1.0) → observe slash toast, full-wild reel, held-column glow, automatic
  respin, feature resolve. Enter FS via 3 scatters → observe wilds accumulating +
  `Locked Wilds ×N` pill across spins.
- Dungeon Raid: enter FS → observe boss pill, HP dropping on wins, a kill granting
  +2 spins and ×2, tougher boss respawn. Base game: force goblin chance to 1.0
  temporarily → observe transmute + rescore, then restore 0.055.
- Both: exit mid-feature via back button, re-enter → state restored; switch slots →
  state fully reset; Egypt's own Hold & Win still works (regression check).

---

## Batch 2 — Deep Blue + Gold Rush

### 2A. Deep Blue (`UNDERWATER`, 3x5) — "Win Both Ways" + "Kraken Attack"

Identity: the only slot whose paylines pay left→right AND right→left; on dead base-game
spins the Kraken can turn 1-2 full reels wild before scoring.

1. Delete `UNDERWATER: 'ARCTIC'` from `FEATURE_THEME_MAP` — Deep Blue stops cascading
   entirely and rejoins the normal payline flow (verify `isCascadeTheme(ft)` is now
   false for it; also the Arctic pick-bonus progress bar and cascade-wild seeding stop
   applying automatically). Description → e.g.
   `'Win Both Ways! Paylines pay left and right — and on dead spins the Kraken can crush whole reels into wilds.'`
2. Win Both Ways, in `calculateWin`'s payline loop for UNDERWATER only: after the
   left→right walk, run the same walk on `[...symbols].reverse()`. Pay the right-side
   win too (mapping reversed indices back to real cells for `winningCells`). A full-line
   match (len === reels) must pay once, not twice. Dampen Deep Blue's total line payout
   ×0.75 (place next to the JUNGLE 0.5x adjustment) to offset the doubled hit rate.
3. Kraken Attack, in `handleReelStop` before the final `calculateWin`, gated
   `theme === 'UNDERWATER' && scatterCount < scattersToTrigger && !gridHasLineWin(targetGrid)`
   (helper exists after Batch 1): chance 4.5% base / 9% during free spins → choose 1
   reel (70%) or 2 reels (30%) from cols 1..reels-2, fill fully WILD (skip SCATTER
   cells), forced-redraw, toast `'Kraken Attack!'`, delayed `calculateWin(newGrid)`,
   `return next`. Track the chosen cols in state for a teal column-glow overlay
   (samurai overlay pattern); clear that state at the start of every spin.
4. No SavedGameState changes (feature is instantaneous). Reset the overlay state on
   game change.
5. UI: overlay glow + a static hint chip is unnecessary — the description covers it.

### 2B. Gold Rush (`WESTERN`, 3x5) — "Dynamite" + "High Noon Duel"

Identity: dead spins can explode 4-6 random cells into wilds; mid-size wins can be
risked in a double-or-nothing quick-draw duel, up to 3 rounds.

1. Delete `WESTERN: 'PIRATE'` from `FEATURE_THEME_MAP`; `scattersToTrigger: 4 → 3`
   (it loses the ghost-ship replacement trigger and rejoins generic scatter FS).
   Description → e.g. `'Dynamite wilds on dead spins — and every win can be risked in a High Noon duel, double or nothing.'`
2. Dynamite Blast, same skeleton as Kraken but scattered cells instead of reels:
   dead-spin gate, chance 5% base / 12% during FS, convert 4-6 random non-SCATTER
   non-JACKPOT cells to WILD, forced-redraw with those cells masked, toast
   `'Dynamite!'`, delayed rescore. Distinct visual identity from Kraken: cells, not
   columns.
3. High Noon Duel — new `components/DuelGambleModal.tsx` + state
   `duelOffer: { amount: number; round: number } | null`:
   - Offer: in `calculateWin`, WESTERN base game only (`totalFreeSpins === 0`, no
     active features, not creditOnly), when `totalPayout >= currentBet * 2` and no
     `winTier` (tiered wins keep their own celebration): `setDuelOffer({ amount:
     totalPayout, round: 1 })`.
   - Render: compact bottom-center chip while `status === IDLE && duelOffer` — text
     `Duel ×2` + `Keep`, auto-dismiss after ~6s (timeout → keep). Any `spin()` clears
     the offer.
   - Duel: modal with a short 3-beat draw animation; 50/50. Win → `balance += amount`
     and offer `round + 1` (cap 3, amount doubles each round). Lose → `balance -=
     amount` (the original win was already credited) + `'Outdrawn…'` toast. Keep →
     close. Sounds: `playWinBig` / `playStoneBreak`.
   - Guards: opening the modal blocks `spin()` (add to spin()'s early-return guards)
     and `handleHeaderBack` (resolve or auto-keep on back).
4. Resets: `duelOffer = null` on game change and spin start. No persistence (an
   unresolved offer on exit auto-keeps — the win is already credited).
5. UI rules: title-case text, no borders, line-icon or no icon.

### Batch 2 verification checklist
- Deep Blue: a right-to-left-only win pays (seed a grid ending in 3 matching symbols on
  the right); full-line wins pay once; Kraken fires on a forced dead spin; no cascade
  behavior remains (wins do NOT tumble); Arctic Freeze itself still cascades.
- Gold Rush: dynamite fires on forced dead spin; duel offer appears on a 2x+ win, both
  duel outcomes settle balance correctly (temporarily pin Math.random to test both),
  round chaining caps at 3; Pirate's Bounty ghost ship still works.

---

## Batch 3 — Lucky Leprechaun + Mystic Pets (the two Wild Wheel clones)

### 3A. Lucky Leprechaun (`LEPRECHAUN`, 3x6) — "Rainbow Trail" + "Leprechaun Luck"

Identity: 3 scatters open a Road-to-Riches-style trail board (spin → advance → collect
or bust, up to 100x bet); rarely, on a near-miss dead spin the leprechaun completes a
2-match line into a 3-match win.

1. Delete `LEPRECHAUN: 'CANDY'` from `FEATURE_THEME_MAP`. Description → e.g.
   `'Rainbow Trail! 3 scatters start the climb — spin to advance rising multipliers to the pot of gold.'`
2. New `components/RainbowTrailModal.tsx` — copy the structure/chrome of
   `SpinCountRouletteModal` (self-contained modal, spin button, resolves via
   `onComplete(multiplier)`):
   - 20-step trail of bet-multipliers `[1,2,3,4,5,7,9,12,15,18,22,26,30,35,40,50,60,75,90,100]`,
     rendered as a compact winding path with the current step highlighted.
   - Each "Spin" resolves a 6-segment wheel: advance 1/2/3/4 (weights 30/28/22/12) or
     Collect (weight 8, but the first two spins reroll Collect — guarantee some
     progress). Landing Collect (or pressing an always-available Collect button) ends
     the bonus at the current step's multiplier; reaching step 20 pays 100x + a big
     celebration.
   - `onComplete(mult)` → App.tsx credits `mult * trailBet`, coin animation +
     `getWinTier`-appropriate celebration.
3. Trigger wiring in `handleReelStop`: add a LEPRECHAUN branch in the scatter-trigger
   section modeled on the CANDY branch — fresh trigger: `SCATTER_SHOWCASE` →
   `setShowRainbowTrail(true)` (capture `trailBet = currentBetRef.current` like
   `neonRouletteBet`); there are no free spins in this bonus, so the retrigger case
   can simply re-open the trail. Add `showRainbowTrail` to `spin()`'s guards, the
   IDLE effect's conditions if needed, and `handleHeaderBack`'s must-resolve list.
4. Leprechaun Luck nudge, in `handleReelStop` before final `calculateWin`, gated dead
   spin + chance 4%: find a payline whose first two cells match (wild-aware) but third
   breaks the line; set the third cell to the matched symbol, forced-redraw (mask just
   that cell), toast `'Leprechaun Luck!'`, delayed rescore. If no such near-miss line
   exists, do nothing (no reroll).
5. Resets: close/clear modal state on game change. No SavedGameState fields (the trail
   resolves atomically; back button is blocked while open).

### 3B. Mystic Pets (`PETS`, 3x6) — "Choose Your Companion"

Identity: 3 scatters let the player pick their bonus style — the classic
volatility-choice mechanic.

1. Delete `PETS: 'CANDY'` from `FEATURE_THEME_MAP`. Description → e.g.
   `'Choose your companion! Each pet grants its own style of free spins.'`
2. New `components/CompanionPickModal.tsx` (chrome copied from `BeastRouletteModal`,
   but a 4-card pick instead of a wheel):
   - Dragon — 6 spins, every win ×3
   - Unicorn — 10 spins, sticky wilds (wilds lock for the session)
   - Phoenix — 8 spins, low symbols upgraded (every 10/J/Q cell becomes KING/ACE/
     GRAPE/BELL, rolled per cell per spin)
   - Cat — 15 spins, 1-3 random wilds added every spin (non-sticky)
3. Wiring (mirror the BEAST flow end-to-end): scatter-trigger branch for PETS → fresh:
   showcase → `setShowCompanionPick(true)`; retrigger during FS: +5 spins, keep the
   companion (mirror CANDY's retrigger branch). `handleCompanionPickComplete(pet)` sets
   `petsCompanionRef`, `setFreeSpinsWon(spinsForPet)`, `setTotalFreeSpins(prev => prev
   + spinsForPet)`, clears `petsStickyWildsRef`, then the standard reel-transition into
   free spins (copy `handleBeastRouletteComplete`).
4. `generateSmartGrid` — PETS free-spin block, a switch on the companion (copy the
   ANGRYFLOCK color-switch shape exactly; unicorn ≈ red bird's sticky logic with its
   own `petsStickyWildsRef`, cat ≈ green/blue scatterFew, phoenix = per-cell transform,
   dragon = no grid change).
5. `calculateWin`: dragon's ×3 on FS wins (copy the `beastMult` line pattern).
6. UI: companion pill during FS (SPACE banner pattern) — pet name + its perk
   (`×3 Wins`, `Sticky Wilds`, `Upgrades`, `Wild Rain`).
7. Resets: companion + sticky ref on game change and summary close; `spin()` +
   `handleHeaderBack` guards for the pick modal; SavedGameState optional fields
   `petsCompanion` and `petsStickyWilds` (an interrupted session must restore its pet).

### Batch 3 verification checklist
- Leprechaun: trail opens on 3 scatters, advances, collects, 100x cap works, payout
  credited correctly at the captured trigger bet; nudge converts a seeded near-miss.
- Pets: all four companions produce their distinct FS behavior (force each), retrigger
  keeps the companion, exit/re-enter restores it; Sugar Rush's own Wild Wheel is
  untouched (regression).

---

## Batch 4 — Princess Realm + Golden Lucky Pot

### 4A. Princess Realm (`PRINCESS`, 3x5) — "Enchanted Mirror"

Identity: Book-of-Dead-style. Free spins begin with the mirror crowning one Chosen
Symbol; whenever 3+ of it land anywhere during a free spin, every reel containing it
fills with it and the spin is rescored.

1. Remove `PRINCESS` from `MYSTERY_FEATURE_THEMES` (Farm keeps the mystery feature;
   the 0.84x payout adjustment, scatter reduction and mega-match reduction all revert
   automatically — verify by grepping `MYSTERY_FEATURE_THEMES`). Description → e.g.
   `'Enchanted Mirror! One royal symbol is crowned — land 3+ in free spins and it fills whole reels.'`
2. State: `princessChosenRef` (SymbolType | null) + UI mirror. Chosen at
   `handleStartFreeSpins` fresh branch, weighted `ACE 30 / KING 25 / QUEEN 20 /
   GRAPE 12 / BELL 8 / BAR 4 / CHERRY 1` (low symbols expand often, high symbols
   rarely — classic Book economy).
3. `handleReelStop` before final `calculateWin`, gated PRINCESS +
   `isCurrentFreeSpinRef.current` + chosen set: count chosen-symbol cells anywhere;
   if >= 3 → copy grid, fill every reel containing one fully with the chosen symbol,
   forced-redraw (mask the filled reels), toast, delayed `calculateWin(expanded)`,
   `return next`. Line evaluation on full columns produces the payoff naturally.
4. UI: `Mirror Symbol` pill during FS showing the chosen symbol's icon (img from
   `GET_SYMBOLS(theme)[chosen].icon`).
5. Resets on game change + summary close; SavedGameState optional `princessChosen`.

### 4B. Golden Lucky Pot (`GOLDEN_POT`, 3x5) — "Fortune Pots"

Identity upgrade (keep the every-10th-spin pot drip untouched): during free spins,
fortune pots land on the reels and each instantly pays 1x-5x bet.

1. Description → append the free-spin hook, e.g.
   `'Chinese fortune — every 10th spin drops a pot, and free-spin pots pay up to 5x instantly!'`
2. `generateSmartGrid` — GOLDEN_POT free-spin block: ~18% of spins place 1-2 COIN
   cells (eligibility as usual). Check `SYMBOL_MAP.GOLDEN_POT` has a decent COIN icon;
   if it's the generic 🪙 fallback, reuse the theme's scatter/pot art instead.
3. `handleReelStop` before final `calculateWin`, gated GOLDEN_POT +
   `isCurrentFreeSpinRef.current`: for each COIN cell, roll 1-5x bet; credit the sum,
   toast `+X Coins`, add the cells to `winningCells`-style highlight via the normal
   win path (or simply let the delayed rescore run after crediting). Keep COIN out of
   base-game grids (it already is — weight 0, no injection).
4. No persistence needed; pots resolve per spin.

### Batch 4 verification checklist
- Princess: chosen symbol announced at FS start, expansion fires on 3+, reels visibly
  fill, rescore pays; Barnyard Bonanza mystery feature unaffected (regression).
- Golden Pot: pots land only in FS and pay instantly; the 10th-spin drip still works.

---

## Batch 5 (separate initiative) — Paylines + mechanic disclosure UI (legal requirement)

Not part of the uniqueness rework itself — a compliance requirement the owner flagged
separately: every slot needs to disclose its paylines and how its mechanic works,
likely required for legal/regulatory reasons in real-money or licensed markets.

Requirements (not yet scoped in detail — treat the below as a starting brief, not a
finished spec):
1. A per-slot "Paylines" view — show the actual line patterns `GET_PAYLINES(rows, reels)`
   draws across the grid (the same data already driving win evaluation), so the
   displayed lines are always accurate to what's actually paying out.
2. A per-slot "How It Works" mechanic explainer — plain-language description of that
   slot's headline feature (Hold & Win, Katana Wilds, Win Both Ways, Boss Battle,
   Kraken Attack, High Noon Duel, etc. — see the identity table near the top of this
   file for the full list once all 4 batches land).
3. **Must reuse each slot's own existing icon/symbol assets** for the mechanic
   illustrations (`SYMBOL_MAP[theme]` images, `coverImage`, theme wild/scatter art) —
   no generic stock art, no new icon set. This keeps the explainer visually
   consistent with the slot itself and avoids a second art pass.
4. Likely entry point: an info ("i") affordance near the bet controls or settings,
   opening a modal — but the exact placement/trigger is undecided; scope this with
   the owner before implementing.
5. This should cover all 22 slots, not just the 8 replicas being reworked above —
   flagships need paylines/mechanic disclosure too.

Status: **done.** `components/GameInfoModal.tsx` — an "Info" button next to Missions in
the in-game bottom bar opens a two-tab modal for `selectedGame`:
- "How it works": a per-theme mechanic explainer (`MECHANIC_INFO` map, one entry per
  `GameTheme`, all 22 covered) plus a "Key symbols" row rendering that slot's own
  Wild/Scatter/Seven/Ace icons via `GET_SYMBOLS(theme)` — no generic art.
- "Paylines": all 50 lines from `GET_PAYLINES(rows, reels)` rendered as mini line
  diagrams (the exact data the spin engine scores against). Buffalo Thunder and
  Olympus Ascend don't use fixed paylines (Ways to Win / Scatter Pays), so this tab
  shows an explanatory message for them instead of misleading line diagrams.

Verified live on both a fixed-payline slot (Piggy Riches — how-it-works text, key
symbol icons, and all 50 payline diagrams rendered) and a non-payline slot (Buffalo
Thunder — correctly shows the Ways to Win explanation instead of line diagrams).

---

## Verification playbook (headless browser)

Dev server: `nohup npm run dev -- --port 5185 --host` (Vite). Playwright:

```js
// NODE_PATH=/opt/node22/lib/node_modules node script.js
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 900, height: 420 } }); // landscape or the app shows "Rotate Device"
```

- Seed state BEFORE reload: `localStorage.setItem('cw_player', JSON.stringify({...level: 25, balance: 100000000...}))`
  (read the existing shape first), `cw_first_fs_done = '1'`, then `page.reload()`.
- Close onboarding popups: loop clicking `.round-btn` a few times with waits (daily
  bonus + profile modals block the lobby).
- Open a slot from the lobby grid by its cover image `src`. Beware duplicate img
  selectors (dock vs modal) — filter by ancestor class when needed.
- To force a rare feature: temporarily set its chance to 1.0 in code, verify visually,
  then RESTORE the real number before committing (grep your own debug values!).
- Screenshot each feature state; `tailwind is not defined` console errors are the
  sandbox CDN block, not a bug.
- Regression minimum per batch: open the two flagship slots whose features were
  previously shared with your replicas and confirm they still work.
