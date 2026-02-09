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

    // Validation: Primary Admin Email is the only strict requirement now
    const hasPrimaryEmail = !!(settings.notifications.primaryAdminEmail || settings.companyProfile.email);
    const isSetupComplete = hasPrimaryEmail;

    return (
        <div className="container mx-auto max-w-5xl py-6 px-4 md:px-6 space-y-8">
            {!isSetupComplete && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <div>
                        <p className="font-semibold">Setup Incomplete</p>
                        <p className="text-sm">You must ensure a <strong>Primary Email</strong> is set before you can save other changes or use the portal.</p>
                    </div>
                </div>
            )}
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
                                // Profile is ENABLED if we are missing the primary email (so user can set it)
                                // Only disabled if we HAVE email but NO staff (forcing staff add)
                                isDisabled={false}
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
                                isDisabled={!isSetupComplete}
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
                                isDisabled={!isSetupComplete}
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
    onSave,
    isDisabled
}: {
    settings: AgencySettings,
    setSettings: React.Dispatch<React.SetStateAction<AgencySettings>>,
    agencyId: string,
    isPending: boolean,
    onSave: (payload: any) => Promise<void>,
    isDisabled?: boolean
}) => {
    const [formData, setFormData] = useState(settings.companyProfile);
    const [logoUploading, setLogoUploading] = useState(false);
    const [otherHomeName, setOtherHomeName] = useState(settings.configuration.otherInsuranceName || '');

    useEffect(() => {
        setFormData(settings.companyProfile);
        setOtherHomeName(settings.configuration.otherInsuranceName || '');
    }, [settings.companyProfile, settings.configuration]);

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


    const [newCustomIns, setNewCustomIns] = useState('');

    const addCustomIns = () => {
        if (!newCustomIns) return;
        const current = formData.homeInsurances || [];
        if (!current.includes(newCustomIns)) {
            setFormData(prev => ({ ...prev, homeInsurances: [...current, newCustomIns] }));
        }
        setNewCustomIns('');
    };

    const removeCustomIns = (ins: string) => {
        setFormData(prev => ({
            ...prev,
            homeInsurances: (prev.homeInsurances || []).filter(i => i !== ins)
        }));
    };

    const customInsurances = (formData.homeInsurances || []).filter(i => !MASTER_INSURANCE_LIST.includes(i) && i !== 'Other');

    // Auto-migrate "Other" on first visual load if legacy exists
    useEffect(() => {
        if ((formData.homeInsurances || []).includes('Other') && otherHomeName) {
            // Check if we already migrated it (to avoid loop)
            if (!(formData.homeInsurances || []).includes(otherHomeName)) {
                // We won't auto-migrate state here to avoid flicker/loops, 
                // but we can encourage user to add it.
                // Actually, let's just show the new UI.
            }
        }
    }, []);

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
                    {MASTER_INSURANCE_LIST.filter(ins => ins !== 'Other').map(ins => (
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

                <div className="mt-4 space-y-3">
                    <Label>Additional Insurances</Label>
                    <div className="flex gap-2">
                        <Input
                            value={newCustomIns}
                            onChange={e => setNewCustomIns(e.target.value)}
                            placeholder="Add custom insurance (e.g., Local Plan A)"
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomIns())}
                        />
                        <Button onClick={addCustomIns} type="button" variant="secondary">Add</Button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                        {customInsurances.map(ins => (
                            <Badge key={ins} variant="outline" className="gap-2 pl-2 pr-1 py-1 text-sm font-normal">
                                {ins}
                                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeCustomIns(ins)} />
                            </Badge>
                        ))}
                    </div>
                    {/* Legacy / Migration Notice if needed */}
                    {(formData.homeInsurances || []).includes('Other') && otherHomeName && !customInsurances.includes(otherHomeName) && (
                        <div className="bg-yellow-50 p-2 text-xs text-yellow-800 rounded border border-yellow-100 flex items-center justify-between">
                            <span>You have a legacy "Other" value: <strong>{otherHomeName}</strong></span>
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => {
                                // Migrate
                                setFormData(prev => ({
                                    ...prev,
                                    homeInsurances: [...(prev.homeInsurances || []).filter(i => i !== 'Other'), otherHomeName]
                                }));
                                setOtherHomeName(''); // Clear legacy logic visually
                            }}>Convert to new format</Button>
                        </div>
                    )}
                </div>
            </div>

            <Button
                onClick={() => onSave({
                    companyProfile: formData,
                    slug: settings.slug || agencyId,
                    configuration: { ...settings.configuration } // We stop syncing otherInsuranceName strictly for Profile, strictly rely on array
                })}
                disabled={isPending || logoUploading || isDisabled}
                className="w-full md:w-auto"
            >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Profile & Portal Address
            </Button>
        </div >
    );
};

