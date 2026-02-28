import React from 'react';
import { AlertTriangle, Pill, Activity, User, Globe } from 'lucide-react';
import type { PatientSummary } from '../../types/clinical';

interface PatientSummaryStripProps {
  patient: PatientSummary | null;
  alerts?: Array<{ severity: 'critical' | 'high' | 'medium'; message: string }>;
}

export const PatientSummaryStrip: React.FC<PatientSummaryStripProps> = ({ patient, alerts = [] }) => {
  if (!patient) return null;

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const hasAllergies = patient.allergies && patient.allergies !== 'Not specified';
  const hasMedications = patient.currentMedications && patient.currentMedications !== 'Not specified';

  return (
    <div className="w-full shrink-0 border-b" style={{ 
      backgroundColor: 'var(--bg-surface)', 
      borderColor: 'var(--border-subtle)' 
    }}>
      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="px-4 py-2 bg-red-900/20 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">Critical Alerts</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-3">
            {criticalAlerts.map((alert, idx) => (
              <span key={idx} className="text-xs text-red-300">{alert.message}</span>
            ))}
          </div>
        </div>
      )}

      {/* Patient Info Bar */}
      <div className="px-4 py-2.5 flex items-center gap-6 overflow-x-auto">
        {/* Demographics */}
        <div className="flex items-center gap-3 min-w-fit">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ 
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-subtle)'
          }}>
            <User size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {patient.age ? `${patient.age}y` : 'Age ?'}/
              {patient.sex?.[0] || '?'}
            </span>
          </div>
          
          {patient.ethnicity && patient.ethnicity !== 'Not specified' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ 
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-subtle)'
            }}>
              <Globe size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {patient.ethnicity}
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6" style={{ backgroundColor: 'var(--border-strong)' }} />

        {/* Allergies */}
        {hasAllergies && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-900/20 border border-red-800/30">
            <AlertTriangle size={14} className="text-red-400 shrink-0" />
            <span className="text-sm font-medium text-red-300">
              Allergy: {patient.allergies}
            </span>
          </div>
        )}

        {/* Current Medications */}
        {hasMedications && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ 
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-subtle)'
          }}>
            <Pill size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Meds: {patient.currentMedications}
            </span>
          </div>
        )}

        {/* Known Conditions */}
        {patient.knownConditions && patient.knownConditions.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ 
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-subtle)'
          }}>
            <Activity size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {patient.knownConditions.join(', ')}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* High-risk badge if applicable */}
        {criticalAlerts.length > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-red-900/30 border border-red-700/50">
            <span className="text-xs font-semibold text-red-300 uppercase tracking-wide">
              High Risk
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
