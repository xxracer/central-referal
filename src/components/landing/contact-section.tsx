'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { submitContactForm } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function ContactSection() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        clientType: 'New Client',
        comment: ''
    });

    const formatPhoneNumber = (value: string) => {
        if (!value) return value;
        const phoneNumber = value.replace(/[^\d]/g, '');
        const phoneNumberLength = phoneNumber.length;
        if (phoneNumberLength < 4) return phoneNumber;
        if (phoneNumberLength < 7) {
            return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
        }
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            const formatted = formatPhoneNumber(value);
            // Limit to max length of (XXX) XXX-XXXX
            if (formatted.length <= 14) {
                setFormData({ ...formData, [name]: formatted });
            }
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Manual Validation Check
        if (!formData.name || !formData.phone || !formData.email || !formData.comment) {
            toast({
                title: 'Missing Fields',
                description: 'Please fill out all required fields.',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);

        try {
            const result = await submitContactForm(formData);
            if (result.success) {
                toast({
                    title: 'Message Sent',
                    description: 'Thank you! Someone from our team will get back to you soon.',
                    variant: 'default',
                    className: 'bg-green-50 border-green-200 text-green-800'
                });
                setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    clientType: 'New Client',
                    comment: ''
                });
            } else {
                toast({
                    title: 'Error',
                    description: result.message || 'Something went wrong. Please try again.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to send message.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="contact" className="py-24 bg-muted/30 relative overflow-hidden">
            {/* Decorative blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -z-10" />

            <div className="container px-4 md:px-6 relative z-10">
                <div className="flex flex-col items-center text-center space-y-4 mb-12">
                    <h2 className="text-gray-600 font-black uppercase tracking-[0.2em] text-sm">Contact Us</h2>
                    <h3 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">Contact ReferralFlow</h3>
                    <p className="max-w-[700px] text-lg text-muted-foreground">
                        Whether you’re an existing client or exploring ReferralFlow for your agency, we’re here to help.
                        Use the form below for questions, support, or to learn how ReferralFlow can improve your referral process.
                    </p>
                </div>

                <div className="max-w-2xl mx-auto bg-white/60 backdrop-blur-sm p-8 rounded-2xl border shadow-lg">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium">Name / Agency Name</label>
                                <input
                                    required
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Enter your name or agency"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="phone" className="text-sm font-medium">Phone</label>
                                <input
                                    required
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="(555) 555-5555"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">Email</label>
                                <input
                                    required
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="you@company.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="clientType" className="text-sm font-medium">I am a...</label>
                                <select
                                    id="clientType"
                                    name="clientType"
                                    value={formData.clientType}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="New Client">New Client</option>
                                    <option value="Existing Client">Existing Client</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="comment" className="text-sm font-medium">How can we help?</label>
                            <textarea
                                required
                                id="comment"
                                name="comment"
                                rows={4}
                                value={formData.comment}
                                onChange={handleChange}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Tell us more about your inquiry..."
                            />
                        </div>

                        <Button type="submit" size="lg" className="w-full text-lg" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Message
                        </Button>
                        <p className="text-center text-sm text-muted-foreground mt-4">
                            A member of our team will respond shortly.
                        </p>
                    </form>
                </div>
            </div>
        </section>
    );
}
