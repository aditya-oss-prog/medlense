import React, { useRef, useEffect } from 'react';
import { Send, Square, Stethoscope, FileText } from 'lucide-react';

interface ClinicalNoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  loading: boolean;
  disabled?: boolean;
  placeholder?: string;
  hasReport?: boolean;
}

export const ClinicalNoteEditor: React.FC<ClinicalNoteEditorProps> = ({
  value,
  onChange,
  onSubmit,
  onStop,
  loading,
  disabled = false,
  placeholder = 'Describe patient presentation, symptoms, history, and relevant demographics...',
  hasReport = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !loading) {
      onSubmit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6 pb-6">
      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border shadow-sm transition-all" style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: loading ? 'var(--accent)' : 'var(--border-subtle)',
          ...(loading && { 
            boxShadow: '0 0 0 2px var(--accent-light)',
            borderColor: 'var(--accent)'
          })
        }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <Stethoscope size={16} style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Clinical Case Note
              </span>
              {hasReport && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent)'
                }}>
                  Follow-up
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Shift+Enter for new line</span>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={loading || disabled}
            className="w-full bg-transparent px-4 py-3 focus:outline-none resize-none disabled:opacity-50 text-sm leading-relaxed min-h-[80px] max-h-[200px]"
            style={{ color: 'var(--text-primary)' }}
            rows={3}
          />

          {/* Footer with action button */}
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                <span>AI-powered analysis</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText size={12} />
                <span>Generates structured clinical report</span>
              </div>
            </div>

            {loading ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                style={{ 
                  backgroundColor: 'rgba(239,68,68,0.15)', 
                  color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.3)'
                }}
              >
                <Square size={14} fill="#f87171" />
                Stop Analysis
              </button>
            ) : (
              <button
                type="submit"
                disabled={!value.trim() || disabled}
                className="flex items-center gap-2 px-5 py-2 rounded-lg transition-all text-sm font-semibold shadow-sm disabled:opacity-50 hover:opacity-90"
                style={{ 
                  backgroundColor: 'var(--button-bg)', 
                  color: 'var(--button-text)'
                }}
              >
                <Send size={16} />
                Analyze Case
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Disclaimer */}
      <p className="text-center text-xs mt-4 font-medium" style={{ color: 'var(--text-placeholder)' }}>
        ⚠️ MedLens is for educational and research purposes only — not a substitute for professional medical advice, diagnosis, or treatment.
      </p>
    </div>
  );
};
