# CasinoWow UI Map

A reference of every reusable UI pattern in the game. Use these when building new screens.

---

## 1. Modal Container (Standard)

Used by: Golden Treasury, Events, Shop, Mission Pass, Profile, Settings — any full-screen popup.

```tsx
// Outer: full-screen backdrop, centers content
<div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/10 backdrop-blur-md p-4 animate-pop-in select-none"
    onClick={onClose}>
  // Inner: the card — stop propagation so clicks inside don't close
  <div className="w-full max-w-sm rounded-3xl overflow-hidden flex flex-col"
      onClick={e => e.stopPropagation()}
      style={{
        background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
        boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
      }}>
    {/* Header */}
    <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 relative">
      <span className="absolute left-0 right-0 text-center text-white font-tanker text-base drop-shadow pointer-events-none">
        Title
      </span>
      <button className="round-btn cursor-pointer shrink-0 ml-auto z-10" onClick={onClose}>
        <i className="ti ti-x" />
      </button>
    </div>
    {/* Body */}
    ...
  </div>
</div>
```

**z-index ladder:** `z-[150]` standard → `z-[160]` overlays within modal → `z-[165]` popups within modal → `z-[200]` top-of-stack modals.

---

## 2. Card Containers

### Purple card — `.tcard`
Used inside modals for content tiles (collect timers, slots, etc.).

```css
.tcard {
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(197,16,224,0.32) 0%, rgba(160,60,255,0.22) 20%, rgba(10,0,50,0.75) 100%);
  box-shadow: inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5);
}
```

```tsx
<div className="tcard flex flex-col items-center gap-2 p-3"> ... </div>
```

### Gold card — `.tcard-gold`
Used for premium/jackpot content tiles.

```css
.tcard-gold {
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(251,191,36,0.32) 0%, rgba(217,119,6,0.24) 20%, rgba(40,20,0,0.78) 100%);
  box-shadow: inset 0 1px 0 rgba(255,220,120,0.45), 0 3px 10px rgba(0,0,0,0.5);
}
```

```tsx
<div className="tcard-gold flex flex-col items-center gap-2 p-3"> ... </div>
```

### Active jackpot card (inline override on top of `.tcard`)
```tsx
<div className="tcard flex flex-col ..."
    style={{
      background: 'linear-gradient(160deg,#3d2800,#1e1000)',
      border: '1px solid rgba(255,200,0,0.4)',
      boxShadow: '0 0 16px rgba(255,180,0,0.25), inset 0 1px 0 rgba(255,220,100,0.2)',
    }}>
```

---

## 3. Buttons

### 3D Pill Button — `.pill-green` + `.pill-face`

The default action button everywhere. Color is overridden via inline `style` on `.pill-face`.

```tsx
// Default green
<button className="pill-green">
  <div className="pill-face">Label</div>
</button>

// Custom color override (set background on pill-face)
<button className="pill-green">
  <div className="pill-face" style={{
    background: 'linear-gradient(180deg,#a855f7,#7c3aed,#5b21b6)',
    padding: '8px 20px',
    fontSize: '12px',
  }}>
    Label
  </div>
</button>
```

**Common color overrides:**

| Color    | `background` value |
|----------|--------------------|
| Green (default) | `linear-gradient(180deg,#52c215,#35900a 50%,#246606)` |
| Purple   | `linear-gradient(180deg,#a855f7,#7c3aed,#5b21b6)` |
| Blue     | `linear-gradient(180deg,#38bdf8,#0ea5e9,#0369a1)` |
| Red      | `linear-gradient(180deg,#ef4444,#b91c1c)` |
| Gold     | `linear-gradient(180deg,#fbbf24,#d97706)` |
| Pink     | `linear-gradient(180deg,#f9a8d4,#db2777)` |

`.pill-face::before` adds an automatic top-gloss highlight. Do not add it manually.

**Size control** — override padding and fontSize only:
```tsx
style={{ padding: '6px 14px', fontSize: '11px' }}  // small
style={{ padding: '9px 18px', fontSize: '12px' }}  // default
style={{ padding: '12px 24px', fontSize: '14px' }} // large
```

