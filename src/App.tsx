import React, { useState, useEffect, useRef } from 'react';
import { 
  AudioLines, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Undo2, 
  Redo2, 
  Trash2, 
  UploadCloud, 
  Sparkles, 
  Check, 
  FileText,
  AlertCircle,
  ShieldCheck,
  Zap,
  Volume2
} from 'lucide-react';
import { EchoHeader, NavTab } from './components/EchoHeader';
import { EchoSidebar } from './components/EchoSidebar';
import { VoiceSettingsPanel } from './components/VoiceSettingsPanel';
import { BottomAudioPlayer } from './components/BottomAudioPlayer';
import { VoiceCloningView } from './components/VoiceCloningView';
import { VoiceLibraryView } from './components/VoiceLibraryView';
import { MyFilesView } from './components/MyFilesView';
import { SettingsView } from './components/SettingsView';
import { INITIAL_PRESET_VOICES, SAMPLE_SCRIPTS } from './data/voices';
import { ClonedVoice, AudioGeneration, VoiceSettingsState } from './types';

// Helper to convert base64 PCM 16-bit 24kHz audio to playable WAV Blob URL
function pcm16ToWavBlob(base64Data: string, sampleRate = 24000): Blob {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const pcmBytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    pcmBytes[i] = binaryString.charCodeAt(i);
  }

  // Create 44-byte WAV header
  const wavBuffer = new ArrayBuffer(44 + pcmBytes.length);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // 16 bits per sample
  writeString(36, 'data');
  view.setUint32(40, pcmBytes.length, true);

  new Uint8Array(wavBuffer, 44).set(pcmBytes);
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

