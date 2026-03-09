import React, { useMemo } from "react";
import type { SyncPreview } from "@momentarise/shared";
import { Check, CheckCircle2, Sparkles, Undo2 } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

type PreviewPlanCardLabels = {
  title: string;
  titleFallback?: string;
  entityEvent: string;
  entityItem: string;
  entityCapture: string;
  entityTimeline: string;
  entityUnknown: string;
  pending: string;
  applied: string;
  apply: string;
  applying: string;
  undo: string;
  schedule: string;
  linkedProject: string;
  linkedSeries: string;
  targetEvent: string;
  targetItem: string;
  descriptionPrefix: string;
};

type PreviewMutation = {
  kind: string;
  args: Record<string, unknown>;
  display_summary?: string;
};

type MutationBlock = {
  key: string;
  primaryLine?: string;
  description?: string;
};

type Props = {
  preview: SyncPreview;
  isApplied: boolean;
  isApplying: boolean;
  isUndoing: boolean;
  canApply: boolean;
  canUndo: boolean;
  onApply: (previewId: string) => void;
  onUndo: (previewId: string) => void;
  labels: PreviewPlanCardLabels;
};

const COLOR_VALUE_MAP: Record<string, string> = {
  sky: "#38bdf8",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  emerald: "#10b981",
  orange: "#f97316",
};

const DEFAULT_ACCENT = "#6366f1";

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const isShort = normalized.length === 3;
  const expanded = isShort
    ? normalized
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
    : normalized;
  const intVal = Number.parseInt(expanded, 16);
  if (Number.isNaN(intVal) || expanded.length !== 6) return `rgba(99, 102, 241, ${alpha})`;
  const r = (intVal >> 16) & 255;
  const g = (intVal >> 8) & 255;
  const b = intVal & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function extractMutations(preview: SyncPreview): PreviewMutation[] {
  const diff = preview.diff_json as Record<string, unknown>;
  const multi = diff.mutations;
  if (Array.isArray(multi)) {
    const parsed: PreviewMutation[] = [];
    for (const entry of multi) {
      if (!entry || typeof entry !== "object") continue;
      const raw = entry as Record<string, unknown>;
      parsed.push({
        kind: typeof raw.kind === "string" ? raw.kind : "mutation",
        args: raw.args && typeof raw.args === "object" ? (raw.args as Record<string, unknown>) : {},
        display_summary:
          typeof raw.display_summary === "string" && raw.display_summary.trim()
            ? raw.display_summary.trim()
            : undefined,
      });
    }
    return parsed;
  }

  const single = diff.mutation;
  if (single && typeof single === "object") {
    const raw = single as Record<string, unknown>;
    return [
      {
        kind: typeof raw.kind === "string" ? raw.kind : "mutation",
        args: raw.args && typeof raw.args === "object" ? (raw.args as Record<string, unknown>) : {},
        display_summary:
          typeof raw.display_summary === "string" && raw.display_summary.trim()
            ? raw.display_summary.trim()
            : undefined,
      },
    ];
  }

  return [];
}

function extractSummary(preview: SyncPreview): string {
  const diff = preview.diff_json as Record<string, unknown>;
  const summary = diff.summary;
  if (typeof summary === "string" && summary.trim()) return summary.trim();
  return `${preview.action} · ${preview.entity_type}`;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
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

function formatMutationArgsReadable(args: Record<string, unknown>, labels: PreviewPlanCardLabels): string {
  const parts: string[] = [];
  const startAt = args.start_at;
  const endAt = args.end_at;

  if (typeof startAt === "string" && typeof endAt === "string") {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const startTime = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      const endTime = end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      parts.push(`${labels.schedule}: ${startTime} - ${endTime}`);
    }
  }

  if (args.project_id) parts.push(labels.linkedProject);
  if (args.series_id) parts.push(labels.linkedSeries);
  if (typeof args.target === "string") {
    parts.push(args.target === "event" ? labels.targetEvent : labels.targetItem);
  }

  if (parts.length > 0) return parts.join("\n");
  return "";
}

