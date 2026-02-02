'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useState, useTransition, useEffect } from "react";
import { type AgencySettings } from "@/lib/types";
import { updateAgencySettingsAction, uploadAgencyLogoAction } from "@/lib/actions";
import { updateUserPassword } from "@/firebase/auth/client";
import { Plus, X, Save, AlertCircle, Upload, Loader2, Key } from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

const MASTER_INSURANCE_LIST = [
    "Medicare", "Aetna Medicare", "BCBS Medicare", "Community Health Choice",
    "Integranet", "Molina Medicare", "UHC Medicare", "United Health Care Choice",
    "United Health Care MMP", "United Medicare Advantage", "Wellcare Medical",
    "Wellcare Texan Plus", "Wellmed-Wellpoint Medicaid", "Wellpoint Medicare",
    "Wellpoint MMP", "Other"
];

import { useSearchParams } from "next/navigation";

export default function SettingsClient({ initialSettings, agencyId }: { initialSettings: AgencySettings; agencyId: string }) {
    const [settings, setSettings] = useState<AgencySettings>(initialSettings);
    const [isPending, startTransition] = useTransition();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'profile';

    const handleSave = async (section: keyof AgencySettings, data: any) => {
        startTransition(async () => {
            const result = await updateAgencySettingsAction(agencyId, { [section]: data });
            if (result.success) {
                setSettings(prev => ({ ...prev, [section]: data }));
                alert('Changes saved successfully');
            } else {
                alert('Error saving changes: ' + result.message);
            }
        });
    };

    const handleSaveProfileAndSlug = async (payload: { companyProfile: any, slug: string }) => {
        startTransition(async () => {
            const result = await updateAgencySettingsAction(agencyId, payload);
            if (result.success) {
                setSettings(prev => ({ ...prev, ...payload }));
                if (payload.slug && payload.slug !== initialSettings.slug) {
                    // Only show popup if slug was updated/set
                    setShowActivationDialog(true);
                } else {
                    alert('Profile updated successfully');
                }
            } else {
                alert('Error: ' + result.message);
            }
        });
    };

    const [showActivationDialog, setShowActivationDialog] = useState(false);

    return (
        <div className="container mx-auto max-w-5xl py-6 px-4 md:px-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-headline font-bold">Admin Settings</h1>
                    <p className="text-muted-foreground">Manage your agency profile, preferences, and subscription.</p>
                </div>
                {isPending && <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" />}
            </div>

            <Tabs defaultValue="profile" value={activeTab} className="w-full">
                <TabsList className="grid w-full h-auto grid-cols-2 md:grid-cols-5 bg-muted">
                    <TabsTrigger value="profile" onClick={() => window.history.pushState(null, '', '?tab=profile')}>Profile</TabsTrigger>
                    <TabsTrigger value="config" onClick={() => window.history.pushState(null, '', '?tab=config')}>Config</TabsTrigger>
                    <TabsTrigger value="notifications" onClick={() => window.history.pushState(null, '', '?tab=notifications')}>Alerts</TabsTrigger>
                    <TabsTrigger value="access" onClick={() => window.history.pushState(null, '', '?tab=access')}>Access</TabsTrigger>
                    <TabsTrigger value="subscription" onClick={() => window.history.pushState(null, '', '?tab=subscription')}>Plan</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Profile</CardTitle>
                            <CardDescription>Update your public agency information.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ProfileForm
                                settings={settings}
                                setSettings={setSettings}
                                agencyId={agencyId}
                                isPending={isPending}
                                onSave={handleSaveProfileAndSlug}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="config" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Referral Form Configuration</CardTitle>
                            <CardDescription>Manage insurances and services for the submission form.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ConfigurationForm
                                settings={settings}
                                isPending={isPending}
                                onSave={(data) => handleSave('configuration', data)}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notifications</CardTitle>
                            <CardDescription>Control who receives referral alerts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <NotificationsForm
                                settings={settings}
                                isPending={isPending}
                                onSave={(data) => handleSave('notifications', data)}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="access" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Access</CardTitle>
                            <CardDescription>Manage authorized domains and users.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserAccessForm
                                settings={settings}
                                isPending={isPending}
                                onSave={(data) => handleSave('userAccess', data)}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="subscription" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Subscription & Billing</CardTitle>
                            <CardDescription>Manage your plan and payment method.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SubscriptionForm settings={settings} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Setup Complete!</DialogTitle>
                        <DialogDescription>
                            Your custom domain configuration has been saved.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <div className="flex items-start gap-3 bg-green-50 p-3 rounded-lg border border-green-100 dark:bg-green-950/20 dark:border-green-900">
                            <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 dark:bg-green-900 dark:text-green-300">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-green-800 dark:text-green-300">Activation in Progress</p>
                                <p className="text-xs text-green-700 dark:text-green-400">
                                    Your site <strong>{settings.slug}.referralflow.health</strong> will be active in approximately 40 minutes.
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            You will receive an email notification once your portal is fully active and ready for use.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowActivationDialog(false)}>Got it</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// -- Sub-components extracted for stability (prevents focus loss on re-render) --

const ProfileForm = ({
    settings,
    setSettings,
    agencyId,
    isPending,
    onSave
}: {
    settings: AgencySettings,
    setSettings: React.Dispatch<React.SetStateAction<AgencySettings>>,
    agencyId: string,
    isPending: boolean,
    onSave: (payload: any) => Promise<void>
}) => {
    const [formData, setFormData] = useState(settings.companyProfile);
    const [logoUploading, setLogoUploading] = useState(false);

    useEffect(() => {
        setFormData(settings.companyProfile);
    }, [settings.companyProfile]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setLogoUploading(true);
            const file = e.target.files[0];
            const fd = new FormData();
            fd.append('logo', file);

            const res = await uploadAgencyLogoAction(agencyId, fd);
            if (res.success && res.url) {
                setFormData(prev => ({ ...prev, logoUrl: res.url }));
            } else {
                alert('Upload failed: ' + (res.message || 'Unknown error'));
            }
            setLogoUploading(false);
        }
    };

    const toggleHomeInsurance = (ins: string) => {
        const current = formData.homeInsurances || [];
        const updated = current.includes(ins)
            ? current.filter(i => i !== ins)
            : [...current, ins];
        setFormData(prev => ({ ...prev, homeInsurances: updated }));
    };

    const formatPhoneNumber = (value: string) => {
        if (!value) return value;
        const phoneNumber = value.replace(/[^\d]/g, '');
        const phoneNumberLength = phoneNumber.length;
        if (phoneNumberLength < 4) return phoneNumber;
        if (phoneNumberLength < 7) {
            return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
        }
        return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'phone' | 'fax') => {
        const formatted = formatPhoneNumber(e.target.value);
        setFormData({ ...formData, [field]: formatted });
    };

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Public Info & Portal Address</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Agency Name</Label>
                        <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 flex-wrap">
                            Portal URL Slug
                            <Badge variant="outline" className="text-[10px] font-normal uppercase tracking-tighter">Subdomain</Badge>
                        </Label>
                        <div className="flex items-center overflow-x-auto max-w-full pb-2">
                            <span className="bg-muted px-3 py-2 rounded-l-md border border-r-0 text-muted-foreground text-sm whitespace-nowrap">https://</span>
                            <Input
                                value={settings.slug || agencyId}
                                className="rounded-none font-mono text-sm min-w-[120px]"
                                onChange={e => {
                                    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                    setSettings(prev => ({ ...prev, slug }));
                                }}
                            />
                            <span className="bg-muted px-3 py-2 rounded-r-md border border-l-0 text-muted-foreground text-sm whitespace-nowrap">.referralflow.health</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Only letters, numbers and hyphens. This defined your public address.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                            value={formData.phone}
                            onChange={e => handlePhoneChange(e, 'phone')}
                            placeholder="XXX-XXX-XXXX"
                            maxLength={12}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Fax</Label>
                        <Input
                            value={formData.fax}
                            onChange={e => handlePhoneChange(e, 'fax')}
                            placeholder="XXX-XXX-XXXX"
                            maxLength={12}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Agency Logo</Label>
                    <div className="flex items-center gap-4">
                        {formData.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={formData.logoUrl} alt="Logo" className="h-16 w-16 object-contain border rounded p-1" />
                        )}
                        <div className="flex items-center gap-2 w-full">
                            <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={logoUploading} />
                            {logoUploading && <Loader2 className="animate-spin h-4 w-4" />}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Home Page Insurances (Display only)</h3>
                <CardDescription>Select which insurances to highlight on the Home Page welcome card.</CardDescription>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-md bg-muted/10">
                    {MASTER_INSURANCE_LIST.map(ins => (
                        <div key={ins} className="flex items-center space-x-2">
                            <Checkbox
                                id={`ins-home-${ins}`}
                                checked={(formData.homeInsurances || []).includes(ins)}
                                onCheckedChange={() => toggleHomeInsurance(ins)}
                            />
                            <Label htmlFor={`ins-home-${ins}`} className="cursor-pointer text-sm font-normal">
                                {ins}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            <Button
                onClick={() => onSave({ companyProfile: formData, slug: settings.slug || agencyId })}
                disabled={isPending || logoUploading}
                className="w-full md:w-auto"
            >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Profile & Portal Address
            </Button>
        </div>
    );
};

const ConfigurationForm = ({ settings, isPending, onSave }: { settings: AgencySettings, isPending: boolean, onSave: (data: any) => void }) => {
    const [config, setConfig] = useState(settings.configuration);
    const [newService, setNewService] = useState('');
    const [otherName, setOtherName] = useState(settings.configuration.otherInsuranceName || '');

    useEffect(() => {
        setConfig(settings.configuration);
        setOtherName(settings.configuration.otherInsuranceName || '');
    }, [settings.configuration]);

    const addService = () => {
        if (newService && !config.offeredServices.includes(newService)) {
            setConfig(prev => ({ ...prev, offeredServices: [...prev.offeredServices, newService] }));
            setNewService('');
        }
    };

    const removeService = (s: string) => {
        setConfig(prev => ({ ...prev, offeredServices: prev.offeredServices.filter(i => i !== s) }));
    };

    const toggleFormInsurance = (ins: string) => {
        const current = config.acceptedInsurances || [];
        const updated = current.includes(ins)
            ? current.filter(i => i !== ins)
            : [...current, ins];
        setConfig(prev => ({ ...prev, acceptedInsurances: updated }));
    };

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Accepted Insurances (Referral Form)</h3>
                <CardDescription>Select the insurances available in the "Primary Insurance" dropdown of the referral form.</CardDescription>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-md bg-muted/10">
                    {MASTER_INSURANCE_LIST.map(ins => (
                        <div key={ins} className="flex items-center space-x-2">
                            <Checkbox
                                id={`ins-form-${ins}`}
                                checked={(config.acceptedInsurances || []).includes(ins)}
                                onCheckedChange={() => toggleFormInsurance(ins)}
                            />
                            <Label htmlFor={`ins-form-${ins}`} className="cursor-pointer text-sm font-normal">
                                {ins}
                            </Label>
                        </div>
                    ))}
                </div>

                {(config.acceptedInsurances || []).includes('Other') && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                        <Label>Custom Name for "Other" Insurance (Optional)</Label>
                        <Input
                            className="mt-2"
                            placeholder="e.g., Local Health Plan"
                            value={otherName}
                            onChange={(e) => setOtherName(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">If set, this will appear in the dropdown menu for referrers.</p>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Offered Services</h3>
                <CardDescription>Add or remove the specific services your agency provides.</CardDescription>
                <div className="flex gap-2">
                    <Input value={newService} onChange={e => setNewService(e.target.value)} placeholder="Add service..." />
                    <Button onClick={addService} type="button" size="icon"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {config.offeredServices.map(s => (
                        <Badge key={s} variant="secondary" className="gap-1 pr-1">
                            {s}
                            <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeService(s)} />
                        </Badge>
                    ))}
                </div>
            </div>

            <Button onClick={() => onSave({ ...config, otherInsuranceName: otherName })} disabled={isPending}>Save Configuration</Button>
        </div >
    );
};

// --- Granular Notification Center Components ---

const NotificationCategoryLabels: Record<string, { label: string; description: string }> = {
    'new_referrals': { label: 'New Referrals Received', description: 'Notified when a new referral is submitted' },
    'status_changes': { label: 'Status Changes', description: 'Accepted, rejected, needs more info, archived' },
    'external_comms': { label: 'External Communications', description: 'Messages sent to referral sources or external parties' },
    'internal_comms': { label: 'Internal Communications', description: 'Internal notes or staff messages on a referral' },
    'billing_comms': { label: 'Billing Communications', description: 'Billing-related updates or requests' },
};

const NotificationsForm = ({ settings, isPending, onSave }: { settings: AgencySettings, isPending: boolean, onSave: (data: any) => void }) => {
    // Local state for immediate UI feedback before saving to database
    // "notifs" tracks the database state (via props usually, but we sync on effect)
    // Actually we should use local state for the form, and onSave propagates up.

    // We need to sync with parent settings
    const [notifs, setNotifs] = useState(settings.notifications);
    const [isAddingStaff, setIsAddingStaff] = useState(false);

    useEffect(() => {
        setNotifs(settings.notifications);
    }, [settings.notifications]);

    // Derived state for Primary Admin (fallback to profiled email if not explicit)
    const primaryAdminEmail = notifs.primaryAdminEmail || settings.companyProfile.email;

    // --- Actions ---

    const handleAddStaff = async (newStaff: { email: string; enabledCategories: string[]; tempPassword?: string }) => {
        const currentStaff = notifs.staff || [];
        // Prevent duplicates
        if (currentStaff.some(s => s.email === newStaff.email)) {
            alert('Staff member already exists.');
            return;
        }

        if (newStaff.tempPassword) {
            try {
                // Dynamically import to avoid server-action-in-client-component issues if not careful, 
                // though direct import of action is fine in client components usually.
                // Using dynamic to be safe and cleaner since it's conditional.
                const { provisionStaffUser } = await import('@/lib/actions');
                const result = await provisionStaffUser(settings.id, newStaff.email, newStaff.tempPassword, newStaff.email.split('@')[0]);

                if (!result.success) {
                    alert('Error provisioning staff: ' + result.message);
                    return;
                }

                // Show success toast?
                // alert('User provisioned with encryption.');
            } catch (e: any) {
                alert('Provisioning failed: ' + e.message);
                return;
            }
        }

        const updatedStaff = [...currentStaff, {
            email: newStaff.email,
            enabledCategories: newStaff.enabledCategories as any[],
            requiresPasswordReset: !!newStaff.tempPassword
        }];

        const updatedNotifs = { ...notifs, staff: updatedStaff };
        setNotifs(updatedNotifs);
        onSave(updatedNotifs);
        setIsAddingStaff(false);
    };

    const handleRemoveStaff = (email: string) => {
        if (!confirm('Are you sure you want to remove this staff member?')) return;
        const updatedStaff = (notifs.staff || []).filter(s => s.email !== email);
        const updatedNotifs = { ...notifs, staff: updatedStaff };
        setNotifs(updatedNotifs);
        onSave(updatedNotifs);
    };

    const handleUpdateStaff = (email: string, newCategories: string[]) => {
        const updatedStaff = (notifs.staff || []).map(s => {
            if (s.email === email) {
                return { ...s, enabledCategories: newCategories as any[] };
            }
            return s;
        });
        const updatedNotifs = { ...notifs, staff: updatedStaff };
        setNotifs(updatedNotifs);
        onSave(updatedNotifs);
    };

    return (
        <div className="space-y-10">
            {/* Header / Intro */}
            <div className="space-y-1">
                <p className="text-sm text-muted-foreground">The primary admin email receives all notifications by default.</p>
                <p className="text-sm text-muted-foreground">You can control which notifications additional staff receive below.</p>
            </div>

            {/* SECTION 1 — PRIMARY ADMIN (Now Editable) */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    Primary Admin
                    <Badge variant="outline" className="text-[10px] h-5">System Owner</Badge>
                </h3>

                <StaffCard
                    member={{
                        email: primaryAdminEmail,
                        name: 'Primary Admin',
                        enabledCategories: notifs.primaryAdminPreferences || ['all_comms']
                    }}
                    onUpdate={(email, cats) => {
                        const updatedNotifs = { ...notifs, primaryAdminPreferences: cats as any[] };
                        setNotifs(updatedNotifs);
                        onSave(updatedNotifs);
                    }}
                    onRemove={() => alert("Cannot remove Primary Admin.")}
                    isLocked={false} // Allow editing!
                    hideRemove={true}
                />
            </div>

            {/* SECTION 2 — STAFF NOTIFICATIONS */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Staff Notifications</h3>
                    <Button onClick={() => setIsAddingStaff(true)} disabled={isAddingStaff}>
                        <Plus className="h-4 w-4 mr-2" /> Add Staff Member
                    </Button>
                </div>

                {isAddingStaff && (
                    <AddStaffForm
                        onCancel={() => setIsAddingStaff(false)}
                        onAdd={handleAddStaff}
                    />
                )}

                <div className="space-y-6">
                    {(notifs.staff || []).length === 0 && !isAddingStaff && (
                        <p className="text-sm text-muted-foreground italic text-center py-8 border-2 border-dashed rounded-lg">
                            No additional staff members configured.
                        </p>
                    )}
                    {(notifs.staff || []).map(member => (
                        <StaffCard
                            key={member.email}
                            member={member}
                            onUpdate={handleUpdateStaff}
                            onRemove={handleRemoveStaff}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Sub-components for Granular UI ---

import { UserCheck, Check, Info } from "lucide-react";

function StaffCard({ member, onUpdate, onRemove, isLocked = false, hideRemove = false }: {
    member: { email: string, name?: string, enabledCategories: string[] },
    onUpdate: (email: string, cats: string[]) => void,
    onRemove: (email: string) => void,
    isLocked?: boolean,
    hideRemove?: boolean
}) {
    const [categories, setCategories] = useState<string[]>(member.enabledCategories || []);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setCategories(member.enabledCategories || []);
        setIsDirty(false);
    }, [member.enabledCategories]);

    const isAllComms = categories.includes('all_comms');

    const toggleCat = (key: string) => {
        let newCats = [...categories];

        if (key === 'all_comms') {
            if (isAllComms) {
                // Unchecking all comms -> Revert to empty or keep individual?
                // Prompt: "Reverts to individual control" (implies manual selection needed or restores prev state?
                // Let's simpler: Uncheck all.
                newCats = [];
            } else {
                // Checking all comms -> Add all keys
                const allKeys = Object.keys(NotificationCategoryLabels).map(k => k);
                // "all_comms" key is 'all_comms'
                newCats = ['all_comms', ...Object.keys(NotificationCategoryLabels)];
            }
        } else {
            // Toggling individual
            if (newCats.includes(key)) {
                newCats = newCats.filter(c => c !== key);
                // If we uncheck a specific one, 'all_comms' must also be unchecked
                newCats = newCats.filter(c => c !== 'all_comms');
            } else {
                newCats.push(key);
                // Check if all needed keys are now present? No need to auto-check 'all_comms' unless explicit user action usually.
            }
        }

        setCategories(newCats);
        setIsDirty(true);
    };

    // Auto-check logic for display: If 'all_comms' is checked, everything appears checked.
    // The prompt says: "When checked: Auto-checks... Locks them visually".
    // So 'categories' state should ideally reflect this.

    const handleSave = () => {
        onUpdate(member.email, categories);
        setIsDirty(false); // Optimistic
    };

    return (
        <div className="border rounded-lg p-6 bg-card shadow-sm space-y-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {(member.email && member.email.length > 0) ? member.email[0].toUpperCase() : '?'}
                    </div>
                    <div>
                        <h4 className="font-semibold">{member.name || 'Staff Member'}</h4>
                        <p className="text-sm text-muted-foreground">{member.email || 'No email set'}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h5 className="text-sm font-medium border-b pb-2">Notification Access</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(NotificationCategoryLabels).map(([key, info]) => {
                        const isChecked = categories.includes(key) || isAllComms;
                        const isLocked = isAllComms; // "Locks them visually"

                        return (
                            <div key={key} className={`flex items-start space-x-3 p-3 rounded-md transition-colors ${isChecked ? 'bg-primary/5' : 'hover:bg-muted/50'} ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                <Checkbox
                                    id={`${member.email}-${key}`}
                                    checked={isChecked}
                                    onCheckedChange={() => !isLocked && toggleCat(key)}
                                    disabled={isLocked}
                                />
                                <div className="space-y-1 leading-none">
                                    <Label
                                        htmlFor={`${member.email}-${key}`}
                                        className={`text-sm font-medium cursor-pointer ${isLocked ? 'cursor-not-allowed' : ''}`}
                                    >
                                        {info.label}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        {info.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    {/* All Communications Toggle */}
                    <div className="flex items-start space-x-3 p-3 rounded-md bg-secondary/10 border border-secondary/20">
                        <Checkbox
                            id={`${member.email}-all_comms`}
                            checked={isAllComms}
                            onCheckedChange={() => toggleCat('all_comms')}
                        />
                        <div className="space-y-1 leading-none">
                            <Label htmlFor={`${member.email}-all_comms`} className="text-sm font-bold cursor-pointer">
                                All Communications
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Overrides and includes all communication types
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 flex items-center gap-3">
                <Button onClick={handleSave} disabled={!isDirty}>
                    {isDirty ? 'Save Changes' : 'Saved'}
                </Button>
                {!hideRemove && (
                    <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onRemove(member.email)}>
                        Remove Staff
                    </Button>
                )}
            </div>
        </div>
    );
}

function AddStaffForm({ onCancel, onAdd }: { onCancel: () => void, onAdd: (data: any) => void }) {
    const [email, setEmail] = useState('');
    const [tempPass, setTempPass] = useState('');
    const [cats, setCats] = useState<string[]>(['new_referrals']);

    const toggleCat = (key: string) => {
        if (key === 'all_comms') {
            if (cats.includes('all_comms')) setCats([]);
            else setCats(['all_comms', ...Object.keys(NotificationCategoryLabels)]);
            return;
        }

        if (cats.includes(key)) {
            setCats(cats.filter(c => c !== key && c !== 'all_comms'));
        } else {
            setCats([...cats, key]);
        }
    };

    const isAll = cats.includes('all_comms');

    return (
        <div className="p-6 border rounded-lg bg-muted/10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <h4 className="font-semibold text-lg">Add Staff Member</h4>

            <div className="space-y-2 max-w-md">
                <Label>Email Address</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@domain.com" />
            </div>

            <div className="space-y-2 max-w-md">
                <Label>Temporary Password (Optional)</Label>
                <Input
                    type="text"
                    value={tempPass}
                    onChange={e => setTempPass(e.target.value)}
                    placeholder="e.g. Temp123! (Leave empty to just add email)"
                />
                <p className="text-[10px] text-muted-foreground">If left empty, a secure password will be generated and emailed to the user.</p>
            </div>

            <div className="space-y-3">
                <Label>Notification Access</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(NotificationCategoryLabels).map(([key, info]) => (
                        <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                                id={`new-${key}`}
                                checked={cats.includes(key) || isAll}
                                onCheckedChange={() => !isAll && toggleCat(key)}
                                disabled={isAll}
                            />
                            <Label htmlFor={`new-${key}`} className={isAll ? 'opacity-50' : ''}>{info.label}</Label>
                        </div>
                    ))}
                    <div className="flex items-center space-x-2 font-semibold">
                        <Checkbox
                            id="new-all"
                            checked={isAll}
                            onCheckedChange={() => toggleCat('all_comms')}
                        />
                        <Label htmlFor="new-all">All Communications</Label>
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <Button onClick={() => onAdd({ email, enabledCategories: cats, tempPassword: tempPass })} disabled={!email || !email.includes('@')}>
                    Provision Staff
                </Button>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            </div>
        </div>
    )
}


const UserAccessForm = ({ settings, isPending, onSave }: { settings: AgencySettings, isPending: boolean, onSave: (data: any) => void }) => {
    const [access, setAccess] = useState(settings.userAccess);
    const [newDomain, setNewDomain] = useState('');

    // Password State
    const [newPass, setNewPass] = useState('');
    const [cPass, setCPass] = useState('');
    const [passLoading, setPassLoading] = useState(false);

    useEffect(() => {
        setAccess(settings.userAccess);
    }, [settings.userAccess]);

    const addDomain = () => {
        if (newDomain && !access.authorizedDomains.includes(newDomain)) {
            setAccess(prev => ({ ...prev, authorizedDomains: [...prev.authorizedDomains, newDomain] }));
            setNewDomain('');
        }
    };

    const removeDomain = (d: string) => {
        setAccess(prev => ({ ...prev, authorizedDomains: prev.authorizedDomains.filter(x => x !== d) }));
    };

    const handleUpdatePassword = async () => {
        if (!newPass || newPass.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }
        if (newPass !== cPass) {
            alert("Passwords do not match.");
            return;
        }

        setPassLoading(true);
        try {
            await updateUserPassword(newPass);

            // Clear requireReset flag if present
            const { getAuth } = await import('firebase/auth');
            const auth = getAuth();
            if (auth.currentUser && auth.currentUser.email) {
                const { markPasswordResetComplete } = await import('@/lib/actions');
                // We need agencyId. Passed via props to SettingsClient -> UserAccessForm
                // UserAccessForm props: settings (has id).
                await markPasswordResetComplete(settings.id, auth.currentUser.email);
            }

            alert("Password updated successfully.");
            setNewPass('');
            setCPass('');
        } catch (error: any) {
            alert("Failed to update password: " + error.message);
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Security (Password Management)
                </h3>
                <CardDescription>
                    If you signed up with Google, you can set a password here to enable email/password login.
                </CardDescription>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                    <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input
                            type="password"
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            placeholder="New password"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Confirm Password</Label>
                        <Input
                            type="password"
                            value={cPass}
                            onChange={(e) => setCPass(e.target.value)}
                            placeholder="Confirm password"
                        />
                    </div>
                </div>
                <Button
                    onClick={handleUpdatePassword}
                    disabled={passLoading || !newPass}
                    variant="secondary"
                    className="w-full md:w-auto"
                >
                    {passLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Set Password
                </Button>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Authorized Domains</h3>
                <div className="bg-yellow-50 p-4 rounded border border-yellow-200 text-yellow-800 text-sm flex gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <p>Only users with emails confirming to these domains will be able to sign up or log in to your agency workspace.</p>
                </div>

                <div className="space-y-2">
                    <Label>Saved Email Domains</Label>
                    <div className="flex gap-2">
                        <Input
                            value={newDomain}
                            onChange={e => setNewDomain(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addDomain();
                                }
                            }}
                            placeholder="example.com"
                        />
                        <Button onClick={addDomain} type="button" size="icon"><Plus className="h-4 w-4" /></Button>
                    </div>
                </div>

                {access.authorizedDomains.length > 0 && (
                    <div className="space-y-3 pt-4">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saved Domains ({access.authorizedDomains.length})</Label>
                        <div className="rounded-lg border bg-card divide-y">
                            {access.authorizedDomains.map(d => (
                                <div key={d} className="flex items-center justify-between p-3 text-sm transition-colors hover:bg-muted/30">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                        <span className="font-medium">@{d}</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => removeDomain(d)}
                                        title="Remove domain"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <Button onClick={() => {
                    let finalAccess = access;
                    // Auto-add pending domain if user forgot to click plus
                    if (newDomain && !access.authorizedDomains.includes(newDomain)) {
                        finalAccess = { ...access, authorizedDomains: [...access.authorizedDomains, newDomain] };
                        setAccess(finalAccess);
                        setNewDomain('');
                    }
                    onSave(finalAccess);
                }} disabled={isPending}>Save Access Settings</Button>
            </div>
        </div>
    );
};

const SubscriptionForm = ({ settings }: { settings: AgencySettings }) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 border p-4 rounded-lg bg-muted/20">
                <div className="flex-1">
                    <h3 className="font-semibold text-lg">Current Plan: {settings.subscription.plan}</h3>
                    <p className="text-muted-foreground">Status: {settings.subscription.status}</p>
                </div>
                <Button variant="outline" disabled>Manage Subscription</Button>
            </div>
            <CardDescription>
                To upgrade your plan or update payment details, please contact support.
            </CardDescription>
        </div>
    );
};


