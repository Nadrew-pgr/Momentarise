import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { syncPreviewSchema } from "@momentarise/shared";
import type { SyncApply, SyncPreview, SyncRunSummary, SyncRunMode, SyncQuestion } from "@momentarise/shared";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  type GestureResponderEvent,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { EllipsisVertical, Menu } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useApplySyncRun,
  useCreateSyncRun,
  useDeleteSyncRun,
  usePatchSyncRun,
  useSyncContextSearch,
  useSyncModels,
  useSyncRunEvents,
  useSyncRuns,
  useSyncStream,
  useUndoSyncRun,
} from "@/hooks/use-sync";
import { useUploadCapture } from "@/hooks/use-inbox";
import { useAppToast, useAuthStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import { Header } from "@/components/react-native-ai-elements/header";
import { EmptyState } from "@/components/react-native-ai-elements/empty-state";
import { Conversation } from "@/components/react-native-ai-elements/conversation";
import { Composer, type ComposerPlusActionKey } from "@/components/react-native-ai-elements/composer";
import { HistoryDrawer } from "@/components/react-native-ai-elements/history-drawer";
import { ModelSelector } from "@/components/react-native-ai-elements/model-selector";
import { RunModeSelector } from "@/components/react-native-ai-elements/run-mode-selector";
import type { ChatMessage, SyncMessageContextLink } from "@/components/react-native-ai-elements/types";
import { PreviewPlanCard } from "@/components/sync/preview-plan-card";
import { InteractiveQuestionUI } from "@/components/sync/interactive-question-ui";
import { AnchoredMenu, type AnchoredMenuAnchor } from "@/components/ui/anchored-menu";

type MessageRow = ChatMessage;
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractPlanPreviewsFromContentJson(
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
    if (parsed.success) previews.push(parsed.data);
  }
  return previews.sort((a, b) => a.seq - b.seq);
}

function upsertPreviewList(current: SyncPreview[], next: SyncPreview): SyncPreview[] {
  const rest = current.filter((preview) => preview.id !== next.id);
  return [...rest, next].sort((a, b) => a.seq - b.seq);
}

function upsertPreviewQueue(current: SyncPreview[], next: SyncPreview): SyncPreview[] {
  return upsertPreviewList(current, next);
}

