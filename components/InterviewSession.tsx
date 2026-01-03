
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
const JPEG_QUALITY = 0.5;

const updateVisualFeedbackDeclaration: FunctionDeclaration = {
  name: 'updateVisualFeedback',
  parameters: {
    type: Type.OBJECT,
    description: 'Provide immediate professional UI feedback based on candidate visual cues and tonality.',
    properties: {
      cue: {
        type: Type.STRING,
        description: 'A short observation (e.g., "Excellent posture", "Confident vocal tone")',
      },
      sentiment: {
        type: Type.STRING,
        description: 'Visual sentiment: "positive", "neutral", or "constructive".',
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
  const [partialTranscript, setPartialTranscript] = useState<{ user: string; model: string }>({ user: '', model: '' });
  const [error, setError] = useState<string | null>(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  
  const [visualFeedback, setVisualFeedback] = useState<{ cue: string; sentiment: string } | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll effect
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current;
      // Use requestAnimationFrame to ensure DOM is updated before scrolling
      requestAnimationFrame(() => {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  }, [currentTranscript, partialTranscript]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

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
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.input.close(); } catch(e) {}
      try { audioContextRef.current.output.close(); } catch(e) {}
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
    
    if (!process.env.API_KEY) {
      setError("API Key Missing");
      return;
    }
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      audioContextRef.current = { input: inCtx, output: outCtx };

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true }, 
        video: { width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const sessionPromise = ai.live.connect({
        model: GEMINI_MODEL,
        callbacks: {
          onopen: () => {
            setIsReady(true);
            setIsListening(true);
            inCtx.resume();
            outCtx.resume();

            const source = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMutedRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob })).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);

            frameIntervalRef.current = window.setInterval(() => {
              if (videoRef.current && canvasRef.current && sessionRef.current) {
                const canvas = canvasRef.current;
                const video = videoRef.current;
                const ctx = canvas.getContext('2d');
                if (ctx && video.videoWidth) {
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  ctx.drawImage(video, 0, 0);
                  canvas.toBlob(async (blob) => {
                    if (blob) {
                      const base64Data = await blobToBase64(blob);
                      sessionPromise.then(s => s.sendRealtimeInput({
                        media: { data: base64Data, mimeType: 'image/jpeg' }
                      })).catch(() => {});
                    }
                  }, 'image/jpeg', JPEG_QUALITY);
                }
              }
            }, 1000 / FRAME_RATE);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (!audioContextRef.current) return;

            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'updateVisualFeedback') {
                  const args = fc.args as { cue: string, sentiment: string };
                  setVisualFeedback(args);
                  if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
                  feedbackTimeoutRef.current = window.setTimeout(() => setVisualFeedback(null), 4000);
                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } }
                  })).catch(() => {});
                }
              }
            }

            if (msg.serverContent?.outputTranscription) {
              transcriptionRef.current.model += msg.serverContent.outputTranscription.text;
              setPartialTranscript(prev => ({ ...prev, model: transcriptionRef.current.model }));
            } else if (msg.serverContent?.inputTranscription) {
              transcriptionRef.current.user += msg.serverContent.inputTranscription.text;
              setPartialTranscript(prev => ({ ...prev, user: transcriptionRef.current.user }));
            }

            if (msg.serverContent?.turnComplete) {
              const uText = transcriptionRef.current.user.trim();
              const mText = transcriptionRef.current.model.trim();
              if (uText || mText) {
                setCurrentTranscript(prev => [
                  ...prev,
                  ...(uText ? [{ role: 'user', text: uText } as const] : []),
                  ...(mText ? [{ role: 'interviewer', text: mText } as const] : [])
                ]);
              }
              transcriptionRef.current = { user: '', model: '' };
              setPartialTranscript({ user: '', model: '' });
            }

            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = audioContextRef.current.output;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setPartialTranscript(prev => ({ ...prev, model: '' }));
              transcriptionRef.current.model = '';
            }
          },
          onerror: (e: any) => {
            setError(`Protocall Sync Error: ${e.message || 'Link failed'}`);
            setIsListening(false);
          },
          onclose: (e: any) => {
            if (e && e.reason?.includes("not found")) {
              setError("Session Project Invalid. Re-select API Key.");
            }
            setIsListening(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [updateVisualFeedbackDeclaration] }],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `
            You are "Protocall", an elite executive interviewer for a ${config.difficulty} ${config.role} position${config.company ? ` at ${config.company}` : ''}.
            
            CORE MISSION:
            You are here to conduct a high-stakes interview. You must lead the conversation.
            
            OPERATIONAL PROTOCOL:
            1. BE PROACTIVE: Start the interview immediately. Greet the candidate and ask the first question. Do not wait for them to speak first.
            2. ASK QUESTIONS: You are the interviewer. Your main job is to ask challenging, insightful questions focused on: ${config.focus.join(', ')}.
            3. DYNAMIC PROBING: If the candidate gives a short answer, probe deeper. Ask "Why?", "How?", or "Can you provide an example?".
            4. VISUAL AWARENESS: Use "updateVisualFeedback" to comment on their confidence and body language.
            5. ONE AT A TIME: Ask one clear question at a time to keep the candidate focused.
            6. ADAPT: Listen to their answers and tailor follow-up questions to their specific experience mentioned.
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

  const renderSentences = (text: string, isActive: boolean, role: 'user' | 'model') => {
    if (!text) return null;
    // Improved regex to handle common abbreviations but split on end-marks
    const sentences = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
    
    return sentences.map((s, idx) => {
      const isLatest = idx === sentences.length - 1;
      const highlightClass = isLatest && isActive
        ? (role === 'model' ? 'text-white font-extrabold scale-[1.02] inline-block' : 'text-p-gold font-extrabold scale-[1.02] inline-block')
        : 'opacity-70';

      return (
        <span 
          key={idx} 
          className={`transition-all duration-300 transform-gpu ${highlightClass}`}
        >
          {s}
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col h-[85vh] max-w-6xl mx-auto glass rounded-[3rem] shadow-2xl overflow-hidden border border-white/10">
      <div className="bg-p-deep dark:bg-p-teal/20 backdrop-blur-md px-8 py-5 flex justify-between items-center border-b border-white/10">
        <div className="flex items-center gap-6">
          <div className="flex gap-1.5 items-center">
            <div className={`w-3 h-3 rounded-full ${isListening ? (isMuted ? 'bg-p-gold' : 'bg-green-400 animate-pulse') : 'bg-red-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">
              {isMuted ? 'Muted' : isListening ? 'Session Live' : 'Paused'}
            </span>
          </div>
          <div className="flex items-center gap-2 glass px-4 py-1.5 rounded-xl border border-white/5">
            <span className="font-mono text-sm font-black text-p-pale tabular-nums">{formatTime(secondsElapsed)}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsMuted(!isMuted)} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isMuted ? 'bg-p-gold text-p-deep' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            {isMuted ? <Icons.MicrophoneSlash className="w-4 h-4" /> : <Icons.Microphone className="w-4 h-4" />}
            {isMuted ? "Unmute" : "Mute"}
          </button>
          <button onClick={handleFinish} className="bg-white text-p-deep px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-p-gold transition-colors">Finish & Evaluate</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row p-8 gap-8 overflow-hidden">
        <div className="flex-1 flex flex-col space-y-8 overflow-hidden">
          <div className="relative aspect-video glass rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 bg-black/20">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
            <canvas ref={canvasRef} className="hidden" />
            
            {visualFeedback && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-in slide-in-from-bottom-6 fade-in duration-500 z-50">
                <div className={`px-8 py-4 glass backdrop-blur-3xl rounded-3xl border flex items-center gap-4 shadow-2xl transition-all ${
                  visualFeedback.sentiment === 'positive' ? 'border-green-500/30 text-green-100 bg-green-500/10' :
                  visualFeedback.sentiment === 'constructive' ? 'border-p-gold/50 text-p-gold bg-p-gold/10' :
                  'border-p-teal/30 text-p-pale'
                }`}>
                  <Icons.Sparkles className="w-5 h-5 animate-pulse" />
                  <span className="text-base font-black tracking-tight uppercase leading-none">{visualFeedback.cue}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-8 glass rounded-3xl flex items-center justify-between border border-white/5">
             <div className="flex items-center gap-6">
                <div className={`p-5 rounded-2xl transition-all ${isMuted ? 'bg-p-gold/20 text-p-gold' : 'bg-p-teal text-white shadow-xl animate-pulse'}`}>
                  {isMuted ? <Icons.MicrophoneSlash className="w-10 h-10" /> : <Icons.Microphone className="w-10 h-10" />}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">AI NEURAL SYNC</h3>
                  <p className="text-sm opacity-60 font-medium leading-relaxed">Agent is listening and observing your responses in real-time.</p>
                </div>
             </div>
             {error && (
               <div className="text-red-400 text-[10px] font-black uppercase tracking-widest bg-red-400/10 px-5 py-3 rounded-2xl border border-red-400/20 max-w-[200px] text-center">
                 {error}
               </div>
             )}
          </div>
        </div>

        {/* Enhanced Transcription Log */}
        <div className="w-full md:w-[450px] glass rounded-[2.5rem] p-6 flex flex-col overflow-hidden border border-white/5 bg-white/[0.02] shadow-inner">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-p-teal">Intelligence Sync Log</h4>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full glass border border-p-teal/20">
               <span className="text-[9px] font-bold text-p-teal/80 uppercase">Active</span>
               <div className="w-1.5 h-1.5 bg-p-teal rounded-full animate-pulse" />
            </div>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-8 pr-3 font-mono scroll-smooth pb-10 custom-scrollbar">
             {currentTranscript.map((t, i) => (
               <div key={i} className={`flex flex-col group animate-in fade-in slide-in-from-bottom-2 duration-300 ${t.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-2 mb-2 ${t.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] opacity-40 transition-opacity group-hover:opacity-100 ${t.role === 'user' ? 'text-p-gold' : 'text-p-teal'}`}>
                      {t.role === 'user' ? 'Candidate' : 'Protocall Agent'}
                    </span>
                  </div>
                  <div className={`p-5 rounded-[1.5rem] text-[13px] leading-relaxed max-w-[90%] shadow-lg border transition-all hover:scale-[1.01] ${
                    t.role === 'user' 
                      ? 'bg-p-gold/10 text-p-gold border-p-gold/20 rounded-tr-none' 
                      : 'bg-p-teal/10 text-p-teal border-p-teal/20 rounded-tl-none'
                  }`}>
                    {t.text}
                  </div>
               </div>
             ))}
             
             {/* Dynamic Partial Transcription with active indicators */}
             {(partialTranscript.user || partialTranscript.model) && (
               <div className="space-y-6">
                 {partialTranscript.user && (
                   <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2 mb-2 flex-row-reverse">
                         <span className="text-[8px] font-black uppercase tracking-widest text-p-gold animate-pulse">Candidate Speaking</span>
                         <div className="flex gap-1 h-3 items-end">
                            <div className="w-0.5 bg-p-gold/60 animate-[vibrate_0.5s_infinite]" style={{height: '40%'}} />
                            <div className="w-0.5 bg-p-gold animate-[vibrate_0.3s_infinite]" style={{height: '100%'}} />
                            <div className="w-0.5 bg-p-gold/60 animate-[vibrate_0.7s_infinite]" style={{height: '60%'}} />
                         </div>
                      </div>
                      <div className="p-5 rounded-[1.5rem] rounded-tr-none text-[13px] leading-relaxed bg-p-gold/5 text-p-gold/80 border border-p-gold/10 italic shadow-[0_0_20px_rgba(165,141,102,0.05)]">
                        {renderSentences(partialTranscript.user, true, 'user')}
                      </div>
                   </div>
                 )}
                 {partialTranscript.model && (
                   <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2 mb-2">
                         <span className="text-[8px] font-black uppercase tracking-widest text-p-teal animate-pulse">Protocall Responding</span>
                         <div className="flex gap-1 h-3 items-end">
                            <div className="w-0.5 bg-p-teal/60 animate-[vibrate_0.4s_infinite]" style={{height: '70%'}} />
                            <div className="w-0.5 bg-p-teal animate-[vibrate_0.6s_infinite]" style={{height: '100%'}} />
                            <div className="w-0.5 bg-p-teal/60 animate-[vibrate_0.5s_infinite]" style={{height: '50%'}} />
                         </div>
                      </div>
                      <div className="p-5 rounded-[1.5rem] rounded-tl-none text-[13px] leading-relaxed bg-p-teal/20 text-p-teal border border-p-teal/30 shadow-[0_0_30px_rgba(64,126,134,0.15)] ring-1 ring-p-teal/20">
                        {renderSentences(partialTranscript.model, true, 'model')}
                      </div>
                   </div>
                 )}
               </div>
             )}

             {!currentTranscript.length && !partialTranscript.user && !partialTranscript.model && (
               <div className="flex flex-col items-center justify-center py-20 opacity-20 animate-pulse">
                 <Icons.Sparkles className="w-12 h-12 mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-[0.5em] text-center">Neural Interface Ready</p>
                 <p className="text-[8px] font-bold mt-2">AGENT WILL COMMENCE SHORTLY</p>
               </div>
             )}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes vibrate {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(64, 126, 134, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
};
