'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { resolveReport, replyToReport } from '@/app/actions/resolve-report';
import { ShieldAlert, Map as MapIcon, Clock, AlertTriangle, Siren, X, Send, Camera, FileText, Cpu, Wifi } from 'lucide-react';
import dynamic from 'next/dynamic';
import NextLink from 'next/link';

const Map = dynamic(() => import('@/components/Map'), { ssr: false, loading: () => <div className="h-full bg-slate-800 animate-pulse rounded-xl flex items-center justify-center text-slate-400">Loading Map...</div> });

export interface Report {
  id: string;
  lat: number;
  lng: number;
  status: string;
  ai_severity: number;
  ai_category: string;
  ai_justification: string;
  ai_suggested_department: string;
  image_url: string;
  description?: string;
  description_translated?: string;
  original_language?: string;
  is_emergency?: boolean;
  emergency_type?: string;
  pin_code?: string;
  assigned_to?: string;
  official_reply?: string;
}

export default function DashboardClient({ officialName }: { officialName?: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'resolve' | 'reply' | null>(null);

  useEffect(() => {
    fetchReports();
    const channel = supabase
      .channel('reports_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchReports();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchReports() {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('ai_severity', { ascending: false });
    if (data) setReports(data as Report[]);
  }

  const openReports = reports.filter(r => r.status === 'open');
  const emergencyReports = openReports.filter(r => r.is_emergency);
  const criticalReports = openReports.filter(r => !r.is_emergency && r.ai_severity > 80);
  const standardReports = openReports.filter(r => r.ai_severity <= 80 && r.ai_severity > 30);
  const lowReports = openReports.filter(r => r.ai_severity <= 30);
  const duplicates = reports.filter(r => r.status === 'duplicate');
  const resolved = reports.filter(r => r.status === 'resolved');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Emergency Banner */}
      {emergencyReports.length > 0 && (
        <div className="bg-red-600 animate-pulse px-4 py-3 flex items-center justify-center gap-3">
          <Siren className="text-white w-6 h-6" />
          <span className="font-bold text-white text-lg">
            🚨 {emergencyReports.length} EMERGENCY ALERT{emergencyReports.length > 1 ? 'S' : ''} — Immediate response required!
          </span>
          <Siren className="text-white w-6 h-6" />
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-blue-500" />
          <h1 className="text-xl font-bold">City Triage Command Center</h1>
          {officialName && <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded-md ml-4 border border-blue-800/50">Logged in as: {officialName}</span>}
        </div>
        <div className="flex items-center gap-3">
          <NextLink href="/official/impact-report" className="text-sm bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center gap-2">
            <FileText size={14} /> Impact Report
          </NextLink>
          <NextLink href="/official/rpa-bridge" className="text-sm bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center gap-2">
            <Cpu size={14} /> RPA Bridge
          </NextLink>
          <NextLink href="/field-ops" className="text-sm bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg text-white transition-colors flex items-center gap-2">
            <Wifi size={14} /> Field Ops
          </NextLink>
          <NextLink href="/" className="text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-slate-300 transition-colors">
            Citizen Feed
          </NextLink>
        </div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
              <div className="bg-blue-500/10 p-3 rounded-lg"><Clock className="text-blue-500" /></div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Labor Hours Saved</p>
                <p className="text-2xl font-bold text-white">{Math.round(reports.length * 3.4)} hrs</p>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
              <div className="bg-green-500/10 p-3 rounded-lg"><ShieldAlert className="text-green-500" /></div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Auto-Triaged</p>
                <p className="text-2xl font-bold text-white">{reports.length}</p>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
              <div className="bg-purple-500/10 p-3 rounded-lg"><AlertTriangle className="text-purple-500" /></div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Duplicates Caught</p>
                <p className="text-2xl font-bold text-white">{duplicates.length}</p>
              </div>
            </div>
            <div className="bg-slate-900 border border-green-500/30 p-5 rounded-2xl flex items-center gap-4">
              <div className="bg-green-500/10 p-3 rounded-lg"><Camera className="text-green-500" /></div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Resolved</p>
                <p className="text-2xl font-bold text-white">{resolved.length}</p>
              </div>
            </div>
          </div>

          {/* Emergency Column (if any) */}
          {emergencyReports.length > 0 && (
            <div className="bg-slate-900 border-2 border-red-500 rounded-2xl p-4 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <h2 className="text-red-400 font-bold mb-4 flex items-center gap-2 text-lg">
                <Siren className="w-5 h-5 animate-pulse" /> EMERGENCY — IMMEDIATE RESPONSE
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {emergencyReports.map(r => <ReportCard key={r.id} report={r} onSelect={(rpt) => { setSelectedReport(rpt); setModalMode('details'); }} />)}
              </div>
            </div>
          )}

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-4 flex flex-col h-[500px] shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <h2 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> CRITICAL ({criticalReports.length})
              </h2>
              <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                {criticalReports.map(r => <ReportCard key={r.id} report={r} onSelect={(rpt) => { setSelectedReport(rpt); setModalMode('details'); }} />)}
                {criticalReports.length === 0 && <p className="text-slate-500 text-sm text-center mt-10">No critical issues.</p>}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[500px]">
              <h2 className="text-slate-200 font-bold mb-4">Standard ({standardReports.length})</h2>
              <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                {standardReports.map(r => <ReportCard key={r.id} report={r} onSelect={(rpt) => { setSelectedReport(rpt); setModalMode('details'); }} />)}
                {standardReports.length === 0 && <p className="text-slate-500 text-sm text-center mt-10">No standard issues.</p>}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[500px]">
              <h2 className="text-slate-400 font-bold mb-4">Low Priority ({lowReports.length})</h2>
              <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                {lowReports.map(r => <ReportCard key={r.id} report={r} onSelect={(rpt) => { setSelectedReport(rpt); setModalMode('details'); }} />)}
                {lowReports.length === 0 && <p className="text-slate-500 text-sm text-center mt-10">No low priority issues.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[740px]">
          <h2 className="text-slate-200 font-bold mb-4 flex items-center gap-2"><MapIcon size={18} /> Live Map</h2>
          <div className="flex-1 rounded-xl overflow-hidden relative z-0">
            <Map reports={openReports} />
          </div>
        </div>
      </main>

      {/* Detail / Resolve / Reply Modal */}
      {selectedReport && modalMode && (
        <ReportModal
          report={selectedReport}
          mode={modalMode}
          onClose={() => { setSelectedReport(null); setModalMode(null); }}
          onModeChange={setModalMode}
          onActionComplete={() => { fetchReports(); setSelectedReport(null); setModalMode(null); }}
        />
      )}
    </div>
  );
}

function ReportCard({ report, onSelect }: { report: Report; onSelect: (r: Report) => void }) {
  return (
    <div onClick={() => onSelect(report)} className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-500 transition-colors cursor-pointer relative overflow-hidden group">
      {report.is_emergency && <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse"></div>}
      {!report.is_emergency && report.ai_severity > 80 && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={report.image_url} alt="Report" className="w-16 h-16 object-cover rounded-lg border border-slate-700 bg-slate-900" />
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-sm text-slate-200">{report.ai_category}</h3>
            <div className="flex items-center gap-1">
              {report.is_emergency && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white animate-pulse">🚨</span>}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${report.ai_severity > 80 ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'}`}>
                {report.ai_severity}/100
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{report.description_translated || report.ai_justification}</p>
          {report.original_language && report.original_language !== 'en' && (
            <span className="text-[10px] text-blue-400 mt-1 inline-block">🌐 Translated from {report.original_language.toUpperCase()}</span>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-between items-center text-xs">
        <span className="text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded">{report.ai_suggested_department}</span>
        {report.pin_code && <span className="text-slate-500 font-mono">📍 {report.pin_code}</span>}
      </div>
    </div>
  );
}

function ReportModal({ report, mode, onClose, onModeChange, onActionComplete }: {
  report: Report;
  mode: 'details' | 'resolve' | 'reply';
  onClose: () => void;
  onModeChange: (m: 'details' | 'resolve' | 'reply') => void;
  onActionComplete: () => void;
}) {
  const [resolveImage, setResolveImage] = useState<File | null>(null);
  const [resolvePreview, setResolvePreview] = useState<string | null>(null);
  const [fieldNotes, setFieldNotes] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleResolve = async () => {
    if (!resolveImage) return;
    setIsSubmitting(true);
    const fd = new FormData();
    fd.append('report_id', report.id);
    fd.append('resolved_image', resolveImage);
    fd.append('field_notes', fieldNotes);
    const res = await resolveReport(fd);
    setIsSubmitting(false);
    if (res.success) onActionComplete();
  };

  const handleReply = async () => {
    if (!replyText) return;
    setIsSubmitting(true);
    const res = await replyToReport(report.id, replyText);
    setIsSubmitting(false);
    if (res.success) onActionComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{report.ai_category}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={report.image_url} alt="Report" className="w-full h-48 object-cover rounded-xl" />

        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className={`font-bold px-2 py-1 rounded ${report.ai_severity > 80 ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'}`}>Severity: {report.ai_severity}/100</span>
            {report.is_emergency && <span className="font-bold px-2 py-1 rounded bg-red-500 text-white">🚨 EMERGENCY: {report.emergency_type?.replace('_', ' ')}</span>}
          </div>
          <p className="text-slate-300"><span className="text-white font-semibold">Department:</span> {report.ai_suggested_department}</p>
          <p className="text-slate-300"><span className="text-white font-semibold">Justification:</span> {report.ai_justification}</p>
          {report.description && <p className="text-slate-300"><span className="text-white font-semibold">Citizen Description:</span> {report.description_translated || report.description}</p>}
          {report.original_language && report.original_language !== 'en' && (
            <p className="text-blue-400 text-xs">🌐 Original ({report.original_language.toUpperCase()}): {report.description}</p>
          )}
          {report.pin_code && <p className="text-slate-400">📍 PIN Code: {report.pin_code}</p>}
        </div>

        {mode === 'details' && report.status === 'open' && (
          <div className="flex gap-3 pt-2">
            <button onClick={() => onModeChange('resolve')} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
              <Camera size={16} /> Mark Resolved
            </button>
            <button onClick={() => onModeChange('reply')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
              <Send size={16} /> Reply
            </button>
          </div>
        )}

        {mode === 'resolve' && (
          <div className="space-y-3 pt-2 border-t border-slate-700">
            <h3 className="font-bold text-white">Upload Resolution Photo</h3>
            <div onClick={() => fileRef.current?.click()} className={`h-32 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer ${resolvePreview ? 'border-green-500' : 'border-slate-600 hover:border-slate-400'}`}>
              {resolvePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolvePreview} alt="After" className="h-full w-full object-cover rounded-lg" />
              ) : (
                <div className="text-slate-400 text-center"><Camera size={24} className="mx-auto mb-1" /><span className="text-sm">Upload "After" photo</span></div>
              )}
            </div>
            <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={(e) => {
              if (e.target.files?.[0]) { setResolveImage(e.target.files[0]); setResolvePreview(URL.createObjectURL(e.target.files[0])); }
            }} />
            <textarea className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm" placeholder="Field notes..." rows={2} value={fieldNotes} onChange={e => setFieldNotes(e.target.value)} />
            <button onClick={handleResolve} disabled={!resolveImage || isSubmitting} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors">
              {isSubmitting ? 'Resolving...' : '✅ Confirm Resolution'}
            </button>
          </div>
        )}

        {mode === 'reply' && (
          <div className="space-y-3 pt-2 border-t border-slate-700">
            <h3 className="font-bold text-white">Reply to Citizen</h3>
            {report.original_language && report.original_language !== 'en' && (
              <p className="text-xs text-blue-400">Your reply will be auto-translated to {report.original_language.toUpperCase()} for the citizen.</p>
            )}
            <textarea className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm" placeholder="Write your reply in English..." rows={3} value={replyText} onChange={e => setReplyText(e.target.value)} />
            <button onClick={handleReply} disabled={!replyText || isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors">
              {isSubmitting ? 'Sending...' : '📤 Send Reply'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
