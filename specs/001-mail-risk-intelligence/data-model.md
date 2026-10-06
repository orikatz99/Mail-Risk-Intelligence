# Data Model: Mail Risk Intelligence

**Branch**: `001-mail-risk-intelligence` | **Date**: 2026-10-07

## Entity Relationship Overview

```
Email (1) ──── (0..1) Extraction
Email (1) ──── (0..1) RiskAssessment
Email (1) ──── (0..*) Entity
Email (1) ──── (0..*) Relationship  (source_entity + target_entity → Entity)
Email (1) ──── (0..*) Attachment
```

One `Email` may have at most one `Extraction` (Stage 1 output) and one
`RiskAssessment` (Stage 2 output). Entities and Relationships are 1:many.
Attachments are 1:many per email.

---

## Table: `emails`

Represents a message in the mailbox. Created immediately on submission;
updated as pipeline progresses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PK | UUID v4 |
| `raw_content` | TEXT | NOT NULL | Full raw email text (headers + body) |
| `status` | TEXT | NOT NULL, DEFAULT `pending` | One of: `pending`, `processing`, `done`, `failed` |
| `error_message` | TEXT | NULLABLE | Last pipeline error detail (set on `failed`) |
| `source` | TEXT | NOT NULL, DEFAULT `user` | `seed` or `user` |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT now | Insertion time |
| `processed_at` | TIMESTAMP | NULLABLE | Time pipeline reached `done` or `failed` |

**Status lifecycle**: `pending` → `processing` → `done` \| `failed`

Retry resets `status` to `pending` and clears `error_message`, `processed_at`.

**Validation rules**:
- `status` MUST be one of the four valid values.
- `raw_content` MUST be non-empty.
- `source` MUST be `seed` or `user`.

---

## Table: `extractions`

Stage 1 (Agent A) output. One row per email, created when Stage 1 completes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PK | UUID v4 |
| `email_id` | TEXT | FK → emails.id, UNIQUE | One-to-one with email |
| `sender` | TEXT | NULLABLE | Extracted sender address/name |
| `recipients` | TEXT | NULLABLE | JSON array of strings |
| `date` | TEXT | NULLABLE | ISO 8601 date string from email headers |
| `subject` | TEXT | NULLABLE | Email subject line |
| `summary` | TEXT | NULLABLE | Short (1–3 sentence) LLM-generated summary |
| `key_facts` | TEXT | NULLABLE | JSON array of `{type, value}` objects |

`key_facts` schema:
```json
[
  { "type": "amount",    "value": "$50,000" },
  { "type": "account",   "value": "ACC-9823" },
  { "type": "date",      "value": "2026-12-01" },
  { "type": "reference", "value": "REF-XYZ" }
]
```

Fields are NULLABLE because Stage 1 may partially succeed on malformed input
(spec edge case: "store what it can and mark missing fields explicitly").

---

## Table: `risk_assessments`

Stage 2 (Agent B) output. One row per email, created when Stage 2 completes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PK | UUID v4 |
| `email_id` | TEXT | FK → emails.id, UNIQUE | One-to-one with email |
| `risk_level` | TEXT | NOT NULL | One of: `none`, `low`, `medium`, `high` |
| `rationale` | TEXT | NOT NULL | LLM-generated explanation (1–3 sentences) |
| `tags` | TEXT | NOT NULL | JSON array of tag strings |

**Validation rules**:
- `risk_level` MUST be one of `none`, `low`, `medium`, `high`. If the LLM returns
  an out-of-range value, the pipeline MUST default to `none` and log a warning.
- `tags` is a JSON array; if empty, store `[]`.

---

## Table: `entities`

Named items extracted by Agent B. Multiple rows per email.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PK | UUID v4 |
| `email_id` | TEXT | FK → emails.id, NOT NULL | Source email |
| `type` | TEXT | NOT NULL | One of: `person`, `organization`, `amount`, `account`, `location` |
| `value` | TEXT | NOT NULL | Original extracted string |
| `normalized_value` | TEXT | NOT NULL | Lowercase + trimmed for deduplication |

**Knowledge graph deduplication rule**: Two entities represent the same graph node
if and only if `type` AND `normalized_value` are identical across emails. Merge
happens at query time (GROUP BY type, normalized_value) — the storage layer does
not deduplicate rows.

---

## Table: `relationships`

Typed directional links between entities, extracted by Agent B.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PK | UUID v4 |
| `email_id` | TEXT | FK → emails.id, NOT NULL | Source email |
| `source_entity_id` | TEXT | FK → entities.id, NOT NULL | Relationship origin |
| `target_entity_id` | TEXT | FK → entities.id, NOT NULL | Relationship target |
| `relationship_type` | TEXT | NOT NULL | Free-form label (e.g., `requests_transfer_to`, `employed_by`) |

Both `source_entity_id` and `target_entity_id` MUST reference entities from the
same `email_id`. The `relationship_type` is unrestricted (spec assumption 5).

---

## Table: `attachments`

Text extracted from email attachments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PK | UUID v4 |
| `email_id` | TEXT | FK → emails.id, NOT NULL | Parent email |
| `filename` | TEXT | NULLABLE | Original filename |
| `content_type` | TEXT | NULLABLE | MIME type (e.g., `application/pdf`) |
| `extracted_text` | TEXT | NULLABLE | Plain text extracted from the attachment |

`extracted_text` is NULLABLE — image-only PDFs or unsupported binary attachments
yield NULL without failing the pipeline.

---

## Key Query Patterns

### Inbox list (sorted by risk, then date)

```sql
SELECT
  e.id, e.status, e.created_at,
  ex.sender, ex.subject, ex.date,
  ra.risk_level
FROM emails e
LEFT JOIN extractions ex ON ex.email_id = e.id
LEFT JOIN risk_assessments ra ON ra.email_id = e.id
ORDER BY
  CASE ra.risk_level
    WHEN 'high'   THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low'    THEN 3
    WHEN 'none'   THEN 4
    ELSE               5   -- pending/failed with no risk yet
  END ASC,
  e.created_at DESC;
```

### Knowledge graph nodes (deduplicated)

```sql
SELECT
  type,
  normalized_value,
  COUNT(DISTINCT email_id) AS email_count
FROM entities
GROUP BY type, normalized_value;
```

### Knowledge graph edges

```sql
SELECT DISTINCT
  r.relationship_type,
  se.type AS source_type, se.normalized_value AS source_value,
  te.type AS target_type, te.normalized_value AS target_value
FROM relationships r
JOIN entities se ON se.id = r.source_entity_id
JOIN entities te ON te.id = r.target_entity_id;
```
