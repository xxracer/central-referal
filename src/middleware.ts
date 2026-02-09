import { NextRequest, NextResponse } from "next/server";

export const config = {
    matcher: [
        /*
         * Match all paths except for:
         * 1. /api routes
         * 2. /_next (Next.js internals)
         * 3. /_static (inside /public)
         * 4. all root files inside /public (e.g. /favicon.ico)
         */
        "/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)",
    ],
};

export default async function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const hostname = req.headers.get("host")!; // e.g. "care.actinium.com" or "localhost:3000"

    // --- SECURITY: BOT REDIRECTION ---
    // Redirect common bot probe paths to Google
    const suspiciousPaths = ['/admin', '/wp-admin', '/wp-login.php', '/dashboard/admin', '/administrator', '/backup', '/.env'];
    if (suspiciousPaths.some(path => url.pathname.startsWith(path))) {
        // Allow legitimate next.js app admin routes if they exist, but user specifically asked to block /admin probes.
        // Our app uses /super-admin and /dashboard, so /admin is likely a bot.
        // Double check: does /admin exist in our app? 
        // We have /super-admin. We have /dashboard. We do NOT have /admin.
        // So blocking /admin is safe.
        return NextResponse.redirect('https://google.com');
    }
    // ---------------------------------
    // ---------------------------------
    // SECURITY: PROTECT DASHBOARD
    // ---------------------------------
    if (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/super-admin')) {
        const session = req.cookies.get('session');
        // We cannot verify the token signature in Edge Middleware (firebase-admin is Node only),
        // so we check for existence. The actual token verification happens in Server Actions/Components.
        if (!session) {
            const loginUrl = new URL('/login', req.url);
            // Optionally add return URL
            // loginUrl.searchParams.set('from', url.pathname);
            return NextResponse.redirect(loginUrl);
        }
    }
    // ---------------------------------

    const requestHeaders = new Headers(req.headers);

    // Clean hostname (remove port) for logic checks
    const cleanHost = hostname.split(':')[0];

    // Root Domains that map to 'default' (Landing Page / Central Admin)
    const rootDomains = [
        "localhost",
        "actiniumholdings.com",
        "referral-app.vercel.app",
        "referralflow.health",
        "www.referralflow.health"
    ];

    if (rootDomains.includes(cleanHost)) {
        requestHeaders.set('x-agency-id', 'default');
        return NextResponse.next({
            request: { headers: requestHeaders },
        });
    }

    // Subdomain Extraction Logic
    let agencyId = 'default';

    if (cleanHost.endsWith('.referralflow.health')) {
        agencyId = cleanHost.replace('.referralflow.health', '');
    } else if (cleanHost.endsWith('.vercel.app')) {
        agencyId = cleanHost.replace('.vercel.app', '');
    } else if (cleanHost.endsWith('.localhost')) { // e.g. agency.localhost
        agencyId = cleanHost.replace('.localhost', '');
    } else {
        // Fallback for custom domains or other environments
        // If we are here, it matches "((?!api/|_next/...).*)" so it is a page request.
        // If it isn't a known root domain, we assume it MIGHT be a custom domain mapping to an agency.
        // For now, let's treat the whole host (minus port) as key if we supported custom domains.
        // But simpler: just take the first part of the domain?
        // Or if local development with different port but no subdomain? 
        // Logic: active development might be on localhost:9002 WITHOUT subdomain.
        // IF user is accessing localhost:9002 directly, it is effectively ROOT.
        if (cleanHost === 'localhost' || cleanHost === '127.0.0.1') {
            agencyId = 'default';
        } else {
            // Potentially a custom domain or sub.sub.domain
            // Take the first part? 
            agencyId = cleanHost.split('.')[0];
        }
    }

    requestHeaders.set('x-agency-id', agencyId);
    return NextResponse.next({
        request: { headers: requestHeaders },
    });
}
