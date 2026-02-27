import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { CalendarProvider, Timeline, TimelineList } from "react-native-calendars";
import type { TimelineListRenderItemInfo, TimelineProps } from "react-native-calendars";
import { useTimeline } from "@/hooks/use-timeline";
import { useTracking } from "@/hooks/use-tracking";
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
  const date = todayYYYYMMDD();
  const { data, isLoading, error, refetch, isFetching } = useTimeline(date);
  const { startTracking, stopTracking, isStarting, isStopping } = useTracking();
  const events = data?.events ?? [];
  const eventsByDate = data ? eventsToCalendarFormat(data) : { [date]: [] };

  const timelineProps = {
    format24h: true,
    start: 0,
    end: 24,
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1">
        <CalendarProvider date={date}>
          <View style={{ height: 360 }}>
            <TimelineList
              events={eventsByDate}
              timelineProps={timelineProps}
              showNowIndicator
              scrollToFirst
              renderItem={(props: TimelineProps, info: TimelineListRenderItemInfo) => {
                // Workaround for react-native-calendars passing `key` inside spread props.
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
            {events.length === 0 ? (
              <View className="pointer-events-none absolute inset-0 items-center justify-center">
                <View className="rounded-lg border border-border bg-background/90 px-4 py-2">
                  <Text className="text-sm text-muted-foreground">
                    {t("pages.timeline.emptyDay")}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </CalendarProvider>
        <ScrollView
          className="flex-1 px-4 pb-4"
          contentContainerStyle={{ gap: 8, paddingTop: 16 }}
        >
          {isLoading ? (
            <View className="flex-row items-center gap-2 rounded border border-border bg-card px-3 py-2">
              <ActivityIndicator size="small" />
              <Text className="text-sm text-muted-foreground">{t("pages.timeline.title")}</Text>
            </View>
          ) : null}
          {error ? (
            <View className="rounded border border-destructive bg-destructive/10 px-3 py-2">
              <Text className="text-xs text-destructive">{error.message}</Text>
              <Pressable
                onPress={() => refetch()}
                disabled={isFetching}
                className="mt-2 self-start rounded border border-input px-3 py-1.5"
              >
                <Text className="text-foreground">{t("common.retry")}</Text>
              </Pressable>
            </View>
          ) : null}
          <Text className="text-lg font-semibold text-foreground">
            {t("pages.timeline.title")} — {data?.date ?? date}
          </Text>
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
      </View>
    </SafeAreaView>
  );
}
