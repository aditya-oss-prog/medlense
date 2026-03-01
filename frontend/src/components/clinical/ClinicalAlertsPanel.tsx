import React from 'react';
import { AlertTriangle, AlertCircle, Info, XCircle, CheckCircle, Book, Activity } from 'lucide-react';
import type { ClinicalAlert } from '../../types/clinical';

interface ClinicalAlertsPanelProps {
  alerts: ClinicalAlert[];
}

const severityConfig: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode; border: string }> = {
  critical: { 
    color: '#ef4444', 
    bg: 'rgba(239,68,68,0.15)', 
    label: 'CRITICAL',
    icon: <XCircle size={18} />,
    border: 'rgba(239,68,68,0.3)'
  },
  high: { 
    color: '#f59e0b', 
    bg: 'rgba(245,158,11,0.15)', 
    label: 'HIGH',
    icon: <AlertTriangle size={18} />,
    border: 'rgba(245,158,11,0.3)'
  },
  medium: { 
    color: '#3b82f6', 
    bg: 'rgba(59,130,246,0.1)', 
    label: 'MEDIUM',
    icon: <AlertCircle size={18} />,
    border: 'rgba(59,130,246,0.2)'
  },
  low: { 
    color: '#22c55e', 
    bg: 'rgba(34,197,94,0.1)', 
    label: 'LOW',
    icon: <Info size={18} />,
    border: 'rgba(34,197,94,0.2)'
  },
};

const typeIconConfig: Record<string, React.ReactNode> = {
  warning: <AlertTriangle size={14} />,
  contraindication: <XCircle size={14} />,
  interaction: <AlertCircle size={14} />,
  allergy: <AlertTriangle size={14} />,
  pgx: <Activity size={14} />,
  guideline: <Book size={14} />,
};

export const ClinicalAlertsPanel: React.FC<ClinicalAlertsPanelProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="p-6 text-center" style={{ color: 'var(--text-muted)' }}>
        <CheckCircle size={32} className="mx-2 mb-2 opacity-50" style={{ color: 'var(--text-placeholder)' }} />
        <p className="text-sm">No clinical alerts identified</p>
      </div>
    );
  }

  // Sort by severity
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Clinical Alerts
        </h3>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-xs px-2 py-1 rounded font-semibold" style={{
              backgroundColor: severityConfig.critical.bg,
              color: severityConfig.critical.color
            }}>
              {criticalCount} Critical
            </span>
          )}
          {highCount > 0 && (
            <span className="text-xs px-2 py-1 rounded font-semibold" style={{
              backgroundColor: severityConfig.high.bg,
              color: severityConfig.high.color
            }}>
              {highCount} High
            </span>
          )}
          <span className="text-xs px-2 py-1 rounded font-medium" style={{ 
            backgroundColor: 'var(--bg-surface)', 
            color: 'var(--text-muted)' 
          }}>
            {alerts.length} Total
          </span>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="space-y-2">
        {sortedAlerts.map((alert, idx) => {
          const config = severityConfig[alert.severity] || severityConfig.medium;
          const typeIcon = typeIconConfig[alert.type] || <Info size={14} />;
          
          return (
            <div 
              key={alert.id || idx}
              className="p-4 rounded-lg border transition-all hover:shadow-md"
              style={{
                backgroundColor: config.bg,
                borderColor: config.border
              }}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0" style={{ color: config.color }}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-wide" style={{
                      backgroundColor: config.color,
                      color: 'white'
                    }}>
                      {config.label}
                    </span>
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      {typeIcon}
                      <span className="capitalize">{alert.type}</span>
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {alert.title}
                  </h4>
                  <p className="text-sm mb-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {alert.description}
                  </p>
                  {alert.recommendation && (
                    <div className="text-sm p-2 rounded bg-opacity-50" style={{ 
                      backgroundColor: 'rgba(0,0,0,0.05)',
                      borderLeft: `2px solid ${config.color}`
                    }}>
                      <span className="font-semibold" style={{ color: config.color }}>
                        Recommendation:
                      </span>
                      <span className="ml-2" style={{ color: 'var(--text-secondary)' }}>
                        {alert.recommendation}
                      </span>
                    </div>
                  )}
                  {alert.references && alert.references.length > 0 && (
                    <div className="text-xs mt-2" style={{ color: 'var(--text-placeholder)' }}>
                      <Book size={10} className="inline mr-1" />
                      References: {alert.references.join(', ')}
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
