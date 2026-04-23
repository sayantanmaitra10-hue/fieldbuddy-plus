import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { toast } from "@/hooks/use-toast";

export type QueueKind = "punch" | "task" | "status" | "proof" | "message";

export type QueueItem = {
  id: string;
  kind: QueueKind;
  label: string;
  createdAt: number;
};

type SyncContextValue = {
  online: boolean;
  syncing: boolean;
  queue: QueueItem[];
  setOnline: (v: boolean) => void;
  enqueue: (item: Omit<QueueItem, "id" | "createdAt">) => string;
  flush: () => void;
  clearItem: (id: string) => void;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [online, setOnlineState] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const flushingRef = useRef(false);

  const enqueue: SyncContextValue["enqueue"] = useCallback((item) => {
    const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setQueue((prev) => [...prev, { ...item, id, createdAt: Date.now() }]);
    return id;
  }, []);

  const clearItem = useCallback((id: string) => {
    setQueue((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const flush = useCallback(() => {
    if (flushingRef.current) return;
    setQueue((current) => {
      if (current.length === 0) return current;
      flushingRef.current = true;
      setSyncing(true);
      const items = [...current];
      const perItem = Math.max(180, Math.min(420, 1500 / items.length));
      items.forEach((item, idx) => {
        setTimeout(() => {
          setQueue((prev) => prev.filter((i) => i.id !== item.id));
          if (idx === items.length - 1) {
            setTimeout(() => {
              setSyncing(false);
              flushingRef.current = false;
              toast({
                title: "Synced",
                description: `${items.length} ${items.length === 1 ? "change" : "changes"} synced successfully`,
              });
            }, 250);
          }
        }, perItem * (idx + 1));
      });
      return current;
    });
  }, []);

  const setOnline = useCallback(
    (v: boolean) => {
      setOnlineState(v);
      if (v) {
        // small delay so banner state transition feels natural
        setTimeout(() => flush(), 250);
      }
    },
    [flush],
  );

  // Auto-flush if queue grows while online (edge case)
  useEffect(() => {
    if (online && queue.length > 0 && !flushingRef.current) {
      flush();
    }
  }, [online, queue.length, flush]);

  return (
    <SyncContext.Provider value={{ online, syncing, queue, setOnline, enqueue, flush, clearItem }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
};
