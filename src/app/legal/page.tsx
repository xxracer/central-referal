'use client';

import React, { useEffect } from 'react';
import PublicHeader from '@/components/layout/public-header';
import '@/app/landing.css';

export default function LegalPage() {
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) e.target.classList.add("show");
            });
        }, { threshold: 0.1 });

        document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return (
        <div className="landing-wrapper">
            {/* Background blobs for premium feel */}
            <div className="blob b1"></div>
            <div className="blob b2"></div>
            <div className="blob b3"></div>

            <PublicHeader />

            <main className="page">
                <div className="container" style={{ maxWidth: '900px' }}>

                    <div className="reveal text-center mb-10">
                        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: '1.1' }}>Legal Center</h1>
                        <p className="subtitle" style={{ margin: '0 auto' }}>
                            Transparency is core to our service. Review our Terms of Service, Privacy Policy, and compliance agreements below.
                        </p>
                    </div>

                    <div className="reveal sticky top-24 z-20 mb-8 p-2 bg-white/60 backdrop-blur-md rounded-full border border-blue-100 shadow-sm flex flex-wrap justify-center gap-2 max-w-fit mx-auto">
                        <a href="#terms" className="px-5 py-2 rounded-full text-sm font-bold text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-md transition-all">Terms</a>
                        <a href="#privacy" className="px-5 py-2 rounded-full text-sm font-bold text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-md transition-all">Privacy</a>
                        <a href="#baa" className="px-5 py-2 rounded-full text-sm font-bold text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-md transition-all">BAA</a>
                        <a href="#dpa" className="px-5 py-2 rounded-full text-sm font-bold text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-md transition-all">DPA</a>
                    </div>

                    <div className="panel reveal">
                        <section id="terms" className="scroll-mt-32 mb-16">
                            <div className="kicker"><div className="pill"></div>Legal</div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-6">Terms of Service</h2>

                            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
                                <p><strong>Effective Date:</strong> [Current Date]</p>
                                <p>These Terms of Service (“Terms”) govern access to and use of the ReferralFlow.Health platform (the “Platform”), which is owned and operated by ILP Technologies LLC, a Texas limited liability company, doing business as ReferralFlow.Health (“ILP Technologies,” “Company,” “we,” “us,” or “our”).</p>

                                <div className="note border-l-4 border-l-red-400 bg-red-50 text-red-900 font-medium">
                                    By creating an account, accessing, or using the Platform, you (“Agency,” “User,” or “Customer”) agree to these Terms. If you do not agree, you may not use the Platform.
                                </div>

                                <h3 className="text-xl font-bold text-slate-800 mt-8 mb-4">1. Description of Services</h3>
                                <p>ReferralFlow.Health is a web-based referral intake and communication platform provided by ILP Technologies LLC. The Platform facilitates secure referral submission, tracking, file exchange, and workflow management.</p>
                                <p className="mt-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <strong>Disclaimer:</strong> ILP Technologies LLC does not provide medical care, clinical decision-making, or healthcare services.
                                </p>

                                <h3 className="text-xl font-bold text-slate-800 mt-8 mb-4">2. Legal Entity</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                        <div className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Provider</div>
                                        <div className="font-bold text-slate-900">ILP Technologies LLC</div>
                                        <div className="text-sm text-slate-500">DBA ReferralFlow.Health</div>
                                    </div>
                                    <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Client</div>
                                        <div className="font-bold text-slate-900">Subscribing Agency</div>
                                        <div className="text-sm text-slate-500">Authorized Representative</div>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-slate-800 mt-8 mb-4">3. Account Security</h3>
                                <ul className="space-y-2 mt-4">
                                    <li className="flex gap-3 text-slate-700">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></div>
                                        Users are responsible for maintaining login confidentiality.
                                    </li>
                                    <li className="flex gap-3 text-slate-700">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></div>
                                        Role-based access control must be enforced within the Agency.
                                    </li>
                                </ul>

                                <h3 className="text-xl font-bold text-slate-800 mt-8 mb-4">4. Liability & Law</h3>
                                <p>The Platform is provided “as is.” To the maximum extent permitted by law, ILP Technologies LLC shall not be liable for indirect, incidental, or consequential damages. These Terms are governed by the laws of the State of Texas.</p>
                            </div>
                        </section>

                        <div className="w-full h-px bg-slate-200 my-12"></div>

                        <section id="privacy" className="scroll-mt-32 mb-16">
                            <div className="kicker"><div className="pill"></div>Data</div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-6">Privacy Policy</h2>
                            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
                                <p>We respect your privacy. This policy describes how ILP Technologies LLC collects and processes information.</p>

                                <h3 className="text-xl font-bold text-slate-800 mt-8 mb-4">Collected Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {['Account Details', 'Referral Data', 'Usage Logs'].map(item => (
                                        <div key={item} className="px-4 py-3 bg-white border border-slate-100 shadow-sm rounded-lg text-center font-medium text-slate-700">
                                            {item}
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-6">We use this information to operate the Platform, maintain security, and comply with legal requirements. <strong>We do not sell Protected Health Information (PHI).</strong></p>
                            </div>
                        </section>

                        <div className="w-full h-px bg-slate-200 my-12"></div>

                        <section id="baa" className="scroll-mt-32 mb-16">
                            <div className="kicker"><div className="pill"></div>Compliance</div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-6">Business Associate Agreement</h2>

                            <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-6 md:p-8">
                                <p className="font-medium text-blue-900 mb-4">This BAA is effective upon your account activation.</p>
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">1</div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">Scope</h4>
                                            <p className="text-sm text-slate-600">We create, receive, maintain, and transmit PHI solely to provide Platform services.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">2</div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">Safeguards</h4>
                                            <p className="text-sm text-slate-600">We implement strict administrative, physical, and technical safeguards to protect PHI.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 mb-0">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">3</div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">Breach Notification</h4>
                                            <p className="text-sm text-slate-600">We will notify you without unreasonable delay upon discovery of any breach of unsecured PHI.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="w-full h-px bg-slate-200 my-12"></div>

                        <section id="dpa" className="scroll-mt-32">
                            <div className="kicker"><div className="pill"></div>Processing</div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-6">Data Processing Addendum</h2>
                            <p className="text-slate-600">This DPA supplements the Terms of Service. You act as the <strong>Controller</strong>, and ILP Technologies LLC acts as the <strong>Processor</strong>. We process data solely to provide the services outlined in our agreement.</p>
                        </section>

                    </div>

                    <div className="text-center text-sm text-muted2 mt-12 pb-8">
                        &copy; {new Date().getFullYear()} ILP Technologies LLC. All rights reserved.
                    </div>
                </div>
            </main>
        </div>
    );
}
