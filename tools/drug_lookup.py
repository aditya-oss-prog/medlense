"""OpenFDA API tool for drug information lookup."""

import requests
from utils.helpers import clean_text, truncate_to_tokens

OPENFDA_DRUG_URL = "https://api.fda.gov/drug/label.json"


def lookup_drug_info(drug_name: str) -> str:
    """Look up drug information from OpenFDA including indications, warnings, and dosage.
    
    Args:
        drug_name: Name of the drug (generic or brand name)
    
    Returns:
        Formatted string with drug information.
    """
    try:
        params = {
            "search": f'openfda.generic_name:"{drug_name}" OR openfda.brand_name:"{drug_name}"',
            "limit": 1,
        }
        resp = requests.get(OPENFDA_DRUG_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        results = data.get("results", [])
        if not results:
            return f"No FDA drug label found for: {drug_name}"

        drug = results[0]
        openfda = drug.get("openfda", {})

        # Extract key fields
        generic_names = openfda.get("generic_name", ["Unknown"])
        brand_names = openfda.get("brand_name", ["Unknown"])
        manufacturer = openfda.get("manufacturer_name", ["Unknown"])
        route = openfda.get("route", ["Unknown"])
        substance = openfda.get("substance_name", [])

        # Get text fields (these are arrays of strings)
        indications = _get_field(drug, "indications_and_usage", 200)
        warnings = _get_field(drug, "warnings", 200)
        dosage = _get_field(drug, "dosage_and_administration", 150)
        contraindications = _get_field(drug, "contraindications", 150)
        adverse_reactions = _get_field(drug, "adverse_reactions", 150)
        drug_interactions = _get_field(drug, "drug_interactions", 150)

        info = (
            f"**Drug: {brand_names[0]}**\n"
            f"Generic Name: {', '.join(generic_names)}\n"
            f"Manufacturer: {', '.join(manufacturer)}\n"
            f"Route: {', '.join(route)}\n"
            f"Active Substance: {', '.join(substance[:3])}\n\n"
            f"Indications: {indications}\n\n"
            f"Dosage: {dosage}\n\n"
            f"Warnings: {warnings}\n\n"
            f"Contraindications: {contraindications}\n\n"
            f"Adverse Reactions: {adverse_reactions}\n\n"
            f"Drug Interactions: {drug_interactions}"
        )

        return truncate_to_tokens(info, 2000)

    except requests.RequestException as e:
        return f"OpenFDA API error: {str(e)}"
    except Exception as e:
        return f"Error looking up drug: {str(e)}"


def search_drugs_for_condition(condition: str) -> str:
    """Search for drugs indicated for a specific condition.
    
    Args:
        condition: Medical condition name
    
    Returns:
        Formatted list of drugs with brief info.
    """
    try:
        params = {
            "search": f'indications_and_usage:"{condition}"',
            "limit": 5,
        }
        resp = requests.get(OPENFDA_DRUG_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        results = data.get("results", [])
        if not results:
            return f"No drugs found for condition: {condition}"

        drugs = []
        seen = set()
        for drug in results:
            openfda = drug.get("openfda", {})
            generic = openfda.get("generic_name", ["Unknown"])[0]
            brand = openfda.get("brand_name", ["Unknown"])[0]
            
            if generic.lower() in seen:
                continue
            seen.add(generic.lower())

            indication = _get_field(drug, "indications_and_usage", 100)
            warnings_brief = _get_field(drug, "warnings", 80)

            drugs.append(
                f"- {brand} (Generic: {generic})\n"
                f"  Indication: {indication}\n"
                f"  Key Warnings: {warnings_brief}"
            )

        result = f"Drugs indicated for {condition}:\n\n" + "\n\n".join(drugs)
        return truncate_to_tokens(result, 2000)

    except requests.RequestException as e:
        return f"OpenFDA API error: {str(e)}"
    except Exception as e:
        return f"Error searching drugs: {str(e)}"


def _get_field(drug: dict, field_name: str, max_words: int = 150) -> str:
    """Extract and truncate a text field from drug label data."""
    values = drug.get(field_name, [])
    if not values:
        return "Not available"
    text = clean_text(" ".join(values))
    words = text.split()
    if len(words) > max_words:
        text = " ".join(words[:max_words]) + "..."
    return text


# Tool definitions for the LLM
TOOL_DEFINITION_LOOKUP = {
    "type": "function",
    "function": {
        "name": "lookup_drug_info",
        "description": (
            "Look up detailed information about a specific drug from FDA database. "
            "Returns indications, warnings, dosage, contraindications, adverse reactions, "
            "and drug interactions. Use drug generic name or brand name."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "drug_name": {
                    "type": "string",
                    "description": "Drug name (generic or brand, e.g., 'metformin' or 'Glucophage')",
                },
            },
            "required": ["drug_name"],
        },
    },
}

TOOL_DEFINITION_SEARCH = {
    "type": "function",
    "function": {
        "name": "search_drugs_for_condition",
        "description": (
            "Search for FDA-approved drugs indicated for a specific medical condition. "
            "Returns a list of drugs with their indications and key warnings."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "condition": {
                    "type": "string",
                    "description": "Medical condition name (e.g., 'type 2 diabetes', 'hypertension')",
                },
            },
            "required": ["condition"],
        },
    },
}
