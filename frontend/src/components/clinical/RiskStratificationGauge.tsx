import React from 'react';
import { Activity, AlertTriangle, Shield, TrendingUp, Pill } from 'lucide-react';
import type { StructuredClinicalReport } from '../../types/clinical';

interface RiskStratificationGaugeProps {
  report: StructuredClinicalReport;
}

const complexityConfig: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode; percentage: number }> = {
  'simple': { 
    color: '#22c55e', 
    bg: 'rgba(34,197,94,0.2)', 
    label: 'Low Risk',
    icon: <Shield size={24} />,
    percentage: 25
  },
  'moderate': { 
    color: '#3b82f6', 
    bg: 'rgba(59,130,246,0.2)', 
    label: 'Moderate Risk',
    icon: <Activity size={24} />,
    percentage: 50
  },
  'complex': { 
    color: '#f59e0b', 
    bg: 'rgba(245,158,11,0.2)', 
    label: 'High Risk',
    icon: <AlertTriangle size={24} />,
    percentage: 75
  },
  'high-risk': { 
    color: '#ef4444', 
    bg: 'rgba(239,68,68,0.2)', 
    label: 'Critical Risk',
    icon: <AlertTriangle size={24} />,
    percentage: 100
  },
};

export const RiskStratificationGauge: React.FC<RiskStratificationGaugeProps> = ({ report }) => {
  const complexity = report.complexityLevel || 'moderate';
  const config = complexityConfig[complexity] || complexityConfig.moderate;
  const confidence = report.confidenceScore || 0.75;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Risk Stratification
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded font-medium" style={{ 
            backgroundColor: 'var(--bg-surface)', 
            color: 'var(--text-muted)' 
          }}>
            Confidence: {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Gauge Visualization */}
      <div className="p-6 rounded-lg border" style={{ 
        backgroundColor: config.bg,
        borderColor: `${config.color}40`
      }}>
        <div className="flex items-center justify-between">
          {/* Left - Icon & Label */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: config.color }}>
              {config.icon}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: config.color }}>
                {config.label}
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {complexity.replace('-', ' ').toUpperCase()}
              </p>
            </div>
          </div>

          {/* Center - Gauge Arc */}
          <div className="flex-1 mx-8">
            <div className="relative h-24">
              {/* Background arc */}
              <div className="absolute inset-0 rounded-full" style={{ 
                backgroundColor: 'rgba(0,0,0,0.1)',
                border: '8px solid var(--border-subtle)',
                borderRadius: '50%',
                clipPath: 'polygon(0 50%, 100 50%, 100 100%, 0 100%)'
              }} />
              
              {/* Colored arc */}
              <div className="absolute inset-0 rounded-full" style={{ 
                backgroundColor: config.color,
                borderRadius: '50%',
                clipPath: `polygon(0 50%, ${config.percentage}% 50%, ${config.percentage}% 100%, 0 100%)`,
                opacity: 0.8
              }} />
            </div>
          </div>

          {/* Right - Metrics */}
          <div className="space-y-2 text-right">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {report.differentialDiagnosis.length} DDx
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Pill size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {report.drugRecommendations.length} Drugs
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {report.alerts.length} Alerts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      {report.alerts.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            Risk Contributors
          </h4>
          <div className="flex gap-2">
            {report.alerts.slice(0, 5).map((alert, idx) => {
              const alertColor = alert.severity === 'critical' ? '#ef4444' : 
                                alert.severity === 'high' ? '#f59e0b' : 
                                alert.severity === 'medium' ? '#3b82f6' : '#22c55e';
              return (
                <span 
                  key={idx}
                  className="text-xs px-2 py-1 rounded font-medium truncate max-w-[150px]"
                  style={{
                    backgroundColor: `${alertColor}20`,
                    color: alertColor,
                    border: `1px solid ${alertColor}40`
                  }}
                  title={alert.description}
                >
                  {alert.title}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
