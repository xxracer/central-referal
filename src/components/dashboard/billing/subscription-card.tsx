'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, CreditCard, RefreshCcw } from 'lucide-react';
import { SubscriptionDetails } from '@/lib/stripe-actions';
import RequestRefundModal from './request-refund-modal';
import { formatDate } from '@/lib/utils';

export default function SubscriptionCard({ details }: { details?: SubscriptionDetails }) {
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

    const isActive = details?.status === 'active';
    const amountFormatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: details?.currency || 'usd',
    }).format((details?.planAmount || 0) / 100);

    return (
        <>
            <Card className="border border-slate-200/80 rounded-2xl bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <CardHeader className="pb-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 tracking-tight">
                                <CreditCard className="w-5 h-5 text-blue-500" />
                                Current Plan
                            </CardTitle>
                            <CardDescription className="text-slate-500 mt-1.5 font-medium">
                                Manage your agency's subscription
                            </CardDescription>
                        </div>
                        <Badge
                            variant={isActive ? "default" : "destructive"}
                            className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium ${isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                }`}
                        >
                            {isActive ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {details?.status ? details.status.charAt(0).toUpperCase() + details.status.slice(1) : 'Inactive'}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="pt-7 pb-7 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Plan Amount</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{amountFormatted}</span>
                                <span className="text-slate-500 font-medium">/{details?.interval || 'month'}</span>
                            </div>
                        </div>

                        <div className="text-left sm:text-right">
                            <p className="text-sm font-semibold text-slate-500 mb-1.5 flex justify-start sm:justify-end items-center gap-1.5 uppercase tracking-wider">
                                <RefreshCcw className="w-3.5 h-3.5" />
                                Next Renewal Date
                            </p>
                            <p className="text-lg font-bold text-slate-800">
                                {details?.currentPeriodEnd ? formatDate(details.currentPeriodEnd) : 'N/A'}
                            </p>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col sm:flex-row justify-between items-center py-5 border-t border-slate-100 bg-slate-50/80 gap-4">
                    <div className="text-sm text-slate-500 font-medium flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
                        Payments are securely processed by Stripe.
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => setIsRefundModalOpen(true)}
                        className="text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors font-semibold w-full sm:w-auto"
                    >
                        Request Refund
                    </Button>
                </CardFooter>
            </Card>

            <RequestRefundModal
                isOpen={isRefundModalOpen}
                onClose={() => setIsRefundModalOpen(false)}
            />
        </>
    );
}
