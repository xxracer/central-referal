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
import { Plus, X, Save, AlertCircle, Upload, Loader2 } from "lucide-react";

const MASTER_INSURANCE_LIST = [
    "Medicare", "Aetna Medicare", "BCBS Medicare", "Community Health Choice",
    "Integranet", "Molina Medicare", "UHC Medicare", "United Health Care Choice",
    "United Health Care MMP", "United Medicare Advantage", "Wellcare Medical",
    "Wellcare Texan Plus", "Wellmed-Wellpoint Medicaid", "Wellpoint Medicare",
    "Wellpoint MMP", "Other"
];

export default function SettingsClient({ initialSettings, agencyId }: { initialSettings: AgencySettings; agencyId: string }) {
    const [settings, setSettings] = useState<AgencySettings>(initialSettings);
    const [isPending, startTransition] = useTransition();

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
                alert('Profile and URL updated successfully');
            } else {
                alert('Error: ' + result.message);
            }
        });
    };

    return (
        <div className="container mx-auto max-w-5xl py-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-headline font-bold">Admin Settings</h1>
                    <p className="text-muted-foreground">Manage your agency profile, preferences, and subscription.</p>
                </div>
                {isPending && <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" />}
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-muted">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="config">Configuration</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="access">Access</TabsTrigger>
                    <TabsTrigger value="subscription">Subscription</TabsTrigger>
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
                        <Label className="flex items-center gap-2">
                            Portal URL Slug
                            <Badge variant="outline" className="text-[10px] font-normal uppercase tracking-tighter">Subdomain</Badge>
                        </Label>
                        <div className="flex items-center">
                            <span className="bg-muted px-3 py-2 rounded-l-md border border-r-0 text-muted-foreground text-sm">https://</span>
                            <Input
                                value={settings.slug || agencyId}
                                className="rounded-none font-mono text-sm"
                                onChange={e => {
                                    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                    setSettings(prev => ({ ...prev, slug }));
                                }}
                            />
                            <span className="bg-muted px-3 py-2 rounded-r-md border border-l-0 text-muted-foreground text-sm">.referralflow.health</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Only letters, numbers and hyphens. This defined your public address.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Fax</Label>
                        <Input value={formData.fax} onChange={e => setFormData({ ...formData, fax: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
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

    useEffect(() => {
        setConfig(settings.configuration);
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

            <Button onClick={() => onSave(config)} disabled={isPending}>Save Configuration</Button>
        </div>
    );
};

const NotificationsForm = ({ settings, isPending, onSave }: { settings: AgencySettings, isPending: boolean, onSave: (data: any) => void }) => {
    const [notifs, setNotifs] = useState(settings.notifications);
    const [newEmail, setNewEmail] = useState('');

    useEffect(() => {
        setNotifs(settings.notifications);
    }, [settings.notifications]);

    const addEmail = () => {
        if (newEmail && !notifs.emailRecipients.includes(newEmail)) {
            setNotifs(prev => ({ ...prev, emailRecipients: [...prev.emailRecipients, newEmail] }));
            setNewEmail('');
        }
    };

    const removeEmail = (email: string) => {
        setNotifs(prev => ({ ...prev, emailRecipients: prev.emailRecipients.filter(e => e !== email) }));
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Email Recipients</Label>
                <p className="text-sm text-muted-foreground">These email addresses will receive alerts for new referrals.</p>
                <div className="flex gap-2">
                    <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="name@domain.com" />
                    <Button onClick={addEmail} type="button" size="icon"><Plus className="h-4 w-4" /></Button>
                </div>
            </div>
            <div className="space-y-2">
                {notifs.emailRecipients.map(email => (
                    <div key={email} className="flex items-center justify-between border p-2 rounded">
                        <span>{email}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeEmail(email)}><X className="h-4 w-4" /></Button>
                    </div>
                ))}
            </div>
            <Button onClick={() => onSave(notifs)} disabled={isPending}>Save Notifications</Button>
        </div>
    );
};

const UserAccessForm = ({ settings, isPending, onSave }: { settings: AgencySettings, isPending: boolean, onSave: (data: any) => void }) => {
    const [access, setAccess] = useState(settings.userAccess);
    const [newDomain, setNewDomain] = useState('');

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

    return (
        <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200 text-yellow-800 text-sm flex gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <p>Only users with emails confirming to these domains will be able to sign up or log in to your agency workspace.</p>
            </div>

            <div className="space-y-2">
                <Label>Authorized Domains</Label>
                <div className="flex gap-2">
                    <Input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="example.com" />
                    <Button onClick={addDomain} type="button" size="icon"><Plus className="h-4 w-4" /></Button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {access.authorizedDomains.map(d => (
                    <Badge key={d} variant="outline" className="gap-1 pr-1">
                        @{d}
                        <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeDomain(d)} />
                    </Badge>
                ))}
            </div>
            <Button onClick={() => onSave(access)} disabled={isPending}>Save Access Settings</Button>
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


