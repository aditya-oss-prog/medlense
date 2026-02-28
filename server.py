import queue
import threading
import json
import sqlite3
import uuid
from datetime import datetime
from contextlib import contextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import uvicorn

from agent.core import run_agent, run_followup, extract_patient_profile
from models.schemas import PatientProfile

app = FastAPI(title="MedLens API")

# Allow CORS for local frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite Database setup
DATABASE_PATH = "medlens.db"


@contextmanager
def get_db_connection():
    """Context manager for database connections."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    """Initialize the database with required tables."""
    with get_db_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS document_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                version_number INTEGER NOT NULL,
                report_content TEXT NOT NULL,
                patient_data_json TEXT NOT NULL,
                user_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                intent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            )
        """)
        conn.commit()


# Initialize database on startup
init_db()


class AnalyzeRequest(BaseModel):
    prompt: str
    conversation_id: Optional[str] = None
    patient_data: Optional[dict] = None
    current_report: Optional[str] = None
    is_followup: bool = False


class CreateConversationResponse(BaseModel):
    conversation_id: str


@app.get("/api/conversations")
def list_conversations():
    """List all conversations with metadata."""
    with get_db_connection() as conn:
        cursor = conn.execute(
            """
            SELECT 
                c.id,
                c.created_at,
                (SELECT content FROM chat_messages 
                 WHERE conversation_id = c.id AND role = 'user' 
                 ORDER BY created_at ASC LIMIT 1) AS first_message,
                (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id) AS message_count,
                (SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = c.id) AS last_activity,
                (SELECT MAX(version_number) FROM document_versions WHERE conversation_id = c.id) AS version_count
            FROM conversations c
            ORDER BY COALESCE(
                (SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = c.id),
                c.created_at
            ) DESC
            """
        )
        rows = cursor.fetchall()

    conversations = []
    for row in rows:
        first_msg = row["first_message"] or ""
        title = (first_msg[:60] + "…") if len(first_msg) > 60 else first_msg
        if not title:
            title = "Untitled conversation"
        conversations.append(
            {
                "id": row["id"],
                "title": title,
                "created_at": row["created_at"],
                "last_activity": row["last_activity"] or row["created_at"],
                "message_count": row["message_count"] or 0,
                "version_count": row["version_count"] or 0,
            }
        )

    return {"conversations": conversations}


@app.post("/api/conversations")
def create_conversation():
    """Create a new conversation session."""
    conversation_id = str(uuid.uuid4())
    with get_db_connection() as conn:
        conn.execute("INSERT INTO conversations (id) VALUES (?)", (conversation_id,))
        conn.commit()
    return CreateConversationResponse(conversation_id=conversation_id)


@app.get("/api/conversations/{conversation_id}/versions")
def get_conversation_versions(conversation_id: str):
    """Get all document versions for a conversation."""
    with get_db_connection() as conn:
        cursor = conn.execute(
            """
            SELECT id, version_number, user_message, created_at 
            FROM document_versions 
            WHERE conversation_id = ? 
            ORDER BY version_number ASC
            """,
            (conversation_id,),
        )
        rows = cursor.fetchall()

    versions = []
    for row in rows:
        versions.append(
            {
                "id": row["id"],
                "version_number": row["version_number"],
                "user_message": row["user_message"],
                "created_at": row["created_at"],
            }
        )

    return {"versions": versions}


@app.get("/api/conversations/{conversation_id}/messages")
def get_conversation_messages(conversation_id: str):
    """Get chat history for a conversation."""
    with get_db_connection() as conn:
        cursor = conn.execute(
            """
            SELECT id, role, content, intent, created_at 
            FROM chat_messages 
            WHERE conversation_id = ? 
            ORDER BY created_at ASC
            """,
            (conversation_id,),
        )
        rows = cursor.fetchall()

    messages = []
    for row in rows:
        messages.append(
            {
                "id": row["id"],
                "role": row["role"],
                "content": row["content"],
                "intent": row["intent"],
                "created_at": row["created_at"],
            }
        )

    return {"messages": messages}


