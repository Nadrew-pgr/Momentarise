"use client";

import { useMemo, useState } from "react";
import type { BusinessBlock, ContentRenderMode, InboxSearchEntry } from "@momentarise/shared";
import {
  BLOCK_DISPLAY_META,
  getBusinessBlockPreview,
} from "@momentarise/shared";
import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiFileTextLine,
  RiListCheck2,
  RiTable2,
  RiListUnordered,
  RiTimerLine,
  RiBarChartHorizontalLine,
  RiBookOpenLine,
  RiLinkM,
  RiAttachment2,
  RiInboxLine,
  RiCheckboxCircleLine,
  RiPulseLine,
  RiLineChartLine,
  RiFlagLine,
  RiMapPinLine,
  RiGitBranchLine,
  RiFlaskLine,
  RiAlertLine,
  RiShieldLine,
  RiQuestionLine,
  RiHeartPulseLine,
  RiGlobalLine,
  RiExternalLinkLine,
} from "@remixicon/react";

import { useInboxSearch } from "@/hooks/use-inbox";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `blk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneBlock(block: BusinessBlock): BusinessBlock {
  const cloned = JSON.parse(JSON.stringify(block)) as BusinessBlock;
  cloned.id = makeId();
  return cloned;
}

function parseNumberOrNull(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

type ParseNumberOptions = {
  min?: number;
  max?: number;
  integer?: boolean;
};

function parseNumberOrNullWithConstraints(value: string, options: ParseNumberOptions = {}): number | null {
  const parsed = parseNumberOrNull(value);
  if (parsed == null) return null;
  let next = options.integer ? Math.trunc(parsed) : parsed;
  if (typeof options.min === "number" && next < options.min) {
    next = options.min;
  }
  if (typeof options.max === "number" && next > options.max) {
    next = options.max;
  }
  return next;
}

function parseList(value: string): string[] {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatDateTimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const min = `${date.getMinutes()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function toIsoOrNull(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toFieldPairs(record: Record<string, unknown>): Array<{ key: string; value: string }> {
  return Object.entries(record).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }));
}

function fromFieldPairs(pairs: Array<{ key: string; value: string }>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const pair of pairs) {
    const key = pair.key.trim();
    if (!key) continue;
    next[key] = pair.value;
  }
  return next;
}

function scaleSteps(min: number, max: number, step = 1): number[] {
  const out: number[] = [];
  const safeStep = step > 0 ? step : 1;
  for (let value = min; value <= max + safeStep / 10; value += safeStep) {
    out.push(Number.isInteger(value) ? value : Number(value.toFixed(2)));
    if (out.length >= 200) break;
  }
  return out;
}

export interface BusinessBlocksEditorProps {
  value: BusinessBlock[];
  onChange: (next: BusinessBlock[]) => void;
  editable?: boolean;
  className?: string;
  activeBlockId?: string | null;
  onActiveBlockChange?: (blockId: string | null) => void;
  renderMode?: ContentRenderMode;
}

