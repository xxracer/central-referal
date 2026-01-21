import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-muted/20 p-4 font-sans">
            <div className="text-center space-y-6 max-w-md mx-auto">
                <div className="bg-primary/5 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-primary/5">
                    <FileQuestion className="h-10 w-10 text-primary" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground font-headline">Page Not Found</h1>
                    <p className="text-muted-foreground text-lg">
                        Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
                    </p>
                </div>

                <div className="pt-6">
                    <Button asChild size="lg" className="rounded-full px-8">
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" />
                            Return Home
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="mt-12 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest opacity-50">
                    Secured by ReferralFlow
                </p>
            </div>
        </div>
    );
}
