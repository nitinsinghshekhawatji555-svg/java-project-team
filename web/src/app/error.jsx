'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

export default function Error({ error, reset }) {
  const [debugExpanded, setDebugExpanded] = useState(false);

  useEffect(() => {
    console.error('System Boundary Intercept Log:', error);
  }, [error]);

  return (
    <div className="flex min-h-[75vh] items-center justify-center p-6 bg-transparent">
      <div className="max-w-md w-full text-center space-y-6">
        
        {/* Reassuring Friendly Visual Ring */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-500 border border-amber-200/60 shadow-sm">
          <AlertCircle size={22} className="animate-pulse" />
        </div>

        {/* Layman Reassuring Statement Copy Block */}
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Connection Interrupted
          </h2>
          <p className="text-sm font-medium leading-relaxed text-slate-400 max-w-sm mx-auto">
            RoadRescue hit a small bump loading your data. Don&lsquo;t worry, your active dispatch logs and request profiles are safe.
          </p>
        </div>

        {/* Non-intrusive Session Reset Call */}
        <div>
          <button
            onClick={() => reset?.()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw size={13} strokeWidth={2.5} />
            <span>Refresh Application Session</span>
          </button>
        </div>

        {/* COLLAPSIBLE ADVANCED TECHNICAL LOG SECTION */}
        {error?.message && (
          <div className="border border-slate-200/60 rounded-2xl bg-white shadow-xs overflow-hidden text-left">
            <button
              onClick={() => setDebugExpanded(!debugExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/50 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none"
            >
              <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Terminal size={12} /> Advanced Diagnostics
              </span>
              {debugExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {debugExpanded && (
              <div className="p-4 bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed break-all border-t border-slate-100 overflow-x-auto max-h-40 animate-in fade-in slide-in-from-top-1 duration-150">
                <p className="text-primary mb-1 font-bold">
                  Exception Stack Dump
                </p>
                {error.message}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}