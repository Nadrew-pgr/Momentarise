import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import type { EventColor } from "@momentarise/shared";
import { useCreateEvent, useDeleteEvent, useUpdateEvent } from "@/hooks/use-events";
import { useTracking } from "@/hooks/use-tracking";
import { useEventSheet } from "@/lib/store";
import { EndHour, StartHour } from "@/lib/calendar-constants";
import { Text as UiText } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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

function buildDefaultDraft() {
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

export function EventSheet() {
  const { t } = useTranslation();
  const { isOpen, openNonce, draftEvent, close } = useEventSheet();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["92%"], []);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const { startTracking, stopTracking, isStarting, isStopping } = useTracking();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState<EventColor>("sky");
  const [isTracking, setIsTracking] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activePicker, setActivePicker] = useState<
    "startDate" | "startTime" | "endDate" | "endTime" | null
  >(null);
  const [pickerValue, setPickerValue] = useState<Date>(new Date());

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
      // Apply immediately on Android to avoid extra modal UI
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
    if (!isOpen) {
      setActivePicker(null);
      bottomSheetRef.current?.close();
      return;
    }
    const base = draftEvent ?? buildDefaultDraft();
    setTitle(base.title ?? "");
    setDescription(base.description ?? "");
    setLocation(base.location ?? "");
    setStartDate(base.start ?? new Date());
    setEndDate(base.end ?? new Date());
    setAllDay(base.allDay ?? false);
    setColor(base.color ?? "sky");
    setIsTracking(!!base.isTracking);
    setEventId(base.id ?? null);
    setUpdatedAt(base.updatedAt ?? null);
    setError(null);
    setActivePicker(null);
    bottomSheetRef.current?.snapToIndex(0);
  }, [draftEvent, isOpen, openNonce]);

  const onClose = useCallback(() => {
    close();
  }, [close]);

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
          },
        });
      } else {
        await createEvent.mutateAsync({
          title: resolvedTitle,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          color,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("create.error"));
    }
  }, [
    buildStartEnd,
    color,
    createEvent,
    eventId,
    onClose,
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
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("create.error"));
    }
  }, [deleteEvent, eventId, onClose, t]);

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
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={(index) => {
        if (index === -1) close();
      }}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: "#ffffff" }}
      handleIndicatorStyle={{ backgroundColor: "#a3a3a3" }}
    >
      <BottomSheetView className="flex-1 px-4 pb-4 pt-2">
        <View className="mb-3 flex-row items-center justify-between">
          <UiText className="text-lg font-semibold text-foreground">
            {eventId
              ? t("pages.timeline.eventSheet.editTitle")
              : t("pages.timeline.eventSheet.createTitle")}
          </UiText>
          <Button variant="outline" size="sm" onPress={onClose} disabled={isBusy}>
            <UiText>{t("common.cancel")}</UiText>
          </Button>
        </View>

        {error ? (
          <View className="mb-3 rounded-lg border border-destructive bg-destructive/10 px-3 py-2">
            <UiText className="text-xs text-destructive">{error}</UiText>
          </View>
        ) : null}

        <View className="gap-3">
          <View>
            <Label>{t("pages.timeline.eventSheet.title")}</Label>
            <Input value={title} onChangeText={setTitle} />
          </View>

          <View>
            <Label>{t("pages.timeline.eventSheet.description")}</Label>
            <Textarea value={description} onChangeText={setDescription} />
          </View>

          <View className="flex-row gap-3">
            <Pressable onPress={() => openPicker("startDate", startDate)} className="flex-1">
              <Label>{t("pages.timeline.eventSheet.startDate")}</Label>
              <View className="rounded-md border border-input px-3 py-2">
                <UiText className="text-foreground">{startDate.toDateString()}</UiText>
              </View>
            </Pressable>
            {!allDay ? (
              <Pressable onPress={() => openPicker("startTime", startDate)} className="flex-1">
                <Label>{t("pages.timeline.eventSheet.startTime")}</Label>
                <View className="rounded-md border border-input px-3 py-2">
                  <UiText className="text-foreground">
                    {startDate.toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </UiText>
                </View>
              </Pressable>
            ) : null}
          </View>

          <View className="flex-row gap-3">
            <Pressable onPress={() => openPicker("endDate", endDate)} className="flex-1">
              <Label>{t("pages.timeline.eventSheet.endDate")}</Label>
              <View className="rounded-md border border-input px-3 py-2">
                <UiText className="text-foreground">{endDate.toDateString()}</UiText>
              </View>
            </Pressable>
            {!allDay ? (
              <Pressable onPress={() => openPicker("endTime", endDate)} className="flex-1">
                <Label>{t("pages.timeline.eventSheet.endTime")}</Label>
                <View className="rounded-md border border-input px-3 py-2">
                  <UiText className="text-foreground">
                    {endDate.toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </UiText>
                </View>
              </Pressable>
            ) : null}
          </View>

          <View className="flex-row items-center justify-between rounded-lg border border-border px-3 py-2">
            <UiText className="text-foreground">
              {t("pages.timeline.eventSheet.allDay")}
            </UiText>
            <Switch checked={allDay} onCheckedChange={(value) => setAllDay(value)} />
          </View>

          <View>
            <Label>{t("pages.timeline.eventSheet.location")}</Label>
            <Input value={location} onChangeText={setLocation} />
          </View>

          <View>
            <Label>{t("pages.timeline.eventSheet.color")}</Label>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {COLOR_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setColor(option.value)}
                  className={`flex-row items-center gap-2 rounded-full border px-3 py-1.5 ${
                    color === option.value ? "border-foreground" : "border-border"
                  }`}
                >
                  <View className={`h-3 w-3 rounded-full ${COLOR_CLASSES[option.value]}`} />
                  <UiText className="text-xs text-foreground">
                    {t(option.labelKey)}
                  </UiText>
                </Pressable>
              ))}
            </View>
          </View>

          {eventId ? (
            <View className="flex-row items-center justify-between rounded-lg border border-border px-3 py-2">
              <UiText className="text-foreground">
                {isTracking ? t("pages.timeline.eventSheet.trackingOn") : t("pages.timeline.eventSheet.trackingOff")}
              </UiText>
              <Button
                variant={isTracking ? "destructive" : "default"}
                size="sm"
                onPress={toggleTracking}
                disabled={isBusy}
              >
                <UiText>
                  {isTracking ? t("pages.timeline.stop") : t("pages.timeline.start")}
                </UiText>
              </Button>
            </View>
          ) : null}
        </View>

        <View className="mt-6 flex-row justify-between gap-2">
          {eventId ? (
            <Button
              variant="outline"
              size="sm"
              onPress={handleDelete}
              disabled={isBusy}
            >
              <UiText>{t("pages.timeline.eventSheet.delete")}</UiText>
            </Button>
          ) : (
            <View />
          )}
          <Button onPress={handleSave} disabled={isBusy}>
            <UiText>{t("common.save")}</UiText>
          </Button>
        </View>

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
                  <Button variant="outline" size="sm" onPress={() => setActivePicker(null)}>
                    <UiText>{t("common.cancel")}</UiText>
                  </Button>
                  <Button size="sm" onPress={applyPickerValue}>
                    <UiText>{t("common.save")}</UiText>
                  </Button>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}
