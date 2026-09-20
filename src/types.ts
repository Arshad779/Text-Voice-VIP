export type VoiceGender = 'male' | 'female' | 'neutral';

export type VoiceCategory = 
  | 'American Female'
  | 'American Male'
  | 'Chinese Female'
  | 'Chinese Male'
  | 'Spanish Female'
  | 'Spanish Male'
  | 'French Female'
  | 'Hindi Female'
  | 'Hindi Male'
  | 'Italian Female'
  | 'Italian Male'
  | 'Portuguese Female'
  | 'Portuguese Male'
  | 'British Male' 
  | 'British Female' 
  | 'Indian Male' 
  | 'Indian Female' 
  | 'Urdu Male' 
  | 'Urdu Female' 
  | 'Arabic' 
  | 'Russian' 
  | 'Cloned'
  | string;

export interface ClonedVoice {
  id: string;
  name: string;
  isPreset?: boolean;
  accent: string;
  flag: string;
  gender: VoiceGender;
  language: string;
  tag: string;
  category?: VoiceCategory;
  neuralModel?: string;
  pitch: 'low' | 'medium-low' | 'medium' | 'medium-high' | 'high';
  speed: 'slow' | 'moderate' | 'fast';
  emotion: 'calm' | 'energetic' | 'warm' | 'professional' | 'whispery' | 'cheerful';
  baseVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' | string;
  styleDirective: string;
  description: string;
  createdAt: string;
  sampleAudioUrl?: string;
  audioPath?: string;
  sampleDuration?: number;
  verified?: boolean;
}

export interface AudioGeneration {
  id: string;
  title: string;
  text: string;
  voiceId: string;
  voiceName: string;
  voiceGender: VoiceGender;
  language: string;
  speakingStyle: string;
  audioUrl: string;
  duration: number;
  sampleRate: number;
  createdAt: string;
  isClonedVoice?: boolean;
}

export interface VoiceSettingsState {
  voiceId: string;
  language: string;
  speakingStyle: string;
  speed: number; // e.g. 1.0 (0.5 to 2.0)
  pitch: number; // -10 to +10, 0 default
  volume: number; // 0 to 100, 80 default
  stability: number; // 0 to 100, 75 default
  similarity: number; // 0 to 100, 85 default
  styleStrength: number; // 0 to 100, 50 default
  emotionLevel: 'calm' | 'natural' | 'expressive' | 'authoritative' | 'passionate';
}
