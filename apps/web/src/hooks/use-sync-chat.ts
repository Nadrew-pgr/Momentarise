"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SyncEventEnvelope, SyncMessage, SyncPreview } from "@momentarise/shared";
import {
  useApplySyncRun,
  useCreateSyncRun,
  useSyncChanges,
  useSyncModels,
  useSyncStream,
  useUndoSyncRun,
} from "@/hooks/use-sync";
import type {
  SyncChatMessage,
  SyncReasoningEntry,
  SyncSourcesEntry,
} from "@/components/sync-chat/types";

const MODEL_STORAGE_KEY = "sync-chat-selected-model";

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

function upsertBySeq(messages: SyncChatMessage[], next: SyncChatMessage): SyncChatMessage[] {
  const rest = messages.filter((m) => m.seq !== next.seq && m.id !== next.id);
  return [...rest, next].sort((a, b) => a.seq - b.seq);
}

interface PendingUserMessage {
  id: string;
  content: string;
  createdAt: Date;
  status: "pending" | "failed";
}

export function useSyncChat(options: { fallbackErrorLabel?: string } = {}) {
  const fallbackError = options.fallbackErrorLabel ?? "Something went wrong";

  const [runId, setRunId] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");

  const [messages, setMessages] = useState<SyncChatMessage[]>([]);
  const [pendingUserMessages, setPendingUserMessages] = useState<PendingUserMessage[]>([]);
  const [streamingAssistantBuffer, setStreamingAssistantBuffer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [latestPreview, setLatestPreview] = useState<SyncPreview | null>(null);
  const [reasoningEntries, setReasoningEntries] = useState<SyncReasoningEntry[]>([]);
  const [sourcesEntries, setSourcesEntries] = useState<SyncSourcesEntry[]>([]);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [pendingRetryMessage, setPendingRetryMessage] = useState<string | null>(null);

  const seqSeenRef = useRef<Set<number>>(new Set());
  const lastSeqRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: models = [] } = useSyncModels();
  const createRun = useCreateSyncRun();
  const applyRun = useApplySyncRun();
  const undoRun = useUndoSyncRun();
  const { data: changes = [] } = useSyncChanges(runId);

  const resetLocalState = useCallback(() => {
    setMessages([]);
    setPendingUserMessages([]);
    setStreamingAssistantBuffer("");
    setIsStreaming(false);
    setLatestPreview(null);
    setReasoningEntries([]);
    setSourcesEntries([]);
    setTransportError(null);
    setPendingRetryMessage(null);
    lastSeqRef.current = 0;
    seqSeenRef.current = new Set();
  }, []);

  const appendReasoning = useCallback((next: SyncReasoningEntry) => {
    setReasoningEntries((prev) => {
      const merged = [next, ...prev.filter((e) => e.id !== next.id)];
      return merged.slice(0, 20);
    });
  }, []);

  const appendSources = useCallback((next: SyncSourcesEntry) => {
    setSourcesEntries((prev) => {
      const merged = [next, ...prev.filter((e) => e.id !== next.id)];
      return merged.slice(0, 20);
    });
  }, []);

  const handleStreamEvent = useCallback(
    (event: SyncEventEnvelope) => {
      if (seqSeenRef.current.has(event.seq)) return;
      seqSeenRef.current.add(event.seq);
      lastSeqRef.current = Math.max(lastSeqRef.current, event.seq);

      switch (event.type) {
        case "token":
          setIsStreaming(true);
          setStreamingAssistantBuffer((prev) => `${prev}${event.payload.delta}`);
          break;
        case "message": {
          const payload = event.payload;
          const nextMessage: SyncChatMessage = {
            id: payload.id,
            seq: event.seq,
            role: payload.role,
            content: extractMessageContent(payload),
            createdAt: new Date(payload.created_at),
            delivery: "sent",
          };
          setMessages((prev) => upsertBySeq(prev, nextMessage));
          if (payload.role === "user") {
            setPendingUserMessages((prev) =>
              prev.filter(
                (item) => item.content.trim().toLowerCase() !== nextMessage.content.trim().toLowerCase()
              )
            );
          }
          setStreamingAssistantBuffer("");
          setPendingRetryMessage(null);
          break;
        }
        case "preview":
          setLatestPreview(event.payload);
          break;
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
          const items = Array.isArray(payload.items)
            ? payload.items.reduce<SyncSourcesEntry["items"]>((acc, item, index) => {
                if (!item || typeof item !== "object") return acc;
                const raw = item as { id?: unknown; title?: unknown; url?: unknown; snippet?: unknown };
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
          if (items.length > 0) {
            appendSources({
              id: `${event.run_id}-${event.seq}-sources`,
              seq: event.seq,
              items,
            });
          }
          break;
        }
        case "error":
          setTransportError(event.payload.message || fallbackError);
          break;
        case "done":
          setIsStreaming(false);
          break;
        default:
          break;
      }
    },
    [appendReasoning, appendSources, fallbackError]
  );

  const streamRun = useSyncStream(handleStreamEvent);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(MODEL_STORAGE_KEY);
    if (stored) setSelectedModel(stored);
  }, []);

  useEffect(() => {
    if (selectedModel || models.length === 0) return;
    const fallback = models.find((m) => m.is_default)?.id ?? models[0]?.id;
    if (fallback) setSelectedModel(fallback);
  }, [models, selectedModel]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const ensureRun = useCallback(async () => {
    if (runId) return runId;
    const modelId =
      selectedModel ||
      (models.find((m) => m.is_default)?.id ?? models[0]?.id);
    const created = await createRun.mutateAsync({
      mode: "guided",
      message: "",
      model: modelId,
      context_json: {},
    });
    setRunId(created.id);
    return created.id;
  }, [createRun, models, runId, selectedModel]);

  const startStream = useCallback(
    async (params: {
      runId: string;
      message: string;
      optimisticMessageId?: string;
    }) => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const streamStartSeq = lastSeqRef.current;

      setTransportError(null);
      setIsStreaming(true);
      if (params.message.length > 0) setStreamingAssistantBuffer("");

      try {
        await streamRun.mutateAsync({
          runId: params.runId,
          payload: { message: params.message, from_seq: streamStartSeq },
          signal: controller.signal,
        });
        if (params.message.length > 0) setPendingRetryMessage(null);
        if (params.optimisticMessageId && lastSeqRef.current > streamStartSeq) {
          setPendingUserMessages((prev) => prev.filter((item) => item.id !== params.optimisticMessageId));
        }
      } catch (error) {
        const isAbort = error instanceof Error && error.name === "AbortError";
        if (!isAbort) {
          setTransportError(toErrorMessage(error, fallbackError));
          if (params.message.length > 0 && lastSeqRef.current === streamStartSeq && params.optimisticMessageId) {
            setPendingRetryMessage(params.message);
            setPendingUserMessages((prev) =>
              prev.map((item) =>
                item.id === params.optimisticMessageId ? { ...item, status: "failed" } : item
              )
            );
          } else if (params.optimisticMessageId) {
            setPendingUserMessages((prev) => prev.filter((item) => item.id !== params.optimisticMessageId));
          }
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [streamRun, fallbackError]
  );

  const handleSend = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || isStreaming) return;

      setLatestPreview(null);
      const optimisticId = crypto.randomUUID();
      setPendingUserMessages((prev) => [
        ...prev,
        { id: optimisticId, content: trimmed, createdAt: new Date(), status: "pending" },
      ]);
      setComposerValue("");

      try {
        const targetRunId = await ensureRun();
        await startStream({ runId: targetRunId, message: trimmed, optimisticMessageId: optimisticId });
      } catch (error) {
        setTransportError(toErrorMessage(error, fallbackError));
        setPendingUserMessages((prev) =>
          prev.map((item) => (item.id === optimisticId ? { ...item, status: "failed" } : item))
        );
        setComposerValue(trimmed);
      }
    },
    [ensureRun, isStreaming, startStream, fallbackError]
  );

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODEL_STORAGE_KEY, modelId);
    }
  }, []);

  const latestUndoableChange = useMemo(
    () => changes.find((c) => c.undoable) ?? null,
    [changes]
  );
  const canApply = Boolean(runId && latestPreview && !applyRun.isPending);
  const canUndo = Boolean(runId && latestUndoableChange && !undoRun.isPending);

  const handleApply = useCallback(async () => {
    if (!runId || !latestPreview) return;
    setTransportError(null);
    try {
      await applyRun.mutateAsync({
        runId,
        payload: { preview_id: latestPreview.id, idempotency_key: crypto.randomUUID() },
      });
    } catch (error) {
      setTransportError(toErrorMessage(error, fallbackError));
    }
  }, [applyRun, fallbackError, latestPreview, runId]);

  const handleUndo = useCallback(async () => {
    if (!runId || !latestUndoableChange) return;
    setTransportError(null);
    try {
      await undoRun.mutateAsync({
        runId,
        payload: { change_id: latestUndoableChange.id, idempotency_key: crypto.randomUUID() },
      });
    } catch (error) {
      setTransportError(toErrorMessage(error, fallbackError));
    }
  }, [fallbackError, latestUndoableChange, runId, undoRun]);

  const mergedMessages = useMemo(() => {
    const base = [...messages];
    for (const p of pendingUserMessages) {
      base.push({
        id: p.id,
        seq: Number.MAX_SAFE_INTEGER - 5000,
        role: "user",
        content: p.content,
        createdAt: p.createdAt,
        delivery: p.status === "pending" ? "pending" : "failed",
      });
    }
    if (isStreaming && streamingAssistantBuffer.trim()) {
      base.push({
        id: "streaming-assistant",
        seq: Number.MAX_SAFE_INTEGER,
        role: "assistant",
        content: streamingAssistantBuffer,
        createdAt: new Date(),
        delivery: "sent",
      });
    }
    return base.sort((a, b) => a.seq - b.seq);
  }, [messages, pendingUserMessages, isStreaming, streamingAssistantBuffer]);

  const latestReasoning = useMemo(
    () =>
      reasoningEntries.length === 0
        ? null
        : reasoningEntries.slice().sort((a, b) => b.seq - a.seq)[0] ?? null,
    [reasoningEntries]
  );

  const latestSources = useMemo(
    () =>
      sourcesEntries.length === 0
        ? null
        : sourcesEntries.slice().sort((a, b) => b.seq - a.seq)[0] ?? null,
    [sourcesEntries]
  );

  const mappedModels = useMemo(
    () => models.map((m) => ({ id: m.id, label: m.label, provider: m.provider })),
    [models]
  );

  return {
    runId,
    composerValue,
    setComposerValue,
    selectedModel,
    messages: mergedMessages,
    isStreaming,
    latestPreview,
    latestReasoning,
    latestSources,
    transportError,
    pendingRetryMessage,
    models: mappedModels,
    createRun,
    streamRun,
    handleSend,
    handleStop,
    handleModelChange,
    resetLocalState,
    setRunId,
    canApply,
    canUndo,
    handleApply,
    handleUndo,
    isApplying: applyRun.isPending,
    isUndoing: undoRun.isPending,
  };
}
