import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
    Keyboard,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    View,
    Text,
    TouchableWithoutFeedback,
} from "react-native";
import { Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import type { EventColor } from "@momentarise/shared";
import {
    BLOCK_DISPLAY_META,
    QUICK_UPDATE_LABELS,
    STARTER_KITS,
    applyRuntimeUpdateDraft,
    buildStarterKitBlocks,
    businessBlockTypeValues,
    createBusinessBlock,
    eventContentResponseSchema,
    eventContentUpdateRequestSchema,
    insertBusinessBlocks,
    resolveContentRenderMode,
    sanitizeBusinessBlocks,
    type BusinessBlock,
    type ContentRenderMode,
} from "@momentarise/shared";
import {
    useCreateEvent,
    useDeleteEvent,
    useEventAnalytics,
    useEventContent,
    useUpdateEvent,
} from "@/hooks/use-events";
import { useProjects } from "@/hooks/use-projects";
import { useSeries } from "@/hooks/use-series";
import { useTracking } from "@/hooks/use-tracking";
import { type DraftEvent, useEventSheet } from "@/lib/store";
import { apiFetch, readApiError } from "@/lib/api";
import { EndHour, StartHour } from "@/lib/calendar-constants";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { BusinessBlocksEditor } from "@/components/BusinessBlocksEditor";
import { RecurrenceInput } from "@/components/RecurrenceInput";
import { ProjectSeriesSelector } from "@/components/ProjectSeriesSelector";

const COLOR_OPTIONS: Array<{ value: EventColor; labelKey: string }> = [
    { value: "sky", labelKey: "pages.timeline.color.sky" },
    { value: "amber", labelKey: "pages.timeline.color.amber" },
    { value: "violet", labelKey: "pages.timeline.color.violet" },
    { value: "rose", labelKey: "pages.timeline.color.rose" },
    { value: "emerald", labelKey: "pages.timeline.color.emerald" },
    { value: "orange", labelKey: "pages.timeline.color.orange" },
];

const COLOR_CLASSES: Record<EventColor, string> = {
    sky: "bg-sky-400 border-sky-400",
    amber: "bg-amber-400 border-amber-400",
    violet: "bg-violet-400 border-violet-400",
    rose: "bg-rose-400 border-rose-400",
    emerald: "bg-emerald-400 border-emerald-400",
    orange: "bg-orange-400 border-orange-400",
};

function roundToQuarterHour(date: Date): Date {
    const ms = 1000 * 60 * 15;
    return new Date(Math.ceil(date.getTime() / ms) * ms);
}

function buildDefaultDraft(): DraftEvent {
    const start = roundToQuarterHour(new Date());
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return {
        title: "",
        description: "",
        location: "",
        start,
        end,
        allDay: false,
        color: "sky" as EventColor,
    };
}

function withDate(base: Date, nextDate: Date): Date {
    const d = new Date(base);
    d.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
    return d;
}

function withTime(base: Date, nextTime: Date): Date {
    const d = new Date(base);
    d.setHours(nextTime.getHours(), nextTime.getMinutes(), 0, 0);
    return d;
}

type TabKey = "details" | "content" | "coach";
type SaveState = "idle" | "saving" | "saved" | "error";

type QuickUpdateState = {
    status: string;
    energy: string;
    progressDelta: string;
    nextAction: string;
};

function makeBlockId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `blk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatSecondsCompact(value: number | null): string {
    if (value == null || Number.isNaN(value)) return "--";
    const seconds = Math.max(0, Math.round(value));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
    return `${minutes}m`;
}

function parseQuickNumber(value: string): number | null {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
}

function buildQuickUpdateState(blocks: BusinessBlock[]): QuickUpdateState {
    const statusBlock = blocks.find(
        (block) => block.type === "status_block" && (block.label ?? "") === QUICK_UPDATE_LABELS.status
    );
    const energyBlock = blocks.find(
        (block) => block.type === "scale_block" && (block.label ?? "") === QUICK_UPDATE_LABELS.energy
    );
    const progressBlock = blocks.find(
        (block) => block.type === "metric_block" && (block.label ?? "") === QUICK_UPDATE_LABELS.progressDelta
    );
    const nextActionBlock = blocks.find(
        (block) => block.type === "task_block" && (block.label ?? "") === QUICK_UPDATE_LABELS.nextAction
    );

    return {
        status: statusBlock && statusBlock.type === "status_block" ? statusBlock.payload.state : "on_track",
        energy: energyBlock && energyBlock.type === "scale_block" ? String(energyBlock.payload.value ?? "") : "",
        progressDelta:
            progressBlock && progressBlock.type === "metric_block" && progressBlock.payload.current != null
                ? String(progressBlock.payload.current)
                : "",
        nextAction:
            nextActionBlock && nextActionBlock.type === "task_block" ? nextActionBlock.payload.title ?? "" : "",
    };
}

export default function MomentDetailPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const draftEvent = useEventSheet((s) => s.draftEvent);

    const createEvent = useCreateEvent();
    const updateEvent = useUpdateEvent();
    const deleteEvent = useDeleteEvent();
    const { startTracking, stopTracking, isStarting, isStopping } = useTracking();

    const [activeTab, setActiveTab] = useState<TabKey>("details");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [allDay, setAllDay] = useState(false);
    const [color, setColor] = useState<EventColor>("sky");
    const [rrule, setRrule] = useState<string | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [seriesId, setSeriesId] = useState<string | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [eventId, setEventId] = useState<string | null>(null);
    const [itemId, setItemId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeContentBlockId, setActiveContentBlockId] = useState<string | null>(null);
    const [showAddBlockSheet, setShowAddBlockSheet] = useState(false);
    const [showQuickUpdateSheet, setShowQuickUpdateSheet] = useState(false);
    const [futureAiPrompt, setFutureAiPrompt] = useState("");
    const [contentModeOverride, setContentModeOverride] = useState<ContentRenderMode | null>(null);
    const [quickUpdate, setQuickUpdate] = useState<QuickUpdateState>({
        status: "on_track",
        energy: "",
        progressDelta: "",
        nextAction: "",
    });

    const [activePicker, setActivePicker] = useState<
        "startDate" | "startTime" | "endDate" | "endTime" | null
    >(null);
    const [pickerValue, setPickerValue] = useState<Date>(new Date());

    const { data: eventContent } = useEventContent(eventId);
    const { data: eventAnalytics } = useEventAnalytics(eventId, "week");
    const { data: projects = [] } = useProjects();
    const { data: allSeries = [] } = useSeries();
    const [blocks, setBlocks] = useState<BusinessBlock[]>([]);
    const [contentDirty, setContentDirty] = useState(false);
    const [blocksHydrated, setBlocksHydrated] = useState(false);
    const [blocksSaveState, setBlocksSaveState] = useState<SaveState>("idle");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    useEffect(() => {
        if (!eventContent || !eventId || blocksHydrated || contentDirty) {
            return;
        }
        setBlocks(eventContent.blocks ?? []);
        if (eventContent.item_id !== itemId) {
            setItemId(eventContent.item_id);
        }
        setBlocksHydrated(true);
    }, [blocksHydrated, contentDirty, eventContent, eventId, itemId]);

    useEffect(() => {
        setQuickUpdate(buildQuickUpdateState(blocks));
    }, [blocks]);

    useEffect(() => {
        setContentModeOverride(null);
    }, [eventId]);

    const persistBlocks = useCallback(
        async (targetEventId: string, nextBlocks: BusinessBlock[]) => {
            const sanitizedBlocks = sanitizeBusinessBlocks(nextBlocks);
            const body = eventContentUpdateRequestSchema.parse({
                schema_version: "business_blocks_v1",
                blocks: sanitizedBlocks,
            });
            const res = await apiFetch(`/api/v1/events/${targetEventId}/content`, {
                method: "PATCH",
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                throw new Error(await readApiError(res, "Failed to save moment content"));
            }
            const payload = eventContentResponseSchema.parse(await res.json());
            if (payload.item_id !== itemId) {
                setItemId(payload.item_id);
            }
        },
        [itemId]
    );

    const scheduleSaveBlocks = useCallback(
        (nextBlocks: BusinessBlock[]) => {
            const sanitizedBlocks = sanitizeBusinessBlocks(nextBlocks);
            setBlocks(sanitizedBlocks);
            setContentDirty(true);
            if (!eventId) {
                setBlocksSaveState("idle");
                return;
            }
            setBlocksSaveState("saving");

            if (debounceRef.current) clearTimeout(debounceRef.current);

            debounceRef.current = setTimeout(() => {
                void persistBlocks(eventId, sanitizedBlocks)
                    .then(() => {
                        setBlocksSaveState("saved");
                        setContentDirty(false);
                    })
                    .catch(() => {
                        setBlocksSaveState("error");
                    });
            }, 700);
        },
        [eventId, persistBlocks]
    );

    const blocksSaveLabel = useMemo(() => {
        if (blocksSaveState === "saving") return t("pages.calendar.momentContent.saving");
        if (blocksSaveState === "saved") return t("pages.calendar.momentContent.saved");
        if (blocksSaveState === "error") return t("pages.calendar.momentContent.saveError");
        if (!eventId) return t("pages.calendar.momentContent.deferred");
        return null;
    }, [blocksSaveState, eventId, t]);

    const selectedProject = useMemo(
        () => projects.find((project) => project.id === projectId) ?? null,
        [projectId, projects]
    );
    const selectedSeries = useMemo(
        () => allSeries.find((series) => series.id === seriesId) ?? null,
        [allSeries, seriesId]
    );
    const completionPercent = Math.round((eventAnalytics?.current.completion_rate ?? 0) * 100);
    const energyScore = eventAnalytics?.current.energy_score;
    const energyDelta = eventAnalytics?.delta.energy_score ?? 0;
    const timeLeftSeconds = useMemo(() => {
        const estimated =
            draftEvent?.estimatedTimeSeconds ??
            Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 1000));
        const actual = draftEvent?.actualTimeAccSeconds ?? 0;
        return Math.max(estimated - actual, 0);
    }, [draftEvent?.actualTimeAccSeconds, draftEvent?.estimatedTimeSeconds, endDate, startDate]);
    const contentRenderMode = useMemo(
        () =>
            resolveContentRenderMode({
                startAt: startDate,
                endAt: endDate,
                isTracking,
                override: contentModeOverride,
            }),
        [contentModeOverride, endDate, isTracking, startDate]
    );
    const isRunMode = contentRenderMode === "run";

    const insertSingleBusinessBlock = useCallback(
        (type: (typeof businessBlockTypeValues)[number]) => {
            const next = sanitizeBusinessBlocks(
                insertBusinessBlocks(blocks, [createBusinessBlock(type, makeBlockId())], activeContentBlockId)
            );
            scheduleSaveBlocks(next);
            setShowAddBlockSheet(false);
        },
        [activeContentBlockId, blocks, scheduleSaveBlocks]
    );

    const applyStarterKit = useCallback(
        (key: (typeof STARTER_KITS)[number]["key"]) => {
            const next = sanitizeBusinessBlocks(
                insertBusinessBlocks(blocks, buildStarterKitBlocks(key, makeBlockId), activeContentBlockId)
            );
            scheduleSaveBlocks(next);
            setShowAddBlockSheet(false);
        },
        [activeContentBlockId, blocks, scheduleSaveBlocks]
    );

    const applyQuickUpdate = useCallback(() => {
        const parsedEnergy = quickUpdate.energy.trim() ? parseQuickNumber(quickUpdate.energy) : undefined;
        const parsedProgressDelta = quickUpdate.progressDelta.trim()
            ? parseQuickNumber(quickUpdate.progressDelta)
            : undefined;

        const next = sanitizeBusinessBlocks(
            applyRuntimeUpdateDraft(
                blocks,
                {
                    status: quickUpdate.status,
                    energy: parsedEnergy == null ? undefined : parsedEnergy,
                    progressDelta: parsedProgressDelta == null ? undefined : parsedProgressDelta,
                    nextAction: quickUpdate.nextAction,
                },
                makeBlockId
            )
        );
        scheduleSaveBlocks(next);
        setShowQuickUpdateSheet(false);
    }, [blocks, quickUpdate, scheduleSaveBlocks]);

    const isBusy =
        createEvent.isPending ||
        updateEvent.isPending ||
        deleteEvent.isPending ||
        isStarting ||
        isStopping;

    const openPicker = useCallback(
        (kind: "startDate" | "startTime" | "endDate" | "endTime", value: Date) => {
            setPickerValue(value);
            setActivePicker(kind);
        },
        []
    );

    const applyPickerValue = useCallback(() => {
        if (!activePicker) return;
        if (activePicker === "startDate") {
            setStartDate((prev) => withDate(prev, pickerValue));
        } else if (activePicker === "startTime") {
            setStartDate((prev) => withTime(prev, pickerValue));
        } else if (activePicker === "endDate") {
            setEndDate((prev) => withDate(prev, pickerValue));
        } else if (activePicker === "endTime") {
            setEndDate((prev) => withTime(prev, pickerValue));
        }
        setActivePicker(null);
    }, [activePicker, pickerValue]);

    const handleAndroidPickerChange = useCallback(
        (event: { type?: string }, date?: Date) => {
            if (event?.type === "dismissed") {
                setActivePicker(null);
                return;
            }
            if (date) {
                setPickerValue(date);
            }
            setTimeout(() => {
                if (date) {
                    if (activePicker === "startDate") {
                        setStartDate((prev) => withDate(prev, date));
                    } else if (activePicker === "startTime") {
                        setStartDate((prev) => withTime(prev, date));
                    } else if (activePicker === "endDate") {
                        setEndDate((prev) => withDate(prev, date));
                    } else if (activePicker === "endTime") {
                        setEndDate((prev) => withTime(prev, date));
                    }
                }
                setActivePicker(null);
            }, 0);
        },
        [activePicker]
    );

    useEffect(() => {
        const base = draftEvent ?? buildDefaultDraft();
        setTitle(base.title ?? "");
        setDescription(base.description ?? "");
        setLocation(base.location ?? "");
        setStartDate(base.start ?? new Date());
        setEndDate(base.end ?? new Date());
        setAllDay(base.allDay ?? false);
        setColor(base.color ?? "sky");
        setRrule(base.rrule ?? null);
        setProjectId(base.projectId ?? null);
        setSeriesId(base.seriesId ?? null);
        setIsTracking(!!base.isTracking);
        setEventId(base.id ?? null);
        setItemId(base.itemId ?? null);
        setUpdatedAt(base.updatedAt ?? null);
        setBlocks([]);
        setContentDirty(false);
        setBlocksHydrated(false);
        setBlocksSaveState("idle");
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        setError(null);
        setActivePicker(null);
        setActiveContentBlockId(null);
        setShowAddBlockSheet(false);
        setShowQuickUpdateSheet(false);
    }, [draftEvent]);

    const validate = useCallback(() => {
        if (endDate < startDate) {
            setError(t("pages.timeline.eventErrors.endBeforeStart"));
            return false;
        }
        if (!allDay) {
            const startHours = startDate.getHours();
            const endHours = endDate.getHours();
            if (
                startHours < StartHour ||
                startHours > EndHour ||
                endHours < StartHour ||
                endHours > EndHour
            ) {
                setError(t("pages.timeline.eventErrors.timeRange"));
                return false;
            }
        }
        setError(null);
        return true;
    }, [allDay, endDate, startDate, t]);

    const buildStartEnd = useCallback(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (allDay) {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 0, 0);
        }
        return { start, end };
    }, [allDay, endDate, startDate]);

    const handleSave = useCallback(async () => {
        if (!validate()) return;
        const { start, end } = buildStartEnd();
        const resolvedTitle = title.trim() ? title.trim() : "(no title)";
        try {
            let persistedEventId = eventId;
            if (eventId) {
                const updatedEvent = await updateEvent.mutateAsync({
                    eventId,
                    payload: {
                        title: resolvedTitle,
                        start_at: start.toISOString(),
                        end_at: end.toISOString(),
                        color,
                        last_known_updated_at: updatedAt ?? undefined,
                        rrule: rrule ?? undefined,
                        project_id: projectId ?? undefined,
                        series_id: seriesId ?? undefined,
                    },
                });
                persistedEventId = updatedEvent.id;
                setUpdatedAt(updatedEvent.updated_at);
                setItemId(updatedEvent.item_id);
            } else {
                const createdEvent = await createEvent.mutateAsync({
                    title: resolvedTitle,
                    start_at: start.toISOString(),
                    end_at: end.toISOString(),
                    color,
                    rrule: rrule ?? undefined,
                    project_id: projectId ?? undefined,
                    series_id: seriesId ?? undefined,
                });
                persistedEventId = createdEvent.id;
                setEventId(createdEvent.id);
                setUpdatedAt(createdEvent.updated_at);
                setItemId(createdEvent.item_id);
            }

            if (contentDirty && persistedEventId) {
                if (debounceRef.current) {
                    clearTimeout(debounceRef.current);
                    debounceRef.current = null;
                }
                setBlocksSaveState("saving");
                await persistBlocks(persistedEventId, blocks);
                setBlocksSaveState("saved");
                setContentDirty(false);
            }
            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : t("create.error"));
        }
    }, [
        buildStartEnd,
        color,
        createEvent,
        eventId,
        blocks,
        contentDirty,
        persistBlocks,
        projectId,
        seriesId,
        rrule,
        router,
        title,
        updateEvent,
        updatedAt,
        validate,
        t,
    ]);

    const handleDelete = useCallback(async () => {
        if (!eventId) return;
        try {
            await deleteEvent.mutateAsync(eventId);
            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : t("create.error"));
        }
    }, [deleteEvent, eventId, router, t]);

    const toggleTracking = useCallback(async () => {
        if (!eventId) return;
        if (isTracking) {
            await stopTracking(eventId);
            setIsTracking(false);
        } else {
            await startTracking(eventId);
            setIsTracking(true);
        }
    }, [eventId, isTracking, startTracking, stopTracking]);

    return (
        <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
            <Pressable className="flex-1" onPress={Keyboard.dismiss}>
                <View className="flex-1">
                    <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
                        <Pressable
                            onPress={() => router.back()}
                            className="rounded border border-input px-3 py-1.5"
                        >
                            <Text className="text-sm text-foreground">{t("common.cancel")}</Text>
                        </Pressable>
                        <Text className="text-base font-semibold text-foreground">
                            {eventId
                                ? t("pages.timeline.eventSheet.editTitle")
                                : t("pages.timeline.eventSheet.createTitle")}
                        </Text>
                        <View className="flex-row items-center gap-2">
                            <Pressable
                                onPress={handleSave}
                                className="rounded bg-primary px-3 py-1.5"
                                disabled={isBusy}
                            >
                                <Text className="text-sm text-primary-foreground">{t("common.save")}</Text>
                            </Pressable>
                        </View>
                    </View>

                    <View className="flex-row border-b border-border">
                        {([
                            { key: "details", label: t("pages.calendar.momentTabs.details") },
                            { key: "content", label: t("pages.calendar.momentTabs.content") },
                            { key: "coach", label: t("pages.calendar.momentTabs.coach") },
                        ] as { key: TabKey; label: string }[]).map((tab) => (
                            <Pressable
                                key={tab.key}
                                onPress={() => setActiveTab(tab.key)}
                                className={`flex-1 py-3 ${activeTab === tab.key ? "border-b-2 border-primary" : ""}`}
                            >
                                <Text
                                    className={`text-center text-sm font-medium ${activeTab === tab.key ? "text-foreground" : "text-muted-foreground"
                                        }`}
                                >
                                    {tab.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {error ? (
                        <View className="mx-4 mt-3 rounded-lg border border-destructive bg-destructive/10 px-3 py-2">
                            <Text className="text-xs text-destructive">{error}</Text>
                        </View>
                    ) : null}

                    {activeTab === "details" ? (
                        <ScrollView className="flex-1 px-4 py-4" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
                            <View className="gap-3 pb-8">
                                <View>
                                    <Text className="mb-1 text-sm font-medium text-foreground">{t("pages.timeline.eventSheet.title")}</Text>
                                    <Input value={title} onChangeText={setTitle} />
                                </View>

                                <View>
                                    <Text className="mb-1 text-sm font-medium text-foreground">{t("pages.timeline.eventSheet.description")}</Text>
                                    <Textarea value={description} onChangeText={setDescription} />
                                </View>

                                <View className="flex-row gap-3">
                                    <Pressable onPress={() => openPicker("startDate", startDate)} className="flex-1">
                                        <Text className="mb-1 text-sm font-medium text-foreground">{t("pages.timeline.eventSheet.startDate")}</Text>
                                        <View className="rounded-md border border-input px-3 py-2">
                                            <Text className="text-foreground">{startDate.toDateString()}</Text>
                                        </View>
                                    </Pressable>
                                    {!allDay ? (
                                        <Pressable onPress={() => openPicker("startTime", startDate)} className="flex-1">
                                            <Text className="mb-1 text-sm font-medium text-foreground">{t("pages.timeline.eventSheet.startTime")}</Text>
                                            <View className="rounded-md border border-input px-3 py-2">
                                                <Text className="text-foreground">
                                                    {startDate.toLocaleTimeString(undefined, {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    ) : null}
                                </View>

                                <View className="flex-row gap-3">
                                    <Pressable onPress={() => openPicker("endDate", endDate)} className="flex-1">
                                        <Text className="mb-1 text-sm font-medium text-foreground">{t("pages.timeline.eventSheet.endDate")}</Text>
                                        <View className="rounded-md border border-input px-3 py-2">
                                            <Text className="text-foreground">{endDate.toDateString()}</Text>
                                        </View>
                                    </Pressable>
                                    {!allDay ? (
                                        <Pressable onPress={() => openPicker("endTime", endDate)} className="flex-1">
                                            <Text className="mb-1 text-sm font-medium text-foreground">{t("pages.timeline.eventSheet.endTime")}</Text>
                                            <View className="rounded-md border border-input px-3 py-2">
                                                <Text className="text-foreground">
                                                    {endDate.toLocaleTimeString(undefined, {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    ) : null}
                                </View>

                                <View className="flex-row items-center justify-between rounded-lg border border-border px-3 py-2">
                                    <View className="rounded-md px-1 py-1">
                                        <Text className="text-foreground">
                                            {t("pages.timeline.eventSheet.allDay")}
                                        </Text>
                                    </View>
                                    <Switch checked={allDay} onCheckedChange={(value: boolean) => setAllDay(value)} />
                                </View>

                                <RecurrenceInput
                                    value={rrule}
                                    onChange={(value) => setRrule(value ?? null)}
                                    startDate={startDate}
                                />

                                <View>
                                    <Text className="mb-1 text-sm font-medium text-foreground">{t("pages.timeline.eventSheet.location")}</Text>
                                    <Input value={location} onChangeText={setLocation} />
                                </View>

                                <ProjectSeriesSelector
                                    projectId={projectId}
                                    seriesId={seriesId}
                                    onProjectChange={setProjectId}
                                    onSeriesChange={setSeriesId}
                                />

                                <View>
                                    <Text className="mb-1 text-sm font-medium text-foreground">{t("pages.timeline.eventSheet.color")}</Text>
                                    <View className="mt-2 flex-row flex-wrap gap-2">
                                        {COLOR_OPTIONS.map((option) => (
                                            <Pressable
                                                key={option.value}
                                                onPress={() => setColor(option.value)}
                                                className={`flex-row items-center gap-2 rounded-full border px-3 py-1.5 ${color === option.value ? "border-foreground" : "border-border"
                                                    }`}
                                            >
                                                <View className={`h-3 w-3 rounded-full ${COLOR_CLASSES[option.value]}`} />
                                                <Text className="text-xs text-foreground">
                                                    {t(option.labelKey)}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                {eventId ? (
                                    <View className="my-4 flex-row items-center justify-between rounded-lg border border-border px-3 py-2">
                                        <Text className="text-foreground">
                                            {isTracking ? t("pages.timeline.eventSheet.trackingOn") : t("pages.timeline.eventSheet.trackingOff")}
                                        </Text>
                                        <Pressable
                                            onPress={toggleTracking}
                                            disabled={isBusy}
                                            className={`rounded px-3 py-1.5 ${isTracking ? "bg-destructive" : "border border-border"}`}
                                        >
                                            <Text className={`text-sm ${isTracking ? "text-destructive-foreground" : "text-foreground"}`}>
                                                {isTracking ? t("pages.timeline.stop") : t("pages.timeline.start")}
                                            </Text>
                                        </Pressable>
                                    </View>
                                ) : null}

                                {eventId ? (
                                    <Pressable
                                        onPress={handleDelete}
                                        disabled={isBusy}
                                        className="mt-6 rounded border border-destructive px-3 py-3 items-center justify-center"
                                    >
                                        <Text className="text-sm font-semibold text-destructive">{t("pages.timeline.eventSheet.delete")}</Text>
                                    </Pressable>
                                ) : null}

                            </View>
                        </ScrollView>
                    ) : null}

                    {activeTab === "content" ? (
                        <View className="flex-1 min-h-0">
                            <View className={`border-b border-border px-4 ${isRunMode ? "pb-2 pt-2" : "pb-3 pt-3"}`}>
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground">
                                        {isRunMode ? "Run mode" : "Moment studio"}
                                    </Text>
                                    <View className="flex-row rounded-full border border-border bg-muted/60 p-1">
                                        <Pressable
                                            onPress={() => setContentModeOverride("builder")}
                                            className={`rounded-full px-3 py-1.5 ${!isRunMode ? "bg-background" : ""}`}
                                        >
                                            <Text className="text-xs font-bold text-foreground">Builder</Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() => setContentModeOverride("run")}
                                            className={`rounded-full px-3 py-1.5 ${isRunMode ? "bg-background" : ""}`}
                                        >
                                            <Text className="text-xs font-bold text-foreground">Run</Text>
                                        </Pressable>
                                    </View>
                                </View>

                                <Text className={`mt-1 font-extrabold tracking-tight text-foreground ${isRunMode ? "text-lg" : "text-[24px]"}`} numberOfLines={1}>
                                    {title.trim() || "(no title)"}
                                </Text>

                                {!isRunMode ? (
                                    <View className="mt-2 flex-row flex-wrap gap-2">
                                        {selectedProject ? (
                                            <View className="rounded-full border border-border bg-muted px-3 py-1">
                                                <Text className="text-xs font-bold text-foreground">Project: {selectedProject.title}</Text>
                                            </View>
                                        ) : null}
                                        {selectedSeries ? (
                                            <View className="rounded-full border border-border bg-muted px-3 py-1">
                                                <Text className="text-xs font-bold text-muted-foreground">Series: {selectedSeries.title}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                ) : null}

                                {!isRunMode ? (
                                    <View className="mt-2 flex-row items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
                                        <Sparkles size={16} color="hsl(0 0% 45%)" />
                                        <Input
                                            value={futureAiPrompt}
                                            onChangeText={setFutureAiPrompt}
                                            placeholder="Que voulez-vous faire pendant ce Moment ?"
                                            className="h-9 flex-1 border-0 bg-transparent px-0"
                                        />
                                    </View>
                                ) : null}

                                <View className="mt-2 flex-row flex-wrap gap-1.5">
                                    <View className="rounded-full border border-border bg-muted px-2.5 py-1">
                                        <Text className="text-[10px] font-semibold text-foreground">Status {completionPercent}%</Text>
                                    </View>
                                    <View className="rounded-full border border-border bg-muted px-2.5 py-1">
                                        <Text className="text-[10px] font-semibold text-foreground">{formatSecondsCompact(timeLeftSeconds)} left</Text>
                                    </View>
                                    <View className="rounded-full border border-border bg-muted px-2.5 py-1">
                                        <Text className="text-[10px] font-semibold text-foreground">
                                            Energy {energyScore != null ? Math.round(energyScore) : "--"}
                                            {energyScore != null ? ` (${energyDelta >= 0 ? "+" : ""}${Math.round(energyDelta)})` : ""}
                                        </Text>
                                    </View>
                                    {blocksSaveLabel ? (
                                        <View className="rounded-full border border-border bg-muted/60 px-2.5 py-1">
                                            <Text className="text-[10px] text-muted-foreground">{blocksSaveLabel}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            </View>

                            <View className="flex-1 min-h-0 px-4 pt-3">
                                <BusinessBlocksEditor
                                    value={blocks}
                                    onChange={scheduleSaveBlocks}
                                    editable
                                    activeBlockId={activeContentBlockId}
                                    onActiveBlockChange={setActiveContentBlockId}
                                    renderMode={contentRenderMode}
                                />
                            </View>
                        </View>
                    ) : null}

                    {activeTab === "coach" ? (
                        <View className="flex-1 items-center justify-center px-4">
                            <View className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6">
                                <Text className="text-center text-sm text-muted-foreground">
                                    {t("pages.calendar.coachPlaceholder")}
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {activeTab === "content" ? (
                        <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background/95 px-4 pb-4 pt-3">
                            <View className="flex-row gap-3">
                                {!isRunMode ? (
                                    <Pressable
                                        onPress={() => setShowAddBlockSheet(true)}
                                        className="flex-1 flex-row items-center justify-center gap-2 rounded-[20px] border border-border bg-muted px-4 py-3.5"
                                    >
                                        <Text className="text-sm font-bold text-foreground">Add block</Text>
                                    </Pressable>
                                ) : null}
                                <Pressable
                                    onPress={() => setShowQuickUpdateSheet(true)}
                                    className="flex-1 flex-row items-center justify-center gap-2 rounded-[20px] bg-primary px-4 py-3.5"
                                >
                                    <Text className="text-sm font-bold text-primary-foreground">
                                        {isRunMode ? "Quick update" : "Update"}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : null}

                </View>
            </Pressable>

            <Modal
                transparent
                visible={showAddBlockSheet}
                animationType="slide"
                onRequestClose={() => setShowAddBlockSheet(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowAddBlockSheet(false)}>
                    <View className="flex-1 bg-black/35 justify-end">
                        <TouchableWithoutFeedback>
                            <View className="max-h-[88vh] rounded-t-[32px] border border-border bg-card px-5 pb-8 pt-4">
                                <View className="mb-4 self-center h-1.5 w-12 rounded-full bg-muted" />
                                <Text className="text-[11px] font-bold uppercase tracking-[2px] text-primary">Starter kits</Text>
                                <Text className="mt-2 text-2xl font-extrabold text-foreground">Add a block or start from a structure</Text>

                                <ScrollView className="mt-5 max-h-[70vh]" contentContainerClassName="gap-4 pb-8">
                                    <View className="gap-3">
                                        {STARTER_KITS.map((kit) => (
                                            <Pressable
                                                key={kit.key}
                                                onPress={() => applyStarterKit(kit.key)}
                                                className="rounded-[24px] border border-border bg-background px-4 py-4"
                                            >
                                                <Text className="text-base font-bold text-foreground">{kit.title}</Text>
                                                <Text className="mt-1 text-sm leading-5 text-muted-foreground">{kit.description}</Text>
                                            </Pressable>
                                        ))}
                                    </View>

                                    <View className="mt-2">
                                        <Text className="text-[11px] font-bold uppercase tracking-[2px] text-primary">All blocks</Text>
                                        <View className="mt-3 flex-row flex-wrap gap-2">
                                            {businessBlockTypeValues.map((type) => (
                                                <Pressable
                                                    key={type}
                                                    onPress={() => insertSingleBusinessBlock(type)}
                                                    className="min-w-[46%] rounded-[20px] border border-border bg-background px-3 py-3"
                                                >
                                                    <Text className="text-sm font-semibold text-foreground">{BLOCK_DISPLAY_META[type].title}</Text>
                                                    <Text className="mt-1 text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">{BLOCK_DISPLAY_META[type].eyebrow}</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>
                                </ScrollView>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <Modal
                transparent
                visible={showQuickUpdateSheet}
                animationType="slide"
                onRequestClose={() => setShowQuickUpdateSheet(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowQuickUpdateSheet(false)}>
                    <View className="flex-1 bg-black/35 justify-end">
                        <TouchableWithoutFeedback>
                            <View className="rounded-t-[32px] border border-border bg-card px-5 pb-8 pt-4">
                                <View className="mb-4 self-center h-1.5 w-12 rounded-full bg-muted" />
                                <Text className="text-[11px] font-bold uppercase tracking-[2px] text-primary">Runtime update</Text>
                                <Text className="mt-2 text-2xl font-extrabold text-foreground">Patch live signals</Text>

                                <View className="mt-5 gap-3">
                                    <View className="flex-row gap-2">
                                        {[
                                            { value: "on_track", label: "On track" },
                                            { value: "at_risk", label: "At risk" },
                                            { value: "off_track", label: "Off track" },
                                        ].map((option) => (
                                            <Pressable
                                                key={option.value}
                                                onPress={() => setQuickUpdate((prev) => ({ ...prev, status: option.value }))}
                                                className={`flex-1 rounded-[18px] px-3 py-3 ${quickUpdate.status === option.value ? "bg-primary" : "bg-muted"}`}
                                            >
                                                <Text className={`text-center text-xs font-bold ${quickUpdate.status === option.value ? "text-primary-foreground" : "text-muted-foreground"}`}>{option.label}</Text>
                                            </Pressable>
                                        ))}
                                    </View>

                                    <Input
                                        value={quickUpdate.energy}
                                        onChangeText={(text) => setQuickUpdate((prev) => ({ ...prev, energy: text }))}
                                        keyboardType="numeric"
                                        placeholder="Energy (1-10)"
                                    />
                                    <Input
                                        value={quickUpdate.progressDelta}
                                        onChangeText={(text) => setQuickUpdate((prev) => ({ ...prev, progressDelta: text }))}
                                        keyboardType="numeric"
                                        placeholder="Progress delta %"
                                    />
                                    <Input
                                        value={quickUpdate.nextAction}
                                        onChangeText={(text) => setQuickUpdate((prev) => ({ ...prev, nextAction: text }))}
                                        placeholder="Next action"
                                    />

                                    <Pressable
                                        onPress={applyQuickUpdate}
                                        className="mt-2 rounded-[20px] bg-primary px-4 py-4"
                                    >
                                        <Text className="text-center text-base font-bold text-primary-foreground">Apply update</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {Platform.OS === "android" ? (
                activePicker ? (
                    <DateTimePicker
                        value={pickerValue}
                        mode={
                            activePicker === "startDate" || activePicker === "endDate"
                                ? "date"
                                : "time"
                        }
                        display="default"
                        onChange={handleAndroidPickerChange}
                    />
                ) : null
            ) : (
                <Modal
                    transparent
                    visible={activePicker !== null}
                    animationType="fade"
                    onRequestClose={() => setActivePicker(null)}
                >
                    <View className="flex-1 items-center justify-center bg-black/40 px-6">
                        <View className="w-full max-w-md rounded-2xl border border-border bg-card p-4">
                            <DateTimePicker
                                value={pickerValue}
                                mode={
                                    activePicker === "startDate" || activePicker === "endDate"
                                        ? "date"
                                        : "time"
                                }
                                display="spinner"
                                themeVariant="light"
                                textColor="#111827"
                                style={{ height: 216 }}
                                onChange={(event, date) => {
                                    if (event?.type === "dismissed") {
                                        setActivePicker(null);
                                        return;
                                    }
                                    if (date) setPickerValue(date);
                                }}
                            />
                            <View className="mt-4 flex-row justify-end gap-2">
                                <Pressable onPress={() => setActivePicker(null)} className="rounded border border-input px-3 py-1.5">
                                    <Text className="text-sm text-foreground">{t("common.cancel")}</Text>
                                </Pressable>
                                <Pressable onPress={applyPickerValue} className="rounded bg-primary px-3 py-1.5">
                                    <Text className="text-sm text-primary-foreground">{t("common.save")}</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}
