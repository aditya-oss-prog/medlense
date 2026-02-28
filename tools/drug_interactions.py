"""Drug interaction checker using OpenFDA adverse events API."""

import requests
from utils.helpers import clean_text, truncate_to_tokens

OPENFDA_EVENTS_URL = "https://api.fda.gov/drug/event.json"


def check_drug_interactions(drug1: str, drug2: str) -> str:
    """Check for known interactions between two drugs using FDA adverse events data.
    
    Args:
        drug1: First drug name
        drug2: Second drug name
    
    Returns:
        Formatted string with interaction information.
    """
    try:
        # Search for adverse events where both drugs are mentioned
        params = {
            "search": (
                f'patient.drug.openfda.generic_name:"{drug1}" AND '
                f'patient.drug.openfda.generic_name:"{drug2}"'
            ),
            "count": "patient.reaction.reactionmeddrapt.exact",
            "limit": 10,
        }
        resp = requests.get(OPENFDA_EVENTS_URL, params=params, timeout=15)

        if resp.status_code == 404 or resp.status_code == 400:
            return (
                f"No significant interaction data found between {drug1} and {drug2} "
                f"in the FDA adverse events database. This does not guarantee safety — "
                f"consult a pharmacist or drug interaction database for definitive information."
            )

        resp.raise_for_status()
        data = resp.json()

        results = data.get("results", [])
        if not results:
            return f"No adverse event reports found for the combination of {drug1} and {drug2}."

        # Format top adverse events
        events = []
        for r in results[:10]:
            term = r.get("term", "Unknown")
            count = r.get("count", 0)
            events.append(f"  - {term}: {count} reports")

        result = (
            f"**Drug Interaction Check: {drug1} + {drug2}**\n\n"
            f"FDA Adverse Events Database shows the following reported reactions "
            f"when both drugs were used:\n\n"
            + "\n".join(events)
            + f"\n\nNote: These are reported adverse events, not confirmed interactions. "
            f"Higher report counts may indicate potential safety signals. "
            f"Always verify with clinical drug interaction databases."
        )
        return truncate_to_tokens(result, 1500)

    except requests.RequestException as e:
        return f"FDA adverse events API error: {str(e)}"
    except Exception as e:
        return f"Error checking drug interactions: {str(e)}"


# Tool definition
TOOL_DEFINITION = {
    "type": "function",
    "function": {
        "name": "check_drug_interactions",
        "description": (
            "Check for potential interactions between two drugs using the FDA adverse events database. "
            "Returns reported adverse events when both drugs are used together. "
            "Use this to verify safety of drug combinations."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "drug1": {
                    "type": "string",
                    "description": "First drug name (generic name preferred)",
                },
                "drug2": {
                    "type": "string",
                    "description": "Second drug name (generic name preferred)",
                },
            },
            "required": ["drug1", "drug2"],
        },
    },
}
