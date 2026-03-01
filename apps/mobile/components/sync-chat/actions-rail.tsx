import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Clock3, History, Sparkles, Wrench } from "lucide-react-native";
import Animated, { Layout, FadeIn, FadeOut } from "react-native-reanimated";
import type { SyncChange, SyncDraft, SyncPreview, SyncQuestion } from "@momentarise/shared";

interface SyncToolTimelineEntry {
    id: string;
    seq: number;
    kind: "tool_call" | "tool_result";
    toolName?: string;
    status: string;
    summary?: string;
    createdAt: Date;
}

interface ActionFeedbackEntry {
    id: string;
    kind: "applied" | "undo";
    createdAt: Date;
}

interface ActionsRailLabels {
    title: string;
    pendingAction: string;
    preview: string;
    apply: string;
    undo: string;
    changelog: string;
    debug: string;
    noPendingAction: string;
    noChanges: string;
    noToolEvents: string;
    appliedSuccess: string;
    undoneSuccess: string;
    noTime: string;
}

interface ActionsRailProps {
    latestPreview: SyncPreview | null;
    changes: SyncChange[];
    toolTimeline: SyncToolTimelineEntry[];
    actionFeedback: ActionFeedbackEntry[];
    canApply: boolean;
    canUndo: boolean;
    isApplying: boolean;
    isUndoing: boolean;
    labels: ActionsRailLabels;
    onApply: () => void;
    onUndo: () => void;
}

function formatTime(value: string | Date): string {
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function renderPreviewSummary(preview: SyncPreview): string {
    const summary = preview.diff_json.summary;
    if (typeof summary === "string" && summary.trim().length > 0) return summary;

    const title = preview.diff_json.title;
    if (typeof title === "string" && title.trim().length > 0) return title;

    try {
        const raw = JSON.stringify(preview.diff_json);
        return raw.length > 100 ? `${raw.slice(0, 97)}...` : raw;
    } catch {
        return "{}";
    }
}

export function ActionsRail({
    latestPreview,
    changes,
    toolTimeline,
    actionFeedback,
    canApply,
    canUndo,
    isApplying,
    isUndoing,
    labels,
    onApply,
    onUndo,
}: ActionsRailProps) {
    const [isDebugOpen, setIsDebugOpen] = useState(false);
    const latestUndoableChange = changes.find((change) => change.undoable) ?? null;
    const newestFeedback = actionFeedback[0] ?? null;
    const debugEntries = toolTimeline.slice(0, 12);

    // If there is absolutely no timeline, no preview, and no history, we can hide the rail entirely
    // But for now we render it if it's mounted.
    if (!latestPreview && toolTimeline.length === 0 && changes.length === 0 && actionFeedback.length === 0) {
        return null;
    }

    return (
        <Animated.View
            layout={Layout.springify().damping(15)}
            entering={FadeIn}
            exiting={FadeOut}
            className="mb-4 w-full"
        >
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
            >
                {/* 1. Pending Action (Preview) */}
                {latestPreview && (
                    <View className="w-[280px] rounded-2xl border border-border bg-card p-4">
                        <View className="mb-2 flex-row items-center gap-2">
                            <Sparkles size={14} className="text-muted-foreground" />
                            <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {labels.pendingAction}
                            </Text>
                        </View>
                        <Text className="mb-1 text-sm font-medium text-foreground">
                            {renderPreviewSummary(latestPreview)}
                        </Text>
                        <Text className="mb-3 text-xs text-muted-foreground">
                            {latestPreview.action} · {latestPreview.entity_type}
                        </Text>
                        <View className="flex-row gap-2">
                            <Button
                                size="sm"
                                className="flex-1"
                                onPress={onApply}
                                disabled={!canApply || isApplying}
                            >
                                <Text>{labels.apply}</Text>
                            </Button>
                            {canUndo && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onPress={onUndo}
                                    disabled={!canUndo || isUndoing}
                                >
                                    <Text>{labels.undo}</Text>
                                </Button>
                            )}
                        </View>
                    </View>
                )}

                {/* 2. Tool Timeline (Debug) */}
                {debugEntries.length > 0 && (
                    <View className="w-[260px] rounded-2xl border border-border bg-card p-4">
                        <TouchableOpacity
                            className="flex-row justify-between items-center"
                            onPress={() => setIsDebugOpen(!isDebugOpen)}
                            activeOpacity={0.7}
                        >
                            <View className="flex-row items-center gap-2">
                                <Wrench size={14} className="text-muted-foreground" />
                                <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {labels.debug}
                                </Text>
                            </View>
                            {isDebugOpen ? (
                                <ChevronDown size={16} className="text-muted-foreground" />
                            ) : (
                                <ChevronRight size={16} className="text-muted-foreground" />
                            )}
                        </TouchableOpacity>

                        {isDebugOpen ? (
                            <View className="mt-3 gap-2">
                                {debugEntries.map((entry) => (
                                    <View key={entry.id} className="rounded-lg bg-muted/50 p-2">
                                        <Text className="text-xs font-medium text-foreground">
                                            {entry.toolName ?? entry.kind}
                                        </Text>
                                        <Text className="mt-0.5 text-[10px] text-muted-foreground">
                                            {entry.status}
                                        </Text>
                                        {entry.summary ? (
                                            <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={2}>
                                                {entry.summary}
                                            </Text>
                                        ) : null}
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text className="mt-2 text-xs text-muted-foreground">
                                {debugEntries.length} {labels.debug} items
                            </Text>
                        )}
                    </View>
                )}

                {/* 3. History & Undos */}
                {(changes.length > 0 || actionFeedback.length > 0) && (
                    <View className="w-[240px] rounded-2xl border border-border bg-card p-4">
                        <View className="mb-3 flex-row items-center gap-2">
                            <History size={14} className="text-muted-foreground" />
                            <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {labels.changelog}
                            </Text>
                        </View>

                        <View className="gap-2">
                            {newestFeedback && (
                                <View className="flex-row items-center justify-between rounded-lg bg-emerald-500/10 px-2 py-1.5">
                                    <Text className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                        {newestFeedback.kind === "applied" ? labels.appliedSuccess : labels.undoneSuccess}
                                    </Text>
                                </View>
                            )}

                            {changes.slice(0, 3).map((change) => (
                                <View key={change.id} className="flex-row items-center justify-between py-1">
                                    <Text className="text-xs text-foreground truncate max-w-[120px]">
                                        {change.action}
                                    </Text>
                                    <View className="flex-row items-center gap-1">
                                        <Clock3 size={10} className="text-muted-foreground" />
                                        <Text className="text-[10px] text-muted-foreground">
                                            {formatTime(change.created_at) || labels.noTime}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {canUndo && latestUndoableChange && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="mt-3 w-full"
                                onPress={onUndo}
                                disabled={isUndoing}
                            >
                                <Text>{labels.undo}</Text>
                            </Button>
                        )}
                    </View>
                )}
            </ScrollView>
        </Animated.View>
    );
}
