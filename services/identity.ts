
import { db } from './db';
import { IdentifierType, IdentityEvidence, Person, Platform, UUID } from '../types';

export const IdentityEngine = {
  /**
   * Deterministic Resolution (Step 3.1)
   * Resolves an identifier to a unique Person node. No fuzzy logic permitted.
   */
  async resolve(
    platform: Platform,
    type: IdentifierType,
    value: string,
    fullNameHint?: string
  ): Promise<UUID> {
    const cleanValue = value.trim().toLowerCase();
    
    // 1. Check for existing exact IdentityEvidence (Traceable Truth)
    const existing = db.findEvidence(type, cleanValue);
    if (existing) {
      return existing.person_id;
    }

    // 2. No Match found -> Create new Person node
    const personId = db.generateId();
    const newPerson: Person = {
      person_id: personId,
      full_name: fullNameHint || 'Unknown Node',
      created_at: Date.now(),
      merged_into: null,
      confidence_score: platform === Platform.SYSTEM ? 1.0 : 0.1,
    };

    const newEvidence: IdentityEvidence = {
      evidence_id: db.generateId(),
      person_id: personId,
      source_platform: platform,
      identifier_type: type,
      identifier_value: cleanValue,
      confidence: 1.0,
      first_seen_at: Date.now(),
    };

    await db.upsertPerson(newPerson);
    await db.upsertEvidence(newEvidence);

    return personId;
  }
};
