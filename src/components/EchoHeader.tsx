import React from 'react';
import { 
  AudioLines, 
  LayoutDashboard, 
  Mic, 
  Headphones, 
  FolderClosed, 
  Settings, 
  Sun, 
  Moon, 
  Bell, 
  Sparkles 
} from 'lucide-react';

export type NavTab = 'dashboard' | 'tts' | 'cloning' | 'library' | 'files' | 'history' | 'settings';

interface EchoHeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  notificationCount?: number;
  onOpenNotifications?: () => void;
}

export const EchoHeader: React.FC<EchoHeaderProps> = ({
  activeTab,
  onSelectTab,
  isDarkMode,
  onToggleDarkMode,
  notificationCount = 1,
  onOpenNotifications
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'tts', label: 'Text to Speech', icon: <AudioLines className="w-4 h-4" /> },
    { id: 'cloning', label: 'Voice Cloning', icon: <Mic className="w-4 h-4" /> },
    { id: 'library', label: 'Voice Library', icon: <Headphones className="w-4 h-4" /> },
    { id: 'files', label: 'My Files', icon: <FolderClosed className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo & Tagline */}
        <div 
          onClick={() => onSelectTab('tts')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200 group-hover:bg-indigo-700 transition-colors">
            {/* Custom Soundwave Equalizer Logo */}
            <div className="flex items-center gap-0.5 h-5">
              <span className="w-1 h-3 bg-white rounded-full animate-pulse"></span>
              <span className="w-1 h-5 bg-white rounded-full"></span>
              <span className="w-1 h-4 bg-white rounded-full"></span>
              <span className="w-1 h-2 bg-white rounded-full"></span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none font-sans">
                Echo Studio
              </h1>
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-700 rounded-md uppercase tracking-wider border border-indigo-100">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium tracking-normal mt-0.5">
              Real Voices. Real Emotions.
            </p>
          </div>
        </div>

        {/* Top Centered Navigation Bar */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-50/80 p-1 rounded-xl border border-slate-200/80">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm font-semibold border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Tools: Theme Switcher, Notifications, Profile Avatar */}
        <div className="flex items-center gap-3">
          
          {/* Light / Dark Mode Toggle Pill */}
          <button
            onClick={onToggleDarkMode}
            title={isDarkMode ? "Switch to Light mode" : "Switch to Dark mode"}
            className="flex items-center gap-1.5 p-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-full border border-slate-200 transition-colors cursor-pointer"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500 ml-1" />
            <div className="w-8 h-4 bg-slate-300 rounded-full relative transition-colors">
              <div 
                className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.25 shadow-xs transition-transform duration-200 ${
                  isDarkMode ? 'translate-x-4 bg-indigo-600' : 'translate-x-0.5'
                }`}
              />
            </div>
            <Moon className="w-3.5 h-3.5 text-slate-400 mr-1" />
          </button>

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>

          {/* User Profile Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-indigo-100 cursor-pointer">
              A
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
