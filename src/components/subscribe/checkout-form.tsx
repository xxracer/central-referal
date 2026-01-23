'use client';

import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';

export default function CheckoutForm({ amount }: { amount?: number }) {
    const stripe = useStripe();
    const elements = useElements();

    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            // Stripe.js has not yet loaded.
            return;
        }

        setIsLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return to dashboard after payment
                return_url: `${window.location.origin}/dashboard`,
            },
        });

        // This point is only reached if there is an immediate error when
        // confirming the payment. Otherwise, your customer will be redirected to
        // your `return_url`.
        if (error.type === "card_error" || error.type === "validation_error") {
            setMessage(error.message || "An unexpected error occurred.");
        } else {
            setMessage("An unexpected error occurred.");
        }

        setIsLoading(false);
    };

    const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format((amount || 12999) / 100);

    return (
        <form id="payment-form" onSubmit={handleSubmit} className="space-y-6 mt-4">
            <PaymentElement id="payment-element" options={{ layout: "tabs" }} />

            {message && (
                <div id="payment-message" className="text-red-500 text-sm">{message}</div>
            )}

            <button
                disabled={isLoading || !stripe || !elements}
                id="submit"
                className="btn btn-primary w-full flex justify-center items-center gap-2"
                style={{ marginTop: '20px' }}
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isLoading ? "Processing..." : `Subscribe Now (${formattedPrice})`}
            </button>

            <p className="text-xs text-muted-foreground text-center mt-2">
                Payments go through Stripe. Secure and encrypted.
            </p>
        </form>
    );
}
