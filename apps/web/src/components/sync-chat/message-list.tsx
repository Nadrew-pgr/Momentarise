import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedOrb } from "./animated-orb";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import type { SyncChatMessage, SyncNotice } from "./types";

interface MessageListProps {
  messages: SyncChatMessage[];
  pendingMessages: SyncChatMessage[];
  streamingBuffer: string;
  isStreaming: boolean;
  notices: SyncNotice[];
  error: string | null;
  assistantLabel: string;
  userLabel: string;
  toolLabel: string;
  systemLabel: string;
  imageAlt: string;
  emptyTitle: string;
  emptySubtitle: string;
  errorTitle: string;
  warningTitle: string;
  pendingLabel: string;
  failedLabel: string;
  retryLabel: string;
  scrollToBottomLabel: string;
  logAriaLabel: string;
  onRetry: () => void;
}

export function MessageList({
  messages,
  pendingMessages,
  streamingBuffer,
  isStreaming,
  notices,
  error,
  assistantLabel,
  userLabel,
  toolLabel,
  systemLabel,
  imageAlt,
  emptyTitle,
  emptySubtitle,
  errorTitle,
  warningTitle,
  pendingLabel,
  failedLabel,
  retryLabel,
  scrollToBottomLabel,
  logAriaLabel,
  onRetry,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const displayMessages = useMemo(() => {
    const withPending = [...messages, ...pendingMessages];
    if (!isStreaming || !streamingBuffer.trim()) return withPending;
    const transientMessage: SyncChatMessage = {
      id: "sync-streaming-assistant",
      seq: Number.MAX_SAFE_INTEGER,
      role: "assistant",
      content: streamingBuffer,
      createdAt: new Date(),
    };
    return [...withPending, transientMessage];
  }, [messages, pendingMessages, isStreaming, streamingBuffer]);

  const displayNotices = useMemo(() => notices.slice(0, 3), [notices]);

  useEffect(() => {
    if (!containerRef.current || !autoScroll) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [displayMessages, autoScroll, error, displayNotices]);

  function handleScroll() {
    if (!containerRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = containerRef.current;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setAutoScroll(nearBottom);
  }

  const showTypingIndicator = isStreaming && !streamingBuffer.trim();

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="sync-chat-scroll-area absolute inset-0 overflow-y-auto px-6 pb-56 pt-6"
      role="log"
      aria-label={logAriaLabel}
      aria-live="polite"
    >
      {displayMessages.length === 0 && !isStreaming && !error && displayNotices.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <AnimatedOrb size={124} className="mb-4 sync-chat-orb-intro" />
          <p className="sync-chat-empty-title text-lg font-medium">{emptyTitle}</p>
          <p className="sync-chat-empty-subtitle mt-1 text-sm">{emptySubtitle}</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {displayMessages.map((message) => (
          <MessageBubble
            key={`${message.id}-${message.seq}`}
            message={message}
            assistantLabel={assistantLabel}
            userLabel={userLabel}
            toolLabel={toolLabel}
            systemLabel={systemLabel}
            imageAlt={imageAlt}
            pendingLabel={pendingLabel}
            failedLabel={failedLabel}
            isStreaming={message.id === "sync-streaming-assistant"}
          />
        ))}

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
          <div
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">{errorTitle}</p>
              <p className="mt-0.5 text-xs text-destructive/80">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onRetry}>
              <RefreshCw className="mr-1 h-4 w-4" />
              {retryLabel}
            </Button>
          </div>
        ) : null}
      </div>

      <div aria-hidden="true" className="h-16" />

      {!autoScroll && displayMessages.length > 0 ? (
        <div className="pointer-events-none sticky bottom-4 flex justify-end pr-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="pointer-events-auto"
            onClick={() => {
              if (!containerRef.current) return;
              containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior: "smooth",
              });
              setAutoScroll(true);
            }}
          >
            {scrollToBottomLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
