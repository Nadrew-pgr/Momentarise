"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  SyncDraft,
  SyncEventEnvelope,
  SyncMessage,
  SyncPreview,
  SyncQuestion,
  SyncRunSummary,
} from "@momentarise/shared";
import { useTranslation } from "react-i18next";
import {
  useApplySyncRun,
  useCreateSyncRun,
  useSyncChanges,
  useSyncModels,
  useSyncRunEvents,
  useSyncRuns,
  useSyncStream,
  useUndoSyncRun,
} from "@/hooks/use-sync";
import { ActionsRail } from "./actions-rail";
import { Composer } from "./composer";
import { ConversationView } from "./conversation-view";
import { HistoryDrawer } from "./history-drawer";
import type {
  SyncChatMessage,
  SyncNotice,
  SyncQueueEntry,
  SyncReasoningEntry,
  SyncSourcesEntry,
  SyncTaskEntry,
  SyncToolTimelineEntry,
} from "./types";

const MODEL_STORAGE_KEY = "sync-selected-model";

interface ActionFeedbackEntry {
  id: string;
  kind: "applied" | "undo";
  createdAt: Date;
}

interface PendingUserMessage {
  id: string;
  content: string;
  createdAt: Date;
  status: "pending" | "failed";
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

function upsertBySeq(messages: SyncChatMessage[], next: SyncChatMessage): SyncChatMessage[] {
  const rest = messages.filter((message) => message.seq !== next.seq && message.id !== next.id);
  return [...rest, next].sort((a, b) => a.seq - b.seq);
}

export function SyncChatShell() {
  const { t } = useTranslation();

  const [runId, setRunId] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");

  const [messages, setMessages] = useState<SyncChatMessage[]>([]);
  const [pendingUserMessages, setPendingUserMessages] = useState<PendingUserMessage[]>([]);
  const [streamingAssistantBuffer, setStreamingAssistantBuffer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const [latestPreview, setLatestPreview] = useState<SyncPreview | null>(null);
  const [latestQuestion, setLatestQuestion] = useState<SyncQuestion | null>(null);
  const [latestDraft, setLatestDraft] = useState<SyncDraft | null>(null);
  const [toolTimeline, setToolTimeline] = useState<SyncToolTimelineEntry[]>([]);
  const [notices, setNotices] = useState<SyncNotice[]>([]);
  const [reasoningEntries, setReasoningEntries] = useState<SyncReasoningEntry[]>([]);
  const [sourcesEntries, setSourcesEntries] = useState<SyncSourcesEntry[]>([]);
  const [taskEntries, setTaskEntries] = useState<SyncTaskEntry[]>([]);
  const [queueEntries, setQueueEntries] = useState<SyncQueueEntry[]>([]);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedbackEntry[]>([]);

  const [transportError, setTransportError] = useState<string | null>(null);
  const [pendingRetryMessage, setPendingRetryMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isHydratingRun, setIsHydratingRun] = useState(false);

  const seqSeenRef = useRef<Set<number>>(new Set());
  const lastSeqRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: models = [] } = useSyncModels();
  const { data: runs = [], isLoading: isLoadingRuns } = useSyncRuns();
  const { data: changes = [] } = useSyncChanges(runId);
  const { data: runEvents = [], isLoading: isLoadingRunEvents, error: runEventsError } = useSyncRunEvents(
    isHydratingRun ? runId : null,
    0
  );

  const createRun = useCreateSyncRun();
  const applyRun = useApplySyncRun();
  const undoRun = useUndoSyncRun();

  const resetLocalState = useCallback(() => {
    setMessages([]);
    setPendingUserMessages([]);
    setStreamingAssistantBuffer("");
    setIsStreaming(false);
    setLatestPreview(null);
    setLatestQuestion(null);
    setLatestDraft(null);
    setToolTimeline([]);
    setNotices([]);
    setReasoningEntries([]);
    setSourcesEntries([]);
    setTaskEntries([]);
    setQueueEntries([]);
    setActionFeedback([]);
    setTransportError(null);
    setPendingRetryMessage(null);

    lastSeqRef.current = 0;
    seqSeenRef.current = new Set();
  }, []);

  const appendNotice = useCallback((next: SyncNotice) => {
    setNotices((prev) => {
      const merged = [next, ...prev.filter((item) => item.id !== next.id)];
      return merged.slice(0, 8);
    });
  }, []);

  const appendToolTimeline = useCallback((next: SyncToolTimelineEntry) => {
    setToolTimeline((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.id === next.id);
      if (existingIndex === -1) return [next, ...prev].slice(0, 20);

      const copy = [...prev];
      copy[existingIndex] = { ...copy[existingIndex], ...next };
      return copy;
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

  const pushActionFeedback = useCallback((kind: "applied" | "undo") => {
    const entry: ActionFeedbackEntry = {
      id: crypto.randomUUID(),
      kind,
      createdAt: new Date(),
    };

    setActionFeedback((prev) => [entry, ...prev].slice(0, 6));
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
        setLatestDraft(event.payload);
        break;

      case "preview":
        setLatestPreview(event.payload);
        break;

      case "applied":
        pushActionFeedback("applied");
        break;

      case "tool_call": {
        const payload = event.payload;
        appendToolTimeline({
          id: payload.tool_call_id,
          seq: event.seq,
          kind: "tool_call",
          toolName: payload.tool_name,
          status: payload.status,
          createdAt: new Date(event.ts),
        });
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
        appendToolTimeline({
          id: payload.tool_call_id,
          seq: event.seq,
          kind: "tool_result",
          status: payload.status,
          summary: payload.summary ?? undefined,
          createdAt: new Date(event.ts),
        });
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
        appendNotice({
          id: `${event.run_id}-${event.seq}-warning`,
          seq: event.seq,
          code: event.payload.code,
          message: event.payload.message,
          level: "warning",
        });
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
    appendToolTimeline,
    pushActionFeedback,
  ]);

  const streamRun = useSyncStream(handleStreamEvent);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedModel = window.localStorage.getItem(MODEL_STORAGE_KEY);
    if (storedModel) {
      setSelectedModel(storedModel);
    }
  }, []);

  useEffect(() => {
    if (selectedModel) return;
    const fallback = models.find((model) => model.is_default)?.id ?? models[0]?.id;
    if (!fallback) return;
    setSelectedModel(fallback);
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
    if (!runId) return;
    if (runEventsError) {
      setTransportError(toErrorMessage(runEventsError, t("pages.sync.error.generic")));
      setIsHydratingRun(false);
      return;
    }
    if (isLoadingRunEvents) return;

    resetLocalState();
    for (const event of [...runEvents].sort((a, b) => a.seq - b.seq)) {
      handleStreamEvent(event);
    }
    setIsHydratingRun(false);
  }, [
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
    () => models.map((model) => ({ id: model.id, label: model.label })),
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
        delivery: message.status,
      })),
    [pendingUserMessages]
  );

  const latestUndoableChange = useMemo(
    () => changes.find((change) => change.undoable) ?? null,
    [changes]
  );

  const canApply = Boolean(runId && latestPreview && !applyRun.isPending);
  const canUndo = Boolean(runId && latestUndoableChange && !undoRun.isPending);

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODEL_STORAGE_KEY, modelId);
    }
  }, []);

  const ensureRun = useCallback(async () => {
    if (runId) return runId;

    const modelId = selectedModel || (models.find((model) => model.is_default)?.id ?? models[0]?.id);
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
    async ({
      runId: targetRunId,
      message,
      optimisticMessageId,
    }: {
      runId: string;
      message: string;
      optimisticMessageId?: string;
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
          setTransportError(toErrorMessage(error, t("pages.sync.error.generic")));

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

    setLatestPreview(null);
    const optimisticMessageId = crypto.randomUUID();
    setPendingUserMessages((prev) => [
      ...prev,
      {
        id: optimisticMessageId,
        content: message,
        createdAt: new Date(),
        status: "pending",
      },
    ]);
    setComposerValue("");

    try {
      const targetRunId = await ensureRun();
      await startStream({ runId: targetRunId, message, optimisticMessageId });
    } catch (error) {
      setTransportError(toErrorMessage(error, t("pages.sync.error.generic")));
      setPendingUserMessages((prev) =>
        prev.map((item) => (item.id === optimisticMessageId ? { ...item, status: "failed" } : item))
      );
      setComposerValue(message);
    }
  }, [composerValue, ensureRun, isStreaming, startStream, t]);

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

  const handleApply = useCallback(async () => {
    if (!runId || !latestPreview) return;

    setTransportError(null);

    try {
      await applyRun.mutateAsync({
        runId,
        payload: {
          preview_id: latestPreview.id,
          idempotency_key: crypto.randomUUID(),
        },
      });

      pushActionFeedback("applied");
    } catch (error) {
      setTransportError(toErrorMessage(error, t("pages.sync.error.generic")));
    }
  }, [applyRun, latestPreview, pushActionFeedback, runId, t]);

  const handleUndo = useCallback(async () => {
    if (!runId || !latestUndoableChange) return;

    setTransportError(null);

    try {
      await undoRun.mutateAsync({
        runId,
        payload: {
          change_id: latestUndoableChange.id,
          idempotency_key: crypto.randomUUID(),
        },
      });

      pushActionFeedback("undo");
    } catch (error) {
      setTransportError(toErrorMessage(error, t("pages.sync.error.generic")));
    }
  }, [latestUndoableChange, pushActionFeedback, runId, t, undoRun]);

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

    const onOpenActions = () => {
      setIsDrawerOpen(true);
    };

    window.addEventListener("sync-chat:new-chat", onNewChat);
    window.addEventListener("sync-chat:open-actions", onOpenActions);

    return () => {
      window.removeEventListener("sync-chat:new-chat", onNewChat);
      window.removeEventListener("sync-chat:open-actions", onOpenActions);
    };
  }, [handleNewChat]);

  const actionsRail = (
    <ActionsRail
      latestPreview={latestPreview}
      latestQuestion={latestQuestion}
      latestDraft={latestDraft}
      changes={changes}
      notices={notices}
      toolTimeline={toolTimeline}
      actionFeedback={actionFeedback}
      isStreaming={isStreaming}
      canApply={canApply}
      canUndo={canUndo}
      isApplying={applyRun.isPending}
      isUndoing={undoRun.isPending}
      onApply={handleApply}
      onUndo={handleUndo}
      labels={{
        title: t("pages.sync.actions.title"),
        statusStreaming: t("pages.sync.status.streaming"),
        statusReady: t("pages.sync.status.ready"),
        pendingAction: t("pages.sync.actions.pending"),
        preview: t("pages.sync.actions.preview"),
        apply: t("pages.sync.actions.apply"),
        undo: t("pages.sync.actions.undo"),
        changelog: t("pages.sync.actions.changelog"),
        question: t("pages.sync.actions.question"),
        draft: t("pages.sync.actions.draft"),
        debug: t("pages.sync.actions.debug"),
        noPendingAction: t("pages.sync.actions.noPending"),
        noChanges: t("pages.sync.actions.noChanges"),
        noToolEvents: t("pages.sync.actions.noToolEvents"),
        appliedSuccess: t("pages.sync.actions.appliedSuccess"),
        undoneSuccess: t("pages.sync.actions.undoneSuccess"),
        noTime: t("pages.sync.actions.noTime"),
      }}
      className="h-full"
    />
  );

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
          latestPreview={latestPreview}
          canApply={canApply}
          canUndo={canUndo}
          isApplying={applyRun.isPending}
          isUndoing={undoRun.isPending}
          onApply={handleApply}
          onUndo={handleUndo}
          previewLabels={{
            title: t("pages.sync.previewPlan.title"),
            summary: t("pages.sync.previewPlan.summary"),
            mutations: t("pages.sync.previewPlan.mutations"),
            notes: t("pages.sync.previewPlan.notes"),
            apply: t("pages.sync.actions.apply"),
            undo: t("pages.sync.actions.undo"),
            pending: t("pages.sync.previewPlan.pending"),
          }}
          assistantLabel={t("pages.sync.roles.assistant")}
          userLabel={t("pages.sync.roles.user")}
          toolLabel={t("pages.sync.roles.tool")}
          systemLabel={t("pages.sync.roles.system")}
          emptyTitle={t("pages.sync.empty.title")}
          emptySubtitle={t("pages.sync.empty.subtitle")}
          errorTitle={t("pages.sync.error.title")}
          warningTitle={t("pages.sync.warning.title")}
          pendingLabel={t("pages.sync.message.pending")}
          failedLabel={t("pages.sync.message.failed")}
          retryLabel={t("pages.sync.retry")}
          logAriaLabel={t("pages.sync.aria.log")}
          activityTitle={t("pages.sync.activity.title")}
          queueLabel={t("pages.sync.activity.queueLabel")}
          onRetry={handleRetry}
        />

        <Composer
          value={composerValue}
          onValueChange={setComposerValue}
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
          disabled={createRun.isPending || streamRun.isPending}
          models={mappedModels}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          placeholder={t("pages.sync.composer.placeholder")}
          sendLabel={t("pages.sync.composer.send")}
          stopLabel={t("pages.sync.composer.stop")}
          modelLabel={t("pages.sync.composer.model")}
          voiceSoonLabel={t("pages.sync.composer.voiceSoon")}
          attachSoonLabel={t("pages.sync.composer.attachSoon")}
          enableAttach={false}
          enableVoice={false}
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
        actionsContent={actionsRail}
        labels={{
          title: t("pages.sync.drawer.title"),
          historyTab: t("pages.sync.history.title"),
          actionsTab: t("pages.sync.actions.title"),
          searchPlaceholder: t("pages.sync.history.search"),
          empty: t("pages.sync.history.empty"),
          lastUpdate: t("pages.sync.history.lastUpdate"),
          model: t("pages.sync.history.model"),
        }}
      />
    </section>
  );
}
