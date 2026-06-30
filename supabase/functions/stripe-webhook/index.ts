// Supabase Edge Function: stripe-webhook
// Receives Stripe events, verifies the webhook signature, and writes a
// payment_credits row so the game client can claim the purchased items.

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-11-20.acacia',
    httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req: Request) => {
    const signature = req.headers.get('stripe-signature');
    if (!signature) return new Response('Missing stripe-signature', { status: 400 });

    const body = await req.text();
    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return new Response(`Webhook error: ${err}`, { status: 400 });
    }

    if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object as Stripe.PaymentIntent;
        const { device_id, item_type, item_amount } = pi.metadata;

        if (!device_id || !item_type || !item_amount) {
            console.error('Missing metadata on payment intent', pi.id);
            return new Response('Missing metadata', { status: 400 });
        }

        const { error } = await supabase.from('payment_credits').insert({
            device_id,
            stripe_payment_intent_id: pi.id,
            type: item_type,
            amount: parseInt(item_amount, 10),
            currency: pi.currency.toUpperCase(),
            stripe_amount: pi.amount,
            claimed: false,
        });

        if (error) {
            // unique constraint on stripe_payment_intent_id means duplicate events are safe
            if (error.code !== '23505') {
                console.error('DB insert failed:', error);
                return new Response('DB error', { status: 500 });
            }
        }
    }

    return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
    });
});
