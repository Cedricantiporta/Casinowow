// Platform-aware purchase routing.
//
// Google Play forbids non-Google payment for in-app digital goods, so the
// Stripe checkout must NOT be offered inside the Android (Capacitor) build —
// doing so gets the app rejected/removed. This service decides, per platform,
// how a real-money purchase is handled:
//
//   • Web / PWA        → Stripe (opens the existing PaymentModal).
//   • Native Android   → Google Play Billing.
//
// Play Billing is a native integration that must be completed and tested in the
// Android project itself (see the checklist at the bottom). Until it's wired,
// isBillingReady() returns false on native and the shop hides real-money packs
// there — so the shipped build is Play-compliant immediately (no Stripe for
// coins/gems on Android) without shipping a broken/forced native SDK.

import { Capacitor } from '@capacitor/core';

export type PurchaseRoute = 'stripe' | 'play' | 'unavailable';

export function getPlatform(): string {
    try { return Capacitor.getPlatform(); } catch { return 'web'; }
}

export function isNativeAndroid(): boolean {
    return getPlatform() === 'android';
}

// True once a native Play Billing implementation is wired (see playPurchase()).
// Left false until the native plugin + Play Console products exist, so we never
// offer a payment path we can't fulfill.
export function isBillingReady(): boolean {
    return false; // ← flip to a real capability check when Play Billing is wired
}

// Where a real-money purchase should go on this platform.
export function purchaseRoute(): PurchaseRoute {
    if (!isNativeAndroid()) return 'stripe';        // web / PWA keep Stripe
    return isBillingReady() ? 'play' : 'unavailable';
}

// Whether real-money packs should be shown/tappable at all on this platform.
// (On native Android before Play Billing is wired, they're hidden.)
export function realMoneyPurchasesEnabled(): boolean {
    return purchaseRoute() !== 'unavailable';
}

export interface PlayPurchaseResult { success: boolean; error?: string }

// Native Play Billing purchase — integration point.
//
// TODO (native, do on-device — can't be built/verified from web tooling):
//   1. Add a Capacitor-6-compatible IAP plugin. `cordova-plugin-purchase`
//      (a.k.a. "In-App Purchase 2", npm `cordova-plugin-purchase`) works with
//      Capacitor 6; RevenueCat's `@revenuecat/purchases-capacitor` needs
//      Capacitor 7 so it can't be added until the app upgrades Capacitor.
//   2. Create the products in Google Play Console with IDs matching our
//      productId values (coin_1..coin_5, gem_1..gem_3) as managed products.
//   3. Initialize the plugin, look up the product by `productId`, run the
//      purchase, and on a verified purchase resolve { success: true }.
//   4. VERIFY SERVER-SIDE before crediting: send the purchase token to a
//      Supabase edge function that calls the Google Play Developer API
//      (Purchases.products.get) with a service account, and on success inserts
//      a payment_credits row (same table/flow the Stripe webhook uses). The
//      client then credits via the existing claim_payment_credits() RPC — do
//      NOT grant coins/gems from the client on purchase success.
//   5. Then make isBillingReady() reflect real plugin availability.
export async function playPurchase(_productId: string): Promise<PlayPurchaseResult> {
    return { success: false, error: 'Play Billing is not available yet.' };
}
