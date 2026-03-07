import type { SyncPreview } from "@momentarise/shared";
import { Check, CheckCircle2, FileText } from "lucide-react";
import {
  Plan,
  PlanContent,
  PlanHeader,
  PlanTrigger,
} from "@/components/ai-elements/plan";
import { Button } from "@/components/ui/button";

interface PreviewPlanCardLabels {
  title: string;
  planTitle?: string;
  titleFallback?: string;
  entityEvent: string;
  entityItem: string;
  entityCapture: string;
  entityTimeline: string;
  entityUnknown: string;
  summary: string;
  mutations: string;
  notes: string;
  apply: string;
  undo: string;
  applied?: string;
  pending: string;
  applying: string;
  schedule: string;
  linkedProject: string;
  linkedSeries: string;
  targetEvent: string;
  targetItem: string;
  descriptionPrefix: string;
}

interface PreviewPlanCardProps {
  preview: SyncPreview | null;
  canApply: boolean;
  canUndo: boolean;
  isApplying: boolean;
  isUndoing: boolean;
  isApplied?: boolean;
  onApply: () => void;
  onUndo: () => void;
  labels: PreviewPlanCardLabels;
}

interface PreviewMutation {
  kind: string;
  args: Record<string, unknown>;
  display_summary?: string;
}

