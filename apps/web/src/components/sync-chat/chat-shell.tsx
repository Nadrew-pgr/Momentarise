"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import type {
  SyncApply,
  SyncContextSearchResult,
  SyncEventEnvelope,
  SyncMessage,
  SyncPreview,
  SyncQuestion,
  SyncRunSummary,
} from "@momentarise/shared";
import { InteractiveQuestionUI } from "./interactive-question-ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useApplySyncRun,
  useCreateSyncRun,
  useDeleteSyncRun,
  usePatchSyncRun,
  useSyncChanges,
  useSyncContextSearch,
  useSyncModels,
  useSyncRunEvents,
  useSyncRuns,
  useSyncStream,
  useUndoSyncRun,
} from "@/hooks/use-sync";
import { useUploadCapture } from "@/hooks/use-inbox";
import { fetchWithAuth } from "@/lib/bff-client";
import { extractPlanPreviewsFromContentJson, upsertPreviewList } from "@/lib/sync-plan-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Composer } from "./composer";
import { ConversationView } from "./conversation-view";
import { HistoryDrawer } from "./history-drawer";
import type {
  SyncChatMessage,
  SyncMessageContextLink,
  SyncNotice,
  SyncQueueEntry,
  SyncReasoningEntry,
  SyncRunMode,
  SyncSourcesEntry,
  SyncTaskEntry,
} from "./types";

const MODEL_STORAGE_KEY = "sync-selected-model";
const MODE_STORAGE_KEY = "momentarise_sync_mode";

interface PendingUserMessage {
  id: string;
  content: string;
  createdAt: Date;
  status: "pending" | "failed";
  contextLinks?: SyncMessageContextLink[];
}

type ContextEntryStatus = "uploading" | "processing" | "ready" | "failed";

interface SyncComposerContextEntry {
  local_id: string;
  token_key: string;
  token_text: string;
  kind: "attachment" | "reference";
  label: string;
  status: ContextEntryStatus;
  capture_id?: string;
  source?: "upload" | "inbox";
  reference_kind?: "capture" | "item";
  reference_id?: string;
  internal_path: string;
  error?: string;
}

interface ComposerMentionState {
  start: number;
  end: number;
  query: string;
  highlightedIndex: number;
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function extractMessageContent(message: SyncMessage): string {
  const textCandidate = message.content_json.text;
  if (typeof textCandidate === "string") return textCandidate;

  const contentCandidate = message.content_json.content;
  if (typeof contentCandidate === "string") return contentCandidate;

  try {
    return JSON.stringify(message.content_json, null, 2);
  } catch {
    return "";
  }
}

function extractMessageContextLinks(message: SyncMessage): SyncMessageContextLink[] {
  const metadataCandidate = message.content_json.metadata;
  if (!metadataCandidate || typeof metadataCandidate !== "object") return [];
  const syncContextCandidate = (metadataCandidate as Record<string, unknown>).sync_context;
  if (!syncContextCandidate || typeof syncContextCandidate !== "object") return [];
  const resolvedCandidate = (syncContextCandidate as Record<string, unknown>).resolved;
  if (!Array.isArray(resolvedCandidate)) return [];

  const resolvedLinks: SyncMessageContextLink[] = [];
  for (const entry of resolvedCandidate) {
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as Record<string, unknown>;
    const kind = raw.kind;
    const id = raw.id;
    const label = raw.label;
    const internalPath = raw.internal_path;
    if (
      (kind !== "capture" && kind !== "item") ||
      typeof id !== "string" ||
      typeof label !== "string" ||
      typeof internalPath !== "string" ||
      !internalPath.startsWith("/")
    ) {
      continue;
    }
    resolvedLinks.push({
      kind,
      id,
      label,
      internalPath,
      source: typeof raw.source === "string" ? raw.source : undefined,
      status: typeof raw.status === "string" ? raw.status : undefined,
      captureType: typeof raw.capture_type === "string" ? raw.capture_type : undefined,
    });
  }
  return resolvedLinks;
}

function resolveCaptureTypeFromFile(file: File): "photo" | "voice" | "file" {
  const mime = file.type.toLowerCase();
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("audio/")) return "voice";
  return "file";
}

function upsertBySeq(messages: SyncChatMessage[], next: SyncChatMessage): SyncChatMessage[] {
  const rest = messages.filter((message) => message.seq !== next.seq && message.id !== next.id);
  return [...rest, next].sort((a, b) => a.seq - b.seq);
}

function upsertPreviewQueue(current: SyncPreview[], next: SyncPreview): SyncPreview[] {
  return upsertPreviewList(current, next);
}

function resolveMessagePreviews(
  role: SyncMessage["role"],
  messagePreviews: SyncPreview[],
  pendingQueue: SyncPreview[]
): { planPreviews: SyncPreview[]; nextQueue: SyncPreview[] } {
  if (role !== "assistant" && role !== "tool") {
    return { planPreviews: messagePreviews, nextQueue: pendingQueue };
  }

  if (messagePreviews.length > 0) {
    const previewIdSet = new Set(messagePreviews.map((preview) => preview.id));
    return {
      planPreviews: messagePreviews,
      nextQueue: pendingQueue.filter((preview) => !previewIdSet.has(preview.id)),
    };
  }

  if (pendingQueue.length > 0) {
    return {
      planPreviews: pendingQueue.slice().sort((a, b) => a.seq - b.seq),
      nextQueue: [],
    };
  }

  return { planPreviews: [], nextQueue: pendingQueue };
}

function attachPreviewToLastAssistantMessage(
  messages: SyncChatMessage[],
  previews: SyncPreview[]
): SyncChatMessage[] {
  if (previews.length === 0) return messages;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role !== "assistant" && messages[index].role !== "tool") continue;
    const nextMessages = [...messages];
    let existing = nextMessages[index].planPreviews ?? [];
    for (const preview of previews) {
      existing = upsertPreviewList(existing, preview);
    }
    nextMessages[index] = {
      ...nextMessages[index],
      planPreviews: existing,
    };
    return nextMessages;
  }
  return messages;
}

function resolveSyncApplyOpenPath(applied: SyncApply): string {
  if (applied.open_target_kind === "item") {
    if (applied.open_target_id) return `/inbox/items/${applied.open_target_id}`;
    return "/inbox/items";
  }

  if (applied.open_target_kind === "event") {
    if (applied.open_target_date) {
      return `/timeline?date=${encodeURIComponent(applied.open_target_date)}`;
    }
    return "/timeline";
  }

  if (applied.open_target_date) {
    return `/timeline?date=${encodeURIComponent(applied.open_target_date)}`;
  }
  return "/timeline";
}

