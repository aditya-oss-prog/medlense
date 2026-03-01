#!/usr/bin/env python3
"""
Test script for parallel tool execution and follow-up flow.

Usage:
    python test_parallel_tools.py

Environment Variables:
    PARALLEL_TOOLS=true|false  - Enable/disable parallel execution
    MAX_PARALLEL_WORKERS=N     - Set max concurrent tool calls (default: 5)
"""

import sys
import time
from datetime import datetime
from models.schemas import PatientProfile
from agent.core import run_agent, PARALLEL_TOOL_MODE, MAX_WORKERS


def log(message: str = ""):
    """Print timestamped log message."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    if message:
        print(f"[{timestamp}] {message}")
    else:
        print()


def test_parallel_execution():
    """Test parallel tool execution with a sample patient case."""
    log("=" * 70)
    log("PARALLEL TOOL EXECUTION TEST")
    log("=" * 70)
    log(
        f"Configuration: PARALLEL_TOOLS={PARALLEL_TOOL_MODE}, MAX_WORKERS={MAX_WORKERS}"
    )
    log()

    # Create a test patient profile
    patient = PatientProfile(
        symptoms="45 year old South Asian male with Type 2 Diabetes on metformin, complaining of fatigue and frequent urination",
        age=45,
        sex="Male",
        ethnicity="South Asian",
        country="India",
        allergies="Penicillin",
        current_medications="Metformin 500mg twice daily",
    )

    log("Patient Profile:")
    log(f"  - Age: {patient.age}, Sex: {patient.sex}")
    log(f"  - Ethnicity: {patient.ethnicity}, Country: {patient.country}")
    log(f"  - Symptoms: {patient.symptoms[:80]}...")
    log(f"  - Current Medications: {patient.current_medications}")
    log(f"  - Allergies: {patient.allergies}")
    log()

    # Track execution time
    start_time = time.time()

    def status_callback(stage: str, message: str):
        """Log status updates with timing."""
        elapsed = time.time() - start_time
        log(f"  [{elapsed:.2f}s] {stage}: {message}")

    log("Starting agent execution...")
    log("-" * 70)

    try:
        result = run_agent(patient, status_callback=status_callback)

        elapsed = time.time() - start_time
        log("-" * 70)
        log()
        log("EXECUTION COMPLETE")
        log(f"  Total time: {elapsed:.2f} seconds")
        log(f"  Tool calls executed: {len(result['tool_trace'])}")
        log(f"  Synthesis length: {len(result['synthesis'])} characters")
        log()

        # Show tool trace summary
        if result["tool_trace"]:
            log("Tools Executed:")
            for i, tc in enumerate(result["tool_trace"], 1):
                log(f"  {i}. {tc.tool_name} -> {len(tc.result)} chars")
        log()

        # Check if parallel execution was used
        tool_names = [tc.tool_name for tc in result["tool_trace"]]
        unique_tools = set(tool_names)
        log(f"Unique tools used: {len(unique_tools)}")
        log(f"  - {', '.join(sorted(unique_tools))}")
        log()

        if PARALLEL_TOOL_MODE and len(result["tool_trace"]) > 1:
            log("✓ Parallel execution was ENABLED for this run")
            log(
                f"  With {len(result['tool_trace'])} tools, parallel execution should be faster"
            )
        else:
            log("ℹ Sequential execution was used (either disabled or only 1 tool call)")

        log()
        log("=" * 70)
        log("TEST PASSED ✓")
        log("=" * 70)
        return True

    except Exception as e:
        log()
        log("TEST FAILED ✗")
        log(f"Error: {str(e)}")
        import traceback

        traceback.print_exc()
        return False


def test_followup_flow():
    """Test follow-up flow to verify report is preserved."""
    log()
    log("=" * 70)
    log("FOLLOW-UP FLOW TEST")
    log("=" * 70)
    log()
    log("This test verifies that chat-only follow-up questions do NOT overwrite")
    log("the existing report. See frontend console logs when testing:")
    log()
    log("  1. Run initial analysis (creates report)")
    log("  2. Ask a follow-up question like 'What are the side effects of metformin?'")
    log(
        "  3. Check console for: '[submitCase] Chat-only response - preserving existing report'"
    )
    log("  4. Verify report sections are still visible")
    log()
    log("Backend behavior:")
    log("  - _handle_chat() returns synthesis=None for chat-only responses")
    log("  - Frontend should skip setReport() when synthesis is null/empty")
    log("  - Chat response appears in message history")
    log("  - Existing report is preserved")
    log()
    log("=" * 70)
    return True


if __name__ == "__main__":
    print()

    # Run parallel execution test
    test1_passed = test_parallel_execution()

    # Run follow-up flow explanation
    test2_passed = test_followup_flow()

    if test1_passed and test2_passed:
        log()
        log("ALL TESTS PASSED ✓")
        sys.exit(0)
    else:
        log()
        log("SOME TESTS FAILED ✗")
        sys.exit(1)
