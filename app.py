"""MedLens — Ethnicity-Aware Clinical Decision Support System.

A Streamlit application powered by LLM with tool calling that analyzes
patient symptoms, searches medical research databases, and provides
personalized drug recommendations based on patient ethnicity and background.
"""

import streamlit as st
import json
import time
from models.schemas import PatientProfile
from agent.core import run_agent, extract_patient_profile


# ─────────────────────────── Page Config ───────────────────────────
st.set_page_config(
    page_title="MedLens — Clinical Decision Support",
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─────────────────────────── Custom CSS ────────────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }

    /* Reduce top padding and add clean background */
    .block-container { padding-top: 2rem !important; padding-bottom: 2rem !important; }
    
    .main-header {
        text-align: center;
        padding: 0.5rem 0;
        margin-bottom: 1rem;
    }
    .main-header h1 {
        background: linear-gradient(135deg, #38bdf8, #a78bfa);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 2.75rem;
        font-weight: 800;
        margin-bottom: 0;
        letter-spacing: -0.025em;
    }
    .subtitle {
        text-align: center;
        color: #94a3b8;
        font-size: 1.05rem;
        margin-top: -0.25rem;
        margin-bottom: 1.5rem;
        font-weight: 500;
    }
    
    /* Modern Disclaimer Banners */
    .disclaimer-banner, .disclaimer-box {
        background: rgba(153, 27, 27, 0.2);
        border: 1px solid rgba(220, 38, 38, 0.3);
        border-radius: 0.5rem;
        color: #fca5a5;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(8px);
    }
    .disclaimer-banner {
        padding: 0.75rem 1rem;
        margin-bottom: 1.5rem;
        font-size: 0.875rem;
        line-height: 1.4;
        text-align: center;
    }
    .disclaimer-box {
        padding: 1rem 1.25rem;
        margin: 1.5rem 0;
    }

    /* Sidebar adjustments */
    section[data-testid="stSidebar"] {
        background-color: #0f172a;
        border-right: 1px solid #1e293b;
    }
    section[data-testid="stSidebar"] .block-container { padding-top: 1.5rem !important; }
    
    /* Input Styling */
    .stTextInput input, .stSelectbox > div > div, .stTextArea textarea, .stNumberInput input {
        border-radius: 0.5rem !important;
        border: 1px solid #334155 !important;
        background-color: #0f172a !important;
        color: #f8fafc !important;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05) !important;
        transition: all 0.2s ease;
    }
    .stTextInput input:focus, .stSelectbox > div > div:focus, .stTextArea textarea:focus, .stNumberInput input:focus {
        border-color: #38bdf8 !important;
        box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2) !important;
    }

    /* Button Styling */
    button[kind="primary"] {
        background: linear-gradient(135deg, #0ea5e9, #8b5cf6) !important;
        border: none !important;
        border-radius: 0.5rem !important;
        color: white !important;
        font-weight: 600 !important;
        padding: 0.5rem 1rem !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
    }
    button[kind="primary"]:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.3), 0 4px 6px -2px rgba(14, 165, 233, 0.15) !important;
    }
    
    /* Secondary Button */
    button[kind="secondary"] {
        border-radius: 0.5rem !important;
        border: 1px solid #334155 !important;
        background-color: #1e293b !important;
        color: #e2e8f0 !important;
        transition: all 0.2s ease !important;
    }
    button[kind="secondary"]:hover {
        border-color: #475569 !important;
        background-color: #334155 !important;
        color: #f8fafc !important;
    }

    /* Metric Cards */
    [data-testid="stMetric"] {
        background-color: #1e293b;
        border: 1px solid #334155;
        padding: 1rem 1.25rem;
        border-radius: 0.75rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    [data-testid="stMetric"]:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
        border-color: #475569;
    }
    [data-testid="stMetricLabel"] {
        color: #94a3b8 !important;
        font-weight: 500 !important;
        font-size: 0.875rem !important;
        margin-bottom: 0.25rem !important;
    }
    [data-testid="stMetricValue"] {
        color: #f8fafc !important;
        font-weight: 700 !important;
        font-size: 1.5rem !important;
    }

    /* Expanders */
    [data-testid="stExpander"] {
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 0.75rem;
        overflow: hidden;
    }
    [data-testid="stExpander"] summary {
        background-color: #0f172a;
        padding: 0.75rem 1rem;
        font-weight: 600;
        color: #e2e8f0;
    }
    [data-testid="stExpander"] summary:hover {
        background-color: #1e293b;
    }

    /* Progress bar */
    .stProgress > div > div > div > div {
        background-image: linear-gradient(135deg, #0ea5e9, #8b5cf6) !important;
    }
    
    /* Dividers */
    hr {
        border-color: #334155 !important;
        margin: 2rem 0 !important;
    }
    
    /* Warning/Info Boxes */
    div.stAlert > div {
        border-radius: 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(4px);
    }
    
    /* Code Blocks */
    pre {
        border-radius: 0.5rem !important;
        border: 1px solid #334155 !important;
    }
</style>
""", unsafe_allow_html=True)


# ─────────────────────────── Header (compact) ─────────────────────
st.markdown('<div class="main-header"><h1>🔬 MedLens</h1></div>', unsafe_allow_html=True)
st.markdown('<p class="subtitle">Ethnicity-Aware Clinical Decision Support</p>', unsafe_allow_html=True)

# Compact disclaimer
st.markdown(
    '<div class="disclaimer-banner">'
    "⚠️ <strong>Not medical advice.</strong> AI-powered research tool for educational use only. "
    "Consult a qualified healthcare provider for clinical decisions."
    "</div>",
    unsafe_allow_html=True,
)

# ─────────────────────────── Session State ─────────────────────────
if "messages" not in st.session_state:
    st.session_state.messages = []
if "current_report" not in st.session_state:
    st.session_state.current_report = None
if "current_patient" not in st.session_state:
    st.session_state.current_patient = None

# ─────────────────────────── Sidebar ───────────────────────────────
with st.sidebar:
    st.header("🔬 About MedLens")
    st.markdown(
        "MedLens is an AI-powered clinical decision support system that analyzes "
        "patient symptoms in natural language, searches medical research databases, "
        "and provides personalized drug recommendations based on patient ethnicity and background."
    )
    st.divider()
    if st.button("🗑️ Clear Chat", use_container_width=True):
        st.session_state.messages = []
        st.session_state.current_report = None
        st.session_state.current_patient = None
        st.rerun()
    st.divider()
    st.caption(
        "**Powered by:** LiquidAI LFM2-24B · PubMed · OpenFDA · ClinicalTrials.gov · PharmGKB/CPIC"
    )

# ─────────────────────────── Layout Structure ──────────────────────
has_report = st.session_state.current_report is not None

if has_report:
    # Artifacts View: 2 columns
    chat_col, doc_col = st.columns([1, 1.3], gap="large")
else:
    # Clean View: center the chat if no report is active
    _, chat_col, _ = st.columns([1, 2.5, 1])
    doc_col = None

# ─────────────────────────── Chat Interface ────────────────────────
with chat_col:
    # Display chat history
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Chat input
    if prompt := st.chat_input("e.g., A 28 year old Indian male patient suffering from long time OCD..."):
        # Display user prompt in chat
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        # Display assistant response
        with st.chat_message("assistant"):
            # Status container
            with st.status("🧠 Analyzing patient case...", expanded=True) as status_container:
                st.write("Extracting patient demographics...")
                
                try:
                    # Automatically extract structured demographics from natural language
                    patient = extract_patient_profile(prompt.strip())
                    
                    # Ensure formatting is clean, filtering out missing values
                    profile_str = f"Found: {patient.age}y/o {patient.sex}"
                    if patient.ethnicity != "Not specified": profile_str += f", {patient.ethnicity}"
                    if patient.country != "Not specified": profile_str += f" ({patient.country})"
                    st.write(f"✓ {profile_str}")
                    
                    st.write("Starting analysis...")
                    
                    def status_callback(stage: str, message: str):
                        if stage in ["starting", "synthesizing"]:
                            st.write(f"⏳ {message}")
                        # We ignore "tool_call", "tool_result", and "thinking" for a cleaner UI

                    result = run_agent(patient, status_callback=status_callback)
                    synthesis = result.get("synthesis", "No synthesis generated.")
                    status_container.update(label="✅ Analysis complete!", state="complete", expanded=False)
                    
                    # Update session state with the report
                    st.session_state.current_report = synthesis
                    st.session_state.current_patient = patient
                    
                    # Short chat response pointing to the artifact
                    short_response = "I have researched the medical databases and generated a comprehensive clinical analysis report based on the patient data. You can view the full details in the document panel on the right."
                    st.markdown(short_response)
                    st.session_state.messages.append({"role": "assistant", "content": short_response})
                    
                    # Rerun to switch layout to dual-pane mode
                    st.rerun()

                except Exception as e:
                    status_container.update(label="❌ Analysis failed", state="error", expanded=True)
                    st.error(f"Analysis failed: {str(e)}")
                    st.exception(e)

# ─────────────────────────── Artifact Viewer ───────────────────────
if doc_col and has_report:
    with doc_col:
        # Native scrollable container with a border
        with st.container(height=700, border=True):
            st.markdown("### 🧠 Clinical Analysis & Recommendations")
            
            p = st.session_state.current_patient
            if p:
                c1, c2, c3, c4 = st.columns(4)
                c1.metric("Age", p.age if p.age > 0 else "N/A")
                c2.metric("Sex", p.sex)
                c3.metric("Ethnicity", p.ethnicity)
                c4.metric("Country", p.country)
                
                if p.allergies and p.allergies != "Not specified":
                    st.warning(f"🚫 **Allergies:** {p.allergies}", icon="🚫")
                if p.current_medications and p.current_medications != "Not specified":
                    st.info(f"💊 **Current Meds:** {p.current_medications}", icon="💊")
                
                st.divider()
                
            st.markdown(st.session_state.current_report)
            
            st.markdown(
                '<div class="disclaimer-box">'
                "⚠️ <strong>REMINDER:</strong> All recommendations are AI-generated and must be verified "
                "by a qualified healthcare professional before any clinical action."
                "</div>",
                unsafe_allow_html=True,
            )
            
            st.divider()
            # Export Button
            report_text = f"# MedLens Clinical Analysis Report\n\n---\n\n{st.session_state.current_report}\n\n---\n*Generated by MedLens*"
            st.download_button(
                "📄 Download Report",
                data=report_text,
                file_name="medlens_report.md",
                mime="text/markdown",
                use_container_width=True,
            )
