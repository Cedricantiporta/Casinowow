import React, { useState, useEffect, useCallback } from 'react';
import { loadStripe, Stripe as StripeType } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
    CurrencyInfo,
    PRODUCT_USD_CENTS,
    toStripeAmount,
    formatLocalPrice,
    getDeviceId,
} from '../services/paymentService';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let stripePromise: Promise<StripeType | null> | null = null;
function getStripe() {
    if (!stripePromise) stripePromise = loadStripe(STRIPE_PK ?? '');
    return stripePromise;
}

export interface PaymentItem {
    productId: string;   // e.g. 'coin_1', 'gem_2'
    label: string;       // e.g. 'Pile of Coins'
    icon: string;        // asset path
    itemType: 'COIN' | 'DIAMOND';
    itemAmount: number;  // coins or gems to grant
}

interface PaymentModalProps {
    item: PaymentItem | null;
    currency: CurrencyInfo;
    onClose: () => void;
    onSuccess: (item: PaymentItem) => void;
}

// ─── Inner form (rendered inside <Elements>) ────────────────────────────────
const CheckoutForm: React.FC<{
    item: PaymentItem;
    currency: CurrencyInfo;
    localPrice: string;
    onClose: () => void;
    onSuccess: (item: PaymentItem) => void;
}> = ({ item, currency, localPrice, onClose, onSuccess }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setStatus('processing');
        setErrorMsg('');

        const { error } = await stripe.confirmPayment({
            elements,
            redirect: 'if_required', // non-redirect methods complete inline
            confirmParams: {
                return_url: window.location.href, // fallback for redirect methods
            },
        });

        if (error) {
            setErrorMsg(error.message ?? 'Payment failed. Please try again.');
            setStatus('error');
        } else {
            setStatus('done');
            // Small delay so the success state is visible before the modal closes
            setTimeout(() => onSuccess(item), 1200);
        }
    }, [stripe, elements, item, onSuccess]);

    if (status === 'done') {
        return (
            <div className="flex flex-col items-center gap-3 py-8">
                <div className="text-5xl">✅</div>
                <div className="font-black text-white text-base">Payment complete!</div>
                <div className="text-purple-300 text-sm">Your items are being added…</div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <PaymentElement
                options={{
                    layout: 'tabs',
                    wallets: { applePay: 'auto', googlePay: 'auto' },
                }}
            />
            {errorMsg && (
                <div className="text-red-400 text-xs text-center font-bold px-2">{errorMsg}</div>
            )}
            <button
                type="submit"
                disabled={!stripe || status === 'processing'}
                className="pill-green w-full"
            >
                <div className="pill-face" style={{ fontSize: 13, padding: '10px' }}>
                    {status === 'processing' ? 'Processing…' : `Pay ${localPrice}`}
                </div>
            </button>
            <button type="button" onClick={onClose}
                className="text-purple-400 text-xs text-center font-bold py-1">
                Cancel
            </button>
        </form>
    );
};

// ─── Outer modal (creates PaymentIntent, wraps Elements) ─────────────────────
export const PaymentModal: React.FC<PaymentModalProps> = ({ item, currency, onClose, onSuccess }) => {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [initError, setInitError] = useState('');
    const [localPrice, setLocalPrice] = useState('');

    useEffect(() => {
        if (!item) return;
        setClientSecret(null);
        setInitError('');

        const usdCents = PRODUCT_USD_CENTS[item.productId];
        if (!usdCents) { setInitError('Unknown product.'); return; }

        const stripeAmount = toStripeAmount(usdCents, currency);
        const price = formatLocalPrice(stripeAmount, currency);
        setLocalPrice(price);

        const deviceId = getDeviceId();

        fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                deviceId,
                productId: item.productId,
                itemType: item.itemType,
                itemAmount: item.itemAmount,
                currency: currency.code,
                stripeAmount,
            }),
        })
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setClientSecret(data.clientSecret);
            })
            .catch(err => {
                setInitError(`Could not initialise payment: ${err.message}`);
            });
    }, [item, currency]);

    if (!item) return null;

    const appearance = {
        theme: 'night' as const,
        variables: {
            colorPrimary: '#a855f7',
            colorBackground: '#1e0a40',
            colorText: '#f3e8ff',
            colorDanger: '#f87171',
            fontFamily: 'Nunito, system-ui, sans-serif',
            borderRadius: '12px',
        },
    };

    return (
        <div className="absolute inset-0 z-[300] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={onClose}>
            <div
                className="w-full max-w-[420px] rounded-t-3xl md:rounded-3xl overflow-hidden font-nunito"
                style={{
                    background: 'linear-gradient(180deg,#3b0f7a 0%,#1e0a40 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(180,100,255,0.3), 0 -8px 40px rgba(0,0,0,0.6)',
                    maxHeight: '92dvh',
                    overflowY: 'auto',
                }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center gap-3 px-5 pt-5 pb-4">
                    {item.icon && (
                        <img src={item.icon} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                    )}
                    <div className="flex-1">
                        <div className="font-black text-white" style={{ fontSize: 15 }}>
                            {item.label}
                        </div>
                        <div className="text-purple-300 font-bold" style={{ fontSize: 11 }}>
                            {localPrice || '…'}
                        </div>
                    </div>
                    <button className="round-btn" onClick={onClose}><i className="ti ti-x" /></button>
                </div>

                <div className="px-5 pb-6">
                    {initError ? (
                        <div className="text-red-400 text-sm text-center py-8 font-bold">{initError}</div>
                    ) : !clientSecret ? (
                        <div className="flex items-center justify-center py-10 gap-2 text-purple-300 text-sm">
                            <span className="animate-spin">⏳</span> Loading payment form…
                        </div>
                    ) : (
                        <Elements stripe={getStripe()} options={{ clientSecret, appearance }}>
                            <CheckoutForm
                                item={item}
                                currency={currency}
                                localPrice={localPrice}
                                onClose={onClose}
                                onSuccess={onSuccess}
                            />
                        </Elements>
                    )}

                    {/* Trust badges */}
                    <div className="flex items-center justify-center gap-3 mt-4">
                        <img src="https://cdn.brandfetch.io/idnrCPuv87/theme/dark/logo.svg"
                            alt="Stripe" style={{ height: 18, opacity: 0.5, filter: 'grayscale(1)' }}
                            onError={e => { (e.target as HTMLElement).style.display = 'none'; }} />
                        <span className="text-purple-500 font-bold" style={{ fontSize: 9 }}>
                            Secured by Stripe · SSL encrypted
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
