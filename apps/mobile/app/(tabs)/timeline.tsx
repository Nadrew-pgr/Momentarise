import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { CalendarProvider, TimelineList } from "react-native-calendars";
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
  const { data, isLoading, error } = useTimeline(date);
  const { startTracking, stopTracking, isStarting, isStopping } = useTracking();

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-destructive">{error.message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !data) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" />
          <Text className="mt-2 text-xl font-semibold text-foreground">
            {t("pages.timeline.title")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { events } = data;
  const eventsByDate = eventsToCalendarFormat(data);

  if (events.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-semibold text-foreground">
            {t("pages.timeline.title")}
          </Text>
          <Text className="mt-2 text-center text-muted-foreground">
            {t("pages.timeline.emptyDay")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const timelineProps = {
    format24h: true,
    start: 0,
    end: 24,
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
    <View className="flex-1">
      <CalendarProvider date={date}>
        <View style={{ height: 320 }}>
          <TimelineList
            events={eventsByDate}
            timelineProps={timelineProps}
            showNowIndicator
            scrollToFirst
          />
        </View>
      </CalendarProvider>
      <ScrollView
        className="flex-1 px-4 pb-4"
        contentContainerStyle={{ gap: 8, paddingTop: 16 }}
      >
        <Text className="text-lg font-semibold text-foreground">
          {t("pages.timeline.title")} — {data.date}
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
