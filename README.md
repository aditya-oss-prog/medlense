# 🔬 MedLens — Ethnicity-Aware Clinical Decision Support AI

MedLens is an AI-powered clinical decision support tool that generates **ethnicity-aware, evidence-based medical reports** by orchestrating multiple biomedical data sources through an intelligent agent. It considers pharmacogenomic variations, population-specific drug responses, and cultural factors to provide more personalized clinical insights.

> ⚠️ **Disclaimer:** MedLens is for **educational and research purposes only** — it is not a substitute for professional medical advice, diagnosis, or treatment.

---

## ✨ Features

- **Ethnicity-Aware Analysis** — Considers pharmacogenomic variants (e.g., CYP2D6, CYP2C19) that vary by ethnic group, affecting drug metabolism and response
- **Multi-Source Evidence Gathering** — Automatically queries PubMed, OpenFDA, ClinicalTrials.gov, PharmGKB, and drug interaction databases
- **Conversational Follow-ups** — Ask follow-up questions, request edits, or add new information to refine reports
- **Version History** — Every report revision is saved; browse and compare previous versions
- **Conversation Management** — Create, load, and delete conversation sessions with full chat history
- **4 Beautiful Themes** — Warm Stone, Clinical Teal, Therapeutic Sage, and Midnight (Dark)
- **Resizable Panels** — Drag to resize the chat and report panels
- **Streaming Responses** — Real-time status updates via Server-Sent Events (SSE)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│            (Vite + Tailwind CSS + TypeScript)            │
│                    Port 5173                             │
└──────────────────────┬──────────────────────────────────┘
                       │  /api/* (Vite Proxy)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Backend                          │
│                    Port 8000                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │              LLM Agent (Core)                    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │    │
│  │  │ PubMed   │ │ OpenFDA  │ │ ClinicalTrials │  │    │
│  │  │ Search   │ │ Drug DB  │ │    .gov        │  │    │
│  │  └──────────┘ └──────────┘ └────────────────┘  │    │
│  │  ┌──────────────────┐ ┌─────────────────────┐  │    │
│  │  │ Pharmacogenomics │ │  Drug Interactions  │  │    │
│  │  │    (PharmGKB)    │ │                     │  │    │
│  │  └──────────────────┘ └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────┘    │
│                         │                                │
│                    SQLite DB                              │
│              (conversations, versions,                    │
│                  chat messages)                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite 7, Tailwind CSS 4, Lucide Icons, React Markdown |
| **Backend** | Python, FastAPI, Uvicorn, Pydantic |
| **LLM** | LiquidAI LFM2-24B via HuggingFace Inference API |
| **Database** | SQLite (file-based, zero config) |
| **Data Sources** | PubMed (NCBI), OpenFDA, ClinicalTrials.gov, PharmGKB, DrugBank |

---

## 🔧 Tools & Data Sources

| Tool | API | What It Does |
|------|-----|-------------|
| **PubMed Search** | NCBI E-utilities | Searches medical literature, returns paper titles, abstracts, PMIDs |
| **Drug Lookup** | OpenFDA Drug Labels | Fetches drug info — indications, dosage, warnings, contraindications, adverse reactions |
| **Clinical Trials** | ClinicalTrials.gov v2 | Finds relevant clinical trials by condition, returns status, phases, interventions |
| **Pharmacogenomics** | PharmGKB | Retrieves gene-drug associations, dosing guidelines by genotype/ethnicity |
| **Drug Interactions** | DrugBank-style | Checks interactions between medications, severity levels, clinical effects |

---

## 📁 Project Structure

```
medlens/
├── server.py                  # FastAPI backend server (API endpoints, SSE streaming)
├── app.py                     # Legacy Streamlit interface (alternative UI)
├── requirements.txt           # Python dependencies
├── medlens.db                 # SQLite database (auto-created)
├── .env                       # Environment variables (API keys)
│
├── agent/
│   ├── core.py                # Agent orchestration — runs tools, synthesizes reports
│   ├── prompts.py             # System prompts for LLM (analysis, follow-up, intent classification)
│   └── llm_client.py          # HuggingFace Inference API client with retry logic
│
├── models/
│   └── schemas.py             # Pydantic models (PatientProfile, ToolResult, etc.)
│
├── tools/
│   ├── pubmed_search.py       # PubMed/NCBI search tool
│   ├── drug_lookup.py         # OpenFDA drug label lookup
│   ├── clinical_trials.py     # ClinicalTrials.gov search
│   ├── pharmacogenomics.py    # PharmGKB pharmacogenomics data
│   └── drug_interactions.py   # Drug-drug interaction checker
│
├── utils/
│   └── helpers.py             # Token counting, text truncation utilities
│
└── frontend/
    ├── package.json           # Node.js dependencies
    ├── vite.config.ts         # Vite config (dev server, proxy, Tailwind)
    ├── index.html             # Entry HTML
    └── src/
        ├── App.tsx            # Main React app (chat UI, report panel, themes)
        ├── main.tsx           # React entry point
        └── index.css          # Global styles
```

---

## 📋 Prerequisites

- **Python** 3.10+
- **Node.js** 18+ and npm
- **HuggingFace API Key** with access to an inference endpoint

---

## ⚙️ Environment Setup

Create a `.env` file in the project root:

```env
HF_API_URL=https://your-huggingface-endpoint-url
HF_API_KEY=hf_your_api_key_here
HF_MODEL=LiquidAI/LFM2-24B-A2B-GGUF
MAX_CONTEXT_TOKENS=32000
```

---

## 🚀 Installation & Running

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/your-username/medlens.git
cd medlens

# 2. Set up Python backend
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Set up frontend
cd frontend
npm install
cd ..

# 4. Start backend (Terminal 1)
python server.py                # Runs on http://localhost:8000

# 5. Start frontend (Terminal 2)
cd frontend
npm run dev                     # Runs on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

### Remote Server / EC2

```bash
# 1. Start backend (Terminal 1)
python server.py                # Listens on 0.0.0.0:8000

# 2. Start frontend (Terminal 2)
cd frontend
npm run dev                     # Listens on 0.0.0.0:5173 (configured in vite.config.ts)
```

The Vite dev server proxies all `/api/*` requests to the backend internally, so you **only need port 5173 open** in your security group/firewall.

Open **http://your-server-ip:5173** from any browser.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/conversations` | List all conversations with metadata |
| `POST` | `/api/conversations` | Create a new conversation |
| `GET` | `/api/conversations/:id/messages` | Get chat history for a conversation |
| `GET` | `/api/conversations/:id/versions` | Get document version history |
| `GET` | `/api/versions/:id` | Get a specific report version (content + patient data) |
| `DELETE` | `/api/conversations/:id` | Delete a conversation and all data |
| `POST` | `/api/analyze` | Main analysis endpoint (SSE streaming) |

### `POST /api/analyze` Request Body

```json
{
  "prompt": "45yo South Asian male with Type 2 Diabetes on metformin",
  "conversation_id": "optional-uuid",
  "patient_data": { "age": 45, "sex": "Male", "ethnicity": "South Asian" },
  "current_report": "optional - existing report for follow-ups",
  "is_followup": false
}
```

Response is a **Server-Sent Events stream** with `status`, `result`, and `error` events.

---

## 🔄 How It Works

1. **Patient Profile Extraction** — The LLM extracts structured patient demographics (age, sex, ethnicity, medications, allergies) from free-text input
2. **Parallel Tool Execution** — The agent runs 5 tools concurrently:
   - Searches PubMed for relevant research
   - Looks up current medications on OpenFDA
   - Finds relevant clinical trials
   - Checks pharmacogenomic considerations for the patient's ethnicity
   - Verifies drug-drug interactions
3. **Evidence Synthesis** — The LLM synthesizes all tool results into a structured clinical report with ethnicity-specific considerations
4. **Follow-up Handling** — On subsequent messages, the agent classifies intent (edit, addition, question, research) and either updates the report or responds conversationally
5. **Version Control** — Each report update creates a new version; users can browse previous versions

---

## 🎨 Themes

| Theme | Style |
|-------|-------|
| **Warm Stone** | Soft warm neutrals with terracotta accent |
| **Clinical Teal** | Clean medical look with teal highlights |
| **Therapeutic Sage** | Calming green earth tones |
| **Midnight** | Dark mode with indigo accent |

---

## 📄 License

This project is for educational and research purposes. Not intended for clinical use.
