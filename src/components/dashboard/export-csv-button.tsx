'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { Referral } from '@/lib/types';

export default function ExportCsvButton({ data }: { data: Referral[] }) {
    const exportToCsv = () => {
        if (!data || data.length === 0) return;

        const headers = [
            'Referral ID', 'Patient Name', 'Patient DOB', 'Patient ZIP', 'Insurance',
            'Organization', 'Contact Person', 'Contact Phone', 'Services', 'Status', 'Created At'
        ];

        const rows = data.map(r => [
            r.id,
            r.patientName,
            r.patientDOB,
            r.patientZipCode,
            r.patientInsurance,
            r.referrerName,
            r.contactPerson,
            r.referrerContact,
            (r.servicesNeeded || []).join('; '),
            r.status,
            r.createdAt.toLocaleString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `referrals-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Button onClick={exportToCsv} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
        </Button>
    );
}
