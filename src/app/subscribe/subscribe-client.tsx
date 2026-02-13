'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import '@/app/landing.css';


interface SubscribeClientProps {
    logoUrl?: string;
    companyName?: string;
}

export default function SubscribePageClient({ logoUrl, companyName }: SubscribeClientProps) {
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: ''
    });

    useEffect(() => {
        setYear(new Date().getFullYear());

        try {
            const saved = localStorage.getItem("rf_signup_lead");
            if (saved) {
                const data = JSON.parse(saved);
                setFormData({
                    name: data.name || '',
                    email: data.email || ''
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

    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');

    const handleCheckout = async () => {
        const payload = {
            name: formData.name.trim(),
            email: formData.email.trim(),
            planType: selectedPlan
        };

        if (!payload.name || !payload.email) {
            alert("Please enter your name and email.");
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

            const data = await response.json();

            if (data.error) {
                console.error("Checkout error:", data.error);
                alert("Checkout failed: " + data.error);
                setLoading(false);
                return;
            }

            if (data.url) {
                console.log("Redirecting to Stripe...", data.url);
                window.location.href = data.url;
            } else {
                alert("Something went wrong. No checkout URL returned.");
                setLoading(false);
            }

        } catch (err) {
            console.error("Unexpected error:", err);
            alert("An unexpected error occurred.");
            setLoading(false);
        }
    };

    const displayName = (!companyName || companyName.toLowerCase().includes('noble health')) ? "ReferralFlow.Health" : companyName;
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
                        <h1>Simple, Transparent Pricing</h1>
                        <p className="subtitle">Everything you need to manage referrals better, in one simple plan.</p>
                    </div>

                    <div className="layout">
                        <section className="panel reveal">
                            <div className="pricebox">
                                <div className="flex justify-center mb-8">
                                    <div className="bg-gray-100 p-1.5 rounded-full inline-flex items-center relative shadow-inner">
                                        <button
                                            onClick={() => setSelectedPlan('monthly')}
                                            className={`px-6 py-2 rounded-full text-base font-semibold transition-all duration-200 ${selectedPlan === 'monthly' ? 'bg-white text-gray-900 shadow-md ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'}`}
                                        >
                                            Monthly
                                        </button>
                                        <button
                                            onClick={() => setSelectedPlan('annual')}
                                            className={`px-6 py-2 rounded-full text-base font-semibold transition-all duration-200 flex items-center gap-2 ${selectedPlan === 'annual' ? 'bg-white text-gray-900 shadow-md ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'}`}
                                        >
                                            Annual
                                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">-13%</span>
                                        </button>
                                    </div>
                                </div>

                                <h2 className="plan-title">ReferralFlow Subscription</h2>
                                <p className="plan-desc">Lightweight referral intake and tracking for agencies that want to handle referrals better.</p>

                                <div className="price-row">
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                                            <div className="now animated-price">
                                                {selectedPlan === 'annual' ? '$129.99' : '$149.99'}
                                            </div>
                                            <div className="per">/ month</div>
                                        </div>
                                        {selectedPlan === 'annual' && (
                                            <div className="text-sm text-muted-foreground mt-1">
                                                Billed $1,559.88 annually
                                            </div>
                                        )}
                                        {selectedPlan === 'monthly' && (
                                            <div className="text-sm text-muted-foreground mt-1">
                                                Pay month-to-month. Cancel anytime.
                                            </div>
                                        )}
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

                        <aside className="card reveal" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                            <div className="flex items-center gap-2 mb-6 border-b pb-4">
                                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight">Secure Checkout</h3>
                                    <p className="text-xs text-muted-foreground">SSL Encrypted Transaction</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-100">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">Order Summary</h4>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-sm">ReferralFlow {selectedPlan === 'annual' ? 'Annual' : 'Monthly'}</span>
                                    <span className="font-bold text-sm">{selectedPlan === 'annual' ? '$1,559.88' : '$149.99'}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-slate-200 pt-2 mt-2">
                                    <span>Billing cycle</span>
                                    <span>{selectedPlan === 'annual' ? 'Yearly' : 'Monthly'}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid gap-1.5">
                                    <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                                    <input
                                        id="name"
                                        type="text"
                                        placeholder="e.g., John Smith"
                                        autoComplete="name"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <label htmlFor="email" className="text-sm font-medium">Work Email</label>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="you@company.com"
                                        autoComplete="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div className="modal-actions" style={{ marginTop: '24px' }}>
                                <button
                                    className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
                                    id="checkoutBtn" type="button" onClick={handleCheckout} disabled={loading}
                                >
                                    {loading ? 'Redirecting to Stripe...' : `Proceed to Payment`}
                                </button>
                                <div className="w-full text-center space-y-2 mt-4">
                                    <p className="text-xs text-muted-foreground">
                                        {selectedPlan === 'monthly' ? 'No long-term commitment. Cancel anytime.' : '30-day money-back guarantee.'}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t flex items-center justify-center gap-4 grayscale opacity-70">
                                <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                    256-bit SSL Secure
                                </span>
                            </div>
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
