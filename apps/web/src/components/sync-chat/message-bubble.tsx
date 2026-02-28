import Image from "next/image";
import { Wrench, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedOrb } from "./animated-orb";
import { MarkdownRenderer } from "./markdown-renderer";
import type { SyncChatMessage } from "./types";

interface MessageBubbleProps {
  message: SyncChatMessage;
  assistantLabel: string;
  userLabel: string;
  toolLabel: string;
  systemLabel: string;
  imageAlt: string;
  pendingLabel: string;
  failedLabel: string;
  isStreaming?: boolean;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getRoleLabel(
  role: SyncChatMessage["role"],
  labels: {
    assistantLabel: string;
    userLabel: string;
    toolLabel: string;
    systemLabel: string;
  }
): string {
  if (role === "user") return labels.userLabel;
  if (role === "tool") return labels.toolLabel;
  if (role === "system") return labels.systemLabel;
  return labels.assistantLabel;
}

export function MessageBubble({
  message,
  assistantLabel,
  userLabel,
  toolLabel,
  systemLabel,
  imageAlt,
  pendingLabel,
  failedLabel,
  isStreaming = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const isSystem = message.role === "system";

  const roleLabel = getRoleLabel(message.role, {
    assistantLabel,
    userLabel,
    toolLabel,
    systemLabel,
  });
  const deliveryState = message.delivery ?? "sent";

  return (
    <div
      className={cn(
        "flex max-w-[88%] gap-3 md:max-w-[80%]",
        isUser ? "sync-chat-user-enter ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      <div
        className={cn(
          "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "border bg-background" : "bg-transparent"
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="h-4 w-4 text-foreground" />
        ) : isTool ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-muted/60">
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : (
          <AnimatedOrb size={32} />
        )}
      </div>

      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
        <span className="text-muted-foreground mb-1 hidden text-xs sm:block">{roleLabel}</span>

        <div
          className={cn(
            "overflow-hidden rounded-2xl border px-4 py-3",
            isUser
              ? "rounded-br-md border-border bg-background text-foreground shadow-sm"
              : "rounded-bl-md border-border/50 bg-muted/20 text-foreground",
            isTool && "bg-muted/40",
            isUser && deliveryState === "failed" && "border-destructive/50 bg-destructive/10",
            isUser && deliveryState === "pending" && "opacity-80"
          )}
        >
          {isUser ? (
            <div className="flex flex-col gap-2">
              {message.imageData ? (
                <div className="h-20 w-20 overflow-hidden rounded-lg border border-border">
                  <Image
                    src={message.imageData}
                    alt={imageAlt}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
              ) : null}
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          ) : (
            <MarkdownRenderer
              content={message.content || " "}
              isStreaming={isStreaming && !isTool && !isSystem}
              className={isSystem ? "opacity-90" : undefined}
            />
          )}
        </div>

        <span className="text-muted-foreground mt-1 text-xs">
          {formatTime(message.createdAt)}
          {isUser && deliveryState === "pending" ? ` · ${pendingLabel}` : ""}
          {isUser && deliveryState === "failed" ? ` · ${failedLabel}` : ""}
        </span>
      </div>
    </div>
  );
}
