import { View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react-native";
import { Card, CardContent } from "@/components/ui/card";
import { Text as UiText } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCalendarPreferences,
  useUpdateCalendarPreferences,
} from "@/hooks/use-calendar-preferences";
import {
  useAiPreferences,
  useUpdateAiPreferences,
} from "@/hooks/use-ai-preferences";
import { useEffect, useState } from "react";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const preferencesQuery = useCalendarPreferences();
  const updatePreferencesMutation = useUpdateCalendarPreferences();
  const aiPreferencesQuery = useAiPreferences();
  const updateAiPreferencesMutation = useUpdateAiPreferences();
  const [draftStartHour, setDraftStartHour] = useState(8);
  const [draftEndHour, setDraftEndHour] = useState(24);
  const [draftAiMode, setDraftAiMode] = useState<"proposal_only" | "auto_apply">("proposal_only");
  const [draftAutoApplyThreshold, setDraftAutoApplyThreshold] = useState(0.9);
  const [draftMaxActions, setDraftMaxActions] = useState(3);
  const [draftProviderPrefs, setDraftProviderPrefs] = useState({
    transcription: {
      provider: "mistral" as "mistral" | "openai" | "heuristic",
      model: "voxtral-mini-latest",
      language: "auto",
      fallback_enabled: true,
    },
    ocr: {
      provider: "mistral" as "mistral" | "openai" | "heuristic",
      model: "mistral-ocr-latest",
      fallback_enabled: true,
    },
    vlm: {
      provider: "mistral" as "mistral" | "openai" | "heuristic",
      model: "pixtral-12b-latest",
      fallback_enabled: true,
    },
  });

  useEffect(() => {
    if (preferencesQuery.data) {
      setDraftStartHour(preferencesQuery.data.start_hour ?? 8);
      setDraftEndHour(preferencesQuery.data.end_hour ?? 24);
    }
  }, [preferencesQuery.data]);

  useEffect(() => {
    if (aiPreferencesQuery.data) {
      setDraftAiMode(aiPreferencesQuery.data.mode);
      setDraftAutoApplyThreshold(aiPreferencesQuery.data.auto_apply_threshold ?? 0.9);
      setDraftMaxActions(aiPreferencesQuery.data.max_actions_per_capture ?? 3);
      if (aiPreferencesQuery.data.capture_provider_preferences) {
        setDraftProviderPrefs(aiPreferencesQuery.data.capture_provider_preferences);
      }
    }
  }, [aiPreferencesQuery.data]);

  const startCanDecrement = draftStartHour > 0;
  const startCanIncrement = draftStartHour < 23 && draftStartHour + 1 < draftEndHour;
  const endCanDecrement = draftEndHour - 1 > draftStartHour;
  const endCanIncrement = draftEndHour < 24;
  const thresholdCanDecrement = draftAutoApplyThreshold > 0;
  const thresholdCanIncrement = draftAutoApplyThreshold < 1;
  const maxActionsCanDecrement = draftMaxActions > 1;
  const maxActionsCanIncrement = draftMaxActions < 3;

  const saveSettings = async () => {
    if (draftEndHour <= draftStartHour) return;
    try {
      await updatePreferencesMutation.mutateAsync({
        start_hour: draftStartHour,
        end_hour: draftEndHour,
        last_known_updated_at: preferencesQuery.data?.updated_at,
      });
      await updateAiPreferencesMutation.mutateAsync({
        mode: draftAiMode,
        auto_apply_threshold: Number(draftAutoApplyThreshold.toFixed(2)),
        max_actions_per_capture: draftMaxActions,
        capture_provider_preferences: draftProviderPrefs,
        last_known_updated_at: aiPreferencesQuery.data?.updated_at,
      });
    } catch {
      await preferencesQuery.refetch();
      await aiPreferencesQuery.refetch();
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
          </CardContent>
        </Card>

        <Card className="mt-3 rounded-xl border border-border bg-card">
          <CardContent className="p-4">
            <UiText className="text-sm font-semibold text-foreground">
              {t("pages.settings.aiTitle")}
            </UiText>

            <View className="mt-4 flex-row items-center justify-between">
              <UiText className="text-foreground">
                {t("pages.settings.aiMode")}
              </UiText>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setDraftAiMode("proposal_only")}
                  className={`rounded border px-3 py-1.5 ${
                    draftAiMode === "proposal_only" ? "border-primary bg-primary/15" : "border-input"
                  }`}
                >
                  <UiText className="text-foreground">
                    {t("pages.settings.aiModeProposalOnly")}
                  </UiText>
                </Pressable>
                <Pressable
                  onPress={() => setDraftAiMode("auto_apply")}
                  className={`rounded border px-3 py-1.5 ${
                    draftAiMode === "auto_apply" ? "border-primary bg-primary/15" : "border-input"
                  }`}
                >
                  <UiText className="text-foreground">
                    {t("pages.settings.aiModeAutoApply")}
                  </UiText>
                </Pressable>
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <UiText className="text-foreground">
                {t("pages.settings.aiThreshold")}
              </UiText>
              <View className="flex-row items-center gap-2">
                <Pressable
                  disabled={!thresholdCanDecrement}
                  onPress={() =>
                    thresholdCanDecrement &&
                    setDraftAutoApplyThreshold((v) => Math.max(0, v - 0.05))
                  }
                  className="rounded border border-input px-3 py-1.5"
                >
                  <UiText className="text-foreground">-</UiText>
                </Pressable>
                <UiText className="w-16 text-center text-foreground">
                  {draftAutoApplyThreshold.toFixed(2)}
                </UiText>
                <Pressable
                  disabled={!thresholdCanIncrement}
                  onPress={() =>
                    thresholdCanIncrement &&
                    setDraftAutoApplyThreshold((v) => Math.min(1, v + 0.05))
                  }
                  className="rounded border border-input px-3 py-1.5"
                >
                  <UiText className="text-foreground">+</UiText>
                </Pressable>
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <UiText className="text-foreground">
                {t("pages.settings.aiMaxActions")}
              </UiText>
              <View className="flex-row items-center gap-2">
                <Pressable
                  disabled={!maxActionsCanDecrement}
                  onPress={() => maxActionsCanDecrement && setDraftMaxActions((v) => v - 1)}
                  className="rounded border border-input px-3 py-1.5"
                >
                  <UiText className="text-foreground">-</UiText>
                </Pressable>
                <UiText className="w-16 text-center text-foreground">
                  {draftMaxActions}
                </UiText>
                <Pressable
                  disabled={!maxActionsCanIncrement}
                  onPress={() => maxActionsCanIncrement && setDraftMaxActions((v) => v + 1)}
                  className="rounded border border-input px-3 py-1.5"
                >
                  <UiText className="text-foreground">+</UiText>
                </Pressable>
              </View>
            </View>

            {updateAiPreferencesMutation.error instanceof Error ? (
              <UiText className="mt-3 text-destructive text-xs">
                {updateAiPreferencesMutation.error.message}
              </UiText>
            ) : null}

            <View className="mt-4 flex-row justify-end">
              <Button
                size="sm"
                onPress={() => void saveSettings()}
                disabled={
                  updatePreferencesMutation.isPending ||
                  updateAiPreferencesMutation.isPending ||
                  draftEndHour <= draftStartHour
                }
              >
                <UiText>{t("common.save")}</UiText>
              </Button>
            </View>

            <View className="mt-4 rounded-lg border border-border bg-background/40 p-3">
              <UiText className="text-xs font-semibold uppercase text-muted-foreground">
                Capture Providers
              </UiText>
              {(["transcription", "ocr", "vlm"] as const).map((key) => (
                <View key={key} className="mt-3 rounded-md border border-border/70 p-3">
                  <UiText className="mb-2 text-sm font-medium capitalize text-foreground">
                    {key}
                  </UiText>
                  <View className="flex-row flex-wrap gap-2">
                    {(["mistral", "openai", "heuristic"] as const).map((provider) => (
                      <Pressable
                        key={`${key}-${provider}`}
                        onPress={() =>
                          setDraftProviderPrefs((prev) => ({
                            ...prev,
                            [key]: {
                              ...prev[key],
                              provider,
                            },
                          }))
                        }
                        className={`rounded border px-3 py-1.5 ${
                          draftProviderPrefs[key].provider === provider
                            ? "border-primary bg-primary/15"
                            : "border-input"
                        }`}
                      >
                        <UiText className="text-foreground">{provider}</UiText>
                      </Pressable>
                    ))}
                  </View>
                  <Input
                    className="mt-2"
                    value={draftProviderPrefs[key].model}
                    onChangeText={(value) =>
                      setDraftProviderPrefs((prev) => ({
                        ...prev,
                        [key]: {
                          ...prev[key],
                          model: value,
                        },
                      }))
                    }
                    placeholder={`${key} model`}
                  />
                  <View className="mt-2 flex-row gap-2">
                    <Pressable
                      onPress={() =>
                        setDraftProviderPrefs((prev) => ({
                          ...prev,
                          [key]: {
                            ...prev[key],
                            fallback_enabled: true,
                          },
                        }))
                      }
                      className={`rounded border px-3 py-1.5 ${
                        draftProviderPrefs[key].fallback_enabled
                          ? "border-primary bg-primary/15"
                          : "border-input"
                      }`}
                    >
                      <UiText className="text-foreground">Fallback on</UiText>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setDraftProviderPrefs((prev) => ({
                          ...prev,
                          [key]: {
                            ...prev[key],
                            fallback_enabled: false,
                          },
                        }))
                      }
                      className={`rounded border px-3 py-1.5 ${
                        !draftProviderPrefs[key].fallback_enabled
                          ? "border-primary bg-primary/15"
                          : "border-input"
                      }`}
                    >
                      <UiText className="text-foreground">Fallback off</UiText>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      </View>
    </SafeAreaView>
  );
}
