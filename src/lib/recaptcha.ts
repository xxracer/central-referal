export async function verifyRecaptcha(token: string): Promise<boolean> {
    // CAPTCHA DISABLED BY USER REQUEST
    return true;
}
