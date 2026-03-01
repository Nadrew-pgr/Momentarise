import React, { useCallback, useMemo, useState, useRef } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { SyncEventEnvelope } from "@momentarise/shared";
import {
  useCreateSyncRun,
  useSyncModels,
  useSyncRun,
  useSyncStream,
  useApplySyncRun,
  useUndoSyncRun,
  useSyncChanges,
} from "@/hooks/use-sync";

import { MessageList } from "@/components/sync-chat/message-list";
import { Composer } from "@/components/sync-chat/composer";
import { ActionsRail } from "@/components/sync-chat/actions-rail";

function uniqueBySeq(events: SyncEventEnvelope[]): SyncEventEnvelope[] {
  const map = new Map<number, SyncEventEnvelope>();
  for (const event of events) map.set(event.seq, event);
  return [...map.values()].sort((a, b) => a.seq - b.seq);
}

export default function SyncScreen() {
  const { t } = useTranslation();

  const [runId, setRunId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState<SyncEventEnvelope[]>([]);

  // Streaming state
  const [streamingBuffer, setStreamingBuffer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const seqSeenRef = useRef<Set<number>>(new Set());

  const { data: models } = useSyncModels();
  const { data: run } = useSyncRun(runId);
  const { data: changes } = useSyncChanges(runId);
  const createRun = useCreateSyncRun();
  const applyRun = useApplySyncRun();
  const undoRun = useUndoSyncRun();

  const previewEvents = events.filter((e) => e.type === "preview");
  const latestPreview = previewEvents.length > 0 ? previewEvents[previewEvents.length - 1].payload : null;
  const latestUndoableChange = changes?.find((change) => change.undoable) ?? null;

  const handleApply = async () => {
    if (!runId || !latestPreview) return;
    try {
      await applyRun.mutateAsync({
        runId,
        payload: {
          preview_id: (latestPreview as any).id,
          idempotency_key: `${Date.now()}-${Math.random()}`,
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUndo = async () => {
    if (!runId || !latestUndoableChange) return;
    try {
      await undoRun.mutateAsync({
        runId,
        payload: {
          change_id: latestUndoableChange.id,
          idempotency_key: `${Date.now()}-${Math.random()}`,
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const onEvent = useCallback((event: SyncEventEnvelope) => {
    if (seqSeenRef.current.has(event.seq)) return;
    seqSeenRef.current.add(event.seq);

    switch (event.type) {
      case "token":
        setIsStreaming(true);
        setStreamingBuffer((prev) => prev + event.payload.delta);
        break;
      case "message":
        setEvents((prev) => uniqueBySeq([...prev, event]));
        setStreamingBuffer("");
        break;
      case "done":
        setIsStreaming(false);
        break;
      default:
        setEvents((prev) => uniqueBySeq([...prev, event]));
        break;
    }
  }, []);

  const streamRun = useSyncStream(onEvent);

  const lastSeq = useMemo(() => events[events.length - 1]?.seq ?? 0, [events]);

  // Extract tool events
  const toolTimeline = useMemo(() => {
    return events
      .filter((e) => e.type === "tool_call" || e.type === "tool_result")
      .map((e) => {
        const payload = e.payload as any;
        return {
          id: payload.tool_call_id,
          seq: e.seq,
          kind: e.type as "tool_call" | "tool_result",
          toolName: payload.tool_name,
          status: payload.status,
          summary: payload.summary,
          createdAt: new Date(e.ts),
        };
      })
      .reverse(); // Newest first
  }, [events]);

  const messages = useMemo(() => {
    return events
      .filter((e) => e.type === "message")
      .map((e) => {
        const payload = e.payload as Record<string, unknown>;
        const contentJson = (payload.content_json || {}) as Record<string, unknown>;

        return {
          id: String(payload.id ?? e.seq),
          seq: e.seq,
          role: (payload.role as "user" | "assistant" | "system" | "tool") ?? "assistant",
          content: String(contentJson.text ?? contentJson.content ?? ""),
        };
      });
  }, [events]);

  async function ensureRun(): Promise<string> {
    if (runId) return runId;
    const created = await createRun.mutateAsync({
      mode: "guided",
      message: "",
      model: models?.find((model) => model.is_default)?.id,
      context_json: {},
    });
    setRunId(created.id);
    setEvents([]);
    seqSeenRef.current.clear();
    return created.id;
  }

  async function handleSend() {
    const text = message.trim();
    if (!text || isStreaming) return;

    // Optimistic user message insertion can be handled here if needed, 
    // but the backend will echo it back. For speed just clear input:
    setMessage("");

    try {
      const targetRunId = await ensureRun();
      setIsStreaming(true);
      await streamRun.mutateAsync({
        runId: targetRunId,
        payload: { message: text, from_seq: lastSeq },
      });
    } catch (e) {
      console.error("Stream failed", e);
      setIsStreaming(false);
    }
  }

  function handleStop() {
    // There is no explicit abort in useSyncStream without AbortController
    // For now we just reset UI state
    setIsStreaming(false);
  }

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <View className="flex-1 relative">
        {/* Floating Actions Header */}
        <MessageList
          messages={messages}
          streamingBuffer={streamingBuffer}
          isStreaming={isStreaming}
          emptyTitle={t("pages.sync.emptyTitle", "Synchronisez votre vie")}
          emptySubtitle={t("pages.sync.emptySubtitle", "Je suis là pour vous aider")}
        />
        <View className="px-2">
          <ActionsRail
            latestPreview={latestPreview as any}
            changes={changes ?? []}
            toolTimeline={toolTimeline}
            actionFeedback={[]}
            canApply={!!(runId && latestPreview && !applyRun.isPending)}
            canUndo={!!(runId && latestUndoableChange && !undoRun.isPending)}
            isApplying={applyRun.isPending}
            isUndoing={undoRun.isPending}
            onApply={handleApply}
            onUndo={handleUndo}
            labels={{
              title: t("pages.sync.actions.title", "Actions"),
              pendingAction: t("pages.sync.actions.pending", "Pending Action"),
              preview: t("pages.sync.actions.preview", "Preview"),
              apply: t("pages.sync.actions.apply", "Apply"),
              undo: t("pages.sync.actions.undo", "Undo"),
              changelog: t("pages.sync.actions.changelog", "Changelog"),
              debug: t("pages.sync.actions.debug", "Debug"),
              noPendingAction: t("pages.sync.actions.noPending", "No pending actions"),
              noChanges: t("pages.sync.actions.noChanges", "No changes yet"),
              noToolEvents: t("pages.sync.actions.noToolEvents", "No tools used"),
              appliedSuccess: t("pages.sync.actions.appliedSuccess", "Applied successfully"),
              undoneSuccess: t("pages.sync.actions.undoneSuccess", "Undone successfully"),
              noTime: t("pages.sync.actions.noTime", "Just now"),
            }}
          />
        </View>
        <Composer
          value={message}
          onChange={setMessage}
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
          disabled={streamRun.isPending && !isStreaming}
          placeholder={t("pages.sync.placeholder", "Demander à Sync...")}
        />
      </View>
    </SafeAreaView>
  );
}
