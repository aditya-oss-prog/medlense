# 🔬 MedLens — Ethnicity-Aware Clinical Decision Support System

> **DevDash 2026 Hackathon Submission** | AI & Healthcare Track

MedLens is an LLM-powered clinical decision support system that analyzes patient symptoms, searches medical research databases, and provides **personalized drug recommendations** based on the patient's **ethnic background and country of origin**. It leverages pharmacogenomic data to account for population-specific drug metabolism variations.

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)
![Streamlit](https://img.shields.io/badge/Streamlit-1.31+-red?logo=streamlit)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🎯 Problem Statement

Drug response varies significantly across ethnic populations due to genetic differences in drug-metabolizing enzymes (pharmacogenomics). A medication that works well for one population may be ineffective or dangerous for another. Yet most clinical decision tools don't account for these differences.

**MedLens bridges this gap** by combining LLM reasoning with real-time medical database queries and pharmacogenomic data to deliver ethnicity-aware clinical recommendations.

---

## ✨ Key Features

- **🧠 LLM-Powered Symptom Analysis** — Identifies potential conditions from natural language symptom descriptions
- **📚 PubMed Research Search** — Queries NCBI for ethnicity-specific medical research papers
- **💊 FDA Drug Lookup** — Searches OpenFDA for drug information, indications, and warnings
- **🧪 Clinical Trials Search** — Finds relevant trials from ClinicalTrials.gov
- **🧬 Pharmacogenomics Engine** — Curated database of population-specific drug metabolism data (PharmGKB/CPIC)
- **⚠️ Drug Interaction Checker** — Verifies safety of drug combinations via FDA adverse events
- **🔧 Agentic Tool Calling** — LLM autonomously decides which tools to call and in what order
- **📊 Interactive Dashboard** — Clean Streamlit UI with live agent trace, exportable reports

---

## 🏗️ Architecture

```
Patient Input (Symptoms + Demographics)
            │
            ▼
┌────────────────────────────────────┐
│   LLM Agent (LiquidAI LFM2-24B)   │
│   with Tool Calling                │
│                                    │
│   Available Tools:                 │
│   🔧 search_pubmed                │
│   🔧 lookup_drug_info             │
│   🔧 search_drugs_for_condition   │
│   🔧 search_clinical_trials       │
│   🔧 check_pharmacogenomics       │
│   🔧 get_population_drug_warnings │
│   🔧 check_drug_interactions      │
└─────────────┬──────────────────────┘
              │ Multi-round tool calling loop
              ▼
┌────────────────────────────────────┐
│   Synthesis & Recommendations      │
│   - Conditions identified          │
│   - Research papers cited          │
│   - Drugs recommended with         │
│     ethnicity-specific notes       │
│   - Safety alerts                  │
└─────────────┬──────────────────────┘
              ▼
┌────────────────────────────────────┐
│   Streamlit Dashboard              │
│   - Patient profile sidebar        │
│   - Analysis results               │
│   - Agent tool trace               │
│   - Export report                  │
└────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **LLM** | LiquidAI/LFM2-24B-A2B-GGUF via HuggingFace Inference Endpoint |
| **Frontend** | Streamlit |
| **Backend** | Python (FastAPI-style agent pipeline) |
| **Research API** | PubMed / NCBI E-utilities (free) |
| **Drug Data** | OpenFDA API (free) |
| **Clinical Trials** | ClinicalTrials.gov API v2 (free) |
| **Pharmacogenomics** | Curated PharmGKB / CPIC knowledge base |
| **LLM Client** | OpenAI Python SDK (compatible endpoint) |

---

## 🚀 Setup & Installation

### Prerequisites
- Python 3.11+
- pip

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-username/medlens.git
cd medlens

# 2. Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux
# or: venv\Scripts\activate  # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your HuggingFace API key

# 5. Run the application
streamlit run app.py
```

### Environment Variables

Create a `.env` file with:
```
HF_API_URL=https://your-hf-endpoint.aws.endpoints.huggingface.cloud/v1
HF_API_KEY=your_hf_api_key
HF_MODEL=LiquidAI/LFM2-24B-A2B-GGUF
MAX_CONTEXT_TOKENS=32000
```

---

## 📁 Project Structure

```
medlens/
├── app.py                          # Streamlit main application
├── agent/
│   ├── core.py                     # Agent loop with tool calling
│   ├── llm_client.py               # HuggingFace endpoint client
│   └── prompts.py                  # System prompts
├── tools/
│   ├── pubmed_search.py            # PubMed/NCBI API
│   ├── drug_lookup.py              # OpenFDA drug API
│   ├── clinical_trials.py          # ClinicalTrials.gov API
│   ├── pharmacogenomics.py         # PharmGKB/CPIC data
│   └── drug_interactions.py        # Drug interaction checker
├── models/
│   └── schemas.py                  # Pydantic data models
├── utils/
│   └── helpers.py                  # Token estimation, text processing
├── .streamlit/
│   └── config.toml                 # Streamlit theme configuration
├── requirements.txt
├── .env
└── README.md
```

---

## 🧬 Pharmacogenomics Coverage

MedLens includes curated data for the following pharmacogenomic markers:

| Gene/Marker | Affected Drugs | Clinical Significance |
|---|---|---|
| **CYP2D6** | Codeine, tramadol, fluoxetine, metoprolol | Drug metabolism (~25% of common drugs) |
| **CYP2C19** | Clopidogrel, omeprazole, escitalopram | Antiplatelet efficacy, PPI dosing |
| **CYP2C9** | Warfarin, NSAIDs, sulfonylureas | Anticoagulant dosing |
| **VKORC1** | Warfarin | Warfarin sensitivity |
| **HLA-B*5801** | Allopurinol | Stevens-Johnson syndrome risk |
| **G6PD** | Primaquine, dapsone, nitrofurantoin | Hemolytic anemia risk |

Population data covers: East Asian, South Asian, African, European/Caucasian, Middle Eastern, Hispanic/Latino.

---

## 📊 Evaluation Criteria Alignment

| Criteria | How MedLens Addresses It |
|---|---|
| **Originality** | Novel combination of LLM reasoning + pharmacogenomics + real-time medical DB queries |
| **Technical Complexity** | Multi-round agentic tool calling, 7 integrated APIs, context window management |
| **Practical Applicability** | Addresses real health equity gap in drug prescription |
| **User Experience** | Clean dashboard, live agent trace, exportable reports |
| **Scalability** | Modular tool architecture — easy to add more data sources |

---

## ⚠️ Disclaimers

- **This is NOT a medical device.** MedLens is an educational/research tool.
- **Not for clinical use.** All recommendations must be verified by qualified healthcare professionals.
- **AI limitations apply.** The LLM may produce inaccurate information. Always cross-reference with authoritative sources.
- **Pharmacogenomic data is generalized.** Individual genetic testing is required for precise pharmacogenomic guidance.

---

## 🤖 AI Disclosure

This project uses:
- **LiquidAI LFM2-24B-A2B-GGUF** — Large language model for medical reasoning and tool orchestration
- **AI-generated content** — The clinical analysis and recommendations are AI-generated based on real medical database queries

---

## 👥 Team

- **Aditya Acharya** — Full-stack development, AI/ML engineering

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

---

## 🔮 Future Roadmap

- [ ] Integration with more pharmacogenomic databases (DPWG, FDA PGx)
- [ ] Patient history tracking across sessions
- [ ] Multi-language support for global accessibility
- [ ] FHIR/HL7 integration for EHR systems
- [ ] Drug dosage calculator based on pharmacogenomic profile
- [ ] Mobile-responsive PWA version
- [ ] Expanded ethnic group coverage with more granular data

---

*Built with ❤️ for DevDash 2026*
