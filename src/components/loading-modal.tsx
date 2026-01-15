'use strict';

import React from 'react';
import { Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface LoadingModalProps {
    isOpen: boolean;
    message?: string;
}

export default function LoadingModal({
    isOpen,
    message = 'Processing your referral...',
}: LoadingModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-[425px] flex flex-col items-center justify-center py-10 gap-4 [&>button]:hidden">
                <DialogHeader className="hidden">
                    <DialogTitle>Loading</DialogTitle>
                    <DialogDescription>Please wait</DialogDescription>
                </DialogHeader>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium text-foreground">{message}</p>
                <p className="text-sm text-muted-foreground text-center">
                    Please do not close this window or refresh the page.
                </p>
            </DialogContent>
        </Dialog>
    );
}
