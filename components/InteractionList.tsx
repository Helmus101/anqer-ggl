
import React from 'react';
import { Interaction, Platform } from '../types';

const PlatformLabel: React.FC<{ platform: Platform }> = ({ platform }) => {
  const meta: Record<string, { label: string, color: string }> = {
    [Platform.WHATSAPP]: { label: 'WHATSAPP', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    [Platform.GMAIL]: { label: 'GMAIL', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    [Platform.LINKEDIN]: { label: 'LINKEDIN', color: 'text-blue-600 bg-blue-50 border-blue-100' },
    [Platform.GOOGLE]: { label: 'CONTACTS', color: 'text-slate-600 bg-slate-50 border-slate-100' },
  };
  const current = meta[platform] || { label: 'LOG', color: 'text-slate-400 bg-slate-50 border-slate-50' };
  
  return (
    <span className={`text-[8px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest ${current.color}`}>
      {current.label}
    </span>
  );
};

export const InteractionList: React.FC<{ interactions: Interaction[] }> = ({ interactions }) => {
  if (interactions.length === 0) {
    return (
      <div className="text-[10px] font-black uppercase text-slate-300 py-16 tracking-[0.4em] text-center border-2 border-dashed border-slate-50 rounded-[3rem]">
        Log Sequence Empty
      </div>
    );
  }

  return (
    <div className="space-y-12 relative">
      <div className="absolute left-[3px] top-4 bottom-4 w-[1px] bg-slate-50" />
      {interactions.map((i) => (
        <div key={i.interaction_id} className="relative pl-10 group animate-in slide-in-from-left-2 duration-500">
          <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-slate-900 transition-colors ring-4 ring-white" />
          <div className="flex items-center gap-4 mb-4">
             <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
               {new Date(i.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
             </span>
             <PlatformLabel platform={i.source_platform} />
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 hover:border-slate-200 transition-all shadow-sm hover:shadow-md group-hover:-translate-y-1">
            <p className="text-[13px] font-semibold text-slate-600 leading-[1.8] whitespace-pre-wrap tracking-tight">
              {i.summary_short}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
