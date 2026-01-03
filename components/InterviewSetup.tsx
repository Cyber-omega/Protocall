
import React, { useState } from 'react';
import { InterviewSessionConfig } from '../types';
import { Icons } from '../constants';

interface InterviewSetupProps {
  onStart: (config: InterviewSessionConfig) => void;
}

export const InterviewSetup: React.FC<InterviewSetupProps> = ({ onStart }) => {
  const [role, setRole] = useState('Frontend Engineer');
  const [company, setCompany] = useState('');
  const [difficulty, setDifficulty] = useState<InterviewSessionConfig['difficulty']>('Mid-Level');
  const [focus, setFocus] = useState<string[]>(['Problem Solving', 'Communication']);

  const handleFocusToggle = (f: string) => {
    setFocus(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const focusOptions = [
    { name: 'Coding', description: 'Evaluates your technical implementation skills.' },
    { name: 'System Design', description: 'Assesses architectural and scalability thinking.' },
    { name: 'Behavioral', description: 'Focuses on past experiences and soft skills.' },
    { name: 'Communication', description: 'Measures clarity and articulation.' },
    { name: 'Problem Solving', description: 'Evaluates logical reasoning and approach.' },
    { name: 'Leadership', description: 'Assesses management and initiative potential.' }
  ];

  return (
    <div className="max-w-2xl mx-auto p-10 glass rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-p-gold rounded-2xl flex items-center justify-center">
          <Icons.Sparkles className="w-6 h-6 text-p-deep" />
        </div>
        <div>
           <h2 className="text-4xl font-black tracking-tight">Setup Session</h2>
           <p className="text-p-teal font-medium text-sm">Tailor the AI agent to your specific needs.</p>
        </div>
      </div>
      
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-p-teal">Target Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 dark:text-white focus:border-p-teal outline-none transition-all font-bold"
              placeholder="e.g. Lead Developer"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-p-teal">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 dark:text-white focus:border-p-teal outline-none transition-all font-bold"
              placeholder="e.g. OpenAI"
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-black uppercase tracking-widest text-p-teal">Seniority Level</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['Junior', 'Mid-Level', 'Senior', 'Lead'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  difficulty === d 
                  ? 'bg-p-teal text-white shadow-lg' 
                  : 'glass text-p-deep/60 dark:text-p-pale/60 hover:bg-white/10'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-black uppercase tracking-widest text-p-teal">Focus Clusters</label>
          <div className="flex flex-wrap gap-3">
            {focusOptions.map((f) => (
              <button
                key={f.name}
                title={f.description}
                onClick={() => handleFocusToggle(f.name)}
                className={`px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all relative group ${
                  focus.includes(f.name)
                  ? 'bg-p-gold text-p-deep border-p-gold shadow-lg'
                  : 'glass text-p-deep/40 dark:text-p-pale/40 hover:text-p-teal border-transparent'
                }`}
              >
                {f.name}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block w-48 p-3 glass text-[10px] font-bold rounded-2xl shadow-2xl z-50 pointer-events-none normal-case tracking-normal">
                  {f.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart({ role, company, difficulty, focus })}
          className="w-full mt-4 py-6 bg-p-deep dark:bg-p-pale text-p-white dark:text-p-deep font-black text-xl rounded-3xl shadow-2xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] hover:brightness-110"
        >
          <Icons.Sparkles className="w-6 h-6" />
          Initialize Protocall
        </button>
      </div>
      <p className="mt-8 text-[9px] text-center text-p-teal/50 font-black tracking-[0.3em] uppercase">Developed by CipherSquad</p>
    </div>
  );
};
