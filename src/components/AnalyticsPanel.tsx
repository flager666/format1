import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { analyzeText } from '../utils/analytics';
import { AlertTriangle, Info, Zap } from 'lucide-react';

interface Props {
  text: string;
}

export const AnalyticsPanel: React.FC<Props> = ({ text }) => {
  const data = useMemo(() => analyzeText(text), [text]);

  if (!text || data.totalWords === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center opacity-60 h-full">
        <Zap size={24} className="mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-[11px] max-w-[200px]">Zacznij pisać lub wklej tekst, aby zobaczyć analizę stylometryczną w czasie rzeczywistym.</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full overflow-y-auto space-y-6">
      
      {/* Kafelki z metrykami */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Indeks FOG</p>
          <p className="text-2xl font-black text-slate-700 dark:text-slate-200">{data.fogIndex}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Słowa / Zdania</p>
          <p className="text-xl font-black text-slate-700 dark:text-slate-200">{data.totalWords} <span className="text-slate-400 font-medium">/ {data.sentences.length}</span></p>
        </div>
      </div>

      {/* Alerty */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">AI Alerts</h3>
          {data.alerts.map((alert, idx) => (
            <div key={idx} className={`flex gap-3 p-3 rounded-xl border text-[11px] leading-relaxed ${
              alert.type === 'danger' ? 'bg-red-50/80 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-300' :
              alert.type === 'warning' ? 'bg-amber-50/80 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-300' :
              'bg-blue-50/80 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-300'
            }`}>
              <div className="mt-0.5 shrink-0 opacity-80">
                {alert.type === 'danger' ? <AlertTriangle size={14} /> : <Info size={14} />}
              </div>
              <p className="font-medium">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Wykres długości zdań */}
      <div>
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Rytm Zdań (Długość w słowach)</h3>
        <div className="h-28 w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2 border border-slate-200 dark:border-slate-700">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.sentences}>
              <XAxis dataKey="id" hide />
              <Tooltip 
                cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value: number) => [`${value} słów`, 'Długość']}
                labelFormatter={(label) => `Zdanie ${label}`}
              />
              <Bar dataKey="length" radius={[3, 3, 3, 3]}>
                {data.sentences.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.length > 20 ? '#ef4444' : '#64748b'} className="transition-all duration-300 hover:opacity-80" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chmura słów */}
      {data.wordFrequency.length > 0 && (
        <div className="pb-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Najczęstsze słowa</h3>
          <div className="flex flex-wrap gap-2">
            {data.wordFrequency.map((item, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800 px-2 py-1 rounded-lg flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{item.word}</span>
                <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
