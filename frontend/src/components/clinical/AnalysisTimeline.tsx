import React from 'react';
import { Loader2, Check, AlertCircle, Clock, FileText, Pill, Dna, BookOpen } from 'lucide-react';

interface AnalysisTimelineProps {
  stages: Array<{
    stage: string;
    message: string;
    timestamp?: string;
    status?: 'pending' | 'active' | 'completed' | 'error';
  }>;
}

const iconMap: Record<string, React.ReactNode> = {
  'thinking': <Loader2 size={14} className="animate-spin" />,
  'tool_call': <FileText size={14} />,
  'tool_result': <Check size={14} />,
  'synthesizing': <Dna size={14} />,
  'complete': <Check size={14} />,
  'starting': <Clock size={14} />,
  'extracting': <FileText size={14} />,
};

const colorMap: Record<string, string> = {
  'thinking': '#8b5cf6',
  'tool_call': '#3b82f6',
  'tool_result': '#22c55e',
  'synthesizing': '#8b5cf6',
  'complete': '#22c55e',
  'starting': '#f59e0b',
  'extracting': '#3b82f6',
};

export const AnalysisTimeline: React.FC<AnalysisTimelineProps> = ({ stages }) => {
  if (!stages || stages.length === 0) return null;

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-secondary)' }}>
        Analysis Timeline
      </h3>

      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const icon = iconMap[stage.stage] || <Clock size={14} />;
          const color = colorMap[stage.stage] || 'var(--text-muted)';
          const isLast = idx === stages.length - 1;
          const isActive = stage.status === 'active' || (isLast && !stage.status);

          return (
            <div key={idx} className="flex items-start gap-3">
              {/* Icon */}
              <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}20` }}>
                {icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {stage.message}
                  </span>
                  {isActive && (
                    <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                  )}
                </div>
                
                {/* Stage label */}
                <span className="text-xs uppercase tracking-wide font-semibold mt-0.5" style={{ color }}>
                  {stage.stage.replace('_', ' ').replace('-', '')}
                </span>

                {/* Timestamp */}
                {stage.timestamp && (
                  <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                    {stage.timestamp}
                  </span>
                )}
              </div>

              {/* Status indicator */}
              {stage.status === 'completed' && (
                <Check size={16} style={{ color: '#22c55e' }} />
              )}
              {stage.status === 'error' && (
                <AlertCircle size={16} style={{ color: '#ef4444' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {stages.length > 0 && (
        <div className="mt-6 flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-2">
            <div className="w-px h-3" style={{ backgroundColor: 'var(--border-strong)' }} />
            <span>{stages.length} analysis steps</span>
          </div>
          <div className="flex items-center gap-2">
            <Pill size={12} />
            <span>Drug analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen size={12} />
            <span>Research search</span>
          </div>
          <div className="flex items-center gap-2">
            <Dna size={12} />
            <span>Pharmacogenomics</span>
          </div>
        </div>
      )}
    </div>
  );
};
