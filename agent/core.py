"""Core agent loop with tool calling for MedLens clinical decision support."""

import json
import concurrent.futures
from agent.llm_client import chat_completion
from agent.prompts import (
    SYSTEM_PROMPT,
    SYNTHESIS_PROMPT,
    STRUCTURED_SYNTHESIS_PROMPT,
    UNIFIED_FOLLOWUP_PROMPT,
    FOLLOWUP_CLASSIFY_PROMPT,
    FOLLOWUP_CHAT_PROMPT,
    FOLLOWUP_REPORT_UPDATE_PROMPT,
)
from utils.helpers import format_patient_context, truncate_to_tokens, safe_json_parse
from models.schemas import PatientProfile, ToolCall

# Parallel execution mode - set to True to enable concurrent tool execution
# Can be overridden via environment variable: PARALLEL_TOOLS=true
import os

PARALLEL_TOOL_MODE = os.getenv("PARALLEL_TOOLS", "true").lower() == "true"
MAX_WORKERS = int(os.getenv("MAX_PARALLEL_WORKERS", "5"))  # Max parallel tool calls

# Log parallel mode status on import
print(
    f"[Agent] Parallel tool execution: {'ENABLED' if PARALLEL_TOOL_MODE else 'DISABLED'} (max_workers={MAX_WORKERS})"
)

# Import tool functions
from tools.pubmed_search import search_pubmed
from tools.drug_lookup import lookup_drug_info, search_drugs_for_condition
from tools.clinical_trials import search_clinical_trials
from tools.pharmacogenomics import check_pharmacogenomics, get_population_drug_warnings
from tools.drug_interactions import check_drug_interactions

# Import tool definitions
from tools.pubmed_search import TOOL_DEFINITION as PUBMED_TOOL
from tools.drug_lookup import TOOL_DEFINITION_LOOKUP as DRUG_LOOKUP_TOOL
from tools.drug_lookup import TOOL_DEFINITION_SEARCH as DRUG_SEARCH_TOOL
from tools.clinical_trials import TOOL_DEFINITION as CLINICAL_TRIALS_TOOL
from tools.pharmacogenomics import TOOL_DEFINITION_CHECK as PHARMGEN_CHECK_TOOL
from tools.pharmacogenomics import TOOL_DEFINITION_WARNINGS as PHARMGEN_WARN_TOOL
from tools.drug_interactions import TOOL_DEFINITION as DRUG_INTERACT_TOOL

# Map tool names to functions
TOOL_FUNCTIONS = {
    "search_pubmed": search_pubmed,
    "lookup_drug_info": lookup_drug_info,
    "search_drugs_for_condition": search_drugs_for_condition,
    "search_clinical_trials": search_clinical_trials,
    "check_pharmacogenomics": check_pharmacogenomics,
    "get_population_drug_warnings": get_population_drug_warnings,
    "check_drug_interactions": check_drug_interactions,
}

# All tool definitions
ALL_TOOLS = [
    PUBMED_TOOL,
    DRUG_LOOKUP_TOOL,
    DRUG_SEARCH_TOOL,
    CLINICAL_TRIALS_TOOL,
    PHARMGEN_CHECK_TOOL,
    PHARMGEN_WARN_TOOL,
    DRUG_INTERACT_TOOL,
]

MAX_TOOL_ROUNDS = 6


def execute_tool(name: str, arguments: dict) -> str:
    """Execute a tool by name with given arguments."""
    func = TOOL_FUNCTIONS.get(name)
    if not func:
        return f"Error: Unknown tool '{name}'"
    try:
        result = func(**arguments)
        return truncate_to_tokens(str(result), 2500)
    except TypeError as e:
        return f"Error calling {name}: Invalid arguments - {str(e)}"
    except Exception as e:
        return f"Error executing {name}: {str(e)}"