function isUuid(value: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resolveRunTitle(run: SyncRunSummary | null): string | null {
  if (!run) return null;
  if (run.title?.trim()) return run.title.trim();
  if (run.last_message_preview?.trim()) return run.last_message_preview.trim();
  return run.id.slice(0, 8);
}

function detectMentionAtCursor(
  value: string,
  selection: { start: number; end: number }
): { start: number; end: number; query: string } | null {
  if (selection.start !== selection.end) return null;
  const cursor = selection.start;
  const beforeCursor = value.slice(0, cursor);
  const atIndex = beforeCursor.lastIndexOf("@");
  if (atIndex < 0) return null;

  const previousChar = atIndex === 0 ? " " : beforeCursor[atIndex - 1];
  if (!/[\s([{'"`]/.test(previousChar)) return null;

  const token = beforeCursor.slice(atIndex + 1);
  if (token.includes("@") || /\s/.test(token)) return null;

  return {
    start: atIndex,
    end: cursor,
    query: token,
  };
}

function normalizeContextTokenLabel(label: string): string {
  const compact = label.replace(/\s+/g, " ").trim().replace(/^@+/, "");
  if (!compact) return "context";
  return compact;
}

function buildUniqueContextTokenText(
  label: string,
  entries: SyncComposerContextEntry[],
  excludeLocalId?: string
): string {
  const base = normalizeContextTokenLabel(label);
  let candidate = `@${base}`;
  let suffix = 2;
  while (
    entries.some(
      (entry) => entry.local_id !== excludeLocalId && entry.token_text.toLowerCase() === candidate.toLowerCase()
    )
  ) {
    candidate = `@${base} (${suffix})`;
    suffix += 1;
  }
  return candidate;
}

function countContextTokenOccurrences(value: string, tokenText: string): number {
  if (!tokenText) return 0;
  const escaped = tokenText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "gi");
  return Array.from(value.matchAll(matcher)).length;
}

function insertContextTokenInText(
  value: string,
  tokenText: string,
  range: { start: number; end: number }
): { value: string; cursor: number } {
  const safeStart = Math.max(0, Math.min(range.start, value.length));
  const safeEnd = Math.max(safeStart, Math.min(range.end, value.length));
  const before = value.slice(0, safeStart);
  const after = value.slice(safeEnd);
  const tokenChunk = `${tokenText} `;
  const needsSpaceBefore = before.length > 0 && !/\s$/.test(before);
  const needsSpaceAfter = after.length > 0 && !/^\s/.test(after);
  const inserted = `${needsSpaceBefore ? " " : ""}${tokenChunk}${needsSpaceAfter ? " " : ""}`;
  const nextValue = `${before}${inserted}${after}`;
  const nextCursor = before.length + inserted.length;
  return { value: nextValue, cursor: nextCursor };
}

function removeContextTokenFromText(value: string, tokenText: string): string {
  if (!tokenText || !value) return value;
  const escaped = tokenText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "i");
  const next = value.replace(matcher, (match, prefix: string) => (prefix ? " " : ""));
  return next.replace(/\s{2,}/g, " ").trimStart();
}

export function SyncChatShell() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [runId, setRunId] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [runMode, setRunMode] = useState<SyncRunMode>("free");

  const [messages, setMessages] = useState<SyncChatMessage[]>([]);
  const [pendingUserMessages, setPendingUserMessages] = useState<PendingUserMessage[]>([]);
  const [streamingAssistantBuffer, setStreamingAssistantBuffer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const [latestPreview, setLatestPreview] = useState<SyncPreview | null>(null);
  const [latestQuestion, setLatestQuestion] = useState<SyncQuestion | null>(null);
  const [appliedPreviewIds, setAppliedPreviewIds] = useState<string[]>([]);
  const [notices, setNotices] = useState<SyncNotice[]>([]);
  const [reasoningEntries, setReasoningEntries] = useState<SyncReasoningEntry[]>([]);
  const [sourcesEntries, setSourcesEntries] = useState<SyncSourcesEntry[]>([]);
  const [taskEntries, setTaskEntries] = useState<SyncTaskEntry[]>([]);
  const [queueEntries, setQueueEntries] = useState<SyncQueueEntry[]>([]);

  const [transportError, setTransportError] = useState<string | null>(null);
  const [pendingRetryMessage, setPendingRetryMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isHydratingRun, setIsHydratingRun] = useState(false);
  const [contextEntries, setContextEntries] = useState<SyncComposerContextEntry[]>([]);
  const [isContextPickerOpen, setIsContextPickerOpen] = useState(false);
  const [contextPickerQuery, setContextPickerQuery] = useState("");
  const [selectedContextResults, setSelectedContextResults] = useState<
    Record<string, SyncContextSearchResult>
  >({});
  const [mentionState, setMentionState] = useState<ComposerMentionState | null>(null);
  const [composerSelection, setComposerSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const [composerSelectionOverride, setComposerSelectionOverride] = useState<{
    key: number;
    start: number;
    end: number;
  } | null>(null);
  const [deleteRunTarget, setDeleteRunTarget] = useState<SyncRunSummary | null>(null);
  const historyHydrationNoticeId = useMemo(
    () => (runId ? `history-hydration-slow-${runId}` : null),
    [runId]
  );

  const seqSeenRef = useRef<Set<number>>(new Set());
  const lastSeqRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const didInitFromQueryRef = useRef(false);
  const pendingPreviewQueueRef = useRef<SyncPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectionOverrideKeyRef = useRef(0);

  const { data: models = [] } = useSyncModels();
  const { data: runs = [], isLoading: isLoadingRuns } = useSyncRuns();
  const { data: changes = [] } = useSyncChanges(runId);
  const { data: contextSearchResults = [], isLoading: isContextSearchLoading } = useSyncContextSearch(
    contextPickerQuery,
    12,
    isContextPickerOpen
  );
  const mentionSearchEnabled = Boolean(mentionState) && !isContextPickerOpen;
  const mentionQuery = mentionState?.query ?? "";
  const {
    data: mentionSearchResults = [],
    isLoading: isMentionSearchLoading,
    error: mentionSearchError,
  } = useSyncContextSearch(
    mentionQuery,
    8,
    mentionSearchEnabled
  );
  const { data: runEvents = [], isLoading: isLoadingRunEvents, error: runEventsError } = useSyncRunEvents(
    isHydratingRun ? runId : null,
    0
  );

  const createRun = useCreateSyncRun();
  const applyRun = useApplySyncRun();
  const undoRun = useUndoSyncRun();
  const patchRun = usePatchSyncRun();
  const deleteRun = useDeleteSyncRun();
  const uploadCapture = useUploadCapture();

  const resetLocalState = useCallback(() => {
    setMessages([]);
    setPendingUserMessages([]);
    setStreamingAssistantBuffer("");
    setIsStreaming(false);
    setLatestPreview(null);
    setLatestQuestion(null);
    setAppliedPreviewIds([]);
    setNotices([]);
    setReasoningEntries([]);
    setSourcesEntries([]);
    setTaskEntries([]);
    setQueueEntries([]);
    setTransportError(null);
    setPendingRetryMessage(null);
    setContextEntries([]);
    setSelectedContextResults({});
    setContextPickerQuery("");
    setIsContextPickerOpen(false);
    setMentionState(null);
    setComposerSelectionOverride(null);
    setComposerSelection({ start: 0, end: 0 });

    lastSeqRef.current = 0;
    seqSeenRef.current = new Set();
    pendingPreviewQueueRef.current = [];
  }, []);

  useEffect(() => {
    if (!mentionState) return;
    setMentionState((prev) => {
      if (!prev) return prev;
      const maxIndex = Math.max(0, mentionSearchResults.length - 1);
      if (prev.highlightedIndex <= maxIndex) return prev;
      return { ...prev, highlightedIndex: maxIndex };
    });
  }, [mentionSearchResults.length, mentionState]);

  useEffect(() => {
    if (!isContextPickerOpen) return;
    setMentionState(null);
  }, [isContextPickerOpen]);

  const appendNotice = useCallback((next: SyncNotice) => {
    setNotices((prev) => {
      const merged = [next, ...prev.filter((item) => item.id !== next.id)];
      return merged.slice(0, 8);
    });
  }, []);

  const appendReasoning = useCallback((next: SyncReasoningEntry) => {
    setReasoningEntries((prev) => {
      const merged = [next, ...prev.filter((entry) => entry.id !== next.id)];
      return merged.slice(0, 20);
    });
  }, []);

  const appendSources = useCallback((next: SyncSourcesEntry) => {
    setSourcesEntries((prev) => {
      const merged = [next, ...prev.filter((entry) => entry.id !== next.id)];
      return merged.slice(0, 20);
    });
  }, []);

  const appendTaskEntry = useCallback((next: SyncTaskEntry) => {
    setTaskEntries((prev) => {
      const merged = [next, ...prev.filter((entry) => entry.id !== next.id)];
      return merged.slice(0, 40);
    });
  }, []);

  const appendQueueEntry = useCallback((next: SyncQueueEntry) => {
    setQueueEntries((prev) => {
      const merged = [next, ...prev.filter((entry) => entry.id !== next.id)];
      return merged.slice(0, 40);
    });
  }, []);

  const handleStreamEvent = useCallback((event: SyncEventEnvelope) => {
    if (seqSeenRef.current.has(event.seq)) return;
    seqSeenRef.current.add(event.seq);

    const nextSeq = Math.max(lastSeqRef.current, event.seq);
    lastSeqRef.current = nextSeq;

    switch (event.type) {
      case "token": {
        setIsStreaming(true);
        setStreamingAssistantBuffer((prev) => `${prev}${event.payload.delta}`);
        break;
      }

      case "message": {
        const payload = event.payload;
        const planPreviewsFromMessage = extractPlanPreviewsFromContentJson(payload.content_json);
        const { planPreviews, nextQueue } = resolveMessagePreviews(
          payload.role,
          planPreviewsFromMessage,
          pendingPreviewQueueRef.current
        );
        pendingPreviewQueueRef.current = nextQueue;
        const nextMessage: SyncChatMessage = {
          id: payload.id,
          seq: event.seq,
          role: payload.role,
          content: extractMessageContent(payload),
          createdAt: new Date(payload.created_at),
          planPreviews: planPreviews.length > 0 ? planPreviews : undefined,
          contextLinks: extractMessageContextLinks(payload),
          delivery: "sent",
        };

        setMessages((prev) => upsertBySeq(prev, nextMessage));
        if (planPreviews.length > 0) {
          const latestFromMessage = planPreviews.slice().sort((a, b) => b.seq - a.seq)[0] ?? null;
          if (latestFromMessage) setLatestPreview(latestFromMessage);
        }
        if (payload.role === "user") {
          setPendingUserMessages((prev) => {
            if (prev.length === 0) return prev;
            const nextContent = nextMessage.content.trim().toLowerCase();
            const index = prev.findIndex(
              (item) => item.content.trim().toLowerCase() === nextContent
            );
            if (index === -1) return prev;
            return prev.filter((_, idx) => idx !== index);
          });
        }
        setStreamingAssistantBuffer("");
        setPendingRetryMessage(null);
        break;
      }

      case "question":
        setLatestQuestion(event.payload);
        break;

      case "draft":
        break;

      case "preview":
        pendingPreviewQueueRef.current = upsertPreviewQueue(
          pendingPreviewQueueRef.current,
          event.payload
        );
        setLatestPreview(event.payload);
        break;

      case "applied":
        setAppliedPreviewIds((prev) => {
          const nextId = event.payload.preview_id;
          if (prev.includes(nextId)) return prev;
          return [...prev, nextId];
        });
        break;

      case "undone":
        break;

      case "tool_call": {
        const payload = event.payload;
        appendTaskEntry({
          id: `${event.run_id}-${event.seq}-task`,
          seq: event.seq,
          taskId: payload.tool_call_id,
          title: payload.tool_name,
          status: payload.status,
          detail: payload.status === "started" ? undefined : payload.status,
          toolName: payload.tool_name,
        });
        appendQueueEntry({
          id: `${event.run_id}-${event.seq}-queue`,
          seq: event.seq,
          queueId: payload.tool_call_id,
          label: payload.tool_name,
          status:
            payload.status === "started"
              ? "running"
              : payload.status === "completed"
                ? "completed"
                : "failed",
          detail: payload.status,
        });
        break;
      }

      case "tool_result": {
        const payload = event.payload;
        appendTaskEntry({
          id: `${event.run_id}-${event.seq}-task-result`,
          seq: event.seq,
          taskId: payload.tool_call_id,
          title: payload.summary ?? "Tool result",
          status: payload.status,
          detail: payload.summary ?? undefined,
        });
        appendQueueEntry({
          id: `${event.run_id}-${event.seq}-queue-result`,
          seq: event.seq,
          queueId: payload.tool_call_id,
          label: payload.summary ?? "Tool result",
          status: payload.status === "completed" ? "completed" : "failed",
          detail: payload.status,
        });
        break;
      }

      case "reasoning": {
        const payload = event.payload;
        appendReasoning({
          id: `${event.run_id}-${event.seq}-reasoning`,
          seq: event.seq,
          summary: payload.summary ?? undefined,
          content: payload.content ?? undefined,
          durationMs:
            typeof payload.duration_ms === "number" && Number.isFinite(payload.duration_ms)
              ? payload.duration_ms
              : undefined,
        });
        break;
      }

      case "sources": {
        const payload = event.payload;
        const items =
          Array.isArray(payload.items)
            ? payload.items.reduce<SyncSourcesEntry["items"]>((acc, item, index) => {
              if (!item || typeof item !== "object") return acc;
              const raw = item as {
                id?: unknown;
                title?: unknown;
                url?: unknown;
                snippet?: unknown;
              };
              const title = typeof raw.title === "string" ? raw.title : "";
              const url = typeof raw.url === "string" ? raw.url : "";
              if (!title || !url) return acc;
              acc.push({
                id:
                  typeof raw.id === "string" && raw.id.trim()
                    ? raw.id
                    : `${event.run_id}-${event.seq}-${index}`,
                title,
                url,
                snippet: typeof raw.snippet === "string" ? raw.snippet : undefined,
              });
              return acc;
            }, [])
            : [];
        if (items.length === 0) break;
        appendSources({
          id: `${event.run_id}-${event.seq}-sources`,
          seq: event.seq,
          items,
        });
        break;
      }

      case "task": {
        const payload = event.payload;
        appendTaskEntry({
          id: `${event.run_id}-${event.seq}-task-explicit`,
          seq: event.seq,
          taskId: payload.task_id,
          title: payload.title,
          status: payload.status,
          detail: payload.detail ?? undefined,
          toolName: payload.tool_name ?? undefined,
        });
        break;
      }

      case "queue": {
        const payload = event.payload;
        appendQueueEntry({
          id: `${event.run_id}-${event.seq}-queue-explicit`,
          seq: event.seq,
          queueId: payload.queue_id,
          label: payload.label,
          status: payload.status,
          detail: payload.detail ?? undefined,
        });
        break;
      }

      case "warning":
        {
          const warningMessage =
            event.payload.code === "legacy_event_ignored"
              ? t("pages.sync.warning.legacyEventIgnored")
              : event.payload.message;
          appendNotice({
            id: `${event.run_id}-${event.seq}-warning`,
            seq: event.seq,
            code: event.payload.code,
            message: warningMessage,
            level: "warning",
          });
        }
        break;

      case "error":
        appendNotice({
          id: `${event.run_id}-${event.seq}-error`,
          seq: event.seq,
          code: event.payload.code,
          message: event.payload.message,
          level: "error",
        });
        break;

      case "done":
        if (pendingPreviewQueueRef.current.length > 0) {
          const orphanPreviews = pendingPreviewQueueRef.current.slice();
          pendingPreviewQueueRef.current = [];
          setMessages((prev) => attachPreviewToLastAssistantMessage(prev, orphanPreviews));
        }
        setIsStreaming(false);
        break;

      default:
        break;
    }
  }, [
    appendNotice,
    appendQueueEntry,
    appendReasoning,
    appendSources,
    appendTaskEntry,
    t,
  ]);

  const streamRun = useSyncStream(handleStreamEvent);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedModel = window.localStorage.getItem(MODEL_STORAGE_KEY);
    if (storedModel) setSelectedModel(storedModel);

    const savedMode = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (savedMode === "free" || savedMode === "guided") {
      setRunMode(savedMode as SyncRunMode);
    }
  }, []);

  useEffect(() => {
    if (didInitFromQueryRef.current) return;
    didInitFromQueryRef.current = true;
    const runFromQuery = searchParams.get("run");
    if (!isUuid(runFromQuery)) return;
    setRunId(runFromQuery);
    setIsHydratingRun(true);
  }, [searchParams]);

  useEffect(() => {
    const currentRun = searchParams.get("run");
    if (runId === currentRun || (!runId && !currentRun)) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    if (runId) nextParams.set("run", runId);
    else nextParams.delete("run");

    const nextQuery = nextParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, runId, searchParams]);

  useEffect(() => {
    if (selectedModel && selectedModel !== "auto") return;
    // Keep "auto" as the default — no need to forcibly pick a specific model
  }, [models, selectedModel]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isHydratingRun) return;
    if (!historyHydrationNoticeId) return;
    const timer = window.setTimeout(() => {
      appendNotice({
        id: historyHydrationNoticeId,
        seq: Number.MAX_SAFE_INTEGER - 1,
        code: "history_loading_slow",
        message: t("pages.sync.history.loadingSlow"),
        level: "warning",
      });
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [appendNotice, historyHydrationNoticeId, isHydratingRun, t]);

  useEffect(() => {
    if (!isHydratingRun) return;
    if (!runId) return;
    if (runEventsError) {
      setTransportError(toErrorMessage(runEventsError, t("pages.sync.error.generic")));
      if (historyHydrationNoticeId) {
        setNotices((prev) => prev.filter((notice) => notice.id !== historyHydrationNoticeId));
      }
      setIsHydratingRun(false);
      return;
    }
    if (isLoadingRunEvents) return;

    resetLocalState();
    for (const event of [...runEvents].sort((a, b) => a.seq - b.seq)) {
      handleStreamEvent(event);
    }
    if (historyHydrationNoticeId) {
      setNotices((prev) => prev.filter((notice) => notice.id !== historyHydrationNoticeId));
    }
    setIsHydratingRun(false);
  }, [
    historyHydrationNoticeId,
    handleStreamEvent,
    isHydratingRun,
    isLoadingRunEvents,
    resetLocalState,
    runEvents,
    runEventsError,
    runId,
    t,
  ]);

  const mappedModels = useMemo(
    () => models.map((model) => ({
      id: model.id,
      label: model.label,
      provider: model.provider,
      tier: model.tier,
      reasoning_levels: model.reasoning_levels,
    })),
    [models]
  );

  const mappedPendingMessages = useMemo<SyncChatMessage[]>(
    () =>
      pendingUserMessages.map((message, index) => ({
        id: `pending-${message.id}`,
        seq: Number.MAX_SAFE_INTEGER - 5000 + index,
        role: "user",
        content: message.content,
        createdAt: message.createdAt,
        contextLinks: message.contextLinks,
        delivery: message.status,
      })),
    [pendingUserMessages]
  );

  const activeRunSummary = useMemo(
    () => runs.find((entry) => entry.id === runId) ?? null,
    [runId, runs]
  );
  const activeConversationTitle = useMemo(
    () =>
      resolveRunTitle(activeRunSummary) ??
      (runId ? runId.slice(0, 8) : t("pages.sync.header.newConversation")),
    [activeRunSummary, runId, t]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("sync-chat:conversation-meta", {
        detail: {
          runId,
          title: activeConversationTitle,
        },
      })
    );
  }, [activeConversationTitle, runId]);

  const latestUndoableChange = useMemo(
    () => changes.find((change) => change.undoable) ?? null,
    [changes]
  );

  const maxContextEntries = 5;
  const contextEntryStatusLabels = useMemo(
    () => ({
      uploading: t("pages.sync.composer.contextStatus.uploading"),
      processing: t("pages.sync.composer.contextStatus.processing"),
      ready: t("pages.sync.composer.contextStatus.ready"),
      failed: t("pages.sync.composer.contextStatus.failed"),
    }),
    [t]
  );
  const canSendComposer = useMemo(
    () =>
      contextEntries.length <= maxContextEntries &&
      contextEntries.every((entry) => entry.status === "ready"),
    [contextEntries]
  );
  const isMentionPopoverVisible = useMemo(
    () => Boolean(mentionState) && !isContextPickerOpen,
    [isContextPickerOpen, mentionState]
  );

  const syncAttachmentsEnabled = process.env.NEXT_PUBLIC_SYNC_ATTACHMENTS_ENABLED !== "false";

  const updateContextEntry = useCallback(
    (localId: string, updater: (entry: SyncComposerContextEntry) => SyncComposerContextEntry) => {
      setContextEntries((prev) =>
        prev.map((entry) => (entry.local_id === localId ? updater(entry) : entry))
      );
    },
    []
  );

  const applyComposerSelectionOverride = useCallback((start: number, end: number = start) => {
    selectionOverrideKeyRef.current += 1;
    setComposerSelectionOverride({
      key: selectionOverrideKeyRef.current,
      start,
      end,
    });
    setComposerSelection({ start, end });
  }, []);

  const insertContextTokenAtSelection = useCallback(
    (tokenText: string, range?: { start: number; end: number }) => {
      let insertedCursor = 0;
      setComposerValue((prev) => {
        const safeRange = range ?? composerSelection;
        const insertion = insertContextTokenInText(prev, tokenText, safeRange);
        insertedCursor = insertion.cursor;
        return insertion.value;
      });
      applyComposerSelectionOverride(insertedCursor);
    },
    [applyComposerSelectionOverride, composerSelection]
  );

  const removeContextEntry = useCallback(
    (localId: string) => {
      const target = contextEntries.find((entry) => entry.local_id === localId);
      setContextEntries((prev) => prev.filter((entry) => entry.local_id !== localId));
      if (target?.token_text) {
        setComposerValue((prev) => removeContextTokenFromText(prev, target.token_text));
      }
    },
    [contextEntries]
  );

  useEffect(() => {
    if (contextEntries.length === 0) return;
    const tokenUsage = new Map<string, number>();
    const nextEntries = contextEntries.filter((entry) => {
      const used = tokenUsage.get(entry.token_text) ?? 0;
      const available = countContextTokenOccurrences(composerValue, entry.token_text);
      if (available > used) {
        tokenUsage.set(entry.token_text, used + 1);
        return true;
      }
      return false;
    });
    const removedCount = contextEntries.length - nextEntries.length;
    if (removedCount <= 0) return;
    setContextEntries(nextEntries);
    if (removedCount > 0) {
      console.info("[sync] context_token_removed_by_text_edit", { count: removedCount });
    }
  }, [composerValue, contextEntries]);

  const updateMentionState = useCallback(
    (nextValue: string, selection: { start: number; end: number }) => {
      const detectedMention = detectMentionAtCursor(nextValue, selection);
      if (!detectedMention) {
        setMentionState(null);
        return;
      }
      setMentionState((prev) => ({
        ...detectedMention,
        highlightedIndex:
          prev &&
            prev.start === detectedMention.start &&
            prev.end === detectedMention.end &&
            prev.query === detectedMention.query
            ? prev.highlightedIndex
            : 0,
      }));
    },
    []
  );

  const attachMentionReference = useCallback(
    (result: SyncContextSearchResult, preferredTokenText?: string) => {
      const duplicate = contextEntries.find((entry) => {
        if (entry.kind === "reference") {
          return entry.reference_kind === result.kind && entry.reference_id === result.id;
        }
        if (entry.kind === "attachment" && result.kind === "capture") {
          return entry.capture_id === result.id;
        }
        return false;
      });
      if (duplicate) {
        return { status: "duplicate" as const, tokenText: duplicate.token_text };
      }
      if (contextEntries.length >= maxContextEntries) {
        toast.error(t("pages.sync.composer.attachLimitExceeded"));
        return { status: "limit" as const, tokenText: null };
      }

      const internalPath =
        result.kind === "item"
          ? `/inbox/items/${result.id}`
          : `/inbox/captures/${result.id}`;
      const tokenText =
        preferredTokenText ?? buildUniqueContextTokenText(result.label, contextEntries);
      setContextEntries([
        ...contextEntries,
        {
          local_id: `reference:${result.kind}:${result.id}`,
          token_key: crypto.randomUUID(),
          token_text: tokenText,
          kind: "reference",
          label: result.label,
          status: "ready",
          reference_kind: result.kind,
          reference_id: result.id,
          internal_path: internalPath,
        },
      ]);
      return { status: "added" as const, tokenText };
    },
    [contextEntries, maxContextEntries, t]
  );

  const handleSelectMention = useCallback(
    (result: SyncContextSearchResult) => {
      if (!mentionState) return;
      const nextTokenText = buildUniqueContextTokenText(result.label, contextEntries);
      const outcome = attachMentionReference(result, nextTokenText);
      if (outcome.status === "limit" || !outcome.tokenText) return;
      const insertion = insertContextTokenInText(composerValue, outcome.tokenText, {
        start: mentionState.start,
        end: mentionState.end,
      });
      setComposerValue(insertion.value);
      applyComposerSelectionOverride(insertion.cursor);
      setMentionState(null);
    },
    [applyComposerSelectionOverride, attachMentionReference, composerValue, contextEntries, mentionState]
  );

  const handleComposerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!mentionState) return false;

      if (event.key === "Escape") {
        event.preventDefault();
        setMentionState(null);
        return true;
      }

      if (
        (event.key === "ArrowDown" || event.key === "ArrowUp") &&
        mentionSearchResults.length > 0
      ) {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        const maxIndex = mentionSearchResults.length - 1;
        setMentionState((prev) => {
          if (!prev) return prev;
          const nextIndex = prev.highlightedIndex + step;
          const clamped = Math.max(0, Math.min(maxIndex, nextIndex));
          return { ...prev, highlightedIndex: clamped };
        });
        return true;
      }

      if (
        (event.key === "Enter" || event.key === "Tab") &&
        mentionSearchResults.length > 0
      ) {
        event.preventDefault();
        const selected =
          mentionSearchResults[
          Math.max(0, Math.min(mentionState.highlightedIndex, mentionSearchResults.length - 1))
          ];
        if (selected) handleSelectMention(selected);
        return true;
      }

      return false;
    },
    [handleSelectMention, mentionSearchResults, mentionState]
  );

  const pollCaptureUntilReady = useCallback(
    async (captureId: string): Promise<"ready" | "failed"> => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const res = await fetchWithAuth(`/api/inbox/${captureId}`);
        if (!res.ok) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
          continue;
        }
        const data = await res.json();
        const statusCandidate = data?.capture?.status;
        if (statusCandidate === "ready" || statusCandidate === "applied" || statusCandidate === "archived") {
          return "ready";
        }
        if (statusCandidate === "failed") return "failed";
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
      return "failed";
    },
    []
  );

  const handleOpenLocalAttach = useCallback(() => {
    if (!syncAttachmentsEnabled) return;
    fileInputRef.current?.click();
  }, [syncAttachmentsEnabled]);

  const handleOpenInboxPicker = useCallback(() => {
    if (!syncAttachmentsEnabled) return;
    setContextPickerQuery("");
    setSelectedContextResults({});
    setIsContextPickerOpen(true);
  }, [syncAttachmentsEnabled]);

  const handleToggleContextResult = useCallback((result: SyncContextSearchResult) => {
    const key = `${result.kind}:${result.id}`;
    setSelectedContextResults((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: result };
    });
  }, []);

  const handleConfirmContextPicker = useCallback(() => {
    const pickedResults = Object.values(selectedContextResults);
    if (pickedResults.length === 0) {
      setIsContextPickerOpen(false);
      return;
    }
    const pendingInboxCaptures: Array<{ localId: string; captureId: string }> = [];
    const nextEntries = [...contextEntries];
    const insertedTokenTexts: string[] = [];
    for (const result of pickedResults) {
      if (nextEntries.length >= maxContextEntries) break;
      const duplicate = nextEntries.some((entry) => {
        if (entry.kind === "reference") {
          return entry.reference_kind === result.kind && entry.reference_id === result.id;
        }
        if (entry.kind === "attachment" && result.kind === "capture") {
          return entry.capture_id === result.id;
        }
        return false;
      });
      if (duplicate) continue;

      const tokenText = buildUniqueContextTokenText(result.label, nextEntries);
      const dedupeKey =
        result.kind === "capture" ? `attachment:capture:${result.id}` : `reference:item:${result.id}`;
      if (result.kind === "capture") {
        const isReadyCaptureStatus =
          result.status === "ready" || result.status === "applied" || result.status === "archived";
        nextEntries.push({
          local_id: dedupeKey,
          token_key: crypto.randomUUID(),
          token_text: tokenText,
          kind: "attachment",
          label: result.label,
          status: isReadyCaptureStatus ? "ready" : "processing",
          capture_id: result.id,
          source: "inbox",
          internal_path: `/inbox/captures/${result.id}`,
        });
        insertedTokenTexts.push(tokenText);
        if (!isReadyCaptureStatus) {
          pendingInboxCaptures.push({
            localId: dedupeKey,
            captureId: result.id,
          });
        }
      } else {
        nextEntries.push({
          local_id: dedupeKey,
          token_key: crypto.randomUUID(),
          token_text: tokenText,
          kind: "reference",
          label: result.label,
          status: "ready",
          reference_kind: "item",
          reference_id: result.id,
          internal_path: `/inbox/items/${result.id}`,
        });
        insertedTokenTexts.push(tokenText);
      }
    }

    if (nextEntries.length === contextEntries.length) {
      if (contextEntries.length + pickedResults.length > maxContextEntries) {
        toast.error(t("pages.sync.composer.attachLimitExceeded"));
      }
    } else {
      setContextEntries(nextEntries);
      let nextValue = composerValue;
      let nextRange = composerSelection;
      for (const tokenText of insertedTokenTexts) {
        const insertion = insertContextTokenInText(nextValue, tokenText, nextRange);
        nextValue = insertion.value;
        nextRange = { start: insertion.cursor, end: insertion.cursor };
      }
      setComposerValue(nextValue);
      applyComposerSelectionOverride(nextRange.start);
      if (contextEntries.length + pickedResults.length > maxContextEntries) {
        toast.error(t("pages.sync.composer.attachLimitExceeded"));
      }
    }

    setIsContextPickerOpen(false);
    setSelectedContextResults({});

    for (const pendingCapture of pendingInboxCaptures) {
      void pollCaptureUntilReady(pendingCapture.captureId).then((pollResult) => {
        updateContextEntry(pendingCapture.localId, (entry) => ({
          ...entry,
          status: pollResult === "ready" ? "ready" : "failed",
          error: pollResult === "ready" ? undefined : t("pages.sync.composer.attachmentFailed"),
        }));
      });
    }
  }, [
    applyComposerSelectionOverride,
    composerSelection,
    composerValue,
    contextEntries,
    maxContextEntries,
    pollCaptureUntilReady,
    selectedContextResults,
    t,
    updateContextEntry,
  ]);

  const handleFileInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const currentCount = contextEntries.length;
      const availableSlots = Math.max(0, maxContextEntries - currentCount);
      const selected = Array.from(files).slice(0, availableSlots);
      if (selected.length === 0) {
        toast.error(t("pages.sync.composer.attachLimitExceeded"));
        event.target.value = "";
        return;
      }
      if (selected.length < files.length) {
        toast.error(t("pages.sync.composer.attachLimitExceeded"));
      }

      const tokenSeedEntries = [...contextEntries];
      const plannedUploads = selected.map((file) => {
        const localId = `upload:${crypto.randomUUID()}`;
        const tokenText = buildUniqueContextTokenText(file.name, tokenSeedEntries);
        const entry: SyncComposerContextEntry = {
          local_id: localId,
          token_key: crypto.randomUUID(),
          token_text: tokenText,
          kind: "attachment",
          label: file.name,
          status: "uploading",
          source: "upload",
          internal_path: "",
        };
        tokenSeedEntries.push(entry);
        return { file, localId, tokenText, entry };
      });

      for (const plannedUpload of plannedUploads) {
        const { file, localId, tokenText, entry } = plannedUpload;
        setContextEntries((prev) => [...prev, entry]);
        insertContextTokenAtSelection(tokenText);

        try {
          const uploaded = await uploadCapture.mutateAsync({
            file,
            captureType: resolveCaptureTypeFromFile(file),
            source: "sync_attachment",
            metadata: {
              source: "sync_chat",
              file_name: file.name,
              mime_type: file.type || null,
              size_bytes: file.size,
            },
          });

          const uploadedCaptureId = uploaded.id;
          const immediateReady =
            uploaded.status === "ready" || uploaded.status === "applied" || uploaded.status === "archived";
          updateContextEntry(localId, (entry) => ({
            ...entry,
            capture_id: uploadedCaptureId,
            internal_path: `/inbox/captures/${uploadedCaptureId}`,
            status: immediateReady ? "ready" : "processing",
          }));

          if (!immediateReady) {
            const pollResult = await pollCaptureUntilReady(uploadedCaptureId);
            updateContextEntry(localId, (entry) => ({
              ...entry,
              status: pollResult === "ready" ? "ready" : "failed",
              error: pollResult === "ready" ? undefined : t("pages.sync.composer.attachmentFailed"),
            }));
          }
        } catch (error) {
          updateContextEntry(localId, (entry) => ({
            ...entry,
            status: "failed",
            error: toErrorMessage(error, t("pages.sync.composer.attachmentFailed")),
          }));
        }
      }
      event.target.value = "";
    },
    [
      contextEntries,
      insertContextTokenAtSelection,
      maxContextEntries,
      pollCaptureUntilReady,
      t,
      updateContextEntry,
      uploadCapture,
    ]
  );

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODEL_STORAGE_KEY, modelId);
    }
  }, []);

  const handleModeChange = useCallback((mode: SyncRunMode) => {
    setRunMode(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode);
    }
  }, []);

  const ensureRun = useCallback(async () => {
    if (runId) return runId;

    const modelId = selectedModel || (models.find((model) => model.is_default)?.id ?? models[0]?.id);
    const created = await createRun.mutateAsync({
      mode: runMode,
      message: "",
      model: modelId,
      context_json: {},
    });

    setRunId(created.id);
    return created.id;
  }, [createRun, models, runId, selectedModel]);

  const startStream = useCallback(
    async ({
      runId: targetRunId,
      message,
      optimisticMessageId,
      attachmentsPayload,
      referencesPayload,
    }: {
      runId: string;
      message: string;
      optimisticMessageId?: string;
      attachmentsPayload?: Array<{ capture_id: string; source: "upload" | "inbox" }>;
      referencesPayload?: Array<{ kind: "capture" | "item"; id: string; label?: string }>;
    }) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const streamStartSeq = lastSeqRef.current;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setTransportError(null);
      setIsStreaming(true);
      if (message.length > 0) setStreamingAssistantBuffer("");
      let streamSucceeded = false;

      try {
        await streamRun.mutateAsync({
          runId: targetRunId,
          payload: {
            message,
            from_seq: streamStartSeq,
            attachments: attachmentsPayload ?? [],
            references: referencesPayload ?? [],
          },
          signal: controller.signal,
        });
        streamSucceeded = true;

        if (message.length > 0) {
          setPendingRetryMessage(null);
        }
      } catch (error) {
        const isAbortError = error instanceof Error && error.name === "AbortError";

        if (!isAbortError) {
          const errorMessage = toErrorMessage(error, t("pages.sync.error.generic"));
          setTransportError(errorMessage);
          toast.error(errorMessage);

          if (message.length > 0 && lastSeqRef.current === streamStartSeq) {
            setPendingRetryMessage(message);
            if (optimisticMessageId) {
              setPendingUserMessages((prev) =>
                prev.map((item) =>
                  item.id === optimisticMessageId ? { ...item, status: "failed" } : item
                )
              );
            }
          } else if (optimisticMessageId) {
            setPendingUserMessages((prev) => prev.filter((item) => item.id !== optimisticMessageId));
          }
        }
      } finally {
        if (streamSucceeded && optimisticMessageId && lastSeqRef.current > streamStartSeq) {
          setPendingUserMessages((prev) => prev.filter((item) => item.id !== optimisticMessageId));
        }
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [streamRun, t]
  );

  const handleSend = useCallback(async () => {
    const message = composerValue.trim();
    if (!message || isStreaming) return;
    if (!canSendComposer) {
      toast.error(t("pages.sync.composer.waitAttachments"));
      return;
    }

    setLatestPreview(null);
    setLatestQuestion(null);
    const previousContextEntries = contextEntries;
    const attachmentsPayload = contextEntries
      .filter(
        (entry): entry is SyncComposerContextEntry & { capture_id: string; source: "upload" | "inbox" } =>
          entry.kind === "attachment" &&
          entry.status === "ready" &&
          typeof entry.capture_id === "string" &&
          typeof entry.source === "string"
      )
      .map((entry) => ({
        capture_id: entry.capture_id,
        source: entry.source,
      }));
    const referencesPayload = contextEntries
      .filter(
        (
          entry
        ): entry is SyncComposerContextEntry & {
          reference_kind: "capture" | "item";
          reference_id: string;
        } =>
          entry.kind === "reference" &&
          entry.status === "ready" &&
          typeof entry.reference_kind === "string" &&
          typeof entry.reference_id === "string"
      )
      .map((entry) => ({
        kind: entry.reference_kind,
        id: entry.reference_id,
        label: entry.label,
      }));
    const optimisticContextLinks: SyncMessageContextLink[] = contextEntries
      .filter(
        (entry): entry is SyncComposerContextEntry & { internal_path: string } =>
          entry.status === "ready" && typeof entry.internal_path === "string" && entry.internal_path.startsWith("/")
      )
      .map((entry) => ({
        kind:
          entry.kind === "attachment"
            ? "capture"
            : entry.reference_kind === "item"
              ? "item"
              : "capture",
        id:
          entry.kind === "attachment"
            ? entry.capture_id ?? entry.local_id
            : entry.reference_id ?? entry.local_id,
        label: entry.label,
        internalPath: entry.internal_path,
        source: entry.source,
      }));

    const optimisticMessageId = crypto.randomUUID();
    setPendingUserMessages((prev) => [
      ...prev,
      {
        id: optimisticMessageId,
        content: message,
        createdAt: new Date(),
        status: "pending",
        contextLinks: optimisticContextLinks.length > 0 ? optimisticContextLinks : undefined,
      },
    ]);
    setComposerValue("");
    setComposerSelectionOverride(null);
    setComposerSelection({ start: 0, end: 0 });
    setMentionState(null);
    setContextEntries([]);

    try {
      const targetRunId = await ensureRun();
      await startStream({
        runId: targetRunId,
        message,
        optimisticMessageId,
        attachmentsPayload,
        referencesPayload,
      });
    } catch (error) {
      setTransportError(toErrorMessage(error, t("pages.sync.error.generic")));
      setPendingUserMessages((prev) =>
        prev.map((item) => (item.id === optimisticMessageId ? { ...item, status: "failed" } : item))
      );
      setComposerValue(message);
      applyComposerSelectionOverride(message.length);
      setContextEntries(previousContextEntries);
    }
  }, [
    applyComposerSelectionOverride,
    canSendComposer,
    composerValue,
    contextEntries,
    ensureRun,
    isStreaming,
    startStream,
    t,
  ]);

  const handleQuestionAnswer = useCallback(
    async (answer: string) => {
      if (isStreaming || !runId) return;

      const optimisticMessageId = crypto.randomUUID();
      setPendingUserMessages((prev) => [
        ...prev,
        {
          id: optimisticMessageId,
          content: answer,
          createdAt: new Date(),
          status: "pending",
        },
      ]);

      setLatestQuestion(null);

      try {
        await startStream({
          runId,
          message: answer,
          optimisticMessageId,
        });
      } catch (error) {
        setTransportError(toErrorMessage(error, t("pages.sync.error.generic")));
        setPendingUserMessages((prev) =>
          prev.map((item) => (item.id === optimisticMessageId ? { ...item, status: "failed" } : item))
        );
      }
    },
    [isStreaming, runId, startStream, t]
  );

  const handleRetry = useCallback(async () => {
    if (isStreaming) return;

    if (!runId) {
      const retryMessage = pendingRetryMessage;
      if (retryMessage) {
        setComposerValue(retryMessage);
      }
      return;
    }

    await startStream({
      runId,
      message: pendingRetryMessage ?? "",
    });
  }, [isStreaming, pendingRetryMessage, runId, startStream]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const handleUndo = useCallback(async (changeId?: string) => {
    const targetChangeId = changeId ?? latestUndoableChange?.id;
    if (!runId || !targetChangeId) return;

    setTransportError(null);

    try {
      await undoRun.mutateAsync({
        runId,
        payload: {
          change_id: targetChangeId,
          idempotency_key: crypto.randomUUID(),
        },
      });

    } catch (error) {
      setTransportError(toErrorMessage(error, t("pages.sync.error.generic")));
      toast.error(t("pages.sync.toast.undoError"));
    }
  }, [latestUndoableChange, runId, t, undoRun]);

  const openAppliedTarget = useCallback((applied: SyncApply) => {
    router.push(resolveSyncApplyOpenPath(applied));
  }, [router]);

  const handleApply = useCallback(async (previewId?: string) => {
    const targetPreviewId = previewId ?? latestPreview?.id;
    if (!runId || !targetPreviewId) return;

    setTransportError(null);

    try {
      const applyResult = await applyRun.mutateAsync({
        runId,
        payload: {
          preview_id: targetPreviewId,
          idempotency_key: crypto.randomUUID(),
        },
      });

      setAppliedPreviewIds((prev) =>
        prev.includes(applyResult.preview_id) ? prev : [...prev, applyResult.preview_id]
      );
      toast.success(t("pages.sync.toast.applied"), {
        action: applyResult.undoable
          ? {
            label: t("pages.sync.toast.undo"),
            onClick: () => {
              void handleUndo(applyResult.change_id);
            },
          }
          : undefined,
        cancel: {
          label: t("pages.sync.toast.open"),
          onClick: () => {
            openAppliedTarget(applyResult);
          },
        },
      });
    } catch (error) {
      setTransportError(toErrorMessage(error, t("pages.sync.error.generic")));
      toast.error(t("pages.sync.toast.applyError"));
    }
  }, [applyRun, handleUndo, latestPreview, openAppliedTarget, runId, t]);

  const handleNewChat = useCallback(async () => {
    setTransportError(null);

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      const created = await createRun.mutateAsync({
        mode: "guided",
        message: "",
        model: selectedModel || undefined,
        context_json: {},
      });
      resetLocalState();
      setIsHydratingRun(false);
      setRunId(created.id);
    } catch (error) {
      setTransportError(toErrorMessage(error, t("pages.sync.error.generic")));
    }
  }, [createRun, resetLocalState, selectedModel, t]);

  const handleRenameRun = useCallback(
    async (run: SyncRunSummary) => {
      const currentTitle = resolveRunTitle(run) ?? "";
      const proposedTitle = window.prompt(t("pages.sync.menu.renamePrompt"), currentTitle);
      if (proposedTitle === null) return;
      const nextTitle = proposedTitle.trim();
      if (!nextTitle) {
        toast.error(t("pages.sync.menu.renameEmpty"));
        return;
      }

      try {
        await patchRun.mutateAsync({
          runId: run.id,
          payload: { title: nextTitle },
        });
        toast.success(t("pages.sync.menu.renameSuccess"));
      } catch (error) {
        setTransportError(toErrorMessage(error, t("pages.sync.error.generic")));
        toast.error(t("pages.sync.menu.renameError"));
      }
    },
    [patchRun, t]
  );

  const handleDeleteRun = useCallback((run: SyncRunSummary) => {
    setDeleteRunTarget(run);
  }, []);

  const handleConfirmDeleteRun = useCallback(async () => {
    if (!deleteRunTarget) return;
    try {
      await deleteRun.mutateAsync(deleteRunTarget.id);
      toast.success(t("pages.sync.menu.deleted"));

      if (deleteRunTarget.id === runId) {
        resetLocalState();
        setIsHydratingRun(false);
        setRunId(null);
      }
      setDeleteRunTarget(null);
    } catch (error) {
      setTransportError(toErrorMessage(error, t("pages.sync.error.generic")));
      toast.error(t("pages.sync.menu.deleteError"));
    }
  }, [deleteRun, deleteRunTarget, resetLocalState, runId, t]);

  const handleSelectRun = useCallback(
    (run: SyncRunSummary) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setTransportError(null);
      setPendingRetryMessage(null);
      resetLocalState();
      setRunId(run.id);
      setIsHydratingRun(true);
    },
    [resetLocalState]
  );

  useEffect(() => {
    const onNewChat = () => {
      void handleNewChat();
    };

    const onOpenHistory = () => {
      setIsDrawerOpen(true);
    };
    const onRenameCurrentRun = () => {
      if (!activeRunSummary) return;
      void handleRenameRun(activeRunSummary);
    };
    const onDeleteCurrentRun = () => {
      if (!activeRunSummary) return;
      void handleDeleteRun(activeRunSummary);
    };

    window.addEventListener("sync-chat:new-chat", onNewChat);
    window.addEventListener("sync-chat:open-history", onOpenHistory);
    window.addEventListener("sync-chat:rename-current", onRenameCurrentRun);
    window.addEventListener("sync-chat:delete-current", onDeleteCurrentRun);

    return () => {
      window.removeEventListener("sync-chat:new-chat", onNewChat);
      window.removeEventListener("sync-chat:open-history", onOpenHistory);
      window.removeEventListener("sync-chat:rename-current", onRenameCurrentRun);
      window.removeEventListener("sync-chat:delete-current", onDeleteCurrentRun);
    };
  }, [activeRunSummary, handleDeleteRun, handleNewChat, handleRenameRun]);

  return (
    <section className="sync-chat-surface relative flex h-full min-h-0 flex-1 overflow-hidden bg-background">
      <div className="relative min-h-0 flex-1">
        <ConversationView
          messages={messages}
          pendingMessages={mappedPendingMessages}
          streamingBuffer={streamingAssistantBuffer}
          isStreaming={isStreaming}
          notices={notices}
          error={transportError}
          reasoningEntries={reasoningEntries}
          sourceEntries={sourcesEntries}
          taskEntries={taskEntries}
          queueEntries={queueEntries}
          isHydratingHistory={isHydratingRun}
          applyEnabled={Boolean(runId)}
          appliedPreviewIds={appliedPreviewIds}
          isApplying={applyRun.isPending}
          isUndoing={undoRun.isPending}
          onApplyPreview={handleApply}
          onUndo={handleUndo}
          previewLabels={{
            title: t("pages.sync.previewPlan.title"),
            titleFallback: t("pages.sync.previewPlan.titleFallback"),
            entityEvent: t("pages.sync.previewPlan.entityEvent"),
            entityItem: t("pages.sync.previewPlan.entityItem"),
            entityCapture: t("pages.sync.previewPlan.entityCapture"),
            entityTimeline: t("pages.sync.previewPlan.entityTimeline"),
            entityUnknown: t("pages.sync.previewPlan.entityUnknown"),
            summary: t("pages.sync.previewPlan.summary"),
            mutations: t("pages.sync.previewPlan.mutations"),
            notes: t("pages.sync.previewPlan.notes"),
            apply: t("pages.sync.actions.apply"),
            undo: t("pages.sync.actions.undo"),
            applied: t("pages.sync.status.run.applied"),
            pending: t("pages.sync.previewPlan.pending"),
            applying: t("pages.sync.previewPlan.applying"),
            schedule: t("pages.sync.previewPlan.schedule"),
            linkedProject: t("pages.sync.previewPlan.linkedProject"),
            linkedSeries: t("pages.sync.previewPlan.linkedSeries"),
            targetEvent: t("pages.sync.previewPlan.targetEvent"),
            targetItem: t("pages.sync.previewPlan.targetItem"),
            descriptionPrefix: t("pages.sync.previewPlan.descriptionPrefix"),
          }}
          assistantLabel={t("pages.sync.roles.assistant")}
          emptySubtitle={t("pages.sync.empty.subtitle")}
          errorTitle={t("pages.sync.error.title")}
          warningTitle={t("pages.sync.warning.title")}
          retryLabel={t("pages.sync.retry")}
          logAriaLabel={t("pages.sync.aria.log")}
          historyLoadingLabel={t("pages.sync.history.loading")}
          onRetry={handleRetry}
        />

        <Composer
          value={composerValue}
          onValueChange={(value, selection) => {
            setComposerValue(value);
            setComposerSelection(selection);
            updateMentionState(value, selection);
          }}
          onSelectionChange={(selection) => {
            setComposerSelection(selection);
            updateMentionState(composerValue, selection);
          }}
          onComposerKeyDown={handleComposerKeyDown}
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
          disabled={createRun.isPending || streamRun.isPending}
          models={mappedModels}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          runMode={runMode}
          onModeChange={handleModeChange}
          placeholder={`${t("pages.sync.composer.placeholder")} ${t("pages.sync.composer.mentionHint")}`}
          sendLabel={t("pages.sync.composer.send")}
          stopLabel={t("pages.sync.composer.stop")}
          modelLabel={t("pages.sync.composer.model")}
          voiceSoonLabel={t("pages.sync.composer.voiceSoon")}
          attachSoonLabel={t("pages.sync.composer.attachSoon")}
          attachLocalLabel={t("pages.sync.composer.attachLocal")}
          attachInboxLabel={t("pages.sync.composer.attachInbox")}
          enableAttach={syncAttachmentsEnabled}
          enableVoice={false}
          canSend={canSendComposer}
          onAttachLocal={handleOpenLocalAttach}
          onAttachInbox={handleOpenInboxPicker}
          selectionOverride={composerSelectionOverride}
          beforeComposer={
            latestQuestion || contextEntries.length > 0 || isMentionPopoverVisible ? (
              <div className="space-y-4">
                <AnimatePresence>
                  {latestQuestion && (
                    <InteractiveQuestionUI
                      question={latestQuestion}
                      onSelectOption={handleQuestionAnswer}
                      onOtherClick={() => {
                        // Just scroll to composer and maybe focus it
                        const composerEl = document.querySelector('[data-composer-input="true"]');
                        if (composerEl instanceof HTMLElement) {
                          composerEl.focus();
                        }
                      }}
                    />
                  )}
                </AnimatePresence>

                {contextEntries.length > 0 ? (
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-card/90 p-2.5">
                    {contextEntries.map((entry) => {
                      const canOpen =
                        entry.status === "ready" &&
                        typeof entry.internal_path === "string" &&
                        entry.internal_path.startsWith("/");
                      const statusLabel = contextEntryStatusLabels[entry.status];
                      return (
                        <div
                          key={entry.local_id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/45 px-2.5 py-1 text-[11px]"
                        >
                          <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {entry.kind === "attachment" ? "file" : entry.reference_kind ?? "ref"}
                          </span>
                          {canOpen ? (
                            <a href={entry.internal_path} className="max-w-[190px] truncate hover:underline">
                              {entry.token_text}
                            </a>
                          ) : (
                            <span className="max-w-[190px] truncate">{entry.token_text}</span>
                          )}
                          <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {statusLabel}
                          </span>
                          <button
                            type="button"
                            className="rounded-full px-1 text-muted-foreground hover:text-foreground"
                            aria-label={t("pages.sync.composer.removeAttachment")}
                            onClick={() => removeContextEntry(entry.local_id)}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                {isMentionPopoverVisible ? (
                  <div className="rounded-2xl border border-border/70 bg-card/95 p-1.5 shadow-lg backdrop-blur">
                    {isMentionSearchLoading ? (
                      <p className="px-2.5 py-2 text-xs text-muted-foreground">
                        {t("pages.sync.composer.mentionLoading")}
                      </p>
                    ) : mentionSearchError ? (
                      <p className="px-2.5 py-2 text-xs text-destructive">
                        {t("pages.sync.composer.mentionError")}
                      </p>
                    ) : mentionSearchResults.length === 0 ? (
                      <p className="px-2.5 py-2 text-xs text-muted-foreground">
                        {t("pages.sync.composer.mentionEmpty")}
                      </p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        {mentionSearchResults.map((result, index) => {
                          const selected = mentionState?.highlightedIndex === index;
                          return (
                            <button
                              key={`${result.kind}:${result.id}`}
                              type="button"
                              className={`flex w-full items-start justify-between rounded-lg px-2.5 py-2 text-left transition-colors ${selected ? "bg-primary/10" : "hover:bg-background/70"
                                }`}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleSelectMention(result)}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  @{result.label}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {result.subtitle ?? result.kind}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null
          }
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleFileInputChange}
        />
      </div>

      <HistoryDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        runs={runs}
        selectedRunId={runId}
        isLoadingRuns={isLoadingRuns}
        onSelectRun={(nextRunId) => {
          const run = runs.find((entry) => entry.id === nextRunId);
          if (!run) return;
          handleSelectRun(run);
        }}
        onRenameRun={(run) => {
          void handleRenameRun(run);
        }}
        onDeleteRun={(run) => {
          void handleDeleteRun(run);
        }}
        labels={{
          title: t("pages.sync.drawer.title"),
          searchPlaceholder: t("pages.sync.history.search"),
          empty: t("pages.sync.history.empty"),
          lastUpdate: t("pages.sync.history.lastUpdate"),
          model: t("pages.sync.history.model"),
          openConversation: t("pages.sync.history.menu.open"),
          renameConversation: t("pages.sync.history.menu.rename"),
          deleteConversation: t("pages.sync.history.menu.delete"),
        }}
      />
      <Dialog open={isContextPickerOpen} onOpenChange={setIsContextPickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("pages.sync.composer.inboxPickerTitle")}</DialogTitle>
            <DialogDescription>{t("pages.sync.composer.inboxPickerDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={contextPickerQuery}
              onChange={(event) => setContextPickerQuery(event.target.value)}
              placeholder={t("pages.sync.composer.inboxPickerSearch")}
            />
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border/70 bg-muted/20 p-1.5">
              {isContextSearchLoading ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  {t("pages.sync.composer.inboxPickerLoading")}
                </p>
              ) : contextSearchResults.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  {t("pages.sync.composer.inboxPickerEmpty")}
                </p>
              ) : (
                contextSearchResults.map((result) => {
                  const key = `${result.kind}:${result.id}`;
                  const selected = Boolean(selectedContextResults[key]);
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`flex w-full items-start justify-between rounded-lg px-2.5 py-2 text-left transition-colors ${selected ? "bg-primary/10" : "hover:bg-background/70"
                        }`}
                      onClick={() => handleToggleContextResult(result)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {result.label}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {result.subtitle ?? result.kind}
                        </span>
                      </span>
                      <span
                        className={`mt-0.5 h-4 w-4 rounded-full border ${selected ? "border-primary bg-primary" : "border-border"
                          }`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsContextPickerOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={handleConfirmContextPicker}>
              {t("pages.sync.composer.inboxPickerAdd", {
                count: Object.keys(selectedContextResults).length,
              })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(deleteRunTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteRun.isPending) {
            setDeleteRunTarget(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("pages.sync.menu.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("pages.sync.menu.deleteConfirmBody", {
                title: resolveRunTitle(deleteRunTarget) ?? deleteRunTarget?.id.slice(0, 8) ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteRun.isPending}
              onClick={() => setDeleteRunTarget(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteRun.isPending}
              onClick={() => {
                void handleConfirmDeleteRun();
              }}
            >
              {t("pages.sync.menu.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