---

### 3D Raised Button (legacy) — `.btn` + `.face`

Used for the BUY / SPIN / SALE buttons in the game toolbar. Do not use for new UI — use `.pill-green` instead.

```tsx
<div className="btn green">
  <div className="face" style={{ padding: '5px 12px' }}>
    <span className="lbl">BUY</span>
  </div>
</div>
```

Colors: `.green`, `.pink`, `.yellow`, `.blue`

Variant `.flat` + `.flat-face` is used for the max-bet and spin buttons in the game bar.

---

### Round Icon Button — `.round-btn`

Small circular button for close/back/action icons.

```css
/* base: 30×30px (mobile), 34×34px (md+) */
.round-btn { width: 30px; height: 30px; border-radius: 50%; ... }
```

```tsx
<button className="round-btn cursor-pointer" onClick={onClose}>
  <i className="ti ti-x" />
</button>
```

---

### 3D Button (avoid in new UI) — `.btn-3d`

```css
.btn-3d { position: relative; padding-bottom: 3px; overflow: hidden;
  box-shadow: 0 4px 0 rgba(0,0,0,0.45); ... }
```

Only used in a few legacy spots. Replace with `.pill-green` wherever possible.

---

## 4. Progress Bars

### XP / Level bar — `.rtrack`

The topbar XP progress pill. Overflow-visible so the star icon can extend outside.

```css
.rtrack { flex:1; height:20px; border-radius:18px; background: linear-gradient(180deg,#2a0d52,#1a0838);
  border:1px solid #38106e; box-shadow: inset 0 2px 3px rgba(0,0,0,0.6);
  position:relative; display:flex; align-items:center; justify-content:center; }
```

Fill bar (child, absolute positioned):
```tsx
<div style={{
  position: 'absolute', left: 0, top: 0, bottom: 0,
  width: `${pct}%`,
  borderRadius: 12,
  background: boosted
    ? 'linear-gradient(180deg,#ffe066,#e8a800 60%,#b07000)'  // gold (boosted)
    : 'linear-gradient(180deg,#7fd0ff,#2b8fe8 60%,#1565b0)', // blue (normal)
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
  transition: 'width 0.4s ease',
  overflow: 'hidden',
}}>
  {/* optional shine sweep */}
  <div className="absolute inset-y-0 w-5 bg-white/50 skew-x-[-20deg] animate-xp-bar-shine pointer-events-none" />
</div>
```

### Collect multiplier bar (in Golden Treasury header)

```tsx
<div style={{ width: 110, height: 24, borderRadius: 18,
  background: 'rgba(10,0,40,0.55)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)',
  overflow: 'hidden', position: 'relative' }}>
  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0,
    width: `${tierProgress * 100}%`, borderRadius: 18,
    background: 'linear-gradient(180deg,#ffe066,#e8a800 60%,#b07000)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
    transition: 'width 0.4s ease' }} />
  <span style={{ position: 'relative', fontWeight: 900, fontSize: 17, color: '#fff',
    textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>{mult}X</span>
</div>
```

### `.bar` — generic game bar gloss wrapper

Adds top highlight + bottom shadow gloss. Use `.barA` (bottom bar) or `.barB` (top bar) for the main game chrome.

---

## 5. Notification Dot (red badge)

Used on lobby bottom-bar icons to signal something needs attention.

```tsx
<div className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 z-10"
    style={{
      background: 'radial-gradient(circle at 40% 28%, #ff7070, #cc0000 60%, #990000)',
      boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.9)',
      border: '1.5px solid rgba(255,120,120,0.7)',
    }}>
  <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{count}</span>
</div>
```

The parent element must be `position: relative`.

---

## 6. Currency Pill — `.currency-pill`

Topbar coin / gem display.

```css
.currency-pill { display:flex; align-items:center; gap:4px; height:20px;
  background: linear-gradient(180deg,#2a0d52,#1a0838); border:1px solid #38106e;
  border-radius:18px; padding:2px 8px 2px 3px; box-shadow: inset 0 2px 3px rgba(0,0,0,0.6); }
```

