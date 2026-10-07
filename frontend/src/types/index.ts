// Shared enums — match contracts/api.md exactly

export type EmailStatus = 'pending' | 'processing' | 'done' | 'failed'
export type RiskLevel   = 'none' | 'low' | 'medium' | 'high'
export type EntityType  = 'person' | 'organization' | 'amount' | 'account' | 'location'

export interface KeyFact {
  type:  'amount' | 'account' | 'date' | 'reference'
  value: string
}

// GET /emails — inbox list item

export interface EmailSummary {
  id:         string
  status:     EmailStatus
  created_at: string
  sender:     string | null
  subject:    string | null
  date:       string | null
  risk_level: RiskLevel | null
}

// GET /emails/:id — full detail

export interface Extraction {
  sender:     string | null
  recipients: string[]
  date:       string | null
  subject:    string | null
  summary:    string | null
  key_facts:  KeyFact[]
}

export interface RiskAssessment {
  risk_level: RiskLevel
  rationale:  string
  tags:       string[]
}

export interface Entity {
  id:               string
  type:             EntityType
  value:            string
  normalized_value: string
}

export interface Relationship {
  id:                string
  source_entity_id:  string
  target_entity_id:  string
  relationship_type: string
}

export interface EmailDetail {
  id:            string
  raw_content:   string
  status:        EmailStatus
  error_message: string | null
  created_at:    string
  processed_at:  string | null
  extraction:    Extraction | null
  risk:          RiskAssessment | null
  entities:      Entity[]
  relationships: Relationship[]
}

// GET /graph — knowledge graph

export interface GraphNode {
  id:          string
  type:        EntityType
  label:       string
  email_count: number
}

export interface GraphEdge {
  id:                string
  source:            string
  target:            string
  relationship_type: string
}

export interface GraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
}
