'use client';

import { useState, useRef } from 'react';
import { Camera, CheckCircle, AlertTriangle, ArrowRight, Loader2, Save } from 'lucide-react';
import { queueStatusUpdate } from '@/lib/offline-store';

export default function FieldTaskCard({ task, onUpdate }: { task: any, onUpdate: () => void }) {
  const [status, setStatus] = useState(task.status);
  const [fieldNotes, setFieldNotes] = useState(task.field_notes || '');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // If online, we could call the server action directly. 
    // For offline-first, we ALWAYS put it in the queue, and let the sync manager handle it.
    await queueStatusUpdate(task.id, status, fieldNotes, image);
    setIsSaving(false);
    onUpdate(); // Trigger re-render to show offline badge
  };

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'resolved': return 'text-green-400 bg-green-500/10 border-green-500/50';
      case 'in_progress': return 'text-orange-400 bg-orange-500/10 border-orange-500/50';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/50';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
      <div className="flex gap-3 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={task.image_url} alt="Issue" className="w-20 h-20 object-cover rounded-lg bg-slate-800" />
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-white text-lg">{task.ai_category}</h3>
            <span className={`text-xs font-bold px-2 py-1 rounded-md border ${getStatusColor(status)}`}>
              {status.toUpperCase()}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">{task.description || task.ai_justification}</p>
          <div className="mt-2 flex gap-2 text-xs font-mono text-slate-500">
            <span>📍 {task.pin_code || 'No PIN'}</span>
            <span>🚨 Sev: {task.ai_severity}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 p-4 border-t border-slate-700 space-y-4">
        
        {/* Status Toggles */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Update Status</label>
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button 
              onClick={() => setStatus('open')}
              className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${status === 'open' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Open
            </button>
            <button 
              onClick={() => setStatus('in_progress')}
              className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${status === 'in_progress' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              In Progress
            </button>
            <button 
              onClick={() => setStatus('resolved')}
              className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${status === 'resolved' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Resolved
            </button>
          </div>
        </div>

        {/* Resolution Photo */}
        {status === 'resolved' && !task.resolved_image_url && (
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Resolution Proof</label>
            <div 
              onClick={() => fileRef.current?.click()} 
              className={`h-24 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer ${preview ? 'border-green-500' : 'border-slate-600 hover:border-slate-400'}`}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="After" className="h-full w-full object-cover rounded-lg" />
              ) : (
                <div className="text-slate-400 text-center flex flex-col items-center">
                  <Camera size={20} className="mb-1" />
                  <span className="text-xs">Upload "After" Photo</span>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleImageChange} />
          </div>
        )}

        {/* Field Notes */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Field Notes</label>
          <textarea 
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
            placeholder="Add notes about materials used, time taken, etc." 
            rows={2} 
            value={fieldNotes} 
            onChange={e => setFieldNotes(e.target.value)} 
          />
        </div>

        <button 
          onClick={handleSave} 
          disabled={isSaving || (status === task.status && fieldNotes === (task.field_notes || ''))}
          className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Queue Update
        </button>

      </div>
    </div>
  );
}
