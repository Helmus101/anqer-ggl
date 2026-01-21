
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
      setRelationshipSummary('Identity mapped. Dataset insufficient for relationship synthesis.');
    }
  }, [selectedPersonId, interactions.length]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-xl shadow-slate-100">A</div>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Booting Anqer</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-140px)] gap-10">
        {/* Navigation Sidebar */}
        <aside className="w-80 flex flex-col shrink-0 gap-8">
          <div className="space-y-6">
            <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 px-1">Channels</h2>
            <div className="grid gap-2">
              <button 
                onClick={() => Importers.syncGoogle()} 
                className="w-full text-left bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl border border-slate-100 transition-all flex items-center gap-4 group"
              >
                <div className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="G" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[11px] font-black text-slate-900 truncate">Google Cloud</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Unified Sync</span>
                </div>
              </button>

              <div className="grid grid-cols-2 gap-2">
                 <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl border border-slate-100 transition-all flex flex-col items-center gap-2 group">
                   <input 
                    type="file" 
                    accept=".zip" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && Importers.importWhatsAppZip(e.target.files[0])} 
                   />
                   <span className="text-[10px] font-black text-slate-700 group-hover:text-emerald-600 transition-colors uppercase tracking-[0.1em]">WhatsApp</span>
                   <span className="text-[8px] text-slate-300 font-bold">.ZIP ARCHIVE</span>
                 </label>
                 <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl border border-slate-100 transition-all flex flex-col items-center gap-2 group">
                   <input 
                    type="file" 
                    accept=".csv" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && e.target.files[0].text().then(Importers.importLinkedInCSV)} 
                   />
                   <span className="text-[10px] font-black text-slate-700 group-hover:text-blue-600 transition-colors uppercase tracking-[0.1em]">LinkedIn</span>
                   <span className="text-[8px] text-slate-300 font-bold">.CSV SOURCE</span>
                 </label>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">Identity Graph</h2>
              <span className="text-[10px] font-black text-slate-900 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">{persons.length}</span>
            </div>
            <div className="px-1">
              <input 
                type="text" 
                placeholder="Search network nodes..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-transparent rounded-xl px-4 py-3.5 text-[11px] font-bold focus:bg-white focus:border-slate-900 transition-all outline-none placeholder:text-slate-200"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {filteredPersons.length === 0 ? (
                <div className="py-24 text-center px-4">
                   <p className="text-[10px] font-black text-slate-200 uppercase tracking-[0.5em] leading-loose">Matrix Clear</p>
                </div>
              ) : filteredPersons.map(p => (
                <ContactCard 
                  key={p.person_id}
                  person={p}
                  interactionCount={db.getInteractionsForPerson(p.person_id).length}
                  lastInteraction={
                    db.getInteractionsForPerson(p.person_id)[0] 
                      ? new Date(db.getInteractionsForPerson(p.person_id)[0].occurred_at).toLocaleDateString()
                      : 'N/A'
                  }
                  onClick={() => setSelectedPersonId(p.person_id)}
                />
              ))}
            </div>
          </div>
          <SyncStatus runs={syncRuns} />
        </aside>

        {/* Intelligence Context Panel */}
        <main className="flex-1 bg-white border border-slate-100 rounded-[3rem] shadow-sm overflow-hidden flex flex-col">
          {selectedPerson ? (
            <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-700">
              <header className="px-14 py-12 pb-10 flex items-end justify-between border-b border-slate-50">
                <div className="flex items-center gap-10">
                  <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.25rem] flex items-center justify-center font-black text-2xl shadow-2xl shadow-slate-100">
                    {selectedPerson.full_name.charAt(0)}
                  </div>
                  <div className="space-y-3">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{selectedPerson.full_name}</h1>
                    <div className="flex flex-wrap gap-1.5">
                      {evidence.map(e => (
                        <span key={e.evidence_id} className="text-[7px] font-black uppercase tracking-[0.3em] text-slate-300 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                          {e.identifier_value}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right pb-1">
                  <div className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 mb-2">Deterministic Confidence</div>
                  <div className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                    {(selectedPerson.confidence_score * 100).toFixed(0)}<span className="text-lg ml-0.5">%</span>
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-14 py-12 custom-scrollbar space-y-16">
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-200 mb-8 flex items-center gap-4">
                    <span className="h-px flex-1 bg-slate-50" /> Relationship Synthesis <span className="h-px flex-1 bg-slate-50" />
                  </h3>
                  <div className={`p-12 bg-slate-50/50 border border-slate-100 rounded-[3rem] relative transition-all duration-500 ${isLoadingSummary ? 'opacity-40' : 'opacity-100'}`}>
                    {isLoadingSummary ? (
                      <div className="py-12 text-center space-y-5">
                        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full mx-auto animate-spin" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aggregating Chronology...</span>
                      </div>
                    ) : (
                      <p className="text-base font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap tracking-tight">
                        {relationshipSummary}
                      </p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-200 mb-8 flex items-center gap-4">
                    <span className="h-px flex-1 bg-slate-50" /> Interaction Log <span className="h-px flex-1 bg-slate-50" />
                  </h3>
                  <InteractionList interactions={interactions} />
                </section>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-20 animate-in fade-in duration-700">
              <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mb-10 border border-slate-100">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 4a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2V4zm-2 2V5a4 4 0 018 0v1M5 19a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2H5z" /></svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-4 uppercase tracking-[0.2em]">Neural Standby</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Select an identity node from the matrix panel</p>
            </div>
          )}
        </main>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f8fafc; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #f1f5f9; }
      `}</style>
    </Layout>
  );
};

export default App;
