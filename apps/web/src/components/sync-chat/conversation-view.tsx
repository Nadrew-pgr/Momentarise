import { AlertCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Plan, PlanContent, PlanDescription, PlanHeader, PlanTitle, PlanTrigger } from "@/components/ai-elements/plan";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { Button } from "@/components/ui/button";
import { PreviewPlanCard } from "./preview-plan-card";
import { AnimatedOrb } from "./animated-orb";
import { TypingIndicator } from "./typing-indicator";
import type {
  SyncChatMessage,
  SyncNotice,
  SyncQueueEntry,
  SyncReasoningEntry,
  SyncSourcesEntry,
  SyncTaskEntry,
} from "./types";

interface PreviewLabels {
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

interface ConversationViewProps {
  messages: SyncChatMessage[];
  pendingMessages: SyncChatMessage[];
  streamingBuffer: string;
  isStreaming: boolean;
  notices: SyncNotice[];
  error: string | null;
  reasoningEntries: SyncReasoningEntry[];
  sourceEntries: SyncSourcesEntry[];
  taskEntries: SyncTaskEntry[];
  queueEntries: SyncQueueEntry[];
  isHydratingHistory: boolean;
  applyEnabled: boolean;
  appliedPreviewIds: string[];
  isApplying: boolean;
  isUndoing: boolean;
  onApplyPreview: (previewId: string) => void;
  onUndo: () => void;
  previewLabels: PreviewLabels;
  assistantLabel: string;
  emptySubtitle: string;
  emptyTruthUses: string;
  emptyTruthCan: string;
  emptyTruthLimits: string;
  errorTitle: string;
  warningTitle: string;
  retryLabel: string;
  logAriaLabel: string;
  historyLoadingLabel: string;
  onRetry: () => void;
  scrollButtonBottomOffset?: number;
}

function mergeMessages(
  messages: SyncChatMessage[],
  pendingMessages: SyncChatMessage[],
  streamingBuffer: string,
  isStreaming: boolean
): SyncChatMessage[] {
  const merged = [...messages, ...pendingMessages].filter((message) => {
    if (message.role === "user") return true;
    return message.content.trim().length > 0;
  });
  if (!isStreaming || !streamingBuffer.trim()) return merged;
  return [
    ...merged,
    {
      id: "sync-streaming-assistant",
      seq: Number.MAX_SAFE_INTEGER,
      role: "assistant",
      content: streamingBuffer,
      createdAt: new Date(),
    },
  ];
}

function latestReasoning(entries: SyncReasoningEntry[]): SyncReasoningEntry | null {
  if (entries.length === 0) return null;
  return entries.slice().sort((a, b) => b.seq - a.seq)[0] ?? null;
}

function latestSources(entries: SyncSourcesEntry[]): SyncSourcesEntry | null {
  if (entries.length === 0) return null;
  return entries.slice().sort((a, b) => b.seq - a.seq)[0] ?? null;
}

export function ConversationView({
  messages,
  pendingMessages,
  streamingBuffer,
  isStreaming,
  notices,
  error,
  reasoningEntries,
  sourceEntries,
  taskEntries,
  queueEntries,
  isHydratingHistory,
  applyEnabled,
  appliedPreviewIds,
  isApplying,
  isUndoing,
  onApplyPreview,
  onUndo,
  previewLabels,
  assistantLabel,
  emptySubtitle,
  emptyTruthUses,
  emptyTruthCan,
  emptyTruthLimits,
  errorTitle,
  warningTitle,
  retryLabel,
  logAriaLabel,
  historyLoadingLabel,
  onRetry,
  scrollButtonBottomOffset,
}: ConversationViewProps) {
  const displayMessages = mergeMessages(messages, pendingMessages, streamingBuffer, isStreaming);
  const displayNotices = notices.slice(0, 3);
  const appliedPreviewIdSet = new Set(appliedPreviewIds);
  const currentReasoning = latestReasoning(reasoningEntries);
  const currentSources = latestSources(sourceEntries);
  const showTypingIndicator = isStreaming && !streamingBuffer.trim();
  const hasConversation =
    isHydratingHistory ||
    displayMessages.length > 0 ||
    showTypingIndicator ||
    Boolean(error) ||
    displayNotices.length > 0 ||
    taskEntries.length > 0 ||
    queueEntries.length > 0;
  const scrollButtonBottom = Math.max(128, Math.round(scrollButtonBottomOffset ?? 128));
  const conversationBottomPadding = Math.max(150, scrollButtonBottom + 70);

  return (
    <div className="sync-chat-scroll-area h-full w-full overflow-hidden">
      <Conversation aria-label={logAriaLabel} className="h-full">
        <ConversationContent
          className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-8 px-4"
          style={{ paddingBottom: `${conversationBottomPadding}px` }}
        >
          {!hasConversation ? (
            <div className="flex h-full flex-1 flex-col items-center justify-center text-center">
              <AnimatedOrb size={124} className="mb-4 sync-chat-orb-intro" />
              <p className="sync-chat-empty-subtitle mt-1 text-sm text-muted-foreground">{emptySubtitle}</p>
              <div className="mt-4 max-w-2xl space-y-1.5 text-left">
                <p className="text-xs text-muted-foreground">{emptyTruthUses}</p>
                <p className="text-xs text-muted-foreground">{emptyTruthCan}</p>
                <p className="text-xs text-muted-foreground">{emptyTruthLimits}</p>
              </div>
            </div>
          ) : null}

          {hasConversation ? (
            <>
              {currentSources && currentSources.items.length > 0 ? (
                <Sources className="mb-0 w-full rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-foreground">
                  <SourcesTrigger count={currentSources.items.length} />
                  <SourcesContent className="w-full">
                    {currentSources.items.map((source) => (
                      <Source key={source.id} href={source.url} title={source.title}>
                        <div className="rounded-md border border-border/70 bg-background px-2 py-1.5 text-xs">
                          <p className="font-medium">{source.title}</p>
                          {source.snippet ? (
                            <p className="mt-0.5 text-muted-foreground">{source.snippet}</p>
                          ) : null}
                        </div>
                      </Source>
                    ))}
                  </SourcesContent>
                </Sources>
              ) : null}

              {isHydratingHistory ? (
                <div className="w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm text-muted-foreground">
                  {historyLoadingLabel}
                </div>
              ) : null}

              {currentReasoning && (currentReasoning.content || currentReasoning.summary) ? (
                <Reasoning duration={currentReasoning.durationMs ? Math.ceil(currentReasoning.durationMs / 1000) : undefined}>
                  <ReasoningTrigger />
                  <ReasoningContent>{currentReasoning.summary || currentReasoning.content || " "}</ReasoningContent>
                </Reasoning>
              ) : null}

              {displayMessages.map((message) => {
                const from = message.role === "user" ? "user" : "assistant";
                const messagePreviews = message.planPreviews ?? [];
                const messageContextLinks = message.contextLinks ?? [];

                return (
                  <div className="space-y-4" key={`${message.id}-${message.seq}`}>
                    {from === "user" && messageContextLinks.length > 0 ? (
                      <div className="flex w-full justify-end">
                        <div className="flex max-w-[75%] flex-wrap justify-end gap-1.5">
                          {messageContextLinks.map((link) => (
                            <a
                              key={`${message.id}-context-${link.kind}-${link.id}`}
                              href={link.internalPath}
                              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-[11px] text-foreground/85 transition-colors hover:bg-muted"
                            >
                              <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                {link.kind}
                              </span>
                              <span className="max-w-[180px] truncate">@{link.label}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <Message from={from} className={from === "user" ? "max-w-[75%]" : "max-w-full"}>
                      <div className="space-y-1">
                        <MessageContent>
                          <MessageResponse>{message.content || " "}</MessageResponse>
                        </MessageContent>
                      </div>
                    </Message>
                    {messagePreviews.map((preview) => {
                      const isAppliedPreview = appliedPreviewIdSet.has(preview.id);
                      const canApplyPreview = applyEnabled && !isApplying && !isAppliedPreview;
                      return (
                        <PreviewPlanCard
                          key={`preview-${preview.id}`}
                          preview={preview}
                          canApply={canApplyPreview}
                          canUndo={false}
                          isApplying={isApplying}
                          isUndoing={isUndoing}
                          isApplied={isAppliedPreview}
                          onApply={() => onApplyPreview(preview.id)}
                          onUndo={onUndo}
                          labels={previewLabels}
                        />
                      );
                    })}
                  </div>
                );
              })}

              {showTypingIndicator ? <TypingIndicator assistantLabel={assistantLabel} /> : null}

              {displayNotices.map((notice) => (
                <div
                  key={notice.id}
                  className={
                    notice.level === "error"
                      ? "flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
                      : "flex items-start gap-3 rounded-xl border border-amber-400/35 bg-amber-400/10 p-4"
                  }
                  role="alert"
                >
                  {notice.level === "error" ? (
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  ) : (
                    <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  )}
                  <div className="flex-1">
                    <p className={notice.level === "error" ? "text-sm font-medium text-destructive" : "text-sm font-medium text-amber-200"}>
                      {notice.level === "error" ? errorTitle : warningTitle}
                    </p>
                    <p className={notice.level === "error" ? "mt-0.5 text-xs text-destructive/80" : "mt-0.5 text-xs text-amber-200/90"}>
                      {notice.message}
                    </p>
                  </div>
                </div>
              ))}

              {error ? (
                <Plan className="w-full border-destructive/40 bg-destructive/5" defaultOpen>
                  <PlanHeader>
                    <div>
                      <PlanTitle>{errorTitle}</PlanTitle>
                      <PlanDescription>{error}</PlanDescription>
                    </div>
                    <PlanTrigger />
                  </PlanHeader>
                  <PlanContent className="pt-0">
                    <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                      <RefreshCw className="mr-1 h-4 w-4" />
                      {retryLabel}
                    </Button>
                  </PlanContent>
                </Plan>
              ) : null}
            </>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton className="sync-chat-scroll-button" style={{ bottom: `${scrollButtonBottom}px` }} />
      </Conversation>
    </div>
  );
}