export function PreviewPlanCard({
  preview,
  isApplied,
  isApplying,
  isUndoing,
  canApply,
  canUndo,
  onApply,
  onUndo,
  labels,
}: Props) {
  const summary = useMemo(() => extractSummary(preview), [preview]);
  const mutations = useMemo(() => extractMutations(preview), [preview]);
  const hasDisplaySummary = useMemo(
    () => mutations.some((mutation) => Boolean(mutation.display_summary?.trim())),
    [mutations]
  );

  const titleInfo = useMemo(() => {
    let title: string | null = null;
    let colorValue: string = DEFAULT_ACCENT;
    for (const mutation of mutations) {
      if (!title && typeof mutation.args.title === "string" && mutation.args.title.trim()) {
        title = mutation.args.title.trim();
      }
      if (typeof mutation.args.color === "string") {
        const mappedColor = COLOR_VALUE_MAP[mutation.args.color.toLowerCase()];
        if (mappedColor) colorValue = mappedColor;
      }
    }
    return {
      title,
      colorValue,
    };
  }, [mutations]);
  const entityLabel = useMemo(
    () => resolveEntityLabel(preview.entity_type, labels),
    [labels, preview.entity_type]
  );
  const displayTitle = titleInfo.title ?? labels.titleFallback ?? labels.title;

  const mutationBlocks = useMemo<MutationBlock[]>(
    () =>
      mutations.reduce<MutationBlock[]>((acc, mutation, index) => {
        const primaryLine =
          mutation.display_summary ??
          formatMutationArgsReadable(mutation.args, labels);
        const rawDescription =
          typeof mutation.args.description === "string" ? mutation.args.description.trim() : "";
        const normalizedPrimary = primaryLine ? normalizeText(primaryLine) : "";
        const normalizedDescription = rawDescription ? normalizeText(rawDescription) : "";
        const showDescription =
          !mutation.display_summary &&
          Boolean(rawDescription) &&
          (!normalizedPrimary || !normalizedPrimary.includes(normalizedDescription));

        if (!primaryLine && !showDescription) return acc;

        acc.push({
          key: `${mutation.kind}-${index}`,
          primaryLine: primaryLine || undefined,
          description: showDescription ? rawDescription : undefined,
        });
        return acc;
      }, []),
    [labels, mutations]
  );

  const shouldShowSummary = useMemo(() => {
    if (!summary || hasDisplaySummary) return false;
    const normalizedSummary = normalizeText(summary);
    return !mutationBlocks.some(
      (block) => Boolean(block.primaryLine && normalizeText(block.primaryLine) === normalizedSummary)
    );
  }, [hasDisplaySummary, mutationBlocks, summary]);

  return (
    <View className="w-full rounded-2xl border border-border bg-card px-4 py-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="min-w-0 flex-row items-center gap-3">
          <View
            className="h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: hexToRgba(titleInfo.colorValue, 0.18) }}
          >
            <Sparkles size={15} color={titleInfo.colorValue} />
          </View>
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {entityLabel}
            </Text>
            <Text className="flex-1 text-[16px] font-semibold text-foreground" numberOfLines={1}>
              {displayTitle}
            </Text>
          </View>
        </View>
        {isApplied ? (
          <View className="flex-row items-center rounded-full bg-emerald-500/10 px-2 py-1">
            <CheckCircle2 size={12} className="mr-1 text-emerald-600" />
            <Text className="text-[11px] font-medium text-emerald-600">{labels.applied}</Text>
          </View>
        ) : (
          <View className="rounded-full bg-amber-500/10 px-2 py-1">
            <Text className="text-[11px] font-medium text-amber-700">{labels.pending}</Text>
          </View>
        )}
      </View>

      {shouldShowSummary ? (
        <Text className="mb-2 text-[14px] leading-6 text-muted-foreground">{summary}</Text>
      ) : null}

      {mutationBlocks.map((block) => {

        return (
          <View key={block.key} className="mb-2 border-l-2 border-primary/30 pl-3">
            {block.primaryLine ? (
              <Text className="text-[13px] leading-5 text-muted-foreground">{block.primaryLine}</Text>
            ) : null}
            {block.description ? (
              <Text className="mt-1 text-[13px] italic leading-5 text-muted-foreground">
                {labels.descriptionPrefix}: {block.description}
              </Text>
            ) : null}
          </View>
        );
      })}

      <View className="mt-2 flex-row items-center gap-2">
        {!isApplied ? (
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center rounded-full bg-primary px-4 py-2.5"
            onPress={() => onApply(preview.id)}
            disabled={!canApply || isApplying}
          >
            <Check size={15} className="mr-1.5 text-primary-foreground" />
            <Text className="text-sm font-semibold text-primary-foreground">
              {isApplying ? labels.applying : labels.apply}
            </Text>
          </TouchableOpacity>
        ) : null}

        {canUndo ? (
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center rounded-full border border-border bg-background px-4 py-2.5"
            onPress={() => onUndo(preview.id)}
            disabled={isUndoing}
          >
            <Undo2 size={15} className="mr-1.5 text-foreground" />
            <Text className="text-sm font-semibold text-foreground">{labels.undo}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
