# REST API Contract: Mail Risk Intelligence

**Base URL**: `http://localhost:3000/api`
**Format**: JSON (unless noted). All timestamps are ISO 8601.

---

## Shared Types

```typescript
type EmailStatus = "pending" | "processing" | "done" | "failed";
type RiskLevel   = "none" | "low" | "medium" | "high";
type EntityType  = "person" | "organization" | "amount" | "account" | "location";

interface KeyFact {
  type: "amount" | "account" | "date" | "reference";
  value: string;
}

interface Extraction {
  sender:     string | null;
  recipients: string[];
  date:       string | null;
  subject:    string | null;
  summary:    string | null;
  key_facts:  KeyFact[];
}

interface RiskAssessment {
  risk_level: RiskLevel;
  rationale:  string;
  tags:       string[];
}

interface Entity {
  id:               string;
  type:             EntityType;
  value:            string;
  normalized_value: string;
}

interface Relationship {
  id:                string;
  source_entity_id:  string;
  target_entity_id:  string;
  relationship_type: string;
}
```

---

## Endpoints

### GET /emails

Returns the inbox list sorted by risk level descending, then date descending.

**Response 200**:
```json
[
  {
    "id":         "uuid",
    "status":     "done",
    "created_at": "2026-10-07T10:00:00Z",
    "sender":     "john.smith@example.com",
    "subject":    "Urgent wire transfer request",
    "date":       "2026-10-06",
    "risk_level": "high"
  }
]
```

Notes:
- `sender`, `subject`, `date`, `risk_level` are `null` while status is `pending`
  or `processing` (extraction not yet complete).
- All emails are included regardless of status.

---

### GET /emails/{id}

Returns full email detail including extraction, risk assessment, entities, and
relationships.

**Response 200**:
```json
{
  "id":            "uuid",
  "raw_content":   "From: ...\nSubject: ...\n\nBody text",
  "status":        "done",
  "error_message": null,
  "created_at":    "2026-10-07T10:00:00Z",
  "processed_at":  "2026-10-07T10:00:28Z",
  "extraction":    { /* Extraction or null */ },
  "risk":          { /* RiskAssessment or null */ },
  "entities":      [ /* Entity[] */ ],
  "relationships": [ /* Relationship[] */ ]
}
```

**Response 404**: `{ "detail": "Email not found" }`

---

### POST /emails

Submits a new email for processing. Accepts either JSON body (pasted text) or
multipart form data (file upload).

**Request — JSON body**:
```json
{ "content": "From: alice@example.com\n\nBody..." }
```

**Request — multipart/form-data**:
```
file: <binary>    # .txt, .pdf, or .eml
```

Unsupported file types return 422. Supported: `text/plain`, `application/pdf`,
`message/rfc822` (`.eml`).

**Response 202**:
```json
{
  "id":         "uuid",
  "status":     "pending",
  "created_at": "2026-10-07T10:05:00Z",
  "sender":     null,
  "subject":    null,
  "date":       null,
  "risk_level": null
}
```

**Response 422**: `{ "detail": "Unsupported file type: image/png" }`
**Response 422**: `{ "detail": "Email content must not be empty" }`

---

### POST /emails/{id}/retry

Resets a `failed` email to `pending` and re-queues it for full pipeline
re-processing (both stages).

**Response 202**:
```json
{
  "id":         "uuid",
  "status":     "pending",
  "created_at": "2026-10-07T10:00:00Z",
  "sender":     null,
  "subject":    null,
  "date":       null,
  "risk_level": null
}
```

**Response 404**: `{ "detail": "Email not found" }`
**Response 409**: `{ "detail": "Email is not in failed state" }` — only `failed`
emails can be retried.

---

### GET /graph

Returns all entities (deduplicated) and relationships for the knowledge graph view.

**Response 200**:
```json
{
  "nodes": [
    {
      "id":          "person::john smith",
      "type":        "person",
      "label":       "John Smith",
      "email_count": 3
    }
  ],
  "edges": [
    {
      "id":                "edge::person::john smith::organization::acme corp::requests_transfer_to",
      "source":            "person::john smith",
      "target":            "organization::acme corp",
      "relationship_type": "requests_transfer_to"
    }
  ]
}
```

Node `id` is derived as `{type}::{normalized_value}` — stable, deterministic.
Edge `id` is derived from source + target + relationship_type.

**Response 200 (empty graph)**:
```json
{ "nodes": [], "edges": [] }
```

---

### GET /health

Liveness check.

**Response 200**: `{ "status": "ok" }`

---

## Error Format

All error responses use the following JSON format:

```json
{ "detail": "<human-readable message>" }
```

HTTP status codes used: 200, 202, 404, 409, 422, 500.
