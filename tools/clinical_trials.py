"""ClinicalTrials.gov API tool for finding relevant clinical trials."""

import requests
from utils.helpers import clean_text, truncate_to_tokens

CT_API_URL = "https://clinicaltrials.gov/api/v2/studies"


def search_clinical_trials(condition: str, ethnicity: str = "", country: str = "", max_results: int = 5) -> str:
    """Search ClinicalTrials.gov for relevant clinical trials.
    
    Args:
        condition: Medical condition to search for
        ethnicity: Patient ethnicity for demographic filtering
        country: Country for location filtering
        max_results: Maximum results to return
    
    Returns:
        Formatted string with trial summaries.
    """
    try:
        # Build query combining condition with demographic context
        query_parts = [condition]
        if ethnicity:
            query_parts.append(ethnicity)

        params = {
            "query.cond": condition,
            "query.term": " ".join(query_parts),
            "pageSize": max_results,
            "format": "json",
            "fields": (
                "NCTId,BriefTitle,OverallStatus,Phase,"
                "Condition,InterventionName,BriefSummary,"
                "LocationCountry,StartDate"
            ),
        }
        if country:
            params["query.locn"] = country

        resp = requests.get(CT_API_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        studies = data.get("studies", [])
        if not studies:
            return f"No clinical trials found for: {condition}"

        trials = []
        for study in studies:
            try:
                proto = study.get("protocolSection", {})
                ident = proto.get("identificationModule", {})
                status_mod = proto.get("statusModule", {})
                design = proto.get("designModule", {})
                cond_mod = proto.get("conditionsModule", {})
                interv_mod = proto.get("armsInterventionsModule", {})
                desc_mod = proto.get("descriptionModule", {})

                nct_id = ident.get("nctId", "")
                title = ident.get("briefTitle", "No title")
                status = status_mod.get("overallStatus", "Unknown")
                phases = design.get("phases", ["Not specified"])
                phase_str = ", ".join(phases) if phases else "Not specified"
                conditions = cond_mod.get("conditions", [])
                cond_str = ", ".join(conditions[:3])

                # Interventions
                interventions = interv_mod.get("interventions", [])
                interv_names = [i.get("name", "") for i in interventions[:3]]
                interv_str = ", ".join(interv_names) if interv_names else "Not specified"

                # Brief summary (truncated)
                summary = desc_mod.get("briefSummary", "")
                summary_words = clean_text(summary).split()
                if len(summary_words) > 80:
                    summary = " ".join(summary_words[:80]) + "..."

                trials.append(
                    f"**Trial: {nct_id}**\n"
                    f"Title: {title}\n"
                    f"Status: {status} | Phase: {phase_str}\n"
                    f"Conditions: {cond_str}\n"
                    f"Interventions: {interv_str}\n"
                    f"Summary: {summary}\n"
                )
            except Exception:
                continue

        if not trials:
            return f"Found studies but could not parse details for: {condition}"

        result = f"Found {len(trials)} clinical trials for: {condition}\n\n" + "\n---\n".join(trials)
        return truncate_to_tokens(result, 2000)

    except requests.RequestException as e:
        return f"ClinicalTrials.gov API error: {str(e)}"
    except Exception as e:
        return f"Error searching clinical trials: {str(e)}"


# Tool definition for the LLM
TOOL_DEFINITION = {
    "type": "function",
    "function": {
        "name": "search_clinical_trials",
        "description": (
            "Search ClinicalTrials.gov for relevant clinical trials for a condition. "
            "Can filter by patient ethnicity and country. Returns trial titles, status, "
            "phase, interventions, and summaries."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "condition": {
                    "type": "string",
                    "description": "Medical condition (e.g., 'type 2 diabetes')",
                },
                "ethnicity": {
                    "type": "string",
                    "description": "Patient ethnicity for demographic context (e.g., 'South Asian')",
                },
                "country": {
                    "type": "string",
                    "description": "Country for location filtering (e.g., 'India', 'United States')",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Number of trials to return (1-10, default 5)",
                },
            },
            "required": ["condition"],
        },
    },
}
