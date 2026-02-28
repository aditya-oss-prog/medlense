"""Pharmacogenomics data tool — ethnicity-specific drug metabolism information.

Uses a curated knowledge base of well-known pharmacogenomic associations 
and population-specific drug metabolism data from PharmGKB/CPIC guidelines.
"""

# Curated pharmacogenomics knowledge base
# Source: PharmGKB, CPIC guidelines, published literature
PHARMGKB_DATA = {
    "CYP2D6": {
        "description": "Cytochrome P450 2D6 - metabolizes ~25% of commonly used drugs",
        "affected_drugs": [
            "codeine", "tramadol", "tamoxifen", "fluoxetine", "paroxetine",
            "venlafaxine", "metoprolol", "carvedilol", "amitriptyline",
            "nortriptyline", "dextromethorphan", "ondansetron"
        ],
        "population_variations": {
            "East Asian": "Higher frequency of poor metabolizers (~1-2%). Intermediate metabolizers common (~35-50%). Reduced CYP2D6 activity may require lower doses of CYP2D6 substrates.",
            "South Asian": "Intermediate metabolizer frequency ~25-35%. Ultra-rapid metabolizers found in ~1-3%. Standard dosing generally appropriate with monitoring.",
            "African": "Ultra-rapid metabolizers more common (~3-8%). Gene duplications frequent. Codeine may cause toxicity in ultra-rapid metabolizers.",
            "European/Caucasian": "Poor metabolizers ~5-10%. Ultra-rapid metabolizers ~1-2%. Most drug dosing guidelines based on this population.",
            "Middle Eastern": "Ultra-rapid metabolizers notably common (~10-20%). Higher risk of codeine toxicity. May need dose adjustments.",
            "Hispanic/Latino": "Similar to European profile. Poor metabolizers ~3-7%. Intermediate metabolizers ~15-25%.",
        },
    },
    "CYP2C19": {
        "description": "Cytochrome P450 2C19 - key enzyme for clopidogrel, PPIs, antidepressants",
        "affected_drugs": [
            "clopidogrel", "omeprazole", "lansoprazole", "pantoprazole",
            "escitalopram", "citalopram", "sertraline", "voriconazole",
            "diazepam", "phenytoin"
        ],
        "population_variations": {
            "East Asian": "Poor metabolizers very common (~12-23%). Clopidogrel may have reduced efficacy. PPIs may need lower doses.",
            "South Asian": "Poor metabolizers ~5-15%. Intermediate metabolizers ~30-40%. Clopidogrel efficacy should be monitored.",
            "African": "Poor metabolizers ~4-7%. Rapid metabolizers common. May need higher PPI doses.",
            "European/Caucasian": "Poor metabolizers ~2-5%. Rapid metabolizers ~25-30%. Standard dosing generally used.",
            "Middle Eastern": "Poor metabolizers ~3-8%. Profile similar to European populations.",
            "Hispanic/Latino": "Poor metabolizers ~2-5%. Similar to European profile.",
        },
    },
    "CYP2C9": {
        "description": "Cytochrome P450 2C9 - metabolizes warfarin, NSAIDs, sulfonylureas",
        "affected_drugs": [
            "warfarin", "phenytoin", "losartan", "ibuprofen", "celecoxib",
            "glipizide", "tolbutamide", "fluvastatin"
        ],
        "population_variations": {
            "East Asian": "Poor metabolizers rare (~1-3%). CYP2C9*3 allele frequency ~3-5%. Warfarin doses typically lower due to VKORC1 variants.",
            "South Asian": "CYP2C9*2 and *3 alleles present (~5-15%). Warfarin sensitivity may be increased. Start with lower doses.",
            "African": "Unique CYP2C9 variants (*5, *6, *8, *11) found. Standard pharmacogenomic tests may miss these. Warfarin dosing more complex.",
            "European/Caucasian": "CYP2C9*2 (~13%) and *3 (~7%) well-characterized. Warfarin dosing algorithms available.",
            "Middle Eastern": "CYP2C9*2 frequency ~10-15%. Warfarin sensitivity possible. Monitor INR closely.",
            "Hispanic/Latino": "CYP2C9*2 and *3 present at moderate frequencies. Similar to European but less studied.",
        },
    },
    "HLA-B*5801": {
        "description": "HLA-B*5801 allele - associated with severe allopurinol hypersensitivity",
        "affected_drugs": ["allopurinol"],
        "population_variations": {
            "East Asian": "VERY HIGH prevalence (~6-8%). CPIC recommends HLA-B*5801 testing BEFORE prescribing allopurinol. Use febuxostat as alternative.",
            "South Asian": "Moderate prevalence (~3-5%). Testing recommended before allopurinol use.",
            "African": "High prevalence (~3-6%). Testing recommended. Higher risk of Stevens-Johnson syndrome.",
            "European/Caucasian": "Low prevalence (~1-2%). Testing still recommended per CPIC guidelines.",
            "Middle Eastern": "Moderate prevalence (~2-4%). Testing recommended.",
            "Hispanic/Latino": "Low to moderate prevalence (~1-3%). Testing recommended.",
        },
    },
    "G6PD_deficiency": {
        "description": "Glucose-6-phosphate dehydrogenase deficiency - affects drug safety",
        "affected_drugs": [
            "primaquine", "dapsone", "rasburicase", "methylene blue",
            "nitrofurantoin", "sulfasalazine"
        ],
        "population_variations": {
            "East Asian": "Prevalence ~3-5%. Screen before prescribing primaquine or dapsone.",
            "South Asian": "Prevalence ~5-15% (varies by region). Common in certain communities. Must screen.",
            "African": "HIGH prevalence (~10-25%). A- variant common. Avoid oxidant drugs without screening.",
            "European/Caucasian": "Low (~1-2%) except Mediterranean populations (~5-15%). Mediterranean variant can be severe.",
            "Middle Eastern": "HIGH prevalence (~5-25%). Mediterranean variant common. Must screen before oxidant drugs.",
            "Hispanic/Latino": "Moderate prevalence (~2-5%). Screening recommended.",
        },
    },
    "VKORC1": {
        "description": "Vitamin K epoxide reductase - key target of warfarin",
        "affected_drugs": ["warfarin"],
        "population_variations": {
            "East Asian": "VKORC1 -1639G>A high frequency (~90%). Much lower warfarin doses needed (typically 2-3 mg/day vs 5 mg/day).",
            "South Asian": "VKORC1 variant frequency ~50-60%. Moderate warfarin sensitivity. Start 3-4 mg/day.",
            "African": "VKORC1 variant frequency ~10-20%. Generally need higher warfarin doses. Unique variants may exist.",
            "European/Caucasian": "VKORC1 variant frequency ~35-45%. Standard warfarin algorithms apply.",
            "Middle Eastern": "VKORC1 variant frequency ~40-55%. Moderate warfarin sensitivity.",
            "Hispanic/Latino": "VKORC1 variant frequency ~45-55%. Similar to European profile.",
        },
    },
}


