# Intelligence Partner (`/llm`)

Scalable data-intelligence layer on top of MongoDB.

## Product loop

```text
Connect MongoDB (self app DB or external URI)
        ↓
Sample documents (train / discover)
        ↓
AI + heuristics draft entities, metrics, dimensions, relationships
        ↓
You confirm & teach glossary (Train)
        ↓
Activate semantic model (business brain)
        ↓
Chat — AI uses schema tools + numeric execution (never invents facts)
```

## Env

```text
LLM_PIN=8821
COHERE_API_KEY=
COHERE_MODEL=command-a-03-2025
LLM_SECRET=          # encrypt external Mongo URIs
LLM_ALLOW_EXTERNAL_MONGO=true   # required in production for external URI
```

## API (all require `x-llm-pin` except health)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/llm/workspace` | Workspace + train status |
| POST | `/api/llm/connections` | Connect self or external Mongo |
| POST | `/api/llm/train/discover` | Sample DB → draft semantic model |
| GET | `/api/llm/schema` | Latest schema snapshot |
| GET | `/api/llm/models` | List models |
| GET | `/api/llm/models/active` | Active brain |
| PUT | `/api/llm/models/:id` | Edit entities/metrics/glossary |
| POST | `/api/llm/models/:id/activate` | Activate for chat |
| POST | `/api/llm/models/:id/hints` | Teach Q/A hints |
| POST | `/api/llm/chat` | SSE chat |

## Moat

- Semantic layer (confirmed definitions)
- Query execution in code (not LLM math)
- Evaluation / training feedback over time

Built-in Picoso food-ops tools remain as specialized accelerators on top of the generic engine.
