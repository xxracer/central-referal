'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Filter, ChevronDown, ChevronUp, Mail, Phone, User, Calendar, PlusCircle, Edit2, BarChart3, ExternalLink, RefreshCcw, Bell, Building, Stethoscope, MessageSquareText, Archive, ArchiveRestore, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn, formatDate } from '@/lib/utils';
import type { ReferralSource, ReferralSourceMetrics } from '@/lib/types';
import { getReferralSourceContacts, syncLegacyReferralSources } from '@/lib/referral-sources-data';
import { archiveContactLogAction } from '@/lib/referral-sources-actions';
import type { ReferralSourceContact } from '@/lib/types';
import AddReferralSourceModal from './referral-source-modal';
import AddContactModal from './add-contact-modal';

type SourceWithMetrics = ReferralSource & { metrics: ReferralSourceMetrics };

export default function ReferralSourcesList({ initialSources, agencyId }: { initialSources: SourceWithMetrics[], agencyId: string }) {
    const router = useRouter();
    const [sources, setSources] = useState<SourceWithMetrics[]>(initialSources);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [expandedData, setExpandedData] = useState<Record<string, any[]>>({});

    // Modals state
    const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
    const [editSource, setEditSource] = useState<ReferralSource | null>(null);

    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [contactSourceId, setContactSourceId] = useState<string | null>(null);
    const [editContact, setEditContact] = useState<ReferralSourceContact | null>(null);

    // Sync state with server changes
    useEffect(() => {
        setSources(initialSources);
    }, [initialSources]);

    // Basic client-side filtering (Search only for simplicity, server handles full query on load)
    const filteredSources = sources.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const toggleRow = async (sourceId: string, forceFetch = false) => {
        if (expandedRow === sourceId && !forceFetch) {
            setExpandedRow(null);
            return;
        }
        setExpandedRow(sourceId);

        // Fetch contacts if not already loaded or forcing
        if (!expandedData[sourceId] || forceFetch) {
            // Flash loading state if force fetching to give visual feedback of the "instant update"
            if (forceFetch) {
                setExpandedData(prev => ({ ...prev, [sourceId]: null as any }));
            }
            const contacts = await getReferralSourceContacts(agencyId, sourceId);
            setExpandedData(prev => ({ ...prev, [sourceId]: contacts }));
        }
    };

    const handleAddContact = (e: React.MouseEvent, sourceId: string) => {
        e.stopPropagation();
        setEditContact(null);
        setContactSourceId(sourceId);
        setIsContactModalOpen(true);
    };

    const handleEditContact = (e: React.MouseEvent, sourceId: string, contact: ReferralSourceContact) => {
        e.stopPropagation();
        setEditContact(contact);
        setContactSourceId(sourceId);
        setIsContactModalOpen(true);
    };

    const handleArchiveContact = async (e: React.MouseEvent, contactId: string, isArchived: boolean, sourceId: string) => {
        e.stopPropagation();
        if (!confirm(isArchived ? "Archive this note?" : "Restore this note?")) return;

        const res = await archiveContactLogAction(contactId, isArchived);
        if (res.success) {
            toggleRow(sourceId, true);
        } else {
            alert(res.message);
        }
    };

    const handleEditSource = (e: React.MouseEvent, source: ReferralSource) => {
        e.stopPropagation();
        setEditSource(source);
        setIsSourceModalOpen(true);
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const variants: Record<string, string> = {
            prospect: 'bg-blue-100 text-blue-800 border-blue-200',
            active: 'bg-green-100 text-green-800 border-green-200',
            high_priority: 'bg-orange-100 text-orange-800 border-orange-200',
            cooling_off: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            inactive: 'bg-gray-100 text-gray-800 border-gray-200',
            lost: 'bg-red-100 text-red-800 border-red-200',
        };
        const c = variants[status] || 'bg-gray-100 text-gray-800';
        return <Badge variant="outline" className={`capitalize ${c}`}>{status.replace('_', ' ')}</Badge>;
    };

    const TypeBadge = ({ type }: { type: string }) => {
        return <span className="text-xs font-medium text-muted-foreground capitalize">{type.replace('_', ' ')}</span>;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search sources..."
                        className="pl-9 bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="text-amber-600 border-amber-200 bg-amber-50" onClick={async () => {
                        const res = await syncLegacyReferralSources(agencyId);
                        if (res.success) {
                            alert(`Synced Successful! Created ${res.created} missing sources.`);
                            router.refresh();
                        } else {
                            alert('Sync Failed. Please check console for errors.');
                        }
                    }}>
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100">
                                <BarChart3 className="mr-2 h-4 w-4" /> Analytics
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-slate-50 border-slate-200">
                            <DialogHeader className="bg-white px-8 py-6 border-b border-slate-100 flex flex-row items-center justify-between">
                                <div>
                                    <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">Referral Analytics</DialogTitle>
                                    <p className="text-sm text-slate-500 mt-1">Conversion rates and performance across all sources.</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <BarChart3 className="h-6 w-6 text-blue-600" />
                                </div>
                            </DialogHeader>
                            <Tabs defaultValue="performance" className="w-full">
                                <div className="px-8 pt-6">
                                    <TabsList className="grid w-[400px] grid-cols-2 bg-slate-200/50 p-1">
                                        <TabsTrigger value="performance" className="font-semibold px-6 py-2 rounded-xl data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all">Performance</TabsTrigger>
                                        <TabsTrigger value="insurances" className="font-semibold px-6 py-2 rounded-xl data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all">Insurances</TabsTrigger>
                                    </TabsList>
                                </div>
                                <TabsContent value="performance" className="mt-0">
                                    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                                                <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Sources</div>
                                                <div className="text-4xl font-black text-slate-800">{sources.length}</div>
                                            </div>
                                            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                                                <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Referrals</div>
                                                <div className="text-4xl font-black text-blue-600">{sources.reduce((sum, s) => sum + s.metrics.totalReferralsAllTime, 0)}</div>
                                            </div>
                                            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                                                <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Admitted</div>
                                                <div className="text-4xl font-black text-emerald-500">{sources.reduce((sum, s) => sum + s.metrics.totalAdmittedAllTime, 0)}</div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Source Performance Chart</h4>
                                            <div className="h-[350px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={sources} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                                                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
                                                        <Tooltip
                                                            cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', padding: '12px' }}
                                                            itemStyle={{ fontWeight: 600, fontSize: '14px' }}
                                                            labelStyle={{ fontWeight: 800, color: '#0f172a', marginBottom: '8px', fontSize: '15px' }}
                                                        />
                                                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                                        <Bar name="Total Referrals Received" dataKey="metrics.totalReferralsAllTime" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={50} />
                                                        <Bar name="Successfully Admitted" dataKey="metrics.totalAdmittedAllTime" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={50} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                                <TabsContent value="insurances" className="mt-0">
                                    <div className="p-8 space-y-6 max-h-[600px] overflow-y-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {sources.map(source => {
                                                const stats = Object.entries(source.metrics.insuranceStats || {});
                                                stats.sort((a, b) => b[1] - a[1]); // Descending count

                                                return (
                                                    <div key={source.id} className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex flex-col">
                                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                                                            <h3 className="font-bold text-[15px] text-slate-800 tracking-tight truncate pr-4">{source.name}</h3>
                                                            {stats.length > 0 && <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shrink-0 border border-emerald-200 shadow-sm font-bold">{source.metrics.totalReferralsAllTime} Total</Badge>}
                                                        </div>
                                                        <div className="flex-1 flex flex-col gap-2.5">
                                                            {stats.length > 0 ? (
                                                                stats.map(([insName, count], idx) => (
                                                                    <div key={idx} className="flex items-center justify-between text-[13.5px]">
                                                                        <div className="flex items-center gap-2 truncate pr-4">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></div>
                                                                            <span className="font-semibold text-slate-600 truncate">{insName}</span>
                                                                        </div>
                                                                        <div className="font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 text-xs shrink-0">{count}</div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="text-xs italic text-slate-400 font-medium py-4 text-center">No insurances tracked yet.</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </DialogContent>
                    </Dialog>
                    <Button onClick={() => { setEditSource(null); setIsSourceModalOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Source
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                {filteredSources.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">No referral sources found</h3>
                        <p className="text-slate-500 mt-1">Try adjusting your search filters.</p>
                    </div>
                ) : (
                    filteredSources.map((source) => {
                        const isExpanded = expandedRow === source.id;
                        const total = source.metrics.totalReferralsAllTime;
                        const admitted = source.metrics.totalAdmittedAllTime;
                        const rate = total > 0 ? Math.round((admitted / total) * 100) : 0;

                        return (
                            <div key={source.id} className={cn(
                                "bg-white rounded-2xl border transition-all duration-300 overflow-hidden",
                                isExpanded ? "border-blue-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-1 ring-blue-100" : "border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08)] hover:border-slate-200"
                            )}>
                                {/* Card Header (Always Visible) */}
                                <div
                                    className="p-5 sm:p-6 cursor-pointer flex flex-col xl:flex-row gap-5 xl:items-center relative group w-full"
                                    onClick={() => toggleRow(source.id)}
                                >
                                    <div className="flex items-start gap-4 flex-shrink-0 w-64">
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-xl p-3 border border-blue-100/50 shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
                                            {source.type === 'hospital' ? <Building className="h-6 w-6 text-blue-600" /> :
                                                source.type === 'clinic' ? <Stethoscope className="h-6 w-6 text-indigo-500" /> :
                                                    <User className="h-6 w-6 text-slate-600" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-[17px] font-semibold text-slate-900 tracking-tight">{source.name}</h3>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-all -ml-1" onClick={(e) => { e.stopPropagation(); handleEditSource(e, source); }}>
                                                    <Edit2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <div className="flex flex-col gap-1.5 mt-1.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <TypeBadge type={source.type} />
                                                    <StatusBadge status={source.status} />
                                                </div>
                                                {(source.metrics.latestNote || source.notes) && (
                                                    <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-1 max-w-[280px]">
                                                        <MessageSquareText className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
                                                        <span className="line-clamp-2 italic tracking-tight leading-snug">"{source.metrics.latestNote || source.notes}"</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle Section: Phone and Address */}
                                    {(source.phone || source.address) ? (
                                        <div className="hidden md:flex flex-col justify-center border-l border-slate-100 ml-4 pl-6 lg:ml-8 lg:pl-8 flex-1 w-full mr-auto">
                                            <div className="flex flex-col gap-3.5 w-full">
                                                {source.address && (
                                                    <div className="flex flex-col gap-1.5 cursor-pointer group/address w-full" onClick={(e) => { e.stopPropagation(); window.open(`https://maps.google.com/?q=${encodeURIComponent(source.address!)}`, '_blank'); }}>
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                            <MapPin className="h-4 w-4 text-slate-400" /> Address
                                                        </div>
                                                        <div className="text-[15px] font-medium text-slate-700 leading-snug group-hover/address:text-blue-600 transition-colors line-clamp-3 w-full break-words">
                                                            {source.address}
                                                        </div>
                                                    </div>
                                                )}
                                                {source.phone && (
                                                    <div className="flex flex-col gap-1.5 w-full">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                            <Phone className="h-4 w-4 text-slate-400" /> Phone
                                                        </div>
                                                        <a href={`tel:${source.phone}`} className="text-[15px] font-medium text-slate-700 hover:text-blue-600 transition-colors w-full" onClick={(e) => e.stopPropagation()}>
                                                            {source.phone}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 hidden md:flex border-l border-slate-100 ml-4 pl-6 lg:ml-8 lg:pl-8"></div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-6 xl:gap-8 px-2 xl:px-0 ml-auto flex-shrink-0">
                                        {/* Notes Preview Widget */}
                                        <div className="flex flex-col items-start border border-slate-200/80 bg-slate-50/50 rounded-xl p-3 w-[200px] xl:w-[220px] shadow-sm transition-colors hover:border-blue-200 hover:bg-slate-50">
                                            <div className="flex items-center justify-between w-full mb-1.5 gap-2">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">History</span>
                                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0 text-[10px] font-bold tracking-wider px-2 py-0 h-4">
                                                    {source.metrics.totalNotes} {source.metrics.totalNotes === 1 ? 'Note' : 'Notes'}
                                                </Badge>
                                            </div>
                                            {source.metrics.totalNotes > 0 ? (
                                                <div className="text-xs text-slate-600 line-clamp-2 leading-snug break-words relative pl-3 border-l-2 border-blue-200" title={source.metrics.latestNote || source.notes || ''}>
                                                    <span className="italic">"{source.metrics.latestNote || source.notes || 'Activity recorded'}"</span>
                                                </div>
                                            ) : (
                                                <div className="text-[11px] text-slate-400 italic">No notes recorded yet.</div>
                                            )}
                                        </div>

                                        {/* Conversion Stat */}
                                        <div className="flex flex-col items-start xl:items-center border-l xl:border-l-0 border-slate-100 pl-4 sm:pl-6 xl:pl-0">
                                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Conversion</div>
                                            {total > 0 ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Badge variant="outline" className={cn(
                                                        "text-[11px] font-bold tracking-wide border-0 px-2 py-0.5 shadow-sm",
                                                        rate >= 75 ? "bg-emerald-500 text-white" : rate >= 30 ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-700"
                                                    )}>
                                                        {rate}%
                                                    </Badge>
                                                    <span className="text-xs font-medium text-slate-400">({admitted}/{total})</span>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] font-medium text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">No Data</span>
                                            )}
                                        </div>

                                        {/* Velocity Stats */}
                                        <div className="flex gap-4 sm:gap-6 border-l border-slate-100 pl-4 sm:pl-6">
                                            <div className="flex flex-col items-start xl:items-center">
                                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">MTD Referrals</div>
                                                <div className="text-base font-bold text-slate-700">{source.metrics.referralsMtd}</div>
                                            </div>
                                            <div className="flex flex-col items-start xl:items-center hidden sm:flex">
                                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">90 Days</div>
                                                <div className="text-base font-bold text-slate-700">{source.metrics.referralsLast90Days}</div>
                                            </div>
                                        </div>

                                        {/* Dates */}
                                        <div className="flex flex-col items-end border-l border-slate-100 pl-4 sm:pl-6 hidden md:flex">
                                            <div className="text-[12.5px] font-medium text-slate-600">
                                                <span className="text-slate-400 mr-2">Last Contact:</span>
                                                <span className="font-semibold">{source.metrics.lastContactDate ? formatDate(source.metrics.lastContactDate, 'MMM d, yyyy') : 'Never'}</span>
                                            </div>
                                            <div className="text-[12.5px] font-medium text-slate-600 mt-1">
                                                <span className="text-slate-400 mr-2">Last Referral:</span>
                                                <span className="font-semibold">{source.metrics.lastReferralDate ? formatDate(source.metrics.lastReferralDate, 'MMM d, yyyy') : 'Never'}</span>
                                            </div>
                                        </div>

                                        <div className="shrink-0 flex items-center justify-center p-2.5 bg-slate-50 rounded-full border border-slate-200 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors ml-auto xl:ml-0">
                                            {isExpanded ? <ChevronUp className="h-5 w-5 text-blue-600" /> : <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Panel */}
                                {
                                    isExpanded && (
                                        <div className="bg-slate-50/80 border-t border-blue-100 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-blue-50/30 opacity-50 z-0 pointer-events-none" />
                                            <div className="p-4 sm:p-6 md:p-8 relative z-10 animate-in slide-in-from-top-4 fade-in duration-300">

                                                {source.notes && (
                                                    <div className="mb-6 sm:mb-8 space-y-2 max-w-5xl">
                                                        <h4 className="text-[11px] sm:text-[13px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-between">
                                                            General Source Notes
                                                            <Button size="sm" variant="ghost" className="h-8 -mr-3 text-blue-600 hover:text-blue-700 hover:bg-white" onClick={(e) => handleEditSource(e, source)}>
                                                                <Edit2 className="mr-2 h-3.5 w-3.5" /> <span className="hidden sm:inline">Edit General</span>
                                                            </Button>
                                                        </h4>
                                                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/60 text-sm whitespace-pre-wrap text-slate-700 shadow-sm leading-relaxed">
                                                            {source.notes}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="max-w-5xl">
                                                    {(() => {
                                                        const sourceContacts = expandedData[source.id] || [];
                                                        const activeContacts = sourceContacts.filter(c => c && c.id && !c.isArchived);
                                                        const archivedContacts = sourceContacts.filter(c => c && c.id && c.isArchived);

                                                        const ContactCard = ({ contact, index }: { contact: ReferralSourceContact, index: number }) => (
                                                            <div className="relative group animate-in slide-in-from-bottom-2 fade-in duration-500 fill-mode-both" style={{ animationDelay: `${index * 50}ms` }}>
                                                                <div className="absolute -left-[14px] sm:-left-[26px] top-4 h-4 w-4 bg-white border-[3.5px] border-blue-500 rounded-full group-hover:scale-125 group-hover:border-blue-400 group-hover:bg-blue-50 transition-all duration-300 shadow-[0_0_0_4px_rgba(59,130,246,0.1)] z-10" />

                                                                <div className={`bg-white border ${contact.isArchived ? 'border-slate-200/50 bg-slate-50/50 grayscale-[0.3]' : 'border-slate-200/80'} shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-blue-200 relative overflow-hidden`}>

                                                                    <div className="absolute -left-10 -top-10 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />

                                                                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                                                                        <div className="flex flex-col gap-1">
                                                                            <div className="flex items-center gap-2.5">
                                                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600">
                                                                                    <Calendar className="h-4 w-4" />
                                                                                </div>
                                                                                <span className="font-bold text-[13.5px] sm:text-[15px] text-slate-800 tracking-tight">
                                                                                    {contact.contactDate ? formatDate(contact.contactDate, 'MMMM d, yyyy - hh:mm a') : 'Unknown Date'}
                                                                                </span>
                                                                            </div>
                                                                            {contact.contactPerson && (
                                                                                <div className="flex items-center gap-1.5 pl-[42px] text-[12px] text-slate-500 font-medium mt-0.5">
                                                                                    <User className="h-3.5 w-3.5 text-slate-400" />
                                                                                    Contact Person: <span className="font-bold text-slate-700">{contact.contactPerson}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-wrap items-center gap-2 pl-10 sm:pl-0">
                                                                            {contact.reminderDate && (
                                                                                <Badge variant="outline" className="text-[10px] font-bold tracking-wider border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors px-2 py-0.5 shadow-sm">
                                                                                    <Bell className="h-3 w-3 mr-1.5 inline" /> Reminder: {formatDate(contact.reminderDate, 'MMM d, h:mm a')}
                                                                                </Badge>
                                                                            )}
                                                                            <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-widest rounded-md bg-indigo-50 text-indigo-700 px-2 py-0.5 shadow-sm border border-indigo-100">
                                                                                {contact.contactType ? contact.contactType.replace('_', ' ') : 'Note'}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>

                                                                    <div className="relative z-10 text-[14.5px] bg-slate-50/80 rounded-xl p-4 text-slate-700 border border-slate-100/80 leading-relaxed font-medium">
                                                                        <span className="whitespace-pre-wrap block">
                                                                            {contact.summary || 'Legacy empty entry.'}
                                                                        </span>
                                                                        {contact.reminderEmail && (
                                                                            <div className="mt-3 text-xs text-amber-600 font-semibold bg-amber-50 p-2 rounded-md border border-amber-100 inline-block">
                                                                                Remind To: {contact.reminderEmail}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="relative z-10 mt-4 flex items-center justify-between text-[11px] sm:text-xs">
                                                                        <div className="flex items-center gap-2 text-slate-500 font-semibold tracking-wide uppercase">
                                                                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                                                                <User className="h-3.5 w-3.5 opacity-60 text-slate-600" />
                                                                            </div>
                                                                            Logged by: {contact.createdByName || 'Staff Member'}
                                                                        </div>

                                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <Button size="sm" variant="ghost" className="h-7 text-xs font-bold px-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50" onClick={(e) => handleEditContact(e, source.id, contact)}>
                                                                                <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                                                                            </Button>
                                                                            <Button size="sm" variant="ghost" className="h-7 text-xs font-bold px-2 text-slate-600 hover:text-red-600 hover:bg-red-50" onClick={(e) => handleArchiveContact(e, contact.id, !contact.isArchived, source.id)}>
                                                                                {contact.isArchived ? <><ArchiveRestore className="h-3.5 w-3.5 mr-1" /> Restore</> : <><Archive className="h-3.5 w-3.5 mr-1" /> Archive</>}
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );

                                                        return (
                                                            <Tabs defaultValue="contacts" className="w-full">
                                                                <TabsList className="mb-6 h-auto flex-wrap sm:flex-nowrap justify-start overflow-x-auto p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                                                                    <TabsTrigger value="contacts" className="rounded-lg text-[13px] font-bold sm:text-sm flex-1 sm:flex-none uppercase tracking-wider px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none">Active Notes ({activeContacts.length})</TabsTrigger>
                                                                    <TabsTrigger value="archived" className="rounded-lg text-[13px] font-bold sm:text-sm flex-1 sm:flex-none uppercase tracking-wider px-6 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-700 data-[state=active]:shadow-none">Archived ({archivedContacts.length})</TabsTrigger>
                                                                    <TabsTrigger value="referrals" className="rounded-lg text-[13px] font-bold sm:text-sm flex-1 sm:flex-none uppercase tracking-wider px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none">Associated Referrals</TabsTrigger>
                                                                </TabsList>

                                                                <TabsContent value="contacts" className="space-y-4">
                                                                    <div className="flex justify-end items-center mb-0">
                                                                        <Button size="sm" variant="default" className="h-9 shadow-md bg-blue-600 hover:bg-blue-700 font-bold rounded-lg px-4" onClick={(e) => handleAddContact(e, source.id)}>
                                                                            <PlusCircle className="mr-2 h-4 w-4" /> Log Contact
                                                                        </Button>
                                                                    </div>

                                                                    <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-300">
                                                                        {!expandedData[source.id] ? (
                                                                            <div className="text-center py-4 text-xs text-muted-foreground animate-pulse">Loading contacts...</div>
                                                                        ) : activeContacts.length === 0 ? (
                                                                            <div className="text-center py-6 text-sm text-muted-foreground italic bg-white border border-slate-100 rounded-xl shadow-sm">
                                                                                No active contact history recorded.
                                                                            </div>
                                                                        ) : (
                                                                            <div className="relative pl-10 sm:pl-12 space-y-6 mt-4">
                                                                                <div className="absolute left-[20px] sm:left-[24px] top-3 bottom-0 w-[2px] bg-gradient-to-b from-blue-300 via-slate-200 to-transparent" />
                                                                                {activeContacts.map((contact, index) => (
                                                                                    <ContactCard key={contact.id} contact={contact} index={index} />
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TabsContent>

                                                                <TabsContent value="archived" className="space-y-4">
                                                                    <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-300">
                                                                        {!expandedData[source.id] ? (
                                                                            <div className="text-center py-4 text-xs text-muted-foreground animate-pulse">Loading contacts...</div>
                                                                        ) : archivedContacts.length === 0 ? (
                                                                            <div className="text-center py-6 text-sm text-muted-foreground italic bg-white border border-slate-100 rounded-xl shadow-sm">
                                                                                No archived notes.
                                                                            </div>
                                                                        ) : (
                                                                            <div className="relative pl-10 sm:pl-12 space-y-6 mt-4 opacity-80">
                                                                                <div className="absolute left-[20px] sm:left-[24px] top-3 bottom-0 w-[2px] bg-gradient-to-b from-slate-300 via-slate-200 to-transparent" />
                                                                                {archivedContacts.map((contact, index) => (
                                                                                    <ContactCard key={contact.id} contact={contact} index={index} />
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TabsContent>

                                                                <TabsContent value="referrals" className="space-y-4">
                                                                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-300">
                                                                        {source.metrics.recentReferrals.length === 0 ? (
                                                                            <div className="text-center py-6 text-sm text-muted-foreground italic bg-white border border-slate-100 rounded-xl shadow-sm">
                                                                                No active referrals associated with this source.
                                                                            </div>
                                                                        ) : (
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                {source.metrics.recentReferrals.map(ref => (
                                                                                    <div key={ref.id} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
                                                                                        <div className="flex justify-between items-start mb-3">
                                                                                            <div className="font-bold text-[15px] text-slate-900 capitalize tracking-tight">{ref.patientName}</div>
                                                                                            <StatusBadge status={ref.status} />
                                                                                        </div>
                                                                                        <div className="text-xs font-semibold text-slate-500 flex items-center gap-2 mb-4 bg-slate-50 w-fit px-2 py-1 rounded-md border border-slate-100">
                                                                                            <Calendar className="h-3 w-3" />
                                                                                            {formatDate(ref.createdAt, 'MMM d, yyyy')}
                                                                                        </div>
                                                                                        <Button variant="outline" size="sm" className="w-full font-bold text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200 transition-colors" onClick={() => router.push(`/dashboard/referrals/${ref.id}`)}>
                                                                                            Open Record <ExternalLink className="ml-2 h-3.5 w-3.5" />
                                                                                        </Button>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TabsContent>
                                                            </Tabs>
                                                        );
                                                    })()}
                                                </div>

                                            </div>
                                        </div>
                                    )
                                }
                            </div>
                        );
                    })
                )}
            </div>

            {
                isSourceModalOpen && (
                    <AddReferralSourceModal
                        isOpen={isSourceModalOpen}
                        onClose={(refresh) => {
                            setIsSourceModalOpen(false);
                            if (refresh) router.refresh();
                        }}
                        source={editSource}
                    />
                )
            }

            {
                isContactModalOpen && contactSourceId && (
                    <AddContactModal
                        isOpen={isContactModalOpen}
                        onClose={(refresh) => {
                            setIsContactModalOpen(false);
                            if (refresh && contactSourceId) {
                                toggleRow(contactSourceId, true);
                                router.refresh();
                            }
                        }}
                        sourceId={contactSourceId!}
                        contact={editContact || undefined}
                    />
                )
            }
        </div >
    );
}
