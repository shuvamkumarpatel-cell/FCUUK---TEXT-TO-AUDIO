import { GoogleGenAI, Modality, Type } from "@google/genai";
import { VoiceName, Tone, MusicScore } from "../types";
import { base64ToUint8Array, pcmToWav, synthesizeMusic } from "../utils/audio";

const getToneInstruction = (tone: Tone, text: string): string => {
  switch (tone) {
    case Tone.Happy:
      return `Say cheerfully: ${text}`;
    case Tone.Angry:
      return `Say in an angry tone: ${text}`;
    case Tone.Sad:
      return `Say in a sad, melancholic voice: ${text}`;
    case Tone.Scary:
      return `Say in a spooky, scary voice: ${text}`;
    case Tone.Normal:
    default:
      return text;
  }
};

export const generateSpeech = async (text: string, voice: VoiceName, tone: Tone): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = getToneInstruction(tone, text);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini.");
    }

    const pcmData = base64ToUint8Array(base64Audio);
    const wavBlob = pcmToWav(pcmData);
    
    return URL.createObjectURL(wavBlob);
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};

export const generateBackgroundMusic = async (text: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prompt to design a music score based on the text
  const prompt = `
    Analyze the sentiment and mood of the following text: "${text.substring(0, 500)}...". 
    Compose a simple, ambient background music score that fits this mood. 
    Return a JSON object containing a list of notes.
    The music should be slow, atmospheric, and loopable.
    Total duration should be around 15 seconds (we will loop it).
    Use frequencies in Hz (e.g. 261.63 for Middle C).
    Keep it simple with Sine or Triangle waves.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tempo: { type: Type.NUMBER },
            totalDuration: { type: Type.NUMBER },
            notes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  freq: { type: Type.NUMBER },
                  duration: { type: Type.NUMBER },
                  startTime: { type: Type.NUMBER },
                  type: { type: Type.STRING, enum: ['sine', 'triangle', 'square', 'sawtooth'] }
                }
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No music score generated.");
    
    const score: MusicScore = JSON.parse(jsonText);
    const wavBlob = await synthesizeMusic(score);
    return URL.createObjectURL(wavBlob);

  } catch (error) {
    console.error("Music Generation Error:", error);
    throw error;
  }
};
