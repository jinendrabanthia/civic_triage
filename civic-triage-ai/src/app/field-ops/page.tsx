'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cacheAssignedTasks, getCachedTasks, getPendingUpdates, clearSyncedUpdate } from '@/lib/offline-store';
import { syncOfflineTasks } from '@/app/actions/sync-tasks';
import FieldTaskCard from '@/components/FieldTaskCard';
import { Wifi, WifiOff, HardDriveDownload, RefreshCw, ArrowLeft, ShieldAlert } from 'lucide-react';
import NextLink from 'next/link';

export default function FieldOpsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Add event listeners for online/offline
    const handleOnline = () => { setIsOnline(true); triggerSync(); };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load initial tasks (from cache first, then try network)
    loadTasks();

    // Register service worker if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadTasks = async () => {
    // 1. Try to load from IndexedDB cache first
    const cached = await getCachedTasks();
    if (cached && cached.length > 0) {
      setTasks(cached);
    }
    await checkPending();

    // 2. If online, fetch fresh tasks
    if (navigator.onLine) {
      downloadTasks();
    }
  };

  const checkPending = async () => {
    const pending = await getPendingUpdates();
    setPendingCount(pending.length);
  };

  const downloadTasks = async () => {
    setIsDownloading(true);
    // In a real app, we'd get the official's ID from session. For demo, fetch all open/in_progress
    const { data } = await supabase
      .from('reports')
      .select('*')
      .in('status', ['open', 'in_progress'])
      .order('ai_severity', { ascending: false });

    if (data) {
      setTasks(data);
      await cacheAssignedTasks(data);
      setLastSync(new Date().toLocaleTimeString());
    }
    setIsDownloading(false);
  };

  const triggerSync = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);

    const pending = await getPendingUpdates();
    if (pending.length > 0) {
      const res = await syncOfflineTasks(pending);
      if (res.success) {
        // Clear synced items from IDB
        for (const update of pending) {
          await clearSyncedUpdate(update.reportId);
        }
        await checkPending();
        // Refresh tasks from server
        await downloadTasks();
      } else {
        console.error("Failed to sync:", res.error);
      }
    }
    
    setIsSyncing(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 p-4 sticky top-0 z-10 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <NextLink href="/official" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </NextLink>
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-orange-500" />
            <h1 className="text-xl font-bold">Field Ops</h1>
          </div>
        </div>

        {/* Network & Sync Status */}
        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${isOnline ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
            {isOnline ? <><Wifi size={14} /> ONLINE</> : <><WifiOff size={14} /> OFFLINE</>}
          </div>
          
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
              {pendingCount} PENDING SYNC
            </div>
          )}

          <button 
            onClick={downloadTasks} 
            disabled={!isOnline || isDownloading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {isDownloading ? <RefreshCw size={14} className="animate-spin" /> : <HardDriveDownload size={14} />}
            CACHE TASKS
          </button>
        </div>
      </header>

      {/* Warning Banner when Offline */}
      {!isOnline && (
        <div className="bg-amber-600 text-amber-50 px-4 py-2 text-sm font-medium text-center shadow-md">
          You are currently offline. Changes will be saved locally and synced automatically when connection is restored.
        </div>
      )}

      <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
        {lastSync && (
          <p className="text-slate-500 text-xs font-mono text-center mb-6">Last cached: {lastSync}</p>
        )}

        {tasks.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <ShieldAlert size={48} className="mx-auto mb-4 opacity-50" />
            <p>No assigned tasks found.</p>
            {isOnline && <p className="text-sm mt-2">Click "Cache Tasks" to download your assignments.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <FieldTaskCard key={task.id} task={task} onUpdate={checkPending} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
