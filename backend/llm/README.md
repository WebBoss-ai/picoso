# Picoso Intelligence (LLM) — server module

Isolated analytics agent for **Picoso only**. Exposed at `/api/llm/*`.

## Environment

```text
LLM_PIN=8821
COHERE_API_KEY=          # server only — never ship to browser/git
COHERE_MODEL=command-a-03-2025
COHERE_TIMEOUT_MS=60000
COHERE_MAX_TOKENS=2048
LLM_MAX_ROUNDS=8
LLM_MAX_TOOL_CALLS=20
LLM_QUERY_TIMEOUT_MS=20000
```

## Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/llm/health` | none | readiness |
| POST | `/api/llm/auth` | `x-llm-pin` | validate PIN |
| GET | `/api/llm/tools` | PIN | list tools |
| POST | `/api/llm/chat` | PIN | SSE chat stream |

### Chat body

```json
{ "message": "...", "conversationId": optional, "mode": "deterministic" | omit }
```

If `COHERE_API_KEY` is unset, chat runs in **deterministic** tool mode (regex intent → tools).

## Security

- Rotate any Cohere key that was ever pasted into chat, commits, or screenshots.
- Store the key in AWS Secrets Manager (or host env) for production.
- PIN is not admin JWT; protect the front page URL accordingly.
