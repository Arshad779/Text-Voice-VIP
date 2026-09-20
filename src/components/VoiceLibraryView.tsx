import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  ArrowRight, 
  Search, 
  Sparkles,
  Mic,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { ClonedVoice } from '../types';

interface VoiceLibraryViewProps {
  voices: ClonedVoice[];
  onSelectVoiceForTTS: (voice: ClonedVoice) => void;
  onPreviewVoice: (voice: ClonedVoice) => void;
  currentPreviewVoiceId: string | null;
}

export const VoiceLibraryView: React.FC<VoiceLibraryViewProps> = ({
  voices,
  onSelectVoiceForTTS,
  onPreviewVoice,
  currentPreviewVoiceId
}) => {
  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'All Voices' },
    { id: 'Cloned', label: 'My Clones' },
    { id: 'American', label: 'American' },
    { id: 'Chinese', label: 'Chinese' },
    { id: 'Spanish', label: 'Spanish' },
    { id: 'French', label: 'French' },
    { id: 'Hindi', label: 'Hindi' },
    { id: 'Italian', label: 'Italian' },
    { id: 'Portuguese', label: 'Portuguese' },
    { id: 'British', label: 'British' },
    { id: 'Urdu', label: 'Urdu' },
    { id: 'Arabic', label: 'Arabic' },
    { id: 'Russian', label: 'Russian' },
  ];

  const filteredVoices = voices.filter((v) => {
    // Gender filter
    if (filterGender !== 'all' && v.gender !== filterGender) return false;

    // Category filter
    if (filterCategory !== 'all') {
      if (filterCategory === 'Cloned') {
        if (v.category !== 'Cloned' && !v.id.startsWith('clone-')) return false;
      } else {
        const cat = (v.category || v.accent || v.language || '').toLowerCase();
        if (!cat.includes(filterCategory.toLowerCase())) return false;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.accent.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        (v.language && v.language.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Voice Library</span>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
              {voices.length} Studio Voices
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Discover studio-quality voices across American, Chinese, Spanish, French, Hindi, Italian, Portuguese, and international accents.
          </p>
        </div>

        {/* Search bar & Gender filter */}
        <div className="flex items-center gap-2">
          {/* Gender Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {(['all', 'male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setFilterGender(g)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                  filterGender === g
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-48">
            <input
              type="text"
              placeholder="Search voices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 shadow-2xs focus:outline-indigo-600"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setFilterCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Voice Cards Grid */}
      {filteredVoices.length === 0 ? (
        <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-2">
          <Mic className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No voices match your filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query, language category, or gender filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVoices.map((voice) => {
            const isPlaying = currentPreviewVoiceId === voice.id;
            const isCloned = voice.category === 'Cloned' || voice.id.startsWith('clone-');

            return (
              <div
                key={voice.id}
                className={`bg-white border rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-all group ${
                  isCloned ? 'border-emerald-200 hover:border-emerald-300' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Header with Avatar and Flag */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shadow-2xs shrink-0 ${
                        isCloned 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : voice.gender === 'male' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                          : 'bg-pink-50 text-pink-700 border border-pink-100'
                      }`}>
                        {isCloned ? '🎙️' : voice.gender === 'male' ? '👨' : '👩'}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{voice.name}</span>
                          <span>{voice.flag}</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {voice.accent || voice.tag}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isCloned ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3" />
                          Clone
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          voice.gender === 'male' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/60' 
                            : 'bg-pink-50 text-pink-700 border border-pink-200/60'
                        }`}>
                          {voice.gender}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                    {voice.description}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onPreviewVoice(voice)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isPlaying
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current text-indigo-600 animate-pulse" />
                        <span>Auditioning...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current text-slate-500" />
                        <span>Audition Voice</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectVoiceForTTS(voice)}
                    className="flex items-center gap-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                    title="Select for Text to Speech"
                  >
                    <span>Use</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
