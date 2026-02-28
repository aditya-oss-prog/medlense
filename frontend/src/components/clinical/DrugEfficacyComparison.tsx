import React from 'react';
import { Pill, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import type { DrugRecommendation, Probability } from '../../types/clinical';

interface DrugEfficacyComparisonProps {
  drugs: DrugRecommendation[];
}

const confidenceConfig: Record<Probability, { color: string; bg: string; label: string }> = {
  High: { color: '#22c55e', bg: 'rgba(34,197,94,0.2)', label: 'High confidence' },
  Medium: { color: '#3b82f6', bg: 'rgba(59,130,246,0.2)', label: 'Moderate confidence' },
  Low: { color: '#f59e0b', bg: 'rgba(245,158,11,0.2)', label: 'Low confidence' },
};

const evidenceGradeConfig: Record<string, { color: string; width: number }> = {
  A: { color: '#22c55e', width: 100 },
  B: { color: '#3b82f6', width: 75 },
  C: { color: '#f59e0b', width: 50 },
  D: { color: '#ef4444', width: 25 },
};

export const DrugEfficacyComparison: React.FC<DrugEfficacyComparisonProps> = ({ drugs }) => {
  if (!drugs || drugs.length === 0) {
    return (
      <div className="p-6 text-center" style={{ color: 'var(--text-muted)' }}>
        <p className="text-sm">No drug recommendations available</p>
      </div>
    );
  }

  // Sort by confidence
  const sortedDrugs = [...drugs].sort((a, b) => {
    const confidenceOrder = { High: 3, Medium: 2, Low: 1 };
    return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Drug Efficacy Comparison
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-2 py-1 rounded font-medium" style={{ 
            backgroundColor: 'var(--bg-surface)', 
            color: 'var(--text-muted)' 
          }}>
            {drugs.length} Options
          </span>
        </div>
      </div>

      {/* Comparison Bars */}
      <div className="space-y-3">
        {sortedDrugs.map((drug, idx) => {
          const confidence = confidenceConfig[drug.confidence];
          const evidence = evidenceGradeConfig[drug.evidenceGrade] || evidenceGradeConfig.C;
          const hasBlackBox = !!drug.blackBoxWarning;

          return (
            <div 
              key={drug.id || idx}
              className="p-3 rounded-lg border transition-all hover:shadow-md"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              <div className="flex items-center gap-3">
                {/* Drug Name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill size={16} style={{ color: confidence.color }} />
                    <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                      {drug.drugName}
                    </span>
                    {hasBlackBox && (
                      <AlertTriangle size={12} style={{ color: '#ef4444' }} />
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {drug.indication}
                  </p>
                </div>

                {/* Evidence Grade Bar */}
                <div className="w-32">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: 'var(--text-muted)' }}>Evidence</span>
                    <span className="font-semibold" style={{ color: evidence.color }}>Grade {drug.evidenceGrade}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle)' }}>
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${evidence.width}%`,
                        backgroundColor: evidence.color 
                      }} 
                    />
                  </div>
                </div>

                {/* Confidence Badge */}
                <div className="w-24 text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <CheckCircle size={14} style={{ color: confidence.color }} />
                    <span className="text-xs font-semibold" style={{ color: confidence.color }}>
                      {confidence.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-2 flex items-center gap-3 text-xs">
                {drug.cost && (
                  <span className="px-2 py-0.5 rounded" style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)'
                  }}>
                    Cost: {drug.cost}
                  </span>
                )}
                {drug.formularyStatus && (
                  <span className="px-2 py-0.5 rounded" style={{ 
                    backgroundColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)'
                  }}>
                    {drug.formularyStatus}
                  </span>
                )}
                {drug.ethnicityConsiderations && (
                  <span className="px-2 py-0.5 rounded" style={{ 
                    backgroundColor: '#8b5cf620',
                    color: '#8b5cf6'
                  }}>
                    Ethnicity considerations
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 rounded-lg border" style={{ 
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)'
      }}>
        <div className="flex items-center gap-2 text-xs">
          <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
          <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Preferred: 
          </span>
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
            {sortedDrugs[0]?.drugName}
          </span>
          <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
            (Grade {sortedDrugs[0]?.evidenceGrade} evidence, {confidenceConfig[sortedDrugs[0]?.confidence].label})
          </span>
        </div>
      </div>
    </div>
  );
};
