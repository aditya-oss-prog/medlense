"""Pydantic models for MedLens data structures."""

from pydantic import BaseModel, Field
from typing import Optional


class PatientProfile(BaseModel):
    """Patient demographic and medical profile."""

    symptoms: str = Field(..., description="Natural language symptom description")
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
