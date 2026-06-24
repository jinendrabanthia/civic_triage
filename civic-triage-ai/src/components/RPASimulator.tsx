'use client';

import { useState, useEffect } from 'react';
import { generateRPAPayload } from '@/app/actions/export-rpa';
import { Terminal, Database, ArrowRight, Download, Play, CheckCircle, ArrowLeft } from 'lucide-react';
import NextLink from 'next/link';

export default function RPASimulator({ initialList }: { initialList: any[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payload, setPayload] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [typedFields, setTypedFields] = useState<Record<string, string>>({});
  const [simulationComplete, setSimulationComplete] = useState(false);

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    setPayload(null);
    setTypedFields({});
    setSimulationComplete(false);
    const res = await generateRPAPayload(id);
    if (res.success) {
      setPayload(res.data);
    }
  };

  const startSimulation = () => {
    if (!payload) return;
    setIsSimulating(true);
    setTypedFields({});
    setSimulationComplete(false);

    const keys = Object.keys(payload);
    let currentKeyIndex = 0;

    const interval = setInterval(() => {
      if (currentKeyIndex >= keys.length) {
        clearInterval(interval);
        setIsSimulating(false);
        setSimulationComplete(true);
        return;
      }

      const key = keys[currentKeyIndex];
      setTypedFields(prev => ({ ...prev, [key]: String(payload[key]) }));
      currentKeyIndex++;
    }, 400); // type a new field every 400ms
  };

  const handleDownloadJson = () => {
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${payload.TicketID}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-3rem)]">
      <header className="flex justify-between items-center mb-6">
        <div>
          <NextLink href="/official" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-2">
            <ArrowLeft size={16} /> Command Center
          </NextLink>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Terminal className="text-green-500" /> RPA Legacy Bridge
          </h1>
          <p className="text-slate-400 text-sm mt-1">Automated data entry from AI Triage to Legacy Municipal Systems (GovNet95)</p>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* Left Col: Ticket List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-800/50">
            <h2 className="font-bold text-white">Recent Reports</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {initialList.map(item => (
              <button 
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${selectedId === item.id ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500'}`}
              >
                <div className="font-mono text-xs text-slate-500 mb-1">ID: {item.id.split('-')[0]}</div>
                <div className="font-bold">{item.ai_category || 'Report'}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Middle Col: AI JSON Payload */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
            <h2 className="font-bold text-white flex items-center gap-2"><Database size={16} className="text-blue-400"/> AI Output Payload</h2>
            {payload && (
              <button onClick={handleDownloadJson} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors text-white">
                <Download size={14} /> JSON
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-[#0d1117]">
            {payload ? (
              <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">
                {JSON.stringify(payload, null, 2)}
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">Select a report to generate payload</div>
            )}
          </div>
        </div>

        {/* Right Col: Legacy System Simulator */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden relative shadow-2xl">
          {/* Retro Window Header */}
          <div className="p-2 bg-gradient-to-r from-blue-900 to-blue-800 border-b-2 border-slate-700 flex justify-between items-center select-none">
            <h2 className="font-bold text-white font-mono text-sm tracking-wider">GovNet95 System — Data Entry</h2>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-slate-400"></div>
              <div className="w-3 h-3 rounded-full bg-slate-400"></div>
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 bg-slate-800 flex justify-center border-b border-slate-700">
            <button 
              onClick={startSimulation}
              disabled={!payload || isSimulating || simulationComplete}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded font-bold transition-colors flex items-center gap-2 shadow-[inset_0_2px_0_rgba(255,255,255,0.2)]"
            >
              {isSimulating ? <ArrowRight className="animate-pulse" /> : <Play size={18} />}
              {isSimulating ? 'RPA BOT RUNNING...' : 'Trigger RPA Bot'}
            </button>
          </div>

          {/* Retro Form */}
          <div className="flex-1 bg-slate-300 p-6 overflow-y-auto font-sans">
            <div className="max-w-md mx-auto space-y-4">
              
              <div className="bg-white border-2 border-slate-400 p-4 shadow-[4px_4px_0_rgba(0,0,0,0.2)]">
                <h3 className="text-black font-bold mb-4 border-b-2 border-black pb-1">MUNICIPAL TICKET INTAKE FORM</h3>
                
                <div className="space-y-3">
                  {payload && Object.keys(payload).map(key => (
                    <div key={key} className="flex flex-col">
                      <label className="text-xs font-bold text-slate-700 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input 
                          readOnly
                          value={typedFields[key] || ''}
                          className={`w-full border-2 border-slate-400 bg-white p-1 text-black font-mono text-sm ${typedFields[key] ? 'bg-yellow-50/50' : ''}`}
                        />
                        {typedFields[key] && <div className="w-2 h-4 bg-black animate-ping"></div>}
                      </div>
                    </div>
                  ))}
                </div>

                {simulationComplete && (
                  <div className="mt-6 p-3 bg-green-100 border-2 border-green-600 text-green-800 font-bold flex items-center gap-2 animate-bounce">
                    <CheckCircle /> RECORD SAVED TO MAINFRAME
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
