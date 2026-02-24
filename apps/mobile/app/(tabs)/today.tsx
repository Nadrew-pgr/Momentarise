import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useToday } from "@/hooks/use-today";

export default function TodayScreen() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useToday();

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
            {t("pages.today.title")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { priorities, next_event, next_action } = data;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
    <ScrollView
      className="flex-1"
      contentContainerClassName="p-4 gap-4"
    >
      <Text className="text-2xl font-semibold text-foreground">
        {t("pages.today.title")}
      </Text>

      <View className="rounded-lg border border-border bg-card p-4">
        <Text className="text-base font-medium text-foreground">
          {t("pages.today.priorities")}
        </Text>
        <View className="mt-2">
          {priorities.length === 0 ? (
            <Text className="text-muted-foreground text-sm">
              {t("pages.today.emptyPriorities")}
            </Text>
          ) : (
            priorities.map((p, i) => (
              <Text key={p.id} className="text-foreground text-sm">
                {i + 1}. {p.title}
              </Text>
            ))
          )}
        </View>
      </View>

      <View className="rounded-lg border border-border bg-card p-4">
        <Text className="text-base font-medium text-foreground">
          {t("pages.today.nextEvent")}
        </Text>
        <View className="mt-2">
          {next_event ? (
            <Text className="text-foreground text-sm">
              {next_event.title} —{" "}
              {new Date(next_event.start_at).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          ) : (
            <Text className="text-muted-foreground text-sm">
              {t("pages.today.emptyNextEvent")}
            </Text>
          )}
        </View>
      </View>

      <View className="rounded-lg border border-border bg-card p-4">
        <Text className="text-base font-medium text-foreground">
          {t("pages.today.nextAction")}
        </Text>
        <View className="mt-2">
          {next_action ? (
            <Text className="text-foreground text-sm">{next_action.title}</Text>
          ) : (
            <Text className="text-muted-foreground text-sm">
              {t("pages.today.emptyNextAction")}
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
