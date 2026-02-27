import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { CalendarProvider, Timeline, TimelineList } from "react-native-calendars";
import type { TimelineListRenderItemInfo, TimelineProps } from "react-native-calendars";
import { useTimeline } from "@/hooks/use-timeline";
import { useTracking } from "@/hooks/use-tracking";
import {
  useCalendarPreferences,
  useUpdateCalendarPreferences,
} from "@/hooks/use-calendar-preferences";
import { eventsToCalendarFormat } from "@/lib/adapters/calendarAdapter";
import { TrackingChrono } from "@/components/TrackingChrono";
import type { EventOut } from "@momentarise/shared";

function todayYYYYMMDD(): string {
  return new Date().toISOString().slice(0, 10);
}

function EventRow({
  event,
  onStart,
  onStop,
  isStarting,
  isStopping,
  t,
}: {
  event: EventOut;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  isStarting: boolean;
  isStopping: boolean;
  t: (key: string) => string;
}) {
  const timeStr = new Date(event.start_at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <View className="flex-row flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
      <View className="min-w-0 flex-1">
        <Text className="text-muted-foreground text-sm">{timeStr}</Text>
        <Text className="font-medium text-foreground">{event.title}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <TrackingChrono event={event} />
        {event.is_tracking ? (
          <TouchableOpacity
            className="rounded bg-destructive px-3 py-2"
            disabled={isStopping}
            onPress={() => onStop(event.id)}
          >
            <Text className="text-destructive-foreground text-sm font-medium">
              {t("pages.timeline.stop")}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="rounded bg-primary px-3 py-2"
            disabled={isStarting}
            onPress={() => onStart(event.id)}
          >
            <Text className="text-primary-foreground text-sm font-medium">
              {t("pages.timeline.start")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function TimelineScreen() {
  const { t } = useTranslation();
  const initialDate = todayYYYYMMDD();
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftStartHour, setDraftStartHour] = useState(8);
  const [draftEndHour, setDraftEndHour] = useState(24);
  const { data, isLoading, error, refetch, isFetching } = useTimeline(currentDate);
  const { startTracking, stopTracking, isStarting, isStopping } = useTracking();
  const preferencesQuery = useCalendarPreferences();
  const updatePreferencesMutation = useUpdateCalendarPreferences();

  const startHour = preferencesQuery.data?.start_hour ?? 8;
  const endHour = preferencesQuery.data?.end_hour ?? 24;

  const openSettings = () => {
    setDraftStartHour(startHour);
    setDraftEndHour(endHour);
    setIsSettingsOpen(true);
  };

  const saveSettings = async () => {
    if (draftEndHour <= draftStartHour) return;
    try {
      await updatePreferencesMutation.mutateAsync({
        start_hour: draftStartHour,
        end_hour: draftEndHour,
        last_known_updated_at: preferencesQuery.data?.updated_at,
      });
      setIsSettingsOpen(false);
    } catch {
      await preferencesQuery.refetch();
    }
  };

  const startCanDecrement = draftStartHour > 0;
  const startCanIncrement = draftStartHour < 23 && draftStartHour + 1 < draftEndHour;
  const endCanDecrement = draftEndHour - 1 > draftStartHour;
  const endCanIncrement = draftEndHour < 24;

  const events = data?.events ?? [];
  const eventsByDate = data ? eventsToCalendarFormat(data) : { [currentDate]: [] };

  const timelineProps = {
    format24h: true,
    start: startHour,
    end: endHour,
    numberOfDays: 1,
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="border-border border-b bg-background px-4 py-2">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-foreground text-lg">
            {t("pages.timeline.title")} — {currentDate}
          </Text>
          <Pressable
            onPress={openSettings}
            className="rounded border border-input px-3 py-1.5"
          >
            <Text className="text-foreground text-sm">
              {t("pages.timeline.displayHours")}
            </Text>
          </Pressable>
        </View>
      </View>
      <View className="flex-1">
        <CalendarProvider date={currentDate} onDateChanged={setCurrentDate}>
          <View className="flex-1">
            <TimelineList
              events={eventsByDate}
              timelineProps={timelineProps}
              showNowIndicator
              scrollToFirst
              scrollToNow
              renderItem={(props: TimelineProps, info: TimelineListRenderItemInfo) => {
                const timelineKey = (props as TimelineProps & { key?: string }).key ?? info.item;
                return (
                  <Timeline
                    key={String(timelineKey)}
                    format24h={props.format24h}
                    start={props.start}
                    end={props.end}
                    date={props.date}
                    events={props.events}
                    scrollToNow={props.scrollToNow}
                    initialTime={props.initialTime}
                    scrollToFirst={props.scrollToFirst}
                    scrollOffset={props.scrollOffset}
                    onChangeOffset={props.onChangeOffset}
                    showNowIndicator={props.showNowIndicator}
                    numberOfDays={props.numberOfDays}
                    timelineLeftInset={props.timelineLeftInset}
                  />
                );
              }}
            />
          </View>
        </CalendarProvider>
      </View>
      {isLoading ? (
        <View className="border-border flex-row items-center gap-2 border-t bg-card px-4 py-2">
          <ActivityIndicator size="small" />
          <Text className="text-muted-foreground text-sm">{t("pages.timeline.title")}</Text>
        </View>
      ) : null}
      {error ? (
        <View className="border-border border-t border-destructive bg-destructive/10 px-4 py-2">
          <Text className="text-destructive text-xs">{error.message}</Text>
          <Pressable
            onPress={() => refetch()}
            disabled={isFetching}
            className="mt-2 self-start rounded border border-input px-3 py-1.5"
          >
            <Text className="text-foreground">{t("common.retry")}</Text>
          </Pressable>
        </View>
      ) : null}
      {events.length > 0 ? (
        <ScrollView
          className="max-h-[40%] px-4 pb-4"
          contentContainerStyle={{ gap: 8, paddingTop: 16 }}
        >
          {events.map((ev) => (
            <EventRow
              key={ev.id}
              event={ev}
              onStart={startTracking}
              onStop={stopTracking}
              isStarting={isStarting}
              isStopping={isStopping}
              t={t}
            />
          ))}
        </ScrollView>
      ) : null}
      <Modal
        transparent
        visible={isSettingsOpen}
        animationType="fade"
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full max-w-md rounded-2xl border border-border bg-card p-4">
            <Text className="font-semibold text-foreground text-base">
              {t("pages.timeline.displayHours")}
            </Text>
            <Text className="mt-1 text-muted-foreground text-sm">
              {t("pages.timeline.displayHoursHint")}
            </Text>

            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-foreground">{t("pages.timeline.startHour")}</Text>
              <View className="flex-row items-center gap-2">
                <Pressable
                  disabled={!startCanDecrement}
                  onPress={() => startCanDecrement && setDraftStartHour((v) => v - 1)}
                  className="rounded border border-input px-3 py-1.5"
                >
                  <Text className="text-foreground">-</Text>
                </Pressable>
                <Text className="w-16 text-center text-foreground">
                  {String(draftStartHour).padStart(2, "0")}:00
                </Text>
                <Pressable
                  disabled={!startCanIncrement}
                  onPress={() => startCanIncrement && setDraftStartHour((v) => v + 1)}
                  className="rounded border border-input px-3 py-1.5"
                >
                  <Text className="text-foreground">+</Text>
                </Pressable>
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-foreground">{t("pages.timeline.endHour")}</Text>
              <View className="flex-row items-center gap-2">
                <Pressable
                  disabled={!endCanDecrement}
                  onPress={() => endCanDecrement && setDraftEndHour((v) => v - 1)}
                  className="rounded border border-input px-3 py-1.5"
                >
                  <Text className="text-foreground">-</Text>
                </Pressable>
                <Text className="w-16 text-center text-foreground">
                  {String(draftEndHour).padStart(2, "0")}:00
                </Text>
                <Pressable
                  disabled={!endCanIncrement}
                  onPress={() => endCanIncrement && setDraftEndHour((v) => v + 1)}
                  className="rounded border border-input px-3 py-1.5"
                >
                  <Text className="text-foreground">+</Text>
                </Pressable>
              </View>
            </View>

            {updatePreferencesMutation.error instanceof Error ? (
              <Text className="mt-3 text-destructive text-xs">
                {updatePreferencesMutation.error.message}
              </Text>
            ) : null}

            <View className="mt-4 flex-row justify-end gap-2">
              <Pressable
                onPress={() => setIsSettingsOpen(false)}
                className="rounded border border-input px-3 py-2"
              >
                <Text className="text-foreground">{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                disabled={
                  updatePreferencesMutation.isPending || draftEndHour <= draftStartHour
                }
                onPress={() => void saveSettings()}
                className="rounded bg-primary px-3 py-2"
              >
                <Text className="text-primary-foreground">
                  {updatePreferencesMutation.isPending
                    ? t("pages.item.saving")
                    : t("common.save")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
