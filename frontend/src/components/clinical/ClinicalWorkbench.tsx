import React, { useState } from 'react';
import { 
  Plus, 
  Clock, 
  Trash2, 
  ChevronLeft,
  ChevronRight,
  Palette,
  Activity,
  FileText,
  X,
  AlertTriangle
} from 'lucide-react';
import { PatientSummaryStrip } from './PatientSummaryStrip';
import { ClinicalNoteEditor } from './ClinicalNoteEditor';
import { AnalysisTimeline } from './AnalysisTimeline';
import { EvidencePanel } from './EvidencePanel';
import { DifferentialDiagnosisTable } from './DifferentialDiagnosisTable';
import { DrugCard } from './DrugCard';
import type { PatientSummary, StructuredClinicalReport } from '../../types/clinical';

interface ClinicalWorkbenchProps {
  // State
  patient: PatientSummary | null;
  report: StructuredClinicalReport | null;
  _messages: Array<{ role: string; content: string }>;
  loading: boolean;
  statusUpdates: string[];
  
  // Actions
  onNewCase: () => void;
  onSubmitCase: (note: string) => void;
  onStopAnalysis: () => void;
  onNoteChange: (note: string) => void;
  currentNote: string;
  
  // Sidebar
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  conversations: any[];
  onLoadConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  
  // Theme
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

export const ClinicalWorkbench: React.FC<ClinicalWorkbenchProps> = ({
  patient,
  report,
  _messages: _messages,
  loading,
  statusUpdates,
  onNewCase,
  onSubmitCase,
  onStopAnalysis,
  onNoteChange,
  currentNote,
  sidebarOpen,
  onToggleSidebar,
  conversations,
  onLoadConversation,
  onDeleteConversation,
  currentTheme,
  onThemeChange,
}) => {
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [_rightPanelWidth, _setRightPanelWidth] = useState(25); // percentage - reserved for future drag resize

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Left Sidebar - Navigation */}
      <aside
        className="flex flex-col shrink-0 transition-all duration-300 overflow-hidden z-20"
        style={{
          width: sidebarOpen ? '280px' : '64px',
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: sidebarOpen ? 'none' : '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
              <Activity size={18} strokeWidth={2.5} />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <h1 className="font-semibold text-sm tracking-wide">MedLens</h1>
                <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>
                  Clinical Workbench
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onToggleSidebar}
            className="shrink-0 p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* New Case Button */}
        <div className="px-4 pb-4 pt-2">
          <button
            onClick={onNewCase}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all shadow-sm text-sm font-medium hover:opacity-90"
            style={{ backgroundColor: 'var(--button-bg)', color: 'var(--button-text)' }}
          >
            <Plus size={16} className="shrink-0" />
            {sidebarOpen && <span>New Clinical Analysis</span>}
          </button>
        </div>

        {/* Conversations List */}
        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto px-3 py-2">
            <h3 className="px-3 text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Recent Cases
            </h3>
            <div className="space-y-1">
              {conversations.slice(0, 10).map(conv => (
                <button
                  key={conv.id}
                  onClick={() => onLoadConversation(conv.id)}
                  className="w-full text-left p-3 rounded-lg flex flex-col gap-1.5 transition-colors group"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid transparent',
                    color: 'var(--text-muted)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--border-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span className="text-sm truncate w-full font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {conv.title}
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} />
                      <span>{conv.last_activity}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      className="p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100"
                      style={{ color: 'var(--text-placeholder)' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Theme Switcher */}
        {sidebarOpen && (
          <div className="p-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--text-muted)' }}>
              <Palette size={14} />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Theme</span>
            </div>
            <div className="flex gap-2">
              {['stone', 'clinical', 'sage', 'midnight'].map(theme => (
                <button
                  key={theme}
                  onClick={() => onThemeChange(theme)}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: theme === 'midnight' ? '#0B1120' : theme === 'stone' ? '#FAF9F6' : theme === 'clinical' ? '#F8FAFC' : '#F4F5F0',
                    borderColor: currentTheme === theme ? 'var(--accent)' : 'transparent',
                  }}
                  title={theme}
                />
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Patient Summary Strip */}
        <PatientSummaryStrip patient={patient} />

        {/* Clinical Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Center Panel - Clinical Report */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {!report ? (
                // Welcome Screen
                <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                    <Activity size={40} />
                  </div>
                  <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                    Clinical Workbench
                  </h1>
                  <p className="text-base mb-8 max-w-md text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Enter a patient case to generate a structured clinical analysis with differential diagnosis, drug recommendations, and evidence-based insights.
                  </p>
                </div>
              ) : (
                // Clinical Report
                <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                  {/* Report Header */}
                  <div className="pb-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                          Clinical Analysis Report
                        </h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                          Generated {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide" style={{
                          backgroundColor: report.complexityLevel === 'high-risk' ? 'rgba(239,68,68,0.15)' :
                                         report.complexityLevel === 'complex' ? 'rgba(245,158,11,0.15)' :
                                         'rgba(34,197,94,0.15)',
                          color: report.complexityLevel === 'high-risk' ? '#ef4444' :
                                 report.complexityLevel === 'complex' ? '#f59e0b' : '#22c55e'
                        }}>
                          {report.complexityLevel || 'Standard'} Complexity
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Differential Diagnosis */}
                  {report.differentialDiagnosis.length > 0 && (
                    <DifferentialDiagnosisTable diagnoses={report.differentialDiagnosis} />
                  )}

                  {/* Drug Recommendations */}
                  {report.drugRecommendations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>
                        Drug Recommendations
                      </h3>
                      <div className="space-y-3">
                        {report.drugRecommendations.map((drug: any) => (
                          <DrugCard key={drug.id} drug={drug} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assessment & Plan */}
                  {(report.assessment || report.plan.length > 0) && (
                    <div className="p-5 rounded-lg border" style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)'
                    }}>
                      <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>
                        Assessment & Plan
                      </h3>
                      {report.assessment && (
                        <div className="mb-4">
                          <span className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: 'var(--text-muted)' }}>
                            Assessment
                          </span>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {report.assessment}
                          </p>
                        </div>
                      )}
                      {report.plan.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: 'var(--text-muted)' }}>
                            Plan
                          </span>
                          <ul className="space-y-2">
                            {report.plan.map((item: any, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Alerts */}
                  {report.alerts.length > 0 && (
                    <div className="space-y-2">
                      {report.alerts.map((alert: any) => (
                        <div key={alert.id} className={`p-4 rounded-lg border flex items-start gap-3 ${
                          alert.severity === 'critical' ? 'bg-red-900/20 border-red-800/30' :
                          alert.severity === 'high' ? 'bg-orange-900/20 border-orange-800/30' :
                          'bg-yellow-900/20 border-yellow-800/30'
                        }`}>
                          <AlertTriangle size={18} className={`shrink-0 mt-0.5 ${
                            alert.severity === 'critical' ? 'text-red-400' :
                            alert.severity === 'high' ? 'text-orange-400' :
                            'text-yellow-400'
                          }`} />
                          <div>
                            <h4 className={`text-sm font-semibold ${
                              alert.severity === 'critical' ? 'text-red-300' :
                              alert.severity === 'high' ? 'text-orange-300' :
                              'text-yellow-300'
                            }`}>
                              {alert.title}
                            </h4>
                            <p className={`text-sm mt-1 ${
                              alert.severity === 'critical' ? 'text-red-200' :
                              alert.severity === 'high' ? 'text-orange-200' :
                              'text-yellow-200'
                            }`}>
                              {alert.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Loading State - Analysis Timeline */}
              {loading && statusUpdates.length > 0 && (
                <AnalysisTimeline stages={statusUpdates.map((msg, idx) => ({
                  stage: idx === statusUpdates.length - 1 ? 'active' : 'completed',
                  message: msg,
                  status: idx === statusUpdates.length - 1 ? 'active' : 'completed'
                }))} />
              )}

              {/* Clinical Note Editor */}
              <div className="mt-auto">
                <ClinicalNoteEditor
                  value={currentNote}
                  onChange={onNoteChange}
                  onSubmit={() => onSubmitCase(currentNote)}
                  onStop={onStopAnalysis}
                  loading={loading}
                  hasReport={!!report}
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Evidence */}
          {rightPanelOpen && (
            <>
              <div
                className="w-px shrink-0 cursor-col-resize hover:bg-[var(--accent)] transition-colors"
                style={{ backgroundColor: 'var(--border-subtle)' }}
              />
              <div
                className="h-full overflow-hidden shrink-0"
                style={{ width: '25%', minWidth: '300px', maxWidth: '450px' }}
              >
                <EvidencePanel
                  papers={report?.researchEvidence || []}
                  drugs={report?.drugRecommendations || []}
                  pharmacogenomics={report?.pharmacogenomics || []}
                  alerts={report?.alerts || []}
                  interactions={report?.drugInteractions || []}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toggle Evidence Panel Button */}
      {!rightPanelOpen && (
        <button
          onClick={() => setRightPanelOpen(true)}
          className="absolute right-6 bottom-32 p-3 rounded-lg shadow-lg transition-all z-30"
          style={{
            backgroundColor: 'var(--button-bg)',
            color: 'var(--button-text)'
          }}
        >
          <FileText size={20} />
        </button>
      )}

      {/* Close Evidence Panel Button */}
      {rightPanelOpen && (
        <button
          onClick={() => setRightPanelOpen(false)}
          className="absolute right-6 bottom-32 p-3 rounded-lg shadow-lg transition-all z-30"
          style={{
            backgroundColor: 'var(--bg-panel)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
};
