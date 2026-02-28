import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Check, Plus, FileText } from 'lucide-react';
import type { DifferentialDiagnosis, Probability } from '../../types/clinical';

interface DifferentialDiagnosisTableProps {
  diagnoses: DifferentialDiagnosis[];
  onAddToProblemList?: (diagnosis: DifferentialDiagnosis) => void;
}

const probabilityConfig: Record<Probability, { color: string; bg: string; label: string }> = {
  High: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'High' },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Medium' },
  Low: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)', label: 'Low' },
};

export const DifferentialDiagnosisTable: React.FC<DifferentialDiagnosisTableProps> = ({ 
  diagnoses, 
  onAddToProblemList 
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!diagnoses || diagnoses.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Differential Diagnosis
        </h3>
      </div>

      <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ 
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)'
        }}>
          <div className="col-span-1">Rank</div>
          <div className="col-span-4">Condition</div>
          <div className="col-span-2">Probability</div>
          <div className="col-span-3">ICD-10</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-[var(--border-subtle)]">
          {diagnoses.map((dx, index) => {
            const isExpanded = expandedId === dx.id;
            const probConfig = probabilityConfig[dx.probability];

            return (
              <div key={dx.id}>
                <div 
                  className={`grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors cursor-pointer hover:bg-opacity-50 ${isExpanded ? 'bg-opacity-10' : ''}`}
                  style={{ backgroundColor: isExpanded ? 'var(--accent-light)' : 'transparent' }}
                  onClick={() => setExpandedId(isExpanded ? null : dx.id)}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                    ) : (
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      #{index + 1}
                    </span>
                  </div>

                  {/* Condition */}
                  <div className="col-span-4">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {dx.condition}
                    </div>
                    {dx.reasoning && (
                      <div className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                        {dx.reasoning}
                      </div>
                    )}
                  </div>

                  {/* Probability */}
                  <div className="col-span-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium" style={{
                      backgroundColor: probConfig.bg,
                      color: probConfig.color
                    }}>
                      {probConfig.label}
                      {dx.probabilityScore && (
                        <span className="ml-1.5 opacity-75">({Math.round(dx.probabilityScore * 100)}%)</span>
                      )}
                    </span>
                  </div>

                  {/* ICD-10 */}
                  <div className="col-span-3">
                    {dx.icd10 ? (
                      <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {dx.icd10}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-placeholder)' }}>Not specified</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    {onAddToProblemList && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToProblemList(dx);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <Plus size={12} />
                        Add to Problem List
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 py-4 border-t space-y-4" style={{ 
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)'
                  }}>
                    {/* Supporting Findings */}
                    {dx.supportingFindings && dx.supportingFindings.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          <Check size={12} style={{ color: 'var(--accent)' }} />
                          Supporting Findings
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {dx.supportingFindings.map((finding: string, idx: number) => (
                            <span key={idx} className="px-2.5 py-1 rounded-md text-xs" style={{
                              backgroundColor: 'var(--bg-panel)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-secondary)'
                            }}>
                              {finding}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rule Outs */}
                    {dx.ruleOuts && dx.ruleOuts.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          <AlertTriangle size={12} style={{ color: '#f59e0b' }} />
                          Rule-Out Considerations
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {dx.ruleOuts.map((ruleOut: string, idx: number) => (
                            <span key={idx} className="px-2.5 py-1 rounded-md text-xs" style={{
                              backgroundColor: 'rgba(245,158,11,0.1)',
                              border: '1px solid rgba(245,158,11,0.3)',
                              color: '#f59e0b'
                            }}>
                              {ruleOut}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Workup */}
                    {dx.recommendedWorkup && dx.recommendedWorkup.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          <FileText size={12} style={{ color: 'var(--accent)' }} />
                          Recommended Workup
                        </div>
                        <ul className="space-y-1.5">
                          {dx.recommendedWorkup.map((workup: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                              <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
                              {workup}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Full Reasoning */}
                    {dx.reasoning && (
                      <div>
                        <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          Clinical Reasoning
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {dx.reasoning}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
