'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Loader2 } from 'lucide-react';
import { requestRefundAction } from '@/lib/stripe-actions';
import { useToast } from '@/hooks/use-toast';

interface RequestRefundModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RequestRefundModal({ isOpen, onClose }: RequestRefundModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [reason, setReason] = useState('');
    const { toast } = useToast();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!reason.trim()) {
            toast({
                variant: "destructive",
                title: "Required",
                description: "Please explain the reason for your refund request.",
            });
            return;
        }

        setIsLoading(true);

        try {
            const result = await requestRefundAction(reason);

            if (result.success) {
                toast({
                    title: "Request Sent",
                    description: result.message,
                });
                setReason('');
                onClose();
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.message,
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Request Failed",
                description: "An unexpected error occurred. Please try again or email support directly.",
            });
            console.error("Refund Request Error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] bg-slate-900 text-white border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        Request Refund
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Please provide the reason for your refund request. Our team will review your account and process the request within 24-48 hours.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Textarea
                            placeholder="Why are you requesting a refund?"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="min-h-[120px] resize-none bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-slate-700"
                            required
                        />
                    </div>

                    <DialogFooter className="pt-4 border-t border-slate-800/50 gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="text-slate-400 hover:text-white hover:bg-slate-800"
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/20 w-full sm:w-auto"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                "Submit Request"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
