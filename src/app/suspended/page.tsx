import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert, Mail, Phone } from 'lucide-react';

export default function SuspendedPage() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/30 px-4">
            <Card className="max-w-md w-full shadow-2xl border-destructive/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-destructive" />
                <CardHeader className="text-center pt-10">
                    <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                        <ShieldAlert className="w-8 h-8 text-destructive" />
                    </div>
                    <CardTitle className="text-3xl font-headline font-bold text-foreground">Account Suspended</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Access to this portal has been temporarily disabled.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pb-10">
                    <p className="text-center text-muted-foreground leading-relaxed">
                        This usually happens due to a pending payment or an expired subscription. Please contact your administrator or ReferralFlow support to reactivate your account.
                    </p>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border/50">
                            <Mail className="w-5 h-5 text-primary" />
                            <span className="text-sm font-medium">support@referralflow.health</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border/50">
                            <Phone className="w-5 h-5 text-primary" />
                            <span className="text-sm font-medium">Contact your account manager</span>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-2">
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/">Return to Home</Link>
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest pt-4">
                            ReferralFlow Central &bull; Legal Compliance
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
