import { AnimatePresence, motion } from "framer-motion";
import { CloudOff, RefreshCw, Loader2 } from "lucide-react";
import { useSync } from "@/context/SyncContext";
import { cn } from "@/lib/utils";

export const SyncBanner = () => {
  const { online, syncing, queue, setOnline } = useSync();
  const visible = !online || syncing;
  const count = queue.length;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="sync-banner"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "sticky top-0 z-20 w-full border-b backdrop-blur",
            syncing
              ? "bg-success/10 border-success/30 text-success"
              : "bg-warning/10 border-warning/30 text-warning-foreground",
          )}
        >
          <div className="relative px-4 lg:px-8 py-2 flex items-center justify-between gap-3 text-xs font-medium">
            <div className="flex items-center gap-2 min-w-0">
              {syncing ? (
                <Loader2 className="size-3.5 animate-spin shrink-0" />
              ) : (
                <CloudOff className="size-3.5 shrink-0" />
              )}
              <span className="truncate">
                {syncing
                  ? `Syncing ${count > 0 ? count : ""} ${count === 1 ? "item" : "items"}…`
                  : count > 0
                  ? `Offline · ${count} ${count === 1 ? "change" : "changes"} queued`
                  : "Offline · changes will sync when you reconnect"}
              </span>
            </div>
            {!syncing && (
              <button
                onClick={() => setOnline(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-warning/20 hover:bg-warning/30 transition-colors text-[11px] font-semibold shrink-0"
              >
                <RefreshCw className="size-3" /> Retry
              </button>
            )}
            {syncing && (
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 bg-success"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
