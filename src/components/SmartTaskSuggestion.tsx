import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const SuggestionChip = ({
  keyword,
  onConvert,
  onDismiss,
  className,
}: {
  keyword: string;
  onConvert: () => void;
  onDismiss?: () => void;
  className?: string;
}) => (
  <div
    className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs animate-in fade-in slide-in-from-bottom-1",
      className,
    )}
  >
    <Sparkles className="size-3.5" />
    <span className="font-medium">
      Looks actionable — convert "{keyword}" to a task?
    </span>
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={onConvert}
      className="h-6 px-2 text-xs hover:bg-primary/15"
    >
      Convert
    </Button>
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        className="text-primary/60 hover:text-primary"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    )}
  </div>
);

export const ConvertCallout = ({
  onConvert,
  onDismiss,
  className,
}: {
  onConvert: () => void;
  onDismiss: () => void;
  className?: string;
}) => (
  <div
    className={cn(
      "mt-1.5 flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/25 bg-primary/5 text-xs",
      className,
    )}
  >
    <Sparkles className="size-3.5 text-primary shrink-0" />
    <span className="text-foreground/80 flex-1">This looks like a task.</span>
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={onConvert}
      className="h-7 px-2.5 text-xs text-primary hover:bg-primary/10"
    >
      Convert
    </Button>
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={onDismiss}
      className="h-7 px-2 text-xs text-muted-foreground"
    >
      Dismiss
    </Button>
  </div>
);
