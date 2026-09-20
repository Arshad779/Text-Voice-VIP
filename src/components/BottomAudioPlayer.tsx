import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Download, 
  MoreHorizontal, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Check, 
  Share2, 
  Sparkles,
  Music
} from 'lucide-react';

interface BottomAudioPlayerProps {
  audioUrl: string | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (progressPercent: number) => void;
  currentTime: number;
  duration: number;
  trackTitle?: string;
  voiceName?: string;
  onDownload: () => void;
}

export const BottomAudioPlayer: React.FC<BottomAudioPlayerProps> = ({
  audioUrl,
  isPlaying,
  onTogglePlay,
  onSeek,
  currentTime,
  duration,
  trackTitle = "Synthesized Speech",
  voiceName = "Echo Speaker",
  onDownload
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Generate 70 aesthetic waveform bars
  const totalBars = 72;
  const waveformHeights = useRef<number[]>([]);

  if (waveformHeights.current.length === 0) {
    // Generate pseudo-random organic waveform shape
    const bars: number[] = [];
    for (let i = 0; i < totalBars; i++) {
      const normalized = i / totalBars;
      // Organic speech wave envelope
      const envelope = Math.sin(normalized * Math.PI);
      const randomNoise = 0.35 + Math.sin(i * 0.4) * 0.25 + Math.cos(i * 0.8) * 0.15;
      const height = Math.max(15, Math.min(95, Math.round(envelope * randomNoise * 100)));
      bars.push(height);
    }
    waveformHeights.current = bars;
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioUrl || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(percent);
  };

  const copyAudioLink = () => {
    if (audioUrl) {
      navigator.clipboard.writeText(window.location.origin + audioUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      setIsMoreMenuOpen(false);
    }
  };

  return (
    <div className="w-full bg-white border-t border-slate-200 shadow-lg px-6 py-3.5 sticky bottom-0 z-40 transition-all select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Play / Pause & Time readout */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!audioUrl}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-md cursor-pointer ${
              audioUrl
                ? 'bg-slate-900 hover:bg-slate-800 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <div className="text-xs font-mono font-medium text-slate-700 min-w-[90px]">
            <span>{formatTime(currentTime)}</span>
            <span className="text-slate-400 mx-1">/</span>
            <span className="text-slate-500">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Dynamic Waveform Visualizer */}
        <div 
          onClick={handleWaveformClick}
          className={`flex-1 h-10 flex items-center gap-[3px] px-2 py-1 bg-slate-50/60 hover:bg-slate-100/70 border border-slate-200/50 rounded-xl overflow-hidden transition-colors cursor-pointer ${
            !audioUrl ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          title={audioUrl ? "Click to seek" : "No audio loaded"}
        >
          {waveformHeights.current.map((heightPercent, idx) => {
            const barPercent = (idx / totalBars) * 100;
            const isPlayed = barPercent <= progressPercent;

            return (
              <div
                key={idx}
                className="flex-1 flex items-center justify-center h-full"
              >
                <div
                  className={`w-full rounded-full transition-all duration-100 ${
                    isPlayed 
                      ? 'bg-indigo-600' 
                      : 'bg-slate-300 group-hover:bg-slate-400'
                  } ${isPlaying && isPlayed ? 'opacity-95' : 'opacity-75'}`}
                  style={{
                    height: `${heightPercent}%`,
                    minHeight: '4px'
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Right Tools: Download & More Menu */}
        <div className="flex items-center gap-2 relative shrink-0">
          
          <button
            type="button"
            onClick={onDownload}
            disabled={!audioUrl}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
              audioUrl
                ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Download</span>
          </button>

          {/* More options button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              disabled={!audioUrl}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                audioUrl
                  ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              title="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMoreMenuOpen && audioUrl && (
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50">
                <button
                  type="button"
                  onClick={() => {
                    onDownload();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download WAV Master</span>
                </button>
                <button
                  type="button"
                  onClick={copyAudioLink}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Direct Audio Link</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
