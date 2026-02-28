"""Core agent loop with tool calling for MedLens clinical decision support."""

import json
from agent.llm_client import chat_completion
from agent.prompts import (
    SYSTEM_PROMPT,
    SYNTHESIS_PROMPT,
    STRUCTURED_SYNTHESIS_PROMPT,
    FOLLOWUP_CLASSIFY_PROMPT,
    FOLLOWUP_CHAT_PROMPT,
    FOLLOWUP_REPORT_UPDATE_PROMPT,
)
from utils.helpers import format_patient_context, truncate_to_tokens, safe_json_parse
from models.schemas import PatientProfile, ToolCall

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
        # Build assistant message with tool calls
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

        # Execute each tool call and add results
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

            # Track for UI
            tool_trace.append(
                ToolCall(
                    tool_name=func_name,
                    arguments=args,
                    result=truncate_to_tokens(result, 500),
                )
            )

            update_status("tool_result", f"{func_name} returned {len(result)} chars")

            # Add tool result to messages
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": result,
                }
            )

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
    from utils.helpers import safe_json_parse

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


# ─────────────────────── Follow-Up Handling ───────────────────────


def classify_intent(
    user_message: str, current_report: str, patient_context: str
) -> dict:
    """Classify the intent of a follow-up message.

    Returns:
        Dict with 'intent' (str) and 'reasoning' (str).
        Intent is one of: chat, update_report, new_patient
    """
    messages = [
        {"role": "system", "content": FOLLOWUP_CLASSIFY_PROMPT},
        {
            "role": "user",
            "content": (
                f"Current patient: {patient_context}\n\n"
                f"Current report exists: Yes (length: {len(current_report)} chars)\n\n"
                f"User's follow-up message: {user_message}"
            ),
        },
    ]

    response = chat_completion(
        messages=messages,
        temperature=0.0,
        max_tokens=200,
    )

    from utils.helpers import safe_json_parse

    content = response.get("content", "")
    parsed = safe_json_parse(content)

    if isinstance(parsed, dict) and "intent" in parsed:
        intent = parsed["intent"]
        valid_intents = ["chat", "update_report", "new_patient"]
        if intent in valid_intents:
            return parsed

    # Fallback: default to chat
    return {
        "intent": "chat",
        "reasoning": "Could not classify intent, defaulting to chat",
    }


def run_followup(
    user_message: str,
    current_report: str,
    patient: PatientProfile,
    chat_history: list[dict] = None,
    status_callback=None,
) -> dict:
    """Handle a follow-up message in an existing conversation.

    Uses 3 simplified intents:
    - chat: answer in conversation (default), never modify report
    - update_report: modify the report document → new version
    - new_patient: full pipeline from scratch
    """
    tool_trace = []

    def update_status(stage: str, message: str):
        if status_callback:
            status_callback(stage, message)

    patient_context = format_patient_context(patient)

    # Step 1: Classify intent
    update_status("classifying", "Understanding your request...")
    intent_result = classify_intent(user_message, current_report, patient_context)
    intent = intent_result["intent"]
    update_status("classified", f"Intent: {intent}")

    # Step 2: Handle based on intent
    if intent == "new_patient":
        update_status("starting", "New patient detected — running full analysis...")
        new_patient = extract_patient_profile(user_message)
        result = run_agent(new_patient, status_callback=status_callback)
        return {
            "response_type": "report_update",
            "chat_response": "I've analyzed the new patient case. See the updated report.",
            "updated_report": result.get("synthesis", ""),
            "updated_patient": new_patient.model_dump(),
            "intent": intent,
            "tool_trace": result.get("tool_trace", []),
        }

    elif intent == "update_report":
        return _handle_report_update(
            user_message,
            current_report,
            patient,
            patient_context,
            tool_trace,
            update_status,
        )

    else:
        # Default: chat (handles questions, research, info requests, everything conversational)
        return _handle_chat(
            user_message,
            current_report,
            patient,
            patient_context,
            chat_history,
            tool_trace,
            update_status,
        )


