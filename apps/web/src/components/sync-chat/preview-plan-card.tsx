import type { SyncPreview } from "@momentarise/shared";
import { FileText } from "lucide-react";
import {
  Plan,
  PlanAction,
  PlanContent,
  PlanDescription,
  PlanFooter,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "@/components/ai-elements/plan";
import { Button } from "@/components/ui/button";

interface PreviewPlanCardLabels {
  title: string;
  /** Optional user-facing plan type title (e.g. "Création d'un moment"). When set, shown as main title instead of entity_type · action. */
  planTitle?: string;
  summary: string;
  mutations: string;
  notes: string;
  apply: string;
  undo: string;
  pending: string;
}

interface PreviewPlanCardProps {
  preview: SyncPreview | null;
  canApply: boolean;
  canUndo: boolean;
  isApplying: boolean;
  isUndoing: boolean;
  onApply: () => void;
  onUndo: () => void;
  labels: PreviewPlanCardLabels;
}

interface PreviewMutation {
  kind: string;
  args: Record<string, unknown>;
  display_summary?: string;
}

const COLOR_LABELS: Record<string, string> = {
  sky: "Bleu ciel",
  amber: "Ambre",
  violet: "Violet",
  rose: "Rose",
  emerald: "Émeraude",
  orange: "Orange",
};

function extractMutations(preview: SyncPreview): PreviewMutation[] {
  const diff = preview.diff_json as Record<string, unknown>;
  const multi = diff.mutations;
  if (Array.isArray(multi)) {
    return multi
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const raw = entry as Record<string, unknown>;
        const kind = typeof raw.kind === "string" ? raw.kind : "mutation";
        const args = raw.args && typeof raw.args === "object" ? (raw.args as Record<string, unknown>) : {};
        const display_summary = typeof raw.display_summary === "string" && raw.display_summary.trim() ? raw.display_summary.trim() : undefined;
        return { kind, args, display_summary } as PreviewMutation;
      })
      .filter((entry): entry is PreviewMutation => entry !== null);
  }

  const single = diff.mutation;
  if (single && typeof single === "object") {
    const raw = single as Record<string, unknown>;
    const display_summary = typeof raw.display_summary === "string" && raw.display_summary.trim() ? raw.display_summary.trim() : undefined;
    return [
      {
        kind: typeof raw.kind === "string" ? raw.kind : "mutation",
        args: raw.args && typeof raw.args === "object" ? (raw.args as Record<string, unknown>) : {},
        display_summary,
      },
    ];
  }

  return [];
}

function extractSummary(preview: SyncPreview): string {
  const diff = preview.diff_json as Record<string, unknown>;
  const summary = diff.summary;
  if (typeof summary === "string" && summary.trim()) return summary;
  return `${preview.action} · ${preview.entity_type}`;
}

function extractNotes(preview: SyncPreview): string[] {
  const diff = preview.diff_json as Record<string, unknown>;
  const notes = diff.notes;
  if (!Array.isArray(notes)) return [];
  return notes
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function mutationArgsPreview(args: Record<string, unknown>): string {
  const keys = ["title", "start_at", "end_at", "estimated_time_seconds", "color", "target"];
  const parts = keys
    .filter((key) => key in args)
    .map((key) => `${key}: ${String(args[key])}`);

  if (parts.length > 0) return parts.join(" · ");
  const compact = JSON.stringify(args);
  return compact.length <= 180 ? compact : `${compact.slice(0, 177)}...`;
}

/** User-friendly fallback when display_summary is not provided. */
function formatMutationArgsReadable(args: Record<string, unknown>): string {
  const parts: string[] = [];

  const title = args.title;
  if (typeof title === "string" && title.trim()) {
    parts.push(title.trim());
  }

  const startAt = args.start_at;
  const endAt = args.end_at;
  const estimatedSeconds = typeof args.estimated_time_seconds === "number" ? args.estimated_time_seconds : null;
  if (typeof startAt === "string" && typeof endAt === "string") {
    try {
      const start = new Date(startAt);
      const end = new Date(endAt);
      const startTime = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      const endTime = end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      const mins = estimatedSeconds != null ? Math.round(estimatedSeconds / 60) : Math.round((end.getTime() - start.getTime()) / 60000);
      parts.push(`Horaire : ${startTime} - ${endTime} (${mins} min)`);
    } catch {
      parts.push(`Horaire : ${String(startAt)} - ${String(endAt)}`);
    }
  } else if (typeof startAt === "string") {
    try {
      const start = new Date(startAt);
      parts.push(`Horaire : ${start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`);
    } catch {
      parts.push(`Horaire : ${startAt}`);
    }
  }

  const color = args.color;
  if (typeof color === "string" && color.trim()) {
    const label = COLOR_LABELS[color.toLowerCase()] ?? color;
    parts.push(`Couleur : ${label}`);
  }

  const target = args.target;
  if (typeof target === "string" && target.trim()) {
    parts.push(target === "event" ? "Événement" : "Item");
  }

  if (parts.length > 0) return parts.join("\n");
  return mutationArgsPreview(args);
}

export function PreviewPlanCard({
  preview,
  canApply,
  canUndo,
  isApplying,
  isUndoing,
  onApply,
  onUndo,
  labels,
}: PreviewPlanCardProps) {
  if (!preview) return null;

  const summary = extractSummary(preview);
  const mutations = extractMutations(preview);
  const notes = extractNotes(preview);
  const title = labels.planTitle ?? (preview.entity_type ? `${preview.entity_type} · ${preview.action}` : labels.title);

  return (
    <Plan className="sync-chat-preview-card rounded-2xl border border-border bg-background/95 shadow-sm" defaultOpen>
      <PlanHeader className="gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            {labels.title}
          </div>
          <PlanTitle className="truncate text-base">{title}</PlanTitle>
          <PlanDescription>{summary}</PlanDescription>
        </div>
        <PlanAction className="flex items-center gap-2">
          <span className="sync-chat-status-pill text-xs">{labels.pending}</span>
          <PlanTrigger aria-label={labels.title} />
        </PlanAction>
      </PlanHeader>

      <PlanContent className="space-y-4 pt-0">
        <section>
          <h4 className="mb-1.5 text-sm font-semibold">{labels.summary}</h4>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </section>

        {mutations.length > 0 ? (
          <section>
            <h4 className="mb-1.5 text-sm font-semibold">{labels.mutations}</h4>
            <ul className="space-y-1.5">
              {mutations.map((mutation, index) => (
                <li key={`${mutation.kind}-${index}`} className="rounded-lg border border-border/70 px-3 py-2">
                  <p className="text-sm font-medium">{mutation.kind}</p>
                  {mutation.display_summary ? (
                    <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">{mutation.display_summary}</p>
                  ) : (
                    <p className="mt-0.5 text-sm text-muted-foreground">{formatMutationArgsReadable(mutation.args)}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {notes.length > 0 ? (
          <section>
            <h4 className="mb-1.5 text-sm font-semibold">{labels.notes}</h4>
            <ul className="space-y-1">
              {notes.map((note, index) => (
                <li key={`${note}-${index}`} className="text-xs text-muted-foreground">
                  • {note}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </PlanContent>

      <PlanFooter className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={onApply} disabled={!canApply || isApplying}>
          {labels.apply}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onUndo} disabled={!canUndo || isUndoing}>
          {labels.undo}
        </Button>
      </PlanFooter>
    </Plan>
  );
}
