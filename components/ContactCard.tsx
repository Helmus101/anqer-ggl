
import React from 'react';
import { Person } from '../types';

interface Props {
  person: Person;
  interactionCount: number;
  lastInteraction: string;
  onClick: () => void;
}

export const ContactCard: React.FC<Props> = ({ person, interactionCount, lastInteraction, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="group bg-white p-4 rounded-2xl border border-slate-100 hover:border-slate-900 cursor-pointer transition-all flex items-center gap-4 shadow-sm hover:shadow-md active:scale-[0.98]"
    >
      <div className="w-11 h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-lg shadow-slate-100 group-hover:scale-105 transition-transform duration-300">
        {person.full_name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[13px] font-black text-slate-900 truncate tracking-tight">{person.full_name}</h3>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate mt-0.5">
          {interactionCount} Logs <span className="mx-1.5 opacity-30">/</span> {lastInteraction}
        </p>
      </div>
    </div>
  );
};
