import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { outboxManager } from '../../services/sync/outbox';
import { syncEngine } from '../../services/sync/supabaseSync';
import { SyncStats } from '../../types/sync';

interface SyncBadgeProps {
  onTriggerSync?: () => void;
}

export const SyncBadge: React.FC<SyncBadgeProps> = ({ onTriggerSync }) => {
  const [stats, setStats] = useState<SyncStats>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    syncedCount: 0,
    failedCount: 0,
    conflictCount: 0
  });

  const [syncing, setSyncing] = useState(false);

  const loadStats = async () => {
    try {
      const s = await outboxManager.getSyncStats();
      setStats(s);
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const updated = await syncEngine.triggerSync();
      setStats(updated);
      if (onTriggerSync) onTriggerSync();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      {stats.isOnline ? (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/60">
          <Cloud className="w-3.5 h-3.5" />
          <span>Online</span>
        </span>
      ) : (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/40 text-amber-400 border border-amber-800/60">
          <CloudOff className="w-3.5 h-3.5" />
          <span>Offline Mode</span>
        </span>
      )}

      {stats.pendingCount > 0 ? (
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/40 text-blue-400 border border-blue-800/60 hover:bg-blue-900/50 transition cursor-pointer"
          title="Click to sync pending operations"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{stats.pendingCount} Pending Sync</span>
        </button>
      ) : (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/50 text-slate-300 border border-slate-700/60">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>All Synced</span>
        </span>
      )}

      {stats.conflictCount > 0 && (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-950/40 text-rose-400 border border-rose-800/60">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{stats.conflictCount} Conflicts</span>
        </span>
      )}
    </div>
  );
};
