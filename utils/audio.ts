import { MusicScore } from "../types";

/**
 * Decodes a Base64 string into a Uint8Array.
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Wraps raw PCM data in a WAV container (RIFF header).
 */
export const pcmToWav = (pcmData: Uint8Array): Blob => {
  const numChannels = 1;
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples
  const pcmBytes = new Uint8Array(buffer, 44);
  pcmBytes.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
};

/**
 * Converts an AudioBuffer to a WAV Blob.
 */
export const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const resultLength = buffer.length * numChannels * 2 + 44;
  const resultBuffer = new ArrayBuffer(resultLength);
  const view = new DataView(resultBuffer);
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + buffer.length * numChannels * 2, true);
  writeString(view, 8, 'WAVE');
  
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, bitDepth, true);
  
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, buffer.length * numChannels * 2, true);
  
  // Write interleaved samples
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i];
      // Clamp and scale to 16-bit integer
      const s = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }
  
  return new Blob([resultBuffer], { type: 'audio/wav' });
};

/**
 * Synthesizes music from a MusicScore using the Web Audio API.
 */
export const synthesizeMusic = async (score: MusicScore): Promise<Blob> => {
  const sampleRate = 44100;
  // Ensure the duration is long enough for at least one loop or the defined duration
  const duration = Math.max(score.totalDuration, 10); 
  const offlineCtx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);

  score.notes.forEach(note => {
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    
    osc.type = note.type;
    osc.frequency.value = note.freq;
    
    // Envelope for ambient feel (long attack, long release)
    const attack = 0.5;
    const release = 1.0;
    
    gain.gain.setValueAtTime(0, note.startTime);
    gain.gain.linearRampToValueAtTime(0.2, note.startTime + attack); // Low volume for ambient
    gain.gain.linearRampToValueAtTime(0.2, note.startTime + note.duration - release);
    gain.gain.linearRampToValueAtTime(0, note.startTime + note.duration);
    
    osc.connect(gain);
    gain.connect(offlineCtx.destination);
    
    osc.start(note.startTime);
    osc.stop(note.startTime + note.duration);
  });

  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWav(renderedBuffer);
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

/**
 * Helper to fetch and decode audio from a blob URL
 */
export const fetchAudioBuffer = async (url: string, context: BaseAudioContext): Promise<AudioBuffer> => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await context.decodeAudioData(arrayBuffer);
};

/**
 * Renders the final audio mix (speech + music) at the specific speed.
 * This physically resamples the audio to match the new duration.
 */
export const renderEnhancedAudio = async (
  speechUrl: string,
  musicUrl: string | null,
  speed: number,
  musicVolume: number
): Promise<Blob> => {
  // Use a temporary context to decode
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const speechBuffer = await fetchAudioBuffer(speechUrl, tempCtx);
  let musicBuffer: AudioBuffer | null = null;
  if (musicUrl) {
    musicBuffer = await fetchAudioBuffer(musicUrl, tempCtx);
  }

  // Calculate new total duration based on speed
  const originalDuration = speechBuffer.duration;
  const newDuration = originalDuration / speed;
  const sampleRate = 44100;

  // Create Offline Context
  const offlineCtx = new OfflineAudioContext(2, newDuration * sampleRate, sampleRate);

  // 1. Setup Speech Source
  const speechSource = offlineCtx.createBufferSource();
  speechSource.buffer = speechBuffer;
  speechSource.playbackRate.value = speed;
  speechSource.connect(offlineCtx.destination);
  speechSource.start(0);

  // 2. Setup Music Source (if exists)
  if (musicBuffer) {
    const musicSource = offlineCtx.createBufferSource();
    const musicGain = offlineCtx.createGain();
    
    musicSource.buffer = musicBuffer;
    musicSource.loop = true;
    musicSource.playbackRate.value = speed; // Sync pitch/speed with speech
    
    musicGain.gain.value = musicVolume;
    
    musicSource.connect(musicGain);
    musicGain.connect(offlineCtx.destination);
    musicSource.start(0);
  }

  // Render
  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWav(renderedBuffer);
};