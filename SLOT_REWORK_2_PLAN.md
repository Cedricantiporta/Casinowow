# Slot Rework 2 — Real-Mechanic Pass

Ground rule for this pass (owner directive): **no invented mechanics.** Every feature
must be traceable to a named, shipped casino slot. Where the first rework pass
(SLOT_REWORK_PLAN.md) improvised, this pass replaces those features with faithful
adaptations of proven machines.

The Engine Primer, Gotchas, and Verification Playbook in `SLOT_REWORK_PLAN.md` are
**required reading** before executing any batch below — they are not repeated here.
Work on branch `claude/casino-game-review-krw8p5` unless told otherwise. UI rules
from CLAUDE.md apply (no all caps, no borders, no separators, line icons only).

---

## Audit — what's real vs. what was invented in rework pass 1

| Slot | Current mechanic | Real-world basis | Verdict |
|---|---|---|---|
| Deep Blue | Win Both Ways + Kraken wild reels | Both Ways = Starburst (real); Kraken = loosely "random wilds" but improvised in form | **Replace (Batch R1)** |
| Gold Rush | Dynamite dead-spin wilds + High Noon duel | Duel = classic gamble/double-up (real family); Dynamite = improvised | **Replace (Batch R2)** |
| Golden Lucky Pot | 10th-spin pot drip + FS instant pots | Cash-on-reels exists, but this combo was improvised | **Replace (Batch R3)** |
| Samurai Honor | Katana Wilds (expanding-wild respin, sticky FS wilds) | Starburst-style expanding wild respin (real basis), execution improvised | **Replace (Batch R4)** |
| Dungeon Raid | Boss Battle HP free spins + Loot Goblin | No real slot works this way — largely invented | **Propose replace (Batch R5, needs owner OK)** |
| Lucky Leprechaun | Rainbow Trail + nudge | Rainbow Riches "Road to Riches" (real) + pub-slot nudge (real) | Keep |
| Mystic Pets | Choose Your Companion | Pick-your-bonus volatility choice (real, widespread) | Keep |
| Princess Realm | Enchanted Mirror | Book of Ra / Book of Dead expanding symbol (real) | Keep |
| Pirate's Bounty | Ghost Ship walking wilds | Jack and the Beanstalk walking wilds (real) | Keep |
| Pharaoh's Tomb | Hold & Win coin respins | Hold & Win genre (real) | Keep |
| Buffalo Thunder | Ways to Win + wild multipliers | Buffalo (Aristocrat) (real) | Keep |
| Olympus / Arctic / Cosmic | Cascades, multiplier orbs, progressive FS multiplier | Gates of Olympus / tumble family (real) | Keep |

---

## Batch R1 — Deep Blue (`UNDERWATER`, 3x5) → "Pearl Hold & Spin"

**Source machine: Lightning Link / Dragon Link (Aristocrat).** Land 6+ cash-value
orbs → they lock, 3 respins, every new orb resets the counter to 3, orbs carry cash
values or jackpot tags, filling all 15 positions awards the Grand. This *replaces*
Deep Blue's free game entirely — the Hold & Spin IS the feature, exactly like
Lightning Link.

Remove first:
1. Win Both Ways block in `calculateWin` (the UNDERWATER reversed-line loop) **and**
   the UNDERWATER 0.75x payout dampener.
2. Kraken Attack block in `handleReelStop`, `krakenCols` state, and the teal column
   overlay JSX.
3. Description → `'Pearl Hold & Spin! 6 pearls lock the reels — every new pearl resets 3 respins. Fill the screen for the Grand.'`

Build (reuse the existing Hold & Win engine rather than duplicating it):
1. Introduce `const HOLD_WIN_THEMES = new Set<GameTheme>(['EGYPT', 'UNDERWATER'])` and
   `isHoldWinTheme(ft)`. Audit and convert each `ft === 'EGYPT'` gate deliberately —
   there are 4 (App.tsx ~3110 respin-grid generation, ~3453 coin injection in
   `generateSmartGrid`, ~4454 respin settle, ~4500 trigger/value-overlay) plus 2
   `ft !== 'EGYPT'` scatter-skip gates (~3971, ~4582). Egypt behavior must be
   byte-identical after the change (regression check mandatory).
