'use client';

import { FileText } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';

interface ReportPDFExportProps {
  /** Title shown in the print header */
  title: string;
}

/**
 * ReportPDFExport - Triggers browser print dialog for PDF export.
 * Uses window.print() with @media print CSS to produce clean output.
 */
export function ReportPDFExport({ title }: ReportPDFExportProps) {
  const { locale } = useI18n();

  const handleExport = () => {
    // Set document title temporarily for the PDF filename
    const originalTitle = document.title;
    document.title = title;
    window.print();
    document.title = originalTitle;
  };

  return (
    <>
      <button
        onClick={handleExport}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-neutral-100 dark:bg-neutral-800 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700 print:hidden"
      >
        <FileText className="w-4 h-4" />
        {locale === 'es' ? 'Exportar PDF' : 'Export PDF'}
      </button>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          /* Hide navigation, sidebar, header, tabs, and non-report UI */
          nav,
          aside,
          header,
          .print\\:hidden,
          [data-sidebar],
          [data-radix-popper-content-wrapper] {
            display: none !important;
          }

          /* Full-width report content */
          main,
          main > div {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }

          /* Clean print output */
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Remove shadows and decorative borders */
          .rounded-xl,
          .rounded-lg,
          .rounded-2xl {
            box-shadow: none !important;
          }

          /* Ensure charts print with colors */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Page setup */
          @page {
            margin: 1.5cm;
            size: A4 landscape;
          }
        }
      `}</style>
    </>
  );
}
