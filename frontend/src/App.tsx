import { useState, useEffect } from 'react';
import { ClinicalWorkbench } from './components/clinical/ClinicalWorkbench';
import type { PatientSummary, StructuredClinicalReport } from './types/clinical';

// ─── Types (legacy compatibility) ────────────────────────────────────────────

type Message = {
  role: 'user' | 'assistant';
  content: string;
  type?: 'chat_only' | 'report_update' | 'initial_analysis' | 'error';
  intent?: string;
};

type PatientData = {
  age?: string | number;
  sex?: string;
  ethnicity?: string;
  country?: string;
  allergies?: string;
  current_medications?: string;
};

type ConversationSummary = {
  id: string;
  title: string;
  created_at: string;
  last_activity: string;
  message_count: number;
  version_count: number;
};

// ─── Themes ───────────────────────────────────────────────────────────────────

const THEMES: Record<string, { name: string; vars: Record<string, string> }> = {
  stone: {
    name: "Warm Stone",
    vars: {
      '--bg-base': '#FAF9F6',
      '--bg-surface': '#F3F2EE',
      '--bg-panel': '#FFFFFF',
      '--text-primary': '#2D2A26',
      '--text-secondary': '#4A4640',
      '--text-muted': '#7A756D',
      '--text-placeholder': '#A39E93',
      '--accent': '#DA7756',
      '--accent-hover': '#C56647',
      '--accent-light': '#FDF0ED',
      '--border-subtle': '#E5E3D8',
      '--border-strong': '#D5D3C8',
      '--button-bg': '#2D2A26',
      '--button-text': '#FAF9F6',
    }
  },
  clinical: {
    name: "Clinical Teal",
    vars: {
      '--bg-base': '#F8FAFC',
      '--bg-surface': '#F1F5F9',
      '--bg-panel': '#FFFFFF',
      '--text-primary': '#0F172A',
      '--text-secondary': '#334155',
      '--text-muted': '#64748B',
      '--text-placeholder': '#94A3B8',
      '--accent': '#0D9488',
      '--accent-hover': '#0F766E',
      '--accent-light': '#F0FDFA',
      '--border-subtle': '#E2E8F0',
      '--border-strong': '#CBD5E1',
      '--button-bg': '#0D9488',
      '--button-text': '#FFFFFF',
    }
  },
  sage: {
    name: "Therapeutic Sage",
    vars: {
      '--bg-base': '#F4F5F0',
      '--bg-surface': '#EBECE6',
      '--bg-panel': '#FFFFFF',
      '--text-primary': '#1C2E26',
      '--text-secondary': '#354F52',
      '--text-muted': '#687B72',
      '--text-placeholder': '#9CAEA4',
      '--accent': '#52796F',
      '--accent-hover': '#354F52',
      '--accent-light': '#E8F0EC',
      '--border-subtle': '#DCE4DD',
      '--border-strong': '#B9C9C0',
      '--button-bg': '#1C2E26',
      '--button-text': '#FFFFFF',
    }
  },
  midnight: {
    name: "Midnight (Dark)",
    vars: {
      '--bg-base': '#0B1120',
      '--bg-surface': '#1A2235',
      '--bg-panel': '#121827',
      '--text-primary': '#F8FAFC',
      '--text-secondary': '#CBD5E1',
      '--text-muted': '#64748B',
      '--text-placeholder': '#475569',
      '--accent': '#6366F1',
      '--accent-hover': '#4F46E5',
      '--accent-light': '#1E1B4B',
      '--border-subtle': '#1E293B',
      '--border-strong': '#334155',
      '--button-bg': '#6366F1',
      '--button-text': '#FFFFFF',
    }
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Parse structured JSON report from LLM
function parseStructuredReport(data: any, patientData: PatientData): StructuredClinicalReport {
  // Helper to normalize severity values
  const normalizeSeverity = (severity: string): 'critical' | 'high' | 'medium' | 'low' => {
    if (!severity) return 'low';
    const lower = severity.toLowerCase();
    if (lower === 'severe' || lower === 'critical') return 'critical';
    if (lower === 'moderate' || lower === 'high') return 'high';
    if (lower === 'mild' || lower === 'medium') return 'medium';
    if (lower === 'none' || lower === 'low') return 'low';
    return 'low'; // Default fallback
  };

  // Normalize confidence/probability: LLM may return "Moderate" instead of "Medium"
  const normalizeProbability = (value: string): 'High' | 'Medium' | 'Low' => {
    if (!value) return 'Medium';
    const lower = value.toLowerCase();
    if (lower === 'high' || lower === 'strong') return 'High';
    if (lower === 'medium' || lower === 'moderate') return 'Medium';
    if (lower === 'low' || lower === 'weak') return 'Low';
    return 'Medium';
  };

  // Normalize evidence grade: LLM may return "B+" or "Level B"
  const normalizeEvidenceGrade = (value: string): 'A' | 'B' | 'C' | 'D' => {
    if (!value) return 'C';
    const upper = value.toUpperCase().charAt(0);
    if (upper === 'A' || upper === 'B' || upper === 'C' || upper === 'D') return upper as 'A' | 'B' | 'C' | 'D';
    return 'C';
  };

  if (!data || typeof data !== 'object') {
    // Fallback for markdown responses or failed parsing
    return {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chiefComplaint: patientData?.age ? `Patient presentation` : 'Clinical analysis',
      differentialDiagnosis: [],
      drugRecommendations: [],
      researchEvidence: [],
      clinicalTrials: [],
      drugInteractions: [],
      pharmacogenomics: [],
      alerts: [],
      workupRecommendations: [],
      guidelineReferences: [],
      assessment: typeof data === 'string' && data.length > 0 ? data : 'Clinical analysis generated but structured data parsing failed. Please check the raw response or retry with more detailed patient information.',
      plan: ['Review clinical findings', 'Consider retrying analysis'],
      followUpRecommendations: [],
      complexityLevel: 'moderate'
    };
  }
  
  // Normalize alert severities
  const normalizedAlerts = (data.alerts || []).map((alert: any) => ({
    ...alert,
    severity: normalizeSeverity(alert.severity)
  }));

  // Normalize drug interaction severities  
  const normalizedInteractions = (data.drugInteractions || []).map((interaction: any) => ({
    ...interaction,
    severity: normalizeSeverity(interaction.severity)
  }));

  // Normalize drug recommendation confidence/evidenceGrade (LLM returns "Moderate" instead of "Medium", etc.)
  const normalizedDrugs = (data.drugRecommendations || []).map((drug: any) => ({
    ...drug,
    confidence: normalizeProbability(drug.confidence),
    evidenceGrade: normalizeEvidenceGrade(drug.evidenceGrade),
  }));

  // Normalize differential diagnosis probability
  const normalizedDiagnoses = (data.differentialDiagnosis || []).map((dx: any) => ({
    ...dx,
    probability: normalizeProbability(dx.probability),
  }));
  
  // Validate that we have at least some meaningful data
  const hasMeaningfulData = 
    (data.differentialDiagnosis && data.differentialDiagnosis.length > 0) ||
    (data.drugRecommendations && data.drugRecommendations.length > 0) ||
    (data.assessment && data.assessment.length > 10);
  
  if (!hasMeaningfulData) {
    // Return report with warning in assessment
    return {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chiefComplaint: data.chiefComplaint || 'Patient presentation',
      differentialDiagnosis: normalizedDiagnoses,
      drugRecommendations: normalizedDrugs,
      researchEvidence: data.researchEvidence || [],
      clinicalTrials: data.clinicalTrials || [],
      drugInteractions: normalizedInteractions,
      pharmacogenomics: data.pharmacogenomics || [],
      alerts: normalizedAlerts,
      workupRecommendations: data.workupRecommendations || [],
      guidelineReferences: data.guidelineReferences || [],
      assessment: 'Analysis completed but returned minimal structured data. The LLM may have encountered issues processing the patient case. Raw response: ' + (data.assessment || 'No assessment text'),
      plan: data.plan || ['Review raw response', 'Consider retrying with more detailed symptoms'],
      followUpRecommendations: data.followUpRecommendations || [],
      complexityLevel: data.complexityLevel || 'moderate'
    };
  }
  
  // Use structured JSON directly
  return {
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    chiefComplaint: data.chiefComplaint || '',
    differentialDiagnosis: normalizedDiagnoses,
    drugRecommendations: normalizedDrugs,
    researchEvidence: data.researchEvidence || [],
    clinicalTrials: data.clinicalTrials || [],
    drugInteractions: normalizedInteractions,
    pharmacogenomics: data.pharmacogenomics || [],
    alerts: normalizedAlerts,
    workupRecommendations: data.workupRecommendations || [],
    guidelineReferences: data.guidelineReferences || [],
    assessment: data.assessment || '',
    plan: data.plan || [],
    followUpRecommendations: data.followUpRecommendations || [],
    complexityLevel: data.complexityLevel || 'moderate'
  };
}

// Convert patient data to PatientSummary
function convertToPatientSummary(data: PatientData): PatientSummary {
  return {
    age: typeof data.age === 'string' ? parseInt(data.age) || undefined : data.age,
    sex: data.sex,
    ethnicity: data.ethnicity,
    country: data.country,
    allergies: data.allergies,
    currentMedications: data.current_medications,
    knownConditions: []
  };
}

// ─── Main App Component ───────────────────────────────────────────────────────

export default function App() {
  // State
  const [currentTheme, setCurrentTheme] = useState('clinical');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentNote, setCurrentNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<string[]>([]);
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [report, setReport] = useState<StructuredClinicalReport | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const API_BASE = 'http://localhost:8000/api';

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.className = `theme-${currentTheme}`;
  }, [currentTheme]);

  // ── API Calls ────────────────────────────────────────────────────────────────

  const loadConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/conversations`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const createConversation = async (): Promise<string> => {
    try {
      const res = await fetch(`${API_BASE}/conversations`, { method: 'POST' });
      const data = await res.json();
      return data.conversation_id;
    } catch (err) {
      console.error('Failed to create conversation:', err);
      return generateId();
    }
  };

  const loadConversation = async (id: string) => {
    setConversationId(id);
    setMessages([]);
    setPatient(null);
    setReport(null);
    
    try {
      // Load messages
      const messagesRes = await fetch(`${API_BASE}/conversations/${id}/messages`);
      const messagesData = await messagesRes.json();
      setMessages(messagesData.messages || []);

      // Load latest version
      const versionsRes = await fetch(`${API_BASE}/conversations/${id}/versions`);
      const versionsData = await versionsRes.json();
      
      if (versionsData.versions && versionsData.versions.length > 0) {
        const latestVersion = versionsData.versions[versionsData.versions.length - 1];
        const versionRes = await fetch(`${API_BASE}/versions/${latestVersion.id}`);
        const versionData = await versionRes.json();
        
        if (versionData.report) {
          try {
            const reportData = typeof versionData.report === 'string' ? JSON.parse(versionData.report) : versionData.report;
            const structuredReport = parseStructuredReport(reportData, versionData.patient_data || {});
            setReport(structuredReport);
            setPatient(convertToPatientSummary(versionData.patient_data || {}));
          } catch (e) {
            const structuredReport = parseStructuredReport(versionData.report, versionData.patient_data || {});
            setReport(structuredReport);
            setPatient(convertToPatientSummary(versionData.patient_data || {}));
          }
        }
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (conversationId === id) {
        setConversationId(null);
        setMessages([]);
        setPatient(null);
        setReport(null);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const stopAnalysis = () => {
    console.log('[stopAnalysis] Called');
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setLoading(false);
    setStatusUpdates([]);
    console.log('[stopAnalysis] Loading reset to false');
  };

  const submitCase = async (note: string) => {
    console.log('[submitCase] Called with note:', note);
    console.log('[submitCase] loading state:', loading);
    console.log('[submitCase] conversationId:', conversationId);
    console.log('[submitCase] has report:', !!report);
    console.log('[submitCase] has patient:', !!patient);

    if (!note.trim()) {
      console.error('[submitCase] Empty note - returning early');
      return;
    }
    if (loading) {
      console.error('[submitCase] Already loading - returning early');
      return;
    }

    setLoading(true);
    setStatusUpdates([]);

    const isNewConversation = !conversationId;
    const convId = conversationId || await createConversation();
    
    console.log('[submitCase] Using conversation ID:', convId);
    console.log('[submitCase] Is new conversation:', isNewConversation);
    
    if (isNewConversation) {
      setConversationId(convId);
      setMessages([]);
    }

    // Add user message
    const userMessage: Message = { role: 'user', content: note };
    setMessages(prev => [...prev, userMessage]);

    try {
      console.log('[submitCase] Making API request to:', `${API_BASE}/analyze`);
      
      // Send full report JSON for follow-ups so backend can merge changes properly
      let currentReportJson: string | undefined = undefined;
      if (report) {
        try {
          // Serialize the full structured report (minus UI-only fields)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, createdAt: _ca, updatedAt: _ua, ...reportData } = report;
          currentReportJson = JSON.stringify(reportData);
        } catch {
          currentReportJson = report.assessment || undefined;
        }
      }

      const requestBody = {
        prompt: note,
        conversation_id: convId,
        patient_data: patient ? {
          age: patient.age,
          sex: patient.sex,
          ethnicity: patient.ethnicity,
          country: patient.country,
          allergies: patient.allergies,
          current_medications: patient.currentMedications
        } : undefined,
        current_report: currentReportJson,
        is_followup: !!report
      };
      
      console.log('[submitCase] Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('[submitCase] Response status:', response.status, response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[submitCase] API error response:', errorText);
        throw new Error(`Analysis failed: ${response.status} ${response.statusText}`);
      }
      if (!response.body) {
        console.error('[submitCase] No response body');
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      console.log('[submitCase] Starting SSE stream reader');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[submitCase] SSE stream completed');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('[submitCase] Received SSE data:', data.type, data);
              
                if (data.type === 'status') {
                  setStatusUpdates(prev => [...prev, data.message]);
                } else if (data.type === 'result') {
                  console.log('[submitCase] Processing result - response_type:', data.response_type, 'has synthesis:', !!data.synthesis, 'has chat_response:', !!data.chat_response);
                  
                  // Check response_type to determine handling
                  if (data.response_type === 'report_update' && data.synthesis) {
                    // Explicit report modification - parse JSON and update structured report
                    console.log('[submitCase] Report update detected - parsing structured JSON');
                    try {
                      const parsed = typeof data.synthesis === 'string' ? JSON.parse(data.synthesis) : data.synthesis;
                      const structuredReport = parseStructuredReport(parsed, data.patient || {});
                      
                      // Validate that parsed report is not completely empty
                      // (Relaxed: a follow-up may only update one section like drugRecommendations
                      //  while others stay empty — that's fine, merge preserved them)
                      const hasAnyContent = 
                        structuredReport.differentialDiagnosis.length > 0 ||
                        structuredReport.drugRecommendations.length > 0 ||
                        (structuredReport.assessment && structuredReport.assessment.length > 10) ||
                        structuredReport.researchEvidence.length > 0 ||
                        structuredReport.pharmacogenomics.length > 0 ||
                        structuredReport.alerts.length > 0 ||
                        structuredReport.plan.length > 0;
                      
                      if (!hasAnyContent) {
                        console.error('[submitCase] Report update returned completely empty - JSON may be malformed');
                        throw new Error('Report update returned no structured data at all');
                      }
                      
                      setReport(structuredReport);
                      setPatient(convertToPatientSummary(data.patient || {}));
                      console.log('[submitCase] Report updated successfully from report_update response');
                    } catch (parseError: any) {
                      console.error('[submitCase] Failed to parse report update JSON:', parseError);
                      console.error('[submitCase] Raw synthesis:', data.synthesis?.substring(0, 500));
                      // Add error message to chat instead of breaking
                      setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: `⚠️ **Report Update Failed**: I encountered an error parsing the updated report structure. The response wasn't valid JSON or was missing required fields. Please try again with more specific instructions.\n\nTechnical details: ${parseError.message}`,
                        type: 'error'
                      }]);
                    }
                  } else if (data.response_type === 'chat_only' || !data.synthesis || data.synthesis === '') {
                    // Chat-only response - preserve existing report, only add to conversation
                    console.log('[submitCase] Chat-only response - preserving existing report');
                    if (data.patient && !report) {
                      // Only set patient if no report exists yet (first message scenario)
                      setPatient(convertToPatientSummary(data.patient));
                    }
                  } else if (data.synthesis !== null && data.synthesis !== undefined && data.synthesis !== '') {
                    // Initial analysis or new patient - always update report
                    console.log('[submitCase] Initial analysis - updating report');
                    const structuredReport = parseStructuredReport(data.synthesis, data.patient || {});
                    setReport(structuredReport);
                    setPatient(convertToPatientSummary(data.patient || {}));
                  }
                  
                  if (data.chat_response) {
                    const messageType = data.response_type === 'report_update' ? 'report_update' : 
                                       !report && data.synthesis ? 'initial_analysis' : 'chat_only';
                    setMessages(prev => [...prev, { 
                      role: 'assistant', 
                      content: data.chat_response,
                      type: messageType,
                      intent: data.intent
                    }]);
                  }
                } else if (data.type === 'error') {
                  console.error('[submitCase] SSE error:', data.message);
                  throw new Error(data.message);
                }
            } catch (e) {
              console.error('[submitCase] Error parsing SSE data:', e);
            }
          }
        }
      }

      console.log('[submitCase] SSE processing complete, reloading conversations');
      // Reload conversations to get updated list
      loadConversations();

    } catch (err: any) {
      console.error('[submitCase] Analysis error:', err);
      console.error('[submitCase] Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack
      });
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Analysis failed: ${err.message}` 
      }]);
    } finally {
      console.log('[submitCase] Finally block - resetting state');
      setLoading(false);
      setStatusUpdates([]);
      setCurrentNote('');
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
    }
  };

  const handleNewCase = () => {
    setConversationId(null);
    setMessages([]);
    setPatient(null);
    setReport(null);
    setCurrentNote('');
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="theme-wrapper"
      style={{
        ...THEMES[currentTheme].vars,
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-primary)',
      }}
    >
      <ClinicalWorkbench
        patient={patient}
        report={report}
        _messages={messages}
        loading={loading}
        statusUpdates={statusUpdates}
        onNewCase={handleNewCase}
        onSubmitCase={submitCase}
        onStopAnalysis={stopAnalysis}
        onNoteChange={setCurrentNote}
        currentNote={currentNote}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        conversations={conversations}
        onLoadConversation={loadConversation}
        onDeleteConversation={deleteConversation}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
      />
    </div>
  );
}
