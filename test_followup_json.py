#!/usr/bin/env python3
"""
Test script: Verify that the follow-up handler correctly produces 
structured JSON output (report_changes) after tool calls.

Tests the full pipeline:
1. run_followup() with a report update request
2. _parse_unified_response() JSON extraction strategies
3. merge_report() merging logic
4. Fresh LLM formatting call (forced retry)

Usage:
    python test_followup_json.py                  # Run all tests
    python test_followup_json.py --live            # Run live LLM test (requires API key)
    python test_followup_json.py --test-parse      # Only test parsing
"""

import json
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


# ═══════════════════════════════════════════════════════════════
# Test 1: _parse_unified_response with various LLM output formats
# ═══════════════════════════════════════════════════════════════

def test_parse_unified_response():
    """Test that _parse_unified_response handles various LLM output formats."""
    from agent.core import _parse_unified_response

    print("\n" + "=" * 60)
    print("TEST 1: _parse_unified_response — JSON extraction strategies")
    print("=" * 60)

    test_cases = [
        # Case 1: Perfect JSON
        {
            "name": "Perfect JSON format",
            "input": '{"chat_message": "Added fluoxetine.", "report_changes": {"drugRecommendations": [{"id": "drug-1", "drugName": "Fluoxetine"}]}}',
            "expect_changes": True,
        },
        # Case 2: Markdown-wrapped JSON
        {
            "name": "Markdown code block",
            "input": '```json\n{"chat_message": "Added fluoxetine.", "report_changes": {"drugRecommendations": [{"id": "drug-1", "drugName": "Fluoxetine"}]}}\n```',
            "expect_changes": True,
        },
        # Case 3: Plain text (no JSON)
        {
            "name": "Plain text — no JSON at all",
            "input": "Fluoxetine is an SSRI commonly used for depression. It has good efficacy in South Asian populations.",
            "expect_changes": False,
        },
        # Case 4: Text with JSON embedded
        {
            "name": "Text + embedded JSON",
            "input": 'Here is the updated report:\n\n{"chat_message": "I added fluoxetine to the report.", "report_changes": {"drugRecommendations": [{"id": "drug-new", "drugName": "Fluoxetine", "genericName": "fluoxetine"}]}}',
            "expect_changes": True,
        },
        # Case 5: Raw report JSON (no chat_message wrapper)
        {
            "name": "Raw report JSON (no chat_message)",
            "input": '{"drugRecommendations": [{"id": "drug-1", "drugName": "Fluoxetine"}], "assessment": "Updated assessment with fluoxetine."}',
            "expect_changes": True,
        },
        # Case 6: Markdown-wrapped raw report
        {
            "name": "Markdown-wrapped raw report JSON",
            "input": '```json\n{"drugRecommendations": [{"id": "drug-1", "drugName": "Fluoxetine"}], "assessment": "Updated."}\n```',
            "expect_changes": True,
        },
        # Case 7: chat_message with null report_changes
        {
            "name": "Chat-only response (report_changes: null)",
            "input": '{"chat_message": "Fluoxetine has these side effects...", "report_changes": null}',
            "expect_changes": False,
        },
        # Case 8: Empty content
        {
            "name": "Empty content",
            "input": "",
            "expect_changes": False,
        },
        # Case 9: JSON with extra text before and after
        {
            "name": "JSON surrounded by explanation text",
            "input": 'Based on my research, here is the response:\n\n{"chat_message": "Added fluoxetine 20mg.", "report_changes": {"drugRecommendations": [{"drugName": "Fluoxetine", "dose": "20mg"}]}}\n\nLet me know if you need anything else.',
            "expect_changes": True,
        },
        # Case 10: Deeply nested JSON (realistic LLM output)
        {
            "name": "Deeply nested realistic JSON",
            "input": json.dumps({
                "chat_message": "I've added Fluoxetine 20mg daily to the drug recommendations and updated the drug interactions section.",
                "report_changes": {
                    "drugRecommendations": [
                        {
                            "id": "drug-1",
                            "drugName": "Sertraline",
                            "genericName": "sertraline",
                            "indication": "Depression",
                            "dose": "50mg",
                            "frequency": "daily",
                            "warnings": ["Monitor for suicidal ideation"],
                            "confidence": "High",
                            "evidenceGrade": "A"
                        },
                        {
                            "id": "drug-2",
                            "drugName": "Fluoxetine",
                            "genericName": "fluoxetine",
                            "indication": "Depression/OCD",
                            "dose": "20mg",
                            "frequency": "daily",
                            "warnings": ["CYP2D6 inhibitor", "Serotonin syndrome risk"],
                            "confidence": "High",
                            "evidenceGrade": "A"
                        }
                    ],
                    "drugInteractions": [
                        {
                            "id": "inter-1",
                            "drug1": "Fluoxetine",
                            "drug2": "Sertraline",
                            "severity": "high",
                            "mechanism": "Both are SSRIs — serotonin syndrome risk",
                            "management": "Do not combine"
                        }
                    ]
                }
            }),
            "expect_changes": True,
        },
    ]

    passed = 0
    failed = 0

    for i, tc in enumerate(test_cases):
        result = _parse_unified_response(tc["input"])
        has_changes = result.get("report_changes") is not None
        
        status = "✓" if has_changes == tc["expect_changes"] else "✗"
        if status == "✓":
            passed += 1
        else:
            failed += 1

        print(f"\n  {status} Case {i+1}: {tc['name']}")
        print(f"    Expected changes: {tc['expect_changes']}, Got: {has_changes}")
        if has_changes:
            changes = result["report_changes"]
            print(f"    Changes keys: {list(changes.keys())}")
        if result.get("chat_message"):
            print(f"    Chat message: {result['chat_message'][:80]}...")

    print(f"\n  Results: {passed} passed, {failed} failed out of {len(test_cases)}")
    return failed == 0