def check_pharmacogenomics(drug_name: str, ethnicity: str) -> str:
    """Check pharmacogenomic considerations for a drug given patient ethnicity.
    
    Args:
        drug_name: Drug name to check
        ethnicity: Patient ethnicity
    
    Returns:
        Formatted string with pharmacogenomic information.
    """
    drug_lower = drug_name.lower().strip()
    
    # Find matching ethnicity key
    ethnicity_key = _match_ethnicity(ethnicity)
    
    findings = []
    for gene, data in PHARMGKB_DATA.items():
        if drug_lower in [d.lower() for d in data["affected_drugs"]]:
            pop_info = data["population_variations"].get(ethnicity_key, "No specific data available for this population.")
            findings.append(
                f"**Gene: {gene}**\n"
                f"Description: {data['description']}\n"
                f"Relevance to {drug_name}: This gene affects metabolism of {drug_name}\n"
                f"Population data ({ethnicity}): {pop_info}\n"
            )
    
    if not findings:
        return (
            f"No specific pharmacogenomic data found for {drug_name} in {ethnicity} population. "
            f"This does not mean there are no genetic factors — it may mean the drug is not primarily "
            f"metabolized by well-characterized polymorphic enzymes, or population-specific data is limited."
        )
    
    result = (
        f"Pharmacogenomic considerations for {drug_name} in {ethnicity} patients:\n\n"
        + "\n---\n".join(findings)
    )
    return result