```tsx
<div className="currency-pill flex items-center gap-1">
  <img src="/symbols/coin.png" style={{ width: 26, height: 26, marginLeft: '-6px' }} />
  <span className="num flex-1">{formatK(balance)}</span>
</div>
```

`.num` class: `font-size:10px; font-weight:900; color:#fff; text-shadow:0 1px 2px rgba(0,0,0,0.7);`
`.num-sm` for 9px variant.

---

## 7. Reward / Stat Row — `.reward`

```css
.reward { flex:1; display:flex; align-items:center; gap:4px;
  background: rgba(0,0,0,0.3); border:1px solid #38106e; border-radius:18px;
  padding:2px 6px 2px 3px; min-width:70px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.5); }
```

---

## 8. Shine Animations

Animations defined in `index.html` and wired to Tailwind:

| Class | Keyframe | Purpose |
|-------|----------|---------|
| `animate-btn-shine` | `btnShine 4s` | BUY / SALE / SPIN button shine sweep |
| `animate-xp-bar-shine` | `xpBarShine 5s` | XP progress bar sweep |
| `animate-event-shine` | `eventShine 3s` | Events pill shine sweep |
| `animate-event-glow` | `eventGlow 2s` | Events pill border glow pulse |
| `animate-event-pulse` | `eventTextPulse 2s` | Events text scale pulse |
| `animate-piggy-shake` | `piggyShake 0.8s` | Piggy bank shake + glow |
| `animate-pop-in` | `popIn` | Modal entrance scale+fade |

Shine element pattern (put inside `overflow:hidden` parent):
```tsx
<div className="absolute inset-y-0 w-8 bg-white/30 skew-x-[-20deg] animate-btn-shine pointer-events-none"
    style={{ zIndex: 2 }} />
```

---

## 9. Jackpot Ticker Tier Boxes — `.jp` / `.jp-tier` / `.jp-amt`

Displayed in the jackpot bar at the top of the game screen.

```css
.jp { flex:1; text-align:center; display:flex; flex-direction:column; align-items:center; gap:2px; }
.jp-tier { font-family:'Titan One'; font-size:11px; font-weight:900; letter-spacing:0.2px; }
.jp-amt { font-family:'Nunito'; font-weight:900; font-size:8px; color:#fff; }
```

---

## 10. Typography Conventions

| Element | Class / style |
|---------|--------------|
| Modal title | `font-tanker text-base text-white drop-shadow` |
| Section label | `font-black text-white/60 text-[10px] uppercase tracking-widest` |
| Body text | `text-white text-xs` (or `text-sm` for slightly larger) |
| Sub-caption | `text-white/50 text-[10px]` |
| Coin amount | `num` class or `font-black text-white` |
| Level display | `font-black` on `.rtrack` |
| Game title font | `font-tanker` |
| Number font | `font-nunito font-black` (default body font) |

**Font sizes: use three levels only**
- Large: `text-base` (16px) or `text-lg`
- Medium: `text-sm` (14px) or `text-xs` (12px)  
- Small: `text-[10px]` — do not go smaller

---

## 11. Icons

Use **Tabler Icons** (`ti ti-*`) for UI icons. Avoid emoji in UI chrome.

```tsx
<i className="ti ti-x" />          // close
<i className="ti ti-arrow-left" /> // back
<i className="ti ti-check" />      // claimed
<i className="ti ti-lock" />       // locked
<i className="ti ti-bolt" />       // boost / speed
<i className="ti ti-pig" />        // piggy bank
<i className="ti ti-crown" />      // VIP
<i className="ti ti-star" />       // level / XP
<i className="ti ti-calendar" />   // timer / event
```

Use `/ui/lock.png` image (not the ti icon) for the lock badge on reward cards.

---

## 12. General Rules (from CLAUDE.md)

- **No ALL CAPS** in headers or labels — use title case or sentence case.
- **No colored borders** on containers — use `inset 0 1px 0 rgba(...)` box-shadow highlights instead.
- **No full-width line separators** — leave horizontal margins on both sides if absolutely needed.
- **No excessive emojis** — prefer Tabler Icons.
- **Font sizes**: large / medium / small only. Never below `text-[10px]`.
