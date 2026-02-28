import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { Brain, Mic, Paperclip, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnimatedOrb } from "./animated-orb";
import { AudioWaveform } from "./audio-waveform";

interface ComposerModel {
  id: string;
  label: string;
}

interface ComposerProps {
  value: string;
  onValueChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onAttach?: () => void;
  onVoice?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  models: ComposerModel[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  placeholder: string;
  sendLabel: string;
  stopLabel: string;
  modelLabel: string;
  voiceSoonLabel: string;
  attachSoonLabel: string;
  enableVoice?: boolean;
  enableAttach?: boolean;
  afterComposer?: ReactNode;
}

export function Composer({
  value,
  onValueChange,
  onSend,
  onStop,
  onAttach,
  onVoice,
  isStreaming,
  disabled = false,
  models,
  selectedModel,
  onModelChange,
  placeholder,
  sendLabel,
  stopLabel,
  modelLabel,
  voiceSoonLabel,
  attachSoonLabel,
  enableVoice = false,
  enableAttach = false,
  afterComposer = null,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = useMemo(
    () => value.trim().length > 0 && !disabled && !isStreaming,
    [value, disabled, isStreaming]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  }, [value]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (canSend) onSend();
      }
    },
    [canSend, onSend]
  );

  const currentModel = models.find((model) => model.id === selectedModel);

  return (
    <div className="sync-chat-composer-wrap pointer-events-none absolute inset-x-0 bottom-3 z-10 px-4">
      <TooltipProvider delayDuration={150}>
        <div className="pointer-events-auto mx-auto w-full max-w-3xl">
          <div className="rounded-3xl border-0 bg-background/90 p-3 shadow-sm ring-1 ring-border/30">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled || isStreaming}
                rows={1}
                className="text-foreground placeholder:text-muted-foreground max-h-36 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={placeholder}
              />

              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                  aria-label={stopLabel}
                >
                  <AnimatedOrb size={36} variant="stop" />
                  <Square className="absolute h-4 w-4" fill="currentColor" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSend}
                  disabled={!canSend}
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={sendLabel}
                >
                  <AnimatedOrb size={36} />
                </button>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-full"
                      onClick={onVoice}
                      disabled={!enableVoice || disabled || isStreaming}
                      aria-label={voiceSoonLabel}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {!enableVoice ? <TooltipContent>{voiceSoonLabel}</TooltipContent> : null}
              </Tooltip>

              {enableVoice ? <AudioWaveform isRecording={false} /> : null}

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-full"
                      onClick={onAttach}
                      disabled={!enableAttach || disabled || isStreaming}
                      aria-label={attachSoonLabel}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {!enableAttach ? <TooltipContent>{attachSoonLabel}</TooltipContent> : null}
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 rounded-full"
                    disabled={disabled || isStreaming || models.length === 0}
                    aria-label={modelLabel}
                  >
                    <Brain className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-52 rounded-xl">
                  {models.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => onModelChange(model.id)}
                      className={model.id === selectedModel ? "bg-accent" : undefined}
                    >
                      {model.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="text-muted-foreground ml-1 truncate text-xs">{currentModel?.label ?? "-"}</span>
            </div>
          </div>
        </div>
        {afterComposer ? <div className="pointer-events-auto mx-auto mt-2 w-full max-w-3xl">{afterComposer}</div> : null}
      </TooltipProvider>
    </div>
  );
}
