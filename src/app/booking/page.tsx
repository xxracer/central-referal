'use client';

import React from 'react';
import Image from 'next/image';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { CheckCircle2, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const plusJakarta = Plus_Jakarta_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800'],
    display: 'swap',
});

export default function BookingPage() {
    const handleScrollToBooking = () => {
        const bookingSection = document.getElementById('booking-section');
        if (bookingSection) {
            bookingSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className={`${plusJakarta.className} min-h-screen bg-white text-slate-900 selection:bg-primary/20 isolate`}>
            {/* 
        NO NAVIGATION
        We deliberately remove the global header to keep the user focused on the goal: booking the call. 
      */}

            {/* HERO SECTION */}
            <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden px-4 sm:px-6">
                {/* Background Gradients */}
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -z-10" />
                <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[100px] -z-10" />

                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

                    {/* Left Column: Copy & CTA */}
                    <div className="flex flex-col space-y-8 z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 text-slate-600 text-sm font-bold max-w-fit shadow-sm border border-slate-200 backdrop-blur-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            Spots limited for this month
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-slate-900">
                                Scale your agency faster with <span className="text-primary font-black">automated referrals</span>
                            </h1>
                            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-lg font-medium">
                                Stop losing patients to manual processes. See how top agencies are cutting administrative time by 50% and increasing accepted referrals.
                            </p>
                        </div>

                        <ul className="space-y-4">
                            {[
                                { title: 'Zero friction onboarding', desc: 'Deploy within hours, not weeks.' },
                                { title: 'Increase conversion rates', desc: 'Patients track status automatically.' },
                                { title: 'HIPAA compliant by default', desc: 'Bank-grade security on every step.' }
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <span className="block font-bold text-slate-900">{item.title}</span>
                                        <span className="block text-slate-500 text-sm font-medium">{item.desc}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
                            <Button
                                onClick={handleScrollToBooking}
                                className="w-full sm:w-auto h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105"
                            >
                                <CalendarIcon className="mr-2 h-5 w-5" />
                                Book Your Demo
                            </Button>
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                                <Clock className="w-4 h-4" />
                                Takes 2 minutes
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Video */}
                    <div className="relative w-full max-w-xl mx-auto lg:max-w-none group z-10 perspective-[1000px]">
                        {/* Decorative background behind video */}
                        <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-blue-300/10 rounded-[2.5rem] blur-xl opacity-70 group-hover:opacity-100 transition duration-700 -z-10" />

                        <div className="relative rounded-[2rem] overflow-hidden bg-slate-900 shadow-2xl border border-slate-200/50 aspect-video ring-1 ring-black/5 transform transition-transform duration-500 lg:rotate-y-[-5deg] lg:rotate-x-[2deg] group-hover:rotate-0">
                            {/* 
                  VIDEO TAG 
                  Replace "/placeholder-video.mp4" with your actual video source.
                */}
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                            >
                                <source src="/placeholder-video.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>

                            {/* Overlay gradient for a more premium look */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent pointer-events-none" />
                        </div>
                    </div>

                </div>
            </section>

            {/* SOCIAL PROOF / LOGOS */}
            <section className="py-10 border-y border-slate-100 bg-slate-50/50 backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <p className="text-center text-sm font-extrabold text-slate-400 uppercase tracking-widest mb-8">
                        Trusted by fast-growing medical agencies
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Replace these with actual SVGs or Images of client logos */}
                        <div className="text-xl font-black italic tracking-tighter text-slate-800">HealthCare+</div>
                        <div className="text-xl font-black italic tracking-tighter text-slate-800">MediLink</div>
                        <div className="text-xl font-black italic tracking-tighter text-slate-800">VitaCore</div>
                        <div className="text-xl font-black italic tracking-tighter text-slate-800">ApexHealth</div>
                    </div>
                </div>
            </section>

            {/* BOOKING SECTION */}
            <section id="booking-section" className="py-20 md:py-32 px-4 sm:px-6 relative bg-white">
                <div className="max-w-4xl mx-auto bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-12 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[80px] -z-10 -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-50/50 rounded-full blur-[80px] -z-10 translate-y-1/2 -translate-x-1/2" />

                    <div className="text-center max-w-2xl mx-auto mb-10 relative z-10">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
                            Ready to transform your workflow?
                        </h2>
                        <p className="text-slate-600 font-medium text-lg lg:text-xl">
                            Choose a time below that works for you. Our experts will show you exactly how ReferralFlow can fit your specific needs.
                        </p>
                    </div>

                    {/* CALENDLY EMBED */}
                    <div className="w-full bg-slate-50/50 rounded-3xl border border-slate-100 relative shadow-sm overflow-hidden min-h-[700px] z-10">
                        <iframe
                            src="https://calendly.com/ilptechnology-info/30min?hide_event_type_details=1&hide_gdpr_banner=1&background_color=f8fafc&text_color=0f172a&primary_color=7da4f7"
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            className="absolute inset-0 z-20"
                            title="Schedule a Demo"
                        />
                    </div>

                </div>
            </section>

            {/* MINIMAL FOOTER */}
            <footer className="py-8 text-center text-slate-400 font-semibold text-sm bg-white">
                &copy; {new Date().getFullYear()} ReferralFlow. All rights reserved.
            </footer>
        </div>
    );
}