# ═══════════════════════════════════════════════════════════════
# Test 2: merge_report logic
# ═══════════════════════════════════════════════════════════════

def test_merge_report():
    """Test that merge_report correctly merges partial changes."""
    from agent.core import merge_report

    print("\n" + "=" * 60)
    print("TEST 2: merge_report — partial merge logic")
    print("=" * 60)

    existing = {
        "chiefComplaint": "Depression and anxiety",
        "differentialDiagnosis": [
            {"id": "dx-1", "condition": "Major Depressive Disorder", "probability": "High"}
        ],
        "drugRecommendations": [
            {"id": "drug-1", "drugName": "Sertraline", "dose": "50mg"}
        ],
        "assessment": "Patient presents with moderate depression.",
        "plan": ["Start SSRI therapy", "Follow up in 4 weeks"],
        "alerts": [],
        "pharmacogenomics": [],
        "drugInteractions": [],
        "researchEvidence": [],
        "workupRecommendations": [],
    }

    passed = 0
    failed = 0

    # Test A: Add a drug (should preserve everything else)
    changes_a = {
        "drugRecommendations": [
            {"id": "drug-1", "drugName": "Sertraline", "dose": "50mg"},
            {"id": "drug-2", "drugName": "Fluoxetine", "dose": "20mg"},
        ]
    }
    merged_a = merge_report(existing, changes_a)
    test_a_pass = (
        len(merged_a["drugRecommendations"]) == 2
        and merged_a["differentialDiagnosis"] == existing["differentialDiagnosis"]
        and merged_a["assessment"] == existing["assessment"]
    )
    status = "✓" if test_a_pass else "✗"
    passed += 1 if test_a_pass else 0
    failed += 0 if test_a_pass else 1
    print(f"\n  {status} Test A: Add drug — preserves other sections")
    print(f"    Drugs: {len(merged_a['drugRecommendations'])}, DiffDx preserved: {merged_a['differentialDiagnosis'] == existing['differentialDiagnosis']}")

    # Test B: Update assessment only
    changes_b = {"assessment": "Updated assessment with new findings."}
    merged_b = merge_report(existing, changes_b)
    test_b_pass = (
        merged_b["assessment"] == "Updated assessment with new findings."
        and merged_b["drugRecommendations"] == existing["drugRecommendations"]
    )
    status = "✓" if test_b_pass else "✗"
    passed += 1 if test_b_pass else 0
    failed += 0 if test_b_pass else 1
    print(f"\n  {status} Test B: Update assessment — preserves drugs")

    # Test C: Empty changes should not modify anything
    changes_c = {}
    merged_c = merge_report(existing, changes_c)
    test_c_pass = merged_c == existing
    status = "✓" if test_c_pass else "✗"
    passed += 1 if test_c_pass else 0
    failed += 0 if test_c_pass else 1
    print(f"\n  {status} Test C: Empty changes — no modification")

    # Test D: None values should not overwrite
    changes_d = {"assessment": None, "drugRecommendations": None}
    merged_d = merge_report(existing, changes_d)
    test_d_pass = (
        merged_d["assessment"] == existing["assessment"]
        and merged_d["drugRecommendations"] == existing["drugRecommendations"]
    )
    status = "✓" if test_d_pass else "✗"
    passed += 1 if test_d_pass else 0
    failed += 0 if test_d_pass else 1
    print(f"\n  {status} Test D: None values — no overwrite")

    # Test E: Invalid keys should be ignored
    changes_e = {"invalidKey": "should be ignored", "assessment": "New assessment"}
    merged_e = merge_report(existing, changes_e)
    test_e_pass = (
        "invalidKey" not in merged_e
        and merged_e["assessment"] == "New assessment"
    )
    status = "✓" if test_e_pass else "✗"
    passed += 1 if test_e_pass else 0
    failed += 0 if test_e_pass else 1
    print(f"\n  {status} Test E: Invalid keys — ignored, valid keys applied")

    print(f"\n  Results: {passed} passed, {failed} failed out of 5")
    return failed == 0


