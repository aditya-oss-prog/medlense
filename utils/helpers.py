"""Utility helpers for token estimation and text processing."""

import re
import json


def estimate_tokens(text: str) -> int:
    """Rough token estimation: ~4 chars per token for English text."""
    if not text:
        return 0
    return len(text) // 4


def truncate_to_tokens(text: str, max_tokens: int) -> str:
    """Truncate text to approximately max_tokens."""
    max_chars = max_tokens * 4
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "... [truncated]"


def clean_text(text: str) -> str:
    """Clean text by removing extra whitespace and HTML tags."""
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def safe_json_parse(text: str) -> dict | list | None:
    """Attempt to parse JSON from text, handling markdown code blocks."""
    text = text.strip()
    # Try to extract JSON from markdown code blocks
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if json_match:
        text = json_match.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON array or object in text
        for pattern in [r'(\[[\s\S]*\])', r'(\{[\s\S]*\})']:
            match = re.search(pattern, text)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    continue
        return None


def format_patient_context(profile) -> str:
    """Format patient profile into a concise context string."""
    parts = [
        f"Age: {profile.age}",
        f"Sex: {profile.sex}",
        f"Ethnicity: {profile.ethnicity}",
        f"Country: {profile.country}",
    ]
    if profile.allergies:
        parts.append(f"Allergies: {profile.allergies}")
    if profile.current_medications:
        parts.append(f"Current Medications: {profile.current_medications}")
    parts.append(f"Symptoms: {profile.symptoms}")
    return " | ".join(parts)
