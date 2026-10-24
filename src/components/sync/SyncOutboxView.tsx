import React, { useState, useEffect } from 'react';
import {
  Cloud,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Database,
  ArrowRight,
  ShieldCheck,
  Server,
  HardDrive
} from 'lucide-react';
import { OutboxEntry, SyncStats, SyncConflict } from '../../types/sync';
import { dbService } from '../../services/sqlite/db';
import { syncEngine } from '../../services/sync/supabaseSync';
import { outboxManager } from '../../services/sync/outbox';

export const SyncOutboxView: React.FC = () => {
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [stats, setStats] = useState<SyncStats>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    syncedCount: 0,
    failedCount: 0,
    conflictCount: 0
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected: boolean;
    url: string;
    message: string;
  }>({
    connected: true,
    url: syncEngine.getConfig().url,
    message: 'Supabase PostgreSQL & Storage Pipeline Active'
  });

  const loadOutbox = async () => {
    try {
      const all = await dbService.getOutboxEntries();
      setEntries(all.slice(0, 50));
      const s = await outboxManager.getSyncStats();
      setStats(s);
      setConflicts(syncEngine.getConflicts());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadOutbox();
    syncEngine.testConnection().then((res) => {
      setSupabaseStatus({
        connected: res.success,
        url: res.url,
        message: res.message
      });
    });
    const interval = setInterval(loadOutbox, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncEngine.triggerSync();
      await loadOutbox();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cloud className="w-5 h-5 text-emerald-400" />
            <span>Durable Offline Outbox & Supabase Sync</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
              Supabase PostgreSQL & Storage
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Durable outbox operations with unique idempotency keys to eliminate duplicate payments on retry.
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-sm cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Synchronizing Outbox...' : 'Trigger Supabase Sync'}</span>
        </button>
      </div>

      {/* Cloud & Supabase Target Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-400">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-white flex items-center gap-2">
              <span>Cloud Provider: Supabase Database & Storage</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Live
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Endpoint: {supabaseStatus.url}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            <span>Bucket: documents</span>
          </span>
          <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Idempotency Protected</span>
          </span>
        </div>
      </div>

      {/* Sync Status KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Network State</span>
          <div className="text-base font-bold font-mono mt-1 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${stats.isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={stats.isOnline ? 'text-emerald-400' : 'text-amber-400'}>
              {stats.isOnline ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Pending Operations</span>
          <div className="text-xl font-bold font-mono mt-1 text-blue-400">
            {stats.pendingCount} queued
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Successfully Replicated</span>
          <div className="text-xl font-bold font-mono mt-1 text-emerald-400">
            {stats.syncedCount} ops
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Conflict Detections</span>
          <div className="text-xl font-bold font-mono mt-1 text-rose-400">
            {stats.conflictCount} conflicts
          </div>
        </div>
      </div>

      {/* Conflicts Review Section if any */}
      {conflicts.length > 0 && (
        <div className="bg-rose-950/40 border border-rose-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Conflicts Requiring Review</span>
          </div>
          <div className="space-y-2">
            {conflicts.map((c) => (
              <div key={c.id} className="p-3 bg-rose-900/40 border border-rose-800/80 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-white">
                  Entity: {c.entityType} ({c.entityId})
                </div>
                <div className="text-[11px] text-rose-200">
                  Local version {c.localVersion} clashed with remote version {c.remoteVersion}. Financial ledger was preserved.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outbox Operations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            Outbox Queue Ledger (First-In, First-Out)
          </span>
          <span className="text-slate-400 font-mono">Showing {entries.length} recent ops</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Operation</th>
                <th className="py-2.5 px-3">Entity Type & ID</th>
                <th className="py-2.5 px-3">Idempotency Key</th>
                <th className="py-2.5 px-3 text-center">Attempts</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {entry.createdAt.slice(11, 19)}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-white">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        entry.operation === 'INSERT'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : entry.operation === 'UPDATE'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {entry.operation}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-slate-200 font-medium">{entry.entityType}</span>
                    <div className="text-[10px] text-slate-500 font-mono">{entry.entityId}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                    {entry.idempotencyKey}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                    {entry.attemptCount}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                        entry.status === 'synced'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : entry.status === 'syncing'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800 animate-pulse'
                          : entry.status === 'pending'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Outbox queue is empty. All local operations have synchronized or no new changes recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
