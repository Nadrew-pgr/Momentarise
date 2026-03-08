import { useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import type { ReactNode } from "react";
import { Brain, Mic, Paperclip, Square, Sparkles, Zap, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { ProviderIcon } from "./provider-icons";
import type { SyncRunMode } from "./types";

interface ComposerModel {
  id: string;
  label: string;
  provider?: string;
  tier?: string;
  reasoning_levels?: string[] | null;
}

const TIER_CONFIG: Record<string, { label: string; className: string }> = {
  pro: {
    label: "Pro",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  },
  ultra: {
    label: "Ultra",
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20",
  },
};

function TierBadge({ tier }: { tier?: string }) {
  if (!tier || tier === "free") return null;
  const config = TIER_CONFIG[tier];
  if (!config) return null;
  return (
    <span
      className={`ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  );
}

interface ComposerProps {
  value: string;
  onValueChange: (value: string, selection: { start: number; end: number }) => void;
  onSelectionChange?: (selection: { start: number; end: number }) => void;
  onComposerKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => boolean | void;
  onSend: () => void;
  onStop: () => void;
  onAttach?: () => void;
  onAttachLocal?: () => void;
  onAttachInbox?: () => void;
  onVoice?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  canSend?: boolean;
  models: ComposerModel[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  runMode?: SyncRunMode;
  onModeChange?: (mode: SyncRunMode) => void;
  placeholder: string;
  sendLabel: string;
  stopLabel: string;
  modelLabel: string;
  voiceSoonLabel: string;
  attachSoonLabel: string;
  attachLocalLabel?: string;
  attachInboxLabel?: string;
  enableVoice?: boolean;
  enableAttach?: boolean;
  beforeComposer?: ReactNode;
  afterComposer?: ReactNode;
  selectionOverride?: { key: number; start: number; end: number } | null;
}

export function Composer({
  value,
  onValueChange,
  onSelectionChange,
  onComposerKeyDown,
  onSend,
  onStop,
  onAttach,
  onAttachLocal,
  onAttachInbox,
  onVoice,
  isStreaming,
  disabled = false,
  canSend: canSendOverride = true,
  models,
  selectedModel,
  onModelChange,
  runMode = "free",
  onModeChange,
  placeholder,
  sendLabel,
  stopLabel,
  modelLabel,
  voiceSoonLabel,
  attachSoonLabel,
  attachLocalLabel = "Attach file",
  attachInboxLabel = "Attach from inbox",
  enableVoice = false,
  enableAttach = false,
  beforeComposer = null,
  afterComposer = null,
  selectionOverride = null,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const appliedSelectionKeyRef = useRef<number | null>(null);

  const canSend = useMemo(
    () => value.trim().length > 0 && !disabled && !isStreaming && canSendOverride,
    [value, disabled, isStreaming, canSendOverride]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  }, [value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !selectionOverride) return;
    if (appliedSelectionKeyRef.current === selectionOverride.key) return;
    appliedSelectionKeyRef.current = selectionOverride.key;
    textarea.focus();
    textarea.setSelectionRange(selectionOverride.start, selectionOverride.end);
  }, [selectionOverride]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      const handled = onComposerKeyDown?.(event);
      if (handled || event.defaultPrevented) return;
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (canSend) onSend();
      }
    },
    [canSend, onComposerKeyDown, onSend]
  );

  const currentModel = models.find((model) => model.id === selectedModel);
  const isAutoMode = selectedModel === "auto";

  // Group models by provider for the dropdown
  const groupedModels = useMemo(() => {
    const groups: Record<string, ComposerModel[]> = {};
    for (const model of models) {
      const provider = model.provider ?? "other";
      if (!groups[provider]) groups[provider] = [];
      groups[provider].push(model);
    }
    return groups;
  }, [models]);

  const providerLabels: Record<string, string> = {
    mistral: "Mistral",
    anthropic: "Anthropic",
    openai: "OpenAI",
    gemini: "Google",
  };

  return (
    <div className="sync-chat-composer-wrap pointer-events-none absolute inset-x-0 bottom-3 z-10 px-4">
      <TooltipProvider delayDuration={150}>
        {beforeComposer ? <div className="pointer-events-auto mx-auto mb-2 w-full max-w-3xl">{beforeComposer}</div> : null}
        <div className="pointer-events-auto mx-auto w-full max-w-3xl">
          <div className="sync-chat-composer-box rounded-3xl p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(event) =>
                  onValueChange(event.target.value, {
                    start: event.currentTarget.selectionStart ?? event.target.value.length,
                    end: event.currentTarget.selectionEnd ?? event.target.value.length,
                  })
                }
                onSelect={(event) => {
                  onSelectionChange?.({
                    start: event.currentTarget.selectionStart ?? value.length,
                    end: event.currentTarget.selectionEnd ?? value.length,
                  });
                }}
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

              {enableAttach ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-full"
                      disabled={disabled || isStreaming}
                      aria-label={attachLocalLabel}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-52 rounded-xl p-1">
                    <DropdownMenuItem
                      onClick={() => {
                        if (onAttachLocal) onAttachLocal();
                        else onAttach?.();
                      }}
                      className="rounded-lg px-3 py-2"
                    >
                      {attachLocalLabel}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (onAttachInbox) onAttachInbox();
                      }}
                      className="rounded-lg px-3 py-2"
                    >
                      {attachInboxLabel}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 rounded-full"
                        onClick={onAttach}
                        disabled
                        aria-label={attachSoonLabel}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{attachSoonLabel}</TooltipContent>
                </Tooltip>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 rounded-full"
                    disabled={disabled || isStreaming}
                    aria-label="Mode"
                  >
                    {runMode === "free" ? (
                      <Zap className="h-4 w-4 text-blue-500" />
                    ) : (
                      <ClipboardList className="h-4 w-4 text-amber-500" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-56 rounded-xl p-1">
                  <DropdownMenuItem
                    onClick={() => onModeChange?.("free")}
                    className={`rounded-lg px-3 py-2 ${runMode === "free" ? "bg-accent" : ""}`}
                  >
                    <Zap className="mr-2.5 h-4 w-4 text-blue-500" />
                    <span className="flex-1 font-medium">Normal</span>
                    <span className="text-[10px] text-muted-foreground">direct</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onModeChange?.("guided")}
                    className={`rounded-lg px-3 py-2 ${runMode === "guided" ? "bg-accent" : ""}`}
                  >
                    <ClipboardList className="mr-2.5 h-4 w-4 text-amber-500" />
                    <span className="flex-1 font-medium">Plan Mode</span>
                    <span className="text-[10px] text-muted-foreground">guidé</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
                <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-64 rounded-xl p-1">
                  {/* Auto mode option */}
                  <DropdownMenuItem
                    onClick={() => onModelChange("auto")}
                    className={`rounded-lg px-3 py-2.5 ${isAutoMode ? "bg-accent" : ""}`}
                  >
                    <Sparkles className="mr-2.5 h-4 w-4 text-amber-500" />
                    <span className="flex-1 font-medium">Auto</span>
                    <span className="text-[10px] text-muted-foreground">adaptatif</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  {/* Models grouped by provider */}
                  {Object.entries(groupedModels).map(([provider, providerModels]) => (
                    <div key={provider}>
                      <DropdownMenuLabel className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                        <ProviderIcon provider={provider} size={11} />
                        {providerLabels[provider] ?? provider}
                      </DropdownMenuLabel>
                      {providerModels.map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => onModelChange(model.id)}
                          className={`rounded-lg px-3 py-2 ${model.id === selectedModel ? "bg-accent" : ""}`}
                        >
                          <span className="flex-1 text-[13px]">{model.label}</span>
                          <div className="flex items-center gap-1">
                            {model.reasoning_levels && model.reasoning_levels.length > 0 && (
                              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium leading-none text-amber-600 dark:text-amber-400">
                                Thinking
                              </span>
                            )}
                            <TierBadge tier={model.tier} />
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="text-muted-foreground ml-1 flex items-center truncate text-xs">
                {isAutoMode ? (
                  <>
                    <Sparkles className="mr-1 h-3 w-3 text-amber-500" />
                    Auto
                  </>
                ) : (
                  <>
                    <ProviderIcon provider={currentModel?.provider ?? ""} size={12} className="mr-1" />
                    {currentModel?.label ?? "-"}
                    <TierBadge tier={currentModel?.tier} />
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
        {afterComposer ? <div className="pointer-events-auto mx-auto mt-2 w-full max-w-3xl">{afterComposer}</div> : null}
      </TooltipProvider>
    </div>
  );
}
