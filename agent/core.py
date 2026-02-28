"""Core agent loop with tool calling for MedLens clinical decision support."""

import json
from agent.llm_client import chat_completion
from agent.prompts import SYSTEM_PROMPT, SYNTHESIS_PROMPT
from utils.helpers import format_patient_context, truncate_to_tokens
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
        update_status("thinking", f"Agent reasoning (round {round_num + 1}/{MAX_TOOL_ROUNDS})...")
        
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
            
            update_status("tool_call", f"Calling {func_name}({json.dumps(args, default=str)[:100]})")
            
            result = execute_tool(func_name, args)
            
            # Track for UI
            tool_trace.append(ToolCall(
                tool_name=func_name,
                arguments=args,
                result=truncate_to_tokens(result, 500),
            ))
            
            update_status("tool_result", f"{func_name} returned {len(result)} chars")
            
            # Add tool result to messages
            messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": result,
            })
    
    # Final synthesis: ask the LLM to compile all findings
    update_status("synthesizing", "Compiling final analysis...")
    
    messages.append({
        "role": "user",
        "content": SYNTHESIS_PROMPT,
    })
    
    synthesis_response = chat_completion(
        messages=messages,
        tools=None,  # No tools in synthesis phase
        temperature=0.1,
        max_tokens=4096,
    )
    
    synthesis = synthesis_response.get("content", "Unable to generate synthesis.")
    
    update_status("complete", "Analysis complete!")
    
    return {
        "synthesis": synthesis,
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
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=250
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
