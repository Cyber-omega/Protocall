
import React from 'react';
import { InterviewAnalysis } from '../types';
import { Icons } from '../constants';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface AnalysisReportProps {
  analysis: InterviewAnalysis;
  onReset: () => void;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({ analysis, onReset }) => {
  const radarData = [
    { subject: 'Clarity', A: analysis.clarity || 0, fullMark: 100 },
    { subject: 'Confidence', A: analysis.confidence || 0, fullMark: 100 },
    { subject: 'Communication', A: analysis.communication || 0, fullMark: 100 },
    { subject: 'Technical', A: analysis.technicalKnowledge || 0, fullMark: 100 },
  ];

  const scoreData = [
    { name: 'Clarity', score: analysis.clarity || 0 },
    { name: 'Confidence', score: analysis.confidence || 0 },
    { name: 'Communication', score: analysis.communication || 0 },
    { name: 'Technical', score: analysis.technicalKnowledge || 0 },
  ];

  const COLORS = ['#407E86', '#A58D66', '#C0D5D6', '#083A4F'];

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <span className="text-xs font-black uppercase tracking-[0.4em] text-p-teal">Evaluation Complete</span>
            {analysis.duration && (
              <span className="text-xs font-mono glass px-3 py-1 rounded-lg border border-p-teal/20 text-p-gold font-bold">
                SESSION TIME: {analysis.duration}
              </span>
            )}
          </div>
          <h2 className="text-6xl font-black text-p-deep dark:text-p-white tracking-tighter">Performance Intelligence</h2>
        </div>
        <button
          onClick={onReset}
          className="px-8 py-4 glass text-p-teal font-black uppercase text-xs tracking-widest hover:bg-p-teal hover:text-white rounded-2xl transition-all"
        >
          Exit Session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Radar Chart Container */}
        <div className="lg:col-span-2 glass p-10 rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center gap-12 border border-white/10 overflow-hidden min-h-[450px]">
          <div className="text-center md:text-left shrink-0">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-p-teal mb-2">Overall Proficiency</h4>
            <div className="text-[10rem] font-black text-p-teal dark:text-p-gold leading-none tracking-tighter">
                {analysis.overallScore || 0}
            </div>
            <p className="max-w-xs text-p-deep/60 dark:text-p-pale/60 text-sm font-medium leading-relaxed">
              Neural assessment based on transcript, vocal sentiment, and facial behavioral cues.
            </p>
          </div>
          <div className="flex-1 w-full h-[350px] relative overflow-hidden" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="rgba(64, 126, 134, 0.2)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#407E86', fontSize: 12, fontWeight: 800 }} />
                <Radar
                  name="Candidate"
                  dataKey="A"
                  stroke="#A58D66"
                  fill="#A58D66"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Metrics Bar Chart Container */}
        <div className="glass p-10 rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden min-h-[450px]">
          <h3 className="text-xl font-black mb-8 flex items-center gap-3">
            <Icons.ChartBar className="w-6 h-6 text-p-teal" /> Skill Metrics
          </h3>
          <div className="w-full h-[300px] relative overflow-hidden" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={scoreData} layout="vertical" margin={{ left: -20, right: 20 }}>
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#407E86', fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '12px' }} />
                <Bar dataKey="score" radius={[0, 10, 10, 0]} barSize={32}>
                  {scoreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-p-teal/5 dark:bg-p-teal/10 p-10 rounded-[2.5rem] glass border border-p-teal/20">
          <h3 className="text-2xl font-black text-p-teal mb-6 flex items-center gap-3">
            <Icons.Check className="w-6 h-6" /> Elite Attributes
          </h3>
          <ul className="space-y-4">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-p-deep dark:text-p-white font-medium">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-p-teal shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-p-gold/5 dark:bg-p-gold/10 p-10 rounded-[2.5rem] glass border border-p-gold/20">
          <h3 className="text-2xl font-black text-p-gold mb-6 flex items-center gap-3">
            <Icons.Sparkles className="w-6 h-6" /> Growth Vectors
          </h3>
          <ul className="space-y-4">
            {analysis.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-3 text-p-deep dark:text-p-white font-medium">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-p-gold shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="glass p-10 rounded-[3rem] border border-white/10">
        <h3 className="text-3xl font-black mb-8 tracking-tight">Intelligence Feed</h3>
        <div className="max-h-[500px] overflow-y-auto pr-6 space-y-6 font-mono text-sm">
          {analysis.transcript.split('\n').map((line, i) => {
            const isInterviewer = line.startsWith('Interviewer:');
            return (
              <div key={i} className={`p-6 rounded-3xl transition-all ${isInterviewer ? 'bg-p-teal/5 border-l-4 border-p-teal' : 'bg-p-gold/5 border-r-4 border-p-gold text-right'}`}>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-2 ${isInterviewer ? 'text-p-teal' : 'text-p-gold'}`}>
                  {isInterviewer ? 'PROTOCALL_CORE' : 'CANDIDATE_V1'}
                </span>
                <p className="text-p-deep/80 dark:text-p-white/80 leading-relaxed font-bold">
                  {line.replace(/^(Candidate|Interviewer):\s*/, '')}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-center text-p-teal/50 py-10 text-[10px] font-black uppercase tracking-[0.5em]">Developed by CipherSquad Intelligence Systems</p>
    </div>
  );
};
