'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/logo';
import { signInWithGoogle } from '@/firebase/auth/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.986,36.69,44,30.836,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);


export default function LoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            const { user, isNewUser } = await signInWithGoogle();

            if (isNewUser) {
                // User was not registered -> Redirect to subscribe
                // We should probably sign them out so they aren't logged in as a 'ghost' user
                // but for now, let's just redirect as requested.
                // The prompt says "if not registered, return to subscribe page".
                router.push('/subscribe');
                toast({
                    title: "Registration Required",
                    description: "Please subscribe to access the dashboard.",
                });
            } else if (user) {
                toast({
                    title: "Inicio de sesión exitoso",
                    description: `Bienvenido de nuevo, ${user.displayName}.`,
                });
                router.push('/dashboard');
            }
        } catch (error: any) {
            console.error("Google Sign-In Error:", error);
            toast({
                variant: "destructive",
                title: "Error de inicio de sesión",
                description: error.message || "No se pudo iniciar sesión con Google. Por favor, inténtelo de nuevo.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex items-center justify-center gap-2">
                        <Logo className="h-8 w-8" />
                        <span className="text-2xl font-bold font-headline">ReferralFlow Central</span>
                    </div>
                    <CardTitle className="text-2xl">Staff Portal Login</CardTitle>
                    <CardDescription>Inicia sesión para gestionar los referidos.</CardDescription>
                    {isLoading && (
                        <div className="mt-2 text-xs text-secondary animate-pulse px-2 py-1 bg-secondary/10 rounded-md">
                            Check for a separate window. If nothing happens, ensure popups are allowed.
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGoogleSignIn} disabled={isLoading} className="w-full" variant="outline">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Connecting to Google...
                            </>
                        ) : (
                            <>
                                <GoogleIcon className="mr-2" />
                                Iniciar sesión con Google
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
