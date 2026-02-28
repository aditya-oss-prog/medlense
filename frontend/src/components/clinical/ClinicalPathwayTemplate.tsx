import React from 'react';
import { BookOpen, CheckCircle, ArrowRight } from 'lucide-react';
import type { DifferentialDiagnosis, DrugRecommendation, WorkupRecommendation } from '../../types/clinical';

interface ClinicalPathwayTemplateProps {
  diagnoses: DifferentialDiagnosis[];
  drugs: DrugRecommendation[];
  workups: WorkupRecommendation[];
}

const pathwaySteps: Record<string, { title: string; icon: React.ReactNode; color: string }> = {
  'assessment': { 
    title: 'Clinical Assessment',
    icon: <BookOpen size={16} />,
    color: '#3b82f6'
  },
  'workup': { 
    title: 'Diagnostic Workup',
    icon: <CheckCircle size={16} />,
    color: '#22c55e'
  },
  'treatment': { 
    title: 'Treatment Plan',
    icon: <ArrowRight size={16} />,
    color: '#8b5cf6'
  },
  'followup': { 
    title: 'Follow-up & Monitoring',
    icon: <CheckCircle size={16} />,
    color: '#f59e0b'
  },
};

export const ClinicalPathwayTemplate: React.FC<ClinicalPathwayTemplateProps> = ({
  diagnoses,
  drugs,
  workups
}) => {
  if (!diagnoses.length && !drugs.length && !workups.length) {
    return (
      <div className="p-6 text-center" style={{ color: 'var(--text-muted)' }}>
        <p className="text-sm">No clinical pathway data available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Clinical Pathway
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded font-medium" style={{ 
            backgroundColor: 'var(--bg-surface)', 
            color: 'var(--text-muted)' 
          }}>
            {diagnoses.length + drugs.length + workups.length} Steps
          </span>
        </div>
      </div>

      {/* Pathway Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-8 top-0 bottom-0 w-px" style={{ backgroundColor: 'var(--border-strong)' }} />

        {/* Assessment Step */}
        {diagnoses.length > 0 && (
          <div className="relative flex items-start gap-4 mb-6 pl-0">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 z-10" style={{ backgroundColor: pathwaySteps.assessment.color }}>
              {pathwaySteps.assessment.icon}
            </div>
            <div className="flex-1 pt-2">
              <h4 className="text-sm font-semibold mb-2" style={{ color: pathwaySteps.assessment.color }}>
                {pathwaySteps.assessment.title}
              </h4>
              <div className="space-y-2">
                {diagnoses.slice(0, 3).map((dx, idx) => (
                  <div 
                    key={idx}
                    className="p-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {dx.condition}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{
                        backgroundColor: dx.probability === 'High' ? '#ef4444' : dx.probability === 'Medium' ? '#f59e0b' : '#3b82f6',
                        color: 'white'
                      }}>
                        {dx.probability}
                      </span>
                    </div>
                    {dx.icd10 && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        ICD-10: {dx.icd10}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Workup Step */}
        {workups.length > 0 && (
          <div className="relative flex items-start gap-4 mb-6 pl-0">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 z-10" style={{ backgroundColor: pathwaySteps.workup.color }}>
              {pathwaySteps.workup.icon}
            </div>
            <div className="flex-1 pt-2">
              <h4 className="text-sm font-semibold mb-2" style={{ color: pathwaySteps.workup.color }}>
                {pathwaySteps.workup.title}
              </h4>
              <div className="space-y-2">
                {workups.slice(0, 3).map((workup, idx) => (
                  <div 
                    key={idx}
                    className="p-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {workup.test}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{
                        backgroundColor: workup.priority === 'urgent' ? '#ef4444' : workup.priority === 'routine' ? '#3b82f6' : '#22c55e',
                        color: 'white'
                      }}>
                        {workup.priority}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {workup.indication}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Treatment Step */}
        {drugs.length > 0 && (
          <div className="relative flex items-start gap-4 mb-6 pl-0">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 z-10" style={{ backgroundColor: pathwaySteps.treatment.color }}>
              {pathwaySteps.treatment.icon}
            </div>
            <div className="flex-1 pt-2">
              <h4 className="text-sm font-semibold mb-2" style={{ color: pathwaySteps.treatment.color }}>
                {pathwaySteps.treatment.title}
              </h4>
              <div className="space-y-2">
                {drugs.slice(0, 3).map((drug, idx) => (
                  <div 
                    key={idx}
                    className="p-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {drug.drugName}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{
                        backgroundColor: drug.evidenceGrade === 'A' ? '#22c55e' : drug.evidenceGrade === 'B' ? '#3b82f6' : '#f59e0b',
                        color: 'white'
                      }}>
                        Grade {drug.evidenceGrade}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {drug.indication}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Follow-up Step */}
        <div className="relative flex items-start gap-4 pl-0">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 z-10" style={{ backgroundColor: pathwaySteps.followup.color }}>
            {pathwaySteps.followup.icon}
          </div>
          <div className="flex-1 pt-2">
            <h4 className="text-sm font-semibold mb-2" style={{ color: pathwaySteps.followup.color }}>
              {pathwaySteps.followup.title}
            </h4>
            <div className="p-3 rounded-lg" style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)'
            }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Schedule follow-up based on treatment response and diagnostic results. Monitor for adverse effects and adjust therapy as needed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
