import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  Check, 
  Pill, 
  DollarSign,
  Beaker,
  BookOpen,
  ExternalLink,
  ShieldAlert,
  Plus
} from 'lucide-react';
import type { DrugRecommendation, Probability, EvidenceGrade } from '../../types/clinical';

interface DrugCardProps {
  drug: DrugRecommendation;
  onAddToMedicationList?: (drug: DrugRecommendation) => void;
}

const probabilityConfig: Record<Probability, { color: string; bg: string }> = {
  High: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  Low: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

const evidenceGradeConfig: Record<EvidenceGrade, { color: string; bg: string; label: string }> = {
  A: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)', label: 'Level A' },
  B: { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', label: 'Level B' },
  C: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Level C' },
  D: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Level D' },
};

export const DrugCard: React.FC<DrugCardProps> = ({ drug, onAddToMedicationList }) => {
  const [expanded, setExpanded] = useState(false);
  const confidenceConfig = probabilityConfig[drug.confidence];
  const evidenceConfig = evidenceGradeConfig[drug.evidenceGrade];

  return (
    <div className="border rounded-lg overflow-hidden transition-all hover:shadow-md" style={{
      backgroundColor: 'var(--bg-panel)',
      borderColor: expanded ? 'var(--accent)' : 'var(--border-subtle)'
    }}>
      {/* Card Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--accent-light)' }}>
                <Pill size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {drug.drugName}
                </h4>
                {drug.genericName && drug.genericName !== drug.drugName && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Generic: {drug.genericName}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Confidence Badge */}
            <span className="px-2.5 py-1 rounded-md text-xs font-medium" style={{
              backgroundColor: confidenceConfig.bg,
              color: confidenceConfig.color
            }}>
              {drug.confidence} Confidence
            </span>

            {/* Evidence Grade */}
            <span className="px-2.5 py-1 rounded-md text-xs font-medium" style={{
              backgroundColor: evidenceConfig.bg,
              color: evidenceConfig.color
            }}>
              {evidenceConfig.label}
            </span>

            {/* Expand Toggle */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>

        {/* Indication */}
        <div className="mt-3 flex items-start gap-2">
          <Beaker size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Indication
            </span>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {drug.indication}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Info Bar */}
      <div className="px-4 py-2.5 border-b flex items-center gap-6 flex-wrap" style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)'
      }}>
        {drug.dose && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Dose</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{drug.dose}</span>
          </div>
        )}
        {drug.frequency && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Frequency</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{drug.frequency}</span>
          </div>
        )}
        {drug.drugClass && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Class</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{drug.drugClass}</span>
          </div>
        )}
        {drug.cost && (
          <div className="flex items-center gap-1.5">
            <DollarSign size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{drug.cost}</span>
          </div>
        )}
      </div>

      {/* Black Box Warning */}
      {drug.blackBoxWarning && (
        <div className="px-4 py-3 border-b bg-red-900/10" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-red-400">
                ⚠️ Black Box Warning
              </span>
              <p className="text-sm mt-1 text-red-300">{drug.blackBoxWarning}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 py-4 space-y-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
          {/* Warnings */}
          {drug.warnings && drug.warnings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <AlertTriangle size={12} style={{ color: '#f59e0b' }} />
                Warnings & Precautions
              </div>
              <ul className="space-y-1.5">
                {drug.warnings.map((warning: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#f59e0b' }} />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contraindications */}
          {drug.contraindications && drug.contraindications.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <AlertTriangle size={12} style={{ color: '#ef4444' }} />
                Contraindications
              </div>
              <div className="flex flex-wrap gap-2">
                {drug.contraindications.map((contraindication: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 rounded-md text-xs" style={{
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444'
                  }}>
                    {contraindication}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Side Effects */}
          {drug.sideEffects && drug.sideEffects.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Common Side Effects
              </div>
              <div className="flex flex-wrap gap-2">
                {drug.sideEffects.map((sideEffect: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 rounded-md text-xs" style={{
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)'
                  }}>
                    {sideEffect}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ethnicity Considerations */}
          {drug.ethnicityConsiderations && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <Check size={12} style={{ color: 'var(--accent)' }} />
                Ethnicity-Specific Considerations
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {drug.ethnicityConsiderations}
              </p>
            </div>
          )}

          {/* Supporting Evidence */}
          {drug.supportingEvidence && drug.supportingEvidence.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <BookOpen size={12} style={{ color: 'var(--accent)' }} />
                Supporting Evidence
              </div>
              <div className="flex flex-wrap gap-2">
                {drug.supportingEvidence.map((evidence: string, idx: number) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs" style={{
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)'
                  }}>
                    <ExternalLink size={10} />
                    {evidence}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          {onAddToMedicationList && (
            <div className="pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                onClick={() => onAddToMedicationList(drug)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--button-bg)',
                  color: 'var(--button-text)'
                }}
              >
                <Plus size={16} />
                Add to Medication List
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