def get_population_drug_warnings(ethnicity: str) -> str:
    """Get all known pharmacogenomic warnings for a specific population.
    
    Args:
        ethnicity: Patient ethnicity
    
    Returns:
        Formatted string with all population-specific drug warnings.
    """
    ethnicity_key = _match_ethnicity(ethnicity)
    
    warnings = []
    for gene, data in PHARMGKB_DATA.items():
        pop_info = data["population_variations"].get(ethnicity_key, "")
        if pop_info and any(w in pop_info.upper() for w in ["HIGH", "VERY", "MUST", "AVOID", "RECOMMEND"]):
            warnings.append(
                f"⚠️ **{gene}** — Affects: {', '.join(data['affected_drugs'][:5])}\n"
                f"   {pop_info}"
            )
    
    if not warnings:
        return f"No high-priority pharmacogenomic warnings for {ethnicity} population in our database."
    
    result = (
        f"Population-specific drug warnings for {ethnicity} patients:\n\n"
        + "\n\n".join(warnings)
    )
    return result


def _match_ethnicity(ethnicity: str) -> str:
    """Match user-provided ethnicity to our database categories."""
    eth_lower = ethnicity.lower()
    
    mapping = {
        "East Asian": ["east asian", "chinese", "japanese", "korean", "vietnamese", "thai", "taiwanese", "mongolian"],
        "South Asian": ["south asian", "indian", "pakistani", "bangladeshi", "sri lankan", "nepali", "nepalese"],
        "African": ["african", "black", "nigerian", "kenyan", "ethiopian", "ghanaian", "african american", "afro"],
        "European/Caucasian": ["european", "caucasian", "white", "british", "german", "french", "italian", "russian", "polish", "scandinavian"],
        "Middle Eastern": ["middle eastern", "arab", "persian", "iranian", "turkish", "lebanese", "saudi", "iraqi", "egyptian"],
        "Hispanic/Latino": ["hispanic", "latino", "latina", "mexican", "brazilian", "colombian", "peruvian", "argentinian"],
    }
    
    for key, terms in mapping.items():
        if any(term in eth_lower for term in terms):
            return key
    
    return "European/Caucasian"  # Default fallback


# Tool definitions
TOOL_DEFINITION_CHECK = {
    "type": "function",
    "function": {
        "name": "check_pharmacogenomics",
        "description": (
            "Check pharmacogenomic considerations for a specific drug and patient ethnicity. "
            "Returns information about genetic variants that affect drug metabolism, efficacy, "
            "and safety in specific populations. Based on PharmGKB and CPIC guidelines."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "drug_name": {
                    "type": "string",
                    "description": "Drug name to check (e.g., 'warfarin', 'clopidogrel')",
                },
                "ethnicity": {
                    "type": "string",
                    "description": "Patient ethnicity (e.g., 'South Asian', 'East Asian', 'African')",
                },
            },
            "required": ["drug_name", "ethnicity"],
        },
    },
}

TOOL_DEFINITION_WARNINGS = {
    "type": "function",
    "function": {
        "name": "get_population_drug_warnings",
        "description": (
            "Get all high-priority pharmacogenomic warnings for a specific ethnic population. "
            "Returns drugs that need special attention due to genetic variations common in that population."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "ethnicity": {
                    "type": "string",
                    "description": "Patient ethnicity (e.g., 'South Asian', 'East Asian', 'African')",
                },
            },
            "required": ["ethnicity"],
        },
    },
}
