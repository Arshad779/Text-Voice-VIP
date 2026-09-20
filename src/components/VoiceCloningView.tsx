import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  Upload, 
  Sparkles, 
  Play, 
  Trash2, 
  Check, 
  AlertCircle, 
  FileAudio,
  User,
  ArrowRight,
  Edit2,
  Volume2,
  ShieldCheck,
  RefreshCw,
  Clock
} from 'lucide-react';
import { ClonedVoice } from '../types';

interface VoiceCloningViewProps {
  clonedVoices: ClonedVoice[];
  onAddClonedVoice: (voice: ClonedVoice) => void;
  onDeleteClonedVoice: (id: string) => void;
  onRenameClonedVoice?: (id: string, newName: string) => void;
  onSelectVoiceForTTS: (voice: ClonedVoice) => void;
  onPlayPreview: (audioUrl: string) => void;
}

export const VoiceCloningView: React.FC<VoiceCloningViewProps> = ({
  clonedVoices,
  onAddClonedVoice,
  onDeleteClonedVoice,
  onRenameClonedVoice,
  onSelectVoiceForTTS,
  onPlayPreview
}) => {
  const [voiceName, setVoiceName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [language, setLanguage] = useState('English');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inline rename state
  const [editingCloneId, setEditingCloneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Start Microphone Recording
  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      setErrorMessage("Could not access microphone: " + (err.message || "Permission denied"));
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordSeconds < 2) {
        setErrorMessage("The recording was under 2 seconds. For best quality, record 4 to 20 seconds of clear speech.");
      }
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setErrorMessage("Audio file must be under 25MB.");
        return;
      }
      setAudioBlob(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      if (!voiceName) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setVoiceName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  // Quick Preset Templates for Instant High-Quality Audio
  const loadPresetTemplate = async (templateName: string, templateGender: 'male' | 'female', templateLang: string, url: string) => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setStatusMessage(`Loading ${templateName} sample audio...`);
      const res = await fetch(url);
      const blob = await res.blob();
      setAudioBlob(blob);
      setAudioUrl(url);
      setVoiceName(templateName);
      setGender(templateGender);
      setLanguage(templateLang);
      setIsProcessing(false);
      setStatusMessage(null);
    } catch (e: any) {
      setIsProcessing(false);
      setErrorMessage("Could not load template: " + e.message);
    }
  };

  // Save Voice Clone to Server
  const handleSaveClone = async () => {
    if (!voiceName.trim()) {
      setErrorMessage("Please enter a name for your cloned voice.");
      return;
    }
    if (!audioBlob) {
      setErrorMessage("Please record from your microphone or upload an audio sample first.");
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setStatusMessage("Analyzing vocal frequencies, formant profile & harmonic resonance...");

    try {
      // Read blob as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64 = res.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const base64Data = await base64Promise;

      const response = await fetch("/api/voice/save-clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioData: base64Data,
          voiceName: voiceName.trim(),
          gender,
          language,
          accent: `${language} (${gender === 'male' ? 'Male' : 'Female'})`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      const profile = result.profile;

      const newClone: ClonedVoice = {
        id: profile.id,
        name: profile.name,
        gender: profile.gender,
        accent: profile.accent,
        flag: profile.flag || "🎙️",
        language: profile.language || language,
        tag: "Acoustic Clone",
        category: "Cloned",
        neuralModel: profile.neuralModel,
        pitch: profile.pitch,
        speed: profile.speed,
        emotion: profile.emotion,
        baseVoice: profile.baseVoice,
        styleDirective: profile.styleDirective,
        description: profile.description,
        createdAt: profile.createdAt,
        sampleAudioUrl: profile.sampleAudioUrl || result.audioUrl,
        sampleDuration: profile.sampleDuration,
        verified: true
      };

      onAddClonedVoice(newClone);
      setStatusMessage("Voice clone calibrated and verified successfully!");
      setVoiceName('');
      setAudioBlob(null);
      setAudioUrl(null);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to clone voice.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Rename Clone Handler
  const submitRename = async (cloneId: string) => {
    if (!editingName.trim()) {
      setEditingCloneId(null);
      return;
    }
    try {
      const res = await fetch("/api/voice/rename-clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cloneId, name: editingName.trim() })
      });
      if (res.ok) {
        if (onRenameClonedVoice) {
          onRenameClonedVoice(cloneId, editingName.trim());
        }
      }
    } catch (e) {
      console.error("Rename failed", e);
    } finally {
      setEditingCloneId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Voice Cloning Lab</span>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              Acoustic Neural Engine
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Create ultra-realistic custom voices. Your uploaded clones are permanently stored and mapped to dedicated neural acoustic models.
          </p>
        </div>
      </div>

      {/* Error / Alert notification */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Notice: </span>
            {errorMessage}
          </div>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Cloning Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        
        {/* Quick Speaker Starter Templates */}
        <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Quick Starter Calibration Samples</span>
            </p>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Instant acoustic masters
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              type="button"
              onClick={() => loadPresetTemplate("Brian Studio Clone", "male", "English", "/audio/brian-preview.wav")}
              className="px-2.5 py-1.5 bg-white hover:bg-indigo-50/80 border border-slate-200 rounded-lg text-left text-xs text-slate-800 hover:text-indigo-700 font-medium transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <span>🇬🇧</span>
              <span className="truncate">UK Male (Brian)</span>
            </button>
            <button
              type="button"
              onClick={() => loadPresetTemplate("Emma US Clone", "female", "English", "/audio/brian-preview.wav")}
              className="px-2.5 py-1.5 bg-white hover:bg-indigo-50/80 border border-slate-200 rounded-lg text-left text-xs text-slate-800 hover:text-indigo-700 font-medium transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <span>🇺🇸</span>
              <span className="truncate">US Female (Emma)</span>
            </button>
            <button
              type="button"
              onClick={() => loadPresetTemplate("Asad Urdu Clone", "male", "Urdu", "/audio/brian-preview.wav")}
              className="px-2.5 py-1.5 bg-white hover:bg-indigo-50/80 border border-slate-200 rounded-lg text-left text-xs text-slate-800 hover:text-indigo-700 font-medium transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <span>🇵🇰</span>
              <span className="truncate">Urdu Male (Asad)</span>
            </button>
            <button
              type="button"
              onClick={() => loadPresetTemplate("Swara Hindi Clone", "female", "Hindi", "/audio/brian-preview.wav")}
              className="px-2.5 py-1.5 bg-white hover:bg-indigo-50/80 border border-slate-200 rounded-lg text-left text-xs text-slate-800 hover:text-indigo-700 font-medium transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <span>🇮🇳</span>
              <span className="truncate">Hindi Female (Swara)</span>
            </button>
          </div>
        </div>

        {/* Configuration Row: Voice Name, Gender & Language */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Voice Name
            </label>
            <input
              type="text"
              placeholder="e.g. My Studio Voice, John, Sarah"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-indigo-600 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Speaker Gender Profile
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  gender === 'male'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>👨 Male</span>
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  gender === 'female'
                    ? 'bg-pink-50 border-pink-500 text-pink-700 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>👩 Female</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Target Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-indigo-600 shadow-2xs font-medium cursor-pointer"
            >
              <option value="English">English (US / UK / Global)</option>
              <option value="Urdu">Urdu (اردو)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
              <option value="Arabic">Arabic (العربية)</option>
              <option value="Russian">Russian (Русский)</option>
            </select>
          </div>
        </div>

        {/* Audio Input: Record from Mic vs Upload File */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Record with Mic */}
          <div className="border border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center text-center bg-slate-50/50">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xs mb-3 transition-all ${
              isRecording ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-white border border-slate-200 text-indigo-600'
            }`}>
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 mb-1">
              Record from Microphone
            </h3>
            <p className="text-[11px] text-slate-500 mb-4 max-w-xs">
              Speak naturally for 5 to 20 seconds. Read any sentence aloud in a clear room.
            </p>

            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs animate-pulse cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Recording ({recordSeconds}s)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Start Mic Recording</span>
              </button>
            )}
          </div>

          {/* Upload Audio File */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-slate-100/60 transition-colors cursor-pointer"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*,.wav,.mp3,.webm,.m4a,.ogg,.aac"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-xs mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 mb-1">
              Upload Audio File
            </h3>
            <p className="text-[11px] text-slate-500 mb-4 max-w-xs">
              Supports WAV, MP3, WebM, M4A up to 25MB.
            </p>
            <span className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs">
              Browse Audio File
            </span>
          </div>

        </div>

        {/* Audio Loaded Preview Player */}
        {audioUrl && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileAudio className="w-4 h-4 text-indigo-600" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800">
                  Voice sample loaded & calibrated
                </span>
                <span className="text-[10px] text-slate-500">
                  Ready for neural acoustic mapping ({gender}, {language})
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPlayPreview(audioUrl)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current text-indigo-600" />
                <span>Listen Sample</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAudioBlob(null);
                  setAudioUrl(null);
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                title="Discard sample"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Action Button: Clone Voice */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSaveClone}
            disabled={isProcessing || !audioBlob || !voiceName.trim()}
            className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer ${
              !isProcessing && audioBlob && voiceName.trim()
                ? 'bg-slate-900 hover:bg-slate-800 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{statusMessage || "Calibrating Neural Clone..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Clone Voice & Activate Acoustic Profile</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Cloned Voices List & Management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Your Cloned Voices</span>
            <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-full font-semibold">
              {clonedVoices.length} / 20+ profiles
            </span>
          </h3>
          <span className="text-[11px] text-slate-500">
            Selected clones are permanently locked for TTS generation
          </span>
        </div>
        
        {clonedVoices.length === 0 ? (
          <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
            <User className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">
              No custom voices cloned yet
            </p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Record your voice or click one of the quick starter templates above to generate your first verified voice clone.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {clonedVoices.map((v) => {
              const isEditing = editingCloneId === v.id;

              return (
                <div
                  key={v.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 shadow-2xs ${
                        v.gender === 'male' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-pink-50 text-pink-700 border border-pink-100'
                      }`}>
                        {v.gender === 'male' ? '👨' : '👩'}
                      </div>
                      <div>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="px-2 py-1 text-xs border border-indigo-500 rounded-lg outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => submitRename(v.id)}
                              className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCloneId(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{v.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 font-semibold">
                              {v.gender}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCloneId(v.id);
                                setEditingName(v.name);
                              }}
                              className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              title="Rename clone"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </h4>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>{v.language || 'English'}</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3" />
                            Verified Profile
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold">
                      Active
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                    {v.description || "Acoustically calibrated clone profile with balanced vocal resonance."}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(v.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {v.sampleAudioUrl && (
                        <button
                          type="button"
                          onClick={() => onPlayPreview(v.sampleAudioUrl!)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                          title="Preview audio sample"
                        >
                          <Play className="w-3.5 h-3.5 fill-current text-indigo-600" />
                          <span>Preview</span>
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => onSelectVoiceForTTS(v)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                        title="Use in Text-to-Speech editor"
                      >
                        <span>Reuse for TTS</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${v.name}"?`)) {
                            onDeleteClonedVoice(v.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                        title="Delete clone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
