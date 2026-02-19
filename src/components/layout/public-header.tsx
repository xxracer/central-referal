import Link from 'next/link';
import '@/app/landing.css';

export default function PublicHeader() {
    const effectiveLogoUrl = "https://static.wixstatic.com/media/c5947c_14731b6192f740d8958b7a069f361b4e~mv2.png";

    return (
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
    );
}