2. `scattersToTrigger: 999` for Deep Blue — no scatter free spins; pearls are the
   only feature (faithful to Lightning Link where Hold & Spin is the headline).
   The `ft !== 'EGYPT'` scatter-count skip becomes `!isHoldWinTheme(ft)` so pearls
   aren't misread as scatters.
3. Pearls = `SymbolType.COIN` for UNDERWATER. Add a pearl icon to
   `SYMBOL_MAP.UNDERWATER[COIN]` — reuse existing deep-sea art; if no dedicated
   pearl asset exists, the generic `/symbols/coin.png` with the theme tile is
   acceptable for v1 (note it for an art pass).
4. Per-theme knobs where Egypt currently hardcodes: trigger count stays 6; UNDERWATER
   pearls get a higher jackpot-tag chance than Egypt's coins (MINI/MINOR/MAJOR only);
   **full 15-cell grid awards the GRAND jackpot on top of the pearl sum** — the
   `isFull` path already exists (`startHwCounting(..., isFull, ...)`, ~4481/5948);
   for UNDERWATER make `isFull` add `jackpotService.getAmounts()[4]` and fire the
   jackpot celebration.
5. Value overlay: the `egyptCoinMeta` pipeline already renders per-coin values —
   generalize its gate; no new UI needed beyond the pearl art.
6. Persistence: hold&win state already persists via `SavedGameState` (holdWin*
   fields) — nothing new.

Tuning intent: pearl land-rate ≈ Egypt's coin rate x0.9 (feature every ~60-80 spins);
value table 1x/2x/3x/5x/10x bet weighted 40/30/17/10/3; jackpot tag ~6% per pearl.

Verify: TEMP-bump pearl injection → 6-pearl trigger, respins lock/reset correctly,
sum credited, jackpot pearl pays its tier, full-grid GRAND fires; **Pharaoh's Tomb
unchanged** (trigger, respins, popup, payout).

---

## Batch R2 — Gold Rush (`WESTERN`, 3x5) → "Gold Cart Bonus"

**Source machine: Money Train 2/3/4 (Relax Gaming) — the Money Cart bonus.** 3+
bonus symbols open a separate hold-&-spin grid where every symbol carries a bet-
multiple value; 3 respins, any new symbol resets to 3; special modifier symbols act
on the other values. Train-heist theme fits Gold Rush's western identity exactly.

Remove first:
1. Dynamite Blast block in `handleReelStop`, `dynamiteCells` state + amber overlay.
2. High Noon Duel end-to-end: `duelOffer`/`showDuelModal` state + auto-dismiss
   effect, the `calculateWin` offer site, the offer chip JSX, `handleDuelResolve`,
   spin()/handleHeaderBack guards, `<DuelGambleModal>` render, and delete
   `components/DuelGambleModal.tsx`.
3. Description → `'Gold Cart! 3 bonus symbols start the heist — every symbol holds a prize, and collectors, payers and snipers grow the haul.'`

Build — new `components/GoldCartModal.tsx` (self-contained bonus like
`NeonRouletteModal`: opens from a scatter trigger, resolves via
`onComplete(totalWin)`):
1. Grid 5x3 (match the slot). Feature starts with the 3+ triggering symbols placed
   with rolled values, 3 respins.
2. Each respin, every empty cell lands a symbol with probability ~13%. Any landing
   resets respins to 3. Ends at 0 respins or full grid.
3. Symbol types on landing (weighted):
   - **Value** (~86%): 1x/2x/3x/5x/10x bet — weights 42/28/16/10/4.
   - **Payer** (~6%): has own value (1x-2x); on landing, adds its value to every
     other symbol once.
   - **Collector** (~5%): collects the values of all other symbols and adds the sum
     to itself (others keep their values — Money Train semantics: collector adds the
     total to its own value).
   - **Sniper** (~3%): doubles the value of 3 random other symbols.
4. Full grid: total x2 (stand-in for Money Train's row-unlock escalation — note in a
   comment; a future pass can add literal row unlocks).