function resolveMessagePreviews(
  role: MessageRow["role"],
  messagePreviews: SyncPreview[],
  pendingQueue: SyncPreview[]
): { planPreviews: SyncPreview[]; nextQueue: SyncPreview[] } {
  if (role !== "assistant") {
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

function attachPreviewToLastAssistantMessage(messages: MessageRow[], previews: SyncPreview[]): MessageRow[] {
  if (previews.length === 0) return messages;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role !== "assistant") continue;
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

function extractMessageContent(contentJson: Record<string, unknown> | null | undefined): string {
  if (!contentJson || typeof contentJson !== "object") return "";
  const textCandidate = contentJson.text;
  if (typeof textCandidate === "string") return textCandidate;

  const contentCandidate = contentJson.content;
  if (typeof contentCandidate === "string") return contentCandidate;

  try {
    return JSON.stringify(contentJson, null, 2);
  } catch {
    return "";
  }
}

function extractMessageContextLinks(
  contentJson: Record<string, unknown> | null | undefined
): SyncMessageContextLink[] {
  if (!isRecord(contentJson)) return [];
  const metadataCandidate = contentJson.metadata;
  if (!isRecord(metadataCandidate)) return [];
  const syncContextCandidate = metadataCandidate.sync_context;
  if (!isRecord(syncContextCandidate)) return [];
  const resolvedCandidate = syncContextCandidate.resolved;
  if (!Array.isArray(resolvedCandidate)) return [];

  const links: SyncMessageContextLink[] = [];
  for (const entry of resolvedCandidate) {
    if (!isRecord(entry)) continue;
    const kind = entry.kind;
    const id = entry.id;
    const label = entry.label;
    const internalPath = entry.internal_path;
    if (
      (kind !== "capture" && kind !== "item") ||
      typeof id !== "string" ||
      typeof label !== "string" ||
      typeof internalPath !== "string" ||
      !internalPath.startsWith("/")
    ) {
      continue;
    }
    links.push({
      kind,
      id,
      label,
      internalPath,
      source: typeof entry.source === "string" ? entry.source : undefined,
      status: typeof entry.status === "string" ? entry.status : undefined,
      captureType: typeof entry.capture_type === "string" ? entry.capture_type : undefined,
    });
  }
  return links;
}

function resolveCaptureTypeFromMime(mime: string): "photo" | "voice" | "file" {
  const lowered = (mime || "").toLowerCase();
  if (lowered.startsWith("image/")) return "photo";
  if (lowered.startsWith("audio/")) return "voice";
  return "file";
}

function buildIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function removeChangeIdMappings(
  mappings: Record<string, string>,
  changeId: string
): { nextMappings: Record<string, string>; removedPreviewIds: string[] } {
  const nextMappings: Record<string, string> = {};
  const removedPreviewIds: string[] = [];

  for (const [previewId, mappedChangeId] of Object.entries(mappings)) {
    if (mappedChangeId === changeId) {
      removedPreviewIds.push(previewId);
      continue;
    }
    nextMappings[previewId] = mappedChangeId;
  }

  return { nextMappings, removedPreviewIds };
}

function runTitle(run: SyncRunSummary | null): string | null {
  if (!run) return null;
  if (run.title && run.title.trim()) return run.title.trim();
  if (run.last_message_preview && run.last_message_preview.trim()) {
    return run.last_message_preview.trim();
  }
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
  const next = value.replace(matcher, (_match, prefix: string) => (prefix ? " " : ""));
  return next.replace(/\s{2,}/g, " ").trimStart();
}

export default function SyncScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const showToast = useAppToast((state) => state.show);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("auto");
  const [runMode, setRunMode] = useState<SyncRunMode>("free");
  const [composerHeight, setComposerHeight] = useState(96);
  const [previewToChangeId, setPreviewToChangeId] = useState<Record<string, string>>({});
  const [appliedPreviewIds, setAppliedPreviewIds] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [latestQuestion, setLatestQuestion] = useState<SyncQuestion | null>(null);
  const [isHydratingRun, setIsHydratingRun] = useState(false);
  const [isConversationMenuOpen, setIsConversationMenuOpen] = useState(false);
  const [conversationMenuAnchor, setConversationMenuAnchor] = useState<AnchoredMenuAnchor | null>(null);
  const [contextEntries, setContextEntries] = useState<SyncComposerContextEntry[]>([]);
  const [isContextPickerOpen, setIsContextPickerOpen] = useState(false);
  const [contextPickerQuery, setContextPickerQuery] = useState("");
  const [composerSelection, setComposerSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const [mentionState, setMentionState] = useState<ComposerMentionState | null>(null);
  const [selectedContextResults, setSelectedContextResults] = useState<Record<string, {
    kind: "capture" | "item";
    id: string;
    label: string;
    subtitle?: string | null;
    status?: string | null;
  }>>({});
  const pendingPreviewQueueRef = useRef<SyncPreview[]>([]);

  const { data: syncModels = [] } = useSyncModels();
  const {
    data: historyRuns,
    isLoading: isHistoryLoading,
    error: historyError,
    refetch: refetchHistoryRuns,
  } = useSyncRuns(50);
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
  const createRun = useCreateSyncRun();
  const applyRun = useApplySyncRun();
  const undoRun = useUndoSyncRun();
  const deleteRun = useDeleteSyncRun();
  const patchRun = usePatchSyncRun();
  const uploadCapture = useUploadCapture();
  const eventsQuery = useSyncRunEvents(isHydratingRun ? runId : null);

  const currentRunSummary = useMemo(
    () => (historyRuns ?? []).find((run) => run.id === runId) ?? null,
    [historyRuns, runId]
  );
  const conversationTitle =
    runTitle(currentRunSummary) ?? (runId ? runId.slice(0, 8) : t("pages.sync.header.newConversation"));

  const resetConversationState = useCallback(() => {
    setMessages([]);
    setStreamingText("");
    setPreviewToChangeId({});
    setAppliedPreviewIds([]);
    setIsHydratingRun(false);
    setContextEntries([]);
    setIsContextPickerOpen(false);
    setContextPickerQuery("");
    setComposerSelection({ start: 0, end: 0 });
    setMentionState(null);
    setSelectedContextResults({});
    pendingPreviewQueueRef.current = [];
  }, []);

  const startNewConversation = useCallback(() => {
    setRunId(null);
    setInput("");
    resetConversationState();
    setIsConversationMenuOpen(false);
  }, [resetConversationState]);

  useEffect(() => {
    if (!isContextPickerOpen) return;
    setMentionState(null);
  }, [isContextPickerOpen]);

  const openConversationMenu = useCallback((event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    setConversationMenuAnchor({
      x: pageX - 20,
      y: pageY - 20,
      width: 40,
      height: 40,
    });
    setIsConversationMenuOpen(true);
  }, []);

  const openAppliedTarget = useCallback(
    (applied: Pick<SyncApply, "open_target_kind" | "open_target_id" | "open_target_date">) => {
      if (applied.open_target_kind === "item" && applied.open_target_id) {
        router.push(`/items/${applied.open_target_id}`);
        return;
      }

      const timelinePath = applied.open_target_date
        ? `/(tabs)/timeline?date=${encodeURIComponent(applied.open_target_date)}`
        : "/(tabs)/timeline";
      router.push(timelinePath);
    },
    [router]
  );

  const undoByChangeId = useCallback(
    async (changeId: string) => {
      if (!runId) return;

      await undoRun.mutateAsync({
        runId,
        payload: {
          change_id: changeId,
          idempotency_key: buildIdempotencyKey(),
        },
      });

      setPreviewToChangeId((prev) => {
        const { nextMappings, removedPreviewIds } = removeChangeIdMappings(prev, changeId);
        if (removedPreviewIds.length > 0) {
          setAppliedPreviewIds((current) =>
            current.filter((previewId) => !removedPreviewIds.includes(previewId))
          );
        }
        return nextMappings;
      });
    },
    [runId, undoRun]
  );

  const confirmDeleteRun = useCallback(
    (targetRunId: string) => {
      Alert.alert(
        t("pages.sync.menu.deleteConfirmTitle"),
        t("pages.sync.menu.deleteConfirmMessage"),
        [
          {
            text: t("common.cancel"),
            style: "cancel",
          },
          {
            text: t("pages.sync.menu.delete"),
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  await deleteRun.mutateAsync(targetRunId);
                  if (targetRunId === runId) {
                    setRunId(null);
                    resetConversationState();
                  }
                  showToast({ message: t("pages.sync.menu.deleted") });
                } catch (error) {
                  console.error(error);
                  showToast({ message: t("pages.sync.history.loadError") });
                }
              })();
            },
          },
        ]
      );
    },
    [deleteRun, resetConversationState, runId, showToast, t]
  );

  const renameRunWithPrompt = useCallback(
    (targetRun: SyncRunSummary) => {
      const initial = runTitle(targetRun) ?? targetRun.id.slice(0, 8);
      if (Platform.OS !== "ios" || typeof Alert.prompt !== "function") {
        showToast({ message: t("pages.sync.menu.renameUnsupported") });
        return;
      }

      Alert.prompt(
        t("pages.sync.menu.renamePromptTitle"),
        t("pages.sync.menu.renamePromptBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.save"),
            onPress: (value?: string) => {
              const nextTitle = value?.trim() ?? "";
              if (!nextTitle) {
                showToast({ message: t("pages.sync.menu.renameEmpty") });
                return;
              }
              void (async () => {
                try {
                  await patchRun.mutateAsync({
                    runId: targetRun.id,
                    payload: { title: nextTitle },
                  });
                  showToast({ message: t("pages.sync.menu.renameSuccess") });
                } catch (error) {
                  console.error(error);
                  showToast({ message: t("pages.sync.menu.renameError") });
                }
              })();
            },
          },
        ],
        "plain-text",
        initial
      );
    },
    [patchRun, showToast, t]
  );

  const openRunConversation = useCallback(
    (targetRunId: string) => {
      setRunId(targetRunId);
      resetConversationState();
      setIsHydratingRun(true);
      setIsDrawerOpen(false);
      setIsConversationMenuOpen(false);
    },
    [resetConversationState]
  );

  const maxContextEntries = 5;
  const canSendComposer = useMemo(
    () =>
      contextEntries.length <= maxContextEntries &&
      contextEntries.every((entry) => entry.status === "ready"),
    [contextEntries]
  );

  const contextStatusLabels = useMemo(
    () => ({
      uploading: t("pages.sync.composer.contextStatus.uploading"),
      processing: t("pages.sync.composer.contextStatus.processing"),
      ready: t("pages.sync.composer.contextStatus.ready"),
      failed: t("pages.sync.composer.contextStatus.failed"),
    }),
    [t]
  );

  const updateContextEntry = useCallback(
    (localId: string, updater: (entry: SyncComposerContextEntry) => SyncComposerContextEntry) => {
      setContextEntries((prev) =>
        prev.map((entry) => (entry.local_id === localId ? updater(entry) : entry))
      );
    },
    []
  );

  const insertContextTokenAtSelection = useCallback(
    (tokenText: string, range?: { start: number; end: number }) => {
      const targetRange = range ?? composerSelection;
      const insertion = insertContextTokenInText(input, tokenText, targetRange);
      setInput(insertion.value);
      setComposerSelection({ start: insertion.cursor, end: insertion.cursor });
      setMentionState(null);
    },
    [composerSelection, input]
  );

  const removeContextEntry = useCallback(
    (localId: string) => {
      const target = contextEntries.find((entry) => entry.local_id === localId);
      setContextEntries((prev) => prev.filter((entry) => entry.local_id !== localId));
      if (target?.token_text) {
        setInput((prev) => removeContextTokenFromText(prev, target.token_text));
      }
    },
    [contextEntries]
  );

  useEffect(() => {
    if (contextEntries.length === 0) return;
    const tokenUsage = new Map<string, number>();
    const nextEntries = contextEntries.filter((entry) => {
      const used = tokenUsage.get(entry.token_text) ?? 0;
      const available = countContextTokenOccurrences(input, entry.token_text);
      if (available > used) {
        tokenUsage.set(entry.token_text, used + 1);
        return true;
      }
      return false;
    });
    const removedCount = contextEntries.length - nextEntries.length;
    if (removedCount <= 0) return;
    setContextEntries(nextEntries);
    console.info("[sync] context_token_removed_by_text_edit", { count: removedCount });
  }, [contextEntries, input]);

  const pollCaptureUntilReady = useCallback(async (captureId: string): Promise<"ready" | "failed"> => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const res = await apiFetch(`/api/v1/inbox/${captureId}`);
      if (!res.ok) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      const data = (await res.json()) as { capture?: { status?: string } };
      const statusCandidate = data.capture?.status;
      if (statusCandidate === "ready" || statusCandidate === "applied" || statusCandidate === "archived") {
        return "ready";
      }
      if (statusCandidate === "failed") return "failed";
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return "failed";
  }, []);

  const enqueueLocalUpload = useCallback(
    async ({
      uri,
      name,
      mimeType,
      captureType,
    }: {
      uri: string;
      name: string;
      mimeType: string;
      captureType: "photo" | "voice" | "file";
    }) => {
      if (contextEntries.length >= maxContextEntries) {
        showToast({ message: t("pages.sync.composer.attachLimitExceeded") });
        return;
      }
      const localId = `upload:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tokenText = buildUniqueContextTokenText(name, contextEntries);
      setContextEntries((prev) => [
        ...prev,
        {
          local_id: localId,
          token_key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          token_text: tokenText,
          kind: "attachment",
          label: name,
          status: "uploading",
          source: "upload",
          internal_path: "",
        },
      ]);
      insertContextTokenAtSelection(tokenText);

      try {
        const uploaded = await uploadCapture.mutateAsync({
          uri,
          name,
          type: mimeType,
          captureType,
          source: "sync_attachment",
          metadata: {
            source: "sync_chat",
            file_name: name,
            mime_type: mimeType,
          },
        });
        const captureId = uploaded.id;
        const immediateReady =
          uploaded.status === "ready" || uploaded.status === "applied" || uploaded.status === "archived";
        updateContextEntry(localId, (entry) => ({
          ...entry,
          capture_id: captureId,
          internal_path: `/inbox/captures/${captureId}`,
          status: immediateReady ? "ready" : "processing",
        }));
        if (!immediateReady) {
          const pollResult = await pollCaptureUntilReady(captureId);
          updateContextEntry(localId, (entry) => ({
            ...entry,
            status: pollResult === "ready" ? "ready" : "failed",
            error: pollResult === "ready" ? undefined : t("pages.sync.composer.attachmentFailed"),
          }));
        }
      } catch (error) {
        console.error(error);
        updateContextEntry(localId, (entry) => ({
          ...entry,
          status: "failed",
          error: t("pages.sync.composer.attachmentFailed"),
        }));
      }
    },
    [
      contextEntries,
      contextEntries.length,
      insertContextTokenAtSelection,
      maxContextEntries,
      pollCaptureUntilReady,
      showToast,
      t,
      updateContextEntry,
      uploadCapture,
    ]
  );

  const toggleContextSearchResult = useCallback((result: {
    kind: "capture" | "item";
    id: string;
    label: string;
    subtitle?: string | null;
    status?: string | null;
  }) => {
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

  const confirmContextPicker = useCallback(() => {
    const picked = Object.values(selectedContextResults);
    if (picked.length === 0) {
      setIsContextPickerOpen(false);
      return;
    }
    const pendingInboxCaptures: Array<{ localId: string; captureId: string }> = [];
    const nextEntries = [...contextEntries];
    const insertedTokenTexts: string[] = [];
    for (const result of picked) {
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
          token_key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
          token_key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

    if (nextEntries.length !== contextEntries.length) {
      setContextEntries(nextEntries);
      let nextValue = input;
      let nextRange = composerSelection;
      for (const tokenText of insertedTokenTexts) {
        const insertion = insertContextTokenInText(nextValue, tokenText, nextRange);
        nextValue = insertion.value;
        nextRange = { start: insertion.cursor, end: insertion.cursor };
      }
      setInput(nextValue);
      setComposerSelection(nextRange);
    }
    if (contextEntries.length + picked.length > maxContextEntries) {
      showToast({ message: t("pages.sync.composer.attachLimitExceeded") });
    }
    setSelectedContextResults({});
    setIsContextPickerOpen(false);

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
    contextEntries.length,
    contextEntries,
    composerSelection,
    input,
    maxContextEntries,
    pollCaptureUntilReady,
    selectedContextResults,
    showToast,
    t,
    updateContextEntry,
  ]);

  const updateMentionState = useCallback(
    (nextValue: string, selection: { start: number; end: number }) => {
      setComposerSelection(selection);
      const detectedMention = detectMentionAtCursor(nextValue, selection);
      if (!detectedMention) {
        setMentionState(null);
        return;
      }
      setMentionState(detectedMention);
    },
    []
  );

  const attachMentionReference = useCallback(
    (result: { kind: "capture" | "item"; id: string; label: string }, preferredTokenText?: string) => {
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
        showToast({ message: t("pages.sync.composer.attachLimitExceeded") });
        return { status: "limit" as const, tokenText: null };
      }

      const tokenText =
        preferredTokenText ?? buildUniqueContextTokenText(result.label, contextEntries);
      setContextEntries([
        ...contextEntries,
        {
          local_id: `reference:${result.kind}:${result.id}`,
          token_key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          token_text: tokenText,
          kind: "reference",
          label: result.label,
          status: "ready",
          reference_kind: result.kind,
          reference_id: result.id,
          internal_path:
            result.kind === "item"
              ? `/inbox/items/${result.id}`
              : `/inbox/captures/${result.id}`,
        },
      ]);
      return { status: "added" as const, tokenText };
    },
    [contextEntries, maxContextEntries, showToast, t]
  );

  const handleSelectMention = useCallback(
    (result: { kind: "capture" | "item"; id: string; label: string }) => {
      if (!mentionState) return;
      const nextTokenText = buildUniqueContextTokenText(result.label, contextEntries);
      const outcome = attachMentionReference(result, nextTokenText);
      if (outcome.status === "limit" || !outcome.tokenText) return;
      insertContextTokenAtSelection(outcome.tokenText, {
        start: mentionState.start,
        end: mentionState.end,
      });
    },
    [attachMentionReference, contextEntries, insertContextTokenAtSelection, mentionState]
  );

  const handleComposerChange = useCallback(
    (value: string) => {
      const wasAtEnd = composerSelection.start === input.length && composerSelection.end === input.length;
      const nextSelection = wasAtEnd
        ? { start: value.length, end: value.length }
        : {
          start: Math.min(composerSelection.start, value.length),
          end: Math.min(composerSelection.end, value.length),
        };
      setInput(value);
      updateMentionState(value, nextSelection);
    },
    [composerSelection, input.length, updateMentionState]
  );

  const handleComposerSelectionChange = useCallback(
    (selection: { start: number; end: number }) => {
      updateMentionState(input, selection);
    },
    [input, updateMentionState]
  );

  const handlePlusAction = useCallback(
    async (actionKey: ComposerPlusActionKey) => {
      try {
        if (actionKey === "inbox") {
          setContextPickerQuery("");
          setSelectedContextResults({});
          setIsContextPickerOpen(true);
          return;
        }
        if (actionKey === "photo") {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            showToast({ message: t("pages.sync.composer.photoPermissionDenied") });
            return;
          }
          const result = (await ImagePicker.launchImageLibraryAsync({ quality: 0.9 })) as {
            canceled?: boolean;
            cancelled?: boolean;
            assets?: Array<{ uri?: string; fileName?: string; mimeType?: string }>;
          };
          if (result.canceled || result.cancelled) return;
          const asset = result.assets?.[0];
          const uri = asset?.uri;
          if (!uri) return;
          const mimeType = asset?.mimeType ?? "image/jpeg";
          const name = asset?.fileName ?? `photo-${Date.now()}.jpg`;
          await enqueueLocalUpload({
            uri,
            name,
            mimeType,
            captureType: "photo",
          });
          return;
        }

        const typeFilter = actionKey === "voice" ? "audio/*" : "*/*";
        const result = (await DocumentPicker.getDocumentAsync({
          type: typeFilter,
          copyToCacheDirectory: true,
        })) as {
          canceled?: boolean;
          cancelled?: boolean;
          assets?: Array<{ uri?: string; name?: string; mimeType?: string }>;
        };
        if (result.canceled || result.cancelled) return;
        const asset = result.assets?.[0];
        const uri = asset?.uri;
        if (!uri) return;
        const mimeType = asset?.mimeType ?? (actionKey === "voice" ? "audio/m4a" : "application/octet-stream");
        const name = asset?.name ?? `${actionKey}-${Date.now()}`;
        await enqueueLocalUpload({
          uri,
          name,
          mimeType,
          captureType: actionKey === "voice" ? "voice" : resolveCaptureTypeFromMime(mimeType),
        });
      } catch (error) {
        console.error(error);
        showToast({ message: t("pages.sync.composer.attachmentFailed") });
      }
    },
    [enqueueLocalUpload, showToast, t]
  );

  const streamMutation = useSyncStream((event) => {
    if (event.type === "token") {
      setStreamingText((prev) => prev + event.payload.delta);
      return;
    }

    if (event.type === "message") {
      const textContent = extractMessageContent(event.payload.content_json);
      const role: MessageRow["role"] =
        event.payload.role === "tool" ? "assistant" : event.payload.role;
      const planPreviewsFromMessage = extractPlanPreviewsFromContentJson(event.payload.content_json);
      const { planPreviews, nextQueue } = resolveMessagePreviews(
        role,
        planPreviewsFromMessage,
        pendingPreviewQueueRef.current
      );
      pendingPreviewQueueRef.current = nextQueue;
      setMessages((prev) => {
        if (role === "user") {
          const isDuplicate = prev.some(
            (message) => message.role === "user" && message.content === textContent
          );
          if (isDuplicate) return prev;
        }
        const nextMessage: MessageRow = {
          id: event.payload.id,
          role,
          content: textContent,
          planPreviews: planPreviews.length > 0 ? planPreviews : undefined,
          contextLinks: extractMessageContextLinks(event.payload.content_json),
        };
        const existingIndex = prev.findIndex((message) => message.id === nextMessage.id);
        if (existingIndex === -1) return [...prev, nextMessage];

        const next = [...prev];
        next[existingIndex] = nextMessage;
        return next;
      });
      setStreamingText("");
      return;
    }

    if (event.type === "question") {
      setLatestQuestion(event.payload);
      return;
    }

    if (event.type === "preview") {
      pendingPreviewQueueRef.current = upsertPreviewQueue(
        pendingPreviewQueueRef.current,
        event.payload
      );
      return;
    }

    if (event.type === "applied") {
      setPreviewToChangeId((prev) => ({
        ...prev,
        [event.payload.preview_id]: event.payload.change_id,
      }));
      setAppliedPreviewIds((prev) =>
        prev.includes(event.payload.preview_id) ? prev : [...prev, event.payload.preview_id]
      );
      return;
    }

    if (event.type === "undone") {
      setPreviewToChangeId((prev) => {
        const { nextMappings, removedPreviewIds } = removeChangeIdMappings(
          prev,
          event.payload.source_change_id
        );
        if (removedPreviewIds.length > 0) {
          setAppliedPreviewIds((current) =>
            current.filter((previewId) => !removedPreviewIds.includes(previewId))
          );
        }
        return nextMappings;
      });
      return;
    }

    if (event.type === "warning") {
      showToast({
        message:
          event.payload.code === "legacy_event_ignored"
            ? t("pages.sync.warning.legacyEventIgnored")
            : event.payload.message,
      });
    }

    if (event.type === "done") {
      if (pendingPreviewQueueRef.current.length > 0) {
        const orphanPreviews = pendingPreviewQueueRef.current.slice();
        pendingPreviewQueueRef.current = [];
        setMessages((prev) => attachPreviewToLastAssistantMessage(prev, orphanPreviews));
      }
    }
  });

  useEffect(() => {
    if (!isHydratingRun) return;
    if (eventsQuery.error) {
      showToast({ message: t("pages.sync.history.loadError") });
      setIsHydratingRun(false);
      return;
    }
    if (!eventsQuery.data) return;

    const sortedEvents = [...eventsQuery.data].sort((a, b) => a.seq - b.seq);
    let rebuiltMessages: MessageRow[] = [];
    let replayPreviewQueue: SyncPreview[] = [];
    const warningMessages: string[] = [];

    let rebuiltPreviewToChangeId: Record<string, string> = {};
    const rebuiltAppliedPreviewIds = new Set<string>();

    for (const event of sortedEvents) {
      if (event.type === "message") {
        const textContent = extractMessageContent(event.payload.content_json);
        const role: MessageRow["role"] =
          event.payload.role === "tool" ? "assistant" : event.payload.role;
        const planPreviewsFromMessage = extractPlanPreviewsFromContentJson(event.payload.content_json);
        const { planPreviews, nextQueue } = resolveMessagePreviews(
          role,
          planPreviewsFromMessage,
          replayPreviewQueue
        );
        replayPreviewQueue = nextQueue;

        const nextMessage: MessageRow = {
          id: event.payload.id,
          role,
          content: textContent,
          planPreviews: planPreviews.length > 0 ? planPreviews : undefined,
          contextLinks: extractMessageContextLinks(event.payload.content_json),
        };
        const existingIndex = rebuiltMessages.findIndex((message) => message.id === nextMessage.id);
        if (existingIndex === -1) rebuiltMessages = [...rebuiltMessages, nextMessage];
        else {
          const next = [...rebuiltMessages];
          next[existingIndex] = nextMessage;
          rebuiltMessages = next;
        }
        continue;
      }

      if (event.type === "warning") {
        warningMessages.push(
          event.payload.code === "legacy_event_ignored"
            ? t("pages.sync.warning.legacyEventIgnored")
            : event.payload.message
        );
        continue;
      }
      if (event.type === "preview") {
        replayPreviewQueue = upsertPreviewQueue(replayPreviewQueue, event.payload);
        continue;
      }
      if (event.type === "applied") {
        rebuiltPreviewToChangeId = {
          ...rebuiltPreviewToChangeId,
          [event.payload.preview_id]: event.payload.change_id,
        };
        rebuiltAppliedPreviewIds.add(event.payload.preview_id);
        continue;
      }
      if (event.type === "undone") {
        const { nextMappings, removedPreviewIds } = removeChangeIdMappings(
          rebuiltPreviewToChangeId,
          event.payload.source_change_id
        );
        rebuiltPreviewToChangeId = nextMappings;
        for (const previewId of removedPreviewIds) {
          rebuiltAppliedPreviewIds.delete(previewId);
        }
      }
    }

    if (replayPreviewQueue.length > 0) {
      rebuiltMessages = attachPreviewToLastAssistantMessage(rebuiltMessages, replayPreviewQueue);
    }

    pendingPreviewQueueRef.current = [];
    setMessages(rebuiltMessages);
    setPreviewToChangeId(rebuiltPreviewToChangeId);
    setAppliedPreviewIds(Array.from(rebuiltAppliedPreviewIds));
    setIsHydratingRun(false);
    for (const warningMessage of warningMessages) {
      showToast({ message: warningMessage });
    }
  }, [eventsQuery.data, eventsQuery.error, isHydratingRun, showToast, t]);

  useEffect(() => {
    if (!isHydratingRun) return;
    const timer = setTimeout(() => {
      showToast({ message: t("pages.sync.history.loadingSlow") });
    }, 8000);
    return () => clearTimeout(timer);
  }, [isHydratingRun, showToast, t]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || streamMutation.isPending) return;
    if (!canSendComposer) {
      showToast({ message: t("pages.sync.composer.waitAttachments") });
      return;
    }

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

    const userMsg: MessageRow = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      contextLinks: optimisticContextLinks.length > 0 ? optimisticContextLinks : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setComposerSelection({ start: 0, end: 0 });
    setMentionState(null);
    setContextEntries([]);
    Keyboard.dismiss();

    try {
      let currentRunId = runId;
      if (!currentRunId) {
        const run = await createRun.mutateAsync({
          mode: runMode,
          message: "",
          model: selectedModel || "auto",
        });
        currentRunId = run.id;
        setRunId(run.id);
        setIsHydratingRun(false);
      }

      setStreamingText("");
      await streamMutation.mutateAsync({
        runId: currentRunId,
        payload: {
          message: currentInput,
          attachments: attachmentsPayload,
          references: referencesPayload,
        },
      });
    } catch (error) {
      console.error(error);
      setMessages((prev) => prev.filter((message) => message.id !== userMsg.id));
      setInput(currentInput);
      setContextEntries(previousContextEntries);
      showToast({
        message:
          error instanceof Error && error.message
            ? error.message
            : t("pages.sync.error.generic"),
      });
    }
  }, [canSendComposer, contextEntries, createRun, input, runId, selectedModel, showToast, streamMutation, t]);

  const handleQuestionAnswer = useCallback(
    async (answer: string) => {
      if (!answer.trim() || streamMutation.isPending || !runId) return;

      const userMsg: MessageRow = {
        id: Date.now().toString(),
        role: "user",
        content: answer.trim(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLatestQuestion(null);
      setStreamingText("");

      try {
        await streamMutation.mutateAsync({
          runId,
          payload: {
            message: answer.trim(),
            idempotency_key: buildIdempotencyKey(),
          },
        });
      } catch (error) {
        console.error(error);
        setMessages((prev) => prev.filter((message) => message.id !== userMsg.id));
        showToast({
          message:
            error instanceof Error && error.message
              ? error.message
              : t("pages.sync.error.generic"),
        });
      }
    },
    [runId, showToast, streamMutation, t]
  );

  const handleApply = useCallback(
    async (previewId: string) => {
      if (!runId) return;
      try {
        const applyResult = await applyRun.mutateAsync({
          runId,
          payload: {
            preview_id: previewId,
            idempotency_key: buildIdempotencyKey(),
          },
        });
        setPreviewToChangeId((prev) => ({
          ...prev,
          [applyResult.preview_id]: applyResult.change_id,
        }));
        setAppliedPreviewIds((prev) =>
          prev.includes(applyResult.preview_id) ? prev : [...prev, applyResult.preview_id]
        );

        showToast({
          message: t("pages.sync.toast.applied"),
          actionLabel: t("pages.sync.toast.undo"),
          onAction: () => {
            void undoByChangeId(applyResult.change_id);
          },
          secondaryActionLabel: t("pages.sync.toast.open"),
          onSecondaryAction: () => {
            openAppliedTarget(applyResult);
          },
        });
      } catch (error) {
        console.error(error);
        showToast({ message: t("pages.sync.toast.applyError") });
      }
    },
    [applyRun, openAppliedTarget, runId, showToast, t, undoByChangeId]
  );

  const handleUndo = useCallback(
    async (previewId: string) => {
      const changeId = previewToChangeId[previewId];
      if (!changeId) return;
      try {
        await undoByChangeId(changeId);
      } catch (error) {
        console.error(error);
        showToast({ message: t("pages.sync.toast.undoError") });
      }
    },
    [previewToChangeId, showToast, t, undoByChangeId]
  );

  if (!isAuthenticated) return <View className="flex-1 bg-background" />;

  const historyLoadingEmptyState = (
    <View className="flex-1 min-h-[320px] items-center justify-center">
      <ActivityIndicator size="small" />
      <Text className="mt-3 text-sm text-muted-foreground">{t("pages.sync.history.loading")}</Text>
    </View>
  );
  const hasActiveRun = Boolean(runId && currentRunSummary);
  const isMentionPopoverVisible = Boolean(mentionState) && !isContextPickerOpen;
  const conversationMenuItems = useMemo(
    () => [
      {
        key: "new",
        label: t("pages.sync.menu.newChat"),
        onPress: startNewConversation,
      },
      {
        key: "rename",
        label: t("pages.sync.menu.renameCurrent"),
        disabled: !hasActiveRun,
        onPress: () => {
          if (!currentRunSummary) return;
          renameRunWithPrompt(currentRunSummary);
        },
      },
      {
        key: "delete",
        label: t("pages.sync.menu.deleteCurrent"),
        disabled: !hasActiveRun,
        destructive: true,
        onPress: () => {
          if (!runId) return;
          confirmDeleteRun(runId);
        },
      },
    ],
    [confirmDeleteRun, currentRunSummary, hasActiveRun, renameRunWithPrompt, runId, startNewConversation, t]
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <Header
        title={t("pages.sync.title")}
        conversationTitle={conversationTitle}
        onNewChatPress={startNewConversation}
        rightSlot={(
          <>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={() => setIsDrawerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t("pages.sync.menu.openHistory")}
            >
              <Menu size={20} className="text-foreground" strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={(event) => openConversationMenu(event)}
              accessibilityRole="button"
              accessibilityLabel={t("pages.sync.menu.title")}
            >
              <EllipsisVertical size={20} className="text-foreground" strokeWidth={2.5} />
            </TouchableOpacity>
          </>
        )}
      />

      <View className="flex-row items-center justify-center py-1">
        <RunModeSelector
          runMode={runMode}
          onModeChange={setRunMode}
          disabled={streamMutation.isPending}
        />
        <ModelSelector
          models={syncModels}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          disabled={streamMutation.isPending}
        />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View className="flex-1">
          <Conversation
            messages={messages}
            isStreaming={streamMutation.isPending}
            streamingText={streamingText}
            emptyState={isHydratingRun ? historyLoadingEmptyState : <EmptyState />}
            bottomInset={composerHeight}
            renderPlanPreview={(preview) => (
              <PreviewPlanCard
                preview={preview}
                isApplied={appliedPreviewIds.includes(preview.id)}
                isApplying={applyRun.isPending}
                isUndoing={undoRun.isPending}
                canApply={!applyRun.isPending && !appliedPreviewIds.includes(preview.id)}
                canUndo={Boolean(previewToChangeId[preview.id])}
                onApply={handleApply}
                onUndo={handleUndo}
                labels={{
                  title: t("pages.sync.previewPlan.title"),
                  titleFallback: t("pages.sync.previewPlan.titleFallback"),
                  entityEvent: t("pages.sync.previewPlan.entityEvent"),
                  entityItem: t("pages.sync.previewPlan.entityItem"),
                  entityCapture: t("pages.sync.previewPlan.entityCapture"),
                  entityTimeline: t("pages.sync.previewPlan.entityTimeline"),
                  entityUnknown: t("pages.sync.previewPlan.entityUnknown"),
                  pending: t("pages.sync.previewPlan.pending"),
                  applied: t("pages.sync.status.run.applied"),
                  apply: t("pages.sync.actions.applyPreview"),
                  applying: t("pages.sync.previewPlan.applying"),
                  undo: t("pages.sync.actions.undo"),
                  schedule: t("pages.sync.previewPlan.schedule"),
                  linkedProject: t("pages.sync.previewPlan.linkedProject"),
                  linkedSeries: t("pages.sync.previewPlan.linkedSeries"),
                  targetEvent: t("pages.sync.previewPlan.targetEvent"),
                  targetItem: t("pages.sync.previewPlan.targetItem"),
                  descriptionPrefix: t("pages.sync.previewPlan.descriptionPrefix"),
                }}
              />
            )}
          />

          {contextEntries.length > 0 ? (
            <View className="mx-4 mb-2 flex-row flex-wrap gap-2 rounded-2xl border border-border/70 bg-card/90 p-2.5">
              {contextEntries.map((entry) => (
                <View
                  key={entry.local_id}
                  className="flex-row items-center gap-1.5 rounded-full border border-border/70 bg-muted/45 px-2 py-1"
                >
                  <View className="rounded-full bg-background/70 px-1.5 py-0.5">
                    <Text className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {entry.kind === "attachment" ? "file" : entry.reference_kind ?? "ref"}
                    </Text>
                  </View>
                  <Text className="max-w-[170px] text-[11px] text-foreground" numberOfLines={1}>
                    {entry.token_text}
                  </Text>
                  <Text className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {contextStatusLabels[entry.status]}
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t("pages.sync.composer.removeAttachment")}
                    onPress={() => removeContextEntry(entry.local_id)}
                  >
                    <Text className="px-1 text-xs text-muted-foreground">×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          {isMentionPopoverVisible ? (
            <View className="absolute left-4 right-4 z-30" style={{ bottom: composerHeight + 8 }}>
              <View className="rounded-2xl border border-border/70 bg-card/95 p-1.5">
                {isMentionSearchLoading ? (
                  <Text className="px-2.5 py-2 text-xs text-muted-foreground">
                    {t("pages.sync.composer.mentionLoading")}
                  </Text>
                ) : mentionSearchError ? (
                  <Text className="px-2.5 py-2 text-xs text-destructive">
                    {t("pages.sync.composer.mentionError")}
                  </Text>
                ) : mentionSearchResults.length === 0 ? (
                  <Text className="px-2.5 py-2 text-xs text-muted-foreground">
                    {t("pages.sync.composer.mentionEmpty")}
                  </Text>
                ) : (
                  <ScrollView className="max-h-64">
                    {mentionSearchResults.map((result) => (
                      <TouchableOpacity
                        key={`${result.kind}:${result.id}`}
                        className="mb-1 rounded-lg px-2.5 py-2 last:mb-0 active:bg-primary/10"
                        onPress={() =>
                          handleSelectMention({
                            kind: result.kind,
                            id: result.id,
                            label: result.label,
                          })
                        }
                      >
                        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                          @{result.label}
                        </Text>
                        <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                          {result.subtitle ?? result.kind}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
          ) : null}

          {latestQuestion && (
            <InteractiveQuestionUI
              question={latestQuestion}
              onSelectOption={handleQuestionAnswer}
              onOtherClick={() => {
                // Future: focus composer or scroll
              }}
              isDark={useColorScheme() === "dark"}
            />
          )}

          <Composer
            value={input}
            onChange={handleComposerChange}
            onSelectionChange={handleComposerSelectionChange}
            onSend={handleSend}
            onStop={() => { }}
            isStreaming={streamMutation.isPending}
            disabled={createRun.isPending}
            placeholder={`${t("pages.sync.composer.placeholder")} ${t("pages.sync.composer.mentionHint")}`}
            onHeightChange={setComposerHeight}
            canSend={canSendComposer}
            onPlusAction={handlePlusAction}
            addAttachmentLabel={t("pages.sync.composer.addAttachment")}
            stopLabel={t("pages.sync.composer.stop")}
            sendLabel={t("pages.sync.composer.send")}
            plusActionLabels={{
              photo: t("pages.sync.composer.plus.photo"),
              file: t("pages.sync.composer.plus.file"),
              voice: t("pages.sync.composer.plus.voice"),
              inbox: t("pages.sync.composer.plus.inbox"),
            }}
          />
        </View>
      </KeyboardAvoidingView>

      <HistoryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentRunId={runId}
        runs={historyRuns ?? []}
        isLoading={isHistoryLoading}
        errorMessage={historyError ? t("pages.sync.history.loadError") : null}
        onRetry={() => {
          void refetchHistoryRuns();
        }}
        onSelectRun={openRunConversation}
        onOpenRun={(run) => openRunConversation(run.id)}
        onRenameRun={renameRunWithPrompt}
        onDeleteRun={(run) => confirmDeleteRun(run.id)}
      />

      <AnchoredMenu
        visible={isConversationMenuOpen}
        anchor={conversationMenuAnchor}
        onClose={() => setIsConversationMenuOpen(false)}
        title={t("pages.sync.menu.title")}
        items={conversationMenuItems}
      />

      <Modal
        visible={isContextPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsContextPickerOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/45 px-4">
          <Pressable className="absolute inset-0" onPress={() => setIsContextPickerOpen(false)} />
          <View className="z-10 max-h-[78%] w-full max-w-xl rounded-2xl border border-border bg-background p-4">
            <Text className="text-base font-semibold text-foreground">
              {t("pages.sync.composer.inboxPickerTitle")}
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              {t("pages.sync.composer.inboxPickerDescription")}
            </Text>
            <TextInput
              value={contextPickerQuery}
              onChangeText={setContextPickerQuery}
              placeholder={t("pages.sync.composer.inboxPickerSearch")}
              placeholderTextColor="#7c7c82"
              className="mt-3 rounded-xl border border-border bg-background px-3 py-2.5 text-foreground"
            />
            <ScrollView className="mt-3 max-h-80 rounded-xl border border-border/70 bg-muted/20 p-1.5">
              {isContextSearchLoading ? (
                <Text className="px-2 py-3 text-sm text-muted-foreground">
                  {t("pages.sync.composer.inboxPickerLoading")}
                </Text>
              ) : contextSearchResults.length === 0 ? (
                <Text className="px-2 py-3 text-sm text-muted-foreground">
                  {t("pages.sync.composer.inboxPickerEmpty")}
                </Text>
              ) : (
                contextSearchResults.map((result) => {
                  const key = `${result.kind}:${result.id}`;
                  const selected = Boolean(selectedContextResults[key]);
                  return (
                    <TouchableOpacity
                      key={key}
                      className={`mb-1 rounded-lg px-2.5 py-2 ${selected ? "bg-primary/10" : "bg-transparent"}`}
                      onPress={() =>
                        toggleContextSearchResult({
                          kind: result.kind,
                          id: result.id,
                          label: result.label,
                          subtitle: result.subtitle ?? null,
                          status: result.status ?? null,
                        })
                      }
                    >
                      <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                        {result.label}
                      </Text>
                      <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                        {result.subtitle ?? result.kind}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <View className="mt-4 flex-row justify-end gap-2">
              <TouchableOpacity
                className="rounded-lg border border-border px-3 py-2"
                onPress={() => setIsContextPickerOpen(false)}
              >
                <Text className="text-sm text-foreground">{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity className="rounded-lg bg-primary px-3 py-2" onPress={confirmContextPicker}>
                <Text className="text-sm font-medium text-primary-foreground">
                  {t("pages.sync.composer.inboxPickerAdd", {
                    count: Object.keys(selectedContextResults).length,
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
