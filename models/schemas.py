"""Pydantic models for MedLens data structures."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class PatientProfile(BaseModel):
    """Patient demographic and medical profile."""

    symptoms: Optional[str] = Field(
        default="", description="Natural language symptom description"
    )
    age: int = Field(..., ge=0, le=150, description="Patient age")
    sex: str = Field(..., description="Patient biological sex")
    ethnicity: str = Field(..., description="Patient ethnicity/race")
    country: str = Field(..., description="Patient country of origin")
    allergies: str = Field(default="", description="Known drug allergies")
    current_medications: str = Field(default="", description="Current medications")


class Condition(BaseModel):
    """Identified medical condition."""

    name: str
    icd_code: str = ""
    probability: str = ""  # High / Medium / Low
    reasoning: str = ""


class ResearchPaper(BaseModel):
    """Condensed PubMed research paper."""

    title: str
    authors: str = ""
    year: str = ""
    journal: str = ""
    abstract_snippet: str = ""
    pmid: str = ""
    relevance: str = ""


class DrugRecommendation(BaseModel):
    """Drug recommendation with context."""

    drug_name: str
    generic_name: str = ""
    indication: str = ""
    ethnicity_notes: str = ""
    warnings: str = ""
    confidence: str = ""  # High / Medium / Low
    supporting_evidence: str = ""


class ClinicalTrial(BaseModel):
    """Clinical trial summary."""

    title: str
    status: str = ""
    phase: str = ""
    conditions: str = ""
    interventions: str = ""
    nct_id: str = ""


class ToolCall(BaseModel):
    """Represents a single tool call from the agent."""

    tool_name: str
    arguments: dict = {}
    result: Optional[str] = None


class AgentResult(BaseModel):
    """Complete result from the agent pipeline."""

    conditions: list[Condition] = []
    research_papers: list[ResearchPaper] = []
    drug_recommendations: list[DrugRecommendation] = []
    clinical_trials: list[ClinicalTrial] = []
    synthesis: str = ""
    tool_trace: list[ToolCall] = []
    disclaimer: str = (
        "⚠️ DISCLAIMER: This is an AI-powered research tool for educational and "
        "informational purposes only. It is NOT a substitute for professional medical "
        "advice, diagnosis, or treatment. Always consult a qualified healthcare provider "
        "for medical decisions."
    )


class DocumentVersion(BaseModel):
    """Document version metadata."""

    id: int
    version_number: int
    user_message: str
    created_at: str


class StructuredClinicalReport(BaseModel):
    """Structured clinical report for storage and exchange."""

    id: str
    patient_id: Optional[str] = None
    created_at: str
    updated_at: str
    chief_complaint: str
    differential_diagnosis: List[Dict[str, Any]] = []
    drug_recommendations: List[Dict[str, Any]] = []
    research_evidence: List[Dict[str, Any]] = []
    clinical_trials: List[Dict[str, Any]] = []
    drug_interactions: List[Dict[str, Any]] = []
    pharmacogenomics: List[Dict[str, Any]] = []
    alerts: List[Dict[str, Any]] = []
    workup_recommendations: List[Dict[str, Any]] = []
    guideline_references: List[Dict[str, Any]] = []
    assessment: str
    plan: List[str] = []
    follow_up_recommendations: List[str] = []
    evidence_grade: Optional[str] = None
    confidence_score: Optional[float] = None
    complexity_level: Optional[str] = None


class AnalyzeRequest(BaseModel):
    """Request for clinical analysis."""

    prompt: str
    conversation_id: Optional[str] = None
    patient_data: Optional[Dict[str, Any]] = None
    current_report: Optional[str] = None
    is_followup: bool = False


class StructuredReportResponse(BaseModel):
    """Response containing structured clinical report."""

    report: StructuredClinicalReport
    conversation_id: str
    version_number: int
    fhir_bundle: Optional[Dict[str, Any]] = None
    pdf_content: Optional[str] = None
