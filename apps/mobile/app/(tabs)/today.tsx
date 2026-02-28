import { useEffect } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  Play,
  Calendar,
  Clock,
  Inbox,
} from "lucide-react-native";
import { useToday } from "@/hooks/use-today";
import { useInbox } from "@/hooks/use-inbox";
import { useMe } from "@/hooks/use-me";
import { Card, CardContent } from "@/components/ui/card";
import { Text as UiText } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function formatWeekday(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: "long" });
}

function formatShortDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function formatEventTime(startAt: string, locale: string): string {
  return new Date(startAt).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPriorityLabel(
  order: number,
  t: (key: string) => string
): string {
  switch (order) {
    case 1:
      return t("pages.today.priorityHigh");
    case 2:
      return t("pages.today.priorityMedium");
    case 3:
      return t("pages.today.priorityLow");
    default:
      return t("pages.today.priorities");
  }
}

export default function TodayScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
  const { data, isLoading, error, refetch, isFetching } = useToday();
  const { data: inboxData, isLoading: inboxLoading, refetch: refetchInbox } = useInbox();
  const { data: meData } = useMe();

  // Refetch inbox when Today is shown so the preview shows current captures
  useEffect(() => {
    refetchInbox();
  }, [refetchInbox]);

  const now = new Date();
  const weekday = formatWeekday(now, locale);
  const shortDate = formatShortDate(now, locale);
  const previewCaptures = inboxData?.captures?.slice(0, 3) ?? [];
  const inboxLoaded = !inboxLoading && inboxData !== undefined;

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-6">
          <UiText className="text-destructive">{error.message}</UiText>
          <Button
            variant="outline"
            size="sm"
            onPress={() => refetch()}
            disabled={isFetching}
            className="mt-3"
          >
            <UiText>{t("common.retry")}</UiText>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !data) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        >
          <Skeleton className="h-5 w-24 mb-1" />
          <Skeleton className="h-10 w-32 mb-6" />
          <Skeleton className="h-24 rounded-xl mb-6" />
          <Skeleton className="h-32 rounded-xl" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { priorities, next_event, next_action } = data;

  const meInitial = meData?.user?.email
    ? meData.user.email.charAt(0).toUpperCase()
    : "?";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      >
        {/* Header: date left, avatar right */}
        <View className="flex-row items-start justify-between mb-6">
          <View>
            <UiText
              className="text-primary font-semibold text-sm uppercase mb-0.5"
              numberOfLines={1}
            >
              {weekday}
            </UiText>
            <UiText
              className="text-4xl font-extrabold text-foreground"
              numberOfLines={1}
            >
              {shortDate}
            </UiText>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/me")}>
            <Avatar alt={t("pages.me.user")} style={{ width: 44, height: 44 }}>
              <AvatarFallback>
                <UiText className="text-base font-semibold text-foreground">
                  {meInitial}
                </UiText>
              </AvatarFallback>
            </Avatar>
          </Pressable>
        </View>

        {/* Daily Digest */}
        <Card className="rounded-xl border border-border bg-card p-4 mb-6">
          <CardContent className="p-0 gap-1">
            <UiText className="text-base font-semibold text-foreground">
              {t("pages.today.dailyDigest")}
            </UiText>
            <UiText className="text-sm text-muted-foreground">
              {t("pages.today.dailyDigestPlaceholder")}
            </UiText>
          </CardContent>
        </Card>

        {/* Priorities */}
        <View className="flex-row items-center justify-between mb-2">
          <UiText className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("pages.today.priorities")}
          </UiText>
          <UiText className="text-xs text-muted-foreground">
            {t("pages.today.prioritiesDone", {
              total: priorities.length,
            })}
          </UiText>
        </View>
        <View className="flex-row flex-wrap gap-3 mb-6">
          {priorities.length === 0 ? (
            <Card className="rounded-xl border border-border bg-card p-4 flex-1 min-w-full">
              <CardContent className="p-0">
                <UiText className="text-sm text-muted-foreground">
                  {t("pages.today.emptyPriorities")}
                </UiText>
              </CardContent>
            </Card>
          ) : (
            priorities.slice(0, 6).map((p) => (
              <View key={p.id} className="flex-1 min-w-[45%]">
                <Card className="rounded-xl border border-border bg-card p-4 h-32">
                  <CardContent className="p-0 flex-row flex-1">
                    <View className="w-1 h-full bg-primary rounded-full mr-3" />
                    <View className="flex-1">
                      <Badge variant="secondary" className="self-start mb-1">
                        <UiText variant="small">
                          {getPriorityLabel(p.priority_order, t)}
                        </UiText>
                      </Badge>
                      <UiText
                        className="text-sm font-medium text-foreground"
                        numberOfLines={2}
                      >
                        {p.title}
                      </UiText>
                    </View>
                  </CardContent>
                </Card>
              </View>
            ))
          )}
        </View>

        {/* Next Event */}
        <UiText className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {t("pages.today.nextEvent")}
        </UiText>
        <Card className="rounded-xl border border-border bg-card p-4 mb-6">
          <CardContent className="p-0 flex-row items-center gap-4">
            <View className="w-12 items-center">
              {next_event ? (
                <>
                  <Icon as={Clock} size={20} className="text-muted-foreground" />
                  <UiText className="text-xs text-muted-foreground mt-1">
                    {formatEventTime(next_event.start_at, locale)}
                  </UiText>
                </>
              ) : (
                <Icon as={Calendar} size={20} className="text-muted-foreground" />
              )}
            </View>
            <View className="flex-1">
              {next_event ? (
                <>
                  <UiText className="text-base font-medium text-foreground">
                    {next_event.title}
                  </UiText>
                  <UiText className="text-sm text-muted-foreground">
                    {formatEventTime(next_event.start_at, locale)}
                  </UiText>
                </>
              ) : (
                <UiText className="text-sm text-muted-foreground">
                  {t("pages.today.emptyNextEvent")}
                </UiText>
              )}
            </View>
            <Icon as={ChevronRight} size={22} className="text-muted-foreground" />
          </CardContent>
        </Card>

        {/* Next Action (hero) */}
        <Card className="rounded-xl bg-primary p-6 mb-6">
          <CardContent className="p-0 gap-2">
            <Badge variant="secondary" className="self-start bg-primary-foreground/20">
              <UiText className="text-primary-foreground text-xs font-semibold">
                {t("pages.today.focusMode")}
              </UiText>
            </Badge>
            <UiText className="text-xl font-bold text-primary-foreground">
              {next_action?.title ?? t("pages.today.emptyNextAction")}
            </UiText>
            <View className="flex-row items-center justify-between mt-2">
              <UiText className="text-sm text-primary-foreground opacity-90">
                25:00 min
              </UiText>
              <Pressable className="w-12 h-12 rounded-full bg-primary-foreground items-center justify-center">
                <Icon as={Play} size={24} className="text-primary" />
              </Pressable>
            </View>
          </CardContent>
        </Card>

        {/* Inbox Preview */}
        <View className="flex-row items-center justify-between mb-2">
          <UiText className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("pages.today.inboxPreview")}
          </UiText>
          <Pressable onPress={() => router.replace("/(tabs)/inbox")}>
            <UiText className="text-sm font-medium text-primary">
              {t("pages.today.viewAll")}
            </UiText>
          </Pressable>
        </View>
        <View className="gap-2">
          {!inboxLoaded ? (
            <Card className="rounded-lg border border-border bg-card p-3">
              <CardContent className="p-0 flex-row items-center gap-3">
                <Icon as={Inbox} size={18} className="text-muted-foreground" />
                <Skeleton className="h-4 flex-1 rounded" />
              </CardContent>
            </Card>
          ) : previewCaptures.length === 0 ? (
            <Pressable onPress={() => router.replace("/(tabs)/inbox")}>
              <Card className="rounded-lg border border-border bg-card p-3">
                <CardContent className="p-0 flex-row items-center gap-3">
                  <Icon as={Inbox} size={18} className="text-muted-foreground" />
                  <UiText className="text-sm text-muted-foreground flex-1">
                    {t("pages.inbox.emptyList")}
                  </UiText>
                </CardContent>
              </Card>
            </Pressable>
          ) : (
            previewCaptures.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => router.replace("/(tabs)/inbox")}
              >
                <Card className="rounded-lg border border-border bg-card p-3">
                  <CardContent className="p-0 flex-row items-center gap-3">
                    <View className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <UiText
                      className="text-sm text-foreground flex-1"
                      numberOfLines={1}
                    >
                      {c.raw_content?.trim() || t("pages.inbox.emptyCapture")}
                    </UiText>
                    <UiText className="text-xs text-muted-foreground">
                      {t("pages.today.now")}
                    </UiText>
                  </CardContent>
                </Card>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
