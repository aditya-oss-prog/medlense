import React, { useState } from 'react';
import { 
  BookOpen, 
  Pill, 
  Dna, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText
} from 'lucide-react';
import type { 
  ResearchPaper, 
  DrugRecommendation, 
  PharmacogenomicFinding,
  ClinicalAlert,
  DrugInteraction
} from '../../types/clinical';

interface EvidencePanelProps {
  papers?: ResearchPaper[];
  drugs?: DrugRecommendation[];
  pharmacogenomics?: PharmacogenomicFinding[];
  alerts?: ClinicalAlert[];
  interactions?: DrugInteraction[];
}

type EvidenceTab = 'all' | 'papers' | 'drugs' | 'pgx' | 'alerts' | 'interactions';

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  papers = [],
  drugs = [],
  pharmacogenomics = [],
  alerts = [],
  interactions = []
}) => {
  const [activeTab, setActiveTab] = useState<EvidenceTab>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedItems(newSet);
  };

  const getCount = (tab: EvidenceTab): number => {
    switch (tab) {
      case 'all': return papers.length + drugs.length + pharmacogenomics.length + alerts.length + interactions.length;
      case 'papers': return papers.length;
      case 'drugs': return drugs.length;
      case 'pgx': return pharmacogenomics.length;
      case 'alerts': return alerts.length;
      case 'interactions': return interactions.length;
    }
  };

  const getFilteredItems = (tab: EvidenceTab) => {
    switch (tab) {
      case 'papers': return papers.map(p => ({ ...p, type: 'paper' as const }));
      case 'drugs': return drugs.map(d => ({ ...d, type: 'drug' as const }));
      case 'pgx': return pharmacogenomics.map(p => ({ ...p, type: 'pgx' as const }));
      case 'alerts': return alerts.map(a => ({ ...a, type: 'alert' as const }));
      case 'interactions': return interactions.map(i => ({ ...i, type: 'interaction' as const }));
      case 'all':
        return [
          ...papers.map(p => ({ ...p, type: 'paper' as const })),
          ...drugs.map(d => ({ ...d, type: 'drug' as const })),
          ...pharmacogenomics.map(p => ({ ...p, type: 'pgx' as const })),
          ...alerts.map(a => ({ ...a, type: 'alert' as const })),
          ...interactions.map(i => ({ ...i, type: 'interaction' as const }))
        ];
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'paper': return BookOpen;
      case 'drug': return Pill;
      case 'pgx': return Dna;
      case 'alert': return AlertTriangle;
      case 'interaction': return AlertTriangle;
      default: return FileText;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'paper': return 'var(--accent)';
      case 'drug': return '#3b82f6';
      case 'pgx': return '#8b5cf6';
      case 'alert': return '#ef4444';
      case 'interaction': return '#f59e0b';
      default: return 'var(--text-muted)';
    }
  };

  const items = getFilteredItems(activeTab);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-panel)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Evidence Panel
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {items.length} evidence items found
        </p>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 border-b flex items-center gap-1 overflow-x-auto" style={{ borderColor: 'var(--border-subtle)' }}>
        {(['all', 'papers', 'drugs', 'pgx', 'alerts', 'interactions'] as EvidenceTab[]).map(tab => {
          const count = getCount(tab);
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {tab === 'all' && 'All'}
              {tab === 'papers' && 'PubMed'}
              {tab === 'drugs' && 'Drugs'}
              {tab === 'pgx' && 'PGx'}
              {tab === 'alerts' && 'Alerts'}
              {tab === 'interactions' && 'Interactions'}
              {count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px]" style={{
                  backgroundColor: isActive ? 'var(--accent)' : 'var(--border-subtle)',
                  color: isActive ? 'white' : 'var(--text-muted)'
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Evidence List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={32} className="mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No evidence items</p>
          </div>
        ) : (
          items.map((item: any) => {
            const Icon = getIcon(item.type);
            const color = getColor(item.type);
            const isExpanded = expandedItems.has(item.id);
            const title = item.title || item.drugName || item.gene || item.condition || item.message;
            const subtitle = item.journal || item.indication || item.drugAffected || item.description;

            return (
              <div
                key={item.id}
                className="border rounded-lg overflow-hidden transition-all hover:shadow-sm"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: isExpanded ? color : 'var(--border-subtle)'
                }}
              >
                <div
                  className="px-3 py-2.5 flex items-start gap-3 cursor-pointer"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}20` }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
                        {item.type}
                      </span>
                      {item.relevance && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                          backgroundColor: item.relevance === 'High' ? 'rgba(34,197,94,0.15)' : 
                                         item.relevance === 'Medium' ? 'rgba(245,158,11,0.15)' : 
                                         'rgba(239,68,68,0.15)',
                          color: item.relevance === 'High' ? '#22c55e' :
                                 item.relevance === 'Medium' ? '#f59e0b' : '#ef4444'
                        }}>
                          {item.relevance}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-medium mt-1 truncate" style={{ color: 'var(--text-primary)' }}>
                      {title}
                    </h4>
                    {subtitle && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {subtitle}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>

                {isExpanded && item.abstract && (
                  <div className="px-3 py-3 border-t text-sm leading-relaxed" style={{
                    backgroundColor: 'var(--bg-panel)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)'
                  }}>
                    {item.abstract}
                  </div>
                )}

                {isExpanded && item.clinicalImplication && (
                  <div className="px-3 py-3 border-t text-sm leading-relaxed" style={{
                    backgroundColor: 'var(--bg-panel)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)'
                  }}>
                    <span className="font-semibold mb-1 block" style={{ color: 'var(--text-primary)' }}>
                      Clinical Implication:
                    </span>
                    {item.clinicalImplication}
                  </div>
                )}

                {isExpanded && item.pmid && (
                  <div className="px-3 py-2 border-t flex items-center justify-between" style={{
                    backgroundColor: 'var(--bg-panel)',
                    borderColor: 'var(--border-subtle)'
                  }}>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      PMID: {item.pmid}
                    </span>
                    <button className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--accent)' }}>
                      View Source <ExternalLink size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
