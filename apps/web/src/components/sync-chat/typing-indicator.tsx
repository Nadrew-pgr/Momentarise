import { AnimatedOrb } from "./animated-orb";

interface TypingIndicatorProps {
  assistantLabel: string;
}

export function TypingIndicator({ assistantLabel }: TypingIndicatorProps) {
  return (
    <div className="mr-auto flex max-w-[88%] gap-3 md:max-w-[80%]">
      <div className="mt-1">
        <AnimatedOrb size={30} />
      </div>
      <div className="rounded-2xl rounded-bl-md border bg-background px-4 py-3 shadow-sm" role="status" aria-label={assistantLabel}>
        <div className="flex items-center gap-1">
          <span className="sync-chat-typing-dot" style={{ animationDelay: "0ms" }} />
          <span className="sync-chat-typing-dot" style={{ animationDelay: "140ms" }} />
          <span className="sync-chat-typing-dot" style={{ animationDelay: "280ms" }} />
        </div>
      </div>
    </div>
  );
}
