import { View, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useState, useCallback, useMemo } from "react";
import {
  Calendar,
  CalendarProvider,
  Timeline,
  TimelineList,
} from "react-native-calendars";
import type {
  TimelineListProps,
  TimelineListRenderItemInfo,
  TimelineProps,
  TimelinePackedEventProps,
} from "react-native-calendars";
import { Calendar as CalendarIcon, CalendarDays, CalendarRange } from "lucide-react-native";
import { useEventsRange } from "@/hooks/use-events";
import { useCalendarPreferences } from "@/hooks/use-calendar-preferences";
import type { CalendarEvent } from "@/lib/adapters/calendarAdapter";
import { eventsListToCalendarFormat } from "@/lib/adapters/calendarAdapter";
import { useEventSheet } from "@/lib/store";
import { Text as UiText } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type TimelineView = "day" | "week" | "month";
const TIMELINE_VIEW_ORDER: TimelineView[] = ["day", "week", "month"];

function formatYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatRangeTitle(date: Date, view: TimelineView): string {
  if (view === "day") {
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  if (view === "week") {
    const start = startOfWeek(date);
    const end = endOfWeek(date);
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const endLabel = end.toLocaleDateString(undefined, {
      month: sameMonth ? undefined : "short",
      day: "numeric",
    });
    return `${startLabel}–${endLabel}`;
  }
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function parseEventDate(value: string): Date {
  return new Date(value.replace(" ", "T"));
}

export default function TimelineScreen() {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<TimelineView>("day");
  const openEventSheet = useEventSheet((s) => s.open);

  const preferencesQuery = useCalendarPreferences();
  const startHour = preferencesQuery.data?.start_hour ?? 8;
  const endHour = preferencesQuery.data?.end_hour ?? 24;

  const range = useMemo(() => {
    if (view === "day") {
      return { from: currentDate, to: currentDate };
    }
    if (view === "week") {
      return { from: startOfWeek(currentDate), to: endOfWeek(currentDate) };
    }
    return { from: startOfMonth(currentDate), to: endOfMonth(currentDate) };
  }, [currentDate, view]);

  const { data, isLoading, error, refetch, isFetching } = useEventsRange(
    formatYMD(range.from),
    formatYMD(range.to)
  );

  const handleEventPress = useCallback(
    (event: { id?: string }) => {
      const id = event?.id;
      if (!id) return;
      const found = data?.events?.find((e) => e.id === id);
      if (found) {
        openEventSheet({
          id: found.id,
          title: found.title,
          description: "",
          location: "",
          start: new Date(found.start_at),
          end: new Date(found.end_at),
          allDay: false,
          color: found.color,
          isTracking: found.is_tracking,
          updatedAt: found.updated_at,
        });
      }
    },
    [data?.events, openEventSheet]
  );

  const baseEventsByDate: Record<string, CalendarEvent[]> = data
    ? eventsListToCalendarFormat(data.events, formatYMD(currentDate))
    : {};
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = { ...baseEventsByDate };
    if (view !== "month") {
      const start = view === "day" ? currentDate : startOfWeek(currentDate);
      const days = view === "day" ? 1 : 7;
      for (let i = 0; i < days; i += 1) {
        const key = formatYMD(addDays(start, i));
        if (!map[key]) map[key] = [];
      }
    }
    return map;
  }, [baseEventsByDate, currentDate, view]);

  const timelineProps: NonNullable<TimelineListProps["timelineProps"]> = {
    format24h: true,
    start: startHour,
    end: endHour,
    numberOfDays: view === "week" ? 7 : 1,
    onEventPress: handleEventPress,
    overlapEventsSpacing: 4,
    timelineLeftInset: 56,
    theme: {
      timeLabel: { color: "#737373", fontSize: 11 },
      line: { backgroundColor: "#e5e7eb" },
      nowIndicatorLine: { backgroundColor: "#ef4444" },
      nowIndicatorKnob: { backgroundColor: "#ef4444" },
    },
    renderEvent: (event: TimelinePackedEventProps) => {
      const start = parseEventDate(event.start);
      const end = parseEventDate(event.end);
      const isPast = end.getTime() < Date.now();
      const timeLabel = `${start.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })}–${end.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
      return (
        <View
          style={{
            backgroundColor: event.color || "#38bdf8",
            opacity: isPast ? 0.6 : 1,
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 6,
          }}
        >
          <UiText className="text-xs font-semibold text-white" numberOfLines={1}>
            {event.title}
          </UiText>
          <UiText className="text-[10px] text-white/80" numberOfLines={1}>
            {timeLabel}
          </UiText>
        </View>
      );
    },
  };

  const headerTitle = formatRangeTitle(currentDate, view);
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      return d;
    });
  }, [currentDate]);

  const currentViewMeta = useMemo(() => {
    if (view === "week") {
      return { label: t("pages.timeline.view.week"), icon: CalendarRange };
    }
    if (view === "month") {
      return { label: t("pages.timeline.view.month"), icon: CalendarIcon };
    }
    return { label: t("pages.timeline.view.day"), icon: CalendarDays };
  }, [t, view]);

  const cycleView = useCallback(() => {
    setView((previous) => {
      const index = TIMELINE_VIEW_ORDER.indexOf(previous);
      const nextIndex = (index + 1) % TIMELINE_VIEW_ORDER.length;
      return TIMELINE_VIEW_ORDER[nextIndex];
    });
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="border-border border-b bg-background px-4 py-2">
        <View className="flex-row items-center justify-between gap-3">
          <UiText className="font-semibold text-foreground text-base flex-1" numberOfLines={1}>
            {headerTitle}
          </UiText>
          <View className="flex-row items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onPress={cycleView}
              accessibilityLabel={t("pages.timeline.toolbar.switchView", {
                view: currentViewMeta.label,
              })}
            >
              <Icon as={currentViewMeta.icon} size={16} />
              <UiText>{currentViewMeta.label}</UiText>
            </Button>
            <Button variant="outline" size="sm" onPress={() => setCurrentDate(new Date())}>
              <UiText>{t("pages.timeline.toolbar.today")}</UiText>
            </Button>
          </View>
        </View>
      </View>

      <View className="flex-1">
        {view === "month" ? (
          <Calendar
            current={formatYMD(currentDate)}
            firstDay={1}
            hideArrows
            renderHeader={() => null}
            headerStyle={{ height: 0 }}
            enableSwipeMonths
            markedDates={{
              [formatYMD(currentDate)]: {
                selected: true,
                selectedColor: "#171717",
                selectedTextColor: "#ffffff",
              },
            }}
            dayComponent={({ date, state }) => {
              if (!date) return null;
              const events = eventsByDate[date.dateString] ?? [];
              const visibleEvents = events.slice(0, 2);
              const overflow = events.length - visibleEvents.length;
              const isToday = date.dateString === formatYMD(new Date());
              const isSelected = date.dateString === formatYMD(currentDate);
              return (
                <Pressable
                  onPress={() => setCurrentDate(new Date(date.dateString))}
                  className={`m-1 rounded-lg border px-2 py-1 ${
                    isSelected ? "border-primary bg-primary/10" : "border-transparent"
                  } ${state === "disabled" ? "opacity-40" : ""}`}
                >
                  <UiText
                    className={`text-xs ${
                      isToday ? "text-primary font-semibold" : "text-foreground"
                    }`}
                  >
                    {date.day}
                  </UiText>
                  <View className="mt-1 gap-1">
                    {visibleEvents.map((ev) => (
                      <Pressable
                        key={`${date.dateString}-${ev.id}`}
                        onPress={() => ev.id && handleEventPress({ id: ev.id })}
                      >
                        <View
                          style={{ backgroundColor: ev.color || "#38bdf8" }}
                          className="rounded px-1 py-0.5"
                        >
                          <UiText className="text-[9px] text-white" numberOfLines={1}>
                            {ev.title}
                          </UiText>
                        </View>
                      </Pressable>
                    ))}
                    {overflow > 0 ? (
                      <UiText className="text-[9px] text-muted-foreground">
                        +{overflow}
                      </UiText>
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
          />
        ) : (
          <CalendarProvider
            date={formatYMD(currentDate)}
            onDateChanged={(dateString) => setCurrentDate(new Date(dateString))}
          >
            <View className="flex-1">
              {view === "week" ? (
                <View className="flex-row border-b border-border bg-background px-2 py-2">
                  {weekDays.map((day) => (
                    <View key={day.toISOString()} className="flex-1 items-center">
                      <UiText className="text-[11px] uppercase text-muted-foreground">
                        {day.toLocaleDateString(undefined, { weekday: "short" })}
                      </UiText>
                      <UiText className="text-sm text-foreground">
                        {day.getDate()}
                      </UiText>
                    </View>
                  ))}
                </View>
              ) : null}
              <TimelineList
                events={eventsByDate}
                timelineProps={timelineProps}
                showNowIndicator
                scrollToFirst
                scrollToNow
                renderItem={(props: TimelineProps, info: TimelineListRenderItemInfo) => {
                  const timelineKey =
                    (props as TimelineProps & { key?: string }).key ?? info.item;
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
                      onEventPress={handleEventPress}
                      renderEvent={props.renderEvent}
                      theme={props.theme}
                    />
                  );
                }}
              />
            </View>
          </CalendarProvider>
        )}
      </View>
      {isLoading ? (
        <View className="border-border flex-row items-center gap-2 border-t bg-card px-4 py-2">
          <ActivityIndicator size="small" />
          <UiText className="text-muted-foreground text-sm">{t("pages.timeline.title")}</UiText>
        </View>
      ) : null}
      {error ? (
        <View className="border-border border-t border-destructive bg-destructive/10 px-4 py-2">
          <UiText className="text-destructive text-xs">{error.message}</UiText>
          <Button
            variant="outline"
            size="sm"
            onPress={() => refetch()}
            disabled={isFetching}
            className="mt-2"
          >
            <UiText>{t("common.retry")}</UiText>
          </Button>
        </View>
      ) : null}

    </SafeAreaView>
  );
}
