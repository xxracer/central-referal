'use client';

import React, { useMemo } from 'react';
import type { Referral, ReferralStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Clock, Activity, Users, Building, AlertCircle } from 'lucide-react';
import { format, differenceInMinutes, parseISO, startOfDay, formatISO } from 'date-fns';

export default function DashboardAnalytics({ referrals }: { referrals: Referral[] }) {
    // --- 1. PROCESS KPIS ---
    const kpis = useMemo(() => {
        let totalReceived = referrals.length;
        let currentlyInReview = 0;
        let currentlyAccepted = 0;
        let currentlyAdmitted = 0;
        let currentlyRejected = 0;
        let totalReviewTimeMinutes = 0;
        let reviewsCount = 0;

        referrals.forEach(r => {
            if (r.status === 'IN_REVIEW') currentlyInReview++;
            if (r.status === 'ACCEPTED') currentlyAccepted++;
            if (r.status === 'ADMITTED') currentlyAdmitted++;
            if (r.status === 'REJECTED') currentlyRejected++;

            // Calculate review time (from creation to first IN_REVIEW or ACCEPTED etc)
            const reviewStatus = r.statusHistory.find(h => h.status === 'IN_REVIEW' || h.status === 'ACCEPTED');
            if (reviewStatus) {
                const diff = differenceInMinutes(new Date(reviewStatus.changedAt), new Date(r.createdAt));
                if (diff >= 0) {
                    totalReviewTimeMinutes += diff;
                    reviewsCount++;
                }
            }
        });

        const avgReviewTime = reviewsCount > 0 ? Math.round(totalReviewTimeMinutes / reviewsCount) : 0;
        const avgReviewText = avgReviewTime > 120 
            ? `${Math.round(avgReviewTime / 60)} hrs` 
            : `${avgReviewTime} min`;

        return {
            totalReceived,
            currentlyInReview,
            currentlyAccepted,
            currentlyAdmitted,
            currentlyRejected,
            avgReviewText
        };
    }, [referrals]);

    // --- 2. PROCESS FUNNEL ---
    const funnelData = useMemo(() => {
        let received = referrals.length;
        let reviewed = 0;
        let accepted = 0;
        let admitted = 0;

        referrals.forEach(r => {
            const hasStatus = (s: ReferralStatus) => r.status === s || r.statusHistory.some(h => h.status === s);
            
            if (hasStatus('IN_REVIEW') || hasStatus('ACCEPTED') || hasStatus('ADMITTED') || hasStatus('REJECTED') || hasStatus('NEED_MORE_INFO')) reviewed++;
            if (hasStatus('ACCEPTED') || hasStatus('ADMITTED')) accepted++;
            if (hasStatus('ADMITTED')) admitted++;
        });

        return [
            { name: 'Received', value: received, fill: '#3b82f6' },
            { name: 'Reviewed', value: reviewed, fill: '#6366f1' },
            { name: 'Accepted', value: accepted, fill: '#10b981' },
            { name: 'Admitted', value: admitted, fill: '#059669' },
        ];
    }, [referrals]);

    // --- 3. PROCESS TRENDS (Last 14 Days or based on data) ---
    const trendData = useMemo(() => {
        const grouped = referrals.reduce((acc, r) => {
            const date = format(startOfDay(new Date(r.createdAt)), 'MMM dd');
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Sort by date key (assuming recent 30 days max for standard view)
        // A simple approach is to rely on the natural order if we sort referrals first, or sort the keys.
        // For robustness, sort by actual dates.
        const sortedKeys = Object.keys(grouped).sort((a, b) => new Date(`${a} 2026`).getTime() - new Date(`${b} 2026`).getTime());
        return sortedKeys.map(k => ({ date: k, count: grouped[k] }));
    }, [referrals]);

    // --- 4. PROCESS INSURANCES ---
    const insuranceData = useMemo(() => {
        const counts: Record<string, number> = {};
        referrals.forEach(r => {
            const ins = r.patientInsurance || 'Unknown';
            counts[ins] = (counts[ins] || 0) + 1;
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const top4 = sorted.slice(0, 4);
        const others = sorted.slice(4).reduce((sum, [, count]) => sum + count, 0);

        const data = top4.map(([name, value]) => ({ name, value }));
        if (others > 0) {
            data.push({ name: 'Other', value: others });
        }
        return data;
    }, [referrals]);

    const insuranceColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // --- 5. PROCESS TOP SOURCES ---
    const topSources = useMemo(() => {
        const counts: Record<string, number> = {};
        referrals.forEach(r => {
            const source = r.referrerName || 'Unknown';
            counts[source] = (counts[source] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }, [referrals]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white shadow-sm border-slate-200">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Received</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1">{kpis.totalReceived}</h3>
                        </div>
                        <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                            <Activity className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-sm border-slate-200">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">In Review</p>
                            <h3 className="text-3xl font-bold text-indigo-600 mt-1">{kpis.currentlyInReview}</h3>
                        </div>
                        <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-sm border-slate-200">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Avg Review Time</p>
                            <h3 className="text-3xl font-bold text-amber-600 mt-1">{kpis.avgReviewText}</h3>
                        </div>
                        <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                            <Clock className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-sm border-slate-200">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Admitted</p>
                            <h3 className="text-3xl font-bold text-emerald-600 mt-1">{kpis.currentlyAdmitted}</h3>
                        </div>
                        <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                            <Users className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <Card className="lg:col-span-2 shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Referral Velocity</CardTitle>
                        <CardDescription>Volume of referrals received over time.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Funnel */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Pipeline Funnel</CardTitle>
                        <CardDescription>Conversion metrics across stages.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#475569', fontWeight: 500 }} width={80} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                        {funnelData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Sources */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Top Referral Sources</CardTitle>
                        <CardDescription>Organizations sending the most patients.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 pt-2">
                            {topSources.length === 0 && <p className="text-sm text-slate-500">No data available.</p>}
                            {topSources.map(([source, count], i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                            #{i + 1}
                                        </div>
                                        <span className="font-medium text-slate-800">{source}</span>
                                    </div>
                                    <div className="font-bold text-slate-900 bg-white px-3 py-1 rounded-full shadow-sm text-sm">
                                        {count}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Insurance Mix */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Insurance Distribution</CardTitle>
                        <CardDescription>Primary payer mix across all referrals.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full flex items-center justify-center relative">
                             {insuranceData.length === 0 ? (
                                <p className="text-sm text-slate-500">No data available.</p>
                             ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={insuranceData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {insuranceData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={insuranceColors[index % insuranceColors.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                             )}
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                            {insuranceData.map((entry, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm text-slate-600">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: insuranceColors[index % insuranceColors.length] }}></div>
                                    {entry.name} ({entry.value})
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
