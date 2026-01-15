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

    // Allowed domains list (including localhost)
    // In production, you'd add your root domain here
    const allowedDomains = ["localhost:3000", "actiniumholdings.com", "referral-app.vercel.app"];

    // Verify uniqueness of hostname to determine if it's a subdomain
    // logic: if hostname is NOT in allowedDomains, treat as subdomain/custom domain
    // But for localhost testing: "test.localhost:3000"

    const isVercelDomain = hostname.includes(".vercel.app");
    const isLocalhost = hostname.includes("localhost");

    // simplistic subdomain extraction for "sub.domain.com"
    // If localhost: test.localhost:3000 -> sub: test
    // If prod: care.actinium.com -> sub: care

    let currentHost;
    if (process.env.NODE_ENV === "production" && isVercelDomain) {
        currentHost = hostname.replace(`.vercel.app`, "");
    } else if (process.env.NODE_ENV === "development" && isLocalhost) {
        currentHost = hostname.replace(`.localhost:3000`, "");
    } else {
        // Custom domain or root
        currentHost = hostname; // Needs more robust parsing if we support custom domains
    }

    // If it's the root domain (no subdomain), just let it pass or rewrite to landing?
    // If hostname is root, we might want to show a general landing page or login.
    // For now, let's assume if it is "localhost:3000" or "actinium.com", it is ROOT.

    const requestHeaders = new Headers(req.headers);

    if (allowedDomains.some(d => hostname === d) || hostname === 'localhost:3000') {
        requestHeaders.set('x-agency-id', 'default');
        return NextResponse.next({
            request: { headers: requestHeaders },
        });
    }

    // It IS a subdomain (e.g., 'care')
    const subdomain = currentHost.split('.')[0];

    requestHeaders.set('x-agency-id', subdomain);
    return NextResponse.next({
        request: { headers: requestHeaders },
    });
}