const ConfigurationForm = ({ settings, isPending, onSave, isDisabled }: { settings: AgencySettings, isPending: boolean, onSave: (data: any) => void, isDisabled?: boolean }) => {
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


    const [newCustomFormIns, setNewCustomFormIns] = useState('');

    const addCustomFormIns = () => {
        if (!newCustomFormIns) return;
        const current = config.acceptedInsurances || [];
        if (!current.includes(newCustomFormIns)) {
            setConfig(prev => ({ ...prev, acceptedInsurances: [...current, newCustomFormIns] }));
        }
        setNewCustomFormIns('');
    };

    const removeCustomFormIns = (ins: string) => {
        setConfig(prev => ({
            ...prev,
            acceptedInsurances: (prev.acceptedInsurances || []).filter(i => i !== ins)
        }));
    };

    const customInsurances = (config.acceptedInsurances || []).filter(i => !MASTER_INSURANCE_LIST.includes(i) && i !== 'Other');

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Accepted Insurances (Referral Form)</h3>
                <CardDescription>Select the insurances available in the "Primary Insurance" dropdown of the referral form.</CardDescription>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-md bg-muted/10">
                    {MASTER_INSURANCE_LIST.filter(ins => ins !== 'Other').map(ins => (
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

                <div className="mt-4 space-y-3">
                    <Label>Additional Insurances (Dropdown)</Label>
                    <div className="flex gap-2">
                        <Input
                            value={newCustomFormIns}
                            onChange={e => setNewCustomFormIns(e.target.value)}
                            placeholder="Add custom insurance (e.g., Local Plan A)"
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomFormIns())}
                        />
                        <Button onClick={addCustomFormIns} type="button" variant="secondary">Add</Button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                        {customInsurances.map(ins => (
                            <Badge key={ins} variant="outline" className="gap-2 pl-2 pr-1 py-1 text-sm font-normal">
                                {ins}
                                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeCustomFormIns(ins)} />
                            </Badge>
                        ))}
                    </div>

                    {/* Legacy / Migration Notice if needed */}
                    {(config.acceptedInsurances || []).includes('Other') && otherName && !customInsurances.includes(otherName) && (
                        <div className="bg-yellow-50 p-2 text-xs text-yellow-800 rounded border border-yellow-100 flex items-center justify-between">
                            <span>You have a legacy "Other" value: <strong>{otherName}</strong></span>
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => {
                                // Migrate
                                setConfig(prev => ({
                                    ...prev,
                                    acceptedInsurances: [...(prev.acceptedInsurances || []).filter(i => i !== 'Other'), otherName]
                                }));
                                setOtherName(''); // Clear legacy logic visually
                            }}>Convert to new format</Button>
                        </div>
                    )}
                </div>
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

            <Button onClick={() => onSave({ ...config })} disabled={isPending || isDisabled}>Save Configuration</Button>
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

