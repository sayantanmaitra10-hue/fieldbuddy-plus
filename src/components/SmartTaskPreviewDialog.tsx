import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Clock } from "lucide-react";
import { employees } from "@/lib/mock-data";
import { defaultHoursFor, type SmartKeyword } from "@/lib/smart-task";

export type SmartTaskDraft = {
  title: string;
  assigneeId: string;
  hours: number;
  priority: "low" | "medium" | "high";
  keyword?: SmartKeyword;
  sourceMessage?: string;
};

const fieldEmployees = employees.filter((e) =>
  e.role.toLowerCase().includes("field"),
);

export const SmartTaskPreviewDialog = ({
  open,
  onOpenChange,
  initial,
  onConfirm,
  submitting = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: SmartTaskDraft | null;
  onConfirm: (draft: SmartTaskDraft) => void;
  submitting?: boolean;
}) => {
  const [draft, setDraft] = useState<SmartTaskDraft | null>(initial);

  useEffect(() => {
    setDraft(initial);
  }, [initial, open]);

  if (!draft) return null;

  const update = <K extends keyof SmartTaskDraft>(key: K, value: SmartTaskDraft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const recommendedHours = defaultHoursFor(draft.keyword);
  const assignee = employees.find((e) => e.id === draft.assigneeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Convert message to task
          </DialogTitle>
          <DialogDescription>
            Detected an actionable keyword{draft.keyword ? `: "${draft.keyword}"` : ""}.
            Review before creating.
          </DialogDescription>
        </DialogHeader>

        {draft.sourceMessage && (
          <div className="text-xs italic text-muted-foreground border-l-2 border-primary/40 pl-3 py-1">
            "{draft.sourceMessage}"
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label htmlFor="smart-title" className="text-xs">Title</Label>
            <Input
              id="smart-title"
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Assignee</Label>
            <Select
              value={draft.assigneeId}
              onValueChange={(v) => update("assigneeId", v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {fieldEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} <span className="text-muted-foreground text-xs">· {e.location.split(",")[0]}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Clock className="size-3" /> Deadline (hours)
              </Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={draft.hours}
                onChange={(e) => update("hours", Math.max(1, Number(e.target.value) || 1))}
                className="mt-1"
              />
              <div className="text-[10px] text-muted-foreground mt-1">
                Suggested: {recommendedHours}h
              </div>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select
                value={draft.priority}
                onValueChange={(v) => update("priority", v as SmartTaskDraft["priority"])}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {assignee && (
            <div className="text-[11px] text-muted-foreground">
              📍 {assignee.location}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (draft.title.trim() && draft.assigneeId) onConfirm(draft);
            }}
            disabled={!draft.title.trim() || !draft.assigneeId}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
