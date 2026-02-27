'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { logContactAction, updateContactLogAction } from '@/lib/referral-sources-actions';
import type { ReferralSourceContact } from '@/lib/types';
import { Loader2, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddContactModalProps {
    isOpen: boolean;
    onClose: (refresh?: boolean) => void;
    sourceId: string;
    contact?: ReferralSourceContact;
}

export default function AddContactModal({ isOpen, onClose, sourceId, contact }: AddContactModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [hasReminder, setHasReminder] = useState(!!contact?.reminderDate);
    const { toast } = useToast();

    // Format "now" for datetime-local input
    const nowLocal = new Date();
    nowLocal.setMinutes(nowLocal.getMinutes() - nowLocal.getTimezoneOffset());
    const defaultDateTime = nowLocal.toISOString().slice(0, 16);

    const formatForInput = (dateInput?: Date | string | null) => {
        if (!dateInput) return defaultDateTime;
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return defaultDateTime;
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            let result;
            if (contact?.id) {
                formData.append('contactId', contact.id);
                result = await updateContactLogAction(formData);
            } else {
                result = await logContactAction(sourceId, { message: '', success: false }, formData);
            }

            if (result.success) {
                toast({
                    title: "Success",
                    description: result.message,
                });
                onClose(true); // Close and trigger refresh
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Log Contact</DialogTitle>
                    <DialogDescription>
                        Record a new interaction or outreach effort with this referral source.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="contactDate">Date & Time <span className="text-destructive">*</span></Label>
                        <Input
                            id="contactDate"
                            name="contactDate"
                            type="datetime-local"
                            required
                            defaultValue={defaultDateTime}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contactType">Contact Method <span className="text-destructive">*</span></Label>
                        <Select name="contactType" required defaultValue={contact?.contactType || "phone"}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="in_person">In Person / Visit</SelectItem>
                                <SelectItem value="phone">Phone Call</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="event">Event / Conference</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contactPerson">Contact Person <span className="text-slate-400 text-xs font-normal ml-1">(Optional)</span></Label>
                        <Input
                            id="contactPerson"
                            name="contactPerson"
                            placeholder="e.g. Dr. Smith, Juana from Admissions"
                            defaultValue={contact?.contactPerson || ''}
                            maxLength={100}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="summary">Summary <span className="text-destructive">*</span></Label>
                        <Textarea
                            id="summary"
                            name="summary"
                            required
                            placeholder="What was discussed or what happened during this contact?"
                            className="resize-none"
                            rows={4}
                            defaultValue={contact?.summary || ''}
                        />
                    </div>

                    <div className="pt-2 border-t mt-4 border-slate-100">
                        <div className="flex items-center justify-between pb-2">
                            <div className="flex items-center gap-2">
                                <span className="bg-blue-100 p-1.5 rounded-md">
                                    <Bell className="h-4 w-4 text-blue-600" />
                                </span>
                                <div>
                                    <Label htmlFor="hasReminder" className="text-sm font-medium cursor-pointer">Schedule Reminder</Label>
                                    <p className="text-xs text-muted-foreground">Receive an email 1 hour before the date.</p>
                                </div>
                            </div>
                            <Switch
                                id="hasReminder"
                                name="hasReminder"
                                checked={hasReminder}
                                onCheckedChange={setHasReminder}
                            />
                        </div>

                        {hasReminder && (
                            <div className="space-y-4 pt-3 mt-1 bg-slate-50/50 p-3 rounded-lg border">
                                <div className="space-y-2">
                                    <Label htmlFor="reminderDate">Reminder Date & Time <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="reminderDate"
                                        name="reminderDate"
                                        type="datetime-local"
                                        required={hasReminder}
                                        defaultValue={formatForInput(contact?.reminderDate)}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reminderEmail">Send Reminder To <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="reminderEmail"
                                        name="reminderEmail"
                                        type="email"
                                        placeholder="staff@example.com"
                                        required={hasReminder}
                                        defaultValue={contact?.reminderEmail || ''}
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save log
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
