import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export default function AgencyNotFound() {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-4 font-sans text-gray-900">
            <Card className="w-full max-w-md p-8 md:p-12 shadow-2xl bg-white border-0 rounded-3xl text-center space-y-8">
                <div className="flex justify-center">
                    <div className="h-24 w-24 bg-red-50 rounded-full flex items-center justify-center mb-4 ring-8 ring-red-50/50">
                        <ShieldAlert className="h-10 w-10 text-red-500" />
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 font-headline">
                        Agency Suspended
                    </h1>
                    <p className="text-gray-500 text-lg leading-relaxed">
                        The agency portal you are trying to access is currently unavailable or does not exist.
                    </p>
                </div>

                <div className="space-y-4 pt-4">
                    <Button asChild size="lg" className="w-full h-12 text-base rounded-xl font-bold bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200/50 transition-transform active:scale-95">
                        <Link href="/subscribe">
                            Subscribe Now
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <p className="text-sm text-gray-400">
                        Are you the owner? Reactivate your account to restore access immediately.
                    </p>
                </div>
            </Card>

            <div className="mt-12 opacity-40 hover:opacity-100 transition-opacity">
                <Link href="/" className="text-sm font-medium uppercase tracking-widest text-gray-400">
                    Powered by ReferralFlow
                </Link>
            </div>
        </div>
    );
}
