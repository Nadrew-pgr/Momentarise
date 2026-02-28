import type { SyncChange, SyncDraft, SyncPreview, SyncQuestion } from "@momentarise/shared";
import { ChevronDown, Clock3, GitCompareArrows, History, Info, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { SyncNotice, SyncToolTimelineEntry } from "./types";

interface ActionFeedbackEntry {
  id: string;
  kind: "applied" | "undo";
  createdAt: Date;
}

interface ActionsRailLabels {
  title: string;
  statusStreaming: string;
  statusReady: string;
  pendingAction: string;
  preview: string;
  apply: string;
  undo: string;
  changelog: string;
  question: string;
  draft: string;
  debug: string;
  noPendingAction: string;
  noChanges: string;
  noToolEvents: string;
  appliedSuccess: string;
  undoneSuccess: string;
  noTime: string;
}

interface ActionsRailProps {
  latestPreview: SyncPreview | null;
  latestQuestion: SyncQuestion | null;
  latestDraft: SyncDraft | null;
  changes: SyncChange[];
  notices: SyncNotice[];
  toolTimeline: SyncToolTimelineEntry[];
  actionFeedback: ActionFeedbackEntry[];
  isStreaming: boolean;
  canApply: boolean;
  canUndo: boolean;
  isApplying: boolean;
  isUndoing: boolean;
  labels: ActionsRailLabels;
  onApply: () => void;
  onUndo: () => void;
  className?: string;
}

function formatTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function renderPreviewSummary(preview: SyncPreview): string {
  const summary = preview.diff_json.summary;
  if (typeof summary === "string" && summary.trim().length > 0) return summary;

  const title = preview.diff_json.title;
  if (typeof title === "string" && title.trim().length > 0) return title;

  try {
    const raw = JSON.stringify(preview.diff_json);
    return raw.length > 200 ? `${raw.slice(0, 197)}...` : raw;
  } catch {
    return "{}";
  }
}

export function ActionsRail({
  latestPreview,
  latestQuestion,
  latestDraft,
  changes,
  notices,
  toolTimeline,
  actionFeedback,
  isStreaming,
  canApply,
  canUndo,
  isApplying,
  isUndoing,
  labels,
  onApply,
  onUndo,
  className,
}: ActionsRailProps) {
  const latestUndoableChange = changes.find((change) => change.undoable) ?? null;
  const newestFeedback = actionFeedback[0] ?? null;
  const debugEntries = toolTimeline.slice(0, 12);

  return (
    <aside className={cn("flex h-full min-h-0 flex-col", className)} aria-label={labels.title}>
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <p className="text-sm font-semibold">{labels.title}</p>
        <span className="sync-chat-status-pill text-xs">
          {isStreaming ? labels.statusStreaming : labels.statusReady}
        </span>
      </div>

      <div className="sync-chat-rail-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pb-8">
        {newestFeedback ? (
          <div className="sync-chat-action-feedback rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
            {newestFeedback.kind === "applied" ? labels.appliedSuccess : labels.undoneSuccess}
          </div>
        ) : null}

        {notices.slice(0, 2).map((notice) => (
          <div
            key={notice.id}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs",
              notice.level === "error"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-amber-400/40 bg-amber-400/10 text-amber-300"
            )}
          >
            {notice.message}
          </div>
        ))}

        <section className="sync-chat-action-card rounded-2xl border border-border/60 bg-background/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            {labels.pendingAction}
          </div>

          {latestPreview ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{labels.preview}</p>
              <p className="text-muted-foreground text-xs">
                {latestPreview.action} · {latestPreview.entity_type}
              </p>
              <p className="text-sm">{renderPreviewSummary(latestPreview)}</p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={onApply} disabled={!canApply || isApplying}>
                  {labels.apply}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onUndo}
                  disabled={!canUndo || isUndoing}
                >
                  {labels.undo}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{labels.noPendingAction}</p>
          )}
        </section>

        {latestQuestion ? (
          <section className="sync-chat-action-card rounded-2xl border border-border/60 bg-background/70 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              {labels.question}
            </div>
            <p className="text-sm">{latestQuestion.prompt}</p>
            {latestQuestion.options.length > 0 ? (
              <p className="text-muted-foreground mt-2 text-xs">{latestQuestion.options.join(" · ")}</p>
            ) : null}
          </section>
        ) : null}

        {latestDraft ? (
          <section className="sync-chat-action-card rounded-2xl border border-border/60 bg-background/70 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <GitCompareArrows className="h-3.5 w-3.5" />
              {labels.draft}
            </div>
            <p className="text-sm font-medium">{latestDraft.title ?? labels.draft}</p>
            {latestDraft.summary ? <p className="text-muted-foreground mt-1 text-xs">{latestDraft.summary}</p> : null}
          </section>
        ) : null}

        <section className="sync-chat-action-card rounded-2xl border border-border/60 bg-background/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            {labels.changelog}
          </div>

          <div className="space-y-2">
            {actionFeedback.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border/60 px-2.5 py-2">
                <span className="text-xs">{entry.kind === "applied" ? labels.appliedSuccess : labels.undoneSuccess}</span>
                <span className="text-muted-foreground text-[11px]">{formatTime(entry.createdAt) || labels.noTime}</span>
              </div>
            ))}

            {changes.slice(0, 8).map((change) => (
              <div key={change.id} className="flex items-center justify-between rounded-lg border border-border/60 px-2.5 py-2">
                <span className="truncate text-xs">{change.action}</span>
                <div className="ml-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock3 className="h-3 w-3" />
                  <span>{formatTime(change.created_at) || labels.noTime}</span>
                </div>
              </div>
            ))}

            {actionFeedback.length === 0 && changes.length === 0 ? (
              <p className="text-muted-foreground text-xs">{labels.noChanges}</p>
            ) : null}
          </div>

          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={onUndo}
              disabled={!latestUndoableChange || !canUndo || isUndoing}
              className="w-full"
            >
              {labels.undo}
            </Button>
          </div>
        </section>

        <Collapsible defaultOpen={false}>
          <section className="sync-chat-action-card rounded-2xl border border-border/60 bg-background/70 p-3">
            <CollapsibleTrigger className="flex w-full items-center justify-between text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5" />
                {labels.debug}
              </span>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2">
                {debugEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border/60 px-2.5 py-2 text-xs">
                    <p className="font-medium">{entry.toolName ?? entry.kind}</p>
                    <p className="text-muted-foreground mt-0.5">{entry.status}</p>
                    {entry.summary ? <p className="text-muted-foreground mt-1">{entry.summary}</p> : null}
                  </div>
                ))}

                {debugEntries.length === 0 ? (
                  <p className="text-muted-foreground text-xs">{labels.noToolEvents}</p>
                ) : null}
              </div>
            </CollapsibleContent>
          </section>
        </Collapsible>
      </div>
    </aside>
  );
}
