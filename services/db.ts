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
      const fetchResults = await Promise.allSettled([
        supabase.from('persons').select('*'),
        supabase.from('evidence').select('*'),
        supabase.from('interactions').select('*'),
        supabase.from('participants').select('*'),
        supabase.from('sync_states').select('*'),
        supabase.from('sync_runs').select('*').order('started_at', { ascending: false }).limit(50)
      ]);

      const dataMap = fetchResults.map((res, i) => {
        if (res.status === 'fulfilled' && res.value.data) {
          return res.value.data;
        }
        console.warn(`Anqer Init: Segment ${i} failed or returned no data.`);
        return [];
      });

      this.persons = dataMap[0] || [];
      this.evidence = dataMap[1] || [];
      this.interactions = dataMap[2] || [];
      this.participants = dataMap[3] || [];
      this.syncStates = dataMap[4] || [];
      this.syncRuns = dataMap[5] || [];
      
      console.log(`Anqer Core: Ingested ${this.persons.length} identity nodes.`);
    } catch (e) {
      console.error('Anqer Core: Bootstrap failed completely. Operating in transient mode.', e);
      // Ensure we don't have undefined arrays
      this.persons = this.persons || [];
      this.evidence = this.evidence || [];
      this.interactions = this.interactions || [];
      this.participants = this.participants || [];
      this.syncStates = this.syncStates || [];
      this.syncRuns = this.syncRuns || [];
    }
  }

  async saveRawContent(content: string): Promise<string> {
    const key = `blob_${this.generateId()}`;
    this.rawContentStore[key] = content;
    try {
      await supabase.from('raw_content').upsert({ id: key, content });
    } catch (e) {
      console.warn("Supabase Raw Storage failed, using local transient store.");
    }
    return key;
  }

  async getRawContent(key: string): Promise<string> {
    if (this.rawContentStore[key]) return this.rawContentStore[key];
    try {
      const { data } = await supabase.from('raw_content').select('content').eq('id', key).single();
      if (data) {
        this.rawContentStore[key] = data.content;
        return data.content;
      }
    } catch (e) {
      console.warn("Raw Content pointer lookup failed.");
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

  async upsertPerson(person: Person) {
    const existingIdx = this.persons.findIndex(p => p.person_id === person.person_id);
    if (existingIdx >= 0) {
      this.persons[existingIdx] = person;
    } else {
      this.persons.push(person);
    }
    try {
      await supabase.from('persons').upsert(person);
    } catch (e) {}
  }

  async upsertEvidence(evidence: IdentityEvidence) {
    const isDuplicate = this.evidence.some(e => 
      e.identifier_type === evidence.identifier_type && 
      e.identifier_value.toLowerCase() === evidence.identifier_value.toLowerCase()
    );
    if (!isDuplicate) {
      this.evidence.push(evidence);
      try {
        await supabase.from('evidence').upsert(evidence);
      } catch (e) {}
    }
  }

  async upsertInteraction(interaction: Interaction) {
    const isDuplicate = this.interactions.some(i => i.external_reference === interaction.external_reference);
    if (!isDuplicate) {
      this.interactions.push(interaction);
      try {
        await supabase.from('interactions').upsert(interaction);
      } catch (e) {}
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
      try {
        await supabase.from('participants').upsert(participant);
      } catch (e) {}
    }
  }

  async upsertSyncState(state: SyncState) {
    this.syncStates = this.syncStates.filter(s => s.platform !== state.platform);
    this.syncStates.push(state);
    try {
      await supabase.from('sync_states').upsert(state);
    } catch (e) {}
  }

  async upsertSyncRun(run: SyncRun) {
    const idx = this.syncRuns.findIndex(r => r.run_id === run.run_id);
    if (idx >= 0) {
      this.syncRuns[idx] = run;
    } else {
      this.syncRuns.unshift(run);
    }
    try {
      await supabase.from('sync_runs').upsert(run);
    } catch (e) {}
  }
}

export const db = new LocalDB();