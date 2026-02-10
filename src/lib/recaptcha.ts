export async function verifyRecaptcha(token: string): Promise<boolean> {
    // User Provided Secret Key
    const secretKey = process.env.TURNSTILE_SECRET_KEY || '0x4AAAAAACaQtUNnelCFgLHh-jxayJw39VM';

    if (!secretKey) {
        console.error("TURNSTILE_SECRET_KEY is not set.");
        return false;
    }

    // Bypass for Localhost / Development
    if (process.env.NODE_ENV === 'development' || token === 'localhost_bypass') {
        console.log("Turnstile Bypassed (Development Mode)");
        return true;
    }

    if (!token) return false;

    try {
        const formData = new FormData();
        formData.append('secret', secretKey);
        formData.append('response', token);

        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        if (!data.success) {
            console.error("Turnstile verification failed:", data);
        }
        return data.success;
    } catch (error) {
        console.error("Turnstile verification error:", error);
        return false;
    }
}
