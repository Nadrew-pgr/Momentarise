"use client";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import type { ToolUIPart } from "ai";
import type { SyncPreview } from "@momentarise/shared";

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import type { AttachmentData } from "@/components/ai-elements/attachments";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageBranch,
  MessageBranchContent,
  MessageBranchNext,
  MessageBranchPage,
  MessageBranchPrevious,
  MessageBranchSelector,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { PreviewPlanCard } from "@/components/sync-chat/preview-plan-card";
import { useSyncChat } from "@/hooks/use-sync-chat";
import { GlobeIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface MessageType {
  key: string;
  from: "user" | "assistant";
  planPreviews?: SyncPreview[];
  sources?: { href: string; title: string }[];
  versions: {
    id: string;
    content: string;
  }[];
  reasoning?: {
    content: string;
    duration: number;
  };
  tools?: {
    name: string;
    description: string;
    status: ToolUIPart["state"];
    parameters: Record<string, unknown>;
    result: string | undefined;
    error: string | undefined;
  }[];
}

/** Map Sync chat messages + latest reasoning/sources to UI MessageType */
function syncMessagesToMessageTypes(
  syncMessages: { id: string; role: string; content: string; planPreviews?: SyncPreview[] }[],
  latestReasoning: { content?: string; durationMs?: number } | null,
  latestSources: { items: { url: string; title: string }[] } | null
): MessageType[] {
  return syncMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m, index, arr) => {
      const isLastAssistant =
        m.role === "assistant" &&
        (index === arr.length - 1 || !arr.slice(index + 1).some((n) => n.role === "assistant"));
      const sources =
        isLastAssistant && latestSources?.items?.length
          ? latestSources.items.map((item) => ({ href: item.url, title: item.title }))
          : undefined;
      const reasoning =
        isLastAssistant && latestReasoning?.content
          ? { content: latestReasoning.content, duration: latestReasoning.durationMs ?? 0 }
          : undefined;
      return {
        key: m.id,
        from: m.role as "user" | "assistant",
        planPreviews: m.planPreviews,
        sources,
        reasoning,
        versions: [{ id: m.id, content: m.content }],
      };
    });
}

const suggestions = [
  "What are the latest trends in AI?",
  "How does machine learning work?",
  "Explain quantum computing",
  "Best practices for React development",
  "Tell me about TypeScript benefits",
];

const AttachmentItem = ({
  attachment,
  onRemove,
}: {
  attachment: AttachmentData;
  onRemove: (id: string) => void;
}) => {
  const handleRemove = useCallback(() => {
    onRemove(attachment.id);
  }, [onRemove, attachment.id]);

  return (
    <Attachment data={attachment} onRemove={handleRemove}>
      <AttachmentPreview />
      <AttachmentRemove />
    </Attachment>
  );
};

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();

  const handleRemove = useCallback(
    (id: string) => {
      attachments.remove(id);
    },
    [attachments]
  );

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <AttachmentItem
          attachment={attachment}
          key={attachment.id}
          onRemove={handleRemove}
        />
      ))}
    </Attachments>
  );
};

const SuggestionItem = ({
  suggestion,
  onClick,
}: {
  suggestion: string;
  onClick: (suggestion: string) => void;
}) => {
  const handleClick = useCallback(() => {
    onClick(suggestion);
  }, [onClick, suggestion]);

  return <Suggestion onClick={handleClick} suggestion={suggestion} />;
};

const ModelItem = ({
  m,
  onSelect,
}: {
  m: { id: string; label: string; provider: string };
  onSelect: (id: string) => void;
}) => {
  const handleSelect = useCallback(() => {
    onSelect(m.id);
  }, [onSelect, m.id]);

  return (
    <ModelSelectorItem onSelect={handleSelect} value={m.id}>
      <ModelSelectorLogo provider={m.provider} />
      <ModelSelectorName>{m.label}</ModelSelectorName>
    </ModelSelectorItem>
  );
};