# ═══════════════════════════════════════════════════════════════
# Test 3: _looks_like_report_update_request heuristic
# ═══════════════════════════════════════════════════════════════

def test_update_heuristic():
    """Test that _looks_like_report_update_request (LLM-based) correctly classifies intent.
    
    This test requires a live LLM connection since intent classification now
    uses an LLM call instead of keyword matching.
    """
    from agent.core import _looks_like_report_update_request

    print("\n" + "=" * 60)
    print("TEST 3: _looks_like_report_update_request — LLM intent classifier")
    print("=" * 60)

    # Check for API key
    from dotenv import load_dotenv
    load_dotenv()
    
    if not os.getenv("HF_API_KEY") and not os.getenv("GROQ_API_KEY") and not os.getenv("OPENAI_API_KEY"):
        print("  ⚠ Skipped — no API key found (requires LLM for intent classification)")
        return True

    test_cases = [
        # Should trigger report update
        ("add fluoxetine to report", True),
        ("update report with fluoxetine", True),
        ("can you add lisinopril?", True),
        ("remove the diabetes diagnosis", True),
        ("change the medication to fluoxetine", True),
        ("replace sertraline with fluoxetine", True),
        ("include aspirin in the treatment plan", True),
        
        # Should NOT trigger report update (info questions)
        ("what are the side effects of metformin?", False),
        ("tell me about fluoxetine", False),
        ("what is the mechanism of action of SSRIs?", False),
        ("is sertraline safe during pregnancy?", False),
        ("what are the symptoms of depression?", False),
        ("hello how are you?", False),
        ("explain the research on SSRIs in South Asian populations", False),
        ("what does this diagnosis mean?", False),
    ]

    passed = 0
    failed = 0

    for msg, expected in test_cases:
        result = _looks_like_report_update_request(msg)
        status = "✓" if result == expected else "✗"
        passed += 1 if result == expected else 0
        failed += 0 if result == expected else 1
        print(f"  {status} \"{msg}\" → {result} (expected {expected})")

    print(f"\n  Results: {passed} passed, {failed} failed out of {len(test_cases)}")
    return failed == 0


# ═══════════════════════════════════════════════════════════════
# Test 4: Live LLM test (requires API key)
# ═══════════════════════════════════════════════════════════════

