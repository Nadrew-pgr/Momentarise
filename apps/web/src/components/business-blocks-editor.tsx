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
      <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto pr-2">
        {blocks.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border bg-background/80 px-6 py-12 text-center text-sm text-muted-foreground">
            Start from a starter kit or add your first block from the studio rail.
          </div>
        ) : null}

        {blocks.map((block, index) => {
          const meta = BLOCK_DISPLAY_META[block.type];
          const isActive = block.id === resolvedActiveBlockId;
          const preview = getBusinessBlockPreview(block);

          return (
            <section
              key={block.id}
              className={cn(
                "group rounded-[22px] border bg-background/95 p-3.5 shadow-sm transition-all",
                isActive
                  ? "border-primary/20 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]"
                  : "border-border/80 hover:border-border hover:shadow-md"
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setActiveBlock(block.id)}
                >
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                        {meta.eyebrow}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="truncate text-base font-extrabold tracking-tight text-foreground">
                          {(block.label ?? "").trim() || meta.title}
                        </h3>
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                      </div>
                    </div>
                    <p className="max-w-xl text-sm font-medium leading-relaxed text-muted-foreground lg:text-right">
                      {preview}
                    </p>
                  </div>
                </button>

                <div className={cn(
                  "flex shrink-0 items-center gap-1 self-start transition-opacity",
                  isActive ? "opacity-100" : "opacity-70 lg:opacity-0 lg:group-hover:opacity-100"
                )}>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full"
                    onClick={() => moveBlock(index, -1)}
                    disabled={!editable || index === 0}
                  >
                    <RiArrowUpLine className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full"
                    onClick={() => moveBlock(index, 1)}
                    disabled={!editable || index === blocks.length - 1}
                  >
                    <RiArrowDownLine className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full"
                    onClick={() => duplicateBlock(index)}
                    disabled={!editable}
                  >
                    <RiFileCopyLine className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-destructive"
                    onClick={() => deleteBlock(index)}
                    disabled={!editable}
                  >
                    <RiDeleteBinLine className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="rounded-full border border-border bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/70">
                  {meta.title}
                </div>
                {!isActive ? <div className="text-[11px] font-medium text-muted-foreground">Click to edit</div> : null}
              </div>

              {isActive ? (
                <div className="mt-4 space-y-4">
                  {renderMode === "builder" ? (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-accent/40 px-3 py-2">
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        Keep only the essential fields visible. Use advanced settings when needed.
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full px-3 text-xs"
                        onClick={() => toggleAdvanced(block.id)}
                      >
                        {advancedBlockIds[block.id] ? "Hide advanced" : "Advanced"}
                      </Button>
                    </div>
                  ) : null}

                  {renderMode === "builder" && advancedBlockIds[block.id] ? (
                    <div className="space-y-2 rounded-2xl border border-border bg-accent/20 p-3">
                      <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Label</Label>
                      <Input
                        value={block.label ?? ""}
                        onChange={(event) =>
                          patchBlock(index, (prev) => ({ ...prev, label: event.target.value || null }))
                        }
                        disabled={!editable}
                        placeholder="Optional label"
                        className="h-10 rounded-2xl border-slate-200 bg-background"
                      />
                    </div>
                  ) : null}

                  {block.type === "text_block" ? (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                        {isRunMode ? "Update" : "Content"}
                      </Label>
                      <Textarea
                        value={block.payload.text}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "text_block"
                              ? { ...prev, payload: { ...prev.payload, text: event.target.value } }
                              : prev
                          )
                        }
                        rows={isRunMode ? 4 : 6}
                        disabled={!editable}
                        className={cn(
                          "rounded-[24px] border-slate-200 bg-slate-50 px-4 py-4 text-base leading-relaxed",
                          isRunMode ? "min-h-[104px]" : "min-h-[140px]"
                        )}
                      />
                    </div>
                  ) : null}

                  {block.type === "checklist_block" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Progress</p>
                          <p className="text-lg font-bold text-slate-900">
                            {block.payload.items.filter((item) => item.done).length}/{block.payload.items.length}
                          </p>
                        </div>
                        {!isRunMode ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() =>
                              patchBlock(index, (prev) =>
                                prev.type === "checklist_block"
                                  ? {
                                      ...prev,
                                      payload: {
                                        ...prev.payload,
                                        items: [...prev.payload.items, { id: makeId(), text: "", done: false }],
                                      },
                                    }
                                  : prev
                              )
                            }
                            disabled={!editable}
                          >
                            <RiAddLine className="mr-1 h-4 w-4" /> Add item
                          </Button>
                        ) : null}
                      </div>

                      <div className={cn("space-y-3", isRunMode ? "space-y-2" : "space-y-3")}>
                        {block.payload.items.map((item, itemIndex) => (
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3",
                              isRunMode ? "py-2.5" : "py-3"
                            )}
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
                              className={cn(
                                "flex-1 rounded-xl border-slate-200 bg-white",
                                isRunMode ? "h-9 text-sm" : "h-10"
                              )}
                            />
                            {!isRunMode ? (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full text-destructive"
                                onClick={() =>
                                  patchBlock(index, (prev) =>
                                    prev.type === "checklist_block"
                                      ? {
                                          ...prev,
                                          payload: {
                                            ...prev.payload,
                                            items: prev.payload.items.filter((_, idx) => idx !== itemIndex),
                                          },
                                        }
                                      : prev
                                  )
                                }
                                disabled={!editable}
                              >
                                <RiDeleteBinLine className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {block.type === "table_block" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Columns</Label>
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
                          className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                        />
                      </div>
                      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              {block.payload.columns.map((column) => (
                                <th key={column} className="px-4 py-3 font-bold text-slate-600">{column}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {block.payload.rows.map((row, rowIndex) => (
                              <tr key={`${block.id}-row-${rowIndex}`} className="border-t border-slate-200">
                                {row.map((cell, cellIndex) => (
                                  <td key={`${block.id}-${rowIndex}-${cellIndex}`} className="px-4 py-3 text-slate-700">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Rows</Label>
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
                          className="rounded-[24px] border-slate-200 bg-slate-50"
                        />
                      </div>
                    </div>
                  ) : null}

                  {block.type === "fields_block" ? (
                    <div className="space-y-3">
                      {toFieldPairs(block.payload.fields).map((pair, pairIndex) => (
                        <div key={`${pair.key}-${pairIndex}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
                          <Input
                            value={pair.key}
                            onChange={(event) =>
                              patchBlock(index, (prev) => {
                                if (prev.type !== "fields_block") return prev;
                                const pairs = toFieldPairs(prev.payload.fields);
                                pairs[pairIndex] = { ...pairs[pairIndex], key: event.target.value };
                                return { ...prev, payload: { ...prev.payload, fields: fromFieldPairs(pairs) } };
                              })
                            }
                            disabled={!editable}
                            placeholder="Field"
                            className="h-10 rounded-xl border-slate-200 bg-white"
                          />
                          <Input
                            value={pair.value}
                            onChange={(event) =>
                              patchBlock(index, (prev) => {
                                if (prev.type !== "fields_block") return prev;
                                const pairs = toFieldPairs(prev.payload.fields);
                                pairs[pairIndex] = { ...pairs[pairIndex], value: event.target.value };
                                return { ...prev, payload: { ...prev.payload, fields: fromFieldPairs(pairs) } };
                              })
                            }
                            disabled={!editable}
                            placeholder="Value"
                            className="h-10 rounded-xl border-slate-200 bg-white"
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() =>
                          patchBlock(index, (prev) => {
                            if (prev.type !== "fields_block") return prev;
                            const pairs = [...toFieldPairs(prev.payload.fields), { key: "", value: "" }];
                            return { ...prev, payload: { ...prev.payload, fields: fromFieldPairs(pairs) } };
                          })
                        }
                        disabled={!editable}
                      >
                        <RiAddLine className="mr-1 h-4 w-4" /> Add field
                      </Button>
                    </div>
                  ) : null}

                  {block.type === "timer_block" ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Duration</Label>
                        <Input
                          type="number"
                          value={block.payload.duration_sec ?? ""}
                          onChange={(event) =>
                            patchBlock(index, (prev) =>
                              prev.type === "timer_block"
                                ? {
                                    ...prev,
                                    payload: {
                                      ...prev.payload,
                                      duration_sec: parseNumberOrNullWithConstraints(event.target.value, { min: 0, integer: true }),
                                    },
                                  }
                                : prev
                            )
                          }
                          disabled={!editable}
                          className="h-10 rounded-xl border-slate-200 bg-white"
                        />
                      </div>
                      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Elapsed</Label>
                        <Input
                          type="number"
                          value={block.payload.elapsed_sec}
                          onChange={(event) =>
                            patchBlock(index, (prev) =>
                              prev.type === "timer_block"
                                ? {
                                    ...prev,
                                    payload: {
                                      ...prev.payload,
                                      elapsed_sec: parseNumberOrNullWithConstraints(event.target.value, { min: 0, integer: true }) ?? 0,
                                    },
                                  }
                                : prev
                            )
                          }
                          disabled={!editable}
                          className="h-10 rounded-xl border-slate-200 bg-white"
                        />
                      </div>
                      <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <span className="text-sm font-semibold text-slate-700">Running</span>
                        <Checkbox
                          checked={block.payload.running}
                          onCheckedChange={(checked) =>
                            patchBlock(index, (prev) =>
                              prev.type === "timer_block"
                                ? { ...prev, payload: { ...prev.payload, running: checked === true } }
                                : prev
                            )
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  {block.type === "scale_block" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Current value</p>
                          <p className="text-2xl font-extrabold tracking-tight text-slate-900">{block.payload.value}/{block.payload.max}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                          <div>Min: {block.payload.min}</div>
                          <div>Max: {block.payload.max}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {scaleSteps(block.payload.min, block.payload.max).map((step) => (
                          <button
                            key={`${block.id}-step-${step}`}
                            type="button"
                            onClick={() =>
                              patchBlock(index, (prev) =>
                                prev.type === "scale_block"
                                  ? { ...prev, payload: { ...prev.payload, value: step } }
                                  : prev
                              )
                            }
                            className={cn(
                              "h-10 flex-1 rounded-full border text-xs font-bold transition-colors",
                              step <= block.payload.value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-slate-200 bg-slate-100 text-slate-500"
                            )}
                            disabled={!editable}
                          >
                            {step}
                          </button>
                        ))}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input
                          value={String(block.payload.anchors.low ?? "")}
                          onChange={(event) =>
                            patchBlock(index, (prev) =>
                              prev.type === "scale_block"
                                ? {
                                    ...prev,
                                    payload: {
                                      ...prev.payload,
                                      anchors: { ...prev.payload.anchors, low: event.target.value },
                                    },
                                  }
                                : prev
                            )
                          }
                          disabled={!editable}
                          placeholder="Low anchor"
                          className="h-10 rounded-xl border-slate-200 bg-slate-50"
                        />
                        <Input
                          value={String(block.payload.anchors.high ?? "")}
                          onChange={(event) =>
                            patchBlock(index, (prev) =>
                              prev.type === "scale_block"
                                ? {
                                    ...prev,
                                    payload: {
                                      ...prev.payload,
                                      anchors: { ...prev.payload.anchors, high: event.target.value },
                                    },
                                  }
                                : prev
                            )
                          }
                          disabled={!editable}
                          placeholder="High anchor"
                          className="h-10 rounded-xl border-slate-200 bg-slate-50"
                        />
                      </div>
                    </div>
                  ) : null}

                  {block.type === "key_value_block" ? (
                    <div className="space-y-3">
                      {block.payload.pairs.map((pair, pairIndex) => (
                        <div key={`${block.id}-pair-${pairIndex}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
                          <Input
                            value={pair.key}
                            onChange={(event) =>
                              patchBlock(index, (prev) => {
                                if (prev.type !== "key_value_block") return prev;
                                const pairs = [...prev.payload.pairs];
                                pairs[pairIndex] = { ...pairs[pairIndex], key: event.target.value };
                                return { ...prev, payload: { ...prev.payload, pairs } };
                              })
                            }
                            disabled={!editable}
                            placeholder="Key"
                            className="h-10 rounded-xl border-slate-200 bg-white"
                          />
                          <Input
                            value={pair.value}
                            onChange={(event) =>
                              patchBlock(index, (prev) => {
                                if (prev.type !== "key_value_block") return prev;
                                const pairs = [...prev.payload.pairs];
                                pairs[pairIndex] = { ...pairs[pairIndex], value: event.target.value };
                                return { ...prev, payload: { ...prev.payload, pairs } };
                              })
                            }
                            disabled={!editable}
                            placeholder="Value"
                            className="h-10 rounded-xl border-slate-200 bg-white"
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() =>
                          patchBlock(index, (prev) =>
                            prev.type === "key_value_block"
                              ? { ...prev, payload: { ...prev.payload, pairs: [...prev.payload.pairs, { key: "", value: "" }] } }
                              : prev
                          )
                        }
                        disabled={!editable}
                      >
                        <RiAddLine className="mr-1 h-4 w-4" /> Add pair
                      </Button>
                    </div>
                  ) : null}

                  {block.type === "link_block" ? (
                    <div className="space-y-3">
                      {block.payload.links.map((link, linkIndex) => (
                        <div key={`${block.id}-link-${linkIndex}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr,1fr,auto]">
                          <Input
                            value={link.title ?? ""}
                            onChange={(event) =>
                              patchBlock(index, (prev) => {
                                if (prev.type !== "link_block") return prev;
                                const links = [...prev.payload.links];
                                links[linkIndex] = { ...links[linkIndex], title: event.target.value || null };
                                return { ...prev, payload: { ...prev.payload, links } };
                              })
                            }
                            disabled={!editable}
                            placeholder="Title"
                            className="h-10 rounded-xl border-slate-200 bg-white"
                          />
                          <Input
                            value={link.url}
                            onChange={(event) =>
                              patchBlock(index, (prev) => {
                                if (prev.type !== "link_block") return prev;
                                const links = [...prev.payload.links];
                                links[linkIndex] = { ...links[linkIndex], url: event.target.value };
                                return { ...prev, payload: { ...prev.payload, links } };
                              })
                            }
                            disabled={!editable}
                            placeholder="https://"
                            className="h-10 rounded-xl border-slate-200 bg-white"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 rounded-full text-destructive"
                            onClick={() =>
                              patchBlock(index, (prev) =>
                                prev.type === "link_block"
                                  ? { ...prev, payload: { ...prev.payload, links: prev.payload.links.filter((_, idx) => idx !== linkIndex) } }
                                  : prev
                              )
                            }
                            disabled={!editable}
                          >
                            <RiDeleteBinLine className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() =>
                          patchBlock(index, (prev) =>
                            prev.type === "link_block"
                              ? { ...prev, payload: { ...prev.payload, links: [...prev.payload.links, { title: null, url: "https://" }] } }
                              : prev
                          )
                        }
                        disabled={!editable}
                      >
                        <RiAddLine className="mr-1 h-4 w-4" /> Add link
                      </Button>
                    </div>
                  ) : null}

                  {block.type === "attachment_block" ? (
                    <div className="space-y-3">
                      {block.payload.attachments.map((attachment, attachmentIndex) => (
                        <div key={`${block.id}-attachment-${attachmentIndex}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
                          <Input
                            value={attachment.name}
                            onChange={(event) =>
                              patchBlock(index, (prev) => {
                                if (prev.type !== "attachment_block") return prev;
                                const attachments = [...prev.payload.attachments];
                                attachments[attachmentIndex] = { ...attachments[attachmentIndex], name: event.target.value };
                                return { ...prev, payload: { ...prev.payload, attachments } };
                              })
                            }
                            disabled={!editable}
                            placeholder="File name"
                            className="h-10 rounded-xl border-slate-200 bg-white"
                          />
                          <Input
                            value={attachment.url ?? ""}
                            onChange={(event) =>
                              patchBlock(index, (prev) => {
                                if (prev.type !== "attachment_block") return prev;
                                const attachments = [...prev.payload.attachments];
                                attachments[attachmentIndex] = { ...attachments[attachmentIndex], url: event.target.value || null };
                                return { ...prev, payload: { ...prev.payload, attachments } };
                              })
                            }
                            disabled={!editable}
                            placeholder="File URL"
                            className="h-10 rounded-xl border-slate-200 bg-white"
                          />
                          <Input
                            value={attachment.mime ?? ""}
                            onChange={(event) =>
                              patchBlock(index, (prev) => {
                                if (prev.type !== "attachment_block") return prev;
                                const attachments = [...prev.payload.attachments];
                                attachments[attachmentIndex] = { ...attachments[attachmentIndex], mime: event.target.value || null };
                                return { ...prev, payload: { ...prev.payload, attachments } };
                              })
                            }
                            disabled={!editable}
                            placeholder="MIME type"
                            className="h-10 rounded-xl border-slate-200 bg-white"
                          />
                          <div className="flex items-center gap-3">
                            <Input
                              type="number"
                              value={attachment.size_bytes ?? ""}
                              onChange={(event) =>
                                patchBlock(index, (prev) => {
                                  if (prev.type !== "attachment_block") return prev;
                                  const attachments = [...prev.payload.attachments];
                                  attachments[attachmentIndex] = {
                                    ...attachments[attachmentIndex],
                                    size_bytes: parseNumberOrNullWithConstraints(event.target.value, { min: 0, integer: true }),
                                  };
                                  return { ...prev, payload: { ...prev.payload, attachments } };
                                })
                              }
                              disabled={!editable}
                              placeholder="Bytes"
                              className="h-10 rounded-xl border-slate-200 bg-white"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-10 w-10 rounded-full text-destructive"
                              onClick={() =>
                                patchBlock(index, (prev) =>
                                  prev.type === "attachment_block"
                                    ? { ...prev, payload: { ...prev.payload, attachments: prev.payload.attachments.filter((_, idx) => idx !== attachmentIndex) } }
                                    : prev
                                )
                              }
                              disabled={!editable}
                            >
                              <RiDeleteBinLine className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() =>
                          patchBlock(index, (prev) =>
                            prev.type === "attachment_block"
                              ? { ...prev, payload: { ...prev.payload, attachments: [...prev.payload.attachments, { name: "", url: null, mime: null, size_bytes: null }] } }
                              : prev
                          )
                        }
                        disabled={!editable}
                      >
                        <RiAddLine className="mr-1 h-4 w-4" /> Add attachment
                      </Button>
                    </div>
                  ) : null}

                  {block.type === "inbox_block" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Search inbox</Label>
                        <Input
                          value={inboxQueries[block.id] ?? ""}
                          onFocus={() => setActiveInboxBlockId(block.id)}
                          onChange={(event) => {
                            setInboxQueries((prev) => ({ ...prev, [block.id]: event.target.value }));
                            setActiveInboxBlockId(block.id);
                          }}
                          disabled={!editable}
                          placeholder="Type to search a capture"
                          className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                        />
                        {activeInboxBlockId === block.id && (inboxSearch.data?.captures ?? []).length > 0 ? (
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            {(inboxSearch.data?.captures ?? []).map((entry) => (
                              <button
                                key={entry.id}
                                type="button"
                                onClick={() => addInboxRef(index, entry)}
                                className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                              >
                                <span className="text-sm font-medium text-slate-900">{entry.title}</span>
                                <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{entry.capture_type ?? "capture"}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {block.payload.capture_refs.map((ref) => (
                          <div key={ref.capture_id} className="flex items-center gap-2 rounded-full border border-border bg-accent px-3 py-2 text-sm text-foreground">
                            <span className="max-w-[240px] truncate">{ref.title || ref.capture_id}</span>
                            <button
                              type="button"
                              onClick={() =>
                                patchBlock(index, (prev) =>
                                  prev.type === "inbox_block"
                                    ? {
                                        ...prev,
                                        payload: {
                                          ...prev.payload,
                                          capture_refs: prev.payload.capture_refs.filter((entry) => entry.capture_id !== ref.capture_id),
                                        },
                                      }
                                    : prev
                                )
                              }
                              className="text-foreground/70"
                              disabled={!editable}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {block.type === "task_block" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        value={block.payload.title}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "task_block"
                              ? { ...prev, payload: { ...prev.payload, title: event.target.value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Task title"
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50 md:col-span-2"
                      />
                      <Select
                        value={block.payload.status}
                        onValueChange={(value) =>
                          patchBlock(index, (prev) =>
                            prev.type === "task_block"
                              ? { ...prev, payload: { ...prev.payload, status: value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                      >
                        <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To do</SelectItem>
                          <SelectItem value="in_progress">In progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="datetime-local"
                        value={formatDateTimeLocal(block.payload.due_at)}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "task_block"
                              ? { ...prev, payload: { ...prev.payload, due_at: toIsoOrNull(event.target.value) } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                      />
                    </div>
                  ) : null}

                  {block.type === "status_block" ? (
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        {[
                          { value: "on_track", label: "On track" },
                          { value: "at_risk", label: "At risk" },
                          { value: "off_track", label: "Off track" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              patchBlock(index, (prev) =>
                                prev.type === "status_block"
                                  ? { ...prev, payload: { ...prev.payload, state: option.value } }
                                  : prev
                              )
                            }
                            className={cn(
                              "rounded-[24px] border px-4 py-4 text-left transition-colors",
                              block.payload.state === option.value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-slate-200 bg-slate-50 text-slate-700"
                            )}
                            disabled={!editable}
                          >
                            <div className="text-[11px] font-black uppercase tracking-[0.16em]">Status</div>
                            <div className="mt-2 text-base font-bold">{option.label}</div>
                          </button>
                        ))}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={block.payload.confidence ?? ""}
                          onChange={(event) =>
                            patchBlock(index, (prev) =>
                              prev.type === "status_block"
                                ? {
                                    ...prev,
                                    payload: {
                                      ...prev.payload,
                                      confidence: parseNumberOrNullWithConstraints(event.target.value, { min: 0, max: 1 }),
                                    },
                                  }
                                : prev
                            )
                          }
                          disabled={!editable}
                          placeholder="Confidence (0-1)"
                          className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                        />
                        <Textarea
                          value={block.payload.note ?? ""}
                          onChange={(event) =>
                            patchBlock(index, (prev) =>
                              prev.type === "status_block"
                                ? { ...prev, payload: { ...prev.payload, note: event.target.value || null } }
                                : prev
                            )
                          }
                          disabled={!editable}
                          placeholder="Context note"
                          rows={3}
                          className="rounded-[24px] border-slate-200 bg-slate-50"
                        />
                      </div>
                    </div>
                  ) : null}

                  {block.type === "metric_block" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        value={block.payload.name}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "metric_block"
                              ? { ...prev, payload: { ...prev.payload, name: event.target.value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Metric name"
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50 md:col-span-2"
                      />
                      <Input
                        type="number"
                        value={block.payload.current ?? ""}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "metric_block"
                              ? { ...prev, payload: { ...prev.payload, current: parseNumberOrNull(event.target.value) } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Current"
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                      />
                      <Input
                        type="number"
                        value={block.payload.target ?? ""}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "metric_block"
                              ? { ...prev, payload: { ...prev.payload, target: parseNumberOrNull(event.target.value) } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Target"
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                      />
                      <Input
                        value={block.payload.unit ?? ""}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "metric_block"
                              ? { ...prev, payload: { ...prev.payload, unit: event.target.value || null } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Unit"
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50 md:col-span-2"
                      />
                    </div>
                  ) : null}

                  {block.type === "goal_block" ? (
                    <div className="space-y-3">
                      <Textarea
                        value={block.payload.outcome}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "goal_block"
                              ? { ...prev, payload: { ...prev.payload, outcome: event.target.value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Outcome"
                        rows={4}
                        className="rounded-[24px] border-slate-200 bg-slate-50"
                      />
                      <Input
                        type="datetime-local"
                        value={formatDateTimeLocal(block.payload.deadline)}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "goal_block"
                              ? { ...prev, payload: { ...prev.payload, deadline: toIsoOrNull(event.target.value) } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                      />
                      <Textarea
                        value={block.payload.success_criteria.join("\n")}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "goal_block"
                              ? { ...prev, payload: { ...prev.payload, success_criteria: parseList(event.target.value) } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        rows={4}
                        placeholder="One success criterion per line"
                        className="rounded-[24px] border-slate-200 bg-slate-50"
                      />
                    </div>
                  ) : null}

                  {block.type === "milestone_block" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        value={block.payload.title}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "milestone_block"
                              ? { ...prev, payload: { ...prev.payload, title: event.target.value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Milestone title"
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                      />
                      <Input
                        type="datetime-local"
                        value={formatDateTimeLocal(block.payload.target_date)}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "milestone_block"
                              ? { ...prev, payload: { ...prev.payload, target_date: toIsoOrNull(event.target.value) } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                      />
                      <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
                        <span className="text-sm font-semibold text-slate-700">Done</span>
                        <Checkbox
                          checked={block.payload.done}
                          onCheckedChange={(checked) =>
                            patchBlock(index, (prev) =>
                              prev.type === "milestone_block"
                                ? { ...prev, payload: { ...prev.payload, done: checked === true } }
                                : prev
                            )
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  {block.type === "decision_block" ? (
                    <div className="space-y-3">
                      <Input
                        value={block.payload.decision}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "decision_block"
                              ? { ...prev, payload: { ...prev.payload, decision: event.target.value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Decision"
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                      />
                      <Textarea
                        value={block.payload.why}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "decision_block"
                              ? { ...prev, payload: { ...prev.payload, why: event.target.value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Why"
                        rows={4}
                        className="rounded-[24px] border-slate-200 bg-slate-50"
                      />
                      <Textarea
                        value={block.payload.alternatives.join("\n")}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "decision_block"
                              ? { ...prev, payload: { ...prev.payload, alternatives: parseList(event.target.value) } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        rows={3}
                        placeholder="Alternative per line"
                        className="rounded-[24px] border-slate-200 bg-slate-50"
                      />
                    </div>
                  ) : null}

                  {block.type === "hypothesis_block" ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      <Textarea
                        value={block.payload.statement}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "hypothesis_block"
                              ? { ...prev, payload: { ...prev.payload, statement: event.target.value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Statement"
                        rows={4}
                        className="rounded-[24px] border-slate-200 bg-slate-50"
                      />
                      <Textarea
                        value={block.payload.test}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "hypothesis_block"
                              ? { ...prev, payload: { ...prev.payload, test: event.target.value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Test"
                        rows={4}
                        className="rounded-[24px] border-slate-200 bg-slate-50"
                      />
                      <Textarea
                        value={block.payload.signal}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "hypothesis_block"
                              ? { ...prev, payload: { ...prev.payload, signal: event.target.value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Success signal"
                        rows={4}
                        className="rounded-[24px] border-slate-200 bg-slate-50"
                      />
                    </div>
                  ) : null}

                  {block.type === "risk_block" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Textarea
                        value={block.payload.risk}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "risk_block"
                              ? { ...prev, payload: { ...prev.payload, risk: event.target.value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Risk"
                        rows={4}
                        className="rounded-[24px] border-slate-200 bg-slate-50"
                      />
                      <Textarea
                        value={block.payload.impact}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "risk_block"
                              ? { ...prev, payload: { ...prev.payload, impact: event.target.value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Impact"
                        rows={4}
                        className="rounded-[24px] border-slate-200 bg-slate-50"
                      />
                      <Textarea
                        value={block.payload.mitigation}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "risk_block"
                              ? { ...prev, payload: { ...prev.payload, mitigation: event.target.value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Mitigation"
                        rows={4}
                        className="rounded-[24px] border-slate-200 bg-slate-50"
                      />
                      <Input
                        value={block.payload.owner ?? ""}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "risk_block"
                              ? { ...prev, payload: { ...prev.payload, owner: event.target.value || null } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Owner"
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                      />
                    </div>
                  ) : null}

                  {block.type === "constraint_block" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Textarea
                        value={block.payload.constraint}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "constraint_block"
                              ? { ...prev, payload: { ...prev.payload, constraint: event.target.value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Constraint"
                        rows={4}
                        className="rounded-[24px] border-slate-200 bg-slate-50"
                      />
                      <Select
                        value={block.payload.strictness}
                        onValueChange={(value) =>
                          patchBlock(index, (prev) =>
                            prev.type === "constraint_block"
                              ? { ...prev, payload: { ...prev.payload, strictness: value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                      >
                        <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50">
                          <SelectValue placeholder="Strictness" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hard">Hard</SelectItem>
                          <SelectItem value="soft">Soft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {block.type === "question_block" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Textarea
                        value={block.payload.question}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "question_block"
                              ? { ...prev, payload: { ...prev.payload, question: event.target.value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Question"
                        rows={4}
                        className="rounded-[24px] border-slate-200 bg-slate-50 md:col-span-2"
                      />
                      <Select
                        value={block.payload.priority}
                        onValueChange={(value) =>
                          patchBlock(index, (prev) =>
                            prev.type === "question_block"
                              ? { ...prev, payload: { ...prev.payload, priority: value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                      >
                        <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={block.payload.assignee ?? ""}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "question_block"
                              ? { ...prev, payload: { ...prev.payload, assignee: event.target.value || null } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Assignee"
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                      />
                    </div>
                  ) : null}

                  {block.type === "set_block" ? (
                    <div className="space-y-4">
                      <Input
                        value={block.payload.exercise_name}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "set_block"
                              ? { ...prev, payload: { ...prev.payload, exercise_name: event.target.value } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Exercise name"
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                      />
                      <div className="space-y-3">
                        {block.payload.sets.map((setItem, setIndex) => (
                          <div key={`${block.id}-set-${setIndex}`} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Set {setIndex + 1}</p>
                                <p className="text-sm font-semibold text-slate-700">Reps, load, rest, RPE</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                  <Checkbox
                                    checked={setItem.done}
                                    onCheckedChange={(checked) =>
                                      patchBlock(index, (prev) => {
                                        if (prev.type !== "set_block") return prev;
                                        const sets = [...prev.payload.sets];
                                        sets[setIndex] = { ...sets[setIndex], done: checked === true };
                                        return { ...prev, payload: { ...prev.payload, sets } };
                                      })
                                    }
                                  />
                                  Done
                                </label>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-full text-destructive"
                                  onClick={() =>
                                    patchBlock(index, (prev) =>
                                      prev.type === "set_block"
                                        ? { ...prev, payload: { ...prev.payload, sets: prev.payload.sets.filter((_, idx) => idx !== setIndex) } }
                                        : prev
                                    )
                                  }
                                  disabled={!editable}
                                >
                                  <RiDeleteBinLine className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-4">
                              <Input
                                type="number"
                                value={setItem.reps ?? ""}
                                onChange={(event) =>
                                  patchBlock(index, (prev) => {
                                    if (prev.type !== "set_block") return prev;
                                    const sets = [...prev.payload.sets];
                                    sets[setIndex] = { ...sets[setIndex], reps: parseNumberOrNullWithConstraints(event.target.value, { min: 0, integer: true }) };
                                    return { ...prev, payload: { ...prev.payload, sets } };
                                  })
                                }
                                disabled={!editable}
                                placeholder="Reps"
                                className="h-10 rounded-xl border-slate-200 bg-white"
                              />
                              <Input
                                type="number"
                                value={setItem.load ?? ""}
                                onChange={(event) =>
                                  patchBlock(index, (prev) => {
                                    if (prev.type !== "set_block") return prev;
                                    const sets = [...prev.payload.sets];
                                    sets[setIndex] = { ...sets[setIndex], load: parseNumberOrNullWithConstraints(event.target.value, { min: 0 }) };
                                    return { ...prev, payload: { ...prev.payload, sets } };
                                  })
                                }
                                disabled={!editable}
                                placeholder="Load"
                                className="h-10 rounded-xl border-slate-200 bg-white"
                              />
                              <Input
                                type="number"
                                value={setItem.rest_sec ?? ""}
                                onChange={(event) =>
                                  patchBlock(index, (prev) => {
                                    if (prev.type !== "set_block") return prev;
                                    const sets = [...prev.payload.sets];
                                    sets[setIndex] = { ...sets[setIndex], rest_sec: parseNumberOrNullWithConstraints(event.target.value, { min: 0, integer: true }) };
                                    return { ...prev, payload: { ...prev.payload, sets } };
                                  })
                                }
                                disabled={!editable}
                                placeholder="Rest sec"
                                className="h-10 rounded-xl border-slate-200 bg-white"
                              />
                              <Input
                                type="number"
                                value={setItem.rpe ?? ""}
                                onChange={(event) =>
                                  patchBlock(index, (prev) => {
                                    if (prev.type !== "set_block") return prev;
                                    const sets = [...prev.payload.sets];
                                    sets[setIndex] = { ...sets[setIndex], rpe: parseNumberOrNullWithConstraints(event.target.value, { min: 0, max: 10 }) };
                                    return { ...prev, payload: { ...prev.payload, sets } };
                                  })
                                }
                                disabled={!editable}
                                placeholder="RPE"
                                className="h-10 rounded-xl border-slate-200 bg-white"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() =>
                          patchBlock(index, (prev) =>
                            prev.type === "set_block"
                              ? {
                                  ...prev,
                                  payload: {
                                    ...prev.payload,
                                    sets: [...prev.payload.sets, { reps: null, load: null, rest_sec: null, rpe: null, done: false }],
                                  },
                                }
                              : prev
                          )
                        }
                        disabled={!editable}
                      >
                        <RiAddLine className="mr-1 h-4 w-4" /> Add set
                      </Button>
                      <Textarea
                        value={block.payload.notes ?? ""}
                        onChange={(event) =>
                          patchBlock(index, (prev) =>
                            prev.type === "set_block"
                              ? { ...prev, payload: { ...prev.payload, notes: event.target.value || null } }
                              : prev
                          )
                        }
                        disabled={!editable}
                        placeholder="Session notes"
                        rows={4}
                        className="rounded-[24px] border-slate-200 bg-slate-50"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
