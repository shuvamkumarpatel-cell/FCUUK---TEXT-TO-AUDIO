import React, { useRef, useEffect, useState } from 'react';
import { PlayIcon, PauseIcon, RefreshIcon, DownloadIcon, MusicIcon } from './Icons';
import { renderEnhancedAudio } from '../utils/audio';

interface AudioPlayerProps {
  audioUrl: string | null;
  musicUrl: string | null;
  onReset: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, musicUrl, onReset }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [musicVolume, setMusicVolume] = useState(0.3); // Default low volume for background
  const [isProcessingDownload, setIsProcessingDownload] = useState(false);

  // Sync audio events with state (Speech is the master clock)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => {
      setIsPlaying(false);
      // Stop music when speech ends
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.currentTime = 0;
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  // Handle Play/Pause for both tracks
  useEffect(() => {
    const audio = audioRef.current;
    const music = musicRef.current;

    if (audio) {
      if (isPlaying) {
        audio.play().catch(e => console.error("Audio play failed", e));
        if (music) music.play().catch(e => console.error("Music play failed", e));
      } else {
        audio.pause();
        if (music) music.pause();
      }
    }
  }, [isPlaying, audioUrl, musicUrl]);

  // Sync playback rate
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
    if (musicRef.current) musicRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Sync Music Volume
  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = musicVolume;
    }
  }, [musicVolume, musicUrl]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    
    // Sync music logic handled by loop, but we could enforce strict sync here if needed.
  };

  const handleFinalDownload = async () => {
    if (!audioUrl) return;
    setIsProcessingDownload(true);

    try {
      // Process the audio offline with current speed and volume settings
      const finalBlob = await renderEnhancedAudio(audioUrl, musicUrl, playbackRate, musicVolume);
      const finalUrl = URL.createObjectURL(finalBlob);

      const link = document.createElement('a');
      link.href = finalUrl;
      link.download = `sonicflow-final-${Date.now()}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      setTimeout(() => URL.revokeObjectURL(finalUrl), 1000);
    } catch (error) {
      console.error("Failed to process final audio download", error);
      alert("Could not process audio for download.");
    } finally {
      setIsProcessingDownload(false);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const effectiveTime = time / playbackRate;
    const minutes = Math.floor(effectiveTime / 60);
    const seconds = Math.floor(effectiveTime % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) return null;

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700 w-full animate-fade-in">
      <audio ref={audioRef} src={audioUrl} className="hidden" />
      {musicUrl && <audio ref={musicRef} src={musicUrl} loop className="hidden" />}

      <div className="flex flex-col gap-6">
        
        {/* Timeline Control */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
          />
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between">
          
          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="w-14 h-14 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          {/* Speed Control */}
          <div className="flex flex-col items-center gap-2 flex-1 mx-4 sm:mx-8">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Playback Speed
            </span>
            <div className="flex items-center gap-4 w-full">
              <span className="text-xs text-slate-500 w-8 text-right">0.5x</span>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={playbackRate}
                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-slate-500 w-8 text-left">3.0x</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button 
              onClick={onReset}
              className="p-3 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="New Project"
            >
              <RefreshIcon />
            </button>
          </div>
        </div>

        {/* Music Volume Control (Only visible if music exists) */}
        {musicUrl && (
          <div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
            <div className="text-slate-400">
               <MusicIcon />
            </div>
            <div className="flex-1 flex flex-col">
               <span className="text-xs text-slate-400 font-semibold mb-1">Background Music Volume</span>
               <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={musicVolume} 
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-teal-500"
               />
            </div>
             <span className="text-xs font-mono text-slate-500 w-8 text-right">{(musicVolume * 100).toFixed(0)}%</span>
          </div>
        )}
        
        {/* Final Download Button */}
        <button
          onClick={handleFinalDownload}
          disabled={isProcessingDownload}
          className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold shadow-lg shadow-emerald-900/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
        >
          {isProcessingDownload ? (
             <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Audio...
             </>
          ) : (
             <>
               <DownloadIcon />
               Save Final Audio (Mix & Speed Applied)
             </>
          )}
        </button>

      </div>
    </div>
  );
};

export default AudioPlayer;