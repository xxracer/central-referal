import { getAgencySubscriptionDetails } from '@/lib/stripe-actions';
import SubscriptionCard from '@/components/dashboard/billing/subscription-card';
import { CreditCard, History, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata = {
    title: 'Billing & Subscriptions - ReferralFlow.Health',
    description: 'Manage your agency billing and payment methods',
};

export default async function BillingPage() {
    const subscriptionData = await getAgencySubscriptionDetails();

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Billing & Subscriptions</h1>
                <p className="text-slate-400">
                    Manage your plan, request refunds, and view your billing history.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                {/* Active Subscription Summary */}
                <div className="lg:col-span-2 space-y-6">
                    <SubscriptionCard details={subscriptionData.success ? subscriptionData.data : undefined} />

                    {/* Error Handling if Stripe failed */}
                    {!subscriptionData.success && (
                        <div className="rounded-lg bg-red-900/20 border border-red-500/20 p-4 flex items-start gap-3">
                            <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5" />
                            <div>
                                <h3 className="font-medium text-red-400">Unable to load billing data</h3>
                                <p className="text-sm text-red-400/80 mt-1">{subscriptionData.error}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Cards */}
                <div className="space-y-6">
                    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-white">
                                <History className="w-4 h-4 text-slate-400" />
                                Payment History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-400 mb-4">
                                Need an invoice for your accounting team?
                            </p>
                            <Button variant="outline" className="w-full border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white" disabled>
                                Download Invoices (Coming Soon)
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-white">
                                <CreditCard className="w-4 h-4 text-slate-400" />
                                Payment Method
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-400 mb-4">
                                Update the credit card on file for your subscription.
                            </p>
                            <Button variant="outline" className="w-full border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white" disabled>
                                Update Card (Coming Soon)
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
