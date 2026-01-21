
import { db } from './db';
import { IdentityEngine } from './identity';
import { GeminiService } from './gemini';
import { fetchContacts, fetchEmails, initGoogleAuth, getAccessToken } from './google';
import { Platform, IdentifierType, Interaction, UUID, SyncRun } from '../types';
import JSZip from 'jszip';

export const Importers = {
  async syncGoogle() {
    const runId = db.generateId();
    const startRun: SyncRun = {
      run_id: runId, platform: Platform.GOOGLE, started_at: Date.now(),
      completed_at: null, status: 'running', error_log: null
    };
    await db.upsertSyncRun(startRun);

    try {
      await initGoogleAuth();
      await getAccessToken();

      // 1. Sync & Merge Identities from Contacts
      const contacts = await fetchContacts();
      for (const c of contacts) {
        const emails = c.emailAddresses || [];
        const phones = c.phoneNumbers || [];
        const primaryEmail = emails[0]?.value;
        const name = c.names?.[0]?.displayName || 'Unknown';
        
        let pId: UUID | null = null;
        
        // Resolve primary ID (Email priority)
        if (primaryEmail) {
          pId = await IdentityEngine.resolve(Platform.GOOGLE, IdentifierType.EMAIL, primaryEmail, name);
        } else if (phones[0]?.value) {
          pId = await IdentityEngine.resolve(Platform.GOOGLE, IdentifierType.PHONE, phones[0].value, name);
        }

        // If we have a Person ID, link all other discovered identifiers to "Merge" them
        if (pId) {
          for (const e of emails.slice(1)) {
             await db.upsertEvidence({
               evidence_id: db.generateId(), person_id: pId, source_platform: Platform.GOOGLE,
               identifier_type: IdentifierType.EMAIL, identifier_value: e.value, confidence: 0.9, first_seen_at: Date.now()
             });
          }
          for (const ph of phones) {
             await db.upsertEvidence({
               evidence_id: db.generateId(), person_id: pId, source_platform: Platform.GOOGLE,
               identifier_type: IdentifierType.PHONE, identifier_value: ph.value, confidence: 0.9, first_seen_at: Date.now()
             });
          }
        }
      }

      // 2. Sync Gmail Interactions
      let state = db.syncStates.find(s => s.platform === Platform.GMAIL);
      const { emails: gmailMsgs, nextPageToken } = await fetchEmails(30, state?.last_cursor || undefined);
      const myId = await IdentityEngine.resolve(Platform.SYSTEM, IdentifierType.PLATFORM_ID, 'ME', 'Anqer User');

      for (const email of gmailMsgs) {
        const extRef = `gmail-${email.id}`;
        if (db.interactions.some(i => i.external_reference === extRef)) continue;

        const headers = email.payload.headers;
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
        const fromRaw = headers.find((h: any) => h.name === 'From')?.value || '';
        const dateStr = headers.find((h: any) => h.name === 'Date')?.value;
        const date = dateStr ? new Date(dateStr).getTime() : Date.now();
        
        const snippet = email.snippet || '';
        const summary = await GeminiService.summarizeInteraction(`Subject: ${subject}\nSnippet: ${snippet}`);
        const rawPtr = await db.saveRawContent(snippet);

        const interaction: Interaction = {
          interaction_id: db.generateId(), interaction_type: Platform.GMAIL,
          occurred_at: date, source_platform: Platform.GMAIL,
          external_reference: extRef, summary_short: summary, raw_content_pointer: rawPtr
        };

        const created = await db.upsertInteraction(interaction);
        if (created) {
          const senderId = await IdentityEngine.resolve(Platform.GMAIL, IdentifierType.EMAIL, fromRaw, fromRaw);
          await db.upsertParticipant({ interaction_id: interaction.interaction_id, person_id: senderId, role: 'sender' });
          await db.upsertParticipant({ interaction_id: interaction.interaction_id, person_id: myId, role: 'receiver' });
        }
      }

      await db.upsertSyncRun({ ...startRun, completed_at: Date.now(), status: 'completed' });
    } catch (e: any) {
      await db.upsertSyncRun({ ...startRun, completed_at: Date.now(), status: 'failed', error_log: e.message });
      throw e;
    }
  },

  async importWhatsAppZip(zipFile: File) {
    const runId = db.generateId();
    const startRun: SyncRun = { 
      run_id: runId, platform: Platform.WHATSAPP, started_at: Date.now(), 
      completed_at: null, status: 'running', error_log: null 
    };
    await db.upsertSyncRun(startRun);

    try {
      if (!zipFile.name.toLowerCase().endsWith('.zip')) throw new Error("Anqer requires .zip archives.");

      const zip = await JSZip.loadAsync(zipFile);
      const txtFile = Object.values(zip.files).find((f: any) => f.name.endsWith('.txt') && !f.name.startsWith('__'));
      if (!txtFile) throw new Error("Chat log not found in archive.");
      
      const content = await (txtFile as any).async("string");
      const lines = content.split('\n');
      const myId = await IdentityEngine.resolve(Platform.SYSTEM, IdentifierType.PLATFORM_ID, 'ME', 'Anqer User');
      const dailyGroups: Record<string, Record<string, string[]>> = {};

      for (const line of lines) {
        const match = line.match(/^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\]?\s+(?:-\s+)?([^:]+):\s+(.*)$/i);
        if (!match) continue;
        const [_, dateStr, timeStr, sender, text] = match;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) continue;
        const dateKey = d.toISOString().split('T')[0];
        const cleanSender = sender.trim();
        if (cleanSender.length > 50 || cleanSender.includes(' changed ')) continue;

        if (!dailyGroups[dateKey]) dailyGroups[dateKey] = {};
        if (!dailyGroups[dateKey][cleanSender]) dailyGroups[dateKey][cleanSender] = [];
        dailyGroups[dateKey][cleanSender].push(text.trim());
      }

      // Grouping logic: Each day per sender is ONE Interaction
      for (const [dateKey, senders] of Object.entries(dailyGroups)) {
        for (const [senderName, messages] of Object.entries(senders)) {
          if (senderName.toLowerCase() === 'you' || senderName.toLowerCase() === 'me' || senderName === 'Anqer User') continue;

          const contactId = await IdentityEngine.resolve(Platform.WHATSAPP, IdentifierType.PLATFORM_ID, senderName, senderName);
          const fullDayText = messages.join('\n');
          const extRef = `wa-${dateKey}-${senderName.replace(/\s+/g, '_')}`;

          if (db.interactions.some(i => i.external_reference === extRef)) continue;

          const summary = await GeminiService.summarizeInteraction(`Day: ${dateKey}\nSource: WhatsApp\nParticipants: You and ${senderName}\nContent Synthesis:\n${fullDayText}`);
          const rawPtr = await db.saveRawContent(fullDayText);

          const interaction: Interaction = {
            interaction_id: db.generateId(), interaction_type: Platform.WHATSAPP,
            occurred_at: new Date(dateKey).getTime(), source_platform: Platform.WHATSAPP,
            external_reference: extRef, summary_short: summary, raw_content_pointer: rawPtr
          };

          const created = await db.upsertInteraction(interaction);
          if (created) {
            await db.upsertParticipant({ interaction_id: interaction.interaction_id, person_id: contactId, role: 'sender' });
            await db.upsertParticipant({ interaction_id: interaction.interaction_id, person_id: myId, role: 'receiver' });
          }
        }
      }

      await db.upsertSyncRun({ ...startRun, completed_at: Date.now(), status: 'completed' });
    } catch (e: any) {
      await db.upsertSyncRun({ ...startRun, completed_at: Date.now(), status: 'failed', error_log: e.message });
      throw e;
    }
  },

  async importLinkedInCSV(csvContent: string) {
    const runId = db.generateId();
    const startRun: SyncRun = { run_id: runId, platform: Platform.LINKEDIN, started_at: Date.now(), completed_at: null, status: 'running', error_log: null };
    await db.upsertSyncRun(startRun);

    try {
      const lines = csvContent.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').trim());
        if (parts.length < 3) continue;
        const name = `${parts[0]} ${parts[1]}`.trim();
        const email = parts[2];
        if (!email) continue;
        await IdentityEngine.resolve(Platform.LINKEDIN, IdentifierType.EMAIL, email, name);
      }
      await db.upsertSyncRun({ ...startRun, completed_at: Date.now(), status: 'completed' });
    } catch (e: any) {
      await db.upsertSyncRun({ ...startRun, completed_at: Date.now(), status: 'failed', error_log: e.message });
      throw e;
    }
  }
};
