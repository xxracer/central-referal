'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { createReferralSourceAction, updateReferralSourceAction } from '@/lib/referral-sources-actions';
import type { ReferralSource, ReferralSourceStatus, ReferralSourceType } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

declare global {
    interface Window {
        google: any;
    }
}

interface AddReferralSourceModalProps {
    isOpen: boolean;
    onClose: (refresh?: boolean) => void;
    source?: ReferralSource | null; // If provided, we are editing
}

export default function AddReferralSourceModal({ isOpen, onClose, source }: AddReferralSourceModalProps) {
    const isEditing = !!source;
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const addressInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        let autocomplete: any = null;

        const initAutocomplete = () => {
            if (!addressInputRef.current || !window.google || !window.google.maps || !window.google.maps.places) return;

            autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
                fields: ['formatted_address', 'name']
            });

            autocomplete.addListener('place_changed', () => {
                const place = autocomplete?.getPlace();
                if (place && place.formatted_address && addressInputRef.current) {
                    const businessName = place.name;
                    const fullAddress = place.formatted_address;

                    if (businessName && !fullAddress.includes(businessName)) {
                        addressInputRef.current.value = `${businessName}, ${fullAddress}`;
                    } else {
                        addressInputRef.current.value = fullAddress;
                    }
                }
            });
        };

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.warn('Google Maps API key is missing. Autocomplete will not work.');
            return;
        }

        if (window.google && window.google.maps && window.google.maps.places) {
            initAutocomplete();
        } else {
            const scriptId = 'google-maps-places-script';
            let script = document.getElementById(scriptId) as HTMLScriptElement;

            if (!script) {
                script = document.createElement('script');
                script.id = scriptId;
                script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);

                script.onload = initAutocomplete;
            } else {
                script.addEventListener('load', initAutocomplete);
                return () => script.removeEventListener('load', initAutocomplete);
            }
        }
    }, [isOpen]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            let result;
            if (isEditing && source) {
                result = await updateReferralSourceAction(source.id, { message: '', success: false }, formData);
            } else {
                result = await createReferralSourceAction({ message: '', success: false }, formData);
            }

            if (result.success) {
                toast({
                    title: "Success",
                    description: result.message,
                });
                onClose(true); // Close and refresh
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.message,
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: 'An unexpected error occurred.',
            });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Referral Source' : 'New Referral Source'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Update the details for this referral source.' : 'Add a new referral source to your network.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Source Name <span className="text-destructive">*</span></Label>
                        <Input
                            id="name"
                            name="name"
                            required
                            defaultValue={source?.name}
                            placeholder="e.g. Springfield Memorial Hospital"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="type">Type <span className="text-destructive">*</span></Label>
                            <Select name="type" required defaultValue={source?.type || 'physician_office'}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="physician_office">Physician Office</SelectItem>
                                    <SelectItem value="hospital">Hospital</SelectItem>
                                    <SelectItem value="clinic">Clinic</SelectItem>
                                    <SelectItem value="assisted_living">Assisted Living</SelectItem>
                                    <SelectItem value="senior_living">Senior Living</SelectItem>
                                    <SelectItem value="home_visit_provider">Home Visit Provider</SelectItem>
                                    <SelectItem value="case_manager">Case Manager</SelectItem>
                                    <SelectItem value="hospice">Hospice</SelectItem>
                                    <SelectItem value="self_referral">Self Referral</SelectItem>
                                    <SelectItem value="family">Family</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
                            <Select name="status" required defaultValue={source?.status || 'prospect'}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="prospect">Prospect</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="high_priority">High Priority</SelectItem>
                                    <SelectItem value="cooling_off">Cooling Off</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="lost">Lost</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Address <span className="text-slate-400 text-xs font-normal ml-1">(Optional)</span></Label>
                        <Input
                            ref={addressInputRef}
                            id="address"
                            name="address"
                            defaultValue={source?.address || ''}
                            placeholder="e.g. 123 Health Ave, Suite 400"
                            autoComplete="off"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number <span className="text-slate-400 text-xs font-normal ml-1">(Optional)</span></Label>
                        <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            defaultValue={source?.phone || ''}
                            placeholder="e.g. (555) 123-4567"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            name="notes"
                            defaultValue={source?.notes || ''}
                            placeholder="Add any internal notes about this source..."
                            className="resize-none"
                            rows={4}
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isEditing ? 'Save Changes' : 'Create Source'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
