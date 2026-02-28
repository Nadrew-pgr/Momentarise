import type { SyncChange, SyncDraft, SyncPreview, SyncQuestion } from "@momentarise/shared";

export type SyncChatRole = "system" | "user" | "assistant" | "tool";

export interface SyncChatMessage {
  id: string;
  seq: number;
  role: SyncChatRole;
  content: string;
  createdAt: Date;
  imageData?: string;
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

export interface SyncNotice {
  id: string;
  seq: number;
  code: string;
  message: string;
  level: "warning" | "error";
}

export interface SyncActionsViewModel {
  latestPreview: SyncPreview | null;
  latestQuestion: SyncQuestion | null;
  latestDraft: SyncDraft | null;
  changes: SyncChange[];
  toolTimeline: SyncToolTimelineEntry[];
  notices: SyncNotice[];
}