const Example = () => {
  const { t } = useTranslation();
  const sync = useSyncChat({ fallbackErrorLabel: t("pages.sync.error.generic") });
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);

  const messages = useMemo(
    () =>
      syncMessagesToMessageTypes(
        sync.messages,
        sync.latestReasoning,
        sync.latestSources
      ),
    [sync.messages, sync.latestReasoning, sync.latestSources]
  );

  const selectedModelData = useMemo(
    () => sync.models.find((m) => m.id === sync.selectedModel),
    [sync.models, sync.selectedModel]
  );
  const renderedPreviewIds = useMemo(
    () =>
      new Set(
        messages.flatMap((message) => (message.planPreviews ?? []).map((preview) => preview.id))
      ),
    [messages]
  );

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);
      if (!(hasText || hasAttachments)) return;
      if (message.files?.length) {
        toast.success("Files attached", {
          description: `${message.files.length} file(s) attached to message`,
        });
      }
      sync.handleSend(message.text || "Sent with attachments");
    },
    [sync]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      sync.handleSend(suggestion);
    },
    [sync]
  );

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      sync.setComposerValue(event.target.value);
    },
    [sync]
  );

  const handleTranscriptionChange = useCallback(
    (transcript: string) => {
      sync.setComposerValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    },
    [sync]
  );

  const handleModelSelect = useCallback(
    (modelId: string) => {
      sync.handleModelChange(modelId);
      setModelSelectorOpen(false);
    },
    [sync]
  );

  const status = sync.isStreaming
    ? "streaming"
    : sync.createRun.isPending || sync.streamRun.isPending
      ? "submitted"
      : "ready";
  const isSubmitDisabled =
    !(sync.composerValue.trim() || status) || status === "streaming";

  const toggleWebSearch = useCallback(() => {
    setUseWebSearch((prev) => !prev);
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col divide-y overflow-hidden">
      {sync.transportError ? (
        <div className="bg-destructive/10 text-destructive px-4 py-2 text-sm">
          {sync.transportError}
        </div>
      ) : null}
      <Conversation>
        <ConversationContent>
          {messages.map(({ versions, ...message }) => (
            <MessageBranch defaultBranch={0} key={message.key}>
              <MessageBranchContent>
                {versions.map((version) => (
                  <Message
                    from={message.from}
                    key={`${message.key}-${version.id}`}
                  >
                    <div>
                      {message.sources?.length && (
                        <Sources>
                          <SourcesTrigger count={message.sources.length} />
                          <SourcesContent>
                            {message.sources.map((source) => (
                              <Source
                                href={source.href}
                                key={source.href}
                                title={source.title}
                              />
                            ))}
                          </SourcesContent>
                        </Sources>
                      )}
                      {message.reasoning && (
                        <Reasoning duration={message.reasoning.duration}>
                          <ReasoningTrigger />
                          <ReasoningContent>
                            {message.reasoning.content}
                          </ReasoningContent>
                        </Reasoning>
                      )}
                      <MessageContent>
                        <MessageResponse>{version.content}</MessageResponse>
                      </MessageContent>
                      {message.planPreviews?.map((preview) => (
                        <div key={`preview-${preview.id}`} className="pt-2">
                          <PreviewPlanCard
                            preview={preview}
                            canApply={!sync.isApplying && !sync.appliedPreviewIds.includes(preview.id)}
                            canUndo={false}
                            isApplying={sync.isApplying}
                            isUndoing={sync.isUndoing}
                            isApplied={sync.appliedPreviewIds.includes(preview.id)}
                            onApply={() => sync.handleApply(preview.id)}
                            onUndo={sync.handleUndo}
                            labels={{
                              title: t("pages.sync.previewPlan.title"),
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
                          />
                        </div>
                      ))}
                    </div>
                  </Message>
                ))}
              </MessageBranchContent>
              {versions.length > 1 && (
                <MessageBranchSelector>
                  <MessageBranchPrevious />
                  <MessageBranchPage />
                  <MessageBranchNext />
                </MessageBranchSelector>
              )}
            </MessageBranch>
          ))}
          {sync.latestPreview && !renderedPreviewIds.has(sync.latestPreview.id) ? (
            <div className="px-4 py-2">
              <PreviewPlanCard
                preview={sync.latestPreview}
                canApply={sync.canApply && !sync.appliedPreviewIds.includes(sync.latestPreview.id)}
                canUndo={sync.canUndo}
                isApplying={sync.isApplying}
                isUndoing={sync.isUndoing}
                isApplied={sync.appliedPreviewIds.includes(sync.latestPreview.id)}
                onApply={() => sync.handleApply(sync.latestPreview?.id)}
                onUndo={sync.handleUndo}
                labels={{
                  title: t("pages.sync.previewPlan.title"),
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
              />
            </div>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="grid shrink-0 gap-4 pt-4">
        <Suggestions className="px-4">
          {suggestions.map((suggestion) => (
            <SuggestionItem
              key={suggestion}
              onClick={handleSuggestionClick}
              suggestion={suggestion}
            />
          ))}
        </Suggestions>
        <div className="w-full px-4 pb-4">
          <PromptInput globalDrop multiple onSubmit={handleSubmit}>
            <PromptInputHeader>
              <PromptInputAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea
                onChange={handleTextChange}
                value={sync.composerValue}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <SpeechInput
                  className="shrink-0"
                  onTranscriptionChange={handleTranscriptionChange}
                  size="icon-sm"
                  variant="ghost"
                />
                <PromptInputButton
                  onClick={toggleWebSearch}
                  variant={useWebSearch ? "default" : "ghost"}
                >
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>
                <ModelSelector
                  onOpenChange={setModelSelectorOpen}
                  open={modelSelectorOpen}
                >
                  <ModelSelectorTrigger asChild>
                    <PromptInputButton>
                      {selectedModelData?.provider && (
                        <ModelSelectorLogo
                          provider={selectedModelData.provider}
                        />
                      )}
                      {selectedModelData?.label && (
                        <ModelSelectorName>
                          {selectedModelData.label}
                        </ModelSelectorName>
                      )}
                    </PromptInputButton>
                  </ModelSelectorTrigger>
                  <ModelSelectorContent>
                    <ModelSelectorInput placeholder="Search models..." />
                    <ModelSelectorList>
                      <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                      {sync.models.map((m) => (
                        <ModelItem
                          key={m.id}
                          m={m}
                          onSelect={handleModelSelect}
                        />
                      ))}
                    </ModelSelectorList>
                  </ModelSelectorContent>
                </ModelSelector>
              </PromptInputTools>
              <PromptInputSubmit disabled={isSubmitDisabled} status={status} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default Example;
