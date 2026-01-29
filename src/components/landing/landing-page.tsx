'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '@/app/landing.css';

const LandingPage = () => {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        agency: '',
        name: '',
        email: ''
    });

    // Reveal animation
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add("show");
                }
            });
        }, { threshold: 0.14 });

        const elements = document.querySelectorAll(".reveal");
        elements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    const openModal = () => {
        setIsModalOpen(true);
        setTimeout(() => {
            const el = document.getElementById("agency");
            if (el) el.focus();
        }, 50);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleContinue = () => {
        if (!formData.agency || !formData.name || !formData.email) {
            alert("Please enter agency name, your name, and email.");
            return;
        }
        localStorage.setItem("rf_signup_lead", JSON.stringify(formData));
        router.push('/subscribe');
    };

    return (
        <div className="landing-wrapper">
            <div className="blob b1"></div>
            <div className="blob b2"></div>
            <div className="blob b3"></div>

            <header>
                <div className="container">
                    <div className="nav">
                        <Link href="/" className="brand" aria-label="ReferralFlow.Health">
                            <div className="mark" aria-hidden="true">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="https://static.wixstatic.com/media/c5947c_14731b6192f740d8958b7a069f361b4e~mv2.png" alt="ReferralFlow.Health logo" />
                            </div>
                            <div><b>ReferralFlow.Health</b><span>Referral intake & tracking</span></div>
                        </Link>
                        <div className="nav-actions">
                            <Link href="/login" className="btn btn-link">Login</Link>
                            <Link href="https://referralflow.health/contact" className="btn btn-link">Contact</Link>
                            <Link href="/subscribe" className="btn btn-primary">Get Started</Link>
                        </div>
                    </div>
                </div>
            </header>

            <main>
                <section className="hero">
                    <div className="container">
                        <div className="hero-grid">
                            <div className="reveal">
                                <div className="label"><span className="pill"></span> Referral infrastructure for healthcare agencies</div>
                                <h1>Own Your Referral Flow.</h1>
                                <p className="subhead"><b>Because efficiency, communication, and trust drive referrals.</b></p>
                                <p className="bodycopy">
                                    ReferralFlow.Health is a lightweight referral intake and tracking platform for agencies that already receive referrals, but want to handle them better.
                                    Strengthen your process with clarity, visibility, and control without replacing your EMR, retraining staff, or forcing logins on referral sources.
                                </p>
                                <div className="hero-actions">
                                    <Link href="/subscribe" className="btn btn-primary">Get Started</Link>
                                    <Link href="#how" className="btn" onClick={(e) => {
                                        e.preventDefault();
                                        document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });
                                    }}>See how it works</Link>
                                </div>
                            </div>

                            <aside className="media reveal">
                                <div className="media-inner">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img className="hero-img" src="https://static.wixstatic.com/media/c5947c_ed795d1420cd417f82d0f5ff6439f92f~mv2.jpg" alt="ReferralFlow.Health preview" />
                                    <div className="media-caption">
                                        <span className="tag">Instant confirmation</span>
                                        <span className="tag">Referral ID tracking</span>
                                        <span className="tag">Clear status updates</span>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </div>
                </section>

                <section className="block">
                    <div className="container">
                        <div className="reveal">
                            <h2>Referral intake shouldn’t feel uncertain.</h2>
                            <p className="lead">When referrals arrive but visibility is unclear, teams get interrupted, partners lose confidence, and growth slows down.</p>
                        </div>
                        <div className="grid-2">
                            <div className="card reveal">
                                <div className="icon">📉</div>
                                <h3>Uncertainty creates friction</h3>
                                <p>Referral sources don’t know what happened, staff gets pulled into follow-ups, and referrals become harder to manage.</p>
                            </div>
                            <div className="card reveal">
                                <div className="icon">✅</div>
                                <h3>Clarity creates confidence</h3>
                                <p>Immediate confirmation plus simple status visibility reduces interruptions and strengthens partner trust.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="block" id="how">
                    <div className="container">
                        <div className="reveal">
                            <h2>How it works</h2>
                            <p className="lead">A clean, professional flow that keeps partners confident and your team moving.</p>
                        </div>

                        <div className="how-wrap reveal" aria-label="How it works">
                            <div className="how-rail" aria-hidden="true"></div>

                            <div className="how-grid">
                                <div className="how-card">
                                    <div className="how-top">
                                        <div className="how-badge">1</div>
                                        <div className="how-title">Submit</div>
                                    </div>
                                    <div className="how-body">Referral partner submits through your agency link.</div>
                                    <div className="how-mini">No login required</div>
                                </div>

                                <div className="how-card">
                                    <div className="how-top">
                                        <div className="how-badge">2</div>
                                        <div className="how-title">Confirm</div>
                                    </div>
                                    <div className="how-body">Instant confirmation with a unique Referral ID.</div>
                                    <div className="how-mini">Accountability built in</div>
                                </div>

                                <div className="how-card">
                                    <div className="how-top">
                                        <div className="how-badge">3</div>
                                        <div className="how-title">Update</div>
                                    </div>
                                    <div className="how-body">Your team updates status and notes from one dashboard.</div>
                                    <div className="how-mini">Clear next steps</div>
                                </div>

                                <div className="how-card">
                                    <div className="how-top">
                                        <div className="how-badge">4</div>
                                        <div className="how-title">Track</div>
                                    </div>
                                    <div className="how-body">Partners check status using the Referral ID anytime.</div>
                                    <div className="how-mini">Fewer follow ups</div>
                                </div>
                            </div>
                        </div>

                        <div className="how-foot reveal">
                            <div className="how-pill">Built for speed</div>
                            <div className="how-pill">Built for visibility</div>
                            <div className="how-pill">Built for trust</div>
                        </div>
                    </div>
                </section>

                <section className="block">
                    <div className="container">
                        <div className="reveal">
                            <h2>Own your referral flow</h2>
                            <p className="lead">Marketing creates demand. Your intake process determines whether that demand turns into admissions.</p>
                        </div>
                        <div className="callout reveal">
                            <b>If you want to market confidently, your backend must be solid.</b>
                            <p>ReferralFlow.Health strengthens the way you already intake referrals—so you can scale outreach without losing control or overwhelming your team.</p>
                        </div>
                    </div>
                </section>

                <section className="cta">
                    <div className="container">
                        <div className="cta-box reveal">
                            <div className="cta-inner">
                                <div>
                                    <h2>Ready to start?</h2>
                                    <p>Choose your subscription and start building a referral process your partners trust.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <Link href="/login" className="btn">Login</Link>
                                    <Link href="/subscribe" className="btn btn-primary">Get Started</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>



                <footer>
                    <div className="container">
                        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <span>© {new Date().getFullYear()} ReferralFlow.Health</span>
                                <Link href="https://referralflow.health/contact" style={{ fontSize: '12px', opacity: 0.8, color: 'inherit' }}>Contact Us</Link>
                            </div>
                            <span style={{ fontSize: '11px', opacity: 0.8 }}>
                                Powered by <b>ReferralFlow.Health</b> and created by <a href="https://ilptechnology.com/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>ILP Technologies</a>
                            </span>
                        </div>
                    </div>
                </footer>
            </main>

            {/* MODAL */}
            {isModalOpen && (
                <div className="backdrop" style={{ display: 'flex' }} onClick={(e) => {
                    if (e.target === e.currentTarget) closeModal();
                }}>
                    <div className="modal">
                        <div className="modal-head">
                            <b>Get Started</b>
                            <button className="close" type="button" aria-label="Close" onClick={closeModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="field">
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
                            <div className="modal-actions">
                                <button className="btn btn-primary" id="continue" type="button" onClick={handleContinue}>Continue</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
