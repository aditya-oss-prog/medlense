import React from 'react';
import { Circle, TrendingUp, BookOpen, Award } from 'lucide-react';
import type { ResearchPaper, Probability } from '../../types/clinical';

interface EvidenceBubbleChartProps {
  papers: ResearchPaper[];
}

const relevanceConfig: Record<Probability, { color: string; sizeMultiplier: number }> = {
  High: { color: '#ef4444', sizeMultiplier: 1.5 },
  Medium: { color: '#f59e0b', sizeMultiplier: 1.0 },
  Low: { color: '#3b82f6', sizeMultiplier: 0.7 },
};

const studyTypeConfig: Record<string, { color: string; label: string }> = {
  'Meta-analysis': { color: '#8b5cf6', label: 'MA' },
  'RCT': { color: '#3b82f6', label: 'RCT' },
  'Cohort': { color: '#22c55e', label: 'COH' },
  'Case Series': { color: '#f59e0b', label: 'CS' },
  'Review': { color: '#9ca3af', label: 'REV' },
};

export const EvidenceBubbleChart: React.FC<EvidenceBubbleChartProps> = ({ papers }) => {
  if (!papers || papers.length === 0) {
    return (
      <div className="p-6 text-center" style={{ color: 'var(--text-muted)' }}>
        <p className="text-sm">No research evidence available</p>
      </div>
    );
  }

  // Sort by relevance score
  const sortedPapers = [...papers].sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  // Calculate chart dimensions
  const maxSampleSize = Math.max(...papers.map(p => p.sampleSize || 100));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Evidence Landscape
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Circle size={10} style={{ color: relevanceConfig.High.color }} />
            <span style={{ color: 'var(--text-muted)' }}>High relevance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Circle size={10} style={{ color: relevanceConfig.Medium.color }} />
            <span style={{ color: 'var(--text-muted)' }}>Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Circle size={10} style={{ color: relevanceConfig.Low.color }} />
            <span style={{ color: 'var(--text-muted)' }}>Low</span>
          </div>
        </div>
      </div>

      {/* Bubble Chart Grid */}
      <div className="p-4 rounded-lg border" style={{ 
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)'
      }}>
        <div className="grid grid-cols-3 gap-4">
          {sortedPapers.map((paper, idx) => {
            const relevance = relevanceConfig[paper.relevance];
            const studyType = studyTypeConfig[paper.studyType || 'Unknown'] || { color: '#9ca3af', label: 'UNK' };
            const size = Math.max(40, Math.min(80, (paper.sampleSize || 100) / maxSampleSize * 60 * relevance.sizeMultiplier));

            return (
              <div 
                key={paper.id || idx}
                className="relative flex flex-col items-center"
                style={{ minHeight: '120px' }}
              >
                {/* Bubble */}
                <div 
                  className="rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity shadow-lg"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: `${relevance.color}20`,
                    border: `2px solid ${relevance.color}`,
                    marginBottom: '8px'
                  }}
                  title={`${paper.title}\n\nSample: ${paper.sampleSize || 'N/A'}\n\nRelevance: ${paper.relevance}`}
                >
                  <span className="text-xs font-bold" style={{ color: relevance.color }}>
                    {studyType.label}
                  </span>
                </div>

                {/* Label */}
                <div className="text-center">
                  <p className="text-xs font-semibold truncate max-w-[100px]" style={{ color: 'var(--text-primary)' }}>
                    {paper.year}
                  </p>
                  <p className="text-[10px] truncate max-w-[100px]" style={{ color: 'var(--text-muted)' }}>
                    {paper.sampleSize ? `${paper.sampleSize} pts` : 'N/A'}
                  </p>
                </div>

                {/* Ethnicity indicator */}
                {paper.ethnicitySpecific && (
                  <div className="absolute top-0 right-0">
                    <Award size={12} style={{ color: '#8b5cf6' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border text-center" style={{ 
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)'
        }}>
          <TrendingUp size={16} className="mx-2 mb-1" style={{ color: 'var(--accent)' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {papers.length}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Papers
          </p>
        </div>
        <div className="p-3 rounded-lg border text-center" style={{ 
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)'
        }}>
          <BookOpen size={16} className="mx-2 mb-1" style={{ color: '#3b82f6' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {papers.filter(p => p.studyType === 'RCT').length}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            RCTs
          </p>
        </div>
        <div className="p-3 rounded-lg border text-center" style={{ 
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)'
        }}>
          <Award size={16} className="mx-2 mb-1" style={{ color: '#8b5cf6' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {papers.filter(p => p.ethnicitySpecific).length}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Ethnicity-specific
          </p>
        </div>
        <div className="p-3 rounded-lg border text-center" style={{ 
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)'
        }}>
          <Circle size={16} className="mx-2 mb-1" style={{ color: '#ef4444' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {papers.filter(p => p.relevance === 'High').length}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            High relevance
          </p>
        </div>
      </div>
    </div>
  );
};
