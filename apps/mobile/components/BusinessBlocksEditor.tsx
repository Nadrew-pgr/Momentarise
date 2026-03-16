import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type {
  BusinessBlock,
  ContentRenderMode,
  InboxSearchEntry,
} from "@momentarise/shared";
import { BLOCK_DISPLAY_META, getBusinessBlockPreview } from "@momentarise/shared";

import { useInboxSearch } from "@/hooks/use-inbox";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  if (typeof options.min === "number" && next < options.min) next = options.min;
  if (typeof options.max === "number" && next > options.max) next = options.max;
  return next;
}

function parseList(value: string): string[] {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
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

function normalizeScaleBounds(minValue: number, maxValue: number): { min: number; max: number } {
  const min = Number.isFinite(minValue) ? minValue : 1;
  const maxInput = Number.isFinite(maxValue) ? maxValue : 10;
  return { min, max: maxInput >= min ? maxInput : min };
}

function clampScaleValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getNextScaleValue(current: number, steps: number[], direction: -1 | 1): number {
  const currentIndex = steps.findIndex((step) => step === current);
  if (currentIndex < 0) {
    return direction > 0 ? steps[steps.length - 1] ?? current : steps[0] ?? current;
  }
  const nextIndex = Math.max(0, Math.min(steps.length - 1, currentIndex + direction));
  return steps[nextIndex] ?? current;
}

export interface BusinessBlocksEditorProps {
  value: BusinessBlock[];
  onChange: (next: BusinessBlock[]) => void;
  editable?: boolean;
  activeBlockId?: string | null;
  onActiveBlockChange?: (blockId: string | null) => void;
  renderMode?: ContentRenderMode;
  mode?: ContentRenderMode;
}

export function BusinessBlocksEditor({
  value,
  onChange,
  editable = true,
  activeBlockId,
  onActiveBlockChange,
  renderMode,
  mode,
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

  const resolvedRenderMode: ContentRenderMode = renderMode ?? mode ?? "builder";
  const isRunMode = resolvedRenderMode === "run";

  useEffect(() => {
    if (blocks.length === 0) {
      if (activeBlockId !== undefined) {
        onActiveBlockChange?.(null);
      } else {
        setInternalActiveBlockId(null);
      }
      return;
    }

    const exists = blocks.some((block) => block.id === resolvedActiveBlockId);
    if (!exists) {
      const nextId = blocks[0]?.id ?? null;
      if (activeBlockId !== undefined) {
        onActiveBlockChange?.(nextId);
      } else {
        setInternalActiveBlockId(nextId);
      }
    }
  }, [activeBlockId, blocks, onActiveBlockChange, resolvedActiveBlockId]);

  const setActiveBlock = (blockId: string | null) => {
    if (activeBlockId !== undefined) {
      onActiveBlockChange?.(blockId);
      return;
    }
    setInternalActiveBlockId(blockId);
  };

  const patchBlock = (index: number, updater: (block: BusinessBlock) => BusinessBlock) => {
    const next = blocks.map((block, idx) => (idx === index ? updater(block) : block));
    onChange(next);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    if (!editable) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    const next = [...blocks];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(nextIndex, 0, item);
    onChange(next);
  };

  const duplicateBlock = (index: number) => {
    if (!editable) return;
    const target = blocks[index];
    if (!target) return;
    const next = [...blocks];
    const duplicated = cloneBlock(target);
    next.splice(index + 1, 0, duplicated);
    onChange(next);
    setActiveBlock(duplicated.id);
  };

  const deleteBlock = (index: number) => {
    if (!editable) return;
    const target = blocks[index];
    const next = blocks.filter((_, idx) => idx !== index);
    onChange(next);
    if (target?.id === resolvedActiveBlockId) {
      setActiveBlock(next[index]?.id ?? next[index - 1]?.id ?? null);
    }
  };

  const toggleAdvanced = (blockId: string) => {
    setAdvancedBlockIds((prev) => ({ ...prev, [blockId]: !prev[blockId] }));
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

  const renderBuilderActions = (index: number, total: number) => (
    <View className="mt-3 flex-row items-center justify-between border-t border-border/50 pt-3">
      <View className="rounded-full bg-primary/10 px-2.5 py-0.5">
        <Text className="text-[9px] font-black uppercase tracking-[1.5px] text-primary">
          {BLOCK_DISPLAY_META[blocks[index]?.type ?? "text_block"].title}
        </Text>
      </View>
      <View className="flex-row gap-3">
        <Pressable onPress={() => moveBlock(index, -1)} disabled={!editable || index === 0}>
          <Text className="text-xs font-semibold text-muted-foreground">Up</Text>
        </Pressable>
        <Pressable onPress={() => moveBlock(index, 1)} disabled={!editable || index === total - 1}>
          <Text className="text-xs font-semibold text-muted-foreground">Down</Text>
        </Pressable>
        <Pressable onPress={() => duplicateBlock(index)} disabled={!editable}>
          <Text className="text-xs font-semibold text-muted-foreground">Dup</Text>
        </Pressable>
        <Pressable onPress={() => deleteBlock(index)} disabled={!editable}>
          <Text className="text-xs font-semibold text-destructive">Delete</Text>
        </Pressable>
      </View>
    </View>
  );

  const getBlockStat = (block: BusinessBlock): string | null => {
    if (block.type === "checklist_block") {
      const done = block.payload.items.filter((i) => i.done).length;
      return `${done}/${block.payload.items.length}`;
    }
    if (block.type === "scale_block") return `${block.payload.value}/${block.payload.max}`;
    if (block.type === "table_block") return `${block.payload.rows.length} rows`;
    if (block.type === "key_value_block") return `${block.payload.pairs.length}`;
    if (block.type === "link_block") return `${block.payload.links.length}`;
    if (block.type === "attachment_block") return `${block.payload.attachments.length}`;
    if (block.type === "set_block") return `${block.payload.sets.length} sets`;
    if (block.type === "metric_block") {
      const c = block.payload.current;
      return c != null ? `${c}${block.payload.unit ? ` ${block.payload.unit}` : ""}` : null;
    }
    if (block.type === "task_block") return block.payload.status.replace("_", " ");
    if (block.type === "status_block") return block.payload.state.replace(/_/g, " ");
    if (block.type === "milestone_block") return block.payload.done ? "Done" : "Pending";
    if (block.type === "timer_block") return block.payload.running ? "Running" : "Stopped";
    return null;
  };

  return (
    <ScrollView className="flex-1" contentContainerClassName={isRunMode ? "gap-0 pb-28" : "gap-2.5 pb-28"} keyboardShouldPersistTaps="handled">
      {blocks.length === 0 ? (
        <View className="px-4 py-9">
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            {isRunMode ? "No content in this moment." : "Start from a starter kit or add your first block."}
          </Text>
        </View>
      ) : null}

      {blocks.map((block, index) => {
        const meta = BLOCK_DISPLAY_META[block.type];
        const isActive = block.id === resolvedActiveBlockId;
        const isAdvanced = advancedBlockIds[block.id] === true;
        const stat = getBlockStat(block);

        return (
          <View
            key={block.id}
            className={
              isRunMode
                ? `border-b border-border/30 px-1 pb-3 pt-3 ${isActive ? "bg-accent/5" : ""}`
                : `rounded-xl border bg-card p-3 ${isActive ? "border-primary/40 bg-accent/5" : "border-border"}`
            }
          >
            <Pressable onPress={() => setActiveBlock(block.id)}>
              <View className="flex-row items-center justify-between">
                <Text className="text-[9px] font-black uppercase tracking-[2px] text-muted-foreground">
                  {meta.eyebrow} · {(block.label ?? "").trim() || meta.title}
                </Text>
                {stat ? (
                  <Text className="text-[11px] font-bold text-primary">{stat}</Text>
                ) : null}
              </View>
              {!isActive ? (
                <Text className="mt-1 text-sm leading-5 text-muted-foreground" numberOfLines={1}>
                  {getBusinessBlockPreview(block)}
                </Text>
              ) : null}
            </Pressable>

            {!isRunMode && isActive ? renderBuilderActions(index, blocks.length) : null}

            {isActive && !isRunMode ? (
              <View className="mt-2 flex-row items-center justify-end">
                <Pressable onPress={() => toggleAdvanced(block.id)} className="rounded-full bg-muted/40 px-2.5 py-1">
                  <Text className="text-[10px] font-bold text-primary">
                    {isAdvanced ? "Hide advanced" : "Advanced"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {isActive && !isRunMode && isAdvanced ? (
              <View className="mt-2 gap-2 rounded-xl bg-muted/20 p-2.5">
                <Text className="text-[9px] font-black uppercase tracking-[1.5px] text-muted-foreground">Label</Text>
                <Input
                  value={block.label ?? ""}
                  onChangeText={(text) => patchBlock(index, (prev) => ({ ...prev, label: text || null }))}
                  editable={editable}
                  className="h-9 rounded-lg bg-background"
                  placeholder="Optional label"
                />
              </View>
            ) : null}

            {isActive ? (
              <View className="mt-2 gap-2">
                {block.type === "text_block" ? (
                  isRunMode ? (
                    <Text className="text-sm leading-relaxed text-foreground">
                      {block.payload.text.trim() || "Empty"}
                    </Text>
                  ) : (
                    <Textarea
                      value={block.payload.text}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "text_block"
                            ? { ...prev, payload: { ...prev.payload, text } }
                            : prev
                        )
                      }
                      editable={editable}
                      numberOfLines={4}
                      className="min-h-24 rounded-xl bg-muted/20 px-3 py-2.5 text-sm leading-relaxed"
                      placeholder="Write here"
                    />
                  )
                ) : null}

                {block.type === "checklist_block" ? (
                  <View>
                    {block.payload.items.map((item, itemIndex) => (
                      <View
                        key={item.id}
                        className={`flex-row items-center gap-2.5 border-b border-border/20 py-2 ${itemIndex === 0 ? "" : ""}`}
                      >
                        <Checkbox
                          checked={item.done}
                          onCheckedChange={(checked: boolean | "indeterminate") =>
                            patchBlock(index, (prev) => {
                              if (prev.type !== "checklist_block") return prev;
                              const items = [...prev.payload.items];
                              items[itemIndex] = { ...items[itemIndex], done: checked === true };
                              return { ...prev, payload: { ...prev.payload, items } };
                            })
                          }
                        />
                        {isRunMode ? (
                          <Text className={`flex-1 text-sm ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            {item.text || "Untitled"}
                          </Text>
                        ) : (
                          <>
                            <Input
                              value={item.text}
                              onChangeText={(text) =>
                                patchBlock(index, (prev) => {
                                  if (prev.type !== "checklist_block") return prev;
                                  const items = [...prev.payload.items];
                                  items[itemIndex] = { ...items[itemIndex], text };
                                  return { ...prev, payload: { ...prev.payload, items } };
                                })
                              }
                              editable={editable}
                              className="h-8 flex-1 border-0 bg-transparent px-0 text-sm"
                              placeholder="Item"
                            />
                            <Pressable
                              onPress={() =>
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
                            >
                              <Text className="text-xs text-destructive">×</Text>
                            </Pressable>
                          </>
                        )}
                      </View>
                    ))}
                    {!isRunMode ? (
                      <Pressable
                        onPress={() =>
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
                        className="mt-1.5 self-start"
                      >
                        <Text className="text-xs font-semibold text-primary">+ Add item</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {block.type === "table_block" ? (
                  isRunMode ? (
                    <View className="gap-2 rounded-2xl border border-border/60 bg-muted/10 p-3">
                      <Text className="text-xs font-bold text-muted-foreground">
                        {block.payload.columns.length} cols · {block.payload.rows.length} rows
                      </Text>
                      {block.payload.rows.slice(0, 5).map((row, rowIndex) => (
                        <Text key={`${block.id}-row-${rowIndex}`} className="text-xs text-foreground" numberOfLines={1}>
                          {row.join(" | ")}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <View className="gap-3">
                      <Input
                        value={block.payload.columns.join(", ")}
                        onChangeText={(text) =>
                          patchBlock(index, (prev) =>
                            prev.type === "table_block"
                              ? {
                                ...prev,
                                payload: {
                                  ...prev.payload,
                                  columns: text.split(",").map((entry) => entry.trim()).filter(Boolean),
                                },
                              }
                              : prev
                          )
                        }
                        editable={editable}
                        placeholder="Columns separated by commas"
                      />
                      <Textarea
                        value={block.payload.rows.map((row) => row.join(" | ")).join("\n")}
                        onChangeText={(text) =>
                          patchBlock(index, (prev) =>
                            prev.type === "table_block"
                              ? {
                                ...prev,
                                payload: {
                                  ...prev.payload,
                                  rows: text
                                    .split("\n")
                                    .map((line) => line.trim())
                                    .filter(Boolean)
                                    .map((line) => line.split("|").map((cell) => cell.trim())),
                                },
                              }
                              : prev
                          )
                        }
                        editable={editable}
                        numberOfLines={5}
                        placeholder="One row per line, cells separated with |"
                      />
                    </View>
                  )
                ) : null}

                {block.type === "fields_block" ? (
                  <View>
                    {toFieldPairs(block.payload.fields).map((pair, pairIndex) => (
                      <View key={`${block.id}-field-${pairIndex}`} className="flex-row items-center gap-2 border-b border-border/20 py-2">
                        {isRunMode ? (
                          <>
                            <Text className="text-xs font-semibold text-muted-foreground">{pair.key}</Text>
                            <Text className="flex-1 text-right text-sm text-foreground">{pair.value}</Text>
                          </>
                        ) : (
                          <>
                            <Input
                              value={pair.key}
                              onChangeText={(text) =>
                                patchBlock(index, (prev) => {
                                  if (prev.type !== "fields_block") return prev;
                                  const pairs = toFieldPairs(prev.payload.fields);
                                  pairs[pairIndex] = { ...pairs[pairIndex], key: text };
                                  return { ...prev, payload: { ...prev.payload, fields: fromFieldPairs(pairs) } };
                                })
                              }
                              editable={editable}
                              placeholder="Field"
                              className="h-8 w-[35%] border-0 bg-transparent px-0 text-xs font-semibold"
                            />
                            <Input
                              value={pair.value}
                              onChangeText={(text) =>
                                patchBlock(index, (prev) => {
                                  if (prev.type !== "fields_block") return prev;
                                  const pairs = toFieldPairs(prev.payload.fields);
                                  pairs[pairIndex] = { ...pairs[pairIndex], value: text };
                                  return { ...prev, payload: { ...prev.payload, fields: fromFieldPairs(pairs) } };
                                })
                              }
                              editable={editable}
                              placeholder="Value"
                              className="h-8 flex-1 border-0 bg-transparent px-0 text-sm"
                            />
                          </>
                        )}
                      </View>
                    ))}
                    {!isRunMode ? (
                      <Pressable
                        onPress={() =>
                          patchBlock(index, (prev) => {
                            if (prev.type !== "fields_block") return prev;
                            const pairs = [...toFieldPairs(prev.payload.fields), { key: "", value: "" }];
                            return { ...prev, payload: { ...prev.payload, fields: fromFieldPairs(pairs) } };
                          })
                        }
                        className="mt-1.5 self-start"
                      >
                        <Text className="text-xs font-semibold text-primary">+ Add field</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {block.type === "timer_block" ? (
                  <View className="gap-2">
                    {isRunMode ? (
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-foreground">
                          {block.payload.elapsed_sec}s{block.payload.duration_sec != null ? ` / ${block.payload.duration_sec}s` : ""}
                        </Text>
                        <Pressable
                          onPress={() =>
                            patchBlock(index, (prev) =>
                              prev.type === "timer_block"
                                ? { ...prev, payload: { ...prev.payload, running: !prev.payload.running } }
                                : prev
                            )
                          }
                          className={`rounded-full px-3 py-1 ${block.payload.running ? "bg-primary" : "bg-muted"}`}
                        >
                          <Text className={`text-[11px] font-bold ${block.payload.running ? "text-primary-foreground" : "text-muted-foreground"}`}>
                            {block.payload.running ? "Pause" : "Start"}
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <View className="flex-row gap-2">
                          <Input
                            value={block.payload.duration_sec == null ? "" : String(block.payload.duration_sec)}
                            onChangeText={(text) =>
                              patchBlock(index, (prev) =>
                                prev.type === "timer_block"
                                  ? { ...prev, payload: { ...prev.payload, duration_sec: parseNumberOrNullWithConstraints(text, { min: 0, integer: true }) } }
                                  : prev
                              )
                            }
                            editable={editable}
                            keyboardType="numeric"
                            placeholder="Duration (s)"
                            className="h-8 flex-1"
                          />
                          <Input
                            value={String(block.payload.elapsed_sec)}
                            onChangeText={(text) =>
                              patchBlock(index, (prev) =>
                                prev.type === "timer_block"
                                  ? { ...prev, payload: { ...prev.payload, elapsed_sec: parseNumberOrNullWithConstraints(text, { min: 0, integer: true }) ?? 0 } }
                                  : prev
                              )
                            }
                            editable={editable}
                            keyboardType="numeric"
                            placeholder="Elapsed (s)"
                            className="h-8 flex-1"
                          />
                        </View>
                        <Pressable
                          onPress={() =>
                            patchBlock(index, (prev) =>
                              prev.type === "timer_block"
                                ? { ...prev, payload: { ...prev.payload, running: !prev.payload.running } }
                                : prev
                            )
                          }
                          className={`self-start rounded-full px-3 py-1 ${block.payload.running ? "bg-primary" : "bg-muted"}`}
                        >
                          <Text className={`text-[11px] font-bold ${block.payload.running ? "text-primary-foreground" : "text-muted-foreground"}`}>
                            {block.payload.running ? "Running" : "Stopped"}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                ) : null}

                {block.type === "scale_block" ? (
                  <View className="gap-2">

                    {(() => {
                      const bounds = normalizeScaleBounds(block.payload.min, block.payload.max);
                      const steps = scaleSteps(bounds.min, bounds.max, block.payload.step ?? 1);
                      const useSlider = isRunMode || block.payload.display_mode !== "steps";

                      if (useSlider) {
                        return (
                          <View className="rounded-2xl border border-border bg-muted/10 px-3 py-3">
                            <View className="flex-row items-center gap-2">
                              <Pressable
                                onPress={() =>
                                  patchBlock(index, (prev) => {
                                    if (prev.type !== "scale_block") return prev;
                                    const nextValue = getNextScaleValue(prev.payload.value, steps, -1);
                                    return { ...prev, payload: { ...prev.payload, value: nextValue } };
                                  })
                                }
                                className="h-8 w-8 items-center justify-center rounded-full border border-border bg-background"
                              >
                                <Text className="text-sm font-bold text-foreground">-</Text>
                              </Pressable>

                              <View className="flex-1 flex-row gap-1">
                                {steps.map((stepValue) => {
                                  const active = stepValue <= block.payload.value;
                                  return (
                                    <Pressable
                                      key={`${block.id}-scale-step-${stepValue}`}
                                      onPress={() =>
                                        patchBlock(index, (prev) =>
                                          prev.type === "scale_block"
                                            ? { ...prev, payload: { ...prev.payload, value: stepValue } }
                                            : prev
                                        )
                                      }
                                      className={`h-2.5 flex-1 rounded-full ${active ? "bg-primary" : "bg-muted"}`}
                                    />
                                  );
                                })}
                              </View>

                              <Pressable
                                onPress={() =>
                                  patchBlock(index, (prev) => {
                                    if (prev.type !== "scale_block") return prev;
                                    const nextValue = getNextScaleValue(prev.payload.value, steps, 1);
                                    return { ...prev, payload: { ...prev.payload, value: nextValue } };
                                  })
                                }
                                className="h-8 w-8 items-center justify-center rounded-full border border-border bg-background"
                              >
                                <Text className="text-sm font-bold text-foreground">+</Text>
                              </Pressable>
                            </View>
                            <View className="mt-2 flex-row items-center justify-between">
                              <Text className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-foreground">
                                {String(block.payload.anchors.low ?? "Low")}
                              </Text>
                              <Text className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-foreground">
                                {String(block.payload.anchors.high ?? "High")}
                              </Text>
                            </View>
                          </View>
                        );
                      }

                      return (
                        <View className="flex-row flex-wrap gap-2">
                          {steps.map((stepValue) => (
                            <Pressable
                              key={`${block.id}-scale-pill-${stepValue}`}
                              onPress={() =>
                                patchBlock(index, (prev) =>
                                  prev.type === "scale_block"
                                    ? { ...prev, payload: { ...prev.payload, value: stepValue } }
                                    : prev
                                )
                              }
                              className={`rounded-full px-3 py-2 ${stepValue <= block.payload.value ? "bg-primary" : "bg-muted"}`}
                            >
                              <Text
                                className={`text-[11px] font-bold ${stepValue <= block.payload.value ? "text-primary-foreground" : "text-muted-foreground"}`}
                              >
                                {stepValue}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      );
                    })()}

                    {!isRunMode ? (
                      <View className="gap-2">
                        <View className="flex-row gap-2">
                          <Input
                            value={String(block.payload.min)}
                            onChangeText={(text) =>
                              patchBlock(index, (prev) => {
                                if (prev.type !== "scale_block") return prev;
                                const min = parseNumberOrNull(text) ?? prev.payload.min;
                                const max = prev.payload.max < min ? min : prev.payload.max;
                                const value = clampScaleValue(prev.payload.value, min, max);
                                return { ...prev, payload: { ...prev.payload, min, max, value } };
                              })
                            }
                            editable={editable}
                            keyboardType="numeric"
                            placeholder="Min"
                            className="h-9 flex-1"
                          />
                          <Input
                            value={String(block.payload.max)}
                            onChangeText={(text) =>
                              patchBlock(index, (prev) => {
                                if (prev.type !== "scale_block") return prev;
                                const maxInput = parseNumberOrNull(text) ?? prev.payload.max;
                                const max = maxInput < prev.payload.min ? prev.payload.min : maxInput;
                                const value = clampScaleValue(prev.payload.value, prev.payload.min, max);
                                return { ...prev, payload: { ...prev.payload, max, value } };
                              })
                            }
                            editable={editable}
                            keyboardType="numeric"
                            placeholder="Max"
                            className="h-9 flex-1"
                          />
                          <Input
                            value={String(block.payload.step ?? 1)}
                            onChangeText={(text) =>
                              patchBlock(index, (prev) => {
                                if (prev.type !== "scale_block") return prev;
                                const stepValue = parseNumberOrNullWithConstraints(text, { min: 0.01 }) ?? 1;
                                return { ...prev, payload: { ...prev.payload, step: stepValue } };
                              })
                            }
                            editable={editable}
                            keyboardType="numeric"
                            placeholder="Step"
                            className="h-9 flex-1"
                          />
                        </View>
                        <View className="flex-row gap-2">
                          <Input
                            value={block.payload.unit ?? ""}
                            onChangeText={(text) =>
                              patchBlock(index, (prev) =>
                                prev.type === "scale_block"
                                  ? { ...prev, payload: { ...prev.payload, unit: text || null } }
                                  : prev
                              )
                            }
                            editable={editable}
                            placeholder="Unit (optional)"
                            className="h-9 flex-1"
                          />
                          <Input
                            value={block.payload.target == null ? "" : String(block.payload.target)}
                            onChangeText={(text) =>
                              patchBlock(index, (prev) =>
                                prev.type === "scale_block"
                                  ? {
                                    ...prev,
                                    payload: {
                                      ...prev.payload,
                                      target: parseNumberOrNull(text),
                                    },
                                  }
                                  : prev
                              )
                            }
                            editable={editable}
                            keyboardType="numeric"
                            placeholder="Target"
                            className="h-9 flex-1"
                          />
                        </View>
                        <View className="flex-row gap-2">
                          {[
                            { value: "slider", label: "Slider" },
                            { value: "steps", label: "Steps" },
                          ].map((option) => (
                            <Pressable
                              key={option.value}
                              onPress={() =>
                                patchBlock(index, (prev) =>
                                  prev.type === "scale_block"
                                    ? {
                                      ...prev,
                                      payload: {
                                        ...prev.payload,
                                        display_mode: option.value as "slider" | "steps",
                                      },
                                    }
                                    : prev
                                )
                              }
                              className={`flex-1 rounded-full px-3 py-2 ${block.payload.display_mode === option.value ? "bg-primary" : "bg-muted"}`}
                            >
                              <Text
                                className={`text-center text-xs font-bold ${block.payload.display_mode === option.value ? "text-primary-foreground" : "text-muted-foreground"}`}
                              >
                                {option.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>

                        {isAdvanced ? (
                          <View className="flex-row gap-2">
                            <Input
                              value={String(block.payload.anchors.low ?? "")}
                              onChangeText={(text) =>
                                patchBlock(index, (prev) =>
                                  prev.type === "scale_block"
                                    ? {
                                      ...prev,
                                      payload: {
                                        ...prev.payload,
                                        anchors: { ...prev.payload.anchors, low: text },
                                      },
                                    }
                                    : prev
                                )
                              }
                              editable={editable}
                              placeholder="Low anchor"
                              className="h-9 flex-1"
                            />
                            <Input
                              value={String(block.payload.anchors.high ?? "")}
                              onChangeText={(text) =>
                                patchBlock(index, (prev) =>
                                  prev.type === "scale_block"
                                    ? {
                                      ...prev,
                                      payload: {
                                        ...prev.payload,
                                        anchors: { ...prev.payload.anchors, high: text },
                                      },
                                    }
                                    : prev
                                )
                              }
                              editable={editable}
                              placeholder="High anchor"
                              className="h-9 flex-1"
                            />
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {block.type === "key_value_block" ? (
                  <View>
                    {block.payload.pairs.map((pair, pairIndex) => (
                      <View key={`${block.id}-pair-${pairIndex}`} className="flex-row items-center gap-2 border-b border-border/20 py-2">
                        {isRunMode ? (
                          <>
                            <Text className="text-xs font-semibold text-muted-foreground">{pair.key}</Text>
                            <Text className="flex-1 text-right text-sm text-foreground">{pair.value}</Text>
                          </>
                        ) : (
                          <>
                            <Input
                              value={pair.key}
                              onChangeText={(text) =>
                                patchBlock(index, (prev) => {
                                  if (prev.type !== "key_value_block") return prev;
                                  const pairs = [...prev.payload.pairs];
                                  pairs[pairIndex] = { ...pairs[pairIndex], key: text };
                                  return { ...prev, payload: { ...prev.payload, pairs } };
                                })
                              }
                              editable={editable}
                              placeholder="Key"
                              className="h-8 w-[35%] border-0 bg-transparent px-0 text-xs font-semibold"
                            />
                            <Input
                              value={pair.value}
                              onChangeText={(text) =>
                                patchBlock(index, (prev) => {
                                  if (prev.type !== "key_value_block") return prev;
                                  const pairs = [...prev.payload.pairs];
                                  pairs[pairIndex] = { ...pairs[pairIndex], value: text };
                                  return { ...prev, payload: { ...prev.payload, pairs } };
                                })
                              }
                              editable={editable}
                              placeholder="Value"
                              className="h-8 flex-1 border-0 bg-transparent px-0 text-sm"
                            />
                          </>
                        )}
                      </View>
                    ))}
                    {!isRunMode ? (
                      <Pressable
                        onPress={() =>
                          patchBlock(index, (prev) =>
                            prev.type === "key_value_block"
                              ? {
                                ...prev,
                                payload: {
                                  ...prev.payload,
                                  pairs: [...prev.payload.pairs, { key: "", value: "" }],
                                },
                              }
                              : prev
                          )
                        }
                        className="mt-1.5 self-start"
                      >
                        <Text className="text-xs font-semibold text-primary">+ Add pair</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {block.type === "link_block" ? (
                  <View>
                    {block.payload.links.map((link, linkIndex) => (
                      <View
                        key={`${block.id}-link-${linkIndex}`}
                        className="border-b border-border/20 py-2"
                      >
                        {isRunMode ? (
                          <View>
                            <Text className="text-sm text-foreground" numberOfLines={1}>{link.title || link.url}</Text>
                            <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>{link.url}</Text>
                          </View>
                        ) : (
                          <View className="gap-1.5">
                            <View className="flex-row items-center gap-2">
                              <Input
                                value={link.title ?? ""}
                                onChangeText={(text) =>
                                  patchBlock(index, (prev) => {
                                    if (prev.type !== "link_block") return prev;
                                    const links = [...prev.payload.links];
                                    links[linkIndex] = { ...links[linkIndex], title: text || null };
                                    return { ...prev, payload: { ...prev.payload, links } };
                                  })
                                }
                                editable={editable}
                                placeholder="Title"
                                className="h-8 flex-1 border-0 bg-transparent px-0 text-sm"
                              />
                              <Pressable
                                onPress={() =>
                                  patchBlock(index, (prev) =>
                                    prev.type === "link_block"
                                      ? { ...prev, payload: { ...prev.payload, links: prev.payload.links.filter((_, idx) => idx !== linkIndex) } }
                                      : prev
                                  )
                                }
                              >
                                <Text className="text-xs text-destructive">×</Text>
                              </Pressable>
                            </View>
                            <Input
                              value={link.url}
                              onChangeText={(text) =>
                                patchBlock(index, (prev) => {
                                  if (prev.type !== "link_block") return prev;
                                  const links = [...prev.payload.links];
                                  links[linkIndex] = { ...links[linkIndex], url: text };
                                  return { ...prev, payload: { ...prev.payload, links } };
                                })
                              }
                              editable={editable}
                              placeholder="https://"
                              className="h-7 border-0 bg-transparent px-0 text-[11px] text-muted-foreground"
                            />
                          </View>
                        )}
                      </View>
                    ))}
                    {!isRunMode ? (
                      <Pressable
                        onPress={() =>
                          patchBlock(index, (prev) =>
                            prev.type === "link_block"
                              ? { ...prev, payload: { ...prev.payload, links: [...prev.payload.links, { title: null, url: "https://" }] } }
                              : prev
                          )
                        }
                        className="mt-1.5 self-start"
                      >
                        <Text className="text-xs font-semibold text-primary">+ Add link</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {block.type === "attachment_block" ? (
                  <View>
                    {block.payload.attachments.map((attachment, attachmentIndex) => (
                      <View
                        key={`${block.id}-attachment-${attachmentIndex}`}
                        className="border-b border-border/20 py-2"
                      >
                        {isRunMode ? (
                          <View className="flex-row items-center justify-between">
                            <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>{attachment.name}</Text>
                            {attachment.size_bytes != null ? (
                              <Text className="text-[11px] text-muted-foreground">{attachment.size_bytes}b</Text>
                            ) : null}
                          </View>
                        ) : (
                          <View className="gap-1.5">
                            <View className="flex-row items-center gap-2">
                              <Input
                                value={attachment.name}
                                onChangeText={(text) =>
                                  patchBlock(index, (prev) => {
                                    if (prev.type !== "attachment_block") return prev;
                                    const attachments = [...prev.payload.attachments];
                                    attachments[attachmentIndex] = { ...attachments[attachmentIndex], name: text };
                                    return { ...prev, payload: { ...prev.payload, attachments } };
                                  })
                                }
                                editable={editable}
                                placeholder="Name"
                                className="h-8 flex-1 border-0 bg-transparent px-0 text-sm"
                              />
                              <Pressable
                                onPress={() =>
                                  patchBlock(index, (prev) =>
                                    prev.type === "attachment_block"
                                      ? { ...prev, payload: { ...prev.payload, attachments: prev.payload.attachments.filter((_, idx) => idx !== attachmentIndex) } }
                                      : prev
                                  )
                                }
                              >
                                <Text className="text-xs text-destructive">×</Text>
                              </Pressable>
                            </View>
                            <View className="flex-row gap-2">
                              <Input
                                value={attachment.url ?? ""}
                                onChangeText={(text) =>
                                  patchBlock(index, (prev) => {
                                    if (prev.type !== "attachment_block") return prev;
                                    const attachments = [...prev.payload.attachments];
                                    attachments[attachmentIndex] = { ...attachments[attachmentIndex], url: text || null };
                                    return { ...prev, payload: { ...prev.payload, attachments } };
                                  })
                                }
                                editable={editable}
                                placeholder="URL"
                                className="h-7 flex-1 border-0 bg-transparent px-0 text-[11px]"
                              />
                              <Input
                                value={attachment.mime ?? ""}
                                onChangeText={(text) =>
                                  patchBlock(index, (prev) => {
                                    if (prev.type !== "attachment_block") return prev;
                                    const attachments = [...prev.payload.attachments];
                                    attachments[attachmentIndex] = { ...attachments[attachmentIndex], mime: text || null };
                                    return { ...prev, payload: { ...prev.payload, attachments } };
                                  })
                                }
                                editable={editable}
                                placeholder="MIME"
                                className="h-7 w-24 border-0 bg-transparent px-0 text-[11px]"
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    ))}
                    {!isRunMode ? (
                      <Pressable
                        onPress={() =>
                          patchBlock(index, (prev) =>
                            prev.type === "attachment_block"
                              ? { ...prev, payload: { ...prev.payload, attachments: [...prev.payload.attachments, { name: "", url: null, mime: null, size_bytes: null }] } }
                              : prev
                          )
                        }
                        className="mt-1.5 self-start"
                      >
                        <Text className="text-xs font-semibold text-primary">+ Add attachment</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {block.type === "inbox_block" ? (
                  <View className="gap-3">
                    {!isRunMode ? (
                      <>
                        <Input
                          value={inboxQueries[block.id] ?? ""}
                          onFocus={() => setActiveInboxBlockId(block.id)}
                          onChangeText={(text) => {
                            setInboxQueries((prev) => ({ ...prev, [block.id]: text }));
                            setActiveInboxBlockId(block.id);
                          }}
                          editable={editable}
                          placeholder="Search inbox capture"
                        />

                        {activeInboxBlockId === block.id && (inboxSearch.data?.captures ?? []).length > 0 ? (
                          <View className="overflow-hidden rounded-2xl border border-border bg-card">
                            {(inboxSearch.data?.captures ?? []).map((entry) => (
                              <Pressable
                                key={entry.id}
                                onPress={() => addInboxRef(index, entry)}
                                className="border-b border-border px-4 py-3 last:border-b-0"
                              >
                                <Text className="text-sm font-semibold text-foreground">{entry.title}</Text>
                                <Text className="mt-1 text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
                                  {entry.capture_type ?? "capture"}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}
                      </>
                    ) : null}

                    <View className="flex-row flex-wrap gap-2">
                      {block.payload.capture_refs.map((ref) => (
                        <View
                          key={ref.capture_id}
                          className="flex-row items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2"
                        >
                          <Text className="max-w-[180px] text-xs font-semibold text-foreground" numberOfLines={1}>
                            {ref.title || ref.capture_id}
                          </Text>
                          {!isRunMode ? (
                            <Pressable
                              onPress={() =>
                                patchBlock(index, (prev) =>
                                  prev.type === "inbox_block"
                                    ? {
                                      ...prev,
                                      payload: {
                                        ...prev.payload,
                                        capture_refs: prev.payload.capture_refs.filter(
                                          (entry) => entry.capture_id !== ref.capture_id
                                        ),
                                      },
                                    }
                                    : prev
                                )
                              }
                            >
                              <Text className="text-destructive">×</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {block.type === "task_block" ? (
                  <View className="gap-2">
                    {isRunMode ? (
                      <View className="flex-row items-center justify-between">
                        <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>{block.payload.title || "Untitled task"}</Text>
                        <View className="flex-row gap-1">
                          {["todo", "in_progress", "done"].map((s) => (
                            <Pressable
                              key={s}
                              onPress={() => patchBlock(index, (prev) => prev.type === "task_block" ? { ...prev, payload: { ...prev.payload, status: s } } : prev)}
                              className={`rounded-full px-2 py-0.5 ${block.payload.status === s ? "bg-primary" : "bg-muted"}`}
                            >
                              <Text className={`text-[9px] font-bold ${block.payload.status === s ? "text-primary-foreground" : "text-muted-foreground"}`}>
                                {s === "todo" ? "To do" : s === "in_progress" ? "Doing" : "Done"}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <>
                        <Input
                          value={block.payload.title}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "task_block" ? { ...prev, payload: { ...prev.payload, title: text } } : prev)}
                          editable={editable}
                          placeholder="Task title"
                          className="h-8"
                        />
                        <View className="flex-row gap-1.5">
                          {[
                            { value: "todo", label: "To do" },
                            { value: "in_progress", label: "Doing" },
                            { value: "done", label: "Done" },
                          ].map((option) => (
                            <Pressable
                              key={option.value}
                              onPress={() => patchBlock(index, (prev) => prev.type === "task_block" ? { ...prev, payload: { ...prev.payload, status: option.value } } : prev)}
                              className={`flex-1 rounded-full px-2 py-1.5 ${block.payload.status === option.value ? "bg-primary" : "bg-muted"}`}
                            >
                              <Text className={`text-center text-[10px] font-bold ${block.payload.status === option.value ? "text-primary-foreground" : "text-muted-foreground"}`}>
                                {option.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        {isAdvanced ? (
                          <Input
                            value={block.payload.due_at ?? ""}
                            onChangeText={(text) => patchBlock(index, (prev) => prev.type === "task_block" ? { ...prev, payload: { ...prev.payload, due_at: text || null } } : prev)}
                            editable={editable}
                            placeholder="Due date ISO"
                            className="h-8"
                          />
                        ) : null}
                      </>
                    )}
                  </View>
                ) : null}

                {block.type === "status_block" ? (
                  <View className="gap-2">
                    <View className="flex-row gap-1.5">
                      {[
                        { value: "on_track", label: "On track" },
                        { value: "at_risk", label: "At risk" },
                        { value: "off_track", label: "Off track" },
                      ].map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() =>
                            patchBlock(index, (prev) =>
                              prev.type === "status_block"
                                ? { ...prev, payload: { ...prev.payload, state: option.value } }
                                : prev
                            )
                          }
                          className={`flex-1 rounded-full px-2 py-1.5 ${block.payload.state === option.value ? "bg-primary" : "bg-muted"}`}
                        >
                          <Text
                            className={`text-center text-[10px] font-bold ${block.payload.state === option.value ? "text-primary-foreground" : "text-muted-foreground"}`}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {!isRunMode && isAdvanced ? (
                      <>
                        <Input
                          value={block.payload.confidence == null ? "" : String(block.payload.confidence)}
                          onChangeText={(text) =>
                            patchBlock(index, (prev) =>
                              prev.type === "status_block"
                                ? { ...prev, payload: { ...prev.payload, confidence: parseNumberOrNullWithConstraints(text, { min: 0, max: 1 }) } }
                                : prev
                            )
                          }
                          editable={editable}
                          keyboardType="numeric"
                          placeholder="Confidence (0-1)"
                          className="h-8"
                        />
                        <Textarea
                          value={block.payload.note ?? ""}
                          onChangeText={(text) =>
                            patchBlock(index, (prev) =>
                              prev.type === "status_block"
                                ? { ...prev, payload: { ...prev.payload, note: text || null } }
                                : prev
                            )
                          }
                          editable={editable}
                          numberOfLines={3}
                          placeholder="Context note"
                        />
                      </>
                    ) : null}
                  </View>
                ) : null}

                {block.type === "metric_block" ? (
                  <View className="gap-2">
                    {isRunMode ? (
                      <View className="flex-row items-center gap-3">
                        <Text className="text-xl font-bold text-foreground">
                          {block.payload.current == null ? "--" : block.payload.current}
                          {block.payload.unit ? ` ${block.payload.unit}` : ""}
                        </Text>
                        {block.payload.target != null ? (
                          <Text className="text-xs text-muted-foreground">/ {block.payload.target}</Text>
                        ) : null}
                      </View>
                    ) : (
                      <Input
                        value={block.payload.name}
                        onChangeText={(text) => patchBlock(index, (prev) => prev.type === "metric_block" ? { ...prev, payload: { ...prev.payload, name: text } } : prev)}
                        editable={editable}
                        placeholder="Metric name"
                        className="h-8"
                      />
                    )}
                    <Input
                      value={block.payload.current == null ? "" : String(block.payload.current)}
                      onChangeText={(text) => patchBlock(index, (prev) => prev.type === "metric_block" ? { ...prev, payload: { ...prev.payload, current: parseNumberOrNull(text) } } : prev)}
                      editable={editable}
                      keyboardType="numeric"
                      placeholder="Current"
                      className="h-8"
                    />
                    {!isRunMode || isAdvanced ? (
                      <View className="flex-row gap-2">
                        <Input
                          value={block.payload.target == null ? "" : String(block.payload.target)}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "metric_block" ? { ...prev, payload: { ...prev.payload, target: parseNumberOrNull(text) } } : prev)}
                          editable={editable}
                          keyboardType="numeric"
                          placeholder="Target"
                          className="h-8 flex-1"
                        />
                        <Input
                          value={block.payload.unit ?? ""}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "metric_block" ? { ...prev, payload: { ...prev.payload, unit: text || null } } : prev)}
                          editable={editable}
                          placeholder="Unit"
                          className="h-8 flex-1"
                        />
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {block.type === "goal_block" ? (
                  <View className="gap-2">
                    {isRunMode ? (
                      <Text className="text-sm leading-relaxed text-foreground">
                        {block.payload.outcome.trim() || "No outcome defined"}
                      </Text>
                    ) : (
                      <>
                        <Textarea
                          value={block.payload.outcome}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "goal_block" ? { ...prev, payload: { ...prev.payload, outcome: text } } : prev)}
                          editable={editable}
                          numberOfLines={3}
                          placeholder="Outcome"
                        />
                        <Textarea
                          value={block.payload.success_criteria.join("\n")}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "goal_block" ? { ...prev, payload: { ...prev.payload, success_criteria: parseList(text) } } : prev)}
                          editable={editable}
                          numberOfLines={3}
                          placeholder="Success criteria (one per line)"
                        />
                      </>
                    )}
                  </View>
                ) : null}

                {block.type === "milestone_block" ? (
                  <View className="gap-2">
                    {isRunMode ? (
                      <View className="flex-row items-center justify-between">
                        <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>{block.payload.title || "Milestone"}</Text>
                        <Pressable
                          onPress={() => patchBlock(index, (prev) => prev.type === "milestone_block" ? { ...prev, payload: { ...prev.payload, done: !prev.payload.done } } : prev)}
                          className={`rounded-full px-2.5 py-0.5 ${block.payload.done ? "bg-primary" : "bg-muted"}`}
                        >
                          <Text className={`text-[10px] font-bold ${block.payload.done ? "text-primary-foreground" : "text-muted-foreground"}`}>
                            {block.payload.done ? "Done" : "Pending"}
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <Input
                          value={block.payload.title}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "milestone_block" ? { ...prev, payload: { ...prev.payload, title: text } } : prev)}
                          editable={editable}
                          placeholder="Milestone title"
                          className="h-8"
                        />
                        <Pressable
                          onPress={() => patchBlock(index, (prev) => prev.type === "milestone_block" ? { ...prev, payload: { ...prev.payload, done: !prev.payload.done } } : prev)}
                          className={`self-start rounded-full px-3 py-1 ${block.payload.done ? "bg-primary" : "bg-muted"}`}
                        >
                          <Text className={`text-[11px] font-bold ${block.payload.done ? "text-primary-foreground" : "text-muted-foreground"}`}>
                            {block.payload.done ? "Completed" : "Not completed"}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                ) : null}

                {block.type === "decision_block" ? (
                  <View className="gap-2">
                    {isRunMode ? (
                      <Text className="text-sm leading-relaxed text-foreground">
                        {block.payload.decision.trim() || "No decision"}
                      </Text>
                    ) : (
                      <>
                        <Input
                          value={block.payload.decision}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "decision_block" ? { ...prev, payload: { ...prev.payload, decision: text } } : prev)}
                          editable={editable}
                          placeholder="Decision"
                          className="h-8"
                        />
                        <Textarea
                          value={block.payload.why}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "decision_block" ? { ...prev, payload: { ...prev.payload, why: text } } : prev)}
                          editable={editable}
                          numberOfLines={3}
                          placeholder="Why"
                        />
                        <Textarea
                          value={block.payload.alternatives.join("\n")}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "decision_block" ? { ...prev, payload: { ...prev.payload, alternatives: parseList(text) } } : prev)}
                          editable={editable}
                          numberOfLines={2}
                          placeholder="Alternatives (one per line)"
                        />
                      </>
                    )}
                  </View>
                ) : null}

                {block.type === "hypothesis_block" ? (
                  <View className="gap-2">
                    {isRunMode ? (
                      <Text className="text-sm leading-relaxed text-foreground">
                        {block.payload.statement.trim() || "No statement"}
                      </Text>
                    ) : (
                      <>
                        <Textarea
                          value={block.payload.statement}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "hypothesis_block" ? { ...prev, payload: { ...prev.payload, statement: text } } : prev)}
                          editable={editable}
                          numberOfLines={2}
                          placeholder="Statement"
                        />
                        <Textarea
                          value={block.payload.test}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "hypothesis_block" ? { ...prev, payload: { ...prev.payload, test: text } } : prev)}
                          editable={editable}
                          numberOfLines={2}
                          placeholder="Test"
                        />
                        <Textarea
                          value={block.payload.signal}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "hypothesis_block" ? { ...prev, payload: { ...prev.payload, signal: text } } : prev)}
                          editable={editable}
                          numberOfLines={2}
                          placeholder="Signal"
                        />
                      </>
                    )}
                  </View>
                ) : null}

                {block.type === "risk_block" ? (
                  <View className="gap-2">
                    {isRunMode ? (
                      <Text className="text-sm leading-relaxed text-foreground">
                        {block.payload.risk.trim() || "No risk defined"}
                      </Text>
                    ) : (
                      <>
                        <Textarea
                          value={block.payload.risk}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "risk_block" ? { ...prev, payload: { ...prev.payload, risk: text } } : prev)}
                          editable={editable}
                          numberOfLines={2}
                          placeholder="Risk"
                        />
                        <Textarea
                          value={block.payload.impact}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "risk_block" ? { ...prev, payload: { ...prev.payload, impact: text } } : prev)}
                          editable={editable}
                          numberOfLines={2}
                          placeholder="Impact"
                        />
                        <Textarea
                          value={block.payload.mitigation}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "risk_block" ? { ...prev, payload: { ...prev.payload, mitigation: text } } : prev)}
                          editable={editable}
                          numberOfLines={2}
                          placeholder="Mitigation"
                        />
                        <Input
                          value={block.payload.owner ?? ""}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "risk_block" ? { ...prev, payload: { ...prev.payload, owner: text || null } } : prev)}
                          editable={editable}
                          placeholder="Owner"
                          className="h-8"
                        />
                      </>
                    )}
                  </View>
                ) : null}

                {block.type === "constraint_block" ? (
                  <View className="gap-2">
                    {isRunMode ? (
                      <View className="flex-row items-center justify-between">
                        <Text className="flex-1 text-sm text-foreground" numberOfLines={2}>
                          {block.payload.constraint.trim() || "No constraint"}
                        </Text>
                        <Text className="text-[10px] font-bold text-muted-foreground uppercase">
                          {block.payload.strictness}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Textarea
                          value={block.payload.constraint}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "constraint_block" ? { ...prev, payload: { ...prev.payload, constraint: text } } : prev)}
                          editable={editable}
                          numberOfLines={2}
                          placeholder="Constraint"
                        />
                        <View className="flex-row gap-1.5">
                          {[
                            { value: "hard", label: "Hard" },
                            { value: "soft", label: "Soft" },
                          ].map((option) => (
                            <Pressable
                              key={option.value}
                              onPress={() => patchBlock(index, (prev) => prev.type === "constraint_block" ? { ...prev, payload: { ...prev.payload, strictness: option.value } } : prev)}
                              className={`flex-1 rounded-full px-2 py-1.5 ${block.payload.strictness === option.value ? "bg-primary" : "bg-muted"}`}
                            >
                              <Text className={`text-center text-[10px] font-bold ${block.payload.strictness === option.value ? "text-primary-foreground" : "text-muted-foreground"}`}>
                                {option.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </>
                    )}
                  </View>
                ) : null}

                {block.type === "question_block" ? (
                  <View className="gap-2">
                    {isRunMode ? (
                      <Text className="text-sm leading-relaxed text-foreground">
                        {block.payload.question.trim() || "No question"}
                      </Text>
                    ) : (
                      <>
                        <Textarea
                          value={block.payload.question}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "question_block" ? { ...prev, payload: { ...prev.payload, question: text } } : prev)}
                          editable={editable}
                          numberOfLines={2}
                          placeholder="Question"
                        />
                        <View className="flex-row gap-1.5">
                          {[
                            { value: "low", label: "Low" },
                            { value: "medium", label: "Med" },
                            { value: "high", label: "High" },
                          ].map((option) => (
                            <Pressable
                              key={option.value}
                              onPress={() => patchBlock(index, (prev) => prev.type === "question_block" ? { ...prev, payload: { ...prev.payload, priority: option.value } } : prev)}
                              className={`flex-1 rounded-full px-2 py-1.5 ${block.payload.priority === option.value ? "bg-primary" : "bg-muted"}`}
                            >
                              <Text className={`text-center text-[10px] font-bold ${block.payload.priority === option.value ? "text-primary-foreground" : "text-muted-foreground"}`}>
                                {option.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        <Input
                          value={block.payload.assignee ?? ""}
                          onChangeText={(text) => patchBlock(index, (prev) => prev.type === "question_block" ? { ...prev, payload: { ...prev.payload, assignee: text || null } } : prev)}
                          editable={editable}
                          placeholder="Assignee"
                          className="h-8"
                        />
                      </>
                    )}
                  </View>
                ) : null}

                {block.type === "set_block" ? (
                  <View className="gap-2">
                    {isRunMode ? (
                      <Text className="text-sm font-medium text-foreground">{block.payload.exercise_name || "Exercise"}</Text>
                    ) : (
                      <Input
                        value={block.payload.exercise_name}
                        onChangeText={(text) => patchBlock(index, (prev) => prev.type === "set_block" ? { ...prev, payload: { ...prev.payload, exercise_name: text } } : prev)}
                        editable={editable}
                        placeholder="Exercise"
                        className="h-8"
                      />
                    )}

                    <View>
                      {block.payload.sets.map((setItem, setIndex) => (
                        <View
                          key={`${block.id}-set-${setIndex}`}
                          className="border-b border-border/20 py-2"
                        >
                          <View className="mb-1.5 flex-row items-center justify-between">
                            <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Set {setIndex + 1}
                            </Text>
                            <View className="flex-row items-center gap-2">
                              <Checkbox
                                checked={setItem.done}
                                onCheckedChange={(checked: boolean | "indeterminate") =>
                                  patchBlock(index, (prev) => {
                                    if (prev.type !== "set_block") return prev;
                                    const sets = [...prev.payload.sets];
                                    sets[setIndex] = { ...sets[setIndex], done: checked === true };
                                    return { ...prev, payload: { ...prev.payload, sets } };
                                  })
                                }
                              />
                              {!isRunMode ? (
                                <Pressable
                                  onPress={() =>
                                    patchBlock(index, (prev) =>
                                      prev.type === "set_block"
                                        ? { ...prev, payload: { ...prev.payload, sets: prev.payload.sets.filter((_, idx) => idx !== setIndex) } }
                                        : prev
                                    )
                                  }
                                >
                                  <Text className="text-xs text-destructive">×</Text>
                                </Pressable>
                              ) : null}
                            </View>
                          </View>
                          <View className="flex-row flex-wrap gap-1.5">
                            <Input
                              value={setItem.reps == null ? "" : String(setItem.reps)}
                              onChangeText={(text) =>
                                patchBlock(index, (prev) => {
                                  if (prev.type !== "set_block") return prev;
                                  const sets = [...prev.payload.sets];
                                  sets[setIndex] = { ...sets[setIndex], reps: parseNumberOrNullWithConstraints(text, { min: 0, integer: true }) };
                                  return { ...prev, payload: { ...prev.payload, sets } };
                                })
                              }
                              editable={editable}
                              keyboardType="numeric"
                              placeholder="Reps"
                              className="h-7 flex-1 min-w-[60px]"
                            />
                            <Input
                              value={setItem.load == null ? "" : String(setItem.load)}
                              onChangeText={(text) =>
                                patchBlock(index, (prev) => {
                                  if (prev.type !== "set_block") return prev;
                                  const sets = [...prev.payload.sets];
                                  sets[setIndex] = { ...sets[setIndex], load: parseNumberOrNullWithConstraints(text, { min: 0 }) };
                                  return { ...prev, payload: { ...prev.payload, sets } };
                                })
                              }
                              editable={editable}
                              keyboardType="numeric"
                              placeholder="Load"
                              className="h-7 flex-1 min-w-[60px]"
                            />
                            <Input
                              value={setItem.rest_sec == null ? "" : String(setItem.rest_sec)}
                              onChangeText={(text) =>
                                patchBlock(index, (prev) => {
                                  if (prev.type !== "set_block") return prev;
                                  const sets = [...prev.payload.sets];
                                  sets[setIndex] = { ...sets[setIndex], rest_sec: parseNumberOrNullWithConstraints(text, { min: 0, integer: true }) };
                                  return { ...prev, payload: { ...prev.payload, sets } };
                                })
                              }
                              editable={editable}
                              keyboardType="numeric"
                              placeholder="Rest"
                              className="h-7 flex-1 min-w-[60px]"
                            />
                            <Input
                              value={setItem.rpe == null ? "" : String(setItem.rpe)}
                              onChangeText={(text) =>
                                patchBlock(index, (prev) => {
                                  if (prev.type !== "set_block") return prev;
                                  const sets = [...prev.payload.sets];
                                  sets[setIndex] = { ...sets[setIndex], rpe: parseNumberOrNullWithConstraints(text, { min: 0, max: 10 }) };
                                  return { ...prev, payload: { ...prev.payload, sets } };
                                })
                              }
                              editable={editable}
                              keyboardType="numeric"
                              placeholder="RPE"
                              className="h-7 flex-1 min-w-[60px]"
                            />
                          </View>
                        </View>
                      ))}
                    </View>

                    {!isRunMode ? (
                      <Pressable
                        onPress={() =>
                          patchBlock(index, (prev) =>
                            prev.type === "set_block"
                              ? { ...prev, payload: { ...prev.payload, sets: [...prev.payload.sets, { reps: null, load: null, rest_sec: null, rpe: null, done: false }] } }
                              : prev
                          )
                        }
                        className="mt-0.5 self-start"
                      >
                        <Text className="text-xs font-semibold text-primary">+ Add set</Text>
                      </Pressable>
                    ) : null}

                    {!isRunMode && isAdvanced ? (
                      <Textarea
                        value={block.payload.notes ?? ""}
                        onChangeText={(text) => patchBlock(index, (prev) => prev.type === "set_block" ? { ...prev, payload: { ...prev.payload, notes: text || null } } : prev)}
                        editable={editable}
                        numberOfLines={3}
                        placeholder="Session notes"
                      />
                    ) : null}
                  </View>
                ) : null}

              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}
