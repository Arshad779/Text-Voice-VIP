import React from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Cpu, 
  Zap, 
  Trash2, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface SettingsViewProps {
  onClearAllHistory: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onClearAllHistory
}) => {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Echo Studio Settings
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure acoustic rendering quality, server connections, and storage.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        
        {/* Acoustic Pipeline Status */}
        <div className="flex items-center justify-between p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-900">
                Hybrid Real-Voice Engine Connected
              </h4>
              <p className="text-[11px] text-emerald-700">
                Active: 24,000 Hz Mono Studio Master with Low-Latency Synthesis.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-white text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
            ONLINE
          </span>
        </div>

        {/* Audio Quality Preferences */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Acoustic Master Preferences
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 border border-indigo-500 bg-indigo-50/40 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">24 kHz Broadcast Studio (Default)</span>
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              </div>
              <p className="text-[11px] text-slate-500">
                Optimized for fast generation and crisp speech intelligibility.
              </p>
            </div>

            <div className="p-3.5 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-700">48 kHz High-Res Master</span>
                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              </div>
              <p className="text-[11px] text-slate-500">
                Full-frequency acoustic response for cinematic mastering.
              </p>
            </div>
          </div>
        </div>

        {/* Storage and Reset */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Clear All Generated Audio
            </h4>
            <p className="text-[11px] text-slate-500">
              Removes saved files and generation history from local session storage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClearAllHistory}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Storage</span>
          </button>
        </div>

      </div>
    </div>
  );
};