// Resilient API fetcher: guards against non-JSON (like HTML proxy startup pages) and retries on bootup
async function safeFetchJson<T = any>(
  url: string,
  options: RequestInit,
  retries = 2
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get("content-type") || "";

      // If server returned non-JSON (e.g., HTML during container/proxy warm-up)
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        const isHtml = text.trim().startsWith("<!") || text.includes("<html") || text.includes("<body");
        
        if (attempt < retries && (res.status === 200 || res.status === 502 || res.status === 503 || res.status === 504)) {
          // Give server a moment to finish starting
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        if (isHtml) {
          throw new Error("Speech synthesis engine is initializing. Please try again in a few moments.");
        }
        throw new Error(text.slice(0, 150) || `Server returned non-JSON response (${res.status})`);
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      return data as T;
    } catch (err: any) {
      if (attempt < retries && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Speech synthesis engine is currently unavailable. Please try again.");
}

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<NavTab>('tts');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Editor state
  const [text, setText] = useState(
    "Hello, welcome to Echo Studio. Convert your text into natural, human-like, high quality speech."
  );
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [showScriptPicker, setShowScriptPicker] = useState(false);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);

  // Error and status state
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Voices & Settings
  const [voices, setVoices] = useState<ClonedVoice[]>(() => {
    const saved = localStorage.getItem('echo_cloned_voices');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return [...INITIAL_PRESET_VOICES, ...parsed];
      } catch (e) {}
    }
    return INITIAL_PRESET_VOICES;
  });

  const defaultVoice = voices[0] || INITIAL_PRESET_VOICES[0];

  const [voiceSettings, setVoiceSettings] = useState<VoiceSettingsState>(() => {
    const savedVoiceId = localStorage.getItem('echo_selected_voice_id');
    const matchedVoice = savedVoiceId ? voices.find(v => v.id === savedVoiceId) : null;
    const initialVoice = matchedVoice || defaultVoice;

    return {
      voiceId: initialVoice.id,
      language: initialVoice.language || "English (UK)",
      speakingStyle: "Friendly",
      speed: 1.0,
      pitch: 0,
      volume: 80,
      stability: 75,
      similarity: 85,
      styleStrength: 50,
      emotionLevel: 'natural',
    };
  });

  // Generated Files & History
  const [generatedFiles, setGeneratedFiles] = useState<AudioGeneration[]>(() => {
    const saved = localStorage.getItem('echo_generated_files');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  // Persistent Player state
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>("/audio/brian-preview.wav");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(7.0);
  const [activeTrackTitle, setActiveTrackTitle] = useState("Brian (UK Male) Preview");
  const [activeVoiceName, setActiveVoiceName] = useState("Brian (Male)");

  // Synthesis loader
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewVoiceId, setPreviewVoiceId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch verified clones from server on load
  useEffect(() => {
    fetch('/api/voice/clones')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.clones)) {
          const serverClones: ClonedVoice[] = data.clones;
          setVoices((prev) => {
            const presets = prev.filter((v) => v.isPreset);
            return [...presets, ...serverClones];
          });
          // Synchronize localStorage with server state
          try {
            localStorage.setItem('echo_cloned_voices', JSON.stringify(serverClones));
          } catch (e) {}

          // If a clone was saved in localStorage as selected, maintain that clone selection
          const savedVoiceId = localStorage.getItem('echo_selected_voice_id');
          if (savedVoiceId && serverClones.some(c => c.id === savedVoiceId)) {
            const selectedClone = serverClones.find(c => c.id === savedVoiceId)!;
            setVoiceSettings(curr => ({
              ...curr,
              voiceId: selectedClone.id,
              language: selectedClone.language || curr.language
            }));
          } else {
            // If current voiceId was a clone that no longer exists on server, reset to default
            setVoiceSettings((curr) => {
              const exists = serverClones.some((c) => c.id === curr.voiceId) || INITIAL_PRESET_VOICES.some((p) => p.id === curr.voiceId);
              if (!exists) {
                return { ...curr, voiceId: defaultVoice.id };
              }
              return curr;
            });
          }
        }
      })
      .catch((err) => {
        console.warn("Could not sync server clones:", err);
      });
  }, []);

  // Initialize or update audio playback
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setPreviewVoiceId(null);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // Update volume whenever voiceSettings.volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, voiceSettings.volume / 100));
    }
  }, [voiceSettings.volume]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioRef.current || !currentAudioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setPreviewVoiceId(null);
    } else {
      if (audioRef.current.src !== window.location.origin + currentAudioUrl && !currentAudioUrl.startsWith('blob:')) {
        audioRef.current.src = currentAudioUrl;
      }
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn("Playback error:", e);
      });
    }
  };

  // Handle Seeking
  const handleSeek = (progressPercent: number) => {
    if (audioRef.current && duration > 0) {
      const newTime = progressPercent * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Play a specific audio URL directly
  const playDirectAudio = (url: string, title = "Audio Track", voice = "Echo Speaker", voiceId?: string) => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.src = url;
    audioRef.current.currentTime = 0;
    setCurrentAudioUrl(url);
    setActiveTrackTitle(title);
    setActiveVoiceName(voice);
    if (voiceId) setPreviewVoiceId(voiceId);

    audioRef.current.play().then(() => {
      setIsPlaying(true);
    }).catch(err => console.warn("Direct play error:", err));
  };

  // Audition / Preview a voice
  const handlePreviewVoice = async (voice: ClonedVoice) => {
    if (isPlaying && previewVoiceId === voice.id) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setPreviewVoiceId(null);
      return;
    }

    // Live audition sample using TTS engine with localized greeting
    try {
      setPreviewVoiceId(voice.id);
      const cleanName = voice.name.replace(/\(.*?\)/g, '').trim();
      const lang = (voice.language || '').toLowerCase();
      let sampleText = `Hello! This is ${cleanName}, ready to narrate your text with natural human intonation.`;
      
      if (lang.includes('chinese') || lang.includes('zh')) {
        sampleText = `你好！我是${cleanName}，很高兴为您提供自然逼真、富有情感的真人级语音合成。`;
      } else if (lang.includes('spanish') || lang.includes('es')) {
        sampleText = `¡Hola! Soy ${cleanName}, listo para narrar tu texto con entonación clara y natural.`;
      } else if (lang.includes('french') || lang.includes('fr')) {
        sampleText = `Bonjour ! Je suis ${cleanName}, prêt à donner vie à vos projets avec une voix naturelle et élégante.`;
      } else if (lang.includes('hindi') || lang.includes('hi')) {
        sampleText = `नमस्ते! मैं हूँ ${cleanName}, आपकी सेवा में सजीव और प्राकृतिक आवाज़ के साथ तैयार।`;
      } else if (lang.includes('italian') || lang.includes('it')) {
        sampleText = `Ciao! Sono ${cleanName}, pronto a dare voce ai tuoi progetti con un timbro caldo e naturale.`;
      } else if (lang.includes('portuguese') || lang.includes('pt')) {
        sampleText = `Olá! Eu sou ${cleanName}, pronto para dar vida ao seu texto com entonação natural e envolvente.`;
      } else if (lang.includes('urdu') || lang.includes('ur')) {
        sampleText = `السلام علیکم! میں ہوں ${cleanName}، آپ کے متن کو بہترین اور قدرتی آواز میں پیش کرنے کے لیے تیار۔`;
      } else if (lang.includes('arabic') || lang.includes('ar')) {
        sampleText = `مرحباً بك! أنا ${cleanName}، مستعد لتقديم نبرة صوتية طبيعية ومميزة لنصوصك.`;
      } else if (lang.includes('russian') || lang.includes('ru')) {
        sampleText = `Здравствуйте! Это ${cleanName}, готов озвучить ваш проект естественным студийным голосом.`;
      }

      const data = await safeFetchJson("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sampleText,
          voiceId: voice.id,
          gender: voice.gender,
          language: voice.language,
          speed: 1.0,
          pitch: 0,
        })
      });

      let previewUrl = data.audioUrl;
      if (data.audioData) {
        const blob = pcm16ToWavBlob(data.audioData, data.sampleRate || 24000);
        previewUrl = URL.createObjectURL(blob);
      }
      playDirectAudio(previewUrl, `${voice.name} Audition`, voice.name, voice.id);
    } catch (e) {
      console.warn("Preview synthesis error:", e);
      if (voice.sampleAudioUrl) {
        playDirectAudio(voice.sampleAudioUrl, `${voice.name} Sample`, voice.name, voice.id);
      } else {
        setPreviewVoiceId(null);
      }
    }
  };

  // Text editor undo/redo handlers
  const handleTextChange = (newVal: string) => {
    setUndoStack(prev => [...prev.slice(-20), text]);
    setRedoStack([]);
    setText(newVal);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, text]);
    setUndoStack(u => u.slice(0, -1));
    setText(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, text]);
    setRedoStack(r => r.slice(0, -1));
    setText(next);
  };

  // Formatting helpers
  const handleFormatText = (prefix: string, suffix: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const sel = text.substring(start, end);

    let replacement = `${prefix}${sel || 'text'}${suffix}`;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    handleTextChange(newText);
  };

  // Import text file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          handleTextChange(content);
        }
      };
      reader.readAsText(file);
    }
  };

  // Generate Speech (TTS)
  const handleGenerateSpeech = async () => {
    if (!text.trim()) {
      setGenerationError("Please type or paste text to generate speech.");
      return;
    }

    const currentVoiceId = voiceSettings.voiceId;
    const selectedVoice = voices.find(v => v.id === currentVoiceId) || defaultVoice;
    const isCloned = selectedVoice.category === 'Cloned' || selectedVoice.id.startsWith('clone-');

    // Strict check: if a clone was requested, ensure the selectedVoice matches the clone ID
    if (currentVoiceId.startsWith('clone-') && selectedVoice.id !== currentVoiceId) {
      setGenerationError(`Voice clone "${currentVoiceId}" was not found in your active voices. Please re-select the clone.`);
      return;
    }

    // Required Debug Logs
    console.log(`----------------------------------------`);
    console.log(`[TTS Client Debug] Selected Clone ID: ${selectedVoice.id}`);
    console.log(`[TTS Client Debug] Selected Clone Name: ${selectedVoice.name}`);
    console.log(`[TTS Client Debug] Is Cloned Voice: ${isCloned}`);
    console.log(`----------------------------------------`);

    setGenerationError(null);
    setIsGenerating(true);

    try {
      const data = await safeFetchJson("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          voiceId: selectedVoice.id,
          gender: selectedVoice.gender,
          language: selectedVoice.language || voiceSettings.language,
          speed: voiceSettings.speed,
          pitch: voiceSettings.pitch,
          volume: voiceSettings.volume,
          stability: voiceSettings.stability,
          similarity: voiceSettings.similarity,
          styleStrength: voiceSettings.styleStrength,
          emotionLevel: voiceSettings.emotionLevel,
          customAudioUrl: selectedVoice.sampleAudioUrl,
          baseVoice: selectedVoice.baseVoice,
        })
      });

      // Required validation: if the voice used differs from selected clone, show an error instead of playing audio
      if (isCloned && data.voiceId !== selectedVoice.id) {
        throw new Error(`Voice mismatch detected: requested clone "${selectedVoice.name}" (${selectedVoice.id}) but received "${data.voiceName}" (${data.voiceId}). Audio output aborted.`);
      }

      console.log(`[TTS Client Debug] Voice Used For Generation: ${data.voiceName} (${data.voiceId}) [Neural Model: ${data.neuralModel || 'optimal'}]`);

      let audioBlobUrl = data.audioUrl;

      // If PCM base64 returned, convert to high-fidelity WAV blob
      if (data.audioData) {
        const blob = pcm16ToWavBlob(data.audioData, data.sampleRate || 24000);
        audioBlobUrl = URL.createObjectURL(blob);
      } else if (!audioBlobUrl) {
        audioBlobUrl = "/audio/brian-preview.wav";
      }

      // Play synthesized speech
      playDirectAudio(audioBlobUrl, text.slice(0, 35) + "...", selectedVoice.name);

      // Save to generated files history
      const newFile: AudioGeneration = {
        id: `gen-${Date.now()}`,
        title: text.slice(0, 40) + "...",
        text: text.trim(),
        voiceId: selectedVoice.id,
        voiceName: selectedVoice.name,
        voiceGender: selectedVoice.gender,
        language: voiceSettings.language,
        speakingStyle: voiceSettings.speakingStyle,
        audioUrl: audioBlobUrl,
        duration: data.duration || duration || 5.0,
        sampleRate: 24000,
        createdAt: new Date().toISOString(),
        isClonedVoice: isCloned
      };

      const updatedFiles = [newFile, ...generatedFiles];
      setGeneratedFiles(updatedFiles);
      localStorage.setItem('echo_generated_files', JSON.stringify(updatedFiles));

    } catch (err: any) {
      console.error("Speech generation error:", err);
      setGenerationError(err.message || "Failed to synthesize speech. Please verify settings and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Download currently active track
  const handleDownloadActiveTrack = () => {
    if (!currentAudioUrl) return;
    const a = document.createElement('a');
    a.href = currentAudioUrl;
    a.download = `echo-studio-${activeVoiceName.replace(/[\s()]/g, '-').toLowerCase()}-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Add cloned voice
  const handleAddClonedVoice = (newVoice: ClonedVoice) => {
    const updated = [newVoice, ...voices];
    setVoices(updated);
    const customOnly = updated.filter(v => !v.isPreset);
    try {
      localStorage.setItem('echo_cloned_voices', JSON.stringify(customOnly));
      localStorage.setItem('echo_selected_voice_id', newVoice.id);
    } catch (e) {}

    // Automatically select the newly created clone for immediate TTS generation!
    setVoiceSettings(s => ({
      ...s, 
      voiceId: newVoice.id,
      language: newVoice.language || s.language
    }));
    setActiveTab('tts');
  };

  // Delete cloned voice
  const handleDeleteClonedVoice = async (id: string) => {
    try {
      await fetch(`/api/voice/delete-clone/${id}`, { method: 'DELETE' });
    } catch (e) {}

    const updated = voices.filter(v => v.id !== id);
    setVoices(updated);
    const customOnly = updated.filter(v => !v.isPreset);
    try {
      localStorage.setItem('echo_cloned_voices', JSON.stringify(customOnly));
      if (voiceSettings.voiceId === id) {
        localStorage.removeItem('echo_selected_voice_id');
      }
    } catch (e) {}

    if (voiceSettings.voiceId === id) {
      setVoiceSettings(s => ({ ...s, voiceId: defaultVoice.id }));
    }
  };

  // Rename cloned voice
  const handleRenameClonedVoice = (id: string, newName: string) => {
    const updated = voices.map(v => v.id === id ? { ...v, name: newName } : v);
    setVoices(updated);
    const customOnly = updated.filter(v => !v.isPreset);
    try {
      localStorage.setItem('echo_cloned_voices', JSON.stringify(customOnly));
    } catch (e) {}
  };

  // Select voice from Library or Cloning for TTS
  const handleSelectVoiceForTTS = (voice: ClonedVoice) => {
    try {
      localStorage.setItem('echo_selected_voice_id', voice.id);
    } catch (e) {}
    setVoiceSettings(s => ({
      ...s,
      voiceId: voice.id,
      language: voice.language || s.language
    }));
    setActiveTab('tts');
  };

  const currentSelectedVoice = voices.find(v => v.id === voiceSettings.voiceId) || defaultVoice;
  const isSelectedVoiceCloned = currentSelectedVoice.category === 'Cloned' || currentSelectedVoice.id.startsWith('clone-');

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50/50 text-slate-800'}`}>
      
      {/* Top Header */}
      <EchoHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        notificationCount={generatedFiles.length > 0 ? 1 : 0}
        onOpenNotifications={() => setActiveTab('files')}
      />

      {/* Main Studio Body Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex gap-6">
        
        {/* Left Vertical Sidebar */}
        <EchoSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          savedFilesCount={generatedFiles.length}
        />

        {/* Center Main Stage */}
        <main className="flex-1 min-w-0">
          
          {/* TAB 1: TEXT TO SPEECH */}
          {(activeTab === 'tts' || activeTab === 'dashboard') && (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              
              {/* Center Canvas */}
              <div className="flex-1 w-full space-y-4">
                
                {/* Header Title & Subtitle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AudioLines className="w-5 h-5 text-indigo-600" />
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        Text to Speech
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500">
                      Convert your text into natural, human-like, high quality speech.
                    </p>
                  </div>

                  {/* Active Voice Lock Pill */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs ${
                    isSelectedVoiceCloned 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    {isSelectedVoiceCloned ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span>{currentSelectedVoice.flag}</span>
                    )}
                    <span className="font-bold">{currentSelectedVoice.name}</span>
                    {isSelectedVoiceCloned && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-200/60 rounded text-emerald-900 font-bold">
                        Acoustic Clone
                      </span>
                    )}
                  </div>
                </div>

                {/* Generation Error Alert if any */}
                {generationError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-semibold">Synthesis Notice: </span>
                      {generationError}
                    </div>
                    <button 
                      onClick={() => setGenerationError(null)} 
                      className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Main Text Editor Card */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all focus-within:border-slate-300 focus-within:shadow-sm">
                  
                  {/* Formatting Toolbar */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/40 select-none">
                    <div className="flex items-center gap-1 text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleFormatText('**', '**')}
                        className="p-1.5 hover:bg-slate-200/70 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Bold"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormatText('*', '*')}
                        className="p-1.5 hover:bg-slate-200/70 rounded-lg text-xs font-serif italic transition-colors cursor-pointer"
                        title="Italic"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormatText('<u>', '</u>')}
                        className="p-1.5 hover:bg-slate-200/70 rounded-lg text-xs underline transition-colors cursor-pointer"
                        title="Underline"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-px h-4 bg-slate-200 mx-1" />

                      <button
                        type="button"
                        onClick={() => handleFormatText('\n• ', '')}
                        className="p-1.5 hover:bg-slate-200/70 rounded-lg text-xs transition-colors cursor-pointer"
                        title="Bulleted List"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormatText('\n1. ', '')}
                        className="p-1.5 hover:bg-slate-200/70 rounded-lg text-xs transition-colors cursor-pointer"
                        title="Numbered List"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-px h-4 bg-slate-200 mx-1" />

                      <button
                        type="button"
                        onClick={handleUndo}
                        disabled={undoStack.length === 0}
                        className="p-1.5 hover:bg-slate-200/70 disabled:opacity-30 rounded-lg text-xs transition-colors cursor-pointer"
                        title="Undo"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        className="p-1.5 hover:bg-slate-200/70 disabled:opacity-30 rounded-lg text-xs transition-colors cursor-pointer"
                        title="Redo"
                      >
                        <Redo2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Clear Text button on right */}
                    <button
                      type="button"
                      onClick={() => handleTextChange('')}
                      className="flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Text</span>
                    </button>
                  </div>

                  {/* Main Textarea */}
                  <div className="p-4 relative">
                    <textarea
                      rows={9}
                      value={text}
                      onChange={(e) => handleTextChange(e.target.value)}
                      placeholder="Type or paste your text here (supports English, Urdu, Hindi, Arabic, Russian)..."
                      className="w-full bg-transparent border-none resize-none focus:outline-none text-slate-800 text-sm leading-relaxed placeholder:text-slate-400 font-normal"
                    />
                  </div>

                  {/* Editor Bottom Row */}
                  <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-100">
                    
                    {/* Left: Character counter & Import Text */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                        <span className="font-semibold text-slate-800">{text.length.toLocaleString()}</span>
                        <span>characters</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 uppercase tracking-wider font-sans">
                          Unlimited
                        </span>
                      </div>

                      {/* Import Text File & Scripts dropdown */}
                      <div className="relative">
                        <input
                          type="file"
                          ref={fileUploadInputRef}
                          onChange={handleImportFile}
                          accept=".txt,.md"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => setShowScriptPicker(!showScriptPicker)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Import Text</span>
                        </button>

                        {/* Script picker popup */}
                        {showScriptPicker && (
                          <div className="absolute bottom-full left-0 mb-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50">
                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                              Import Options
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                fileUploadInputRef.current?.click();
                                setShowScriptPicker(false);
                              }}
                              className="w-full text-left px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Upload .txt or .md file</span>
                            </button>
                            <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Preset Sample Scripts
                            </div>
                            {SAMPLE_SCRIPTS.map((script, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  handleTextChange(script.text);
                                  setShowScriptPicker(false);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg truncate cursor-pointer"
                              >
                                {script.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Generate Speech Button */}
                    <button
                      type="button"
                      onClick={handleGenerateSpeech}
                      disabled={isGenerating || !text.trim()}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold tracking-tight shadow-md transition-all cursor-pointer ${
                        !isGenerating && text.trim()
                          ? 'bg-slate-900 hover:bg-slate-800 text-white active:scale-98'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Synthesizing with {currentSelectedVoice.name}...</span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-0.5 h-3.5">
                            <span className="w-0.5 h-2.5 bg-white rounded-full"></span>
                            <span className="w-0.5 h-3.5 bg-white rounded-full"></span>
                            <span className="w-0.5 h-2 bg-white rounded-full"></span>
                          </div>
                          <span>Generate Speech</span>
                        </>
                      )}
                    </button>

                  </div>

                </div>

              </div>

              {/* Right Sidebar: Voice Settings Panel */}
              <VoiceSettingsPanel
                voices={voices}
                settings={voiceSettings}
                onUpdateSettings={(newVals) => {
                  if (newVals.voiceId) {
                    try {
                      localStorage.setItem('echo_selected_voice_id', newVals.voiceId);
                    } catch (e) {}
                  }
                  setVoiceSettings(prev => ({ ...prev, ...newVals }));
                }}
                onResetSettings={() => {
                  setVoiceSettings({
                    voiceId: defaultVoice.id,
                    language: defaultVoice.language || "English (UK)",
                    speakingStyle: "Friendly",
                    speed: 1.0,
                    pitch: 0,
                    volume: 80,
                    stability: 75,
                    similarity: 85,
                    styleStrength: 50,
                    emotionLevel: 'natural',
                  });
                }}
                onPreviewVoice={handlePreviewVoice}
                isPreviewPlaying={isPlaying}
              />

            </div>
          )}

          {/* TAB 2: VOICE CLONING */}
          {activeTab === 'cloning' && (
            <VoiceCloningView
              clonedVoices={voices.filter(v => v.category === 'Cloned' || v.id.startsWith('clone-'))}
              onAddClonedVoice={handleAddClonedVoice}
              onDeleteClonedVoice={handleDeleteClonedVoice}
              onRenameClonedVoice={handleRenameClonedVoice}
              onSelectVoiceForTTS={handleSelectVoiceForTTS}
              onPlayPreview={(url) => playDirectAudio(url, "Cloned Voice Sample", "Voice Clone")}
            />
          )}

          {/* TAB 3: VOICE LIBRARY */}
          {activeTab === 'library' && (
            <VoiceLibraryView
              voices={voices}
              onSelectVoiceForTTS={handleSelectVoiceForTTS}
              onPreviewVoice={handlePreviewVoice}
              currentPreviewVoiceId={isPlaying ? previewVoiceId : null}
            />
          )}

          {/* TAB 4: MY FILES & HISTORY */}
          {(activeTab === 'files' || activeTab === 'history') && (
            <MyFilesView
              files={generatedFiles}
              onPlayFile={(file) => playDirectAudio(file.audioUrl, file.title, file.voiceName)}
              onDeleteFile={(id) => {
                const updated = generatedFiles.filter(f => f.id !== id);
                setGeneratedFiles(updated);
                localStorage.setItem('echo_generated_files', JSON.stringify(updated));
              }}
              currentPlayingUrl={isPlaying ? currentAudioUrl : null}
            />
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <SettingsView
              onClearAllHistory={() => {
                setGeneratedFiles([]);
                localStorage.removeItem('echo_generated_files');
                alert("Generation history cleared.");
              }}
            />
          )}

        </main>

      </div>

      {/* Persistent Bottom Audio Player Bar */}
      <BottomAudioPlayer
        audioUrl={currentAudioUrl}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSeek={handleSeek}
        currentTime={currentTime}
        duration={duration}
        trackTitle={activeTrackTitle}
        voiceName={activeVoiceName}
        onDownload={handleDownloadActiveTrack}
      />

    </div>
  );
}
