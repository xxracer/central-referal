'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Calendar } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function DashboardFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');

    const handleSearch = () => {
        const params = new URLSearchParams(searchParams.toString());
        if (search) params.set('search', search); else params.delete('search');
        if (startDate) params.set('startDate', startDate); else params.delete('startDate');
        if (endDate) params.set('endDate', endDate); else params.delete('endDate');
        router.push(`/dashboard?${params.toString()}`);
    };

    const handleClear = () => {
        setSearch('');
        setStartDate('');
        setEndDate('');
        router.push('/dashboard');
    };

    return (
        <div className="flex flex-wrap items-end gap-4 bg-card p-4 rounded-lg border mb-6">
            <div className="flex-1 min-w-[200px] space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Search Referrals</label>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, ID, or organization..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
            </div>
            <div className="w-full sm:w-auto space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">From Date</label>
                <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />
            </div>
            <div className="w-full sm:w-auto space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">To Date</label>
                <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
            </div>
            <div className="flex gap-2">
                <Button onClick={handleSearch} variant="secondary">Filter</Button>
                <Button onClick={handleClear} variant="ghost" size="icon" title="Clear Filters">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