def test_live_followup():
    """Test the full run_followup pipeline with a real LLM call.
    
    Requires: GROQ_API_KEY or OPENAI_API_KEY in environment.
    """
    from agent.core import run_followup
    from models.schemas import PatientProfile

    print("\n" + "=" * 60)
    print("TEST 4: Live LLM follow-up test (requires API key)")
    print("=" * 60)

    # Check for API key
    from dotenv import load_dotenv
    load_dotenv()
    
    if not os.getenv("HF_API_KEY") and not os.getenv("GROQ_API_KEY") and not os.getenv("OPENAI_API_KEY"):
        print("  ⚠ Skipped — no API key found (set HF_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY)")
        return True

    # Create a mock patient and report
    patient = PatientProfile(
        symptoms="25 year old male with depression and anxiety for 3 months",
        age=25,
        sex="Male",
        ethnicity="South Asian",
        country="India",
        allergies="None",
        current_medications="None",
    )

    existing_report = {
        "chiefComplaint": "Depression and anxiety",
        "differentialDiagnosis": [
            {
                "id": "dx-1",
                "condition": "Major Depressive Disorder",
                "icd10": "F32.1",
                "probability": "High",
                "probabilityScore": 0.8,
                "reasoning": "Symptoms consistent with MDD",
                "supportingFindings": ["Persistent low mood", "Anhedonia"],
                "ruleOuts": [],
                "recommendedWorkup": ["PHQ-9"]
            }
        ],
        "drugRecommendations": [
            {
                "id": "drug-1",
                "drugName": "Sertraline",
                "genericName": "sertraline",
                "indication": "Depression",
                "dose": "50mg",
                "frequency": "daily",
                "warnings": ["Monitor for suicidal ideation in first weeks"],
                "confidence": "High",
                "evidenceGrade": "A",
                "drugClass": "SSRI"
            }
        ],
        "researchEvidence": [],
        "pharmacogenomics": [],
        "drugInteractions": [],
        "alerts": [],
        "workupRecommendations": [],
        "assessment": "25-year-old South Asian male presenting with moderate depression.",
        "plan": ["Start sertraline 50mg daily", "Follow up in 4 weeks"],
        "followUpRecommendations": [],
        "complexityLevel": "moderate"
    }

    status_log = []

    def status_callback(stage, message):
        status_log.append(f"[{stage}] {message}")
        print(f"    [{stage}] {message}")

    print("\n  Sending: 'add fluoxetine to the report'")
    print("  ───────────────────────────────────────")

    result = run_followup(
        user_message="add fluoxetine to the report",
        current_report=json.dumps(existing_report),
        patient=patient,
        chat_history=[
            {"role": "user", "content": "25 year old male with depression"},
            {"role": "assistant", "content": "Analysis complete."},
        ],
        status_callback=status_callback,
    )

    print("\n  ───────────────────────────────────────")
    print(f"  Response type: {result['response_type']}")
    print(f"  Intent: {result.get('intent')}")
    print(f"  Chat response: {result.get('chat_response', '')[:200]}")
    print(f"  Has report_changes: {result.get('report_changes') is not None}")
    print(f"  Has updated_report: {result.get('updated_report') is not None}")

    if result.get("updated_report"):
        try:
            updated = json.loads(result["updated_report"])
            drugs = updated.get("drugRecommendations", [])
            drug_names = [d.get("drugName", "?") for d in drugs]
            print(f"  Drugs in updated report: {drug_names}")
            
            has_fluoxetine = any("fluoxetine" in name.lower() for name in drug_names)
            has_sertraline = any("sertraline" in name.lower() for name in drug_names)
            
            if has_fluoxetine:
                print(f"  ✓ Fluoxetine was added to the report!")
            else:
                print(f"  ✗ Fluoxetine NOT found in drug recommendations")
            
            if has_sertraline:
                print(f"  ✓ Sertraline was preserved in the report!")
            else:
                print(f"  ⚠ Sertraline was NOT preserved (merge issue)")
                
            return has_fluoxetine
        except json.JSONDecodeError:
            print(f"  ✗ updated_report is not valid JSON")
            return False
    else:
        print(f"  ✗ No updated_report — response was chat_only")
        print(f"  Full result: {json.dumps(result, indent=2, default=str)[:1000]}")
        return False


# ═══════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    args = sys.argv[1:]
    
    all_passed = True

    if "--test-parse" in args:
        all_passed &= test_parse_unified_response()
    elif "--live" in args:
        all_passed &= test_parse_unified_response()
        all_passed &= test_merge_report()
        all_passed &= test_update_heuristic()
        all_passed &= test_live_followup()
    else:
        all_passed &= test_parse_unified_response()
        all_passed &= test_merge_report()
        all_passed &= test_update_heuristic()
        print("\n  (Use --live to also run the live LLM test)")

    print("\n" + "=" * 60)
    if all_passed:
        print("ALL TESTS PASSED ✓")
    else:
        print("SOME TESTS FAILED ✗")
    print("=" * 60)
    
    sys.exit(0 if all_passed else 1)