const COLOR_MAP: Record<string, string> = {
  sky: "var(--sync-chat-preview-dot-sky)",
  amber: "var(--sync-chat-preview-dot-amber)",
  violet: "var(--sync-chat-preview-dot-violet)",
  rose: "var(--sync-chat-preview-dot-rose)",
  emerald: "var(--sync-chat-preview-dot-emerald)",
  orange: "var(--sync-chat-preview-dot-orange)",
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

function extractMainTitleInfo(mutations: PreviewMutation[]): { title: string | null; colorToken: string } {
  let title: string | null = null;
  let colorToken = "var(--sync-chat-preview-dot-default)";

  for (const mut of mutations) {
    if (typeof mut.args.title === "string" && mut.args.title.trim()) {
      if (!title) title = mut.args.title.trim();
    }
    if (typeof mut.args.color === "string" && mut.args.color.trim()) {
      const mapped = COLOR_MAP[mut.args.color.toLowerCase()];
      if (mapped) colorToken = mapped;
    }
  }

  return { title, colorToken };
}

function resolveEntityLabel(entityType: string, labels: PreviewPlanCardLabels): string {
  const normalized = entityType.trim().toLowerCase();
  if (!normalized) return labels.entityUnknown;
  if (normalized.includes("event")) return labels.entityEvent;
  if (normalized.includes("item")) return labels.entityItem;
  if (normalized.includes("timeline")) return labels.entityTimeline;
  if (normalized.includes("inbox") || normalized.includes("capture")) return labels.entityCapture;
  return labels.entityUnknown;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function formatMutationArgsReadable(
  args: Record<string, unknown>,
  labels: PreviewPlanCardLabels
): string {
  const parts: string[] = [];

  const startAt = args.start_at;
  const endAt = args.end_at;

  if (typeof startAt === "string" && typeof endAt === "string") {
    try {
      const start = new Date(startAt);
      const end = new Date(endAt);
      const startTime = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      const endTime = end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      let diffMs = end.getTime() - start.getTime();
      if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
      const totalMins = Math.round(diffMs / 60000);
      const durationStr = totalMins >= 60
        ? (totalMins % 60 === 0 ? `${Math.floor(totalMins / 60)} h` : `${Math.floor(totalMins / 60)} h ${totalMins % 60}`)
        : `${totalMins} min`;
      parts.push(`${labels.schedule}: ${startTime} - ${endTime} (${durationStr})`);
    } catch {
      parts.push(`${labels.schedule}: ${String(startAt)} - ${String(endAt)}`);
    }
  } else if (typeof startAt === "string") {
    try {
      const start = new Date(startAt);
      parts.push(
        `${labels.schedule}: ${start.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      );
    } catch {
      parts.push(`${labels.schedule}: ${startAt}`);
    }
  }

  if (args.project_id) {
    parts.push(labels.linkedProject);
  }
  if (args.series_id) {
    parts.push(labels.linkedSeries);
  }

  const target = args.target;
  if (typeof target === "string" && target.trim()) {
    parts.push(target === "event" ? labels.targetEvent : labels.targetItem);
  }

  if (parts.length > 0) return parts.join("\n");

  const fallbackArgs = { ...args };
  delete fallbackArgs.title;
  delete fallbackArgs.color;
  const keys = Object.keys(fallbackArgs);
  if (keys.length === 0) return "";

  const compact = JSON.stringify(fallbackArgs);
  return compact.length <= 180 ? compact : `${compact.slice(0, 177)}...`;
}

export function PreviewPlanCard({
  preview,
  canApply,
  canUndo,
  isApplying,
  isUndoing,
  isApplied = false,
  onApply,
  onUndo,
  labels,
}: PreviewPlanCardProps) {
  if (!preview) return null;

  const summary = extractSummary(preview);
  const mutations = extractMutations(preview);
  const notes = extractNotes(preview);
  const { title: momentTitle, colorToken } = extractMainTitleInfo(mutations);
  const entityLabel = resolveEntityLabel(preview.entity_type, labels);
  const hasDisplaySummary = mutations.some((mutation) => Boolean(mutation.display_summary?.trim()));

  const isAppliedState = isApplied;
  const displayTitle = momentTitle || labels.planTitle || labels.titleFallback || labels.title;

  const mutationBlocks = mutations
    .map((mutation, index) => {
      const displaySummary =
        typeof mutation.display_summary === "string" && mutation.display_summary.trim()
          ? mutation.display_summary.trim()
          : null;
      const readableArgs = formatMutationArgsReadable(mutation.args, labels);
      const rawDescription =
        typeof mutation.args.description === "string" ? mutation.args.description.trim() : "";

      const primaryLine = displaySummary ?? readableArgs;
      const normalizedPrimary = primaryLine ? normalizeText(primaryLine) : "";
      const normalizedDescription = rawDescription ? normalizeText(rawDescription) : "";
      const shouldShowDescription =
        !displaySummary &&
        Boolean(rawDescription) &&
        normalizedDescription.length > 0 &&
        (!normalizedPrimary || !normalizedPrimary.includes(normalizedDescription));

      if (!primaryLine && !shouldShowDescription) return null;

      return {
        key: `${mutation.kind}-${index}`,
        primaryLine,
        description: shouldShowDescription ? rawDescription : null,
      };
    })
    .filter(
      (
        block
      ): block is {
        key: string;
        primaryLine: string;
        description: string | null;
      } => block !== null && block.primaryLine !== null
    );

  const normalizedSummary = summary ? normalizeText(summary) : "";
  const summaryDupedInMutations =
    normalizedSummary.length > 0 &&
    mutationBlocks.some((block) => Boolean(block.primaryLine && normalizeText(block.primaryLine) === normalizedSummary));
  const showSummary = Boolean(summary && !hasDisplaySummary && !summaryDupedInMutations);

  return (
    <Plan
      className="sync-chat-preview-card w-full max-w-full overflow-hidden rounded-2xl border border-border/50 bg-background shadow-md transition-all"
      defaultOpen
    >
      <div className="relative p-4 sm:p-5">
        <PlanHeader className="mb-4 flex items-center justify-between p-0">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: `color-mix(in srgb, ${colorToken} 20%, transparent)`,
              }}
            >
              <FileText className="h-4 w-4" style={{ color: colorToken }} />
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {entityLabel}
                </span>
                <h3 className="truncate text-base font-semibold leading-tight text-foreground">
                  {displayTitle}
                </h3>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAppliedState ? (
              <span className="sync-chat-preview-pill sync-chat-preview-pill-applied flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide">
                <CheckCircle2 className="h-3 w-3" />
                {labels.applied ?? labels.apply}
              </span>
            ) : (
              <span className="sync-chat-preview-pill sync-chat-preview-pill-pending rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide">
                {labels.pending}
              </span>
            )}
            <PlanTrigger />
          </div>
        </PlanHeader>

        <PlanContent className="space-y-4 px-0 pb-0 pt-0">
          {showSummary ? (
            <div className="px-1 mt-2">
              <div className="text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {summary}
              </div>
            </div>
          ) : null}

          {mutationBlocks.length > 0 && (
            <div className="px-1 space-y-3">
              {mutationBlocks.map((block) => {
                return (
                  <div key={block.key} className="flex flex-col gap-1.5 border-l-2 border-primary/30 pl-3">
                    {block.primaryLine ? (
                      <p className="whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">{block.primaryLine}</p>
                    ) : null}
                    {block.description ? (
                      <p className="whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground/90 italic">
                        {labels.descriptionPrefix}: {block.description}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {notes.length > 0 && (
            <div className="px-1">
              <ul className="space-y-1.5">
                {notes.map((note, index) => (
                  <li key={`${note}-${index}`} className="flex items-start gap-2 text-[12px] text-muted-foreground/80">
                    <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
                    <span className="leading-snug">{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </PlanContent>

        {!isAppliedState && (
          <div className="mt-5 flex items-center gap-2 pt-1">
            <Button
              className="w-full font-medium shadow-sm transition-all hover:bg-primary/90"
              size="sm"
              type="button"
              onClick={onApply}
              disabled={!canApply || isApplying}
            >
              {isApplying ? (
                labels.applying
              ) : (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  {labels.apply}
                </>
              )}
            </Button>
            {canUndo && (
              <Button
                className="w-full shadow-none"
                variant="secondary"
                size="sm"
                type="button"
                onClick={onUndo}
                disabled={isUndoing}
              >
                {labels.undo}
              </Button>
            )}
          </div>
        )}
      </div>
    </Plan>
  );
}
