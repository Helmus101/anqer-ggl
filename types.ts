
export type UUID = string;

export enum Platform {
  GOOGLE = 'google',
  GMAIL = 'gmail',
  WHATSAPP = 'whatsapp',
  LINKEDIN = 'linkedin',
  SYSTEM = 'system'
}

export enum IdentifierType {
  EMAIL = 'email',
  PHONE = 'phone',
  LINKEDIN_URL = 'linkedin_url',
  PLATFORM_ID = 'platform_user_id'
}

export interface Person {
  person_id: UUID;
  full_name: string;
  created_at: number;
  merged_into: UUID | null;
  confidence_score: number;
}

export interface IdentityEvidence {
  evidence_id: UUID;
  person_id: UUID;
  source_platform: Platform;
  identifier_type: IdentifierType;
  identifier_value: string;
  confidence: number;
  first_seen_at: number;
}

export interface Interaction {
  interaction_id: UUID;
  interaction_type: Platform;
  occurred_at: number;
  source_platform: Platform;
  external_reference: string; // URL or thread ID
  summary_short: string;
  raw_content_pointer: string; // Internal key to encrypted blob
}

export interface InteractionParticipant {
  interaction_id: UUID;
  person_id: UUID;
  role: 'sender' | 'receiver';
}

export interface SyncState {
  platform: Platform;
  last_cursor: string | null;
  last_success_timestamp: number | null;
}

export interface SyncRun {
  run_id: UUID;
  platform: Platform;
  started_at: number;
  completed_at: number | null;
  status: 'running' | 'completed' | 'failed';
  error_log: string | null;
}

export interface RelationshipInsight {
  person_id: UUID;
  summary: string;
  last_updated: number;
}
