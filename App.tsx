import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { ContactCard } from './components/ContactCard';
import { InteractionList } from './components/InteractionList';
import { SyncStatus } from './components/SyncStatus';
import { db } from './services/db';
import { Importers } from './services/importers';
import { GeminiService } from './services/gemini';
import { Person, UUID, SyncRun } from './types';

const App: React.FC = () => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<UUID | null>(null);
  const [relationshipSummary, setRelationshipSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const refreshData = () => {
    // Ensure persons is defined before filtering
    const allPersons = db.persons || [];
    const validPersons = allPersons.filter(p => !p.merged_into && p.full_name !== 'Anqer User');
    
    validPersons.sort((a, b) => {
      const aInts = db.getInteractionsForPerson(a.person_id) || [];
      const bInts = db.getInteractionsForPerson(b.person_id) || [];
      const aTime = aInts[0]?.occurred_at || 0;
      const bTime = bInts[0]?.occurred_at || 0;
      return bTime - aTime || a.full_name.localeCompare(b.full_name);
    });
    setPersons(validPersons);
    setSyncRuns([...(db.syncRuns || [])]);
  };

  useEffect(() => {
    const init = async () => {
      console.log("App: Starting initialization sequence...");
      // Safety timeout: If DB init hangs, we still show the app
      const timeout = setTimeout(() => {
        if (isInitializing) {
          console.warn("App: Initialization timeout reached. Proceeding to main UI.");
          setIsInitializing(false);
        }
      }, 5000);

      try {
        await db.initialize();
      } catch (e) {
        console.error("App: DB Initialization fatal error", e);
      } finally {
        clearTimeout(timeout);
        refreshData();
        setIsInitializing(false);
        console.log("App: Initialization sequence complete.");
      }
    };
    init();

    // Data polling for background sync updates
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredPersons = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return persons.filter(p => p.full_name.toLowerCase().includes(lower));
  }, [persons, searchTerm]);

  const selectedPerson = useMemo(() => 
    persons.find(p => p.person_id === selectedPersonId), 
  [selectedPersonId, persons]);

  const interactions = useMemo(() => 
    selectedPersonId ? db.getInteractionsForPerson(selectedPersonId) : [], 
  [selectedPersonId, persons]);

  const evidence = useMemo(() => 
    selectedPersonId ? db.getEvidenceForPerson(selectedPersonId) : [], 
  [selectedPersonId, persons]);

  useEffect(() => {
    if (selectedPersonId && interactions.length > 0) {
      const fetchSummary = async () => {
        setIsLoadingSummary(true);
        const summaries = interactions.map(i => i.summary_short);
        const result = await GeminiService.summarizeRelationship(summaries);
        setRelationshipSummary(result);
        setIsLoadingSummary(false);
      };
      fetchSummary();
    } else if (selectedPersonId) {
      setRelationshipSummary('Node active. Interaction history required for synthesis.');
    }
  }, [selectedPersonId, interactions.length]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-12 animate-pulse">
          <div className="w-16 h-16 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-slate-100">A</div>
          <div className="flex flex-col items-center gap-3">
            <p className="text-[12px] font-black uppercase tracking-[0.7em] text-slate-400">Syncing Intelligence</p>
            <div className="w-48 h-1 bg-slate-50 rounded-full overflow-hidden">
              <div className="w-full h-full bg-slate-900 origin-left animate-[loading_2s_infinite_linear]" />
            </div>
          </div>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: scaleX(0); }
            50% { transform: scaleX(0.5); }
            100% { transform: scaleX(1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-160px)] gap-12 animate-entry">
        {/* Navigation Sidebar */}
        <aside className="w-80 flex flex-col shrink-0 gap-10 border-r border-slate-50 pr-8">
          <div className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-200 px-1">Network Channels</h2>
            <div className="grid gap-3">
              <button 
                onClick={() => Importers.syncGoogle().then(refreshData)} 
                className="w-full text-left bg-white hover:bg-slate-50 p-6 rounded-[2rem] border border-slate-100 transition-all flex items-center gap-5 group shadow-sm active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="G" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[13px] font-black text-slate-900 truncate tracking-tight">Google Node</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Contacts & Mail</span>
                </div>
              </button>

              <div className="grid grid-cols-2 gap-3">
                 <label className="cursor-pointer bg-white hover:bg-slate-50 p-6 rounded-[2rem] border border-slate-100 transition-all flex flex-col items-center gap-3 group shadow-sm active:scale-[0.96]">
                   <input type="file" accept=".zip" className="hidden" onChange={(e) => e.target.files?.[0] && Importers.importWhatsAppZip(e.target.files[0]).then(refreshData)} />
                   <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"/></svg>
                   </div>
                   <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">WhatsApp</span>
                 </label>
                 <label className="cursor-pointer bg-white hover:bg-slate-50 p-6 rounded-[2rem] border border-slate-100 transition-all flex flex-col items-center gap-3 group shadow-sm active:scale-[0.96]">
                   <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && e.target.files[0].text().then(Importers.importLinkedInCSV).then(refreshData)} />
                   <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                   </div>
                   <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">LinkedIn</span>
                 </label>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-8 overflow-hidden">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-200">Neural Nodes</h2>
              <span className="text-[11px] font-black text-slate-900 bg-slate-50 border border-slate-100 px-4 py-1.5 rounded-2xl">{persons.length}</span>
            </div>
            <div className="px-1">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Find Node..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-transparent rounded-3xl px-8 py-5 text-[13px] font-bold focus:bg-white focus:border-slate-900 transition-all outline-none placeholder:text-slate-200 shadow-inner"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-4 custom-scrollbar">
              {filteredPersons.length === 0 ? (
                <div className="py-32 text-center opacity-20">
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.8em]">Empty Graph</p>
                </div>
              ) : filteredPersons.map(p => (
                <ContactCard 
                  key={p.person_id}
                  person={p}
                  interactionCount={db.getInteractionsForPerson(p.person_id).length}
                  lastInteraction={
                    db.getInteractionsForPerson(p.person_id)[0] 
                      ? new Date(db.getInteractionsForPerson(p.person_id)[0].occurred_at).toLocaleDateString()
                      : 'Inactive'
                  }
                  onClick={() => setSelectedPersonId(p.person_id)}
                />
              ))}
            </div>
          </div>
          <SyncStatus runs={syncRuns} />
        </aside>

        {/* Intelligence Context Panel */}
        <main className="flex-1 bg-white border border-slate-100 rounded-5xl shadow-sm overflow-hidden flex flex-col">
          {selectedPerson ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <header className="px-24 py-20 pb-16 flex items-start justify-between border-b border-slate-50">
                <div className="flex items-center gap-16">
                  <div className="w-32 h-32 bg-slate-900 text-white rounded-4xl flex items-center justify-center font-black text-5xl shadow-2xl shadow-slate-100 ring-8 ring-slate-50 transform hover:rotate-3 transition-transform cursor-default">
                    {selectedPerson.full_name.charAt(0)}
                  </div>
                  <div className="space-y-6">
                    <h1 className="text-7xl font-black text-slate-900 tracking-tighter leading-none">{selectedPerson.full_name}</h1>
                    <div className="flex flex-wrap gap-3">
                      {evidence.map(e => (
                        <span key={e.evidence_id} className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300 bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-100">
                          {e.identifier_value}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right pt-4">
                  <div className="text-[12px] font-black uppercase tracking-[0.6em] text-slate-200 mb-3">Deterministic Confidence</div>
                  <div className="text-6xl font-black text-slate-900 tracking-tighter leading-none">
                    {(selectedPerson.confidence_score * 100).toFixed(0)}<span className="text-3xl ml-1 text-slate-200">%</span>
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-24 py-20 custom-scrollbar space-y-32">
                <section>
                  <h3 className="text-[13px] font-black uppercase tracking-[0.7em] text-slate-200 mb-16 flex items-center gap-10">
                    <span className="h-[2px] w-16 bg-slate-900 rounded-full" /> Relationship Synthesis
                  </h3>
                  <div className={`p-20 bg-slate-50/40 border border-slate-100 rounded-5xl relative transition-all duration-1000 ${isLoadingSummary ? 'opacity-40 blur-lg scale-[0.98]' : 'opacity-100 scale-100'}`}>
                    <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none">
                       <svg width="320" height="320" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    </div>
                    {isLoadingSummary ? (
                      <div className="py-24 text-center space-y-10">
                        <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full mx-auto animate-spin" />
                        <span className="text-[12px] font-black text-slate-400 uppercase tracking-[1em]">Compressing History...</span>
                      </div>
                    ) : (
                      <p className="text-2xl font-semibold text-slate-600 leading-[2.4] whitespace-pre-wrap tracking-tight italic">
                        "{relationshipSummary}"
                      </p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-[13px] font-black uppercase tracking-[0.7em] text-slate-200 mb-16 flex items-center gap-10">
                    <span className="h-[2px] w-16 bg-slate-900 rounded-full" /> Interaction Chronicle
                  </h3>
                  <InteractionList interactions={interactions} />
                </section>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-32 opacity-20">
              <div className="w-32 h-32 bg-slate-50 rounded-5xl flex items-center justify-center mb-20 border border-slate-100 shadow-inner">
                <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-8 uppercase tracking-[0.4em]">Grid Standby</h2>
              <p className="text-[13px] font-black text-slate-400 uppercase tracking-[0.8em]">Select a network node to initialize</p>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
};

export default App;