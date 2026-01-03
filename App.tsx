
import React, { useState, useEffect } from 'react';
import { AppState, InterviewStatus, InterviewSessionConfig, TranscriptionTurn } from './types';
import { ThemeToggle } from './components/ThemeToggle';
import { InterviewSetup } from './components/InterviewSetup';
import { InterviewSession } from './components/InterviewSession';
import { AnalysisReport } from './components/AnalysisReport';
import { generateEvaluation } from './services/analysisService';
import { Icons } from './constants';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    theme: 'dark',
    status: InterviewStatus.IDLE,
    config: null,
    analysis: null,
    history: [],
  });

  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  const handleStartInterview = (config: InterviewSessionConfig) => {
    setState(prev => ({ ...prev, config, status: InterviewStatus.INTERVIEWING }));
  };

  const handleInterviewComplete = async (history: TranscriptionTurn[], duration: string) => {
    if (!state.config) return;
    
    setLoading(true);
    try {
      const evaluation = await generateEvaluation(state.config, history);
      evaluation.duration = duration; // Inject duration into evaluation
      setState(prev => ({
        ...prev,
        history,
        analysis: evaluation,
        status: InterviewStatus.COMPLETED
      }));
    } catch (err) {
      console.error('Evaluation failed:', err);
      alert('Failed to generate evaluation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
          <div className="relative">
            <div className="w-32 h-32 border-4 border-p-teal/20 border-t-p-teal rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
               <Icons.Sparkles className="w-10 h-10 text-p-gold animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-p-deep dark:text-p-white tracking-tight">Synthesizing Report</h2>
            <p className="text-p-teal font-medium mt-2">Analyzing your vocal resonance and visual cues...</p>
          </div>
        </div>
      );
    }

    switch (state.status) {
      case InterviewStatus.IDLE:
        return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-5xl mx-auto space-y-16">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-p-teal dark:text-p-pale text-xs font-bold tracking-[0.2em] uppercase">
                <Icons.Sparkles className="w-4 h-4 text-p-gold" />
                Empowering the next generation
              </div>
              <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-p-deep dark:text-p-white leading-[0.9]">
                P<span className="text-p-teal">R</span>O<span className="text-p-gold">T</span>OCALL
              </h1>
              <p className="text-xl text-p-deep/60 dark:text-p-pale/70 max-w-2xl mx-auto font-medium">
                The ultimate AI-driven mock interview environment. Real-time audio, video expression analysis, and agent-based feedback.
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-6">
              {!hasKey && (
                <button
                  onClick={handleSelectKey}
                  className="px-8 py-3 bg-p-gold text-p-deep rounded-full font-bold shadow-xl hover:brightness-110 transition-all flex items-center gap-2"
                >
                  <Icons.Check className="w-5 h-5" />
                  Configure Session Key
                </button>
              )}
              
              <button
                onClick={() => setState(prev => ({ ...prev, status: InterviewStatus.SETUP }))}
                className="group relative px-12 py-6 bg-p-teal text-white rounded-2xl font-black text-2xl shadow-2xl shadow-p-teal/20 hover:scale-105 transition-all flex items-center gap-4"
              >
                Start Preparation
                <span className="block group-hover:translate-x-2 transition-transform text-p-gold">→</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-12">
              {[
                { label: 'Multimodal Feedback', icon: <Icons.Sparkles />, text: 'Visual & audio behavioral analysis.' },
                { label: 'Agent Reasoning', icon: <Icons.Microphone />, text: 'Adaptive conversation with character depth.' },
                { label: 'Cipher Analytics', icon: <Icons.ChartBar />, text: 'Industry-standard skill score mapping.' },
              ].map((f, i) => (
                <div key={i} className="p-8 glass rounded-3xl text-left space-y-4 group hover:border-p-teal/50 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-p-teal/10 flex items-center justify-center text-p-teal group-hover:bg-p-teal group-hover:text-white transition-all">
                    {f.icon}
                  </div>
                  <h3 className="font-extrabold text-xl">{f.label}</h3>
                  <p className="text-p-deep/60 dark:text-p-pale/60 text-sm leading-relaxed">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case InterviewStatus.SETUP:
        return <InterviewSetup onStart={handleStartInterview} />;
      case InterviewStatus.INTERVIEWING:
        return state.config ? (
          <InterviewSession config={state.config} onComplete={handleInterviewComplete} />
        ) : null;
      case InterviewStatus.COMPLETED:
        return state.analysis ? (
          <AnalysisReport 
            analysis={state.analysis} 
            onReset={() => setState(prev => ({ ...prev, status: InterviewStatus.IDLE, analysis: null, config: null }))} 
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen transition-all flex flex-col relative">
      <nav className="h-20 flex items-center sticky top-0 z-[100] px-8 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setState(prev => ({ ...prev, status: InterviewStatus.IDLE, analysis: null, config: null }))}
          >
            <div className="w-10 h-10 bg-p-teal rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <span className="text-white font-black text-2xl">P</span>
            </div>
            <span className="font-black text-2xl tracking-tighter text-p-deep dark:text-p-white">PROTOCALL</span>
          </div>
          <div className="flex items-center gap-6">
            <ThemeToggle 
              theme={state.theme} 
              setTheme={(t) => setState(prev => ({ ...prev, theme: t }))} 
            />
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        {renderContent()}
      </main>

      <footer className="py-12 text-center">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-bold text-p-teal/50 tracking-widest uppercase">
          <p>© 2025 PROTOCALL SYSTEMS</p>
          <p className="flex items-center gap-2">
            DEVELOPED BY <span className="text-p-gold">CIPHERSQUAD</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
