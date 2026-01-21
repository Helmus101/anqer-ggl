
import { 
  Person, IdentityEvidence, Interaction, 
  InteractionParticipant, SyncState, SyncRun, UUID 
} from '../types';
import { supabase } from './supabase';

class LocalDB {
  persons: Person[] = [];
  evidence: IdentityEvidence[] = [];
  interactions: Interaction[] = [];
  participants: InteractionParticipant[] = [];
  syncStates: SyncState[] = [];
  syncRuns: SyncRun[] = [];
  
  private rawContentStore: Record<string, string> = {};

  generateId(): UUID {
    return crypto.randomUUID();
  }

  async initialize() {
    console.log('Anqer: Initializing deterministic graph sync...');
    try {
      const [
        { data: persons },
        { data: evidence },
        { data: interactions },
        { data: participants },
        { data: states },
        { data: runs }
      ] = await Promise.all([
        supabase.from('persons').select('*'),
        supabase.from('evidence').select('*'),
        supabase.from('interactions').select('*'),
        supabase.from('participants').select('*'),
        supabase.from('sync_states').select('*'),
        supabase.from('sync_runs').select('*').order('started_at', { ascending: false }).limit(50)
      ]);

      if (persons) this.persons = persons;
      if (evidence) this.evidence = evidence;
      if (interactions) this.interactions = interactions;
      if (participants) this.participants = participants;
      if (states) this.syncStates = states;
      if (runs) this.syncRuns = runs;
      
      console.log(`Anqer Core: Ingested ${this.persons.length} identity nodes.`);
    } catch (e) {
      console.error('Anqer Core: Bootstrap failed. Operating in transient mode.', e);
    }
  }

  async saveRawContent(content: string): Promise<string> {
    const key = `blob_${this.generateId()}`;
    this.rawContentStore[key] = content;
    await supabase.from('raw_content').upsert({ id: key, content });
    return key;
  }

  async getRawContent(key: string): Promise<string> {
    if (this.rawContentStore[key]) return this.rawContentStore[key];
    const { data } = await supabase.from('raw_content').select('content').eq('id', key).single();
    if (data) {
      this.rawContentStore[key] = data.content;
      return data.content;
    }
    return 'Content pointer inaccessible.';
  }

  findEvidence(type: string, value: string): IdentityEvidence | undefined {
    return this.evidence.find(e => 
      e.identifier_type === type && 
      e.identifier_value.toLowerCase() === value.toLowerCase()
    );
  }

  getInteractionsForPerson(personId: UUID): Interaction[] {
    const interactionIds = this.participants
      .filter(p => p.person_id === personId)
      .map(p => p.interaction_id);
    
    return this.interactions
      .filter(i => interactionIds.includes(i.interaction_id))
      .sort((a, b) => b.occurred_at - a.occurred_at);
  }

  getEvidenceForPerson(personId: UUID): IdentityEvidence[] {
    return this.evidence.filter(e => e.person_id === personId);
  }

  /**
   * Idempotent Upserts (Ensures no duplicates are created during replay/sync)
   */
  async upsertPerson(person: Person) {
    const existingIdx = this.persons.findIndex(p => p.person_id === person.person_id);
    if (existingIdx >= 0) {
      this.persons[existingIdx] = person;
    } else {
      this.persons.push(person);
    }
    await supabase.from('persons').upsert(person);
  }

  async upsertEvidence(evidence: IdentityEvidence) {
    const isDuplicate = this.evidence.some(e => 
      e.identifier_type === evidence.identifier_type && 
      e.identifier_value.toLowerCase() === evidence.identifier_value.toLowerCase()
    );
    if (!isDuplicate) {
      this.evidence.push(evidence);
      await supabase.from('evidence').upsert(evidence);
    }
  }

  async upsertInteraction(interaction: Interaction) {
    const isDuplicate = this.interactions.some(i => i.external_reference === interaction.external_reference);
    if (!isDuplicate) {
      this.interactions.push(interaction);
      await supabase.from('interactions').upsert(interaction);
      return true;
    }
    return false;
  }

  async upsertParticipant(participant: InteractionParticipant) {
    const isDuplicate = this.participants.some(p => 
      p.interaction_id === participant.interaction_id && 
      p.person_id === participant.person_id
    );
    if (!isDuplicate) {
      this.participants.push(participant);
      await supabase.from('participants').upsert(participant);
    }
  }

  async upsertSyncState(state: SyncState) {
    this.syncStates = this.syncStates.filter(s => s.platform !== state.platform);
    this.syncStates.push(state);
    await supabase.from('sync_states').upsert(state);
  }

  async upsertSyncRun(run: SyncRun) {
    const idx = this.syncRuns.findIndex(r => r.run_id === run.run_id);
    if (idx >= 0) {
      this.syncRuns[idx] = run;
    } else {
      this.syncRuns.unshift(run);
    }
    await supabase.from('sync_runs').upsert(run);
  }
}

export const db = new LocalDB();
