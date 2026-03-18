'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function PageSizeSelector({ initialSize }: { initialSize: number }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const handleSizeChange = (newSize: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('pageSize', newSize);
        params.set('page', '1'); // Reset to first page when changing size
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Show:</span>
            <Select defaultValue={initialSize.toString()} onValueChange={handleSizeChange}>
                <SelectTrigger className="w-[70px] h-8 bg-white border-slate-200 text-xs font-bold focus:ring-1 focus:ring-primary/20">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {[10, 25, 50].map((size) => (
                        <SelectItem key={size} value={size.toString()} className="text-xs font-medium">
                            {size}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
