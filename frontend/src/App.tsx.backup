import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send, Bot, Loader2, FileText, AlertTriangle, Pill, X,
  ChevronRight, AlertCircle, Plus, Clock, Trash2, MessageSquare,
  Stethoscope, FlaskConical, Globe, ChevronLeft, Pencil, Square,
  User, Activity, Palette, Settings
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

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

type DocumentVersion = {
  id: number;
  version_number: number;
  user_message: string;
  created_at: string;
};

type VersionContent = {
  id: number;
  version_number: number;
  report: string;
  patient_data: PatientData;
  created_at: string;
};

type PatientFieldConflict = {
  field: keyof PatientData;
  oldValue: string | number | undefined;
  newValue: string | number | undefined;
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

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'yesterday';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(convs: ConversationSummary[]): { label: string; items: ConversationSummary[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const week = today - 7 * 86400000;

  const groups: Record<string, ConversationSummary[]> = {
    Today: [],
    Yesterday: [],
    'Last 7 days': [],
    Older: [],
  };

  for (const c of convs) {
    const t = new Date(c.last_activity).getTime();
    if (t >= today) groups['Today'].push(c);
    else if (t >= yesterday) groups['Yesterday'].push(c);
    else if (t >= week) groups['Last 7 days'].push(c);
    else groups['Older'].push(c);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ─── Component ────────────────────────────────────────────────────────────────

function App() {
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<string[]>([]);

  // Edit state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [hoveredMsgIndex, setHoveredMsgIndex] = useState<number | null>(null);

  // Conversation / version state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(-1);
  const [versionContents, setVersionContents] = useState<Map<number, VersionContent>>(new Map());

  // Artifact panel
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [artifactWidth, setArtifactWidth] = useState(48);

  // Patient data
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [pendingConflicts, setPendingConflicts] = useState<PatientFieldConflict[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictedNewPatientData, setConflictedNewPatientData] = useState<PatientData | null>(null);

  // History sidebar
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null);

  // Theme
  const [currentTheme, setCurrentTheme] = useState('sage');

  // ── Update body class for theme ─────────────────────────────────────────
  useEffect(() => {
    document.body.classList.remove('theme-stone', 'theme-clinical', 'theme-sage', 'theme-midnight');
    document.body.classList.add(`theme-${currentTheme}`);
  }, [currentTheme]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusUpdates]);

  // ── Sync patient data with current version ────────────────────────────────
  useEffect(() => {
    if (currentVersionIndex >= 0 && versions.length > 0) {
      const version = versions[currentVersionIndex];
      const content = versionContents.get(version.id);
      if (content) setPatientData(content.patient_data);
    }
  }, [currentVersionIndex, versions, versionContents]);

  // ── Load conversation list on mount ───────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/conversations`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      // silently fail — server might not be up yet
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Drag-to-resize artifact panel ─────────────────────────────────────────
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const doDrag = (ev: MouseEvent) => {
      const newWidth = 100 - (ev.clientX / window.innerWidth) * 100;
      if (newWidth > 25 && newWidth < 75) setArtifactWidth(newWidth);
    };
    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.body.style.cursor = '';
    };
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
    document.body.style.cursor = 'col-resize';
  };

  // ── Patient data helpers ───────────────────────────────────────────────────
  const detectPatientConflicts = (existing: PatientData, newData: PatientData): PatientFieldConflict[] => {
    const conflicts: PatientFieldConflict[] = [];
    const fields: (keyof PatientData)[] = ['age', 'sex', 'ethnicity', 'country'];
    for (const field of fields) {
      const oldVal = existing[field];
      const newVal = newData[field];
      if (
        oldVal !== undefined && newVal !== undefined &&
        String(oldVal) !== 'Not specified' && String(newVal) !== 'Not specified' &&
        String(oldVal) !== String(newVal)
      ) {
        conflicts.push({ field, oldValue: oldVal, newValue: newVal });
      }
    }
    return conflicts;
  };

  const mergePatientData = (existing: PatientData | null, newData: PatientData): PatientData => {
    if (!existing) return newData;
    const merged: PatientData = { ...existing };
    (Object.keys(newData) as (keyof PatientData)[]).forEach((k) => {
      const value = newData[k];
      if (value !== undefined && String(value) !== 'Not specified') {
        (merged[k] as PatientData[keyof PatientData]) = value;
      }
    });
    return merged;
  };

  // ── Load a conversation from history ──────────────────────────────────────
  const loadConversation = async (conv: ConversationSummary) => {
    if (conv.id === conversationId) return;

    setMessages([]);
    setVersions([]);
    setCurrentVersionIndex(-1);
    setVersionContents(new Map());
    setPatientData(null);
    setIsArtifactOpen(false);
    setStatusUpdates([]);
    setEditingIndex(null);
    setConversationId(conv.id);

    try {
      const msgRes = await fetch(`/api/conversations/${conv.id}/messages`);
      const msgData = await msgRes.json();
      type RawMessage = { role: string; content: string };
      const loadedMessages: Message[] = (msgData.messages || []).map((m: RawMessage) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      setMessages(loadedMessages);

      const verRes = await fetch(`/api/conversations/${conv.id}/versions`);
      const verData = await verRes.json();
      const loadedVersions: DocumentVersion[] = verData.versions || [];
      setVersions(loadedVersions);

      if (loadedVersions.length > 0) {
        const lastVer = loadedVersions[loadedVersions.length - 1];
        const contentRes = await fetch(`/api/versions/${lastVer.id}`);
        const contentData = await contentRes.json();
        const vc: VersionContent = {
          id: contentData.id,
          version_number: contentData.version_number,
          report: contentData.report,
          patient_data: contentData.patient_data,
          created_at: contentData.created_at,
        };
        setVersionContents(new Map([[lastVer.id, vc]]));
        setCurrentVersionIndex(loadedVersions.length - 1);
        setPatientData(contentData.patient_data);
        setIsArtifactOpen(true);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  // ── Delete conversation ────────────────────────────────────────────────────
  const deleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setDeletingId(convId);
    try {
      await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (convId === conversationId) handleNewChat();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  // ── New chat ───────────────────────────────────────────────────────────────
  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setVersions([]);
    setCurrentVersionIndex(-1);
    setVersionContents(new Map());
    setPatientData(null);
    setIsArtifactOpen(false);
    setShowConflictModal(false);
    setPendingConflicts([]);
    setStatusUpdates([]);
    setEditingIndex(null);
    setInput('');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // ── Stop generation ────────────────────────────────────────────────────────
  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  // ── Start editing a message ────────────────────────────────────────────────
  const handleEditMessage = (index: number) => {
    if (loading) return;
    setEditingIndex(index);
    setInput(messages[index].content);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setInput('');
  };

  // ── Core send logic (used by both submit and edit-resubmit) ───────────────
  const sendMessage = useCallback(async (userMsg: string, messagesSnapshot: Message[]) => {
    setLoading(true);
    setStatusUpdates([]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let convId = conversationId;

    if (!convId) {
      try {
        const convResponse = await fetch(`/api/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        const convData = await convResponse.json();
        convId = convData.conversation_id;
        setConversationId(convId);
      } catch {
        convId = crypto.randomUUID();
        setConversationId(convId);
      }
    }

    const currentVersionIdx = currentVersionIndex;
    const currentVersionMap = versionContents;
    const latestReport = currentVersionIdx >= 0
      ? currentVersionMap.get(versions[currentVersionIdx]?.id)?.report || null
      : null;

    const hasExistingReport = latestReport !== null;
    const requestData: {
      prompt: string;
      conversation_id: string | null;
      is_followup: boolean;
      patient_data?: PatientData;
      current_report?: string;
    } = {
      prompt: userMsg,
      conversation_id: convId,
      is_followup: hasExistingReport,
    };
    if (patientData && Object.keys(patientData).length > 0) requestData.patient_data = patientData;
    if (hasExistingReport) requestData.current_report = latestReport ?? undefined;

    try {
      const response = await fetch(`/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        signal: controller.signal,
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === 'status') {
            setStatusUpdates(prev => [...prev, data.message]);
          } else if (data.type === 'result') {
            const responseType = data.response_type || 'report_update';
            const chatResponse = data.chat_response || '';
            const intent = data.intent || 'unknown';

            if (responseType === 'chat_only') {
              setMessages(prev => [...prev, { role: 'assistant', content: chatResponse }]);
            } else {
              const newVersion: DocumentVersion = {
                id: Date.now(),
                version_number: data.version_number,
                user_message: userMsg,
                created_at: new Date().toISOString(),
              };
              const versionContent: VersionContent = {
                id: newVersion.id,
                version_number: data.version_number,
                report: data.synthesis,
                patient_data: data.patient,
                created_at: newVersion.created_at,
              };

              setVersions(prev => [...prev, newVersion]);
              setVersionContents(prev => new Map(prev).set(newVersion.id, versionContent));
              setCurrentVersionIndex(prev => prev + 1);
              setIsArtifactOpen(true);

              const newPatientData = data.patient;
              if (patientData && Object.keys(patientData).length > 0) {
                const conflicts = detectPatientConflicts(patientData, newPatientData);
                if (conflicts.length > 0) {
                  setPendingConflicts(conflicts);
                  setConflictedNewPatientData(newPatientData);
                  setShowConflictModal(true);
                }
                setPatientData(mergePatientData(patientData, newPatientData));
              } else {
                setPatientData(newPatientData);
              }

              let assistantMsg = chatResponse || "I've updated the clinical analysis report.";
              if (intent === 'edit') assistantMsg = chatResponse || "I've applied your changes to the report.";
              else if (intent === 'addition') assistantMsg = chatResponse || "I've incorporated the new information.";
              else if (intent === 'research') assistantMsg = chatResponse || "I've completed the targeted research and updated the report.";

              setMessages(prev => [...prev, { role: 'assistant', content: assistantMsg }]);
            }
          } else if (data.type === 'error') {
            setStatusUpdates(prev => [...prev, `❌ ${data.message}`]);
            setMessages(prev => [...prev, { role: 'assistant', content: `❌ **Error:** ${data.message}` }]);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages(messagesSnapshot);
        setStatusUpdates([]);
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Failed to connect to server.';
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ **Error:** ${errorMsg}` }]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
      loadConversations();
    }
  }, [conversationId, currentVersionIndex, versionContents, versions, patientData, loadConversations]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');

    if (editingIndex !== null) {
      const truncated = messages.slice(0, editingIndex);
      const withNewMsg = [...truncated, { role: 'user' as const, content: userMsg }];
      setMessages(withNewMsg);
      setEditingIndex(null);
      await sendMessage(userMsg, withNewMsg);
    } else {
      const withNewMsg = [...messages, { role: 'user' as const, content: userMsg }];
      setMessages(withNewMsg);
      await sendMessage(userMsg, withNewMsg);
    }
  };

  // ── Version selection ──────────────────────────────────────────────────────
  const handleVersionSelect = async (versionIndex: number) => {
    if (versionIndex === currentVersionIndex) return;
    const version = versions[versionIndex];
    if (!version) return;

    if (versionContents.has(version.id)) {
      setCurrentVersionIndex(versionIndex);
      return;
    }

    try {
      const res = await fetch(`/api/versions/${version.id}`);
      if (!res.ok) throw new Error('Failed to load version');
      const data = await res.json();
      const vc: VersionContent = {
        id: data.id,
        version_number: data.version_number,
        report: data.report,
        patient_data: data.patient_data,
        created_at: data.created_at,
      };
      setVersionContents(prev => new Map(prev).set(version.id, vc));
      setCurrentVersionIndex(versionIndex);
    } catch {
      if (versionContents.has(version.id)) setCurrentVersionIndex(versionIndex);
    }
  };

  // ── Conflict resolution ────────────────────────────────────────────────────
  const handleResolveConflicts = (choice: 'keep' | 'update' | 'merge') => {
    if (choice === 'update' && conflictedNewPatientData) setPatientData(conflictedNewPatientData);
    else if (choice === 'merge' && conflictedNewPatientData) setPatientData(mergePatientData(patientData, conflictedNewPatientData));
    setShowConflictModal(false);
    setPendingConflicts([]);
    setConflictedNewPatientData(null);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentReport = currentVersionIndex >= 0
    ? versionContents.get(versions[currentVersionIndex]?.id)?.report || null
    : null;

  const groupedConversations = groupByDate(conversations);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-screen w-full font-sans antialiased overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-primary)',
        ...THEMES[currentTheme].vars,
      }}
    >
      {/* ── LEFT SIDEBAR — Navigation & History ──────────────────────────── */}
      <aside
        className="flex flex-col shrink-0 transition-all duration-300 overflow-hidden z-10"
        style={{
          width: sidebarOpen ? '280px' : '64px',
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: sidebarOpen ? 'none' : '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              <Activity size={18} strokeWidth={2.5} />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <h1 className="font-semibold text-sm tracking-wide">MedLens</h1>
                <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>
                  Clinical Decision AI
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="shrink-0 p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-4 pb-4 pt-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all shadow-sm text-sm font-medium hover:opacity-90"
            style={{ backgroundColor: 'var(--button-bg)', color: 'var(--button-text)' }}
          >
            <Plus size={16} className="shrink-0" />
            {sidebarOpen && <span>New clinical analysis</span>}
          </button>
        </div>

        {/* History List */}
        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
            {historyLoading ? (
              <div className="flex justify-center pt-8">
                <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
              </div>
            ) : groupedConversations.length === 0 ? (
              <div className="text-center pt-10 px-4">
                <MessageSquare size={28} className="mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No conversations yet</p>
              </div>
            ) : (
              groupedConversations.map(group => (
                <div key={group.label}>
                  <h3
                    className="px-3 text-[11px] font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => loadConversation(conv)}
                        onMouseEnter={() => setHoveredConvId(conv.id)}
                        onMouseLeave={() => setHoveredConvId(null)}
                        className="w-full text-left p-3 rounded-lg flex flex-col gap-1.5 transition-colors group relative"
                        style={{
                          backgroundColor: conv.id === conversationId
                            ? 'var(--border-subtle)'
                            : hoveredConvId === conv.id ? 'var(--border-subtle)' : 'transparent',
                          border: conv.id === conversationId ? '1px solid var(--border-strong)' : '1px solid transparent',
                          color: conv.id === conversationId ? 'var(--text-primary)' : 'var(--text-muted)',
                        }}
                      >
                        <span
                          className="text-sm truncate w-full font-medium"
                          style={{ color: conv.id === conversationId || hoveredConvId === conv.id ? 'var(--text-primary)' : 'var(--text-muted)' }}
                        >
                          {conv.title}
                        </span>
                        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                          <div className="flex items-center gap-1.5">
                            <Clock size={10} />
                            <span>{relativeTime(conv.last_activity)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {conv.version_count > 0 && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] border"
                                style={{
                                  backgroundColor: 'var(--bg-panel)',
                                  color: 'var(--text-secondary)',
                                  borderColor: 'var(--border-subtle)',
                                }}
                              >
                                {conv.version_count}x
                              </span>
                            )}
                            {(hoveredConvId === conv.id || deletingId === conv.id) && (
                              <span
                                onClick={(e) => deleteConversation(e, conv.id)}
                                className="p-0.5 rounded transition-colors cursor-pointer"
                                style={{ color: 'var(--text-placeholder)' }}
                                title="Delete"
                              >
                                {deletingId === conv.id
                                  ? <Loader2 size={12} className="animate-spin" />
                                  : <Trash2 size={12} />
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Theme Switcher */}
        {sidebarOpen && (
          <div className="p-4 border-t" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
            <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--text-muted)' }}>
              <Palette size={14} />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Theme</span>
            </div>
            <div className="flex gap-2">
              {Object.entries(THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => setCurrentTheme(key)}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: theme.vars['--bg-base'],
                    borderColor: currentTheme === key ? theme.vars['--accent'] : 'transparent',
                    transform: currentTheme === key ? 'scale(1.1)' : 'scale(1)',
                    opacity: currentTheme === key ? 1 : 0.7,
                    boxShadow: currentTheme === key ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                  }}
                  title={theme.name}
                />
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-row h-full overflow-hidden relative">

        {/* Chat Panel */}
        <div
          className="flex flex-col h-full transition-all duration-300"
          style={{
            width: isArtifactOpen ? `${100 - artifactWidth}%` : '100%',
            maxWidth: isArtifactOpen ? 'none' : '760px',
            margin: isArtifactOpen ? '0' : '0 auto',
            backgroundColor: 'var(--bg-base)',
          }}
        >
          {/* Welcome screen */}
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
              >
                <Stethoscope size={32} />
              </div>
              <h1
                className="text-4xl font-extrabold mb-3 tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                MedLens
              </h1>
              <p className="text-base mb-10 max-w-md leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Ethnicity-aware clinical decision support.<br />
                Describe a patient case to generate an evidence-based synthesis.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
                {[
                  {
                    icon: <Globe size={16} style={{ color: 'var(--accent)' }} />,
                    text: "A 28 year old Indian male with South Asian ethnicity suffering from long-standing OCD",
                  },
                  {
                    icon: <FlaskConical size={16} style={{ color: 'var(--accent)' }} />,
                    text: "55yo African American female, hypertension on lisinopril, presents with new dry cough",
                  },
                  {
                    icon: <Pill size={16} style={{ color: 'var(--accent)' }} />,
                    text: "42yo East Asian male, T2DM, asking about metformin dose adjustment",
                  },
                  {
                    icon: <AlertTriangle size={16} style={{ color: 'var(--accent)' }} />,
                    text: "70yo South Asian female, CKD stage 3, on ACE inhibitor, new potassium of 5.8",
                  },
                ].map((card, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(card.text)}
                    className="flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-150 border hover:border-[var(--border-strong)]"
                    style={{
                      backgroundColor: 'var(--bg-panel)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <span className="mt-0.5 shrink-0">{card.icon}</span>
                    <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
            <div className="max-w-3xl mx-auto space-y-8 pb-32">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-4 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  onMouseEnter={() => setHoveredMsgIndex(i)}
                  onMouseLeave={() => setHoveredMsgIndex(null)}
                >
                  {/* Avatar */}
                  {msg.role === 'assistant' ? (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow-sm"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      <Bot size={18} />
                    </div>
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-strong)' }}
                    >
                      <User size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="flex flex-col gap-2 max-w-[85%]">
                    <div className="flex items-start gap-2">
                      <div
                        className={`text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'px-5 py-3.5 rounded-2xl rounded-tr-none shadow-sm border'
                            : 'pt-1'
                        }`}
                        style={
                          msg.role === 'user'
                            ? {
                                backgroundColor: 'var(--bg-panel)',
                                color: 'var(--text-primary)',
                                borderColor: 'var(--border-subtle)',
                              }
                            : { color: 'var(--text-primary)' }
                        }
                      >
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-secondary)' }}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <span>{msg.content}</span>
                        )}
                      </div>
                      {/* Edit button for user messages */}
                      {msg.role === 'user' && !loading && hoveredMsgIndex === i && (
                        <button
                          onClick={() => handleEditMessage(i)}
                          title="Edit message"
                          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all mt-1 border"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-placeholder)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                    </div>
                    {/* View Report button */}
                    {msg.role === 'assistant' && currentReport && !isArtifactOpen && (
                      <button
                        onClick={() => setIsArtifactOpen(true)}
                        className="flex items-center gap-2 self-start text-xs rounded-lg px-3 py-1.5 transition-colors border"
                        style={{
                          backgroundColor: 'var(--accent-light)',
                          borderColor: 'var(--accent)',
                          color: 'var(--accent)',
                        }}
                      >
                        <FileText size={13} />
                        View Report
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading state */}
              {loading && (
                <div className="flex gap-4 items-start">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow-sm"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    <Bot size={18} />
                  </div>
                  <div
                    className="rounded-2xl px-5 py-4 min-w-[240px] border"
                    style={{
                      backgroundColor: 'var(--bg-panel)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Analysing patient case…</span>
                    </div>
                    <div className="space-y-1.5">
                      {statusUpdates.map((update, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs"
                          style={{
                            color: idx === statusUpdates.length - 1 ? 'var(--text-secondary)' : 'var(--text-placeholder)',
                            opacity: idx === statusUpdates.length - 1 ? 1 : 0.6,
                          }}
                        >
                          {idx === statusUpdates.length - 1 && (
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                              style={{ backgroundColor: 'var(--accent)' }}
                            />
                          )}
                          <span>{update}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input Area — fixed at bottom with gradient fade */}
          <div
            className="absolute bottom-0 left-0 right-0 pt-10 pb-6 px-4 md:px-8 pointer-events-none z-20"
            style={{
              background: `linear-gradient(to top, var(--bg-base) 60%, transparent)`,
              width: isArtifactOpen ? `${100 - artifactWidth}%` : '100%',
              maxWidth: isArtifactOpen ? 'none' : '760px',
              margin: isArtifactOpen ? '0' : '0 auto',
              left: isArtifactOpen ? '0' : '50%',
              transform: isArtifactOpen ? 'none' : 'translateX(-50%)',
            }}
          >
            <div className="max-w-3xl mx-auto pointer-events-auto">
              {/* Edit mode banner */}
              {editingIndex !== null && (
                <div className="flex items-center justify-between text-xs mb-2 px-2" style={{ color: 'var(--accent)' }}>
                  <div className="flex items-center gap-2">
                    <Settings size={12} />
                    <span>Editing message — submit to resend from this point</span>
                  </div>
                  <button
                    onClick={handleCancelEdit}
                    className="transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div
                  className={`relative flex items-end gap-2 rounded-2xl border transition-all shadow-sm ${
                    editingIndex !== null ? 'ring-2' : ''
                  }`}
                  style={{
                    backgroundColor: 'var(--bg-panel)',
                    borderColor: editingIndex !== null ? 'var(--accent)' : 'var(--border-subtle)',
                    ...(editingIndex !== null ? { '--tw-ring-color': 'var(--accent)', '--tw-ring-opacity': '0.2' } as React.CSSProperties : {}),
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder={
                      editingIndex !== null
                        ? 'Edit your message…'
                        : currentReport
                          ? 'Ask follow-up questions...'
                          : 'Describe patient symptoms, age, sex, ethnicity…'
                    }
                    disabled={loading}
                    className="w-full bg-transparent px-4 py-3.5 max-h-32 focus:outline-none resize-none overflow-y-auto text-sm leading-relaxed disabled:opacity-50"
                    style={{
                      color: 'var(--text-primary)',
                    }}
                    rows={1}
                  />
                  <div className="p-2 shrink-0">
                    {loading ? (
                      <button
                        type="button"
                        onClick={handleStop}
                        title="Stop generation"
                        className="p-2 rounded-xl flex items-center justify-center transition-colors"
                        style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                      >
                        <Square size={14} fill="#f87171" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!input.trim()}
                        className="p-2 rounded-xl transition-colors shadow-sm disabled:opacity-50 hover:opacity-90"
                        style={{ backgroundColor: 'var(--button-bg)', color: 'var(--button-text)' }}
                      >
                        <Send size={16} className="ml-0.5" />
                      </button>
                    )}
                  </div>
                </div>
              </form>

              <p className="text-center text-[11px] mt-3 font-medium" style={{ color: 'var(--text-placeholder)' }}>
                MedLens is for educational purposes only — not a substitute for professional medical advice.
              </p>
            </div>
          </div>
        </div>

        {/* Drag resizer */}
        {isArtifactOpen && (
          <div
            className="w-px shrink-0 cursor-col-resize transition-colors relative flex items-center justify-center"
            style={{ backgroundColor: 'var(--border-subtle)' }}
            onMouseDown={startDrag}
          >
            <div className="absolute h-10 w-1 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
          </div>
        )}

        {/* ── ARTIFACT PANEL (Right Panel — Report) ──────────────────────── */}
        {isArtifactOpen && currentReport && (
          <div
            className="h-full flex flex-col overflow-hidden shrink-0 shadow-xl z-20 transition-colors duration-300"
            style={{
              width: `${artifactWidth}%`,
              backgroundColor: 'var(--bg-panel)',
              borderLeft: '1px solid var(--border-subtle)',
            }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between shrink-0 sticky top-0 z-10"
              style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-panel)' }}
            >
              <div className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <FileText size={18} style={{ color: 'var(--accent)' }} />
                <h2 className="font-medium text-sm">Clinical Analysis Report</h2>
              </div>
              <div className="flex items-center gap-3">
                {/* Version pills */}
                {versions.length > 1 && (
                  <div
                    className="flex items-center gap-1 rounded-lg p-1 border"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    {versions.map((v, idx) => (
                      <button
                        key={v.id}
                        onClick={() => handleVersionSelect(idx)}
                        className="text-xs px-2.5 py-1 rounded-md font-medium transition-all"
                        style={
                          idx === currentVersionIndex
                            ? { backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }
                            : { color: 'var(--text-muted)' }
                        }
                      >
                        v{v.version_number}
                      </button>
                    ))}
                  </div>
                )}
                {versions.length === 1 && (
                  <span
                    className="text-xs px-2 py-1 rounded text-xs font-mono border"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-muted)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    v{versions[0]?.version_number}
                  </span>
                )}
                <button
                  onClick={() => setIsArtifactOpen(false)}
                  className="transition-colors"
                  style={{ color: 'var(--text-placeholder)' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Report Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-8">

              {/* Patient Profile Section */}
              {patientData && (
                <section>
                  <h3
                    className="text-[11px] font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <User size={14} />
                    Patient Profile
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Age', value: patientData.age || '—', field: 'age' },
                      { label: 'Sex', value: patientData.sex || '—', field: 'sex' },
                      { label: 'Ethnicity', value: patientData.ethnicity || '—', field: 'ethnicity' },
                      { label: 'Country', value: patientData.country || '—', field: 'country' },
                    ].map(item => (
                      <div
                        key={item.field}
                        className="relative p-3 rounded-xl border"
                        style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}
                      >
                        <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
                        <div
                          className="text-sm font-medium truncate"
                          style={{
                            color: String(item.value) === '—' || String(item.value) === 'Not specified'
                              ? 'var(--text-placeholder)'
                              : 'var(--text-primary)',
                            fontStyle: String(item.value) === '—' || String(item.value) === 'Not specified' ? 'italic' : 'normal',
                          }}
                          title={String(item.value)}
                        >
                          {String(item.value) === 'Not specified' ? 'Not specified' : String(item.value)}
                        </div>
                        {pendingConflicts.some(c => c.field === item.field) && (
                          <div className="absolute inset-0 animate-pulse rounded-xl" style={{ backgroundColor: 'rgba(251,191,36,0.15)' }} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Allergies & Medications */}
                  <div className="space-y-2 mt-3">
                    {patientData.allergies && patientData.allergies !== 'Not specified' && (
                      <div
                        className="flex items-start gap-2.5 p-3 rounded-xl text-xs border"
                        style={{ backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
                      >
                        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                        <span><strong>Allergies: </strong>{patientData.allergies}</span>
                      </div>
                    )}
                    {patientData.current_medications && patientData.current_medications !== 'Not specified' && (
                      <div
                        className="flex items-start gap-2.5 p-3 rounded-xl text-xs border"
                        style={{ backgroundColor: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                      >
                        <Pill size={13} className="shrink-0 mt-0.5" />
                        <span><strong>Current meds: </strong>{patientData.current_medications}</span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Markdown Report */}
              <section>
                <div
                  className="prose prose-sm max-w-none"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ReactMarkdown>{currentReport}</ReactMarkdown>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* ── Conflict Modal ────────────────────────────────────────────────── */}
      {showConflictModal && pendingConflicts.length > 0 && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[100]"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
        >
          <div
            className="w-full max-w-md mx-4 rounded-2xl p-6 shadow-2xl border"
            style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(251,191,36,0.15)' }}
              >
                <AlertCircle size={20} style={{ color: '#fbbf24' }} />
              </div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Patient Data Conflict</h3>
            </div>

            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              The new analysis contains different patient information:
            </p>

            <div className="space-y-2.5 mb-6">
              {pendingConflicts.map((c, idx) => (
                <div
                  key={idx}
                  className="rounded-xl p-3.5 border"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>{c.field}</div>
                  <div className="flex items-center gap-3 text-sm">
                    <span style={{ color: '#ef4444', textDecoration: 'line-through' }}>{String(c.oldValue)}</span>
                    <ChevronRight size={13} style={{ color: 'var(--text-placeholder)' }} />
                    <span style={{ color: '#22c55e' }}>{String(c.newValue)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleResolveConflicts('update')}
                className="w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-colors border"
                style={{ backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.3)', color: '#22c55e' }}
              >
                Use new values
              </button>
              <button
                onClick={() => handleResolveConflicts('merge')}
                className="w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-colors border"
                style={{ backgroundColor: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--accent)' }}
              >
                Merge (keep existing + add new)
              </button>
              <button
                onClick={() => handleResolveConflicts('keep')}
                className="w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-colors border"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                Keep original values
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