@app.get("/api/versions/{version_id}")
def get_version(version_id: int):
    """Get a specific document version."""
    with get_db_connection() as conn:
        cursor = conn.execute(
            """
            SELECT report_content, patient_data_json, version_number, created_at
            FROM document_versions
            WHERE id = ?
            """,
            (version_id,),
        )
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Version not found")

    return {
        "id": version_id,
        "version_number": row["version_number"],
        "report": row["report_content"],
        "patient_data": json.loads(row["patient_data_json"]),
        "created_at": row["created_at"],
    }


@app.delete("/api/conversations/{conversation_id}")
def delete_conversation(conversation_id: str):
    """Delete a conversation and all its versions."""
    with get_db_connection() as conn:
        conn.execute(
            "DELETE FROM chat_messages WHERE conversation_id = ?",
            (conversation_id,),
        )
        conn.execute(
            "DELETE FROM document_versions WHERE conversation_id = ?",
            (conversation_id,),
        )
        conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
        conn.commit()
    return {"message": "Conversation deleted"}


def _save_chat_message(
    conversation_id: str, role: str, content: str, intent: str = None
):
    """Save a chat message to the database."""
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO chat_messages (conversation_id, role, content, intent) VALUES (?, ?, ?, ?)",
            (conversation_id, role, content, intent),
        )
        conn.commit()


def _get_chat_history(conversation_id: str, limit: int = 10) -> list[dict]:
    """Get recent chat history for context."""
    with get_db_connection() as conn:
        cursor = conn.execute(
            """
            SELECT role, content FROM chat_messages 
            WHERE conversation_id = ? 
            ORDER BY created_at DESC LIMIT ?
            """,
            (conversation_id, limit),
        )
        rows = cursor.fetchall()

    # Reverse to get chronological order
    return [{"role": row["role"], "content": row["content"]} for row in reversed(rows)]


def _get_latest_report(conversation_id: str) -> tuple[str, dict] | None:
    """Get the latest report and patient data for a conversation."""
    with get_db_connection() as conn:
        cursor = conn.execute(
            """
            SELECT report_content, patient_data_json 
            FROM document_versions 
            WHERE conversation_id = ? 
            ORDER BY version_number DESC LIMIT 1
            """,
            (conversation_id,),
        )
        row = cursor.fetchone()

    if row:
        return row["report_content"], json.loads(row["patient_data_json"])
    return None


