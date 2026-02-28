import { useState, useEffect } from 'react';
import { ClinicalWorkbench } from './components/clinical/ClinicalWorkbench';
import type { PatientSummary, StructuredClinicalReport } from './types/clinical';

// ─── Types (legacy compatibility) ────────────────────────────────────────────

type Message = {
  role: 'user' | 'assistant';
  content: string;
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

// Convert legacy markdown report to structured report (temporary bridge)
function convertLegacyReport(_markdown: string, _patientData: PatientData): StructuredClinicalReport {
  // Temporary implementation - will be replaced with proper LLM structured output
  return {
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    chiefComplaint: '',
    differentialDiagnosis: [],
    drugRecommendations: [],
    researchEvidence: [],
    clinicalTrials: [],
    drugInteractions: [],
    pharmacogenomics: [],
    alerts: [],
    workupRecommendations: [],
    guidelineReferences: [],
    assessment: 'Clinical analysis generated. Structured output pending LLM update.',
    plan: ['Review clinical findings', 'Consider differential diagnoses', 'Evaluate treatment options'],
    followUpRecommendations: [],
    complexityLevel: 'moderate'
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
          const structuredReport = convertLegacyReport(versionData.report, versionData.patient_data || {});
          setReport(structuredReport);
          setPatient(convertToPatientSummary(versionData.patient_data || {}));
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
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setLoading(false);
    setStatusUpdates([]);
  };

  const submitCase = async (note: string) => {
    if (!note.trim() || loading) return;

    setLoading(true);
    setStatusUpdates([]);

    const isNewConversation = !conversationId;
    const convId = conversationId || await createConversation();
    
    if (isNewConversation) {
      setConversationId(convId);
      setMessages([]);
    }

    // Add user message
    const userMessage: Message = { role: 'user', content: note };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          current_report: report?.assessment || undefined,
          is_followup: !!report
        })
      });

      if (!response.ok) throw new Error('Analysis failed');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'status') {
                setStatusUpdates(prev => [...prev, data.message]);
              } else if (data.type === 'result') {
                // Process result
                if (data.synthesis) {
                  const structuredReport = convertLegacyReport(data.synthesis, data.patient || {});
                  setReport(structuredReport);
                  setPatient(convertToPatientSummary(data.patient || {}));
                }
                
                if (data.chat_response) {
                  setMessages(prev => [...prev, { role: 'assistant', content: data.chat_response }]);
                }
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      // Reload conversations to get updated list
      loadConversations();

    } catch (err: any) {
      console.error('Analysis error:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Analysis failed: ${err.message}` 
      }]);
    } finally {
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
