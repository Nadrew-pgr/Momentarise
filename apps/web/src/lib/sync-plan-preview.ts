import type { SyncPreview } from "@momentarise/shared";
import { syncPreviewSchema } from "@momentarise/shared";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function extractPlanPreviewsFromContentJson(
  contentJson: Record<string, unknown> | null | undefined
): SyncPreview[] {
  if (!isRecord(contentJson)) return [];
  const metadata = contentJson.metadata;
  if (!isRecord(metadata)) return [];
  const planPreview = metadata.plan_preview;
  if (!isRecord(planPreview)) return [];
  const previewsRaw = Array.isArray(planPreview.previews) ? planPreview.previews : [];

  const previews: SyncPreview[] = [];
  for (const entry of previewsRaw) {
    const parsed = syncPreviewSchema.safeParse(entry);
    if (parsed.success) {
      previews.push(parsed.data);
    }
  }
  return previews;
}

export function upsertPreviewList(
  current: SyncPreview[],
  next: SyncPreview
): SyncPreview[] {
  const rest = current.filter((preview) => preview.id !== next.id);
  return [...rest, next].sort((a, b) => a.seq - b.seq);
}
