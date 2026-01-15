'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import './landing.css';

const LandingPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        agencyName: '',
        yourName: '',
        email: ''
    });
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    useEffect(() => {
        setCurrentYear(new Date().getFullYear());
    }, []);

    const openModal = () => {
        setIsModalOpen(true);
        // Focus agencyName field after a short delay to allow for modal transition
        setTimeout(() => {
            const input = document.getElementById('agencyName') as HTMLInputElement;
            if (input) input.focus();
        }, 100);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleScroll = (targetId: string) => {
        const el = document.querySelector(targetId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleSubmit = () => {
        if (!formData.agencyName || !formData.yourName || !formData.email) {
            alert("Please enter agency name, your name, and email.");
            return;
        }
        console.log("Get Started payload:", formData);
        alert("Captured! Next step: connect this to your signup/Stripe flow.");
        closeModal();
    };

    return (
        <div className="landing-wrapper">
            {/* NAV */}
            <header className="nav">
                <div className="container">
                    <div className="nav-inner">
                        <div className="brand">
                            <div className="logo" aria-label="ReferralFlow.Health logo">
                                <span style={{ fontWeight: 900, fontSize: '14px', color: '#0b1220' }}>RF</span>
                            </div>
                            <div className="brand-text">
                                <strong>ReferralFlow.Health</strong>
                                <span>Referral intake & tracking infrastructure</span>
                            </div>
                        </div>

                        <nav className="nav-links" aria-label="Primary navigation">
                            <button onClick={() => handleScroll('#pain')}>Why</button>
                            <button onClick={() => handleScroll('#pillars')}>What partners need</button>
                            <button onClick={() => handleScroll('#what')}>What it is</button>
                            <button onClick={() => handleScroll('#how')}>How it works</button>
                            <button onClick={() => handleScroll('#own')}>Ownership</button>
                            <button onClick={() => handleScroll('#proof')}>Agencies</button>
                            <Link href="/?portal=true" className="nav-link-staff">Login</Link>
                        </nav>

                        <div className="nav-cta">
                            <button className="btn" onClick={() => handleScroll('#how')}>See how it works</button>
                            <button className="btn btn-primary" onClick={openModal}>Get Started</button>
                        </div>
                    </div>
                </div>
            </header>

            {/* HERO */}
            <main>
                <section className="hero">
                    <div className="container">
                        <div className="hero-grid">
                            <div>
                                <div className="kicker"><span className="dot"></span> Built for home health, hospice & similar agencies</div>

                                <h1>Own Your Referral Flow.<br />Because efficiency, communication, and trust drive referrals.</h1>

                                <p className="subhead">
                                    ReferralFlow.Health is a lightweight referral intake and tracking platform for agencies that already receive referrals—but want to handle them better.
                                    Strengthen your process with clarity, visibility, and control—without replacing your EMR, retraining staff, or forcing logins on referral sources.
                                </p>

                                <div className="hero-actions">
                                    <button className="btn btn-primary" onClick={openModal}>Get Started</button>
                                    <Link href="/?portal=true" className="btn">Login</Link>
                                    <button className="btn" onClick={() => handleScroll('#pillars')}>Why referral sources choose you</button>
                                    <button className="btn" onClick={() => handleScroll('#what')}>What it is (and isn’t)</button>
                                </div>

                                <div className="micro">Get started in minutes. No contracts. No disruption.</div>
                            </div>

                            <aside className="panel" aria-label="Product preview panel">
                                <div className="panel-inner">
                                    <div className="panel-top">
                                        <div className="title">Referral visibility preview</div>
                                        <div className="chip">No logins required</div>
                                    </div>

                                    <div className="metric-grid" aria-label="Benefits">
                                        <div className="metric">
                                            <b>Instant confirmation</b>
                                            <span>Referral partners know it was received.</span>
                                        </div>
                                        <div className="metric">
                                            <b>Referral ID tracking</b>
                                            <span>Status checks without calls or emails.</span>
                                        </div>
                                        <div className="metric">
                                            <b>One dashboard</b>
                                            <span>Update status, notes, and communication.</span>
                                        </div>
                                        <div className="metric">
                                            <b>EMR-friendly</b>
                                            <span>Strengthens intake without replacement.</span>
                                        </div>
                                    </div>

                                    <div className="mini-flow" aria-label="Sample referral activity">
                                        <div className="flow-row">
                                            <div className="flow-left">
                                                <div className="badge">✓</div>
                                                <div>
                                                    <strong>Referral received</strong>
                                                    <span>ID: RF-10482 • Confirmation sent</span>
                                                </div>
                                            </div>
                                            <div className="status">Received</div>
                                        </div>
                                        <div className="flow-row">
                                            <div className="flow-left">
                                                <div className="badge">↻</div>
                                                <div>
                                                    <strong>Status updated</strong>
                                                    <span>Assigned to intake • Notes added</span>
                                                </div>
                                            </div>
                                            <div className="status">In Review</div>
                                        </div>
                                        <div className="flow-row">
                                            <div className="flow-left">
                                                <div className="badge">☎</div>
                                                <div>
                                                    <strong>Less interruption</strong>
                                                    <span>Partners check status without calling</span>
                                                </div>
                                            </div>
                                            <div className="status">Visible</div>
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </div>
                </section>

                {/* PAIN */}
                <section id="pain">
                    <div className="container">
                        <div className="section-head">
                            <div>
                                <h2>Referral intake shouldn’t feel uncertain.</h2>
                                <p className="lead">
                                    Most agencies don’t lose referrals because they don’t get them. They lose them because the process after submission is unclear.
                                </p>
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="card">
                                <h3>What uncertainty creates</h3>
                                <ul className="list">
                                    <li className="li"><span className="check">•</span><span>Referral sources don’t know what happened.</span></li>
                                    <li className="li"><span className="check">•</span><span>Staff spend time answering status calls.</span></li>
                                    <li className="li"><span className="check">•</span><span>Referrals get delayed, overlooked, or duplicated.</span></li>
                                    <li className="li"><span className="check">•</span><span>Communication lives across email, paper, and notes.</span></li>
                                </ul>
                            </div>
                            <div className="card">
                                <h3>What ReferralFlow replaces</h3>
                                <ul className="list">
                                    <li className="li"><span className="check">✓</span><span>Guesswork with clear status visibility</span></li>
                                    <li className="li"><span className="check">✓</span><span>Manual follow-ups with simple updates</span></li>
                                    <li className="li"><span className="check">✓</span><span>Fragmented communication with one place</span></li>
                                    <li className="li"><span className="check">✓</span><span>“Did you get it?” with instant confirmation</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PILLARS */}
                <section id="pillars">
                    <div className="container">
                        <div className="section-head">
                            <div>
                                <h2>What referral sources need to keep sending patients</h2>
                                <p className="lead">
                                    If you want consistent referrals, your referral sources need confidence. That confidence is built on three things:
                                </p>
                            </div>
                        </div>

                        <div className="grid-3">
                            <div className="card pillar">
                                <div className="icon">⚡</div>
                                <h3>Efficiency</h3>
                                <p>Referrals should be easy to submit, acknowledged immediately, and simple to follow—without extra steps or friction.</p>
                            </div>
                            <div className="card pillar">
                                <div className="icon">💬</div>
                                <h3>Communication</h3>
                                <p>Referral sources need timely confirmation and clear status updates—without calling, emailing, or chasing staff.</p>
                            </div>
                            <div className="card pillar">
                                <div className="icon">🤝</div>
                                <h3>Trust</h3>
                                <p>They need to know referrals aren’t disappearing into a black hole—and that your agency runs a reliable operation.</p>
                            </div>
                        </div>

                        <div className="card" style={{ marginTop: '14px' }}>
                            <h3>ReferralFlow.Health delivers all three by design.</h3>
                            <p>
                                It strengthens how you already intake referrals by adding clarity, visibility, and control—so referral partners stay confident and your team stays focused.
                            </p>
                        </div>
                    </div>
                </section>

                {/* WHAT IT IS */}
                <section id="what">
                    <div className="container">
                        <div className="section-head">
                            <div>
                                <h2>What ReferralFlow.Health is (and what it isn’t)</h2>
                                <p className="lead">
                                    ReferralFlow.Health sits upstream of intake—strengthening your referral infrastructure without disrupting existing workflows.
                                </p>
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="card">
                                <h3>What it is</h3>
                                <ul className="list">
                                    <li className="li"><span className="check">✓</span><span>A digital referral intake and tracking layer</span></li>
                                    <li className="li"><span className="check">✓</span><span>A public referral link you control</span></li>
                                    <li className="li"><span className="check">✓</span><span>Automatic confirmation and referral ID assignment</span></li>
                                    <li className="li"><span className="check">✓</span><span>Real-time status visibility for referral sources</span></li>
                                    <li className="li"><span className="check">✓</span><span>A simple internal dashboard for your team</span></li>
                                </ul>
                            </div>

                            <div className="card">
                                <h3>What it isn’t</h3>
                                <ul className="list">
                                    <li className="li"><span className="x">✕</span><span>Not an EMR</span></li>
                                    <li className="li"><span className="x">✕</span><span>Not outsourced intake</span></li>
                                    <li className="li"><span className="x">✕</span><span>Not a fax replacement requirement</span></li>
                                    <li className="li"><span className="x">✕</span><span>Not another system your staff must learn</span></li>
                                    <li className="li"><span className="x">✕</span><span>Not a portal your referral sources must log into</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* HOW IT WORKS */}
                <section id="how">
                    <div className="container">
                        <div className="section-head">
                            <div>
                                <h2>How it works</h2>
                                <p className="lead">Simple, predictable, and visible—so everyone stays aligned.</p>
                            </div>
                            <div className="nav-cta">
                                <button className="btn" onClick={openModal}>Get Started</button>
                            </div>
                        </div>

                        <div className="steps" aria-label="How it works steps">
                            <div className="step">
                                <b>Referral is submitted</b>
                                <span>Referral partner uses your agency referral link.</span>
                            </div>
                            <div className="step">
                                <b>Confirmation is sent instantly</b>
                                <span>A unique referral ID is generated automatically.</span>
                            </div>
                            <div className="step">
                                <b>Your team updates status</b>
                                <span>Update status, notes, and communication in one place.</span>
                            </div>
                            <div className="step">
                                <b>Partners check status anytime</b>
                                <span>Using the referral ID—no logins required.</span>
                            </div>
                        </div>

                        <div className="card" style={{ marginTop: '14px' }}>
                            <h3>Everyone sees what they need.</h3>
                            <p>No follow-up calls. No guessing. No unnecessary interruptions.</p>
                        </div>
                    </div>
                </section>

                {/* OWN */}
                <section id="own">
                    <div className="container">
                        <div className="section-head">
                            <div>
                                <h2>Own your referral flow</h2>
                                <p className="lead">
                                    Marketing creates demand. Your intake process determines whether that demand turns into admissions.
                                </p>
                                <div className="quote">If you want to market confidently, your backend must be solid.</div>
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="card">
                                <h3>ReferralFlow gives you the confidence to:</h3>
                                <ul className="list">
                                    <li className="li"><span className="check">✓</span><span>Accept more referrals without operational strain</span></li>
                                    <li className="li"><span className="check">✓</span><span>Communicate clearly with partners</span></li>
                                    <li className="li"><span className="check">✓</span><span>Scale outreach without losing control</span></li>
                                </ul>
                            </div>
                            <div className="card">
                                <h3>When your flow is clear:</h3>
                                <ul className="list">
                                    <li className="li"><span className="check">✓</span><span>You stop reacting and start operating with intention</span></li>
                                    <li className="li"><span className="check">✓</span><span>Your team stays focused on the work that matters</span></li>
                                    <li className="li"><span className="check">✓</span><span>Referral partners trust your process</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SOCIAL PROOF */}
                <section id="proof">
                    <div className="container">
                        <div className="section-head">
                            <div>
                                <h2>Built for real agencies</h2>
                                <p className="lead">
                                    ReferralFlow.Health is already used by active home health and hospice agencies that needed a better way to manage referrals without overhauling their systems.
                                </p>
                            </div>
                        </div>

                        <div className="card">
                            <h3>Agencies using ReferralFlow.Health</h3>
                            <div className="logos" aria-label="Agency logos list">
                                <span className="logo-pill">Central Home Health</span>
                                <span className="logo-pill">LifeCare Options (LCO)</span>
                                <span className="logo-pill">Noble Health</span>
                                <span className="logo-pill">Hospice</span>
                                <span className="logo-pill">Partner Agency</span>
                            </div>
                            <p className="fine">
                                Designed by operators inside healthcare—not marketers—this platform reflects how agencies actually work.
                            </p>
                        </div>
                    </div>
                </section>

                {/* FINAL CTA */}
                <section className="cta">
                    <div className="container">
                        <div className="cta-box">
                            <div className="cta-inner">
                                <div>
                                    <h2>Take control of your referrals.</h2>
                                    <p>
                                        Strengthen the way you already intake referrals. Improve communication. Build trust with referral partners. Operate with clarity.
                                    </p>
                                    <div className="micro">Live in minutes. No contracts. No disruption.</div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <button className="btn" onClick={() => handleScroll('#how')}>See how it works</button>
                                    <button className="btn btn-primary" onClick={openModal}>Get Started</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <footer style={{ borderTop: '1px solid var(--lp-line)', padding: '18px 0 28px' }}>
                    <div className="container" style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', color: 'var(--lp-muted2)', fontSize: '12px' }}>
                        <span>© {currentYear} ReferralFlow.Health</span>
                        <span>Lightweight referral infrastructure for healthcare agencies</span>
                    </div>
                </footer>
            </main>

            {/* MODAL */}
            {isModalOpen && (
                <div className="modal-backdrop" onClick={(e) => {
                    if (e.target === e.currentTarget) closeModal();
                }} role="dialog" aria-modal="true" aria-label="Get started modal">
                    <div className="modal">
                        <div className="modal-head">
                            <b>Get Started</b>
                            <button className="close" onClick={closeModal} aria-label="Close modal">✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="field">
                                <label htmlFor="agencyName">Agency Name</label>
                                <input
                                    id="agencyName"
                                    type="text"
                                    placeholder="e.g., Central Home Health"
                                    autoComplete="organization"
                                    value={formData.agencyName}
                                    onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="yourName">Your Name</label>
                                <input
                                    id="yourName"
                                    type="text"
                                    placeholder="e.g., Alex Guerra"
                                    autoComplete="name"
                                    value={formData.yourName}
                                    onChange={(e) => setFormData({ ...formData, yourName: e.target.value })}
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
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="modal-actions">
                                <button className="btn" type="button" onClick={() => {
                                    window.location.href = `mailto:hello@referralflow.health?subject=ReferralFlow%20Setup%20Call&body=Hi%2C%20I'd%20like%20to%20request%20a%20setup%20call.%0A%0AAgency%3A%20${formData.agencyName}%0AName%3A%20${formData.yourName}%0AEmail%3A%20${formData.email}`;
                                }}>Request setup call</button>
                                <button className="btn btn-primary" type="button" onClick={handleSubmit}>Continue</button>
                            </div>

                            <div className="fine">
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
