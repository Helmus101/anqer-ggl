
import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-slate-900 selection:text-white antialiased">
      <header className="px-14 py-12 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-slate-900 rounded-[1.25rem] flex items-center justify-center text-white font-black text-2xl shadow-2xl shadow-slate-100 transition-transform hover:rotate-3">A</div>
          <div className="flex flex-col">
            <h1 className="text-[14px] font-black tracking-[0.5em] uppercase text-slate-900 leading-none mb-1.5">Anqer</h1>
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Intelligence OS</span>
          </div>
        </div>
        <div className="h-[1px] flex-1 mx-24 bg-slate-50" />
        <nav className="flex gap-12 items-center">
          <button className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-colors">Nodes</button>
          <button className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-colors">Sync</button>
          <div className="flex items-center gap-2.5 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
             <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
             <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Active</span>
          </div>
        </nav>
      </header>
      <main className="flex-1 px-14 pb-14 overflow-hidden">
        {children}
      </main>
    </div>
  );
};
