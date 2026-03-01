import React, { useMemo } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import type { DrugInteraction, SeverityLevel } from '../../types/clinical';

interface DrugInteractionMatrixProps {
  interactions: DrugInteraction[];
  medications: string[];
}

const severityConfig: Record<SeverityLevel, { color: string; bg: string; label: string; priority: number }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.2)', label: 'Critical', priority: 4 },
  high: { color: '#f59e0b', bg: 'rgba(245,158,11,0.2)', label: 'High', priority: 3 },
  medium: { color: '#3b82f6', bg: 'rgba(59,130,246,0.2)', label: 'Medium', priority: 2 },
  low: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', label: 'Low', priority: 1 },
};

export const DrugInteractionMatrix: React.FC<DrugInteractionMatrixProps> = ({ 
  interactions, 
  medications 
}) => {
  // Build interaction lookup map
  const interactionMap = useMemo(() => {
    const map = new Map<string, DrugInteraction>();
    interactions.forEach(interaction => {
      const key1 = `${interaction.drug1}||${interaction.drug2}`;
      const key2 = `${interaction.drug2}||${interaction.drug1}`;
      map.set(key1, interaction);
      map.set(key2, interaction);
    });
    return map;
  }, [interactions]);

  if (!medications || medications.length < 2) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Drug Interaction Matrix
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: severityConfig.critical.bg, border: `1px solid ${severityConfig.critical.color}` }} />
            <span style={{ color: 'var(--text-muted)' }}>Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: severityConfig.high.bg, border: `1px solid ${severityConfig.high.color}` }} />
            <span style={{ color: 'var(--text-muted)' }}>High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: severityConfig.medium.bg, border: `1px solid ${severityConfig.medium.color}` }} />
            <span style={{ color: 'var(--text-muted)' }}>Medium</span>
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
        {/* Matrix Table */}
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
              <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                Drug
              </th>
              {medications.map((drug, idx) => (
                <th 
                  key={idx} 
                  className="px-3 py-2.5 text-center font-semibold min-w-[100px]"
                  style={{ 
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border-subtle)',
                    borderLeft: idx > 0 ? '1px solid var(--border-subtle)' : 'none'
                  }}
                >
                  <div className="truncate max-w-[120px]" title={drug}>{drug}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {medications.map((drug1, rowIdx) => (
              <tr key={rowIdx}>
                <td 
                  className="px-3 py-2.5 font-medium text-left"
                  style={{ 
                    color: 'var(--text-primary)',
                    borderBottom: rowIdx < medications.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    borderRight: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)'
                  }}
                >
                  <div className="truncate max-w-[150px]" title={drug1}>{drug1}</div>
                </td>
                {medications.map((drug2, colIdx) => {
                  const isDiagonal = rowIdx === colIdx;
                  const interaction = !isDiagonal ? interactionMap.get(`${drug1}||${drug2}`) : null;
                  const severity = interaction?.severity || 'low';
                  const config = severityConfig[severity];

                  return (
                    <td
                      key={colIdx}
                      className="px-2 py-2.5 text-center cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: config.bg,
                        border: `1px solid ${config.color}40`,
                        borderBottom: rowIdx < medications.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      }}
                      title={interaction ? `${interaction.mechanism}\n\n${interaction.clinicalEffect}\n\nManagement: ${interaction.management}` : 'No interaction'}
                    >
                      {isDiagonal ? (
                        <Check size={16} style={{ color: config.color }} />
                      ) : interaction ? (
                        <div className="flex flex-col items-center gap-1">
                          <AlertTriangle size={14} style={{ color: config.color }} />
                          <span className="text-[10px] font-semibold" style={{ color: config.color }}>
                            {config.label}
                          </span>
                        </div>
                      ) : (
                        <Check size={16} style={{ color: severityConfig.low.color, opacity: 0.5 }} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interaction Details */}
      {interactions.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Interaction Details
          </h4>
          {interactions.map((interaction, idx) => {
            const config = severityConfig[interaction.severity];
            return (
              <div 
                key={idx}
                className="p-3 rounded-lg border"
                style={{
                  backgroundColor: config.bg,
                  borderColor: `${config.color}40`
                }}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: config.color }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {interaction.drug1} + {interaction.drug2}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded font-medium" style={{
                        backgroundColor: config.color,
                        color: 'white'
                      }}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-semibold">Mechanism:</span> {interaction.mechanism}
                    </p>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-semibold">Effect:</span> {interaction.clinicalEffect}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-semibold">Management:</span> {interaction.management}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