def _handle_chat(
    user_message,
    current_report,
    patient,
    patient_context,
    chat_history,
    tool_trace,
    update_status,
):
    """Handle any conversational follow-up — answer in chat, use tools if needed, NEVER modify report."""
    update_status("thinking", "Processing your message...")

    report_summary = truncate_to_tokens(current_report, 2000)

    system_prompt = FOLLOWUP_CHAT_PROMPT.format(
        patient_context=patient_context,
        report_summary=report_summary,
    )

    messages = [
        {"role": "system", "content": system_prompt},
    ]

    # Add recent chat history for context (last 6 messages)
    if chat_history:
        for msg in chat_history[-6:]:
            messages.append(msg)

    messages.append({"role": "user", "content": user_message})

    # Allow tool use for lookups
    for round_num in range(5):
        response = chat_completion(
            messages=messages,
            tools=ALL_TOOLS,
            temperature=0.2,
            max_tokens=2048,
        )

        tool_calls = response.get("tool_calls", [])
        content = response.get("content", "")

        if not tool_calls:
            break

        assistant_msg = {"role": "assistant", "content": content or None}
        assistant_msg["tool_calls"] = [
            {"id": tc["id"], "type": "function", "function": tc["function"]}
            for tc in tool_calls
        ]
        messages.append(assistant_msg)

        for tc in tool_calls:
            func_name = tc["function"]["name"]
            try:
                args = json.loads(tc["function"]["arguments"])
            except json.JSONDecodeError:
                args = {}

            update_status("tool_call", f"Looking up: {func_name}")
            result = execute_tool(func_name, args)
            tool_trace.append(
                ToolCall(
                    tool_name=func_name,
                    arguments=args,
                    result=truncate_to_tokens(result, 500),
                )
            )
            messages.append(
                {"role": "tool", "tool_call_id": tc["id"], "content": result}
            )

    # If the loop exhausted and the last response was a tool call, force a final summary response
    if tool_calls:
        update_status("thinking", "Summarizing findings...")
        response = chat_completion(
            messages=messages,
            tools=None,
            temperature=0.2,
            max_tokens=2048,
        )
        content = response.get("content", "")

    chat_response = (
        content.strip()
        if content
        else "I couldn't generate a response. Please try rephrasing."
    )

    update_status("complete", "Done!")

    return {
        "response_type": "chat_only",
        "chat_response": chat_response,
        "updated_report": None,
        "updated_patient": None,
        "intent": "chat",
        "tool_trace": tool_trace,
    }


def _handle_report_update(
    user_message, current_report, patient, patient_context, tool_trace, update_status
):
    """Handle explicit report modification requests — edit, add to, or remove from the document."""
    update_status("updating", "Modifying the report...")

    system_prompt = FOLLOWUP_REPORT_UPDATE_PROMPT.format(
        patient_context=patient_context,
        current_report=current_report,
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    # Allow tool calls for research if adding new info
    for round_num in range(5):
        update_status("thinking", f"Processing update (step {round_num + 1})...")

        response = chat_completion(
            messages=messages,
            tools=ALL_TOOLS,
            temperature=0.1,
            max_tokens=4096,
        )

        tool_calls = response.get("tool_calls", [])
        content = response.get("content", "")

        if not tool_calls:
            break

        assistant_msg = {"role": "assistant", "content": content or None}
        assistant_msg["tool_calls"] = [
            {"id": tc["id"], "type": "function", "function": tc["function"]}
            for tc in tool_calls
        ]
        messages.append(assistant_msg)

        for tc in tool_calls:
            func_name = tc["function"]["name"]
            try:
                args = json.loads(tc["function"]["arguments"])
            except json.JSONDecodeError:
                args = {}

            update_status("tool_call", f"Researching: {func_name}")
            result = execute_tool(func_name, args)
            tool_trace.append(
                ToolCall(
                    tool_name=func_name,
                    arguments=args,
                    result=truncate_to_tokens(result, 500),
                )
            )
            messages.append(
                {"role": "tool", "tool_call_id": tc["id"], "content": result}
            )

    if tool_calls:
        update_status("thinking", "Finalizing report update...")
        response = chat_completion(
            messages=messages,
            tools=None,
            temperature=0.1,
            max_tokens=4096,
        )

    updated_report = response.get("content", "")

    # Integrity check: if updated report is less than 40% of original, something went wrong
    if len(updated_report) < len(current_report) * 0.4:
        update_status(
            "warning", "Report update seems incomplete, falling back to chat response"
        )
        return {
            "response_type": "chat_only",
            "chat_response": updated_report
            or "I wasn't able to properly update the report. Could you rephrase your request?",
            "updated_report": None,
            "updated_patient": None,
            "intent": "update_report",
            "tool_trace": tool_trace,
        }

    # Check if patient data needs updating
    updated_patient = _check_patient_update(user_message, patient)

    update_status("complete", "Report updated!")

    return {
        "response_type": "report_update",
        "chat_response": "I've updated the report based on your request.",
        "updated_report": updated_report,
        "updated_patient": updated_patient,
        "intent": "update_report",
        "tool_trace": tool_trace,
    }


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

    from utils.helpers import safe_json_parse

    parsed = safe_json_parse(response.get("content", "{}"))

    if not isinstance(parsed, dict) or parsed.get("no_changes"):
        return None

    # Merge changes into existing patient data
    current = patient.model_dump()
    for key, value in parsed.items():
        if key in current and key != "symptoms":
            current[key] = value

    return current
