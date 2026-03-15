import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fullSync, pullFromSupabase } from '../db/syncEngine';
import { getPendingSyncItems } from '../db/indexedDB';

const OnlineContext = createContext({});

export function OnlineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSynced, setLastSynced] = useState(null);

  const updatePendingCount = useCallback(async () => {
    const items = await getPendingSyncItems();
    setPendingCount(items.length);
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      await fullSync();
      setLastSynced(new Date());
      await updatePendingCount();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updatePendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      sync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial cache load
    if (navigator.onLine) {
      pullFromSupabase().catch(console.error);
    }
    updatePendingCount();

    // Auto-sync every 5 minutes when online
    const interval = setInterval(() => {
      if (navigator.onLine) sync();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [sync, updatePendingCount]);

  return (
    <OnlineContext.Provider value={{ isOnline, isSyncing, pendingCount, lastSynced, sync, updatePendingCount }}>
      {children}
    </OnlineContext.Provider>
  );
}

export function useOnline() {
  return useContext(OnlineContext);
}
