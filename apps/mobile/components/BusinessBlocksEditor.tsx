import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { BusinessBlock, InboxSearchEntry } from "@momentarise/shared";
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

export interface BusinessBlocksEditorProps {
  value: BusinessBlock[];
  onChange: (next: BusinessBlock[]) => void;
  editable?: boolean;
  activeBlockId?: string | null;
  onActiveBlockChange?: (blockId: string | null) => void;
}

export function BusinessBlocksEditor({
  value,
  onChange,
  editable = true,
  activeBlockId,
  onActiveBlockChange,
}: BusinessBlocksEditorProps) {
  const [internalActiveBlockId, setInternalActiveBlockId] = useState<string | null>(null);
  const [inboxQueries, setInboxQueries] = useState<Record<string, string>>({});
  const [activeInboxBlockId, setActiveInboxBlockId] = useState<string | null>(null);

  const blocks = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const resolvedActiveBlockId = activeBlockId ?? internalActiveBlockId;
  const activeInboxQuery = activeInboxBlockId ? inboxQueries[activeInboxBlockId] ?? "" : "";
  const inboxSearch = useInboxSearch(activeInboxQuery, 8);

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
    } else {
      setInternalActiveBlockId(blockId);
    }
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

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-28">
      {blocks.length === 0 ? (
        <View className="rounded-[28px] border border-dashed border-border bg-card px-5 py-10">
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            Start from a starter kit or add a first block from the bottom actions.
          </Text>
        </View>
      ) : null}

      {blocks.map((block, index) => {
        const meta = BLOCK_DISPLAY_META[block.type];
        const isActive = block.id === resolvedActiveBlockId;

        return (
          <View
            key={block.id}
            className={`rounded-[28px] border bg-card p-4 ${isActive ? "border-primary" : "border-border"}`}
          >
            <Pressable onPress={() => setActiveBlock(block.id)}>
              <View className="gap-3">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-[2px] text-primary">{meta.eyebrow}</Text>
                    <View className="mt-1 flex-row items-center gap-2">
                      <Text className="flex-1 text-lg font-bold text-foreground">
                        {(block.label ?? "").trim() || meta.title}
                      </Text>
                      <View className="rounded-full bg-muted px-2 py-1">
                        <Text className="text-[10px] font-bold text-muted-foreground">#{index + 1}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <Text className="text-sm leading-5 text-muted-foreground">{getBusinessBlockPreview(block)}</Text>
              </View>
            </Pressable>

            <View className="mt-4 flex-row items-center justify-between border-t border-border pt-4">
              <View className="rounded-full bg-primary/10 px-3 py-1">
                <Text className="text-[10px] font-bold uppercase tracking-[2px] text-primary">{meta.title}</Text>
              </View>
              <View className="flex-row gap-3">
                <Pressable onPress={() => moveBlock(index, -1)} disabled={!editable || index === 0}>
                  <Text className="text-xs text-muted-foreground">Up</Text>
                </Pressable>
                <Pressable onPress={() => moveBlock(index, 1)} disabled={!editable || index === blocks.length - 1}>
                  <Text className="text-xs text-muted-foreground">Down</Text>
                </Pressable>
                <Pressable onPress={() => duplicateBlock(index)} disabled={!editable}>
                  <Text className="text-xs text-muted-foreground">Dup</Text>
                </Pressable>
                <Pressable onPress={() => deleteBlock(index)} disabled={!editable}>
                  <Text className="text-xs text-destructive">Delete</Text>
                </Pressable>
              </View>
            </View>

            {isActive ? (
              <View className="mt-4 gap-4">
                <View>
                  <Text className="mb-2 text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Label</Text>
                  <Input
                    value={block.label ?? ""}
                    onChangeText={(text) => patchBlock(index, (prev) => ({ ...prev, label: text || null }))}
                    editable={editable}
                    placeholder="Optional label"
                  />
                </View>

                {block.type === "text_block" ? (
                  <Textarea
                    value={block.payload.text}
                    onChangeText={(text) =>
                      patchBlock(index, (prev) =>
                        prev.type === "text_block" ? { ...prev, payload: { ...prev.payload, text } } : prev
                      )
                    }
                    placeholder="Write here"
                    editable={editable}
                  />
                ) : null}

                {block.type === "checklist_block" ? (
                  <View className="gap-3">
                    <View className="flex-row items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
                      <View>
                        <Text className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Progress</Text>
                        <Text className="mt-1 text-lg font-bold text-foreground">
                          {block.payload.items.filter((item) => item.done).length}/{block.payload.items.length}
                        </Text>
                      </View>
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
                        className="rounded-full border border-border px-3 py-2"
                      >
                        <Text className="text-xs font-semibold text-foreground">Add item</Text>
                      </Pressable>
                    </View>
                    {block.payload.items.map((item, itemIndex) => (
                      <View key={item.id} className="flex-row items-center gap-3 rounded-2xl border border-border bg-muted/30 px-3 py-3">
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
                          onChangeText={(text) =>
                            patchBlock(index, (prev) => {
                              if (prev.type !== "checklist_block") return prev;
                              const items = [...prev.payload.items];
                              items[itemIndex] = { ...items[itemIndex], text };
                              return { ...prev, payload: { ...prev.payload, items } };
                            })
                          }
                          editable={editable}
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
                          <Text className="text-destructive">×</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}

                {block.type === "table_block" ? (
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
                      placeholder="One row per line, cells separated with |"
                    />
                  </View>
                ) : null}

                {block.type === "fields_block" ? (
                  <View className="gap-3">
                    {toFieldPairs(block.payload.fields).map((pair, pairIndex) => (
                      <View key={`${block.id}-field-${pairIndex}`} className="gap-2 rounded-2xl border border-border bg-muted/30 p-3">
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
                        />
                      </View>
                    ))}
                    <Pressable
                      onPress={() =>
                        patchBlock(index, (prev) => {
                          if (prev.type !== "fields_block") return prev;
                          const pairs = [...toFieldPairs(prev.payload.fields), { key: "", value: "" }];
                          return { ...prev, payload: { ...prev.payload, fields: fromFieldPairs(pairs) } };
                        })
                      }
                      className="rounded-full border border-border px-3 py-2 self-start"
                    >
                      <Text className="text-xs font-semibold text-foreground">Add field</Text>
                    </Pressable>
                  </View>
                ) : null}

                {block.type === "timer_block" ? (
                  <View className="gap-3">
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
                      placeholder="Duration sec"
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
                      placeholder="Elapsed sec"
                    />
                    <Pressable
                      onPress={() =>
                        patchBlock(index, (prev) =>
                          prev.type === "timer_block"
                            ? { ...prev, payload: { ...prev.payload, running: !prev.payload.running } }
                            : prev
                        )
                      }
                      className={`rounded-2xl border px-4 py-3 ${block.payload.running ? "border-primary bg-primary/10" : "border-border bg-muted/20"}`}
                    >
                      <Text className="text-sm font-semibold text-foreground">{block.payload.running ? "Running" : "Stopped"}</Text>
                    </Pressable>
                  </View>
                ) : null}

                {block.type === "scale_block" ? (
                  <View className="gap-3">
                    <View className="rounded-2xl bg-muted/30 px-4 py-3">
                      <Text className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Value</Text>
                      <Text className="mt-1 text-xl font-bold text-foreground">{block.payload.value}/{block.payload.max}</Text>
                    </View>
                    <View className="flex-row gap-1">
                      {Array.from({ length: block.payload.max - block.payload.min + 1 }, (_, offset) => block.payload.min + offset).map((step) => (
                        <Pressable
                          key={`${block.id}-scale-${step}`}
                          onPress={() =>
                            patchBlock(index, (prev) =>
                              prev.type === "scale_block"
                                ? { ...prev, payload: { ...prev.payload, value: step } }
                                : prev
                            )
                          }
                          className={`h-9 flex-1 rounded-full items-center justify-center ${step <= block.payload.value ? "bg-primary" : "bg-muted"}`}
                        >
                          <Text className={`text-xs font-bold ${step <= block.payload.value ? "text-primary-foreground" : "text-muted-foreground"}`}>{step}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Input
                      value={String(block.payload.anchors.low ?? "")}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "scale_block"
                            ? { ...prev, payload: { ...prev.payload, anchors: { ...prev.payload.anchors, low: text } } }
                            : prev
                        )
                      }
                      editable={editable}
                      placeholder="Low anchor"
                    />
                    <Input
                      value={String(block.payload.anchors.high ?? "")}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "scale_block"
                            ? { ...prev, payload: { ...prev.payload, anchors: { ...prev.payload.anchors, high: text } } }
                            : prev
                        )
                      }
                      editable={editable}
                      placeholder="High anchor"
                    />
                  </View>
                ) : null}

                {block.type === "key_value_block" ? (
                  <View className="gap-3">
                    {block.payload.pairs.map((pair, pairIndex) => (
                      <View key={`${block.id}-pair-${pairIndex}`} className="gap-2 rounded-2xl border border-border bg-muted/30 p-3">
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
                        />
                      </View>
                    ))}
                    <Pressable
                      onPress={() =>
                        patchBlock(index, (prev) =>
                          prev.type === "key_value_block"
                            ? { ...prev, payload: { ...prev.payload, pairs: [...prev.payload.pairs, { key: "", value: "" }] } }
                            : prev
                        )
                      }
                      className="rounded-full border border-border px-3 py-2 self-start"
                    >
                      <Text className="text-xs font-semibold text-foreground">Add pair</Text>
                    </Pressable>
                  </View>
                ) : null}

                {block.type === "link_block" ? (
                  <View className="gap-3">
                    {block.payload.links.map((link, linkIndex) => (
                      <View key={`${block.id}-link-${linkIndex}`} className="gap-2 rounded-2xl border border-border bg-muted/30 p-3">
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
                        />
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
                          <Text className="text-xs font-semibold text-destructive">Delete link</Text>
                        </Pressable>
                      </View>
                    ))}
                    <Pressable
                      onPress={() =>
                        patchBlock(index, (prev) =>
                          prev.type === "link_block"
                            ? { ...prev, payload: { ...prev.payload, links: [...prev.payload.links, { title: null, url: "https://" }] } }
                            : prev
                        )
                      }
                      className="rounded-full border border-border px-3 py-2 self-start"
                    >
                      <Text className="text-xs font-semibold text-foreground">Add link</Text>
                    </Pressable>
                  </View>
                ) : null}

                {block.type === "attachment_block" ? (
                  <View className="gap-3">
                    {block.payload.attachments.map((attachment, attachmentIndex) => (
                      <View key={`${block.id}-attachment-${attachmentIndex}`} className="gap-2 rounded-2xl border border-border bg-muted/30 p-3">
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
                          placeholder="File name"
                        />
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
                          placeholder="File URL"
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
                          placeholder="MIME type"
                        />
                        <Input
                          value={attachment.size_bytes == null ? "" : String(attachment.size_bytes)}
                          onChangeText={(text) =>
                            patchBlock(index, (prev) => {
                              if (prev.type !== "attachment_block") return prev;
                              const attachments = [...prev.payload.attachments];
                              attachments[attachmentIndex] = { ...attachments[attachmentIndex], size_bytes: parseNumberOrNullWithConstraints(text, { min: 0, integer: true }) };
                              return { ...prev, payload: { ...prev.payload, attachments } };
                            })
                          }
                          editable={editable}
                          keyboardType="numeric"
                          placeholder="Bytes"
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
                          <Text className="text-xs font-semibold text-destructive">Delete attachment</Text>
                        </Pressable>
                      </View>
                    ))}
                    <Pressable
                      onPress={() =>
                        patchBlock(index, (prev) =>
                          prev.type === "attachment_block"
                            ? { ...prev, payload: { ...prev.payload, attachments: [...prev.payload.attachments, { name: "", url: null, mime: null, size_bytes: null }] } }
                            : prev
                        )
                      }
                      className="rounded-full border border-border px-3 py-2 self-start"
                    >
                      <Text className="text-xs font-semibold text-foreground">Add attachment</Text>
                    </Pressable>
                  </View>
                ) : null}

                {block.type === "inbox_block" ? (
                  <View className="gap-3">
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
                      <View className="rounded-2xl border border-border bg-card overflow-hidden">
                        {(inboxSearch.data?.captures ?? []).map((entry) => (
                          <Pressable key={entry.id} onPress={() => addInboxRef(index, entry)} className="border-b border-border px-4 py-3 last:border-b-0">
                            <Text className="text-sm font-semibold text-foreground">{entry.title}</Text>
                            <Text className="mt-1 text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">{entry.capture_type ?? "capture"}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    <View className="gap-2">
                      {block.payload.capture_refs.map((ref) => (
                        <View key={ref.capture_id} className="flex-row items-center justify-between rounded-full border border-primary/20 bg-primary/10 px-3 py-2">
                          <Text className="flex-1 text-xs font-semibold text-foreground" numberOfLines={1}>
                            {ref.title || ref.capture_id}
                          </Text>
                          <Pressable
                            onPress={() =>
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
                          >
                            <Text className="text-destructive">×</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {block.type === "task_block" ? (
                  <View className="gap-3">
                    <Input
                      value={block.payload.title}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "task_block" ? { ...prev, payload: { ...prev.payload, title: text } } : prev
                        )
                      }
                      editable={editable}
                      placeholder="Task title"
                    />
                    <View className="flex-row gap-2">
                      {[
                        { value: "todo", label: "To do" },
                        { value: "in_progress", label: "Doing" },
                        { value: "done", label: "Done" },
                      ].map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() =>
                            patchBlock(index, (prev) =>
                              prev.type === "task_block" ? { ...prev, payload: { ...prev.payload, status: option.value } } : prev
                            )
                          }
                          className={`flex-1 rounded-full px-3 py-2 ${block.payload.status === option.value ? "bg-primary" : "bg-muted"}`}
                        >
                          <Text className={`text-center text-xs font-bold ${block.payload.status === option.value ? "text-primary-foreground" : "text-muted-foreground"}`}>{option.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                {block.type === "status_block" ? (
                  <View className="gap-3">
                    <View className="flex-row gap-2">
                      {[
                        { value: "on_track", label: "On track" },
                        { value: "at_risk", label: "At risk" },
                        { value: "off_track", label: "Off track" },
                      ].map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() =>
                            patchBlock(index, (prev) =>
                              prev.type === "status_block" ? { ...prev, payload: { ...prev.payload, state: option.value } } : prev
                            )
                          }
                          className={`flex-1 rounded-2xl border px-3 py-3 ${block.payload.state === option.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/20"}`}
                        >
                          <Text className={`text-center text-xs font-bold ${block.payload.state === option.value ? "text-primary-foreground" : "text-foreground"}`}>{option.label}</Text>
                        </Pressable>
                      ))}
                    </View>
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
                    />
                    <Textarea
                      value={block.payload.note ?? ""}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "status_block" ? { ...prev, payload: { ...prev.payload, note: text || null } } : prev
                        )
                      }
                      editable={editable}
                      placeholder="Context note"
                    />
                  </View>
                ) : null}

                {block.type === "metric_block" ? (
                  <View className="gap-3">
                    <Input
                      value={block.payload.name}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "metric_block" ? { ...prev, payload: { ...prev.payload, name: text } } : prev
                        )
                      }
                      editable={editable}
                      placeholder="Metric name"
                    />
                    <Input
                      value={block.payload.current == null ? "" : String(block.payload.current)}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "metric_block" ? { ...prev, payload: { ...prev.payload, current: parseNumberOrNull(text) } } : prev
                        )
                      }
                      editable={editable}
                      keyboardType="numeric"
                      placeholder="Current"
                    />
                    <Input
                      value={block.payload.target == null ? "" : String(block.payload.target)}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "metric_block" ? { ...prev, payload: { ...prev.payload, target: parseNumberOrNull(text) } } : prev
                        )
                      }
                      editable={editable}
                      keyboardType="numeric"
                      placeholder="Target"
                    />
                    <Input
                      value={block.payload.unit ?? ""}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "metric_block" ? { ...prev, payload: { ...prev.payload, unit: text || null } } : prev
                        )
                      }
                      editable={editable}
                      placeholder="Unit"
                    />
                  </View>
                ) : null}

                {block.type === "goal_block" ? (
                  <View className="gap-3">
                    <Textarea
                      value={block.payload.outcome}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "goal_block" ? { ...prev, payload: { ...prev.payload, outcome: text } } : prev
                        )
                      }
                      editable={editable}
                      placeholder="Outcome"
                    />
                    <Textarea
                      value={block.payload.success_criteria.join("\n")}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "goal_block" ? { ...prev, payload: { ...prev.payload, success_criteria: parseList(text) } } : prev
                        )
                      }
                      editable={editable}
                      placeholder="One success criterion per line"
                    />
                  </View>
                ) : null}

                {block.type === "milestone_block" ? (
                  <View className="gap-3">
                    <Input
                      value={block.payload.title}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "milestone_block" ? { ...prev, payload: { ...prev.payload, title: text } } : prev
                        )
                      }
                      editable={editable}
                      placeholder="Milestone title"
                    />
                    <Pressable
                      onPress={() =>
                        patchBlock(index, (prev) =>
                          prev.type === "milestone_block" ? { ...prev, payload: { ...prev.payload, done: !prev.payload.done } } : prev
                        )
                      }
                      className={`rounded-2xl border px-4 py-3 ${block.payload.done ? "border-primary bg-primary/10" : "border-border bg-muted/20"}`}
                    >
                      <Text className="text-sm font-semibold text-foreground">{block.payload.done ? "Completed" : "Not completed"}</Text>
                    </Pressable>
                  </View>
                ) : null}

                {block.type === "decision_block" ? (
                  <View className="gap-3">
                    <Input
                      value={block.payload.decision}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "decision_block" ? { ...prev, payload: { ...prev.payload, decision: text } } : prev
                        )
                      }
                      editable={editable}
                      placeholder="Decision"
                    />
                    <Textarea
                      value={block.payload.why}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "decision_block" ? { ...prev, payload: { ...prev.payload, why: text } } : prev
                        )
                      }
                      editable={editable}
                      placeholder="Why"
                    />
                    <Textarea
                      value={block.payload.alternatives.join("\n")}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "decision_block" ? { ...prev, payload: { ...prev.payload, alternatives: parseList(text) } } : prev
                        )
                      }
                      editable={editable}
                      placeholder="Alternatives, one per line"
                    />
                  </View>
                ) : null}

                {block.type === "hypothesis_block" ? (
                  <View className="gap-3">
                    <Textarea
                      value={block.payload.statement}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "hypothesis_block" ? { ...prev, payload: { ...prev.payload, statement: text } } : prev
                        )
                      }
                      editable={editable}
                      placeholder="Statement"
                    />
                    <Textarea value={block.payload.test} onChangeText={(text) => patchBlock(index, (prev) => prev.type === "hypothesis_block" ? { ...prev, payload: { ...prev.payload, test: text } } : prev)} editable={editable} placeholder="Test" />
                    <Textarea value={block.payload.signal} onChangeText={(text) => patchBlock(index, (prev) => prev.type === "hypothesis_block" ? { ...prev, payload: { ...prev.payload, signal: text } } : prev)} editable={editable} placeholder="Signal" />
                  </View>
                ) : null}

                {block.type === "risk_block" ? (
                  <View className="gap-3">
                    <Textarea value={block.payload.risk} onChangeText={(text) => patchBlock(index, (prev) => prev.type === "risk_block" ? { ...prev, payload: { ...prev.payload, risk: text } } : prev)} editable={editable} placeholder="Risk" />
                    <Textarea value={block.payload.impact} onChangeText={(text) => patchBlock(index, (prev) => prev.type === "risk_block" ? { ...prev, payload: { ...prev.payload, impact: text } } : prev)} editable={editable} placeholder="Impact" />
                    <Textarea value={block.payload.mitigation} onChangeText={(text) => patchBlock(index, (prev) => prev.type === "risk_block" ? { ...prev, payload: { ...prev.payload, mitigation: text } } : prev)} editable={editable} placeholder="Mitigation" />
                    <Input value={block.payload.owner ?? ""} onChangeText={(text) => patchBlock(index, (prev) => prev.type === "risk_block" ? { ...prev, payload: { ...prev.payload, owner: text || null } } : prev)} editable={editable} placeholder="Owner" />
                  </View>
                ) : null}

                {block.type === "constraint_block" ? (
                  <View className="gap-3">
                    <Textarea value={block.payload.constraint} onChangeText={(text) => patchBlock(index, (prev) => prev.type === "constraint_block" ? { ...prev, payload: { ...prev.payload, constraint: text } } : prev)} editable={editable} placeholder="Constraint" />
                    <View className="flex-row gap-2">
                      {[
                        { value: "hard", label: "Hard" },
                        { value: "soft", label: "Soft" },
                      ].map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() => patchBlock(index, (prev) => prev.type === "constraint_block" ? { ...prev, payload: { ...prev.payload, strictness: option.value } } : prev)}
                          className={`flex-1 rounded-full px-3 py-2 ${block.payload.strictness === option.value ? "bg-primary" : "bg-muted"}`}
                        >
                          <Text className={`text-center text-xs font-bold ${block.payload.strictness === option.value ? "text-primary-foreground" : "text-muted-foreground"}`}>{option.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                {block.type === "question_block" ? (
                  <View className="gap-3">
                    <Textarea value={block.payload.question} onChangeText={(text) => patchBlock(index, (prev) => prev.type === "question_block" ? { ...prev, payload: { ...prev.payload, question: text } } : prev)} editable={editable} placeholder="Question" />
                    <View className="flex-row gap-2">
                      {[
                        { value: "low", label: "Low" },
                        { value: "medium", label: "Medium" },
                        { value: "high", label: "High" },
                      ].map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() => patchBlock(index, (prev) => prev.type === "question_block" ? { ...prev, payload: { ...prev.payload, priority: option.value } } : prev)}
                          className={`flex-1 rounded-full px-3 py-2 ${block.payload.priority === option.value ? "bg-primary" : "bg-muted"}`}
                        >
                          <Text className={`text-center text-xs font-bold ${block.payload.priority === option.value ? "text-primary-foreground" : "text-muted-foreground"}`}>{option.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Input value={block.payload.assignee ?? ""} onChangeText={(text) => patchBlock(index, (prev) => prev.type === "question_block" ? { ...prev, payload: { ...prev.payload, assignee: text || null } } : prev)} editable={editable} placeholder="Assignee" />
                  </View>
                ) : null}

                {block.type === "set_block" ? (
                  <View className="gap-3">
                    <Input
                      value={block.payload.exercise_name}
                      onChangeText={(text) =>
                        patchBlock(index, (prev) =>
                          prev.type === "set_block" ? { ...prev, payload: { ...prev.payload, exercise_name: text } } : prev
                        )
                      }
                      editable={editable}
                      placeholder="Exercise"
                    />
                    {block.payload.sets.map((setItem, setIndex) => (
                      <View key={`${block.id}-set-${setIndex}`} className="rounded-2xl border border-border bg-muted/30 p-3">
                        <View className="mb-3 flex-row items-center justify-between">
                          <Text className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">Set {setIndex + 1}</Text>
                          <View className="flex-row items-center gap-3">
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
                            <Pressable
                              onPress={() =>
                                patchBlock(index, (prev) =>
                                  prev.type === "set_block"
                                    ? { ...prev, payload: { ...prev.payload, sets: prev.payload.sets.filter((_, idx) => idx !== setIndex) } }
                                    : prev
                                )
                              }
                            >
                              <Text className="text-xs font-semibold text-destructive">Delete</Text>
                            </Pressable>
                          </View>
                        </View>
                        <View className="gap-2">
                          <Input value={setItem.reps == null ? "" : String(setItem.reps)} onChangeText={(text) => patchBlock(index, (prev) => {
                            if (prev.type !== "set_block") return prev;
                            const sets = [...prev.payload.sets];
                            sets[setIndex] = { ...sets[setIndex], reps: parseNumberOrNullWithConstraints(text, { min: 0, integer: true }) };
                            return { ...prev, payload: { ...prev.payload, sets } };
                          })} editable={editable} keyboardType="numeric" placeholder="Reps" />
                          <Input value={setItem.load == null ? "" : String(setItem.load)} onChangeText={(text) => patchBlock(index, (prev) => {
                            if (prev.type !== "set_block") return prev;
                            const sets = [...prev.payload.sets];
                            sets[setIndex] = { ...sets[setIndex], load: parseNumberOrNullWithConstraints(text, { min: 0 }) };
                            return { ...prev, payload: { ...prev.payload, sets } };
                          })} editable={editable} keyboardType="numeric" placeholder="Load" />
                          <Input value={setItem.rest_sec == null ? "" : String(setItem.rest_sec)} onChangeText={(text) => patchBlock(index, (prev) => {
                            if (prev.type !== "set_block") return prev;
                            const sets = [...prev.payload.sets];
                            sets[setIndex] = { ...sets[setIndex], rest_sec: parseNumberOrNullWithConstraints(text, { min: 0, integer: true }) };
                            return { ...prev, payload: { ...prev.payload, sets } };
                          })} editable={editable} keyboardType="numeric" placeholder="Rest sec" />
                          <Input value={setItem.rpe == null ? "" : String(setItem.rpe)} onChangeText={(text) => patchBlock(index, (prev) => {
                            if (prev.type !== "set_block") return prev;
                            const sets = [...prev.payload.sets];
                            sets[setIndex] = { ...sets[setIndex], rpe: parseNumberOrNullWithConstraints(text, { min: 0, max: 10 }) };
                            return { ...prev, payload: { ...prev.payload, sets } };
                          })} editable={editable} keyboardType="numeric" placeholder="RPE" />
                        </View>
                      </View>
                    ))}
                    <Pressable
                      onPress={() =>
                        patchBlock(index, (prev) =>
                          prev.type === "set_block"
                            ? { ...prev, payload: { ...prev.payload, sets: [...prev.payload.sets, { reps: null, load: null, rest_sec: null, rpe: null, done: false }] } }
                            : prev
                        )
                      }
                      className="rounded-full border border-border px-3 py-2 self-start"
                    >
                      <Text className="text-xs font-semibold text-foreground">Add set</Text>
                    </Pressable>
                    <Textarea value={block.payload.notes ?? ""} onChangeText={(text) => patchBlock(index, (prev) => prev.type === "set_block" ? { ...prev, payload: { ...prev.payload, notes: text || null } } : prev)} editable={editable} placeholder="Notes" />
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
