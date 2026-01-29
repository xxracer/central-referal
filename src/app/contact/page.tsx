import { headers } from 'next/headers';
import ContactSection from '@/components/landing/contact-section';
import Link from 'next/link';
import '@/app/landing.css';

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
    return (
        <div className="landing-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <ContactSection />
            </main>

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
        </div>
    );
}
