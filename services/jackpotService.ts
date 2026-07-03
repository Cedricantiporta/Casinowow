
// Singleton jackpot service — amounts tied to current max bet
// Tiers: Mini=15x, Minor=30x, Major=100x, Mega=500x, Grand=1000x of max bet
const TIER_MULTIPLIERS = [15, 30, 100, 500, 1000];
const KEY = 'cw_jackpots';
// Per-slot variation factors (5–20% variation, deterministic by slot index)
const SLOT_VARS = [1.00, 0.88, 1.14, 1.08, 0.93, 1.19, 0.96, 1.07, 1.12, 0.87, 1.21];

export { SLOT_VARS };

// Average per-120ms-tick increment for tier i, matching the old randomized
// tick's mean (uniform 0..(30+i*21) plus a flat +9) — used to derive a smooth,
// deterministic "growth since epoch" curve instead of an actual repeating timer.
const avgIncrement = (i: number) => (30 + i * 21) / 2 + 9;

class JackpotService {
    private baseMaxBet: number = 10000;
    private epoch: number = Date.now();
    private listeners: Set<() => void> = new Set();
    private notifyHandle: ReturnType<typeof setInterval> | null = null;
    private saveHandle: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.loadState();
    }

    private loadState() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Number.isFinite(parsed.e)) {
                    this.epoch = parsed.e;
                    this.baseMaxBet = parsed.b || 10000;
                    return;
                }
                // Legacy shape ({g,t,b}) from before this was time-based — treat
                // the old timestamp as the new epoch, growth continues from "now".
                if (Number.isFinite(parsed.t)) {
                    this.epoch = parsed.t;
                    this.baseMaxBet = parsed.b || 10000;
                    return;
                }
            }
        } catch { /* ignore */ }
        this.epoch = Date.now();
    }

    private saveState() {
        try {
            localStorage.setItem(KEY, JSON.stringify({ e: this.epoch, b: this.baseMaxBet }));
        } catch { /* ignore */ }
    }

    private growth(): number[] {
        const elapsed = Math.max(0, Date.now() - this.epoch);
        const ticks = elapsed / 120;
        return TIER_MULTIPLIERS.map((_, i) => Math.floor(ticks * avgIncrement(i)));
    }

    setMaxBet(maxBet: number) {
        if (maxBet === this.baseMaxBet) return;
        this.baseMaxBet = maxBet;
        this.epoch = Date.now();
        this.saveState();
        this.listeners.forEach(fn => fn());
    }

    getAmounts(): number[] {
        const growth = this.growth();
        return TIER_MULTIPLIERS.map((m, i) => Math.floor(m * this.baseMaxBet + growth[i]));
    }

    getSlotAmounts(slotIdx: number): number[] {
        const v = SLOT_VARS[slotIdx % SLOT_VARS.length];
        return this.getAmounts().map(a => Math.floor(a * v));
    }

    // Lobby counter shows Grand jackpot (1000x maxBet × slotVar)
    getSlotTotal(slotIdx: number): number {
        const v = SLOT_VARS[slotIdx % SLOT_VARS.length];
        const grand = Math.floor(TIER_MULTIPLIERS[4] * this.baseMaxBet + this.growth()[4]);
        return Math.floor(grand * v);
    }

    // Notifies subscribers periodically so a VISIBLE jackpot display can animate
    // its climb — but the interval only exists while at least one subscriber is
    // mounted (i.e. only while the lobby list or a jackpot ticker is actually on
    // screen), not for the app's entire lifetime. This used to be a permanent
    // setInterval(…, 120) created once in the constructor and running forever —
    // 8 ticks/sec, notifying listeners, for the whole session regardless of
    // whether anything was even visible to show it. The interval is now created
    // lazily on first subscribe and torn down when the last one unsubscribes.
    subscribe(fn: () => void): () => void {
        this.listeners.add(fn);
        if (!this.notifyHandle) {
            this.notifyHandle = setInterval(() => this.listeners.forEach(l => l()), 1000);
            this.saveHandle = setInterval(() => this.saveState(), 8000);
        }
        return () => {
            this.listeners.delete(fn);
            if (this.listeners.size === 0) {
                if (this.notifyHandle) { clearInterval(this.notifyHandle); this.notifyHandle = null; }
                if (this.saveHandle) { clearInterval(this.saveHandle); this.saveHandle = null; }
                this.saveState();
            }
        };
    }
}

export const jackpotService = new JackpotService();
