import { useMemo, useState } from "react";
import type { SyncRunSummary } from "@momentarise/shared";
import { Clock3, EllipsisVertical, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface HistoryDrawerLabels {
  title: string;
  searchPlaceholder: string;
  empty: string;
  lastUpdate: string;
  model: string;
  openConversation: string;
  renameConversation: string;
  deleteConversation: string;
}

interface HistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runs: SyncRunSummary[];
  selectedRunId: string | null;
  isLoadingRuns: boolean;
  onSelectRun: (runId: string) => void;
  onRenameRun: (run: SyncRunSummary) => void;
  onDeleteRun: (run: SyncRunSummary) => void;
  labels: HistoryDrawerLabels;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function runTitle(run: SyncRunSummary): string {
  if (run.title && run.title.trim()) return run.title;
  if (run.last_message_preview && run.last_message_preview.trim()) return run.last_message_preview;
  return run.id.slice(0, 8);
}

export function HistoryDrawer({
  open,
  onOpenChange,
  runs,
  selectedRunId,
  isLoadingRuns,
  onSelectRun,
  onRenameRun,
  onDeleteRun,
  labels,
}: HistoryDrawerProps) {
  const [query, setQuery] = useState("");

  const filteredRuns = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return runs;
    return runs.filter((run) => {
      const title = runTitle(run).toLowerCase();
      const preview = (run.last_message_preview ?? "").toLowerCase();
      return title.includes(trimmed) || preview.includes(trimmed);
    });
  }, [query, runs]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[90vw] p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 p-4 pb-3">
          <SheetTitle>{labels.title}</SheetTitle>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border/60 p-3">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute left-2 top-2.5 h-4 w-4" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.searchPlaceholder}
                className="pl-8"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {isLoadingRuns ? (
              <p className="text-sm text-muted-foreground">...</p>
            ) : filteredRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground">{labels.empty}</p>
            ) : (
              <div className="space-y-2">
                {filteredRuns.map((run) => (
                  <div
                    key={run.id}
                    className={cn(
                      "relative w-full rounded-xl border border-border/60 p-3 text-left transition-colors hover:bg-muted/50",
                      run.id === selectedRunId && "border-primary/40 bg-primary/5"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectRun(run.id);
                        onOpenChange(false);
                      }}
                      className="w-full pr-8 text-left"
                    >
                      <p className="truncate text-sm font-medium">{runTitle(run)}</p>
                      {run.last_message_preview ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{run.last_message_preview}</p>
                      ) : null}
                      <div className="text-muted-foreground mt-2 flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {labels.lastUpdate}: {formatTime(run.updated_at)}
                        </span>
                        <span>
                          {labels.model}: {run.selected_model ?? "-"}
                        </span>
                      </div>
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1.5 top-1.5 h-7 w-7"
                        >
                          <EllipsisVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            onSelectRun(run.id);
                            onOpenChange(false);
                          }}
                        >
                          {labels.openConversation}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRenameRun(run)}>
                          {labels.renameConversation}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDeleteRun(run)}
                        >
                          {labels.deleteConversation}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
