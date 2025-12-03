import React, { useState } from 'react';
import { VoiceName, Tone } from './types';
import { generateSpeech, generateBackgroundMusic } from './services/gemini';
import AudioPlayer from './components/AudioPlayer';
import { SpeakerIcon, WandIcon } from './components/Icons';

const App: React.FC = () => {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Puck);
  const [selectedTone, setSelectedTone] = useState<Tone>(Tone.Normal);
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    setAudioUrl(null);
    setMusicUrl(null);

    try {
      const url = await generateSpeech(text, selectedVoice, selectedTone);
      setAudioUrl(url);
    } catch (err: any) {
      setError(err.message || "Failed to generate audio. Please check your API key.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMusic = async () => {
    if (!audioUrl || !text) return;
    
    setIsGeneratingMusic(true);
    try {
      const url = await generateBackgroundMusic(text);
      setMusicUrl(url);
    } catch (err: any) {
      console.error(err);
      // Optional: show a toast or error specific to music, but we'll just log it to keep UI clean or reuse error state
      setError("Failed to generate background music. Try again.");
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    setAudioUrl(null);
    setMusicUrl(null);
    setText('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
             <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/50">
                <SpeakerIcon />
             </div>
             <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
               SonicFlow AI
             </h1>
          </div>
          <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
            Transform text into lifelike speech. Control tone, time and speed with precision.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 md:p-8 shadow-2xl">
          
          {!audioUrl ? (
            <div className="space-y-6 animate-fade-in-up">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Voice Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">Voice</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2">
                    {Object.values(VoiceName).map((voice) => (
                      <button
                        key={voice}
                        onClick={() => setSelectedVoice(voice)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                          selectedVoice === voice
                            ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/50'
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {voice}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">Tone</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2">
                    {Object.values(Tone).map((tone) => (
                      <button
                        key={tone}
                        onClick={() => setSelectedTone(tone)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                          selectedTone === tone
                            ? 'bg-teal-600 border-teal-500 text-white shadow-md shadow-teal-900/50'
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Text Input */}
              <div className="space-y-2">
                <label htmlFor="text-input" className="block text-sm font-medium text-slate-300">
                  Script
                </label>
                <textarea
                  id="text-input"
                  rows={6}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter the text you want to hear..."
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-100 placeholder-slate-500 resize-none transition-all"
                />
                <div className="text-right text-xs text-slate-500">
                  {text.length} chars
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isLoading || !text.trim()}
                className={`w-full py-4 rounded-xl text-lg font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                  isLoading || !text.trim()
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-blue-900/30 hover:shadow-blue-900/50 transform hover:-translate-y-0.5'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Synthesizing...
                  </>
                ) : (
                  'Generate Audio'
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-200 text-sm">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="animate-fade-in space-y-4">
              <div className="flex justify-between items-start">
                 <div>
                   <h2 className="text-xl font-semibold text-white mb-1">Audio Ready</h2>
                   <p className="text-slate-400 text-sm truncate max-w-[200px] sm:max-w-md">Source: "{text.substring(0, 50)}..."</p>
                 </div>
                 <div className="flex gap-2">
                    <span className="px-2 py-1 rounded bg-blue-900/50 border border-blue-800 text-blue-200 text-xs">{selectedVoice}</span>
                    <span className="px-2 py-1 rounded bg-teal-900/50 border border-teal-800 text-teal-200 text-xs">{selectedTone}</span>
                 </div>
              </div>
              
              <AudioPlayer 
                 audioUrl={audioUrl} 
                 musicUrl={musicUrl}
                 onReset={handleReset} 
              />
              
              {!musicUrl && (
                 <button 
                   onClick={handleGenerateMusic}
                   disabled={isGeneratingMusic}
                   className="w-full py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2 group"
                 >
                   {isGeneratingMusic ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Composing...
                      </>
                   ) : (
                      <>
                        <WandIcon />
                        <span className="group-hover:text-blue-300 transition-colors">Add AI Background Music</span>
                      </>
                   )}
                 </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default App;
