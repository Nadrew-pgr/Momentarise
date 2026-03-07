import type { SyncChange, SyncDraft, SyncPreview, SyncQuestion } from "@momentarise/shared";

export type SyncChatRole = "system" | "user" | "assistant" | "tool";

export interface SyncChatMessage {
  id: string;
  seq: number;
  role: SyncChatRole;
  content: string;
  createdAt: Date;
  imageData?: string;
  planPreviews?: SyncPreview[];
  contextLinks?: SyncMessageContextLink[];
  delivery?: "sent" | "pending" | "failed";
}

export interface SyncMessageContextLink {
  kind: "capture" | "item";
  id: string;
  label: string;
  internalPath: string;
  source?: string;
  status?: string;
  captureType?: string;
}

export interface SyncToolTimelineEntry {
  id: string;
  seq: number;
  kind: "tool_call" | "tool_result";
  toolName?: string;
  status: string;
  summary?: string;
  createdAt: Date;
}

export interface SyncReasoningEntry {
  id: string;
  seq: number;
  summary?: string;
  content?: string;
  durationMs?: number;
}

export interface SyncSourceItem {
  id: string;
  title: string;
  url: string;
  snippet?: string;
}

export interface SyncSourcesEntry {
  id: string;
  seq: number;
  items: SyncSourceItem[];
}

export interface SyncTaskEntry {
  id: string;
  seq: number;
  taskId: string;
  title: string;
  status: "started" | "completed" | "failed";
  detail?: string;
  toolName?: string;
}

export interface SyncQueueEntry {
  id: string;
  seq: number;
  queueId: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  detail?: string;
}

export interface SyncNotice {
  id: string;
  seq: number;
  code: string;
  message: string;
  level: "warning" | "error";
}

export type SyncRunMode = "free" | "guided";

export interface SyncActionsViewModel {
  latestPreview: SyncPreview | null;
  latestQuestion: SyncQuestion | null;
  latestDraft: SyncDraft | null;
  changes: SyncChange[];
  toolTimeline: SyncToolTimelineEntry[];
  notices: SyncNotice[];
}
