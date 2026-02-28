import React from 'react';
import { Activity, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { PharmacogenomicFinding } from '../../types/clinical';

interface PharmacogenomicsDashboardProps {
  findings: PharmacogenomicFinding[];
}

const metabolizerConfig: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  PM: { 
    color: '#ef4444', 
    bg: 'rgba(239,68,68,0.2)', 
    label: 'Poor Metabolizer',
    icon: <AlertTriangle size={14} />
  },
  IM: { 
    color: '#f59e0b', 
    bg: 'rgba(245,158,11,0.2)', 
    label: 'Intermediate Metabolizer',
    icon: <Info size={14} />
  },
  NM: { 
    color: '#22c55e', 
    bg: 'rgba(34,197,94,0.1)', 
    label: 'Normal Metabolizer',
    icon: <CheckCircle size={14} />
  },
  UM: { 
    color: '#3b82f6', 
    bg: 'rgba(59,130,246,0.2)', 
    label: 'Ultrarapid Metabolizer',
    icon: <Activity size={14} />
  },
};

const cpicLevelConfig: Record<string, { color: string; label: string }> = {
  A: { color: '#ef4444', label: 'Level A - Strong evidence' },
  B: { color: '#f59e0b', label: 'Level B - Moderate evidence' },
  C: { color: '#3b82f6', label: 'Level C - Weak evidence' },
  D: { color: '#9ca3af', label: 'Level D - No recommendation' },
};

export const PharmacogenomicsDashboard: React.FC<PharmacogenomicsDashboardProps> = ({ findings }) => {
  if (!findings || findings.length === 0) {
    return (
      <div className="p-6 text-center" style={{ color: 'var(--text-muted)' }}>
        <p className="text-sm">No pharmacogenomic findings identified</p>
      </div>
    );
  }

  // Group by gene
  const byGene = findings.reduce((acc, finding) => {
    if (!acc[finding.gene]) {
      acc[finding.gene] = [];
    }
    acc[finding.gene].push(finding);
    return acc;
  }, {} as Record<string, PharmacogenomicFinding[]>);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Pharmacogenomics Dashboard
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded font-medium" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
            {findings.length} Gene{findings.length !== 1 ? 's' : ''}-Drug Interaction{findings.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* CYP450 Visualizer Summary */}
      <div className="p-4 rounded-lg border" style={{ 
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)'
      }}>
        <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          CYP450 Metabolizer Status
        </h4>
        <div className="grid gap-2">
          {Object.entries(byGene).map(([gene, geneFindings]) => {
            const primaryFinding = geneFindings[0];
            const metabolizer = primaryFinding.metabolizerStatus || 'NM';
            const config = metabolizerConfig[metabolizer] || metabolizerConfig.NM;
            
            return (
              <div 
                key={gene}
                className="p-3 rounded-lg flex items-center justify-between"
                style={{ backgroundColor: config.bg, border: `1px solid ${config.color}40` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.color }}>
                    {config.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {gene}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded font-medium" style={{
                        backgroundColor: config.color,
                        color: 'white'
                      }}>
                        {metabolizer}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {config.label}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Affected Drug
                  </p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {primaryFinding.drugAffected}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gene-Drug Interaction Table */}
      <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                Gene
              </th>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                Drug
              </th>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                Phenotype
              </th>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                CPIC Level
              </th>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                Dosing Guidance
              </th>
            </tr>
          </thead>
          <tbody>
            {findings.map((finding, idx) => {
              const metabolizer = finding.metabolizerStatus || 'NM';
              const config = metabolizerConfig[metabolizer] || metabolizerConfig.NM;
              const cpic = finding.cpicLevel ? cpicLevelConfig[finding.cpicLevel] : null;
              
              return (
                <tr key={idx} style={{ borderBottom: idx < findings.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {finding.gene}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{
                        backgroundColor: config.color,
                        color: 'white'
                      }}>
                        {finding.metabolizerStatus || 'NM'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {finding.drugAffected}
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {finding.phenotype || 'N/A'}
                  </td>
                  <td className="px-3 py-2.5">
                    {cpic ? (
                      <span className="text-xs px-2 py-1 rounded font-medium" style={{
                        backgroundColor: cpic.color,
                        color: 'white'
                      }}>
                        {cpic.label}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-placeholder)' }}>Not graded</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {finding.dosingGuidance || finding.clinicalImplication}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detailed Findings */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Clinical Implications
        </h4>
        {findings.map((finding, idx) => {
          const metabolizer = finding.metabolizerStatus || 'NM';
          const config = metabolizerConfig[metabolizer] || metabolizerConfig.NM;
          
          return (
            <div 
              key={idx}
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: config.color }}>
                  {config.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {finding.gene} → {finding.drugAffected}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded font-medium" style={{
                      backgroundColor: config.color,
                      color: 'white'
                    }}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {finding.clinicalImplication}
                  </p>
                  {finding.alternativeDrugs && finding.alternativeDrugs.length > 0 && (
                    <div className="text-xs">
                      <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>
                        Alternative drugs:
                      </span>
                      <span className="ml-1" style={{ color: 'var(--text-secondary)' }}>
                        {finding.alternativeDrugs.join(', ')}
                      </span>
                    </div>
                  )}
                  {finding.ethnicityPrevalence && (
                    <div className="text-xs mt-1" style={{ color: 'var(--text-placeholder)' }}>
                      <Info size={10} className="inline mr-1" />
                      {finding.ethnicityPrevalence}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
