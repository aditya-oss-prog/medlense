// Clinical data structures for structured reporting

export type Probability = 'High' | 'Medium' | 'Low';
export type EvidenceGrade = 'A' | 'B' | 'C' | 'D';
export type RecommendationStrength = 'Strong' | 'Moderate' | 'Weak';
export type SeverityLevel = 'Severe' | 'Moderate' | 'Mild' | 'None';

export interface DifferentialDiagnosis {
  id: string;
  condition: string;
  icd10?: string;
  probability: Probability;
  probabilityScore?: number; // 0-1
  reasoning: string;
  supportingFindings: string[];
  ruleOuts?: string[];
  recommendedWorkup: string[];
}

export interface DrugRecommendation {
  id: string;
  drugName: string;
  genericName?: string;
  brandNames?: string[];
  indication: string;
  dose?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  renalAdjustment?: string;
  hepaticAdjustment?: string;
  ethnicityConsiderations?: string;
  warnings: string[];
  blackBoxWarning?: string;
  contraindications: string[];
  sideEffects: string[];
  confidence: Probability;
  evidenceGrade: EvidenceGrade;
  supportingEvidence: string[]; // PMIDs, guidelines
  drugClass?: string;
  mechanism?: string;
  cost?: string;
  formularyStatus?: string;
}

export interface ResearchPaper {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  pmid: string;
  doi?: string;
  abstract: string;
  relevance: Probability;
  relevanceScore?: number;
  studyType?: string; // RCT, Meta-analysis, Cohort, etc.
  sampleSize?: number;
  ethnicitySpecific: boolean;
  keyFindings: string[];
  limitations?: string[];
}

export interface ClinicalTrial {
  id: string;
  nctId: string;
  title: string;
  status: string; // Recruiting, Completed, etc.
  phase: string;
  conditions: string[];
  interventions: string[];
  eligibilityCriteria?: string;
  locations?: string[];
  startDate?: string;
  completionDate?: string;
  results?: string;
  url: string;
}

export interface DrugInteraction {
  id: string;
  drug1: string;
  drug2: string;
  severity: SeverityLevel;
  mechanism: string;
  clinicalEffect: string;
  management: string;
  evidence: string;
}

export interface PharmacogenomicFinding {
  id: string;
  gene: string;
  geneName: string;
  phenotype?: string;
  metabolizerStatus?: 'PM' | 'IM' | 'NM' | 'UM'; // Poor/Intermediate/Normal/Ultrarapid
  drugAffected: string;
  clinicalImplication: string;
  dosingGuidance?: string;
  alternativeDrugs?: string[];
  cpicLevel?: 'A' | 'B' | 'C' | 'D';
  ethnicityPrevalence?: string;
  evidence: string;
}

export interface ClinicalAlert {
  id: string;
  type: 'warning' | 'contraindication' | 'interaction' | 'allergy' | 'pgx' | 'guideline';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  references?: string[];
}

export interface GuidelineReference {
  id: string;
  name: string;
  organization: string;
  year: number;
  url?: string;
  recommendations: string[];
}

export interface WorkupRecommendation {
  id: string;
  category: 'lab' | 'imaging' | 'procedure' | 'referral' | 'monitoring';
  test: string;
  indication: string;
  priority: 'urgent' | 'routine' | 'optional';
  rationale: string;
}

export interface StructuredClinicalReport {
  id: string;
  patientId?: string;
  createdAt: string;
  updatedAt: string;
  chiefComplaint: string;
  hpi?: string;
  
  // Structured sections
  differentialDiagnosis: DifferentialDiagnosis[];
  drugRecommendations: DrugRecommendation[];
  researchEvidence: ResearchPaper[];
  clinicalTrials: ClinicalTrial[];
  drugInteractions: DrugInteraction[];
  pharmacogenomics: PharmacogenomicFinding[];
  alerts: ClinicalAlert[];
  workupRecommendations: WorkupRecommendation[];
  guidelineReferences: GuidelineReference[];
  
  // Summary
  assessment: string;
  plan: string[];
  followUpRecommendations: string[];
  
  // Metadata
  evidenceGrade?: EvidenceGrade;
  confidenceScore?: number;
  complexityLevel?: 'simple' | 'moderate' | 'complex' | 'high-risk';
}

export interface PatientSummary {
  age?: number;
  sex?: string;
  ethnicity?: string;
  country?: string;
  allergies?: string;
  currentMedications?: string;
  knownConditions?: string[];
  vitalSigns?: {
    bp?: string;
    hr?: number;
    temp?: number;
    rr?: number;
    spo2?: number;
  };
  labValues?: Record<string, string | number>;
}
