import React, { useState } from 'react';
import { 
  RotateCcw, 
  Mic, 
  Globe, 
  Smile, 
  Timer, 
  Activity, 
  Volume2, 
  Play, 
  Square, 
  ChevronDown, 
  Check, 
  Sparkles,
  User,
  Sliders,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { ClonedVoice, VoiceSettingsState } from '../types';

interface VoiceSettingsPanelProps {
  voices: ClonedVoice[];
  settings: VoiceSettingsState;
  onUpdateSettings: (newSettings: Partial<VoiceSettingsState>) => void;
  onResetSettings: () => void;
  onPreviewVoice: (voice: ClonedVoice) => void;
  isPreviewPlaying: boolean;
}

export const VoiceSettingsPanel: React.FC<VoiceSettingsPanelProps> = ({
  voices,
  settings,
  onUpdateSettings,
  onResetSettings,
  onPreviewVoice,
  isPreviewPlaying
}) => {
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true);

  const selectedVoice = voices.find(v => v.id === settings.voiceId) || voices[0];
  const isCloned = selectedVoice?.category === 'Cloned' || selectedVoice?.id?.startsWith('clone-');

  const languages = [
    { id: "English (US)", label: "English (US)", flag: "🇺🇸" },
    { id: "English (UK)", label: "English (UK)", flag: "🇬🇧" },
    { id: "Chinese", label: "Chinese (中文)", flag: "🇨🇳" },
    { id: "Spanish", label: "Spanish (Español)", flag: "🇪🇸" },
    { id: "French", label: "French (Français)", flag: "🇫🇷" },
    { id: "Hindi", label: "Hindi (हिन्दी)", flag: "🇮🇳" },
    { id: "Italian", label: "Italian (Italiano)", flag: "🇮🇹" },
    { id: "Portuguese", label: "Portuguese (Português)", flag: "🇧🇷" },
    { id: "Urdu", label: "Urdu (اردو)", flag: "🇵🇰" },
    { id: "Arabic", label: "Arabic (العربية)", flag: "🇸🇦" },
    { id: "Russian", label: "Russian (Русский)", flag: "🇷🇺" },
  ];

  const speakingStyles = [
    { id: "friendly", label: "Friendly" },
    { id: "professional", label: "Professional" },
    { id: "narrative", label: "Narrative / Storyteller" },
    { id: "conversational", label: "Conversational / Podcast" },
    { id: "energetic", label: "Energetic / Commercial" },
    { id: "whispery", label: "Calm / Meditation" },
    { id: "authoritative", label: "Authoritative / News" },
  ];

  // Group voices for dropdown
  const clonedGroup = voices.filter(v => v.category === 'Cloned' || v.id.startsWith('clone-'));
  const presetVoices = voices.filter(v => v.category !== 'Cloned' && !v.id.startsWith('clone-'));

  return (
    <aside className="w-full lg:w-80 shrink-0 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col space-y-4">
      
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Voice & Audio Controls
          </h2>
        </div>
        <button
          type="button"
          onClick={onResetSettings}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          title="Reset to default settings"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Cloned Voice Lock Indicator */}
      {isCloned && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Acoustic Clone Active</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">
              Locked
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 leading-tight">
            Synthesizer locked to <strong>{selectedVoice.name}</strong>. Never switches automatically.
          </p>
        </div>
      )}

      {/* Setting 1: Voice Selector */}
      <div className="relative">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Active Speaker Voice
        </label>
        <button
          type="button"
          onClick={() => {
            setIsVoiceDropdownOpen(!isVoiceDropdownOpen);
            setIsLanguageDropdownOpen(false);
            setIsStyleDropdownOpen(false);
          }}
          className="w-full flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
              isCloned 
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                : selectedVoice.gender === 'male' 
                ? 'bg-blue-50 text-blue-600' 
                : 'bg-pink-50 text-pink-600'
            }`}>
              {isCloned ? <Sparkles className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                <span>{selectedVoice.name}</span>
                <span className="text-[10px]">{selectedVoice.flag}</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {selectedVoice.accent || selectedVoice.category || selectedVoice.tag}
              </p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        </button>

        {/* Dropdown Menu */}
        {isVoiceDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto py-1">
            
            {/* Cloned Voices Group */}
            {clonedGroup.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50/50 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Your Cloned Voices ({clonedGroup.length})</span>
                </div>
                {clonedGroup.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ 
                        voiceId: v.id,
                        language: v.language || settings.language 
                      });
                      setIsVoiceDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer hover:bg-slate-50 ${
                      v.id === selectedVoice.id ? 'bg-indigo-50/70 text-indigo-700 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm">🎙️</span>
                      <div>
                        <p className="font-semibold text-xs text-slate-900 flex items-center gap-1">
                          {v.name}
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
                            Clone
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{v.accent || v.language}</p>
                      </div>
                    </div>
                    {v.id === selectedVoice.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                ))}
              </div>
            )}

            {/* Studio Preset Voices */}
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-100 mt-1">
              Neural Studio Presets ({presetVoices.length})
            </div>
            {presetVoices.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  onUpdateSettings({ 
                    voiceId: v.id,
                    language: v.language || settings.language 
                  });
                  setIsVoiceDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer hover:bg-slate-50 ${
                  v.id === selectedVoice.id ? 'bg-indigo-50/70 text-indigo-700 font-bold' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-sm">{v.flag}</span>
                  <div>
                    <p className="font-semibold text-xs text-slate-900 flex items-center gap-1">
                      {v.name}
                      <span className={`text-[9px] px-1 py-0.2 rounded ${
                        v.gender === 'male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                      }`}>
                        {v.gender}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{v.accent}</p>
                  </div>
                </div>
                {v.id === selectedVoice.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Setting 2: Language Selector */}
      <div className="relative">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Language & Pronunciation
        </label>
        <button
          type="button"
          onClick={() => {
            setIsLanguageDropdownOpen(!isLanguageDropdownOpen);
            setIsVoiceDropdownOpen(false);
            setIsStyleDropdownOpen(false);
          }}
          className="w-full flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-800">{settings.language}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        {isLanguageDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1">
            {languages.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => {
                  onUpdateSettings({ language: lang.id });
                  setIsLanguageDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer hover:bg-slate-50 ${
                  settings.language === lang.id ? 'bg-indigo-50/70 text-indigo-700 font-semibold' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </div>
                {settings.language === lang.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Setting 3: Speaking Style & Emotion */}
      <div className="relative">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Speaking Style
        </label>
        <button
          type="button"
          onClick={() => {
            setIsStyleDropdownOpen(!isStyleDropdownOpen);
            setIsVoiceDropdownOpen(false);
            setIsLanguageDropdownOpen(false);
          }}
          className="w-full flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <Smile className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-800">{settings.speakingStyle}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        {isStyleDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1">
            {speakingStyles.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => {
                  onUpdateSettings({ speakingStyle: style.label });
                  setIsStyleDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer hover:bg-slate-50 ${
                  settings.speakingStyle === style.label ? 'bg-indigo-50/70 text-indigo-700 font-semibold' : 'text-slate-700'
                }`}
              >
                <span>{style.label}</span>
                {settings.speakingStyle === style.label && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Core Sliders: Speed & Pitch */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">Speaking Rate</label>
            <span className="text-[11px] font-mono text-slate-500">{settings.speed}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.75"
            step="0.05"
            value={settings.speed}
            onChange={(e) => onUpdateSettings({ speed: parseFloat(e.target.value) })}
            className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">Pitch Shift</label>
            <span className="text-[11px] font-mono text-slate-500">
              {settings.pitch > 0 ? `+${settings.pitch}` : settings.pitch}
            </span>
          </div>
          <input
            type="range"
            min="-10"
            max="10"
            step="1"
            value={settings.pitch}
            onChange={(e) => onUpdateSettings({ pitch: parseInt(e.target.value) })}
            className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
          />
        </div>
      </div>

      {/* Advanced TTS Controls Toggle */}
      <div className="pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-700 py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Advanced Vocal Controls</span>
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="space-y-3.5 pt-3">
            {/* Stability */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">Stability</label>
                <span className="text-[11px] font-mono text-slate-500">{settings.stability}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.stability}
                onChange={(e) => onUpdateSettings({ stability: parseInt(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Variable</span>
                <span>Rock Solid</span>
              </div>
            </div>

            {/* Similarity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">Clarity + Similarity</label>
                <span className="text-[11px] font-mono text-slate-500">{settings.similarity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.similarity}
                onChange={(e) => onUpdateSettings({ similarity: parseInt(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>

            {/* Style Strength */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">Style Exaggeration</label>
                <span className="text-[11px] font-mono text-slate-500">{settings.styleStrength}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.styleStrength}
                onChange={(e) => onUpdateSettings({ styleStrength: parseInt(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>

            {/* Emotion Level */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Emotion Dynamic Range
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['calm', 'natural', 'expressive'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onUpdateSettings({ emotionLevel: lvl })}
                    className={`py-1.5 px-2 text-[11px] font-medium rounded-lg border capitalize transition-all cursor-pointer ${
                      settings.emotionLevel === lvl
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Output Volume */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">Master Gain</label>
                <span className="text-[11px] font-mono text-slate-500">{settings.volume}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={settings.volume}
                  onChange={(e) => onUpdateSettings({ volume: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action: Preview Voice */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => onPreviewVoice(selectedVoice)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          {isPreviewPlaying ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current text-indigo-400 animate-pulse" />
              <span>Auditioning Voice...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Audition Selected Voice</span>
            </>
          )}
        </button>
      </div>

    </aside>
  );
};
