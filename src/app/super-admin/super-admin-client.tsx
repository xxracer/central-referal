'use client';

import { useState } from 'react';
import { AgencySettings } from '@/lib/types';
import { toggleAgencyStatus, updateAgencySubscription } from './actions';
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    Shield, Power, Calendar, Building2, ExternalLink, Edit2, Loader2, Trash2
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminClient({ initialAgencies }: { initialAgencies: AgencySettings[] }) {
    const [agencies, setAgencies] = useState(initialAgencies);
    const [editingAgency, setEditingAgency] = useState<AgencySettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleToggleStatus = async (agencyId: string, currentStatus: string) => {
        const result = await toggleAgencyStatus(agencyId, currentStatus);
        if (result.success) {
            setAgencies(agencies.map(a =>
                a.id === agencyId
                    ? { ...a, subscription: { ...a.subscription, status: currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED' as any } }
                    : a
            ));
            toast({ title: "Success", description: result.message });
        }
    };

    const handleUpdateSubscription = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingAgency) return;

        setIsSaving(true);
        const formData = new FormData(e.currentTarget);
        const data = {
            plan: formData.get('plan') as string,
            status: formData.get('status') as string,
            endDate: formData.get('endDate') as string,
            slug: formData.get('slug') as string,
        };

        const result = await updateAgencySubscription(editingAgency.id, data);
        setIsSaving(false);

        if (result.success) {
            setAgencies(agencies.map(a =>
                a.id === editingAgency.id
                    ? {
                        ...a,
                        slug: data.slug || a.slug,
                        subscription: {
                            ...a.subscription,
                            plan: data.plan as any,
                            status: data.status as any,
                            endDate: data.endDate ? new Date(data.endDate) : a.subscription.endDate
                        }
                    }
                    : a
            ));
            setEditingAgency(null);
            toast({ title: "Success", description: "Agency subscription and URL updated" });
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    };

    const getPlanLabel = (plan: string) => {
        switch (plan) {
            case 'FREE': return 'Phase 1 (Basic)';
            case 'BASIC': return 'Phase 2 (Standard)';
            case 'PRO': return 'Phase 3 (Premium)';
            default: return plan;
        }
    };

    return (
        <div className="min-h-screen bg-muted/20 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-headline font-bold flex items-center gap-3">
                            <Shield className="w-10 h-10 text-primary" />
                            Super Admin Portal
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Global control center. Managed directly from Central.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 bg-background p-4 rounded-2xl border shadow-sm">
                        <div className="text-right">
                            <p className="text-xs font-bold text-muted-foreground uppercase">Total Agencies</p>
                            <p className="text-2xl font-bold">{agencies.length}</p>
                        </div>
                        <Building2 className="w-8 h-8 text-primary/40" />
                    </div>
                </header>

                <Card className="shadow-xl border-primary/5">
                    <CardHeader>
                        <CardTitle className="text-xl">Agency Directory</CardTitle>
                        <CardDescription>Real-time connection to all agency databases.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Agency / Subdomain</TableHead>
                                    <TableHead>Current Phase</TableHead>
                                    <TableHead>Account Status</TableHead>
                                    <TableHead>Renewal Date</TableHead>
                                    <TableHead className="text-right">Management</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {agencies.map((agency) => {
                                    const sub = agency.subscription || { plan: 'FREE', status: 'ACTIVE' };
                                    const isSuspended = sub.status === 'SUSPENDED';

                                    // Robust URL construction
                                    const getAgencyUrl = (id: string) => {
                                        // If the ID already looks like a URL/Host (contains dot or colon), use it as is
                                        if (id.includes('.') || id.includes(':')) {
                                            return `http://${id}`;
                                        }
                                        // Otherwise, assume it's a subdomain
                                        return `http://${id}.localhost:3000`; // Change to production domain in build
                                    };

                                    return (
                                        <TableRow key={agency.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground">{agency.companyProfile?.name || 'Unnamed Agency'}</span>
                                                    <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                                        {agency.slug || agency.id}
                                                        <span className="text-[10px] bg-muted px-1 rounded uppercase tracking-tighter">
                                                            {(agency.slug || agency.id).includes('.') ? 'Live' : 'Sub'}
                                                        </span>
                                                        {agency.slug && agency.slug !== agency.id && (
                                                            <span title={`Original ID: ${agency.id}`} className="text-[9px] opacity-50 cursor-help ml-1">
                                                                (ID: {agency.id})
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-bold">
                                                    {getPlanLabel(sub.plan)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={isSuspended ? "destructive" : "default"}
                                                    className={!isSuspended ? "bg-green-500 hover:bg-green-600" : ""}
                                                >
                                                    {sub.status === 'ACTIVE' ? '🟢 Active' : sub.status === 'SUSPENDED' ? '🔴 Suspended' : sub.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {sub.endDate ? formatDate(sub.endDate, "PP") : 'Not set'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <a href={getAgencyUrl(agency.slug || agency.id)} target="_blank" rel="noopener noreferrer">
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => setEditingAgency(agency)}
                                                    >
                                                        <Edit2 className="w-4 h-4 text-primary" />
                                                    </Button>
                                                    <Button
                                                        variant={isSuspended ? "default" : "outline"}
                                                        size="sm"
                                                        className={isSuspended ? "h-8 bg-green-600 hover:bg-green-700" : "h-8 text-secondary-foreground hover:bg-secondary/80 border-secondary/20"}
                                                        onClick={() => handleToggleStatus(agency.id, sub.status)}
                                                    >
                                                        <Power className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-destructive hover:bg-red-100 hover:text-red-700"
                                                        onClick={async () => {
                                                            if (confirm(`Are you sure you want to PERMANENTLY DELETE ${agency.companyProfile?.name}? This cannot be undone.`)) {
                                                                const { deleteAgency } = await import('./actions');
                                                                const result = await deleteAgency(agency.id);
                                                                if (result.success) {
                                                                    setAgencies(prev => prev.filter(a => a.id !== agency.id));
                                                                    toast({ title: "Deleted", description: "Agency removed successfully." });
                                                                } else {
                                                                    toast({ title: "Error", description: result.message, variant: "destructive" });
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Edit Modal */}
                <Dialog open={!!editingAgency} onOpenChange={() => setEditingAgency(null)}>
                    <DialogContent className="sm:max-w-[425px]">
                        <form onSubmit={handleUpdateSubscription}>
                            <DialogHeader>
                                <DialogTitle>Edit Agency Subscription</DialogTitle>
                                <DialogDescription>
                                    Updating {editingAgency?.companyProfile?.name}. This change takes effect immediately across the platform.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="plan" className="text-right text-xs">Phase</Label>
                                    <div className="col-span-3">
                                        <Select name="plan" defaultValue={editingAgency?.subscription?.plan || 'FREE'}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Phase" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="FREE">Phase 1 (Basic)</SelectItem>
                                                <SelectItem value="BASIC">Phase 2 (Standard)</SelectItem>
                                                <SelectItem value="PRO">Phase 3 (Premium)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="status" className="text-right text-xs">Status</Label>
                                    <div className="col-span-3">
                                        <Select name="status" defaultValue={editingAgency?.subscription?.status || 'ACTIVE'}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ACTIVE">Active</SelectItem>
                                                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                                                <SelectItem value="PAST_DUE">Past Due</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="endDate" className="text-right text-xs text-nowrap">Renewal Date</Label>
                                    <Input
                                        id="endDate"
                                        name="endDate"
                                        type="date"
                                        className="col-span-3"
                                        defaultValue={editingAgency?.subscription?.endDate ? new Date(editingAgency.subscription.endDate).toISOString().split('T')[0] : ''}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <footer className="text-center text-muted-foreground text-sm pt-4">
                    &copy; {new Date().getFullYear()} ReferralFlow Super Admin &bull; Multi-Tenant Core v2.1
                </footer>
            </div>
        </div>
    );
}
