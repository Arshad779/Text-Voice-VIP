import React from 'react';
import { 
  AudioLines, 
  Mic, 
  Headphones, 
  FolderClosed, 
  History, 
  Settings, 
  Sparkles 
} from 'lucide-react';
import { NavTab } from './EchoHeader';

interface EchoSidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  savedFilesCount?: number;
}

export const EchoSidebar: React.FC<EchoSidebarProps> = ({
  activeTab,
  onSelectTab,
  savedFilesCount = 0
}) => {
  const sidebarItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { id: 'tts', label: 'Text to Speech', icon: <AudioLines className="w-4 h-4" /> },
    { id: 'cloning', label: 'Voice Cloning', icon: <Mic className="w-4 h-4" /> },
    { id: 'library', label: 'Voice Library', icon: <Headphones className="w-4 h-4" /> },
    { id: 'files', label: 'My Files', icon: <FolderClosed className="w-4 h-4" />, badge: savedFilesCount > 0 ? savedFilesCount : undefined },
    { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-56 shrink-0 hidden md:flex flex-col py-6 pr-6 select-none">
      <nav className="space-y-1.5">
        {sidebarItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-200/80 text-slate-700 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Acoustic Model Status Pill at bottom of sidebar */}
      <div className="mt-auto pt-6 border-t border-slate-100">
        <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Audio Engine</span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Ready
            </span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">
            24 kHz Studio Master Active
          </p>
        </div>
      </div>
    </aside>
  );
};
