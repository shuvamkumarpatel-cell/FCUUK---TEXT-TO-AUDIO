export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export enum Tone {
  Normal = 'Normal',
  Happy = 'Happy',
  Angry = 'Angry',
  Sad = 'Sad',
  Scary = 'Scary',
}

export interface PlaybackState {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  speed: number;
}

export interface AudioGenerationState {
  isLoading: boolean;
  error: string | null;
  audioUrl: string | null;
}

export interface Note {
  freq: number;      // Frequency in Hz
  duration: number;  // Duration in seconds
  startTime: number; // Start time in seconds
  type: 'sine' | 'triangle' | 'square' | 'sawtooth';
}

export interface MusicScore {
  notes: Note[];
  totalDuration: number;
  tempo: number;
}
