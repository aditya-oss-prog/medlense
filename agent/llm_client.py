"""LLM client for HuggingFace endpoint (OpenAI-compatible API)."""

import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Initialize client
_client = OpenAI(
    base_url=os.getenv("HF_API_URL", ""),
    api_key=os.getenv("HF_API_KEY", ""),
)
_model = os.getenv("HF_MODEL", "LiquidAI/LFM2-24B-A2B-GGUF")


def chat_completion(
    messages: list[dict],
    tools: list[dict] | None = None,
    temperature: float = 0.1,
    max_tokens: int = 4096,
    json_mode: bool = False,
) -> dict:
    """Send a chat completion request to the LLM.
    
    Args:
        messages: Chat messages
        tools: Optional tool definitions
        temperature: Sampling temperature
        max_tokens: Max output tokens
        json_mode: If True, constrain output to valid JSON via response_format
    
    Returns the raw response dict with 'content' and optionally 'tool_calls'.
    """
    kwargs = {
        "model": _model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "top_p": 1.0,  # Standard sampling default
        "stream": False,
    }
    
    # Optional parameters for supported endpoints (like vLLM, HuggingFace TGI)
    kwargs["extra_body"] = {
        "top_k": 50,
        "repetition_penalty": 1.05
    }

    # JSON mode: constrain output to valid JSON (supported by most OpenAI-compatible APIs)
    if json_mode and not tools:
        kwargs["response_format"] = {"type": "json_object"}

    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = "auto"

    try:
        response = _client.chat.completions.create(**kwargs)
        msg = response.choices[0].message

        result = {
            "content": msg.content or "",
            "tool_calls": [],
        }

        if hasattr(msg, "tool_calls") and msg.tool_calls:
            for tc in msg.tool_calls:
                result["tool_calls"].append({
                    "id": tc.id,
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    }
                })

        return result

    except Exception as e:
        # Fallback: try without tools if tool calling fails
        if tools:
            return _chat_with_react_fallback(messages, tools, temperature, max_tokens)
        raise e


def _chat_with_react_fallback(
    messages: list[dict],
    tools: list[dict],
    temperature: float,
    max_tokens: int,
) -> dict:
    """Fallback: inject tool descriptions into system prompt and parse ReAct output."""
    tool_descriptions = []
    for t in tools:
        func = t["function"]
        tool_descriptions.append(
            f"- {func['name']}: {func['description']}\n"
            f"  Parameters: {json.dumps(func.get('parameters', {}), indent=2)}"
        )

    react_system = (
        "You have access to the following tools. To use a tool, respond with a JSON block:\n"
        '```json\n{"tool_call": {"name": "tool_name", "arguments": {...}}}\n```\n\n'
        "If you want to call multiple tools, use an array:\n"
        '```json\n{"tool_calls": [{"name": "tool_name", "arguments": {...}}, ...]}\n```\n\n'
        "If you do not need any tools, respond normally.\n\n"
        "Available tools:\n" + "\n".join(tool_descriptions)
    )

    # Prepend ReAct system message
    react_messages = [{"role": "system", "content": react_system}] + [
        m for m in messages if m["role"] != "system"
    ]
    # Keep original system message content too
    for m in messages:
        if m["role"] == "system":
            react_messages[0]["content"] = m["content"] + "\n\n" + react_system
            break

    response = _client.chat.completions.create(
        model=_model,
        messages=react_messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=False,
        extra_body={
            "top_k": 50,
            "repetition_penalty": 1.05
        }
    )

    content = response.choices[0].message.content or ""
    result = {"content": content, "tool_calls": []}

    # Try to parse tool calls from content
    from utils.helpers import safe_json_parse
    parsed = safe_json_parse(content)

    if isinstance(parsed, dict):
        if "tool_call" in parsed:
            tc = parsed["tool_call"]
            result["tool_calls"].append({
                "id": f"react_{tc['name']}_0",
                "function": {
                    "name": tc["name"],
                    "arguments": json.dumps(tc.get("arguments", {})),
                }
            })
            result["content"] = ""
        elif "tool_calls" in parsed:
            for i, tc in enumerate(parsed["tool_calls"]):
                result["tool_calls"].append({
                    "id": f"react_{tc['name']}_{i}",
                    "function": {
                        "name": tc["name"],
                        "arguments": json.dumps(tc.get("arguments", {})),
                    }
                })
            result["content"] = ""

    return result