@app.post("/api/analyze")
def analyze_case(req: AnalyzeRequest):
    q = queue.Queue()

    def run_agent_thread():
        try:
            # Create new conversation if not provided
            conversation_id = req.conversation_id
            if not conversation_id:
                conversation_id = str(uuid.uuid4())
                with get_db_connection() as conn:
                    conn.execute(
                        "INSERT INTO conversations (id) VALUES (?)", (conversation_id,)
                    )
                    conn.commit()

            # Save user message to chat history
            _save_chat_message(conversation_id, "user", req.prompt.strip())

            # Check if this is a follow-up (has existing report)
            is_followup = req.is_followup
            current_report = req.current_report
            current_patient_data = req.patient_data

            # Auto-detect follow-up if not explicitly flagged
            if not is_followup and not current_report:
                latest = _get_latest_report(conversation_id)
                if latest:
                    current_report, current_patient_data = latest
                    is_followup = True

            if is_followup and current_report:
                # ═══════════════════════════════════════
                # FOLLOW-UP FLOW
                # ═══════════════════════════════════════
                q.put({"type": "status", "message": "Processing follow-up..."})

                # Build patient profile from stored data
                if current_patient_data:
                    patient = PatientProfile(**current_patient_data)
                else:
                    patient = extract_patient_profile(req.prompt.strip())

                # Get chat history for context
                chat_history = _get_chat_history(conversation_id, limit=10)

                def status_callback(stage: str, message: str):
                    q.put({"type": "status", "message": message})

                result = run_followup(
                    user_message=req.prompt.strip(),
                    current_report=current_report,
                    patient=patient,
                    chat_history=chat_history,
                    status_callback=status_callback,
                )

                response_type = result["response_type"]
                intent = result.get("intent", "unknown")

                # Save assistant response to chat history
                _save_chat_message(
                    conversation_id,
                    "assistant",
                    result["chat_response"],
                    intent=intent,
                )

                if response_type == "report_update" and result.get("updated_report"):
                    # Save new version
                    patient_dict = (
                        result.get("updated_patient")
                        or current_patient_data
                        or patient.model_dump()
                    )

                    with get_db_connection() as conn:
                        cursor = conn.execute(
                            "SELECT MAX(version_number) FROM document_versions WHERE conversation_id = ?",
                            (conversation_id,),
                        )
                        max_version = cursor.fetchone()[0]
                        version_number = 1 if max_version is None else max_version + 1

                        conn.execute(
                            """
                            INSERT INTO document_versions 
                            (conversation_id, version_number, report_content, patient_data_json, user_message)
                            VALUES (?, ?, ?, ?, ?)
                            """,
                            (
                                conversation_id,
                                version_number,
                                result["updated_report"],
                                json.dumps(patient_dict),
                                req.prompt.strip(),
                            ),
                        )
                        conn.commit()

                    q.put(
                        {
                            "type": "result",
                            "response_type": "report_update",
                            "chat_response": result["chat_response"],
                            "synthesis": result["updated_report"],
                            "patient": patient_dict,
                            "conversation_id": conversation_id,
                            "version_number": version_number,
                            "intent": intent,
                        }
                    )
                else:
                    # Chat-only response — no new version
                    q.put(
                        {
                            "type": "result",
                            "response_type": "chat_only",
                            "chat_response": result["chat_response"],
                            "synthesis": None,
                            "patient": current_patient_data or patient.model_dump(),
                            "conversation_id": conversation_id,
                            "version_number": None,
                            "intent": intent,
                        }
                    )

            else:
                # ═══════════════════════════════════════
                # INITIAL ANALYSIS FLOW (first message)
                # ═══════════════════════════════════════
                q.put(
                    {"type": "status", "message": "Extracting patient demographics..."}
                )

                extracted_patient = extract_patient_profile(req.prompt.strip())

                if req.patient_data:
                    merged_patient = {
                        **extracted_patient.model_dump(),
                        **req.patient_data,
                    }
                    patient = PatientProfile(**merged_patient)
                else:
                    patient = extracted_patient

                profile_str = f"Found: {patient.age}y/o {patient.sex}"
                if patient.ethnicity != "Not specified":
                    profile_str += f", {patient.ethnicity}"
                if patient.country != "Not specified":
                    profile_str += f" ({patient.country})"

                q.put({"type": "status", "message": f"✓ {profile_str}"})
                q.put({"type": "status", "message": "Starting analysis..."})

                def status_callback(stage: str, message: str):
                    if stage in ["starting", "synthesizing"]:
                        q.put({"type": "status", "message": f"⏳ {message}"})

                result = run_agent(patient, status_callback=status_callback)

                # Get next version number
                with get_db_connection() as conn:
                    cursor = conn.execute(
                        "SELECT MAX(version_number) FROM document_versions WHERE conversation_id = ?",
                        (conversation_id,),
                    )
                    max_version = cursor.fetchone()[0]
                    version_number = 1 if max_version is None else max_version + 1

                # Save version to database
                patient_dict = patient.model_dump()
                with get_db_connection() as conn:
                    conn.execute(
                        """
                        INSERT INTO document_versions 
                        (conversation_id, version_number, report_content, patient_data_json, user_message)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (
                            conversation_id,
                            version_number,
                            result.get("synthesis", ""),
                            json.dumps(patient_dict),
                            req.prompt.strip(),
                        ),
                    )
                    conn.commit()

                # Save assistant response to chat
                _save_chat_message(
                    conversation_id,
                    "assistant",
                    "I've completed the initial clinical analysis. See the report.",
                    intent="initial_analysis",
                )

                q.put(
                    {
                        "type": "result",
                        "response_type": "report_update",
                        "chat_response": "I've completed the clinical analysis. See the report on the right.",
                        "synthesis": result.get("structured_report")
                        or result.get("synthesis", "No synthesis generated."),
                        "patient": patient_dict,
                        "conversation_id": conversation_id,
                        "version_number": version_number,
                        "intent": "initial_analysis",
                    }
                )
        except Exception as e:
            q.put({"type": "error", "message": str(e)})
        finally:
            q.put({"type": "done"})

    threading.Thread(target=run_agent_thread, daemon=True).start()

    def event_stream():
        while True:
            item = q.get()
            if item["type"] == "done":
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
