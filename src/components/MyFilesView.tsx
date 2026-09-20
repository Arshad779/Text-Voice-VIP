import React from 'react';
import { 
  Play, 
  Download, 
  Trash2, 
  Calendar, 
  Clock, 
  FileText, 
  Share2, 
  FolderOpen 
} from 'lucide-react';
import { AudioGeneration } from '../types';

interface MyFilesViewProps {
  files: AudioGeneration[];
  onPlayFile: (file: AudioGeneration) => void;
  onDeleteFile: (id: string) => void;
  currentPlayingUrl: string | null;
}

export const MyFilesView: React.FC<MyFilesViewProps> = ({
  files,
  onPlayFile,
  onDeleteFile,
  currentPlayingUrl
}) => {
  const downloadAudio = (file: AudioGeneration) => {
    const a = document.createElement('a');
    a.href = file.audioUrl;
    a.download = `echo-studio-${file.voiceName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          My Files & Audio Library
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Access all your generated speech files, listen to waveforms, and export audio masters.
        </p>
      </div>

      {files.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">No audio files generated yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Type any text in the Text to Speech workspace and click Generate Speech to create and save studio recordings here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {files.map((file) => {
              const isPlaying = currentPlayingUrl === file.audioUrl;

              return (
                <div
                  key={file.id}
                  className="p-4.5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onPlayFile(file)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs cursor-pointer transition-transform active:scale-95 ${
                        isPlaying
                          ? 'bg-indigo-600 text-white animate-pulse'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                      title={isPlaying ? "Playing" : "Play file"}
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {file.title || "Speech Narration"}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 shrink-0">
                          {file.voiceName}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                          {file.language}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate max-w-2xl font-normal">
                        "{file.text}"
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(file.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {file.duration > 0 ? `${file.duration.toFixed(1)}s` : "0:06"}
                        </span>
                        <span>24 kHz PCM WAV</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => downloadAudio(file)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteFile(file.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                      title="Delete recording"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