const NotificationsForm = ({ settings, isPending, onSave, isDisabled }: { settings: AgencySettings, isPending: boolean, onSave: (data: any) => void, isDisabled?: boolean }) => {
    // Local state for immediate UI feedback before saving to database
    // "notifs" tracks the database state (via props usually, but we sync on effect)

    // We need to sync with parent settings
    const [notifs, setNotifs] = useState(settings.notifications);

    useEffect(() => {
        setNotifs(settings.notifications);
    }, [settings.notifications]);

    // Derived state for Primary Admin (fallback to profiled email if not explicit)
    const primaryAdminEmail = notifs.primaryAdminEmail || settings.companyProfile.email;

    // --- Actions (Preferences Only) ---

    // Note: Staff Addition/Removal moved to Access Tab per user request.

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
                <p className="text-sm text-muted-foreground">Configure which alerts each team member receives.</p>
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
                    onRemove={() => { }} // No op
                    hideRemove={true}
                    isLocked={false}
                />
            </div>

            {/* SECTION 2 — STAFF NOTIFICATIONS */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Staff Alerts</h3>
                    <p className="text-sm text-muted-foreground">Manage staff access in the <span className="font-semibold text-primary">Access</span> tab.</p>
                </div>

                <div className="space-y-6">
                    {(notifs.staff || []).length === 0 && (
                        <p className="text-sm text-muted-foreground italic text-center py-8 border-2 border-dashed rounded-lg">
                            No additional staff members found. Add them in the Access tab.
                        </p>
                    )}
                    {(notifs.staff || []).map(member => (
                        <StaffCard
                            key={member.email}
                            member={member}
                            onUpdate={handleUpdateStaff}
                            onRemove={() => { }} // Hidden or no-op here implies managed elsewhere
                            hideRemove={true} // Hide remove button here, strict separation
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
    const [isAddingStaff, setIsAddingStaff] = useState(false);

    useEffect(() => {
        setAccess(settings.userAccess);
    }, [settings.userAccess]);

    const handleAddStaff = async (newStaff: { email: string; enabledCategories: string[]; tempPassword?: string }) => {
        try {
            const currentStaff = settings.notifications.staff || [];
            if (currentStaff.some(s => s.email === newStaff.email)) {
                alert('Staff member already exists.');
                return;
            }

            const { provisionStaffUser } = await import('@/lib/actions');
            const result = await provisionStaffUser(settings.id, newStaff.email, newStaff.tempPassword, newStaff.email.split('@')[0]);

            if (!result.success) {
                alert('Error: ' + result.message);
                return;
            }

            alert('Staff member added successfully.');
            setIsAddingStaff(false);
            window.location.reload();
        } catch (e: any) {
            alert('Failed: ' + e.message);
        }
    };

    const removeStaff = async (email: string) => {
        if (!confirm('Remove this user and their access?')) return;
        const currentStaff = settings.notifications.staff || [];
        const updatedStaff = currentStaff.filter(s => s.email !== email);

        try {
            const { updateAgencySettingsAction } = await import('@/lib/actions');
            await updateAgencySettingsAction(settings.id, {
                notifications: {
                    ...settings.notifications,
                    staff: updatedStaff
                }
            });
            window.location.reload();
        } catch (e) {
            alert("Error removing staff");
        }
    };

    const addDomain = () => {
        if (!newDomain) return;
        const lowerDomain = newDomain.toLowerCase();
        const bannedDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'protonmail.com']; // Sync with server list recommended

        if (bannedDomains.includes(lowerDomain)) {
            alert('Security Restriction: Public email providers are not allowed as authorized domains.');
            return;
        }

        if (access.authorizedDomains.includes(lowerDomain)) {
            alert('Domain already added.');
            return;
        }

        setAccess(prev => ({ ...prev, authorizedDomains: [...prev.authorizedDomains, lowerDomain] }));
        setNewDomain('');
    };

    const removeDomain = (d: string) => {
        setAccess(prev => ({ ...prev, authorizedDomains: prev.authorizedDomains.filter(x => x !== d) }));
    };

    // Derived Owner Info
    const ownerEmail = settings.companyProfile.email || 'No Owner Filter';
    const ownerName = settings.companyProfile.name || 'Agency Owner';

    return (
        <div className="space-y-10">
            {/* 1. HIERARCHY: MAIN USER / OWNER */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                    <Key className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Main User (Owner)</h3>
                </div>

                <UserManagementRow
                    agencyId={settings.id}
                    email={ownerEmail}
                    name={ownerName}
                    roleLabel="Owner"
                    roleColor="default" // primary
                    canRemove={false}
                />
            </div>

            {/* 2. HIERARCHY: STAFF MEMBERS */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-medium">Staff Members</h3>
                    </div>
                    <Button onClick={() => setIsAddingStaff(true)} disabled={isAddingStaff} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" /> Add Staff
                    </Button>
                </div>

                {isAddingStaff && (
                    <AddStaffForm
                        onCancel={() => setIsAddingStaff(false)}
                        onAdd={handleAddStaff}
                    />
                )}

                <div className="space-y-4">
                    {(!settings.notifications.staff || settings.notifications.staff.length === 0) && !isAddingStaff && (
                        <p className="text-sm text-muted-foreground italic">No additional staff members found.</p>
                    )}

                    {(settings.notifications.staff || []).map(member => (
                        <UserManagementRow
                            key={member.email}
                            agencyId={settings.id}
                            email={member.email}
                            name={member.name || 'Staff Member'}
                            roleLabel="Staff"
                            roleColor="secondary"
                            canRemove={true}
                            onRemove={() => removeStaff(member.email)}
                        />
                    ))}
                </div>
            </div>

            {/* 3. CONFIG: DOMAINS (At bottom) */}
            <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-medium border-b pb-2">Authorized Domains</h3>
                <CardDescription>
                    Allow anyone with an email from these domains to sign up/login automatically.
                </CardDescription>

                {access.authorizedDomains.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {access.authorizedDomains.map(d => (
                            <Badge key={d} variant="outline" className="gap-2 pl-2 pr-1 py-1">
                                @{d}
                                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeDomain(d)} />
                            </Badge>
                        ))}
                    </div>
                )}

                <div className="flex gap-2 max-w-sm">
                    <Input
                        value={newDomain}
                        onChange={e => setNewDomain(e.target.value)}
                        placeholder="example.com"
                        onKeyDown={e => e.key === 'Enter' && addDomain()}
                    />
                    <Button onClick={addDomain} type="button" variant="secondary">Add</Button>
                </div>

                <div className="pt-2">
                    <Button onClick={() => onSave(access)} disabled={isPending}>Save Domain Settings</Button>
                </div>
            </div>

        </div >
    );
};

// --- Sub-component for User Rows ---

function UserManagementRow({ agencyId, email, name, roleLabel, roleColor, canRemove, onRemove }: {
    agencyId: string, email: string, name: string, roleLabel: string, roleColor: 'default' | 'secondary' | 'outline', canRemove: boolean, onRemove?: () => void
}) {
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [newPass, setNewPass] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdatePassword = async () => {
        if (!newPass) return;
        setLoading(true);
        try {
            const { adminUpdateUserPassword } = await import('@/lib/actions');
            const result = await adminUpdateUserPassword(agencyId, email, newPass);
            if (result.success) {
                alert('Password updated successfully');
                setNewPass('');
                setIsPasswordOpen(false);
            } else {
                alert('Error: ' + result.message);
            }
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border rounded-lg p-4 bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg ${roleLabel === 'Owner' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {email[0]?.toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm md:text-base">{name}</h4>
                            <Badge variant={roleColor as any} className="text-[10px] h-5">{roleLabel}</Badge>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground">{email}</p>
                    </div>
                </div>
                {canRemove && onRemove && (
                    <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:bg-destructive/10">
                        Remove
                    </Button>
                )}
            </div>

            {/* Password Toggle */}
            <div className="text-sm">
                <button
                    onClick={() => setIsPasswordOpen(!isPasswordOpen)}
                    className="text-primary hover:underline flex items-center gap-1 font-medium"
                >
                    <Key className="h-3 w-3" />
                    {isPasswordOpen ? 'Cancel Password Change' : 'Change Password'}
                </button>

                {isPasswordOpen && (
                    <div className="mt-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                        <Input
                            type="text"
                            placeholder="Set new password..."
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            className="max-w-xs"
                        />
                        <Button size="sm" onClick={handleUpdatePassword} disabled={loading || newPass.length < 6}>
                            {loading && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                            Update
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

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