def _execute_tool_calls(tool_calls, tool_trace, messages, update_status):
    """Execute tool calls (parallel or sequential) and add results to messages.
    
    Shared helper used by both run_agent and run_followup.
    """
    if PARALLEL_TOOL_MODE and len(tool_calls) > 1:
        update_status(
            "tool_call",
            f"Executing {len(tool_calls)} tools in parallel...",
        )

        def execute_single_tool(tc):
            func_name = tc["function"]["name"]
            try:
                args = json.loads(tc["function"]["arguments"])
            except json.JSONDecodeError:
                args = {}
            result = execute_tool(func_name, args)
            return {
                "tool_call": tc,
                "func_name": func_name,
                "args": args,
                "result": result,
            }

        with concurrent.futures.ThreadPoolExecutor(
            max_workers=MAX_WORKERS
        ) as executor:
            futures = {
                executor.submit(execute_single_tool, tc): tc for tc in tool_calls
            }
            for future in concurrent.futures.as_completed(futures):
                try:
                    tool_result = future.result()
                    tc = tool_result["tool_call"]
                    func_name = tool_result["func_name"]
                    args = tool_result["args"]
                    result = tool_result["result"]

                    tool_trace.append(
                        ToolCall(
                            tool_name=func_name,
                            arguments=args,
                            result=truncate_to_tokens(result, 500),
                        )
                    )
                    update_status(
                        "tool_result",
                        f"{func_name} returned {len(result)} chars",
                    )
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc["id"],
                            "content": result,
                        }
                    )
                except Exception as e:
                    tc = futures[future]
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc["id"],
                            "content": f"Error: {str(e)}",
                        }
                    )

        update_status("thinking", "All tools completed, continuing analysis...")
    else:
        # Sequential execution
        for tc in tool_calls:
            func_name = tc["function"]["name"]
            try:
                args = json.loads(tc["function"]["arguments"])
            except json.JSONDecodeError:
                args = {}

            update_status(
                "tool_call",
                f"Calling {func_name}({json.dumps(args, default=str)[:100]})",
            )

            result = execute_tool(func_name, args)

            tool_trace.append(
                ToolCall(
                    tool_name=func_name,
                    arguments=args,
                    result=truncate_to_tokens(result, 500),
                )
            )

            update_status(
                "tool_result", f"{func_name} returned {len(result)} chars"
            )

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": result,
                }
            )


def run_agent(patient: PatientProfile, status_callback=None) -> dict:
    """Run the full agent pipeline for a patient case.

    Args:
        patient: Patient profile with symptoms and demographics
        status_callback: Optional function(stage, message) for UI updates

    Returns:
        Dict with 'synthesis' (str), 'tool_trace' (list of ToolCall),
        and 'messages' (conversation history).
    """
    tool_trace = []

    def update_status(stage: str, message: str):
        if status_callback:
            status_callback(stage, message)

    # Build initial messages
    patient_context = format_patient_context(patient)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Please analyze the following patient case and provide comprehensive "
                f"clinical decision support.\n\n"
                f"**Patient Profile:**\n{patient_context}\n\n"
                f"Follow your workflow: analyze symptoms, search research databases, "
                f"find appropriate drugs, check pharmacogenomics for the patient's "
                f"ethnic background, and check for any drug interactions. "
                f"Use all available tools to gather evidence."
            ),
        },
    ]

    update_status("starting", "Analyzing patient symptoms...")

    # Agent loop: LLM calls tools iteratively
    for round_num in range(MAX_TOOL_ROUNDS):
        update_status(
            "thinking", f"Agent reasoning (round {round_num + 1}/{MAX_TOOL_ROUNDS})..."
        )

        response = chat_completion(
            messages=messages,
            tools=ALL_TOOLS,
            temperature=0.1,
            max_tokens=4096,
        )

        tool_calls = response.get("tool_calls", [])
        content = response.get("content", "")

        # If no tool calls, agent is done reasoning
        if not tool_calls:
            if content:
                messages.append({"role": "assistant", "content": content})
            break

        # Process tool calls
        assistant_msg = {"role": "assistant", "content": content or None}
        if tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc["id"],
                    "type": "function",
                    "function": tc["function"],
                }
                for tc in tool_calls
            ]
        messages.append(assistant_msg)

        _execute_tool_calls(tool_calls, tool_trace, messages, update_status)

    # Final synthesis: ask the LLM to compile all findings into structured format
    update_status("synthesizing", "Compiling final analysis...")

    # Build tool results summary for structured synthesis
    tool_results_summary = []
    for tc in tool_trace:
        tool_results_summary.append(f"{tc.tool_name}: {tc.result[:500]}...")

    messages.append(
        {
            "role": "user",
            "content": STRUCTURED_SYNTHESIS_PROMPT.format(
                patient_context=format_patient_context(patient),
                tool_results="\n\n".join(tool_results_summary)
                if tool_results_summary
                else "No tool results available",
            ),
        }
    )

    synthesis_response = chat_completion(
        messages=messages,
        tools=None,  # No tools in synthesis phase
        temperature=0.1,
        max_tokens=4096,
    )

    synthesis_content = synthesis_response.get(
        "content", "Unable to generate synthesis."
    )

    # Try to parse structured JSON output
    structured_report = safe_json_parse(synthesis_content)

    update_status("complete", "Analysis complete!")

    return {
        "synthesis": synthesis_content,
        "structured_report": structured_report
        if isinstance(structured_report, dict)
        else None,
        "tool_trace": tool_trace,
        "messages": messages,
    }


