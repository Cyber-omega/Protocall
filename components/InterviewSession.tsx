
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { InterviewSessionConfig, TranscriptionTurn } from '../types';
import { GEMINI_MODEL, Icons } from '../constants';
import { createPcmBlob, decode, decodeAudioData } from '../services/audioUtils';

interface InterviewSessionProps {
  config: InterviewSessionConfig;
  onComplete: (history: TranscriptionTurn[], duration: string) => void;
}

const FRAME_RATE = 1; 
const JPEG_QUALITY = 0.6;

const updateVisualFeedbackDeclaration: FunctionDeclaration = {
  name: 'updateVisualFeedback',
  parameters: {
    type: Type.OBJECT,
    description: 'Update the subtle UI feedback based on the candidates visual cues like eye contact, confidence, and posture.',
    properties: {
      cue: {
        type: Type.STRING,
        description: 'A short, encouraging, or constructive visual feedback phrase',
      },
      sentiment: {
        type: Type.STRING,
        description: 'The sentiment of the feedback: "positive", "neutral", or "constructive".',
      }
    },
    required: ['cue', 'sentiment'],
  },
};

export const InterviewSession: React.FC<InterviewSessionProps> = ({ config, onComplete }) => {
  const [isReady, setIsReady] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState<TranscriptionTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  
  const [visualFeedback, setVisualFeedback] = useState<{ cue: string; sentiment: string } | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptionRef = useRef<{ user: string; model: string }>({ user: '', model: '' });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const isMutedRef = useRef(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Session Timer Logic
  useEffect(() => {
    if (isReady && isListening) {
      timerIntervalRef.current = window.setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isReady, isListening]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  };

  const cleanup = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.input.close();
      audioContextRef.current.output.close();
      audioContextRef.current = null;
    }
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsReady(false);
    setIsListening(false);
  }, []);

  const handleFinish = () => {
    onComplete(currentTranscript, formatTime(secondsElapsed));
  };

  const initializeSession = useCallback(async () => {
    cleanup();
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      audioContextRef.current = {
        input: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }),
        output: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }),
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 1280, height: 720 } });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const sessionPromise = ai.live.connect({
        model: GEMINI_MODEL,
        callbacks: {
          onopen: () => {
            setIsReady(true);
            setIsListening(true);
            
            const source = audioContextRef.current!.input.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.input.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (isMutedRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then((s) => {
                s.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.input.destination);

            frameIntervalRef.current = window.setInterval(() => {
              if (videoRef.current && canvasRef.current && sessionRef.current) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  canvas.toBlob(async (blob) => {
                    if (blob) {
                      const base64Data = await blobToBase64(blob);
                      sessionPromise.then((s) => {
                        s.sendRealtimeInput({
                          media: { data: base64Data, mimeType: 'image/jpeg' }
                        });
                      });
                    }
                  }, 'image/jpeg', JPEG_QUALITY);
                }
              }
            }, 1000 / FRAME_RATE);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (!audioContextRef.current) return;
            const outCtx = audioContextRef.current.output;

            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'updateVisualFeedback') {
                  const { cue, sentiment } = fc.args as { cue: string; sentiment: string };
                  setVisualFeedback({ cue, sentiment });
                  if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
                  feedbackTimeoutRef.current = window.setTimeout(() => setVisualFeedback(null), 5000);
                  sessionPromise.then((s) => {
                    s.sendToolResponse({
                      functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } }
                    });
                  });
                }
              }
            }

            if (msg.serverContent?.outputTranscription) {
              transcriptionRef.current.model += msg.serverContent.outputTranscription.text;
            } else if (msg.serverContent?.inputTranscription) {
              transcriptionRef.current.user += msg.serverContent.inputTranscription.text;
            }

            if (msg.serverContent?.turnComplete) {
              const userTurn = transcriptionRef.current.user.trim();
              const modelTurn = transcriptionRef.current.model.trim();
              if (userTurn || modelTurn) {
                setCurrentTranscript(prev => [
                  ...prev,
                  ...(userTurn ? [{ role: 'user', text: userTurn } as const] : []),
                  ...(modelTurn ? [{ role: 'interviewer', text: modelTurn } as const] : [])
                ]);
              }
              transcriptionRef.current = { user: '', model: '' };
            }

            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = audioBuffer;
              const gainNode = outCtx.createGain();
              source.connect(gainNode).connect(outCtx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: any) => {
            const errorMsg = e?.message || 'Network sync failed';
            setError(`Protocall Link Failed: ${errorMsg}`);
            setIsListening(false);
          },
          onclose: () => setIsListening(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [updateVisualFeedbackDeclaration] }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `
            You are "Protocall", a high-end AI interviewer for a ${config.difficulty} ${config.role} position.
            Your role is to conduct a voice-driven, multimodal interview.
            
            GUIDELINES:
            1. Use natural, conversational speech.
            2. Analyze camera input for facial cues and update the UI via "updateVisualFeedback".
            3. Conduct a realistic follow-up based on candidate answers.
            4. Be fair but maintain standard corporate interview rigor.
          `
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      setError(`Hardware Sync Error: ${err.message}`);
    }
  }, [config, cleanup]);

  useEffect(() => {
    initializeSession();
    return cleanup;
  }, [initializeSession, cleanup]);

  return (
    <div className="flex flex-col h-[85vh] max-w-6xl mx-auto glass rounded-[3rem] shadow-2xl overflow-hidden border border-white/10">
      {/* Header with Timer */}
      <div className="bg-p-deep dark:bg-p-teal/20 backdrop-blur-md px-8 py-5 flex justify-between items-center border-b border-white/10">
        <div className="flex items-center gap-6">
          <div className="flex gap-1.5 items-center">
            <div className={`w-3 h-3 rounded-full ${isListening ? (isMuted ? 'bg-p-gold' : 'bg-green-400 animate-pulse') : 'bg-red-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">
              {isMuted ? 'Muted' : isListening ? 'Session Live' : 'Paused'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 glass px-4 py-1.5 rounded-xl border border-white/5">
            <div className="w-2 h-2 rounded-full bg-p-teal animate-pulse" />
            <span className="font-mono text-sm font-black text-p-pale tabular-nums">
              {formatTime(secondsElapsed)}
            </span>
          </div>

          <div className="h-6 w-[1px] bg-white/10" />
          <span className="text-white font-bold tracking-tight opacity-60 text-xs uppercase tracking-widest">{config.role}</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              isMuted ? 'bg-p-gold text-p-deep' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isMuted ? <Icons.MicrophoneSlash className="w-4 h-4" /> : <Icons.Microphone className="w-4 h-4" />}
            {isMuted ? "Unmute" : "Mute"}
          </button>
          
          <button
            onClick={handleFinish}
            className="bg-white text-p-deep px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-p-gold transition-colors"
          >
            Finish & Report
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row p-8 gap-8 overflow-hidden">
        {/* Visual Engine */}
        <div className="flex-1 flex flex-col space-y-8 overflow-hidden">
          <div className="relative aspect-video glass rounded-[2.5rem] overflow-hidden shadow-2xl group border border-white/5">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Subtle Visual Feedback Overlay */}
            {visualFeedback && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in duration-500 pointer-events-none z-10">
                <div className={`px-8 py-4 glass backdrop-blur-2xl rounded-2xl border flex items-center gap-4 shadow-2xl transition-all ${
                  visualFeedback.sentiment === 'positive' ? 'border-green-500/30 text-green-100' :
                  visualFeedback.sentiment === 'constructive' ? 'border-p-gold/50 text-p-gold' :
                  'border-p-teal/30 text-p-pale'
                }`}>
                  <span className="text-lg font-black tracking-tight uppercase">{visualFeedback.cue}</span>
                </div>
              </div>
            )}
            
            <div className="absolute top-6 left-6 flex flex-col gap-2">
              <span className="px-3 py-1.5 glass rounded-lg text-[10px] font-black text-white flex items-center gap-2 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" /> Real-time Feed
              </span>
            </div>
          </div>

          <div className="p-8 glass rounded-3xl flex items-center justify-between border border-white/5">
             <div className="flex items-center gap-6">
                <div className={`p-5 rounded-2xl transition-all shadow-xl ${isMuted ? 'bg-p-gold/20 text-p-gold' : 'bg-p-teal text-white animate-pulse'}`}>
                  {isMuted ? <Icons.MicrophoneSlash className="w-10 h-10" /> : <Icons.Microphone className="w-10 h-10" />}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">AI VOICE SENSING</h3>
                  <p className="text-sm font-medium opacity-60">Speech recognition and visual cues are synchronized.</p>
                </div>
             </div>
             {error && <div className="text-red-400 text-xs font-bold uppercase tracking-widest">{error}</div>}
          </div>
        </div>

        {/* Intelligence Log (Live Transcription) */}
        <div className="w-full md:w-[400px] glass rounded-[2.5rem] p-6 flex flex-col overflow-hidden border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-p-teal">Live Transcription</h4>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-p-teal/50">SYNCING</span>
               <div className="w-2 h-2 bg-p-teal rounded-full animate-pulse" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 font-mono scroll-smooth">
             {currentTranscript.map((t, i) => (
               <div key={i} className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className={`text-[9px] font-black mb-1 uppercase tracking-widest opacity-40 ${t.role === 'user' ? 'text-p-gold' : 'text-p-teal'}`}>
                    {t.role === 'user' ? 'Candidate' : 'Interviewer'}
                  </span>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${t.role === 'user' ? 'bg-p-gold/10 text-p-gold border border-p-gold/20' : 'bg-p-teal/10 text-p-teal border border-p-teal/20'}`}>
                    {t.text}
                  </div>
               </div>
             ))}
             {!currentTranscript.length && (
               <div className="flex flex-col items-center justify-center mt-20 opacity-20">
                 <Icons.Sparkles className="w-12 h-12 mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-center">Neural Voice Interface Active</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
