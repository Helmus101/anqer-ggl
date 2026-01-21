
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
    const validPersons = [...db.persons].filter(p => !p.merged_into && p.full_name !== 'Anqer User');
    
    validPersons.sort((a, b) => {
      const aInts = db.getInteractionsForPerson(a.person_id);
      const bInts = db.getInteractionsForPerson(b.person_id);
      const aTime = aInts[0]?.occurred_at || 0;
      const bTime = bInts[0]?.occurred_at || 0;
      return bTime - aTime || a.full_name.localeCompare(b.full_name);
    });
    setPersons(validPersons);
    setSyncRuns([...db.syncRuns]);
  };

  useEffect(() => {
    const init = async () => {
      await db.initialize();
      refreshData();
      setIsInitializing(false);
    };
    init();
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
      setRelationshipSummary('Identity cluster active. Data volume insufficient for synthesis.');
    }
  }, [selectedPersonId, interactions.length]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-10 animate-in fade-in duration-1000">
          <div className="w-12 h-12 bg-slate-900 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-2xl shadow-slate-100">A</div>
          <p className="text-[11px] font-black uppercase tracking-[0.6em] text-slate-300">Neural Sync In Progress</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-160px)] gap-12">
        {/* Navigation Sidebar */}
        <aside className="w-80 flex flex-col shrink-0 gap-10 border-r border-slate-50 pr-6">
          <div className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-200 px-1">Network Channels</h2>
            <div className="grid gap-3">
              <button 
                onClick={() => Importers.syncGoogle()} 
                className="w-full text-left bg-white hover:bg-slate-50 p-5 rounded-[1.75rem] border border-slate-100 transition-all flex items-center gap-5 group shadow-sm active:scale-[0.98]"
              >
                <div className="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="G" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[12px] font-black text-slate-900 truncate tracking-tight">Google Platform</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Verified Integration</span>
                </div>
              </button>

              <div className="grid grid-cols-2 gap-3">
                 <label className="cursor-pointer bg-white hover:bg-slate-50 p-5 rounded-[1.75rem] border border-slate-100 transition-all flex flex-col items-center gap-2 group shadow-sm active:scale-[0.96]">
                   <input type="file" accept=".zip" className="hidden" onChange={(e) => e.target.files?.[0] && Importers.importWhatsAppZip(e.target.files[0])} />
                   <span className="text-[11px] font-black text-slate-700 group-hover:text-emerald-600 transition-colors uppercase tracking-[0.2em]">WhatsApp</span>
                   <span className="text-[9px] text-slate-300 font-black">.ZIP LOGS</span>
                 </label>
                 <label className="cursor-pointer bg-white hover:bg-slate-50 p-5 rounded-[1.75rem] border border-slate-100 transition-all flex flex-col items-center gap-2 group shadow-sm active:scale-[0.96]">
                   <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && e.target.files[0].text().then(Importers.importLinkedInCSV)} />
                   <span className="text-[11px] font-black text-slate-700 group-hover:text-blue-600 transition-colors uppercase tracking-[0.2em]">LinkedIn</span>
                   <span className="text-[9px] text-slate-300 font-black">.CSV FEED</span>
                 </label>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-200">Neural Nodes</h2>
              <span className="text-[11px] font-black text-slate-900 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">{persons.length}</span>
            </div>
            <div className="px-1">
              <input 
                type="text" 
                placeholder="Find node by identity..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-transparent rounded-[1.25rem] px-6 py-4.5 text-[12px] font-bold focus:bg-white focus:border-slate-900 transition-all outline-none placeholder:text-slate-200"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-4 custom-scrollbar">
              {filteredPersons.length === 0 ? (
                <div className="py-32 text-center opacity-20">
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em]">Awaiting Data</p>
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
        <main className="flex-1 bg-white border border-slate-100 rounded-[4rem] shadow-sm overflow-hidden flex flex-col">
          {selectedPerson ? (
            <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-8 duration-1000">
              <header className="px-20 py-16 pb-12 flex items-start justify-between border-b border-slate-50">
                <div className="flex items-center gap-14">
                  <div className="w-24 h-24 bg-slate-900 text-white rounded-[2.5rem] flex items-center justify-center font-black text-4xl shadow-2xl shadow-slate-100 ring-8 ring-slate-50">
                    {selectedPerson.full_name.charAt(0)}
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">{selectedPerson.full_name}</h1>
                    <div className="flex flex-wrap gap-2.5">
                      {evidence.map(e => (
                        <span key={e.evidence_id} className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                          {e.identifier_value}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right pt-2">
                  <div className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-200 mb-2">Confidence Level</div>
                  <div className="text-5xl font-black text-slate-900 tracking-tighter leading-none">
                    {(selectedPerson.confidence_score * 100).toFixed(0)}<span className="text-2xl ml-1 text-slate-200">%</span>
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-20 py-16 custom-scrollbar space-y-24">
                <section>
                  <h3 className="text-[12px] font-black uppercase tracking-[0.6em] text-slate-200 mb-12 flex items-center gap-8">
                    <span className="h-[2px] w-12 bg-slate-900 rounded-full" /> Deterministic Synthesis
                  </h3>
                  <div className={`p-16 bg-slate-50/40 border border-slate-100 rounded-[4rem] relative transition-all duration-1000 ${isLoadingSummary ? 'opacity-40 blur-md' : 'opacity-100'}`}>
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                       <svg width="240" height="240" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    </div>
                    {isLoadingSummary ? (
                      <div className="py-20 text-center space-y-8">
                        <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full mx-auto animate-spin" />
                        <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Processing Chronological Evidence...</span>
                      </div>
                    ) : (
                      <p className="text-xl font-semibold text-slate-600 leading-[2.2] whitespace-pre-wrap tracking-tight italic">
                        "{relationshipSummary}"
                      </p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-[12px] font-black uppercase tracking-[0.6em] text-slate-200 mb-12 flex items-center gap-8">
                    <span className="h-[2px] w-12 bg-slate-900 rounded-full" /> Interaction Ledger
                  </h3>
                  <InteractionList interactions={interactions} />
                </section>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-20 animate-in zoom-in-95 duration-1000">
              <div className="w-24 h-24 bg-slate-50 rounded-[3rem] flex items-center justify-center mb-16 border border-slate-100 shadow-sm">
                <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-6 uppercase tracking-[0.3em]">Network Standby</h2>
              <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.6em]">Select a node to initialize visualization</p>
            </div>
          )}
        </main>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f5f9; border-radius: 40px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e2e8f0; }
      `}</style>
    </Layout>
  );
};

export default App;
