import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Plus, 
  Clock, 
  Trash2, 
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Palette,
  Activity,
  AlertTriangle,
  FileText,
  MessageSquare,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { PatientSummaryStrip } from './PatientSummaryStrip';
import { ClinicalNoteEditor } from './ClinicalNoteEditor';
import { AnalysisTimeline } from './AnalysisTimeline';
import { EvidencePanel } from './EvidencePanel';
import { DifferentialDiagnosisTable } from './DifferentialDiagnosisTable';
import { DrugCard } from './DrugCard';
import { DrugInteractionMatrix } from './DrugInteractionMatrix';
import { PharmacogenomicsDashboard } from './PharmacogenomicsDashboard';
import { ClinicalAlertsPanel } from './ClinicalAlertsPanel';
import { EvidenceBubbleChart } from './EvidenceBubbleChart';
import { RiskStratificationGauge } from './RiskStratificationGauge';
import { DrugEfficacyComparison } from './DrugEfficacyComparison';
import { ExportPanel } from './ExportPanel';
import { ClinicalPathwayTemplate } from './ClinicalPathwayTemplate';
import type { PatientSummary, StructuredClinicalReport } from '../../types/clinical';

interface ClinicalWorkbenchProps {
  // State
  patient: PatientSummary | null;
  report: StructuredClinicalReport | null;
  _messages: Array<{ 
    role: string; 
    content: string;
    type?: 'chat_only' | 'report_update' | 'initial_analysis' | 'error';
    intent?: string;
  }>;
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
  _messages,
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
  const [chatExpanded, setChatExpanded] = useState(true);
  const [chatMaximized, setChatMaximized] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const maximizedChatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [_messages, statusUpdates]);

  // Auto-expand chat when new messages come in or loading starts
  useEffect(() => {
    if (_messages.length > 0 || loading) {
      // eslint-disable-next-line react-hooks/rules-of-hooks -- safe: only expands, no cascading
      setChatExpanded(prev => prev ? prev : true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_messages.length, loading]);

  // Filter out only chat-relevant messages (skip initial_analysis system messages)
  const chatMessages = _messages.filter(msg => {
    // Always show user messages
    if (msg.role === 'user') return true;
    // Show all assistant messages except the initial boilerplate
    if (msg.role === 'assistant') {
      if (msg.type === 'initial_analysis' && msg.content === "I've completed the initial clinical analysis. See the report.") return false;
      if (msg.type === 'initial_analysis' && msg.content === "I've completed the clinical analysis. See the report on the right.") return false;
      return true;
    }
    return true;
  });

  const hasChatMessages = chatMessages.length > 0;

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* ═══════════════════════════════════════════════════════ */}
      {/* Left Sidebar - Navigation                              */}
      {/* ═══════════════════════════════════════════════════════ */}
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
                <div
                  key={conv.id}
                  onClick={() => onLoadConversation(conv.id)}
                  className="w-full text-left p-3 rounded-lg flex flex-col gap-1.5 transition-colors group"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
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
                </div>
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

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Main Content Area                                      */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Patient Summary Strip */}
        <PatientSummaryStrip patient={patient} />

        {/* Clinical Workspace (horizontal split: center + right panel) */}
        <div className="flex-1 flex overflow-hidden">

          {/* Center Panel - Report + Chat */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* ═══════════ TOP: Clinical Report (scrollable) ═══════════ */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {!report ? (
                // Welcome Screen (no report yet)
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

                  {/* Risk Stratification Gauge */}
                  <RiskStratificationGauge report={report} />

                  {/* Empty Report Warning */}
                  {report.differentialDiagnosis.length === 0 && report.drugRecommendations.length === 0 && (
                    <div className="p-6 rounded-lg border" style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={20} style={{ color: '#ef4444' }} />
                        <div>
                          <h4 className="text-sm font-semibold mb-2" style={{ color: '#ef4444' }}>Limited Analysis Generated</h4>
                          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>The AI completed analysis but returned minimal structured data.</p>
                          <ul className="text-sm space-y-1" style={{ color: 'var(--text-muted)' }}>
                            <li>• Patient symptoms unclear or incomplete</li>
                            <li>• LLM response parsing failed</li>
                            <li>• No matching research/drug data found</li>
                          </ul>
                          <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
                            <span className="font-semibold">Raw assessment:</span> {report.assessment || 'No assessment text available'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

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

                  {/* Drug Interaction Matrix */}
                  {report.drugInteractions.length > 0 && report.drugRecommendations.length > 0 && (
                    <DrugInteractionMatrix 
                      interactions={report.drugInteractions}
                      medications={report.drugRecommendations.map((d: any) => d.drugName)}
                    />
                  )}

                  {/* Pharmacogenomics Dashboard */}
                  {report.pharmacogenomics.length > 0 && (
                    <PharmacogenomicsDashboard findings={report.pharmacogenomics} />
                  )}

                  {/* Drug Efficacy Comparison */}
                  {report.drugRecommendations.length > 1 && (
                    <DrugEfficacyComparison drugs={report.drugRecommendations} />
                  )}

                  {/* Evidence Bubble Chart */}
                  {report.researchEvidence.length > 0 && (
                    <EvidenceBubbleChart papers={report.researchEvidence} />
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

                  {/* Clinical Alerts Panel */}
                  {report.alerts.length > 0 && (
                    <ClinicalAlertsPanel alerts={report.alerts} />
                  )}

                  {/* Clinical Pathway Template */}
                  {(report.differentialDiagnosis.length > 0 || report.drugRecommendations.length > 0 || report.workupRecommendations.length > 0) && (
                    <ClinicalPathwayTemplate 
                      diagnoses={report.differentialDiagnosis}
                      drugs={report.drugRecommendations}
                      workups={report.workupRecommendations}
                    />
                  )}

                  {/* Export Panel */}
                  <ExportPanel report={report} />
                </div>
              )}
            </div>

            {/* ═══════════ BOTTOM: Chat Panel (separate from report) ═══════════ */}
            <div 
              className="shrink-0 flex flex-col border-t"
              style={{ 
                borderColor: 'var(--border-strong)',
                backgroundColor: 'var(--bg-panel)',
                maxHeight: chatExpanded ? '45%' : 'auto',
              }}
            >
              {/* Chat Panel Header (toggle bar) */}
              <button
                onClick={() => setChatExpanded(!chatExpanded)}
                className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:opacity-80"
                style={{ 
                  color: 'var(--text-muted)',
                  backgroundColor: 'var(--bg-surface)',
                  borderBottom: chatExpanded ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} />
                  <span>Conversation</span>
                  {hasChatMessages && (
                    <span 
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                    >
                      {chatMessages.length}
                    </span>
                  )}
                  {loading && (
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--accent)' }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
                      Processing...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {hasChatMessages && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatMaximized(true);
                      }}
                      className="p-1 rounded transition-colors hover:opacity-70"
                      style={{ color: 'var(--text-muted)' }}
                      title="Expand conversation"
                    >
                      <Maximize2 size={13} />
                    </button>
                  )}
                  {chatExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </div>
              </button>

              {/* Chat Messages (scrollable) */}
              {chatExpanded && (
                <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-3" style={{ maxHeight: '350px' }}>
                  {/* Loading State - Analysis Timeline */}
                  {loading && statusUpdates.length > 0 && (
                    <AnalysisTimeline stages={statusUpdates.map((msg, idx) => ({
                      stage: idx === statusUpdates.length - 1 ? 'active' : 'completed',
                      message: msg,
                      status: idx === statusUpdates.length - 1 ? 'active' : 'completed'
                    }))} />
                  )}

                  {/* Chat Messages */}
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border"
                      style={{
                        backgroundColor: msg.role === 'user' ? 'var(--bg-surface)' : 'var(--bg-panel)',
                        borderColor: 'var(--border-subtle)',
                        marginLeft: msg.role === 'user' ? '0' : '12px',
                        borderLeft: msg.role === 'assistant' ? '3px solid var(--accent)' : 'none'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          {msg.role === 'user' ? 'You' : 'MedLens'}
                        </span>
                        {msg.type && msg.role === 'assistant' && (
                          <>
                            <span style={{ color: 'var(--border-subtle)' }}>·</span>
                            {msg.type === 'report_update' ? (
                              <span 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide"
                                style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}
                              >
                                <FileText size={9} />
                                Report Updated
                              </span>
                            ) : msg.type === 'initial_analysis' ? (
                              <span 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide"
                                style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}
                              >
                                <Activity size={9} />
                                Analysis Complete
                              </span>
                            ) : (
                              <span 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide"
                                style={{ backgroundColor: 'rgba(100, 116, 139, 0.1)', color: '#64748b' }}
                              >
                                <MessageSquare size={9} />
                                Chat
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="markdown-content text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-base font-bold mt-3 mb-2" style={{ color: 'var(--text-primary)' }} {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-sm font-bold mt-2 mb-1" style={{ color: 'var(--text-primary)' }} {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-sm font-semibold mt-2 mb-1" style={{ color: 'var(--text-secondary)' }} {...props} />,
                              strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                              em: ({node, ...props}) => <em className="italic" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1 ml-4" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1 ml-4" {...props} />,
                              li: ({node, ...props}) => <li className="pl-1" {...props} />,
                              p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                              code: ({node, inline, ...props}: any) => 
                                inline ? (
                                  <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-surface)', fontFamily: 'monospace' }} {...props} />
                                ) : (
                                  <code className="block p-3 my-2 rounded text-xs overflow-x-auto" style={{ backgroundColor: 'var(--bg-surface)', fontFamily: 'monospace' }} {...props} />
                                ),
                              blockquote: ({node, ...props}) => (
                                <blockquote 
                                  className="border-l-4 pl-4 my-3 italic" 
                                  style={{ borderColor: 'var(--accent)', color: 'var(--text-muted)' }} 
                                  {...props} 
                                />
                              ),
                              hr: ({node, ...props}) => <hr className="my-4" style={{ borderColor: 'var(--border-subtle)' }} {...props} />,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <span>{msg.content}</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Scroll anchor */}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* Pinned Input (always visible) */}
              <div className="shrink-0">
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

          {/* ═══════════ Right Panel - Evidence ═══════════ */}
          {rightPanelOpen && (
            <>
              <button
                onClick={() => setRightPanelOpen(false)}
                className="shrink-0 p-1.5 rounded-lg transition-colors z-10"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  marginLeft: '-8px'
                }}
                title="Close evidence panel"
              >
                <ChevronLeft size={16} />
              </button>
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

          {!rightPanelOpen && (
            <button
              onClick={() => setRightPanelOpen(true)}
              className="shrink-0 p-1.5 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)'
              }}
              title="Open evidence panel"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Maximized Chat Overlay                                  */}
      {/* ═══════════════════════════════════════════════════════ */}
      {chatMaximized && (
        <div 
          className="fixed inset-0 z-50 flex flex-col"
          style={{ backgroundColor: 'var(--bg-base)' }}
        >
          {/* Overlay Header */}
          <div 
            className="shrink-0 flex items-center justify-between px-6 py-3 border-b"
            style={{ 
              backgroundColor: 'var(--bg-surface)', 
              borderColor: 'var(--border-subtle)' 
            }}
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={18} style={{ color: 'var(--accent)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Conversation
              </h2>
              <span 
                className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                {chatMessages.length} messages
              </span>
            </div>
            <button
              onClick={() => setChatMaximized(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
              style={{ 
                backgroundColor: 'var(--bg-panel)', 
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <Minimize2 size={14} />
              Minimize
            </button>
          </div>

          {/* Overlay Messages — full height scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {loading && statusUpdates.length > 0 && (
                <AnalysisTimeline stages={statusUpdates.map((msg, idx) => ({
                  stage: idx === statusUpdates.length - 1 ? 'active' : 'completed',
                  message: msg,
                  status: idx === statusUpdates.length - 1 ? 'active' : 'completed'
                }))} />
              )}

              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border"
                  style={{
                    backgroundColor: msg.role === 'user' ? 'var(--bg-surface)' : 'var(--bg-panel)',
                    borderColor: 'var(--border-subtle)',
                    marginLeft: msg.role === 'user' ? '0' : '16px',
                    borderLeft: msg.role === 'assistant' ? '4px solid var(--accent)' : 'none'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                      {msg.role === 'user' ? 'You' : 'MedLens'}
                    </span>
                    {msg.type && msg.role === 'assistant' && (
                      <>
                        <span style={{ color: 'var(--border-subtle)' }}>·</span>
                        {msg.type === 'report_update' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium uppercase" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                            <FileText size={9} /> Report Updated
                          </span>
                        ) : msg.type === 'initial_analysis' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium uppercase" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                            <Activity size={9} /> Analysis Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium uppercase" style={{ backgroundColor: 'rgba(100,116,139,0.1)', color: '#64748b' }}>
                            <MessageSquare size={9} /> Chat
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="markdown-content text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          h1: ({node: _n, ...props}) => <h1 className="text-lg font-bold mt-4 mb-2" style={{ color: 'var(--text-primary)' }} {...props} />,
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          h2: ({node: _n, ...props}) => <h2 className="text-base font-bold mt-3 mb-2" style={{ color: 'var(--text-primary)' }} {...props} />,
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          h3: ({node: _n, ...props}) => <h3 className="text-sm font-semibold mt-3 mb-1.5" style={{ color: 'var(--text-secondary)' }} {...props} />,
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          strong: ({node: _n, ...props}) => <strong className="font-semibold" {...props} />,
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          em: ({node: _n, ...props}) => <em className="italic" {...props} />,
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          ul: ({node: _n, ...props}) => <ul className="list-disc list-inside my-2 space-y-1.5 ml-4" {...props} />,
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          ol: ({node: _n, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1.5 ml-4" {...props} />,
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          li: ({node: _n, ...props}) => <li className="pl-1" {...props} />,
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          p: ({node: _n, ...props}) => <p className="mb-2.5 last:mb-0" {...props} />,
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          code: ({node: _n, inline, ...props}: any) => 
                            inline ? (
                              <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-surface)', fontFamily: 'monospace' }} {...props} />
                            ) : (
                              <code className="block p-3 my-2 rounded text-xs overflow-x-auto" style={{ backgroundColor: 'var(--bg-surface)', fontFamily: 'monospace' }} {...props} />
                            ),
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          blockquote: ({node: _n, ...props}) => (
                            <blockquote className="border-l-4 pl-4 my-3 italic" style={{ borderColor: 'var(--accent)', color: 'var(--text-muted)' }} {...props} />
                          ),
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          hr: ({node: _n, ...props}) => <hr className="my-4" style={{ borderColor: 'var(--border-subtle)' }} {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <span>{msg.content}</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={maximizedChatEndRef} />
            </div>
          </div>

          {/* Overlay Input */}
          <div className="shrink-0 border-t" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-panel)' }}>
            <div className="max-w-3xl mx-auto">
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
      )}
    </div>
  );
};
