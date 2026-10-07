// ─── Domain enums ────────────────────────────────────────────────────────────

export type EmailStatus = 'pending' | 'processing' | 'done' | 'failed';
export type RiskLevel   = 'none' | 'low' | 'medium' | 'high';
export type EntityType  = 'person' | 'organization' | 'amount' | 'account' | 'location';
export type KeyFactType = 'amount' | 'account' | 'date' | 'reference';

// ─── DB row shapes (values stored as JSON strings are typed here as parsed) ──

export interface KeyFact {
  type:  KeyFactType;
  value: string;
}

export interface Email {
  id:            string;
  raw_content:   string;
  status:        EmailStatus;
  error_message: string | null;
  source:        'seed' | 'user';
  created_at:    string;
  processed_at:  string | null;
}

export interface Extraction {
  id:         string;
  email_id:   string;
  sender:     string | null;
  recipients: string[] | null;
  date:       string | null;
  subject:    string | null;
  summary:    string | null;
  key_facts:  KeyFact[] | null;
}

export interface RiskAssessment {
  id:         string;
  email_id:   string;
  risk_level: RiskLevel;
  rationale:  string;
  tags:       string[];
}

export interface Entity {
  id:               string;
  email_id:         string;
  type:             EntityType;
  value:            string;
  normalized_value: string;
}

export interface Relationship {
  id:                string;
  email_id:          string;
  source_entity_id:  string;
  target_entity_id:  string;
  relationship_type: string;
}

export interface Attachment {
  id:             string;
  email_id:       string;
  filename:       string | null;
  content_type:   string | null;
  extracted_text: string | null;
}

// ─── API response shapes (matching contracts/api.md) ─────────────────────────

export interface EmailSummary {
  id:         string;
  status:     EmailStatus;
  created_at: string;
  sender:     string | null;
  subject:    string | null;
  date:       string | null;
  risk_level: RiskLevel | null;
}

export interface ExtractionResponse {
  sender:     string | null;
  recipients: string[];
  date:       string | null;
  subject:    string | null;
  summary:    string | null;
  key_facts:  KeyFact[];
}

export interface RiskAssessmentResponse {
  risk_level: RiskLevel;
  rationale:  string;
  tags:       string[];
}

export interface EntityResponse {
  id:               string;
  type:             EntityType;
  value:            string;
  normalized_value: string;
}

export interface RelationshipResponse {
  id:                string;
  source_entity_id:  string;
  target_entity_id:  string;
  relationship_type: string;
}

export interface EmailDetail {
  id:            string;
  raw_content:   string;
  status:        EmailStatus;
  error_message: string | null;
  created_at:    string;
  processed_at:  string | null;
  extraction:    ExtractionResponse | null;
  risk:          RiskAssessmentResponse | null;
  entities:      EntityResponse[];
  relationships: RelationshipResponse[];
}
