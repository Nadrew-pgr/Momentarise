import { View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react-native";
import { Card, CardContent } from "@/components/ui/card";
import { Text as UiText } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import {
  useCalendarPreferences,
  useUpdateCalendarPreferences,
} from "@/hooks/use-calendar-preferences";
import { useEffect, useState } from "react";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const preferencesQuery = useCalendarPreferences();
  const updatePreferencesMutation = useUpdateCalendarPreferences();
  const [draftStartHour, setDraftStartHour] = useState(8);
  const [draftEndHour, setDraftEndHour] = useState(24);

  useEffect(() => {
    if (preferencesQuery.data) {
      setDraftStartHour(preferencesQuery.data.start_hour ?? 8);
      setDraftEndHour(preferencesQuery.data.end_hour ?? 24);
    }
  }, [preferencesQuery.data]);

  const startCanDecrement = draftStartHour > 0;
  const startCanIncrement = draftStartHour < 23 && draftStartHour + 1 < draftEndHour;
  const endCanDecrement = draftEndHour - 1 > draftStartHour;
  const endCanIncrement = draftEndHour < 24;

  const saveSettings = async () => {
    if (draftEndHour <= draftStartHour) return;
    try {
      await updatePreferencesMutation.mutateAsync({
        start_hour: draftStartHour,
        end_hour: draftEndHour,
        last_known_updated_at: preferencesQuery.data?.updated_at,
      });
    } catch {
      await preferencesQuery.refetch();
    }
  };
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#737373" />
        </Pressable>
        <UiText className="text-lg font-semibold text-foreground flex-1 ml-2">
          {t("pages.me.settingsPrivacy")}
        </UiText>
      </View>
      <View className="flex-1 px-6 pt-4">
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-4">
            <UiText className="text-sm font-semibold text-foreground">
              {t("pages.settings.calendarTitle")}
            </UiText>

            <View className="mt-4 flex-row items-center justify-between">
              <UiText className="text-foreground">
                {t("pages.settings.calendarStartHour")}
              </UiText>
              <View className="flex-row items-center gap-2">
                <Pressable
                  disabled={!startCanDecrement}
                  onPress={() => startCanDecrement && setDraftStartHour((v) => v - 1)}
                  className="rounded border border-input px-3 py-1.5"
                >
                  <UiText className="text-foreground">-</UiText>
                </Pressable>
                <UiText className="w-16 text-center text-foreground">
                  {String(draftStartHour).padStart(2, "0")}:00
                </UiText>
                <Pressable
                  disabled={!startCanIncrement}
                  onPress={() => startCanIncrement && setDraftStartHour((v) => v + 1)}
                  className="rounded border border-input px-3 py-1.5"
                >
                  <UiText className="text-foreground">+</UiText>
                </Pressable>
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <UiText className="text-foreground">
                {t("pages.settings.calendarEndHour")}
              </UiText>
              <View className="flex-row items-center gap-2">
                <Pressable
                  disabled={!endCanDecrement}
                  onPress={() => endCanDecrement && setDraftEndHour((v) => v - 1)}
                  className="rounded border border-input px-3 py-1.5"
                >
                  <UiText className="text-foreground">-</UiText>
                </Pressable>
                <UiText className="w-16 text-center text-foreground">
                  {String(draftEndHour).padStart(2, "0")}:00
                </UiText>
                <Pressable
                  disabled={!endCanIncrement}
                  onPress={() => endCanIncrement && setDraftEndHour((v) => v + 1)}
                  className="rounded border border-input px-3 py-1.5"
                >
                  <UiText className="text-foreground">+</UiText>
                </Pressable>
              </View>
            </View>

            {updatePreferencesMutation.error instanceof Error ? (
              <UiText className="mt-3 text-destructive text-xs">
                {updatePreferencesMutation.error.message}
              </UiText>
            ) : null}

            <View className="mt-4 flex-row justify-end">
              <Button
                size="sm"
                onPress={() => void saveSettings()}
                disabled={
                  updatePreferencesMutation.isPending || draftEndHour <= draftStartHour
                }
              >
                <UiText>{t("common.save")}</UiText>
              </Button>
            </View>
          </CardContent>
        </Card>
      </View>
    </SafeAreaView>
  );
}
