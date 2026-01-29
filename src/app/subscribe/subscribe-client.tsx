'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import '@/app/landing.css';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutForm from '@/components/subscribe/checkout-form';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface SubscribeClientProps {
    logoUrl?: string;
    companyName?: string;
}

export default function SubscribePageClient({ logoUrl, companyName }: SubscribeClientProps) {
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [finalAmount, setFinalAmount] = useState<number | null>(null);
    const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        agency: '',
        name: '',
        email: '',
        promoCode: ''
    });

    useEffect(() => {
        setYear(new Date().getFullYear());

        try {
            const saved = localStorage.getItem("rf_signup_lead");
            if (saved) {
                const data = JSON.parse(saved);
                setFormData({
                    agency: data.agency || '',
                    name: data.name || '',
                    email: data.email || '',
                    promoCode: ''
                });
            }
        } catch (e) {
            console.error("Error parsing saved lead data", e);
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) e.target.classList.add("show");
            });
        }, { threshold: 0.14 });

        document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    const handleCheckout = async () => {
        const payload = {
            agency: formData.agency.trim(),
            name: formData.name.trim(),
            email: formData.email.trim(),
            plan: "ReferralFlow Subscription",
            price: 129.99,
            promoCode: formData.promoCode?.trim()
        };

        if (!payload.agency || !payload.name || !payload.email) {
            alert("Please enter agency name, your name, and email.");
            return;
        }

        try {
            setLoading(true);
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const { clientSecret, error, discountApplied, total, promoCode: appliedCode, isFree } = await response.json();

            if (error) {
                console.error("Checkout error:", error);
                alert("Checkout failed: " + error);
                setLoading(false);
                return;
            }

            if (isFree) {
                // Subscription successful and free!
                // Don't redirect immediately. We want to show the "Success/Free" UI state.
                setFinalAmount(0); // This will trigger the fake UI
                if (appliedCode) setAppliedCoupon(appliedCode);

                // We don't set clientSecret specifically, so !clientSecret remains true?
                // Wait, if !clientSecret is true, we show the Form Inputs (Agency Name etc).
                // My logic in the render block above says:
                // {!clientSecret && !loading && finalAmount !== 0 ? (Inputs) : finalAmount === 0 ? (FakeUI) : (Elements)}
                // So setting finalAmount(0) is enough to switch to FakeUI.
                setLoading(false);
                return;
            }

            if (discountApplied) {
                // Optional: Show a success toast or message
            }

            if (total !== undefined) {
                setFinalAmount(total);
            }

            if (appliedCode) {
                setAppliedCoupon(appliedCode);
            }

            if (clientSecret) {
                setClientSecret(clientSecret);
                setLoading(false);
            }
        } catch (err) {
            console.error("Unexpected error:", err);
            alert("An unexpected error occurred.");
            setLoading(false);
        }
    };

    const displayName = (!companyName || companyName.toLowerCase().includes('noble health')) ? "ReferralFlow.Health" : companyName;
    // MANUAL FIX: Hardcoded logo URL as requested.
    const effectiveLogoUrl = "https://static.wixstatic.com/media/c5947c_14731b6192f740d8958b7a069f361b4e~mv2.png";

    return (
        <div className="landing-wrapper">
            {/* Background blobs */}
            <div className="blob b1"></div>
            <div className="blob b2"></div>
            <div className="blob b3"></div>

            <header>
                <div className="container">
                    <div className="nav">
                        <Link href="/" className="brand" aria-label="ReferralFlow.Health">
                            {effectiveLogoUrl ? (
                                <div className="mark" style={{ background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img
                                        src={effectiveLogoUrl}
                                        alt="ReferralFlow.Health"
                                        style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }}
                                    />
                                </div>
                            ) : (
                                <div className="mark" aria-hidden="true">
                                    <span style={{ fontWeight: 900, fontSize: '14px', color: '#07203a' }}>RF</span>
                                </div>
                            )}
                            <div>
                                <b>ReferralFlow.Health</b>
                                <span>Referral intake & tracking</span>
                            </div>
                        </Link>
                        <div className="nav-actions">
                            <Link href="/login" className="btn btn-link">Login</Link>
                            <Link href="/" className="btn">Back</Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="page">
                <div className="container">
                    <div className="reveal">
                        <h1>Start your subscription.</h1>
                        <p className="subtitle">One simple plan. Built to strengthen {companyName ? `${companyName}'s` : 'referral'} intake with clarity, visibility, and trust.</p>
                    </div>

                    <div className="layout">
                        <section className="panel reveal">
                            <div className="kicker"><span className="pill"></span> Limited-time offer</div>
                            <div className="pricebox">
                                <h2 className="plan-title">ReferralFlow Subscription</h2>
                                <p className="plan-desc">Lightweight referral intake and tracking for agencies that want to handle referrals better without replacing existing systems.</p>

                                <div className="price-row">
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                                            <div className="now">$129.99</div>
                                            <div className="per">/ month</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="features">
                                    <div className="li"><div className="check">✓</div><div>Digital referral intake via your agency link</div></div>
                                    <div className="li"><div className="check">✓</div><div>Your own subdomain referral portal (example: {companyName ? `${companyName.toLowerCase().replace(/\s/g, '')}.referralflow.health` : 'youragency.referralflow.health'})</div></div>
                                    <div className="li"><div className="check">✓</div><div>Instant referral confirmation and referral ID</div></div>
                                    <div className="li"><div className="check">✓</div><div>Public status tracking by referral ID (no login for referral sources)</div></div>
                                    <div className="li"><div className="check">✓</div><div>Internal dashboard to manage referrals and update status</div></div>
                                    <div className="li"><div className="check">✓</div><div>Internal notes and partner communication in one place</div></div>
                                    <div className="li"><div className="check">✓</div><div>Email alerts for key referral events (configurable)</div></div>
                                    <div className="li"><div className="check">✓</div><div>Fast setup designed to fit your existing workflow</div></div>
                                </div>
                            </div>
                        </section>

                        <aside className="card reveal">
                            <b style={{ fontSize: '14px' }}>Account details</b>
                            <div className="fine">Pre-filled from the Get Started form</div>

                            {!clientSecret && finalAmount !== 0 ? (
                                <>
                                    <div className="field" style={{ marginTop: '12px' }}>
                                        <label htmlFor="agency">Agency Name</label>
                                        <input
                                            id="agency"
                                            type="text"
                                            placeholder="e.g., Best Home Care"
                                            autoComplete="organization"
                                            value={formData.agency}
                                            onChange={e => setFormData({ ...formData, agency: e.target.value })}
                                        />
                                    </div>
                                    <div className="field">
                                        <label htmlFor="name">Your Name</label>
                                        <input
                                            id="name"
                                            type="text"
                                            placeholder="e.g., John Smith"
                                            autoComplete="name"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="field">
                                        <label htmlFor="email">Work Email</label>
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="you@agency.com"
                                            autoComplete="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="field">
                                        <label htmlFor="promoCode">Promo Code (Optional)</label>
                                        <input
                                            id="promoCode"
                                            type="text"
                                            placeholder="Enter discount code"
                                            autoComplete="off"
                                            value={formData.promoCode || ''}
                                            onChange={e => setFormData({ ...formData, promoCode: e.target.value })}
                                            style={{ textTransform: 'uppercase' }}
                                        />
                                    </div>

                                    <div className="modal-actions" style={{ marginTop: '10px' }}>
                                        <button className="btn btn-primary" id="checkoutBtn" type="button" onClick={handleCheckout} disabled={loading}>
                                            {loading ? 'Preparing Secure Checkout...' : 'Continue to Payment'}
                                        </button>
                                    </div>
                                </>
                            ) : finalAmount === 0 ? (
                                /* FREE FLOW UI */
                                <div className="space-y-6 mt-4">
                                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4 flex items-center gap-2">
                                        <span className="font-bold">✓ Coupon Applied:</span> {appliedCoupon}
                                    </div>

                                    {/* Simulated Disabled Stripe Elements */}
                                    <div className="rounded-md border border-gray-200 p-4 bg-gray-50 opacity-100 select-none">
                                        <div className="mb-4">
                                            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Card Information</label>
                                            <div className="bg-white border rounded p-3 text-gray-300 italic flex justify-between">
                                                <span>•••• •••• •••• ••••</span>
                                                <div className="flex gap-2">
                                                    <span className="w-8 h-5 bg-gray-200 rounded"></span>
                                                    <span className="w-8 h-5 bg-gray-200 rounded"></span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Expiration</label>
                                                <div className="bg-white border rounded p-3 text-gray-300 italic">MM / YY</div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">CVC</label>
                                                <div className="bg-white border rounded p-3 text-gray-300 italic">123</div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        id="submit-free"
                                        className="btn btn-primary w-full flex justify-center items-center gap-2"
                                        style={{ marginTop: '20px' }}
                                        onClick={() => window.location.href = '/dashboard/settings'}
                                    >
                                        Subscribe Now ($0.00)
                                    </button>

                                    <p className="text-xs text-muted-foreground text-center mt-2">
                                        No payment required. Secure sign up.
                                    </p>
                                </div>
                            ) : (
                                <Elements stripe={stripePromise} options={{ clientSecret: clientSecret! }}>
                                    <div className="animate-in fade-in" style={{ animationDuration: '0.4s' }}>
                                        <CheckoutForm amount={finalAmount || undefined} couponCode={appliedCoupon || undefined} />
                                    </div>
                                </Elements>
                            )}

                            <div className="note"><b style={{ color: 'var(--ink)' }}>Billing:</b> Add payment decline and card-expiration alerts to avoid service interruptions.</div>
                        </aside>
                    </div>

                    <footer style={{ marginTop: '30px' }}>
                        <div className="container">
                            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: '#6f86a1' }}>
                                <span>© {year} {displayName}</span>
                                <span>
                                    Powered by <b>ReferralFlow.Health</b> and created by <a href="https://ilptechnology.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>ILP Technologies</a>
                                </span>
                            </div>
                        </div>
                    </footer>
                </div>
            </main>
        </div>
    );
}
