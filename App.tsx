
import React, { useState, useEffect } from 'react';
import { AppState, InterviewStatus, InterviewSessionConfig, TranscriptionTurn, UserStats } from './types';
import { ThemeToggle } from './components/ThemeToggle';
import { InterviewSetup } from './components/InterviewSetup';
import { InterviewSession } from './components/InterviewSession';
import { AnalysisReport } from './components/AnalysisReport';
import { generateEvaluation } from './services/analysisService';
import { Icons } from './constants';

const INITIAL_STATS: UserStats = {
  totalSessions: 0,
  currentStreak: 0,
  lastSessionDate: null,
  scoreHistory: [],
  averageScore: 0
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    theme: 'dark',
    status: InterviewStatus.IDLE,
    config: null,
    analysis: null,
    history: [],
    stats: INITIAL_STATS
  });

  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState(true);

  // Load stats from local storage on mount
  useEffect(() => {
    const savedStats = localStorage.getItem('protocall_stats');
    if (savedStats) {
      try {
        setState(prev => ({ ...prev, stats: JSON.parse(savedStats) }));
      } catch (e) {
        console.error("Failed to parse saved stats", e);
      }
    }

    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  const updateStats = (newScore: number) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    setState(prev => {
      const oldStats = prev.stats;
      const lastDate = oldStats.lastSessionDate;
      
      let newStreak = oldStats.currentStreak;
      
      if (!lastDate) {
        newStreak = 1;
      } else {
        const lastDateObj = new Date(lastDate);
        const diffTime = Math.abs(now.getTime() - lastDateObj.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
        // If diffDays is 0, same day, streak stays same
      }

      const newHistory = [...oldStats.scoreHistory, newScore];
      const newAverage = Math.round(newHistory.reduce((a, b) => a + b, 0) / newHistory.length);

      const updatedStats: UserStats = {
        totalSessions: oldStats.totalSessions + 1,
        currentStreak: newStreak,
        lastSessionDate: today,
        scoreHistory: newHistory,
        averageScore: newAverage
      };

      localStorage.setItem('protocall_stats', JSON.stringify(updatedStats));
      return { ...prev, stats: updatedStats };
    });
  };

  /**
   * Opens the AI Studio API key selection dialog and assumes success to mitigate race condition.
   */
  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success as per guidelines to avoid race condition
      setHasKey(true);
    }
  };

  const handleStartInterview = (config: InterviewSessionConfig) => {
    setState(prev => ({ ...prev, config, status: InterviewStatus.INTERVIEWING }));
  };

  const handleInterviewComplete = async (history: TranscriptionTurn[], duration: string) => {
    if (!state.config) return;
    
    setLoading(true);
    try {
      const evaluation = await generateEvaluation(state.config, history);
      evaluation.duration = duration;
      
      updateStats(evaluation.overallScore);

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
        const improvement = state.stats.scoreHistory.length > 1 
          ? state.stats.scoreHistory[state.stats.scoreHistory.length - 1] - state.stats.scoreHistory[0]
          : 0;

        return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-6xl mx-auto space-y-16">
            <div className="space-y-6 w-full">
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-p-teal dark:text-p-pale text-xs font-bold tracking-[0.2em] uppercase">
                  <Icons.Sparkles className="w-4 h-4 text-p-gold" />
                  Elite Preparation Interface
                </div>
                {state.stats.totalSessions > 0 && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass bg-p-gold/10 text-p-gold text-xs font-black tracking-[0.2em] uppercase border border-p-gold/20">
                    <div className="w-2 h-2 rounded-full bg-p-gold animate-ping" />
                    {state.stats.currentStreak} Day Streak
                  </div>
                )}
              </div>

              <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter text-p-deep dark:text-p-white leading-[0.8] mb-8">
                P<span className="text-p-teal">R</span>O<span className="text-p-gold">T</span>OCALL
              </h1>
              
              <p className="text-xl text-p-deep/60 dark:text-p-pale/70 max-w-2xl mx-auto font-medium mb-12">
                The ultimate AI-driven mock interview environment. Real-time audio, video expression analysis, and agent-based feedback.
              </p>

              {/* Motivation Hub */}
              {state.stats.totalSessions > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  <div className="glass p-6 rounded-3xl border border-white/5 text-left">
                    <p className="text-[10px] font-black text-p-teal uppercase tracking-widest mb-1">Total Impact</p>
                    <p className="text-3xl font-black text-p-deep dark:text-white">{state.stats.totalSessions}</p>
                    <p className="text-[10px] opacity-40 uppercase font-bold">Sessions</p>
                  </div>
                  <div className="glass p-6 rounded-3xl border border-white/5 text-left">
                    <p className="text-[10px] font-black text-p-gold uppercase tracking-widest mb-1">Current Skill</p>
                    <p className="text-3xl font-black text-p-deep dark:text-white">{state.stats.averageScore}</p>
                    <p className="text-[10px] opacity-40 uppercase font-bold">Avg Score</p>
                  </div>
                  <div className="glass p-6 rounded-3xl border border-white/5 text-left relative overflow-hidden">
                    <p className="text-[10px] font-black text-p-teal uppercase tracking-widest mb-1">Improvement</p>
                    <p className="text-3xl font-black text-p-deep dark:text-white">
                      {improvement >= 0 ? '+' : ''}{improvement}
                    </p>
                    <p className="text-[10px] opacity-40 uppercase font-bold">Pts Growth</p>
                    <div className="absolute -right-2 -bottom-2 opacity-10">
                      <Icons.ChartBar className="w-12 h-12" />
                    </div>
                  </div>
                  <div className="glass p-6 rounded-3xl border border-p-gold/20 text-left bg-p-gold/5 group">
                    <p className="text-[10px] font-black text-p-gold uppercase tracking-widest mb-1">Commitment</p>
                    <div className="flex items-end gap-1">
                      <p className="text-3xl font-black text-p-deep dark:text-white">{state.stats.currentStreak}</p>
                      <Icons.Sparkles className="w-5 h-5 text-p-gold mb-1 group-hover:scale-125 transition-transform" />
                    </div>
                    <p className="text-[10px] opacity-40 uppercase font-bold">Day Streak</p>
                  </div>
                </div>
              )}
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
                className="group relative px-12 py-6 bg-p-teal text-white rounded-2xl font-black text-2xl shadow-2xl shadow-p-teal/20 hover:scale-105 transition-all flex items-center gap-4 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {state.stats.totalSessions > 0 ? 'Resume Training' : 'Start Preparation'}
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
          <div className="flex items-center gap-6">
             <p className="flex items-center gap-2">
               STREAK: <span className="text-p-gold">{state.stats.currentStreak}D</span>
             </p>
             <div className="h-4 w-[1px] bg-white/10" />
             <p className="flex items-center gap-2">
               DEVELOPED BY <span className="text-p-gold">CIPHERSQUAD</span>
             </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
