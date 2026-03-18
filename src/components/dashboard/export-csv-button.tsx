'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import type { Referral } from '@/lib/types';
import JSZip from 'jszip';

export default function ExportCsvButton({ data }: { data: Referral[] }) {
    const [isExporting, setIsExporting] = useState(false);
    const exportToZip = async () => {
        if (!data || data.length === 0) return;
        setIsExporting(true);

        try {
            const zip = new JSZip();

            // 1. Generate CSV
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
                ...rows.map(row => row.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            zip.file("referrals_report.csv", csvContent);

            // 2. Generate JSON backup
            zip.file("referrals_raw_data.json", JSON.stringify(data, null, 2));

            // Generate ZIP blob
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `referralflow-archive-${new Date().toISOString().split('T')[0]}.zip`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to generate ZIP", error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button onClick={exportToZip} disabled={isExporting} variant="outline" size="sm" className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? 'Zipping...' : 'Export ZIP'}
        </Button>
    );
}