export function BusinessBlocksEditor({
  value,
  onChange,
  editable = true,
  className,
  activeBlockId,
  onActiveBlockChange,
  renderMode = "builder",
}: BusinessBlocksEditorProps) {
  const [internalActiveBlockId, setInternalActiveBlockId] = useState<string | null>(null);
  const [inboxQueries, setInboxQueries] = useState<Record<string, string>>({});
  const [activeInboxBlockId, setActiveInboxBlockId] = useState<string | null>(null);
  const [advancedBlockIds, setAdvancedBlockIds] = useState<Record<string, boolean>>({});

  const blocks = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const fallbackActiveBlockId =
    internalActiveBlockId && blocks.some((block) => block.id === internalActiveBlockId)
      ? internalActiveBlockId
      : (blocks[0]?.id ?? null);
  const resolvedActiveBlockId = activeBlockId ?? fallbackActiveBlockId;
  const activeInboxQuery = activeInboxBlockId ? inboxQueries[activeInboxBlockId] ?? "" : "";
  const inboxSearch = useInboxSearch(activeInboxQuery, 8);
  const isRunMode = renderMode === "run";

  const setActiveBlock = (blockId: string | null) => {
    if (activeBlockId !== undefined) {
      onActiveBlockChange?.(blockId);
      return;
    }
    setInternalActiveBlockId(blockId);
  };

  const setBlocks = (next: BusinessBlock[]) => onChange(next);

  const patchBlock = (index: number, updater: (block: BusinessBlock) => BusinessBlock) => {
    const next = blocks.map((block, idx) => (idx === index ? updater(block) : block));
    setBlocks(next);
  };

  const duplicateBlock = (index: number) => {
    if (!editable) return;
    const target = blocks[index];
    if (!target) return;
    const next = [...blocks];
    const duplicated = cloneBlock(target);
    next.splice(index + 1, 0, duplicated);
    setBlocks(next);
    setActiveBlock(duplicated.id);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    if (!editable) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    const next = [...blocks];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(nextIndex, 0, item);
    setBlocks(next);
  };

  const deleteBlock = (index: number) => {
    if (!editable) return;
    const target = blocks[index];
    const next = blocks.filter((_, idx) => idx !== index);
    setBlocks(next);
    if (resolvedActiveBlockId === target?.id) {
      setActiveBlock(next[index]?.id ?? next[index - 1]?.id ?? null);
    }
  };

  const addInboxRef = (index: number, entry: InboxSearchEntry) => {
    patchBlock(index, (block) => {
      if (block.type !== "inbox_block") return block;
      const refs = block.payload.capture_refs ?? [];
      if (refs.some((ref) => ref.capture_id === entry.id)) return block;
      return {
        ...block,
        payload: {
          ...block.payload,
          capture_refs: [
            ...refs,
            {
              capture_id: entry.id,
              title: entry.title,
              capture_type: entry.capture_type,
            },
          ],
        },
      };
    });
    if (activeInboxBlockId) {
      setInboxQueries((prev) => ({ ...prev, [activeInboxBlockId]: "" }));
    }
  };

  const toggleAdvanced = (blockId: string) => {
    setAdvancedBlockIds((prev) => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", className)}>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pr-2">
        {blocks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/80 px-6 py-10 text-center text-sm text-muted-foreground">
            Start from a starter kit or add your first block from the studio rail.
          </div>
        ) : null}

        {blocks.map((block, index) => {
          const meta = BLOCK_DISPLAY_META[block.type];
          const isActive = block.id === resolvedActiveBlockId;
          const preview = getBusinessBlockPreview(block);
          const isAdvanced = advancedBlockIds[block.id] ?? false;

          const Icons: Record<string, React.ElementType> = {
            FileTextLine: RiFileTextLine,
            ListCheck2: RiListCheck2,
            Table2: RiTable2,
            ListUnordered: RiListUnordered,
            TimerLine: RiTimerLine,
            BarChartHorizontalLine: RiBarChartHorizontalLine,
            BookOpenLine: RiBookOpenLine,
            LinkM: RiLinkM,
            Attachment2: RiAttachment2,
            InboxLine: RiInboxLine,
            CheckboxCircleLine: RiCheckboxCircleLine,
            PulseLine: RiPulseLine,
            LineChartLine: RiLineChartLine,
            FlagLine: RiFlagLine,
            MapPinLine: RiMapPinLine,
            GitBranchLine: RiGitBranchLine,
            FlaskLine: RiFlaskLine,
            AlertLine: RiAlertLine,
            ShieldLine: RiShieldLine,
            QuestionLine: RiQuestionLine,
            HeartPulseLine: RiHeartPulseLine,
          };
          const IconComponent = Icons[meta.icon as string] || RiFileTextLine;

          const getBlockStat = (): string | null => {
            if (block.type === "checklist_block") {
              const done = block.payload.items.filter((i) => i.done).length;
              return `${done}/${block.payload.items.length}`;
            }
            if (block.type === "metric_block") {
              const cur = block.payload.current ?? "--";
              return block.payload.target != null ? `${cur}/${block.payload.target}` : `${cur}`;
            }
            if (block.type === "scale_block") return `${block.payload.value}/${block.payload.max}`;
            if (block.type === "task_block") return block.payload.status === "done" ? "✓" : block.payload.status === "in_progress" ? "…" : null;
            if (block.type === "timer_block") return block.payload.running ? "▶" : `${block.payload.elapsed_sec}s`;
            if (block.type === "milestone_block") return block.payload.done ? "✓" : null;
            if (block.type === "status_block") return block.payload.state.replace("_", " ");
            return null;
          };
          const stat = getBlockStat();

          return (
            <section
              key={block.id}
              className={cn(
                "transition-all",
                isRunMode
                  ? cn("border-b border-border/30 px-1 py-3", isActive && "bg-accent/5")
                  : cn(
                    "mb-3 rounded-2xl border bg-background/95 p-3 shadow-sm",
                    isActive
                      ? "border-primary/20 shadow-md"
                      : "border-border/80 hover:border-border hover:shadow-md"
                  )
              )}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setActiveBlock(block.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center">
                        {isRunMode ? (
                          <span className="mr-1.5 shrink-0 text-muted-foreground/70">
                            <IconComponent className="h-3.5 w-3.5" />
                          </span>
                        ) : null}
                        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                          {meta.eyebrow}
                        </div>
                      </div>
                      <h3 className="truncate text-sm font-bold text-foreground">
                        {(block.label ?? "").trim() || meta.title}
                      </h3>
                    </div>
                    {stat ? (
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground">{stat}</span>
                    ) : !isActive ? (
                      <span className="shrink-0 truncate text-xs text-muted-foreground max-w-[200px]">{preview}</span>
                    ) : null}
                  </div>
                </button>

                {
                  !isRunMode ? (
                    <div className={cn(
                      "flex shrink-0 items-center gap-0.5 self-start transition-opacity",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => moveBlock(index, -1)} disabled={!editable || index === 0}>
                        <RiArrowUpLine className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => moveBlock(index, 1)} disabled={!editable || index === blocks.length - 1}>
                        <RiArrowDownLine className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => duplicateBlock(index)} disabled={!editable}>
                        <RiFileCopyLine className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-full text-destructive" onClick={() => deleteBlock(index)} disabled={!editable}>
                        <RiDeleteBinLine className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null
                }
              </div>

              {isActive ? (
                <div className={cn("mt-3", isRunMode ? "space-y-2" : "space-y-3")}>
                  {!isRunMode ? (
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                        onClick={() => toggleAdvanced(block.id)}
                      >
                        {isAdvanced ? "Hide advanced" : "Advanced"}
                      </button>
                    </div>
                  ) : null}

                  {!isRunMode && isAdvanced ? (
                    <Input
                      value={block.label ?? ""}
                      onChange={(event) => patchBlock(index, (prev) => ({ ...prev, label: event.target.value || null }))}
                      disabled={!editable}
                      placeholder="Custom label"
                      className="h-8 rounded-lg border-border bg-accent/20 text-sm"
                    />
                  ) : null}

                  {block.type === "text_block" ? (
                    <Textarea
                      value={block.payload.text}
                      onChange={(event) =>
                        patchBlock(index, (prev) =>
                          prev.type === "text_block"
                            ? { ...prev, payload: { ...prev.payload, text: event.target.value } }
                            : prev
                        )
                      }
                      rows={isRunMode ? 1 : 4}
                      disabled={!editable}
                      placeholder={isRunMode ? "Draft content here..." : "Content"}
                      className={cn(
                        "text-sm resize-none",
                        isRunMode
                          ? "min-h-[24px] rounded-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 leading-relaxed text-foreground"
                          : "min-h-[90px] rounded-xl border-border bg-accent/20"
                      )}
                      onInput={(e) => {
                        if (isRunMode) {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "auto";
                          target.style.height = `${target.scrollHeight}px`;
                        }
                      }}
                    />
                  ) : null}

                  {block.type === "checklist_block" ? (
                    <div>
                      {block.payload.items.map((item, itemIndex) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 border-b border-border/20 py-2 last:border-b-0"
                        >
                          <Checkbox
                            checked={item.done}
                            onCheckedChange={(checked) =>
                              patchBlock(index, (prev) => {
                                if (prev.type !== "checklist_block") return prev;
                                const items = [...prev.payload.items];
                                items[itemIndex] = { ...items[itemIndex], done: checked === true };
                                return { ...prev, payload: { ...prev.payload, items } };
                              })
                            }
                          />
                          <Input
                            value={item.text}
                            onChange={(event) =>
                              patchBlock(index, (prev) => {
                                if (prev.type !== "checklist_block") return prev;
                                const items = [...prev.payload.items];
                                items[itemIndex] = { ...items[itemIndex], text: event.target.value };
                                return { ...prev, payload: { ...prev.payload, items } };
                              })
                            }
                            disabled={!editable}
                            className="h-8 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                          />
                          {!isRunMode ? (
                            <button
                              type="button"
                              onClick={() =>
                                patchBlock(index, (prev) =>
                                  prev.type === "checklist_block"
                                    ? { ...prev, payload: { ...prev.payload, items: prev.payload.items.filter((_, idx) => idx !== itemIndex) } }
                                    : prev
                                )
                              }
                              disabled={!editable}
                              className="text-xs text-destructive/60 hover:text-destructive"
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                      ))}
                      {!isRunMode ? (
                        <button
                          type="button"
                          onClick={() =>
                            patchBlock(index, (prev) =>
                              prev.type === "checklist_block"
                                ? { ...prev, payload: { ...prev.payload, items: [...prev.payload.items, { id: makeId(), text: "", done: false }] } }
                                : prev
                            )
                          }
                          disabled={!editable}
                          className="mt-1 text-xs font-medium text-primary hover:underline"
                        >
                          + Add item
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {block.type === "table_block" ? (
                    <div className="space-y-4">
                      <div className="overflow-x-auto rounded-[16px] border border-border/20 bg-transparent">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b border-border/20 bg-accent/50">
                            <tr>
                              {block.payload.columns.map((column) => (
                                <th key={column} className="px-4 py-3 font-semibold text-muted-foreground">{column}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/20">
                            {block.payload.rows.map((row, rowIndex) => (
                              <tr key={`${block.id}-row-${rowIndex}`}>
                                {row.map((cell, cellIndex) => (
                                  <td key={`${block.id}-${rowIndex}-${cellIndex}`} className="px-4 py-3 text-foreground">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {!isRunMode ? (
                        <div className="grid gap-3">
                          <Input
                            value={block.payload.columns.join(", ")}
                            onChange={(event) =>
                              patchBlock(index, (prev) =>
                                prev.type === "table_block"
                                  ? {
                                    ...prev,
                                    payload: {
                                      ...prev.payload,
                                      columns: event.target.value
                                        .split(",")
                                        .map((entry) => entry.trim())
                                        .filter(Boolean),
                                    },
                                  }
                                  : prev
                              )
                            }
                            disabled={!editable}
                            placeholder="Columns (comma separated)"
                            className="h-8 rounded-lg border-border bg-accent text-sm"
                          />
                          <Textarea
                            value={block.payload.rows.map((row) => row.join(" | ")).join("\n")}
                            onChange={(event) =>
                              patchBlock(index, (prev) =>
                                prev.type === "table_block"
                                  ? {
                                    ...prev,
                                    payload: {
                                      ...prev.payload,
                                      rows: event.target.value
                                        .split("\n")
                                        .map((line) => line.trim())
                                        .filter(Boolean)
                                        .map((line) => line.split("|").map((cell) => cell.trim())),
                                    },
                                  }
                                  : prev
                              )
                            }
                            rows={5}
                            disabled={!editable}
                            placeholder="Rows (pipe | separated)"
                            className="rounded-lg border-border bg-accent text-sm"
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {block.type === "fields_block" ? (
                    <div>
                      {toFieldPairs(block.payload.fields).map((pair, pairIndex) => (
                        <div key={`${pair.key}-${pairIndex}`} className={cn(
                          "flex items-center gap-2 border-b border-border/20 py-1.5 last:border-b-0"
                        )}>
                          {isRunMode ? (
                            <>
                              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{pair.key}:</span>
                              <Input
                                value={pair.value}
                                onChange={(event) => patchBlock(index, (prev) => {
                                  if (prev.type !== "fields_block") return prev;
                                  const pairs = toFieldPairs(prev.payload.fields);
                                  pairs[pairIndex] = { ...pairs[pairIndex], value: event.target.value };
                                  return { ...prev, payload: { ...prev.payload, fields: fromFieldPairs(pairs) } };
                                })}
                                disabled={!editable}
                                placeholder="Value..."
                                className="h-7 flex-1 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
                              />
                            </>
                          ) : (
                            <>
                              <Input
                                value={pair.key}
                                onChange={(event) => patchBlock(index, (prev) => {
                                  if (prev.type !== "fields_block") return prev;
                                  const pairs = toFieldPairs(prev.payload.fields);
                                  pairs[pairIndex] = { ...pairs[pairIndex], key: event.target.value };
                                  return { ...prev, payload: { ...prev.payload, fields: fromFieldPairs(pairs) } };
                                })}
                                disabled={!editable}
                                placeholder="Field"
                                className="h-8 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-1"
                              />
                              <Input
                                value={pair.value}
                                onChange={(event) => patchBlock(index, (prev) => {
                                  if (prev.type !== "fields_block") return prev;
                                  const pairs = toFieldPairs(prev.payload.fields);
                                  pairs[pairIndex] = { ...pairs[pairIndex], value: event.target.value };
                                  return { ...prev, payload: { ...prev.payload, fields: fromFieldPairs(pairs) } };
                                })}
                                disabled={!editable}
                                placeholder="Value"
                                className="h-8 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-1"
                              />
                            </>
                          )}
                        </div>
                      ))}
                      {!isRunMode ? (
                        <button
                          type="button"
                          onClick={() => patchBlock(index, (prev) => {
                            if (prev.type !== "fields_block") return prev;
                            const pairs = [...toFieldPairs(prev.payload.fields), { key: "", value: "" }];
                            return { ...prev, payload: { ...prev.payload, fields: fromFieldPairs(pairs) } };
                          })}
                          disabled={!editable}
                          className="mt-1 text-xs font-medium text-primary hover:underline"
                        >
                          + Add field
                        </button>
                      ) : null}
                    </div>
                  ) : null
                  }

                  {block.type === "timer_block" ? (
                    isRunMode ? (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground">
                          {block.payload.elapsed_sec}s{block.payload.duration_sec != null ? ` / ${block.payload.duration_sec}s` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => patchBlock(index, (prev) =>
                            prev.type === "timer_block"
                              ? { ...prev, payload: { ...prev.payload, running: !prev.payload.running } }
                              : prev
                          )}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            block.payload.running
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {block.payload.running ? "Stop" : "Start"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={block.payload.duration_sec ?? ""}
                          onChange={(event) => patchBlock(index, (prev) =>
                            prev.type === "timer_block"
                              ? { ...prev, payload: { ...prev.payload, duration_sec: parseNumberOrNullWithConstraints(event.target.value, { min: 0, integer: true }) } }
                              : prev
                          )}
                          disabled={!editable}
                          placeholder="Duration (s)"
                          className="h-8 flex-1 rounded-lg border-border text-sm"
                        />
                        <Input
                          type="number"
                          value={block.payload.elapsed_sec}
                          onChange={(event) => patchBlock(index, (prev) =>
                            prev.type === "timer_block"
                              ? { ...prev, payload: { ...prev.payload, elapsed_sec: parseNumberOrNullWithConstraints(event.target.value, { min: 0, integer: true }) ?? 0 } }
                              : prev
                          )}
                          disabled={!editable}
                          placeholder="Elapsed (s)"
                          className="h-8 flex-1 rounded-lg border-border text-sm"
                        />
                        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Checkbox
                            checked={block.payload.running}
                            onCheckedChange={(checked) => patchBlock(index, (prev) =>
                              prev.type === "timer_block"
                                ? { ...prev, payload: { ...prev.payload, running: checked === true } }
                                : prev
                            )}
                          />
                          Running
                        </label>
                      </div>
                    )
                  ) : null}

                  {block.type === "scale_block" ? (
                    <div className="space-y-2">
                      {isRunMode || block.payload.display_mode === "slider" ? (
                        <div className="space-y-1">
                          <input
                            type="range"
                            min={block.payload.min}
                            max={block.payload.max}
                            step={block.payload.step ?? 1}
                            value={block.payload.value}
                            onChange={(event) => patchBlock(index, (prev) =>
                              prev.type === "scale_block" ? { ...prev, payload: { ...prev.payload, value: Number(event.target.value) } } : prev
                            )}
                            disabled={!editable}
                            className="h-2 w-full cursor-pointer accent-primary"
                          />
                          <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                            <span>{String(block.payload.anchors.low ?? block.payload.min)}</span>
                            <span>{String(block.payload.anchors.high ?? block.payload.max)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {scaleSteps(block.payload.min, block.payload.max, block.payload.step ?? 1).map((step) => (
                            <button
                              key={`${block.id}-step-${step}`}
                              type="button"
                              onClick={() => patchBlock(index, (prev) =>
                                prev.type === "scale_block" ? { ...prev, payload: { ...prev.payload, value: step } } : prev
                              )}
                              className={cn(
                                "h-7 min-w-[28px] rounded-full border px-2 text-xs font-semibold transition-colors",
                                step <= block.payload.value
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-accent text-muted-foreground"
                              )}
                              disabled={!editable}
                            >
                              {step}
                            </button>
                          ))}
                        </div>
                      )}
                      {!isRunMode ? (
                        <div className="flex items-center gap-2">
                          <Input value={block.payload.unit ?? ""} onChange={(e) => patchBlock(index, (p) => p.type === "scale_block" ? { ...p, payload: { ...p.payload, unit: e.target.value || null } } : p)} disabled={!editable} placeholder="Unit" className="h-8 flex-1 rounded-lg border-border text-sm" />
                          <Input type="number" value={block.payload.target ?? ""} onChange={(e) => patchBlock(index, (p) => p.type === "scale_block" ? { ...p, payload: { ...p.payload, target: parseNumberOrNull(e.target.value) } } : p)} disabled={!editable} placeholder="Target" className="h-8 flex-1 rounded-lg border-border text-sm" />
                          <Select value={block.payload.display_mode ?? "slider"} onValueChange={(v) => patchBlock(index, (p) => p.type === "scale_block" ? { ...p, payload: { ...p.payload, display_mode: v === "steps" ? "steps" : "slider" } } : p)} disabled={!editable}>
                            <SelectTrigger className="h-8 flex-1 rounded-lg border-border text-sm"><SelectValue placeholder="Mode" /></SelectTrigger>
                            <SelectContent><SelectItem value="slider">Slider</SelectItem><SelectItem value="steps">Steps</SelectItem></SelectContent>
                          </Select>
                        </div>
                      ) : null}
                      {!isRunMode && isAdvanced ? (
                        <div className="flex items-center gap-2">
                          <Input type="number" value={block.payload.min} onChange={(e) => patchBlock(index, (p) => p.type === "scale_block" ? { ...p, payload: { ...p.payload, min: parseNumberOrNull(e.target.value) ?? 1 } } : p)} disabled={!editable} placeholder="Min" className="h-8 flex-1 rounded-lg border-border text-sm" />
                          <Input type="number" value={block.payload.max} onChange={(e) => patchBlock(index, (p) => p.type === "scale_block" ? { ...p, payload: { ...p.payload, max: parseNumberOrNull(e.target.value) ?? 10 } } : p)} disabled={!editable} placeholder="Max" className="h-8 flex-1 rounded-lg border-border text-sm" />
                          <Input type="number" value={block.payload.step ?? 1} onChange={(e) => patchBlock(index, (p) => p.type === "scale_block" ? { ...p, payload: { ...p.payload, step: parseNumberOrNullWithConstraints(e.target.value, { min: 0.01 }) ?? 1 } } : p)} disabled={!editable} placeholder="Step" className="h-8 flex-1 rounded-lg border-border text-sm" />
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {block.type === "key_value_block" ? (
                    <div>
                      {block.payload.pairs.map((pair, pairIndex) => (
                        <div key={`${block.id}-pair-${pairIndex}`} className="flex items-center gap-2 border-b border-border/20 py-1.5 last:border-b-0">
                          {isRunMode ? (
                            <>
                              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{pair.key}:</span>
                              <Input
                                value={pair.value}
                                onChange={(e) => patchBlock(index, (p) => { if (p.type !== "key_value_block") return p; const pairs = [...p.payload.pairs]; pairs[pairIndex] = { ...pairs[pairIndex], value: e.target.value }; return { ...p, payload: { ...p.payload, pairs } }; })}
                                disabled={!editable}
                                placeholder="Value..."
                                className="h-7 flex-1 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
                              />
                            </>
                          ) : (
                            <>
                              <Input value={pair.key} onChange={(e) => patchBlock(index, (p) => { if (p.type !== "key_value_block") return p; const pairs = [...p.payload.pairs]; pairs[pairIndex] = { ...pairs[pairIndex], key: e.target.value }; return { ...p, payload: { ...p.payload, pairs } }; })} disabled={!editable} placeholder="Key" className="h-8 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-1" />
                              <Input value={pair.value} onChange={(e) => patchBlock(index, (p) => { if (p.type !== "key_value_block") return p; const pairs = [...p.payload.pairs]; pairs[pairIndex] = { ...pairs[pairIndex], value: e.target.value }; return { ...p, payload: { ...p.payload, pairs } }; })} disabled={!editable} placeholder="Value" className="h-8 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-1" />
                              <button type="button" onClick={() => patchBlock(index, (p) => p.type === "key_value_block" ? { ...p, payload: { ...p.payload, pairs: p.payload.pairs.filter((_, i) => i !== pairIndex) } } : p)} disabled={!editable} className="text-xs text-destructive/60 hover:text-destructive">×</button>
                            </>
                          )}
                        </div>
                      ))}
                      {!isRunMode ? (
                        <button type="button" onClick={() => patchBlock(index, (p) => p.type === "key_value_block" ? { ...p, payload: { ...p.payload, pairs: [...p.payload.pairs, { key: "", value: "" }] } } : p)} disabled={!editable} className="mt-1 text-xs font-medium text-primary hover:underline">+ Add pair</button>
                      ) : null}
                    </div>
                  ) : null}

                  {block.type === "link_block" ? (
                    <div>
                      {block.payload.links.map((link, linkIndex) => (
                        <div key={`${block.id}-link-${linkIndex}`} className="flex items-center gap-2 border-b border-border/20 py-1.5 last:border-b-0">
                          {isRunMode ? (
                            <>
                              <RiLinkM className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <Input value={link.title ?? ""} onChange={(e) => patchBlock(index, (p) => { if (p.type !== "link_block") return p; const links = [...p.payload.links]; links[linkIndex] = { ...links[linkIndex], title: e.target.value || null }; return { ...p, payload: { ...p.payload, links } }; })} disabled={!editable} placeholder="Link title" className="h-7 w-[120px] font-medium border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0" />
                              <span className="text-muted-foreground/30">|</span>
                              <Input value={link.url} onChange={(e) => patchBlock(index, (p) => { if (p.type !== "link_block") return p; const links = [...p.payload.links]; links[linkIndex] = { ...links[linkIndex], url: e.target.value }; return { ...p, payload: { ...p.payload, links } }; })} disabled={!editable} placeholder="URL" className="h-7 flex-1 border-0 bg-transparent px-1 text-xs text-muted-foreground shadow-none focus-visible:ring-0" />
                              {link.url ? (
                                <a href={link.url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
                                  <RiExternalLinkLine className="h-3.5 w-3.5" />
                                </a>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <Input value={link.title ?? ""} onChange={(e) => patchBlock(index, (p) => { if (p.type !== "link_block") return p; const links = [...p.payload.links]; links[linkIndex] = { ...links[linkIndex], title: e.target.value || null }; return { ...p, payload: { ...p.payload, links } }; })} disabled={!editable} placeholder="Title" className="h-8 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-1" />
                              <Input value={link.url} onChange={(e) => patchBlock(index, (p) => { if (p.type !== "link_block") return p; const links = [...p.payload.links]; links[linkIndex] = { ...links[linkIndex], url: e.target.value }; return { ...p, payload: { ...p.payload, links } }; })} disabled={!editable} placeholder="https://" className="h-8 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-1" />
                              <button type="button" onClick={() => patchBlock(index, (p) => p.type === "link_block" ? { ...p, payload: { ...p.payload, links: p.payload.links.filter((_, i) => i !== linkIndex) } } : p)} disabled={!editable} className="text-xs text-destructive/60 hover:text-destructive">×</button>
                            </>
                          )}
                        </div>
                      ))}
                      {editable ? (
                        <button type="button" onClick={() => patchBlock(index, (p) => p.type === "link_block" ? { ...p, payload: { ...p.payload, links: [...p.payload.links, { title: null, url: "https://" }] } } : p)} disabled={!editable} className="mt-1 text-xs font-medium text-primary hover:underline">+ Add link</button>
                      ) : null}
                    </div>
                  ) : null}

                  {block.type === "attachment_block" ? (
                    <div>
                      {block.payload.attachments.map((attachment, attachmentIndex) => (
                        <div key={`${block.id}-attachment-${attachmentIndex}`} className="flex items-center gap-2 border-b border-border/20 py-2 last:border-b-0">
                          {isRunMode ? (
                            <span className="text-sm text-foreground truncate">{attachment.name}{attachment.mime ? ` (${attachment.mime})` : ""}</span>
                          ) : (
                            <>
                              <Input value={attachment.name} onChange={(e) => patchBlock(index, (p) => { if (p.type !== "attachment_block") return p; const a = [...p.payload.attachments]; a[attachmentIndex] = { ...a[attachmentIndex], name: e.target.value }; return { ...p, payload: { ...p.payload, attachments: a } }; })} disabled={!editable} placeholder="Name" className="h-8 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0" />
                              <Input value={attachment.url ?? ""} onChange={(e) => patchBlock(index, (p) => { if (p.type !== "attachment_block") return p; const a = [...p.payload.attachments]; a[attachmentIndex] = { ...a[attachmentIndex], url: e.target.value || null }; return { ...p, payload: { ...p.payload, attachments: a } }; })} disabled={!editable} placeholder="URL" className="h-8 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0" />
                              <button type="button" onClick={() => patchBlock(index, (p) => p.type === "attachment_block" ? { ...p, payload: { ...p.payload, attachments: p.payload.attachments.filter((_, i) => i !== attachmentIndex) } } : p)} disabled={!editable} className="text-xs text-destructive/60 hover:text-destructive">×</button>
                            </>
                          )}
                        </div>
                      ))}
                      {!isRunMode ? (
                        <button type="button" onClick={() => patchBlock(index, (p) => p.type === "attachment_block" ? { ...p, payload: { ...p.payload, attachments: [...p.payload.attachments, { name: "", url: null, mime: null, size_bytes: null }] } } : p)} disabled={!editable} className="mt-1 text-xs font-medium text-primary hover:underline">+ Add attachment</button>
                      ) : null}
                    </div>
                  ) : null}

                  {block.type === "inbox_block" ? (
                    <div className="space-y-3">
                      {!isRunMode ? (
                        <div className="space-y-1">
                          <Input
                            value={inboxQueries[block.id] ?? ""}
                            onFocus={() => setActiveInboxBlockId(block.id)}
                            onChange={(event) => {
                              setInboxQueries((prev) => ({ ...prev, [block.id]: event.target.value }));
                              setActiveInboxBlockId(block.id);
                            }}
                            disabled={!editable}
                            placeholder="Search to capture..."
                            className="h-8 rounded-lg border-border bg-accent text-sm"
                          />
                          {activeInboxBlockId === block.id && (inboxSearch.data?.captures ?? []).length > 0 ? (
                            <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                              {(inboxSearch.data?.captures ?? []).map((entry) => (
                                <button
                                  key={entry.id}
                                  type="button"
                                  onClick={() => addInboxRef(index, entry)}
                                  className="flex w-full items-center justify-between border-b border-border/20 px-3 py-2 text-left last:border-b-0 hover:bg-accent"
                                >
                                  <span className="text-sm font-medium text-foreground">{entry.title}</span>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{entry.capture_type ?? "capture"}</span>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {block.payload.capture_refs.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {block.payload.capture_refs.map((ref) => (
                            <div key={ref.capture_id} className="flex items-center gap-2 rounded-lg border border-border/20 bg-accent px-3 py-2 text-sm text-foreground">
                              <span className="max-w-[240px] truncate">{ref.title || ref.capture_id}</span>
                              {!isRunMode ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    patchBlock(index, (prev) =>
                                      prev.type === "inbox_block"
                                        ? { ...prev, payload: { ...prev.payload, capture_refs: prev.payload.capture_refs.filter((entry) => entry.capture_id !== ref.capture_id) } }
                                        : prev
                                    )
                                  }
                                  className="ml-auto text-destructive/60 hover:text-destructive"
                                  disabled={!editable}
                                >
                                  ×
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {block.type === "task_block" ? (
                    <div className="space-y-3">
                      {isRunMode ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">{block.payload.title || "Untitled task"}</span>
                          <button
                            type="button"
                            disabled={!editable}
                            onClick={() => patchBlock(index, (p) => {
                              if (p.type !== "task_block") return p;
                              const nextStatus = p.payload.status === "todo" ? "in_progress" : p.payload.status === "in_progress" ? "done" : "todo";
                              return { ...p, payload: { ...p.payload, status: nextStatus } };
                            })}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors",
                              block.payload.status === "done" ? "bg-primary text-primary-foreground hover:bg-primary/90" :
                                block.payload.status === "in_progress" ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" :
                                  "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                          >
                            {block.payload.status.replace("_", " ")}
                          </button>
                        </div>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-[1fr,auto]">
                          <Input value={block.payload.title} onChange={(e) => patchBlock(index, (p) => p.type === "task_block" ? { ...p, payload: { ...p.payload, title: e.target.value } } : p)} disabled={!editable} placeholder="Task title" className="h-8 rounded-lg border-border text-sm" />
                          <Select value={block.payload.status} onValueChange={(v) => patchBlock(index, (p) => p.type === "task_block" ? { ...p, payload: { ...p.payload, status: v } } : p)} disabled={!editable}>
                            <SelectTrigger className="h-8 w-[120px] rounded-lg border-border text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">To do</SelectItem>
                              <SelectItem value="in_progress">Doing</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {!isRunMode && advancedBlockIds[block.id] ? (
                        <Input type="datetime-local" value={formatDateTimeLocal(block.payload.due_at)} onChange={(e) => patchBlock(index, (p) => p.type === "task_block" ? { ...p, payload: { ...p.payload, due_at: toIsoOrNull(e.target.value) } } : p)} disabled={!editable} className="h-8 rounded-lg border-border text-sm" />
                      ) : null}
                    </div>
                  ) : null}

                  {block.type === "status_block" ? (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {[
                            { value: "on_track", label: "On track" },
                            { value: "at_risk", label: "At risk" },
                            { value: "off_track", label: "Off track" },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => patchBlock(index, (p) => p.type === "status_block" ? { ...p, payload: { ...p.payload, state: option.value as any } } : p)}
                              className={cn(
                                "h-8 rounded-full border px-3 text-xs font-semibold transition-colors",
                                block.payload.state === option.value
                                  ? (option.value === "on_track" ? "border-green-500 bg-green-500 text-white" : option.value === "at_risk" ? "border-yellow-500 bg-yellow-500 text-white" : "border-red-500 bg-red-500 text-white")
                                  : "border-border bg-accent text-muted-foreground hover:bg-accent/80"
                              )}
                              disabled={!editable}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        {isRunMode && block.payload.note ? (
                          <p className="text-sm text-muted-foreground">{block.payload.note}</p>
                        ) : null}
                      </div>
                      {!isRunMode && advancedBlockIds[block.id] ? (
                        <div className="grid gap-2 md:grid-cols-2">
                          <Input type="number" min="0" max="1" step="0.1" value={block.payload.confidence ?? ""} onChange={(e) => patchBlock(index, (p) => p.type === "status_block" ? { ...p, payload: { ...p.payload, confidence: parseNumberOrNullWithConstraints(e.target.value, { min: 0, max: 1 }) } } : p)} disabled={!editable} placeholder="Confidence (0-1)" className="h-8 rounded-lg border-border text-sm" />
                          <Input value={block.payload.note ?? ""} onChange={(e) => patchBlock(index, (p) => p.type === "status_block" ? { ...p, payload: { ...p.payload, note: e.target.value || null } } : p)} disabled={!editable} placeholder="Context note" className="h-8 rounded-lg border-border text-sm" />
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {block.type === "metric_block" ? (
                    <div className="space-y-3">
                      {isRunMode ? (
                        <div className="flex items-baseline gap-2">
                          <Input
                            type="number"
                            value={block.payload.current ?? ""}
                            onChange={(e) => patchBlock(index, (p) => p.type === "metric_block" ? { ...p, payload: { ...p.payload, current: parseNumberOrNull(e.target.value) } } : p)}
                            disabled={!editable}
                            placeholder="—"
                            className="h-10 w-24 border-0 p-0 text-2xl font-extrabold tracking-tight text-foreground shadow-none focus-visible:ring-0 bg-transparent"
                          />
                          {block.payload.unit && <span className="text-sm font-semibold text-muted-foreground">{block.payload.unit}</span>}
                          {block.payload.target != null && (
                            <span className="ml-2 text-xs font-medium text-muted-foreground">Target: {block.payload.target}</span>
                          )}
                        </div>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-[1fr,auto,auto,auto]">
                          <Input value={block.payload.name} onChange={(e) => patchBlock(index, (p) => p.type === "metric_block" ? { ...p, payload: { ...p.payload, name: e.target.value } } : p)} disabled={!editable} placeholder="Metric name" className="h-8 rounded-lg border-border text-sm" />
                          <Input type="number" value={block.payload.current ?? ""} onChange={(e) => patchBlock(index, (p) => p.type === "metric_block" ? { ...p, payload: { ...p.payload, current: parseNumberOrNull(e.target.value) } } : p)} disabled={!editable} placeholder="Current" className="h-8 w-24 rounded-lg border-border text-sm" />
                          <Input type="number" value={block.payload.target ?? ""} onChange={(e) => patchBlock(index, (p) => p.type === "metric_block" ? { ...p, payload: { ...p.payload, target: parseNumberOrNull(e.target.value) } } : p)} disabled={!editable} placeholder="Target" className="h-8 w-24 rounded-lg border-border text-sm" />
                          <Input value={block.payload.unit ?? ""} onChange={(e) => patchBlock(index, (p) => p.type === "metric_block" ? { ...p, payload: { ...p.payload, unit: e.target.value || null } } : p)} disabled={!editable} placeholder="Unit" className="h-8 w-20 rounded-lg border-border text-sm" />
                        </div>
                      )}
                    </div>
                  ) : null}

                  {block.type === "goal_block" ? (
                    <div className="space-y-3">
                      {isRunMode ? (
                        <div className="text-sm font-medium text-foreground">{block.payload.outcome}</div>
                      ) : (
                        <>
                          <Textarea value={block.payload.outcome} onChange={(e) => patchBlock(index, (p) => p.type === "goal_block" ? { ...p, payload: { ...p.payload, outcome: e.target.value } } : p)} disabled={!editable} placeholder="Outcome" rows={3} className="rounded-[24px] border-border bg-transparent text-sm" />
                          {advancedBlockIds[block.id] ? (
                            <div className="grid gap-3">
                              <Input type="datetime-local" value={formatDateTimeLocal(block.payload.deadline)} onChange={(e) => patchBlock(index, (p) => p.type === "goal_block" ? { ...p, payload: { ...p.payload, deadline: toIsoOrNull(e.target.value) } } : p)} disabled={!editable} className="h-8 rounded-lg border-border text-sm" />
                              <Textarea value={block.payload.success_criteria.join("\n")} onChange={(e) => patchBlock(index, (p) => p.type === "goal_block" ? { ...p, payload: { ...p.payload, success_criteria: parseList(e.target.value) } } : p)} disabled={!editable} rows={4} placeholder="One success criterion per line" className="rounded-xl border-border bg-transparent text-sm" />
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}

                  {block.type === "milestone_block" ? (
                    <div className="space-y-3">
                      {isRunMode ? (
                        <div className="flex items-center gap-3">
                          <Checkbox checked={block.payload.done} onCheckedChange={(c) => patchBlock(index, (p) => p.type === "milestone_block" ? { ...p, payload: { ...p.payload, done: c === true } } : p)} disabled={!editable} />
                          <span className={cn("text-sm font-medium transition-colors", block.payload.done ? "text-muted-foreground line-through" : "text-foreground")}>{block.payload.title || "Untitled milestone"}</span>
                          {block.payload.target_date && <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{new Date(block.payload.target_date).toLocaleDateString()}</span>}
                        </div>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-[auto,1fr,auto]">
                          <Checkbox checked={block.payload.done} onCheckedChange={(c) => patchBlock(index, (p) => p.type === "milestone_block" ? { ...p, payload: { ...p.payload, done: c === true } } : p)} disabled={!editable} className="mt-1" />
                          <Input value={block.payload.title} onChange={(e) => patchBlock(index, (p) => p.type === "milestone_block" ? { ...p, payload: { ...p.payload, title: e.target.value } } : p)} disabled={!editable} placeholder="Milestone title" className="h-8 rounded-lg border-border text-sm" />
                          {advancedBlockIds[block.id] ? (
                            <Input type="datetime-local" value={formatDateTimeLocal(block.payload.target_date)} onChange={(e) => patchBlock(index, (p) => p.type === "milestone_block" ? { ...p, payload: { ...p.payload, target_date: toIsoOrNull(e.target.value) } } : p)} disabled={!editable} className="h-8 rounded-lg border-border text-sm" />
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {block.type === "decision_block" ? (
                    <div className="space-y-3">
                      {isRunMode ? (
                        <div className="text-sm font-medium text-foreground">{block.payload.decision}</div>
                      ) : (
                        <>
                          <Input value={block.payload.decision} onChange={(e) => patchBlock(index, (p) => p.type === "decision_block" ? { ...p, payload: { ...p.payload, decision: e.target.value } } : p)} disabled={!editable} placeholder="Decision" className="h-8 rounded-lg border-border text-sm" />
                          {advancedBlockIds[block.id] ? (
                            <div className="grid gap-3">
                              <Textarea value={block.payload.why} onChange={(e) => patchBlock(index, (p) => p.type === "decision_block" ? { ...p, payload: { ...p.payload, why: e.target.value } } : p)} disabled={!editable} placeholder="Why" rows={3} className="rounded-xl border-border bg-transparent text-sm" />
                              <Textarea value={block.payload.alternatives.join("\n")} onChange={(e) => patchBlock(index, (p) => p.type === "decision_block" ? { ...p, payload: { ...p.payload, alternatives: parseList(e.target.value) } } : p)} disabled={!editable} rows={3} placeholder="Alternative per line" className="rounded-xl border-border bg-transparent text-sm" />
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}

                  {block.type === "hypothesis_block" ? (
                    <div className="space-y-3">
                      {isRunMode ? (
                        <div className="text-sm font-medium text-foreground">{block.payload.statement}</div>
                      ) : (
                        <>
                          <Textarea value={block.payload.statement} onChange={(e) => patchBlock(index, (p) => p.type === "hypothesis_block" ? { ...p, payload: { ...p.payload, statement: e.target.value } } : p)} disabled={!editable} placeholder="Statement" rows={3} className="rounded-xl border-border bg-transparent text-sm" />
                          {advancedBlockIds[block.id] ? (
                            <div className="grid gap-3 md:grid-cols-2">
                              <Textarea value={block.payload.test} onChange={(e) => patchBlock(index, (p) => p.type === "hypothesis_block" ? { ...p, payload: { ...p.payload, test: e.target.value } } : p)} disabled={!editable} placeholder="Test" rows={3} className="rounded-xl border-border bg-transparent text-sm" />
                              <Textarea value={block.payload.signal} onChange={(e) => patchBlock(index, (p) => p.type === "hypothesis_block" ? { ...p, payload: { ...p.payload, signal: e.target.value } } : p)} disabled={!editable} placeholder="Signal" rows={3} className="rounded-xl border-border bg-transparent text-sm" />
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}

                  {block.type === "risk_block" ? (
                    <div className="space-y-3">
                      {isRunMode ? (
                        <div className="flex items-start gap-2">
                          <div className="text-sm font-medium text-foreground flex-1">{block.payload.risk}</div>
                          {block.payload.impact && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{block.payload.impact}</span>}
                        </div>
                      ) : (
                        <>
                          <Textarea value={block.payload.risk} onChange={(e) => patchBlock(index, (p) => p.type === "risk_block" ? { ...p, payload: { ...p.payload, risk: e.target.value } } : p)} disabled={!editable} placeholder="Risk" rows={3} className="rounded-xl border-border bg-transparent text-sm" />
                          {advancedBlockIds[block.id] ? (
                            <div className="grid gap-3">
                              <div className="grid gap-3 md:grid-cols-2">
                                <Textarea value={block.payload.impact} onChange={(e) => patchBlock(index, (p) => p.type === "risk_block" ? { ...p, payload: { ...p.payload, impact: e.target.value } } : p)} disabled={!editable} placeholder="Impact" rows={2} className="rounded-xl border-border bg-transparent text-sm" />
                                <Input value={block.payload.owner ?? ""} onChange={(e) => patchBlock(index, (p) => p.type === "risk_block" ? { ...p, payload: { ...p.payload, owner: e.target.value || null } } : p)} disabled={!editable} placeholder="Owner" className="h-8 rounded-lg border-border text-sm" />
                              </div>
                              <Textarea value={block.payload.mitigation} onChange={(e) => patchBlock(index, (p) => p.type === "risk_block" ? { ...p, payload: { ...p.payload, mitigation: e.target.value } } : p)} disabled={!editable} placeholder="Mitigation" rows={3} className="rounded-xl border-border bg-transparent text-sm" />
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}

                  {block.type === "constraint_block" ? (
                    <div className="space-y-3">
                      {isRunMode ? (
                        <div className="flex items-start gap-2">
                          <div className="text-sm font-medium text-foreground flex-1">{block.payload.constraint}</div>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", block.payload.strictness === "hard" ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500")}>{block.payload.strictness}</span>
                        </div>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-[1fr,auto]">
                          <Textarea value={block.payload.constraint} onChange={(e) => patchBlock(index, (p) => p.type === "constraint_block" ? { ...p, payload: { ...p.payload, constraint: e.target.value } } : p)} disabled={!editable} placeholder="Constraint" rows={2} className="rounded-xl border-border bg-transparent text-sm" />
                          <Select value={block.payload.strictness} onValueChange={(v) => patchBlock(index, (p) => p.type === "constraint_block" ? { ...p, payload: { ...p.payload, strictness: v } } : p)} disabled={!editable}>
                            <SelectTrigger className="h-8 w-[100px] rounded-lg border-border text-sm"><SelectValue placeholder="Strictness" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hard">Hard</SelectItem>
                              <SelectItem value="soft">Soft</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {block.type === "question_block" ? (
                    <div className="space-y-3">
                      {isRunMode ? (
                        <div className="flex items-start gap-2">
                          <div className="text-sm font-medium text-foreground flex-1">{block.payload.question}</div>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", block.payload.priority === "high" ? "bg-red-500/10 text-red-500" : block.payload.priority === "medium" ? "bg-yellow-500/10 text-yellow-600" : "bg-slate-100 text-slate-500")}>{block.payload.priority}</span>
                        </div>
                      ) : (
                        <>
                          <Textarea value={block.payload.question} onChange={(e) => patchBlock(index, (p) => p.type === "question_block" ? { ...p, payload: { ...p.payload, question: e.target.value } } : p)} disabled={!editable} placeholder="Question" rows={3} className="rounded-[24px] border-border bg-transparent text-sm" />
                          {advancedBlockIds[block.id] ? (
                            <div className="grid gap-3 md:grid-cols-2">
                              <Select value={block.payload.priority} onValueChange={(v) => patchBlock(index, (p) => p.type === "question_block" ? { ...p, payload: { ...p.payload, priority: v } } : p)} disabled={!editable}>
                                <SelectTrigger className="h-8 rounded-lg border-border text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input value={block.payload.assignee ?? ""} onChange={(e) => patchBlock(index, (p) => p.type === "question_block" ? { ...p, payload: { ...p.payload, assignee: e.target.value || null } } : p)} disabled={!editable} placeholder="Assignee" className="h-8 rounded-lg border-border text-sm" />
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}

                  {block.type === "set_block" ? (
                    <div className="space-y-4">
                      {isRunMode ? (
                        <div className="text-sm font-medium text-foreground">{block.payload.exercise_name}</div>
                      ) : (
                        <Input value={block.payload.exercise_name} onChange={(e) => patchBlock(index, (p) => p.type === "set_block" ? { ...p, payload: { ...p.payload, exercise_name: e.target.value } } : p)} disabled={!editable} placeholder="Exercise name" className="h-8 rounded-lg border-border text-sm" />
                      )}
                      <div className="space-y-2">
                        {block.payload.sets.map((setItem, setIndex) => (
                          <div key={`${block.id}-set-${setIndex}`} className="flex items-center gap-3 border-b border-border/20 py-2 last:border-b-0">
                            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground w-16 shrink-0">
                              <Checkbox checked={setItem.done} onCheckedChange={(c) => patchBlock(index, (p) => { if (p.type !== "set_block") return p; const s = [...p.payload.sets]; s[setIndex] = { ...s[setIndex], done: c === true }; return { ...p, payload: { ...p.payload, sets: s } }; })} disabled={!editable} />
                              S{setIndex + 1}
                            </label>
                            <div className="grid grid-cols-4 gap-2 flex-1">
                              {isRunMode ? (
                                <>
                                  <div className="text-sm text-foreground">{setItem.reps ? `${setItem.reps} reps` : "-"}</div>
                                  <div className="text-sm text-foreground">{setItem.load ? `${setItem.load} kg` : "-"}</div>
                                  <div className="text-sm text-foreground text-center">{setItem.rest_sec ? `${setItem.rest_sec}s` : "-"}</div>
                                  <div className="text-sm text-foreground text-right">{setItem.rpe ? `RPE ${setItem.rpe}` : "-"}</div>
                                </>
                              ) : (
                                <>
                                  <Input type="number" value={setItem.reps ?? ""} onChange={(e) => patchBlock(index, (p) => { if (p.type !== "set_block") return p; const s = [...p.payload.sets]; s[setIndex] = { ...s[setIndex], reps: parseNumberOrNullWithConstraints(e.target.value, { min: 0, integer: true }) }; return { ...p, payload: { ...p.payload, sets: s } }; })} disabled={!editable} placeholder="Reps" className="h-8 rounded-lg border-border text-sm" />
                                  <Input type="number" value={setItem.load ?? ""} onChange={(e) => patchBlock(index, (p) => { if (p.type !== "set_block") return p; const s = [...p.payload.sets]; s[setIndex] = { ...s[setIndex], load: parseNumberOrNullWithConstraints(e.target.value, { min: 0 }) }; return { ...p, payload: { ...p.payload, sets: s } }; })} disabled={!editable} placeholder="Load" className="h-8 rounded-lg border-border text-sm" />
                                  <Input type="number" value={setItem.rest_sec ?? ""} onChange={(e) => patchBlock(index, (p) => { if (p.type !== "set_block") return p; const s = [...p.payload.sets]; s[setIndex] = { ...s[setIndex], rest_sec: parseNumberOrNullWithConstraints(e.target.value, { min: 0, integer: true }) }; return { ...p, payload: { ...p.payload, sets: s } }; })} disabled={!editable} placeholder="Rest (s)" className="h-8 rounded-lg border-border text-sm" />
                                  <Input type="number" value={setItem.rpe ?? ""} onChange={(e) => patchBlock(index, (p) => { if (p.type !== "set_block") return p; const s = [...p.payload.sets]; s[setIndex] = { ...s[setIndex], rpe: parseNumberOrNullWithConstraints(e.target.value, { min: 0, max: 10 }) }; return { ...p, payload: { ...p.payload, sets: s } }; })} disabled={!editable} placeholder="RPE" className="h-8 rounded-lg border-border text-sm" />
                                </>
                              )}
                            </div>
                            {!isRunMode ? (
                              <button type="button" onClick={() => patchBlock(index, (p) => p.type === "set_block" ? { ...p, payload: { ...p.payload, sets: p.payload.sets.filter((_, idx) => idx !== setIndex) } } : p)} className="text-destructive/60 hover:text-destructive shrink-0 ml-1" disabled={!editable}>×</button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {!isRunMode ? (
                        <>
                          <div>
                            <button type="button" onClick={() => patchBlock(index, (p) => p.type === "set_block" ? { ...p, payload: { ...p.payload, sets: [...p.payload.sets, { reps: null, load: null, rest_sec: null, rpe: null, done: false }] } } : p)} disabled={!editable} className="text-sm font-semibold text-primary hover:underline">+ Add set</button>
                          </div>
                          {advancedBlockIds[block.id] ? (
                            <Textarea value={block.payload.notes ?? ""} onChange={(e) => patchBlock(index, (p) => p.type === "set_block" ? { ...p, payload: { ...p.payload, notes: e.target.value || null } } : p)} disabled={!editable} placeholder="Session notes" rows={3} className="rounded-xl border-border bg-transparent text-sm" />
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}
      </div >
    </div >
  );
}