def extract_patient_profile(text: str) -> PatientProfile:
    """Extract structured patient profile from natural language prompt."""
    prompt = f"""Extract the following patient details from the text. Return ONLY a valid JSON object matching this structure:
{{
    "age": <integer or 0 if not specified>,
    "sex": "<string, e.g. Male, Female, Other, or 'Not specified'>",
    "ethnicity": "<string, e.g. South Asian, Caucasian, African American, or 'Not specified'>",
    "country": "<string, e.g. India, USA, or 'Not specified'>",
    "allergies": "<string, e.g. Penicillin or 'Not specified'>",
    "current_medications": "<string, e.g. Metformin or 'Not specified'>"
}}
If any field is missing, use 0 for age, and "Not specified" for strings. Do not invent information.

Text: {text}
"""
    response = chat_completion(
        messages=[{"role": "user", "content": prompt}], temperature=0.0, max_tokens=250
    )

    parsed = safe_json_parse(response.get("content", "{}"))
    if not isinstance(parsed, dict):
        parsed = {}

    # Ensure age is integer
    try:
        age = int(parsed.get("age", 0))
    except (ValueError, TypeError):
        age = 0

    return PatientProfile(
        symptoms=text,
        age=age,
        sex=str(parsed.get("sex", "Not specified")),
        ethnicity=str(parsed.get("ethnicity", "Not specified")),
        country=str(parsed.get("country", "Not specified")),
        allergies=str(parsed.get("allergies", "Not specified")),
        current_medications=str(parsed.get("current_medications", "Not specified")),
    )


# ─────────────────────── Report Merge Logic ───────────────────────


def merge_report(existing_report: dict, changes: dict) -> dict:
    """Merge partial report changes into an existing report.
    
    Only overwrites sections that are present in `changes` and have 
    meaningful content (non-null, non-empty). Preserves everything else.
    
    Args:
        existing_report: The current full report as a dict
        changes: A partial dict with only the sections that changed
        
    Returns:
        A new dict with changes merged into the existing report
    """
    if not changes or not isinstance(changes, dict):
        return existing_report
    if not existing_report or not isinstance(existing_report, dict):
        return changes
    
    merged = dict(existing_report)  # shallow copy
    
    # Valid report section keys
    valid_keys = {
        "chiefComplaint", "differentialDiagnosis", "drugRecommendations",
        "researchEvidence", "pharmacogenomics", "drugInteractions",
        "alerts", "workupRecommendations", "assessment", "plan",
        "followUpRecommendations", "complexityLevel", "clinicalTrials",
    }
    
    for key, value in changes.items():
        if key not in valid_keys:
            continue
            
        # Skip null/None values — don't overwrite with nothing
        if value is None:
            continue
            
        # For array sections, only overwrite if the new array is non-empty
        if isinstance(value, list):
            if len(value) > 0:
                merged[key] = value
            # If empty list, only overwrite if intent is clearly to remove
            # (empty list in changes = clear this section)
            elif key in changes:
                merged[key] = value
        
        # For string sections, only overwrite if non-empty
        elif isinstance(value, str):
            if len(value.strip()) > 0:
                merged[key] = value
        
        # For other types (e.g., complexityLevel), always overwrite
        else:
            merged[key] = value
    
    return merged


# ─────────────────────── Unified Follow-Up Handler ───────────────────────


