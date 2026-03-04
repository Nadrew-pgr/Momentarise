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
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import type { EventColor } from "@momentarise/shared";
import type { ProseMirrorNode } from "@momentarise/shared";
import { useCreateEvent, useDeleteEvent, useUpdateEvent } from "@/hooks/use-events";
import { useTracking } from "@/hooks/use-tracking";
import { type DraftEvent, useEventSheet, useAppToast } from "@/lib/store";
import { EndHour, StartHour } from "@/lib/calendar-constants";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { BlockEditor } from "@/components/BlockEditor";
import { useItem, useUpdateItem } from "@/hooks/use-item";
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

export default function MomentDetailPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string | string[] }>();
    const isNew = params.id === "new" || !params.id;

    const draftEvent = useEventSheet((s) => s.draftEvent);

    const createEvent = useCreateEvent();
    const updateEvent = useUpdateEvent();
    const deleteEvent = useDeleteEvent();
    const { startTracking, stopTracking, isStarting, isStopping } = useTracking();
    const showToast = useAppToast((s) => s.show);

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

    const [activePicker, setActivePicker] = useState<
        "startDate" | "startTime" | "endDate" | "endTime" | null
    >(null);
    const [pickerValue, setPickerValue] = useState<Date>(new Date());

    const { data: item } = useItem(itemId);
    const updateItem = useUpdateItem(itemId);
    const [blocksSaveState, setBlocksSaveState] = useState<SaveState>("idle");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const scheduleSaveBlocks = useCallback(
        (blocks: ProseMirrorNode[]) => {
            if (!itemId) return;
            setBlocksSaveState("saving");

            if (debounceRef.current) clearTimeout(debounceRef.current);

            debounceRef.current = setTimeout(() => {
                updateItem.mutate(
                    { blocks },
                    {
                        onSuccess: () => setBlocksSaveState("saved"),
                        onError: () => setBlocksSaveState("error"),
                    }
                );
            }, 700);
        },
        [itemId, updateItem]
    );

    const blocksSaveLabel = useMemo(() => {
        if (blocksSaveState === "saving") return t("pages.calendar.momentContent.saving");
        if (blocksSaveState === "saved") return t("pages.calendar.momentContent.saved");
        if (blocksSaveState === "error") return t("pages.calendar.momentContent.saveError");
        if (!itemId) return t("pages.calendar.momentContent.deferred");
        return null;
    }, [blocksSaveState, itemId, t]);

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
        setError(null);
        setActivePicker(null);
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
            if (eventId) {
                await updateEvent.mutateAsync({
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
            } else {
                await createEvent.mutateAsync({
                    title: resolvedTitle,
                    start_at: start.toISOString(),
                    end_at: end.toISOString(),
                    color,
                    rrule: rrule ?? undefined,
                    project_id: projectId ?? undefined,
                    series_id: seriesId ?? undefined,
                });
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
        <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
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
                                    <Switch checked={allDay} onCheckedChange={(value) => setAllDay(value)} />
                                </View>

                                <RecurrenceInput
                                    value={rrule}
                                    onChange={setRrule}
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
                        <View className="flex-1 min-h-0 px-4 py-4">
                            {blocksSaveLabel ? <Text className="mb-2 px-1 text-xs text-muted-foreground">{blocksSaveLabel}</Text> : null}
                            <View className="flex-1 min-h-[300px] bg-background rounded-md border border-border overflow-hidden">
                                {item ? (
                                    <BlockEditor value={item.blocks} onChange={scheduleSaveBlocks} editable />
                                ) : (
                                    <View className="flex-1 items-center justify-center p-4">
                                        <Text className="text-sm text-muted-foreground text-center">
                                            {itemId ? "Loading..." : t("pages.calendar.momentContent.deferred")}
                                        </Text>
                                    </View>
                                )}
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

                </View>
            </Pressable>

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
