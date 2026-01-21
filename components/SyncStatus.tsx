
import React from 'react';
import { SyncRun, Platform } from '../types';

interface Props {
  runs: SyncRun[];
}

const StatusIcon: React.FC<{ status: SyncRun['status'] }> = ({ status }) => {
  switch (status) {
    case 'running':
      return (
        <div className="flex space-x-1 items-center">
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      );
    case 'completed':
      return (
        <div className="text-emerald-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      );
    case 'failed':
      return (
        <div className="text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
      );
  }
};

const PlatformIcon: React.FC<{ platform: Platform }> = ({ platform }) => {
  switch (platform) {
    case Platform.GOOGLE:
    case Platform.GMAIL:
      return <img src="https://www.google.com/favicon.ico" className="w-3.5 h-3.5" alt="G" />;
    case Platform.WHATSAPP:
      return (
        <div className="text-emerald-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"/></svg>
        </div>
      );
    case Platform.LINKEDIN:
      return (
        <div className="text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
        </div>
      );
    default:
      return null;
  }
};

export const SyncStatus: React.FC<Props> = ({ runs }) => {
  if (runs.length === 0) return null;

  // Show only last 5 runs
  const recentRuns = [...runs].sort((a, b) => b.started_at - a.started_at).slice(0, 5);

  return (
    <div className="space-y-2 mt-4">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Recent Activities</h3>
      <div className="space-y-1.5">
        {recentRuns.map((run) => (
          <div key={run.run_id} className="bg-white/50 border border-slate-100 rounded-lg p-2 flex items-center justify-between group">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex-shrink-0">
                <PlatformIcon platform={run.platform} />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-700 capitalize truncate">{run.platform} Sync</span>
                </div>
                <div className="text-[9px] text-slate-400 font-medium">
                  {new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {run.status === 'failed' && run.error_log && (
                    <span className="text-red-400 ml-1 truncate">— {run.error_log}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 ml-2">
              <StatusIcon status={run.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