def run_followup(
    user_message: str,
    current_report: str,
    patient: PatientProfile,
    chat_history: list[dict] = None,
    status_callback=None,
) -> dict:
    """Handle a follow-up message using the unified flexible approach.
    
    The LLM decides whether to:
    - Answer conversationally only (chat)
    - Update the report (partial changes merged into existing)
    - Use tools to look up information
    - Any combination of the above
    
    Returns:
        Dict with response_type, chat_response, report_changes, etc.
    """
    tool_trace = []

    def update_status(stage: str, message: str):
        if status_callback:
            status_callback(stage, message)

    patient_context = format_patient_context(patient)

    # Check for new patient case (simple heuristic — avoids wasting an LLM call)
    if _is_new_patient_request(user_message):
        update_status("starting", "New patient detected — running full analysis...")
        new_patient = extract_patient_profile(user_message)
        result = run_agent(new_patient, status_callback=status_callback)
        return {
            "response_type": "report_update",
            "chat_response": "I've analyzed the new patient case. See the updated report.",
            "report_changes": None,
            "updated_report": result.get("synthesis", ""),
            "updated_patient": new_patient.model_dump(),
            "intent": "new_patient",
            "tool_trace": result.get("tool_trace", []),
        }

    # Format chat history for the prompt
    chat_history_str = ""
    if chat_history:
        for msg in chat_history[-8:]:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            chat_history_str += f"{role.upper()}: {truncate_to_tokens(content, 200)}\n"
    if not chat_history_str:
        chat_history_str = "(No previous conversation)"

    # Truncate current report for context
    report_context = truncate_to_tokens(current_report, 3000)

    # Build the unified follow-up prompt
    system_prompt = UNIFIED_FOLLOWUP_PROMPT.format(
        patient_context=patient_context,
        current_report=report_context,
        chat_history=chat_history_str,
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    update_status("thinking", "Processing your message...")

    # Agent loop: allow tool calls for research
    for round_num in range(5):
        response = chat_completion(
            messages=messages,
            tools=ALL_TOOLS,
            temperature=0.2,
            max_tokens=4096,
        )

        tool_calls = response.get("tool_calls", [])
        content = response.get("content", "")

        if not tool_calls:
            break

        # Process tool calls
        assistant_msg = {"role": "assistant", "content": content or None}
        assistant_msg["tool_calls"] = [
            {"id": tc["id"], "type": "function", "function": tc["function"]}
            for tc in tool_calls
        ]
        messages.append(assistant_msg)

        _execute_tool_calls(tool_calls, tool_trace, messages, update_status)

    # If the loop exhausted with tool calls still pending, get final response
    if tool_calls:
        update_status("thinking", "Summarizing findings...")
        # Remind the LLM to produce JSON before the final call
        messages.append({
            "role": "user",
            "content": "Now respond with the required JSON format: {\"chat_message\": \"...\", \"report_changes\": null | {...}}"
        })
        response = chat_completion(
            messages=messages,
            tools=None,
            temperature=0.2,
            max_tokens=4096,
            json_mode=True,
        )
        content = response.get("content", "")

    # Parse the unified response
    update_status("processing", "Processing response...")
    parsed_response = _parse_unified_response(content)

    # If parsing failed to detect the structured format, and the user's message
    # suggests a report update, force a FRESH LLM call to produce structured JSON.
    # Uses a clean, short conversation (not appended to the long tool conversation)
    # to avoid the "LLM forgot the format" problem.
    if (
        parsed_response.get("report_changes") is None
        and _looks_like_report_update_request(user_message)
    ):
        update_status("formatting", "Formatting report update...")
        print(f"[run_followup] Forced formatting triggered for: {user_message[:100]}")
        print(f"[run_followup] Original content preview: {content[:300]}")

        # Summarize tool results for the fresh call
        tool_summary = ""
        if tool_trace:
            tool_summary = "TOOL RESULTS:\n"
            for tc in tool_trace:
                tool_summary += f"- {tc.tool_name}: {tc.result[:300]}\n"

        # Fresh, dedicated LLM call with minimal context
        fresh_messages = [
            {
                "role": "system",
                "content": (
                    "You are a JSON formatting assistant for a clinical report system. "
                    "You MUST return ONLY a valid JSON object with no markdown, no code blocks, no explanation. "
                    "The JSON must have exactly this structure:\n"
                    '{"chat_message": "explanation of changes", "report_changes": {...sections that changed...}}\n\n'
                    "For report_changes, use the same schema as the current report. "
                    "For array sections (like drugRecommendations), include ALL items (old + new)."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"The user asked: \"{user_message}\"\n\n"
                    f"Here is what we found:\n{content[:2000]}\n\n"
                    f"{tool_summary}\n"
                    f"CURRENT REPORT:\n{report_context}\n\n"
                    f"Now produce the JSON with chat_message and report_changes. "
                    f"Return ONLY the JSON object."
                ),
            },
        ]

        format_response = chat_completion(
            messages=fresh_messages,
            tools=None,
            temperature=0.1,
            max_tokens=4096,
            json_mode=True,
        )
        format_content = format_response.get("content", "")
        print(f"[run_followup] Fresh format response preview: {format_content[:300]}")
        
        retry_parsed = _parse_unified_response(format_content)
        if retry_parsed.get("report_changes") is not None:
            print(f"[run_followup] ✓ Fresh formatting produced report_changes")
            parsed_response = retry_parsed
        else:
            print(f"[run_followup] ✗ Fresh formatting still no report_changes")
            if retry_parsed.get("chat_message"):
                parsed_response["chat_message"] = retry_parsed["chat_message"]

    chat_response = parsed_response.get("chat_message", "").strip()
    report_changes = parsed_response.get("report_changes", None)

    if not chat_response:
        chat_response = content.strip() if content else "I couldn't generate a response. Please try rephrasing."

    # Determine response type based on whether report changes exist
    has_report_changes = (
        report_changes is not None
        and isinstance(report_changes, dict)
        and len(report_changes) > 0
    )

    if has_report_changes:
        # Merge changes into existing report
        existing_report = safe_json_parse(current_report)
        if not isinstance(existing_report, dict):
            existing_report = {}

        merged_report = merge_report(existing_report, report_changes)
        merged_report_str = json.dumps(merged_report)

        # Check patient updates
        updated_patient = _check_patient_update(user_message, patient)

        update_status("complete", "Report updated!")

        return {
            "response_type": "report_update",
            "chat_response": chat_response,
            "report_changes": report_changes,
            "updated_report": merged_report_str,
            "updated_patient": updated_patient,
            "intent": "update_report",
            "tool_trace": tool_trace,
        }
    else:
        update_status("complete", "Done!")

        return {
            "response_type": "chat_only",
            "chat_response": chat_response,
            "report_changes": None,
            "updated_report": None,
            "updated_patient": None,
            "intent": "chat",
            "tool_trace": tool_trace,
        }


def _parse_unified_response(content: str) -> dict:
    """Parse the unified follow-up response from the LLM.
    
    Expected format:
    {"chat_message": "...", "report_changes": null | {...}}
    
    Falls back gracefully if the LLM doesn't follow the format.
    Uses multiple extraction strategies.
    """
    if not content:
        return {"chat_message": "", "report_changes": None}
    
    # Strategy 1: Direct JSON parse (handles code blocks via safe_json_parse)
    parsed = safe_json_parse(content)
    
    if isinstance(parsed, dict):
        # Check if it's in the expected unified format
        if "chat_message" in parsed:
            print(f"[_parse_unified_response] ✓ Found unified format with chat_message")
            return parsed
        
        # Maybe the LLM returned a raw report JSON — treat as changes
        if any(key in parsed for key in ["differentialDiagnosis", "drugRecommendations", "assessment"]):
            print(f"[_parse_unified_response] ✓ Found raw report JSON — treating as changes")
            return {
                "chat_message": "I've updated the report based on your request.",
                "report_changes": parsed,
            }
    
    # Strategy 2: Try to extract JSON from mixed text (LLM often wraps in explanation)
    import re
    
    # Look for {"chat_message": ...} pattern anywhere in the text
    json_patterns = [
        r'(\{[^{}]*"chat_message"[^{}]*\{[^}]*\}[^}]*\})',  # nested object
        r'(\{"chat_message".*\})\s*$',  # from chat_message to end
    ]
    
    for pattern in json_patterns:
        match = re.search(pattern, content, re.DOTALL)
        if match:
            try:
                extracted = json.loads(match.group(1))
                if isinstance(extracted, dict) and "chat_message" in extracted:
                    print(f"[_parse_unified_response] ✓ Extracted JSON via regex pattern")
                    return extracted
            except (json.JSONDecodeError, IndexError):
                pass
    
    # Strategy 3: Find the largest valid JSON object in the content
    brace_start = content.find('{')
    if brace_start != -1:
        # Try progressively smaller substrings from the first { to the last }
        brace_end = content.rfind('}')
        if brace_end > brace_start:
            candidate = content[brace_start:brace_end + 1]
            try:
                extracted = json.loads(candidate)
                if isinstance(extracted, dict):
                    if "chat_message" in extracted:
                        print(f"[_parse_unified_response] ✓ Extracted JSON via brace matching")
                        return extracted
                    if any(k in extracted for k in ["differentialDiagnosis", "drugRecommendations", "assessment"]):
                        print(f"[_parse_unified_response] ✓ Extracted raw report JSON via brace matching")
                        return {
                            "chat_message": "I've updated the report based on your request.",
                            "report_changes": extracted,
                        }
            except json.JSONDecodeError:
                pass
    
    # Fallback: treat entire content as a chat message
    print(f"[_parse_unified_response] ✗ No JSON found — treating as chat. Content preview: {content[:200]}")
    return {"chat_message": content.strip(), "report_changes": None}


def _is_new_patient_request(message: str) -> bool:
    """Quick heuristic to detect if the user is describing a completely new patient."""
    msg_lower = message.lower().strip()
    new_patient_indicators = [
        "new patient",
        "new case",
        "analyze a new",
        "different patient",
        "another patient",
        "new clinical case",
    ]
    return any(indicator in msg_lower for indicator in new_patient_indicators)


def _looks_like_report_update_request(message: str) -> bool:
    """Use a fast LLM call to classify if the user wants to modify the report.
    
    Returns True if the LLM determines the user's intent is to update/modify
    the clinical report (add drugs, remove diagnoses, change recommendations, etc.)
    Returns False for information questions, general chat, or anything else.
    """
    classify_prompt = (
        "You are an intent classifier. Given a user message in the context of a clinical "
        "decision support system that has an existing patient report, classify the intent.\n\n"
        "Reply with ONLY a JSON object: {\"intent\": \"update\" | \"info\"}\n\n"
        "- \"update\": The user wants to MODIFY the report — add/remove/change drugs, "
        "diagnoses, recommendations, patient info, or any section of the report.\n"
        "  Examples: 'add fluoxetine', 'remove diabetes', 'switch to lisinopril', "
        "'change the dose to 20mg', 'include aspirin in treatment'\n\n"
        "- \"info\": The user is asking a QUESTION or wants information — side effects, "
        "explanations, research, general knowledge, or anything that doesn't change the report.\n"
        "  Examples: 'what are the side effects of metformin?', 'tell me about fluoxetine', "
        "'is this drug safe in pregnancy?', 'explain CYP2D6'\n\n"
        f"User message: \"{message}\"\n\n"
        "Return ONLY the JSON object."
    )
    
    try:
        response = chat_completion(
            messages=[{"role": "user", "content": classify_prompt}],
            temperature=0.0,
            max_tokens=50,
            json_mode=True,
        )
        content = response.get("content", "")
        parsed = safe_json_parse(content)
        
        if isinstance(parsed, dict):
            intent = parsed.get("intent", "").lower().strip()
            print(f"[_looks_like_report_update_request] LLM classified '{message[:60]}' → {intent}")
            return intent == "update"
        
        print(f"[_looks_like_report_update_request] Failed to parse LLM response: {content[:100]}")
        return False
    except Exception as e:
        print(f"[_looks_like_report_update_request] LLM call failed: {e}")
        # Fallback: conservative — don't trigger retry on failure
        return False


def _check_patient_update(user_message: str, patient: PatientProfile) -> dict | None:
    """Check if the follow-up message implies changes to patient demographics."""
    msg_lower = user_message.lower()

    # Quick heuristic check — only call LLM if message likely contains patient data changes
    change_keywords = [
        "age",
        "year old",
        "male",
        "female",
        "ethnicity",
        "country",
        "allerg",
        "medication",
        "taking",
        "prescribed",
        "weight",
    ]

    if not any(kw in msg_lower for kw in change_keywords):
        return None

    prompt = f"""The user sent this message about an existing patient:
"{user_message}"

Current patient data:
- Age: {patient.age}
- Sex: {patient.sex}
- Ethnicity: {patient.ethnicity}
- Country: {patient.country}
- Allergies: {patient.allergies}
- Current Medications: {patient.current_medications}
- Symptoms: {patient.symptoms}

Does this message change any patient demographics or medication info? 
If YES, return a JSON with ONLY the changed fields.
If NO, return {{"no_changes": true}}

Return ONLY valid JSON, nothing else."""

    response = chat_completion(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=300,
    )

    parsed = safe_json_parse(response.get("content", "{}"))

    if not isinstance(parsed, dict) or parsed.get("no_changes"):
        return None

    # Merge changes into existing patient data
    current = patient.model_dump()
    for key, value in parsed.items():
        if key in current and key != "symptoms":
            current[key] = value

    return current
