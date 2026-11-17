import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
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
  setOnline: (value: boolean) => void;
  enqueue: (item: Omit<QueueItem, "id" | "createdAt">) => string;
  flush: () => void;
  clearItem: (id: string) => void;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [online, setOnlineState] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [syncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnlineState(true);
    const handleOffline = () => setOnlineState(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const enqueue: SyncContextValue["enqueue"] = useCallback((item) => {
    const id = `q-${crypto.randomUUID()}`;
    setQueue((previous) => [...previous, { ...item, id, createdAt: Date.now() }]);
    return id;
  }, []);

  const clearItem = useCallback((id: string) => {
    setQueue((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const setOnline = useCallback((requested: boolean) => {
    setOnlineState(typeof navigator === "undefined" ? requested : navigator.onLine);
  }, []);

  const flush = useCallback(() => {
    if (!online || queue.length === 0) return;
    toast({
      title: "Sync handler not connected",
      description: "This action remains queued. It will not be marked synced until its server endpoint is implemented.",
      variant: "destructive",
    });
  }, [online, queue.length]);

  return (
    <SyncContext.Provider value={{ online, syncing, queue, setOnline, enqueue, flush, clearItem }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error("useSync must be used within SyncProvider");
  return context;
};
