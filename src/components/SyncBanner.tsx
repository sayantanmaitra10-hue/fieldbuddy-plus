import { AnimatePresence, motion } from "framer-motion";
import { CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useSync } from "@/context/SyncContext";
import { cn } from "@/lib/utils";

export const SyncBanner = () => {
  const { online, syncing, queue, flush } = useSync();
  const count = queue.length;
  const visible = !online || syncing || count > 0;

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
          <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs font-medium lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              {syncing ? <Loader2 className="size-3.5 shrink-0 animate-spin" /> : <CloudOff className="size-3.5 shrink-0" />}
              <span className="truncate">
                {!online
                  ? `Offline · ${count} queued ${count === 1 ? "change" : "changes"}`
                  : count > 0
                    ? `${count} action(s) waiting for a configured sync handler`
                    : "Connection restored"}
              </span>
            </div>
            {online && count > 0 && (
              <button onClick={flush} className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warning/20 px-2 py-1 text-[11px] font-semibold transition-colors hover:bg-warning/30">
                <RefreshCw className="size-3" /> Retry
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