5. End: credit `sum(values) * bet` — reuse the `handleRainbowTrailComplete` pattern
   (win-tier celebration, `trackSlotQuest('BONUS_TRIGGER', 1)`).
6. Wiring: WESTERN branch in the scatter-trigger section of `handleReelStop`
   (modeled on the NEON branch): `SCATTER_SHOWCASE` → capture bet → open modal.
   Guards: `spin()` early-return, `handleHeaderBack` must-resolve list, game-change
   reset. No SavedGameState fields (bonus resolves atomically).
7. UI: dusty gold/wood palette, symbols as gold-nugget chips with value text; the
   respin counter as 3 dots; modifier lands get a brief flash + toast. Title case.

Verify: forced trigger; landing resets counter; each modifier acts exactly per its
rule (assert value math on a seeded run via console probe); balance delta equals the
shown total; full-grid doubling; Pirate/generic scatter FS untouched.

---

## Batch R3 — Golden Lucky Pot (`GOLDEN_POT`, 3x5) → "Three Fortune Pots"

**Source family: persistent pot-collection machines — Coin Kingdom's three-pot
persistent bonus, More Chilli's fill-the-peppers, Gold Stacks 88's pot collect
(Aristocrat/IGT family).** Three pots sit above the reels; normal spins gradually
fill them; a full pot arms its feature; the trigger fires with the same cadence as
Ox Gold Power's pot (the DRAGON 10-spin chance roll), and **every armed pot fires
together** — 1, 2, or 3 features at once.

Remove first:
1. Batch-4 "Fortune Pots" FS instant-pay block (`handleReelStop`) and its
   `generateSmartGrid` COIN injection.
2. The old every-10th-spin drip: `goldenPotSpinCount`, `goldenPotLastBetRef`,
   `goldenPotPendingRef`, `goldenPotFrozen`, `goldenPotWin` + its award effect and
   popup JSX (the pots replace it wholesale).
3. Description → `'Three Fortune Pots fill as you spin — full pots burst together for free spins, jackpots and multipliers!'`

Build:
1. State (persist via `SavedGameState` — pot fill is long-term collect state):
   ```tsx
   const goldenPotsRef = useRef({ spins: 0, jackpot: 0, multiplier: 0, spinsBonus: 0 });
   const [goldenPotsUi, setGoldenPotsUi] = useState({ ...goldenPotsRef.current });
   const POT_FULL = 10;
   ```
2. Fill: each paid base-game spin (`GOLDEN_POT`, `!isFreeSpin`, in the same
   `spin()` site the old drip used), ~35% chance to add +1 to one pot — weights
   spins 45 / multiplier 35 / jackpot 20. If the spins pot is already full and gets
   picked again → `spinsBonus += 1` (cap +10) — this is the owner's "free spins pot
   can keep increasing".
3. Trigger (mirror the DRAGON pot cadence): while ≥1 pot is full, each settle has a
   ~6% chance (+1.5% per 10 spins since last feature, capped 20%) → pot-shake
   animation on the full pot(s) → popup ("Pots burst!") → activate **all** full pots
   simultaneously:
   - **Spins pot** → `8 + spinsBonus` free spins (generic FS flow).
   - **Multiplier pot** → roll x2/x3/x5 (weights 55/33/12). If free spins also
     fired, it multiplies every FS win this session (apply next to the SPACE
     Supernova block in `calculateWin`). If it fired alone, it arms a sticky
     next-win multiplier (persists until a winning spin consumes it).
   - **Jackpot pot** → award a jackpot tier via a weighted roll MINI 55 / MINOR 30 /
     MAJOR 12 / MEGA 3 with the standard jackpot celebration; multiplied if the
     multiplier pot fired too.
   - Every activated pot resets to 0 (`spinsBonus` resets with the spins pot).
