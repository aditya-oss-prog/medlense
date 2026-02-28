import React from 'react';
import { FileText, Share2, Printer } from 'lucide-react';
import type { StructuredClinicalReport } from '../../types/clinical';
import { downloadFHIRBundle, printReport } from '../../utils/exportUtils';

interface ExportPanelProps {
  report: StructuredClinicalReport;
  onExportPDF?: () => void;
  onExportFHIR?: () => void;
  onPrint?: () => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ 
  report, 
  onExportPDF,
  onExportFHIR,
  onPrint
}) => {
  const handleFHIR = () => {
    if (onExportFHIR) {
      onExportFHIR();
    } else {
      downloadFHIRBundle(report);
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      printReport(report);
    }
  };
  if (!report) return null;

  return (
    <div className="w-full p-4 border-t" style={{ 
      backgroundColor: 'var(--bg-surface)',
      borderColor: 'var(--border-subtle)'
    }}>
      <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>
        Export & Share
      </h3>
      
      <div className="flex gap-2">
        {/* PDF Export */}
        <button
          onClick={onExportPDF}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--button-bg)',
            color: 'var(--button-text)'
          }}
        >
          <FileText size={16} />
          <span>Export PDF</span>
        </button>

        {/* FHIR Export */}
        <button
          onClick={handleFHIR}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--bg-panel)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <Share2 size={16} />
          <span>FHIR Bundle</span>
        </button>

        {/* Print */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--bg-panel)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <Printer size={16} />
          <span>Print</span>
        </button>
      </div>

      {/* Export Info */}
      <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <p>
          <span className="font-semibold">Report ID:</span> {report.id}
        </p>
        <p>
          <span className="font-semibold">Generated:</span> {new Date(report.createdAt).toLocaleString()}
        </p>
        <p>
          <span className="font-semibold">Complexity:</span> {report.complexityLevel || 'Standard'}
        </p>
      </div>
    </div>
  );
};
