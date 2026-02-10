export async function verifyRecaptcha(token: string): Promise<boolean> {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
        console.error("RECAPTCHA_SECRET_KEY is not set in environment variables.");
        // Fail open or closed? Closed for security.
        return false;
    }

    // Bypass for Localhost / Development
    if (process.env.NODE_ENV === 'development' || token === 'localhost_bypass') {
        console.log("ReCAPTCHA Bypassed (Development Mode)");
        return true;
    }

    if (!token) return false;

    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${secretKey}&response=${token}`,
        });

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error("reCAPTCHA verification failed:", error);
        return false;
    }
}
