// Vibration feedback for spins/wins/buttons. Uses the native Haptics plugin on
// Android/iOS (proper taptic feedback) and falls back to navigator.vibrate on
// web where the plugin isn't backed by real hardware. Silently no-ops if
// neither is available (desktop browsers, permissions denied, etc.) or the
// player has it turned off in Settings.
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

let enabled = true;
try { enabled = localStorage.getItem('cw_haptics') !== '0'; } catch { /* ignore */ }

export function isHapticsEnabled(): boolean {
    return enabled;
}

export function setHapticsEnabled(on: boolean): void {
    enabled = on;
    try { localStorage.setItem('cw_haptics', on ? '1' : '0'); } catch { /* ignore */ }
}

const isNative = Capacitor.isNativePlatform();

async function impact(style: ImpactStyle) {
    if (!enabled) return;
    try {
        if (isNative) {
            await Haptics.impact({ style });
        } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(style === ImpactStyle.Heavy ? 40 : style === ImpactStyle.Medium ? 20 : 10);
        }
    } catch { /* haptics are best-effort */ }
}

export const hapticsService = {
    light: () => impact(ImpactStyle.Light),   // button taps, toggles
    medium: () => impact(ImpactStyle.Medium), // spin button, reel stop
    heavy: () => impact(ImpactStyle.Heavy),   // big win, jackpot
};