4. UI: a pots row above the reels (SPACE banner slot): three small pot icons
   (reuse `/goldenpot_scatter.png` art or the theme's pot art) each with a thin fill
   bar and a label — `Spins +N` / `Jackpot` / `Multiplier`. Full pot = gold glow
   (boxShadow, no border). Fill ticks get a small pop animation.
5. Resets: pots do NOT reset on game change or exit (persist in SavedGameState +
   restore); the FS multiplier resets on session end (`handleFreeSpinSummaryClose`)
   and game change like every session-scoped modifier.

Verify: TEMP-bump fill + trigger chances; single-pot, dual-pot and triple-pot
bursts each behave (spins count includes bonus, multiplier applies to FS wins,
jackpot pays tier x multiplier); pots persist across exit/re-enter and app reload;
Ox Gold Power's own pot trigger untouched.

---

## Batch R4 — Samurai Honor (`SAMURAI`) → 6 reels + "Sticky Wild Reels" (pip counters)

**Source machine: Sakura Fortune / Sakura Fortune 2 (Quickspin)** — samurai-Japan
themed, princess wilds nudge to cover the full reel, lock in place, and award
respins; in Sakura Fortune 2 each full wild reel is sticky with a spin counter and
free spins make every wild sticky with +1 spin per wild. The owner's spec ("two
dots each column, column wild stays for 2 spins, free spins are a better version of
the dots") maps directly onto this.

Changes:
1. `constants.ts`: `reels: 7 → 6`. Description →
   `'Sticky Wild Reels! Wilds grow to fill their reel and stay locked for 2 spins — free-spin wilds stay longer and add spins.'`
2. **Remove the Katana slash respin machinery**: `samuraiRespinRef`,
   `samuraiHeldCols` state + its spin()/pointer guards + the IDLE auto-continue
   branch, the slash blocks in `generateSmartGrid` and `handleReelStop`, and the
   `samuraiHeldCols`/`samuraiStickyWilds` SavedGameState fields (replace, don't
   strand them).
3. New state:
   ```tsx
   // Each sticky wild reel remembers its column and how many spins it has left.
   const samuraiStickyReelsRef = useRef<{ col: number; pips: number }[]>([]);
   const [samuraiStickyReelsUi, setSamuraiStickyReelsUi] = useState<{ col: number; pips: number }[]>([]);
   ```
4. Base game: in `generateSmartGrid` (SAMURAI block, replacing the slash seeding) a
   single wild seeds on a middle reel (~11% per spin, cols 1..4, one at most). In
   `handleReelStop` before `calculateWin`: any middle reel containing a wild (and
   not already sticky) **nudges to a full wild reel** (forced-redraw pattern), joins
   `samuraiStickyReelsRef` with `pips: 2`, toast `'Wild Reel locked!'`, delayed
   rescore, `return next`.
5. Pip lifecycle: at the top of `spin()` (paid or free), decrement every sticky
   reel's pips; drop entries at 0. In `generateSmartGrid`, stamp every surviving
   sticky column fully wild before other phases (skip SCATTER injection into those
   columns). Multiple columns can be sticky at once, each with independent pips.
6. Free spins ("better version"): every wild that lands anywhere nudges its reel
   fully wild, sticks with `pips: 3`, and awards `+1` free spin (Sakura Fortune 2's
   loop — cap total session spins at +10 extra to keep it sane). Landing a wild on
   an already-sticky reel refreshes its pips to 3.
7. UI: reuse the existing red column glow for sticky reels; above each sticky
   column render its pips as 2-3 small dots (filled = spins remaining) — small
   `absolute` row at the column top, shadow only, no border.
8. Persistence: `samuraiStickyReels` optional field in `SavedGameState` (save in
   `handleHeaderBack`, restore in `handleGameSelect`, reset on slot change +
   `handleFreeSpinSummaryClose` clears FS-earned reels? **No** — sticky reels earned
   in FS die naturally by pips; only clear on game change).
9. Spin guards: none needed (no respin loop anymore — sticky reels ride normal
   spins). Remove the old samurai guard conditions from `spin()`/pointer handlers.

Verify: 6 reels render; wild → full-reel nudge; reel visibly persists exactly 2
subsequent spins with pips counting down; two simultaneous sticky reels; FS: 3 pips,
pip refresh, +1 spin per new wild reel; exit/re-enter restores pips.

---

## Batch R5 (PROPOSED — needs owner approval) — Dungeon Raid → "Loot Collector Free Spins"

The Boss Battle HP mechanic is the last big invented feature. **Source machine: Big
Bass Bonanza (Pragmatic Play)** — during free spins, money symbols land carrying bet
multiples; the fisherman (collector) collects every visible money value; every 4th
collector awards +2 spins and raises the collection multiplier (x2, x3, x10 in the
real game). Reskinned: money symbols = loot bags, collector = the hero.

Sketch (full spec on approval): FS-only; loot bags land at ~25%/spin with 1x-10x
values (COIN symbol + value overlay, reuse egyptCoinMeta rendering); hero symbol
lands ~12%/spin on reel 3 only; on hero landing → collect all visible bag values x
current multiplier; every 4th hero → +2 spins, multiplier +1 (cap x10 — matching
the real game's progression feel); progress pips UI (4 hero slots) via the SPACE
banner pattern. Loot Goblin dead-spin transform is retired at the same time.

---

## Proven-mechanic catalog (source games to pull from — nothing off this list)

Already live and staying:
| Mechanic | Source machine | Our slot |
|---|---|---|
| Hold & Win coin respins | Hold & Win genre (Playson etc.) | Pharaoh's Tomb |
| Walking wilds | Jack and the Beanstalk (NetEnt) | Pirate's Bounty |
| Ways to Win + wild multipliers | Buffalo (Aristocrat) | Buffalo Thunder |
| Tumbles / scatter pays / multiplier orbs | Gates of Olympus, Sweet Bonanza (Pragmatic) | Arctic, Olympus, Cosmic |
| Expanding chosen symbol | Book of Ra / Book of Dead | Princess Realm |
| Trail/ladder bonus | Rainbow Riches (Barcrest) | Lucky Leprechaun |
| Pick-your-bonus free spins | widespread (Extra Chilli et al.) | Mystic Pets |
| Sticky wild free spins | Dead or Alive 2 (NetEnt) | Mystic Pets (Unicorn) |
| Bonus wheel | Wheel of Fortune (IGT) family | Neon Vegas roulette |

This pass (R1-R5):
| Mechanic | Source machine | Target slot |
|---|---|---|
| Hold & Spin cash orbs + Grand on full screen | Lightning Link / Dragon Link (Aristocrat) | Deep Blue (R1) |
| Money Cart bonus (Payer/Collector/Sniper) | Money Train 2/3/4 (Relax Gaming) | Gold Rush (R2) |
| Persistent pot collection, combinable features | Coin Kingdom / More Chilli / Gold Stacks 88 family | Golden Lucky Pot (R3) |
| Sticky wild reels with spin-counter pips | Sakura Fortune 1/2 (Quickspin) | Samurai Honor (R4) |
| Collector free spins (+spins/+multiplier every N) | Big Bass Bonanza (Pragmatic) | Dungeon Raid (R5, pending OK) |

Bench (available for future picks, not yet assigned):
| Mechanic | Source machine | Notes |
|---|---|---|
| Fu Bat mystery jackpot pick | 88 Fortunes (Light & Wonder) | Could present R3's jackpot pot as a 12-coin pick |
| Bags-above-reels value collect | Fu Dai Lian Lian (Light & Wonder) | Alternative flavor for R3 |
| Duel / VS bonus done properly | Wanted Dead or a Wild (Hacksaw) | If the duel idea ever returns |
| Expanding wild respin + both-ways | Starburst (NetEnt) | Retired from Deep Blue; fits a neon slot |
| Megaways variable reels | Big Time Gaming | Out of scope — engine rework |
| Cluster pays | Jammin' Jars (Push Gaming) | Needs a new win evaluator — medium project |

---

## Execution order & rules

R1 → R2 → R3 → R4 (R5 only after owner approval). One batch per commit, live-verify
per the SLOT_REWORK_PLAN.md playbook before each push, regression-check the donor
flagship (Egypt for R1, generic FS for R2, Ox Gold for R3). Update the paylines/
mechanic disclosure copy in `components/GameInfoModal.tsx` (`MECHANIC_INFO`) for
every slot whose feature changes — that text is a legal disclosure and must track
the real behavior.
