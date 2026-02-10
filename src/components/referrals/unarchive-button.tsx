'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { ArchiveRestore, Loader2 } from 'lucide-react';
import { archiveReferralAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface UnarchiveButtonProps {
    referralId: string;
}

export default function UnarchiveButton({ referralId }: UnarchiveButtonProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();

    const handleUnarchive = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent accordion expansion if placed inside trigger
        startTransition(async () => {
            const result = await archiveReferralAction(referralId, false); // false = unarchive
            if (result.success) {
                toast({
                    title: "Referral Restored",
                    description: "The referral has been moved back to the active list."
                });
                router.refresh(); // Refresh server component
            } else {
                toast({
                    title: "Error",
                    description: "Failed to verify restore action.",
                    variant: "destructive"
                });
            }
        });
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleUnarchive}
            disabled={isPending}
            className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 h-8 text-xs font-bold"
        >
            {isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <ArchiveRestore className="mr-2 h-3 w-3" />}
            Unarchive
        </Button>
    );
}
