import { View, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react-native";
import { Card, CardContent } from "@/components/ui/card";
import { Text as UiText } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppToast } from "@/lib/store";
import {
  useAiPreferences,
  useUpdateAiPreferences,
} from "@/hooks/use-ai-preferences";
import { useEffect, useState } from "react";

const PROVIDER_KEYS = ["transcription", "ocr", "vlm"] as const;
const PROVIDER_LABELS: Record<(typeof PROVIDER_KEYS)[number], string> = {
  transcription: "pages.settings.providerTranscription",
  ocr: "pages.settings.providerOcr",
  vlm: "pages.settings.providerVlm",
};

const defaultProviderPrefs = {
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
};

export default function SettingsAiScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useAppToast((s) => s.show);
  const aiPreferencesQuery = useAiPreferences();
  const updateAiPreferencesMutation = useUpdateAiPreferences();
  const [draftAiMode, setDraftAiMode] = useState<"proposal_only" | "auto_apply">("proposal_only");
  const [draftAutoApplyThreshold, setDraftAutoApplyThreshold] = useState(0.9);
  const [draftMaxActions, setDraftMaxActions] = useState(3);
  const [draftProviderPrefs, setDraftProviderPrefs] = useState(defaultProviderPrefs);

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

  const thresholdCanDecrement = draftAutoApplyThreshold > 0;
  const thresholdCanIncrement = draftAutoApplyThreshold < 1;
  const maxActionsCanDecrement = draftMaxActions > 1;
  const maxActionsCanIncrement = draftMaxActions < 3;

  const saveSettings = async () => {
    try {
      await updateAiPreferencesMutation.mutateAsync({
        mode: draftAiMode,
        auto_apply_threshold: Number(draftAutoApplyThreshold.toFixed(2)),
        max_actions_per_capture: draftMaxActions,
        capture_provider_preferences: draftProviderPrefs,
        last_known_updated_at: aiPreferencesQuery.data?.updated_at,
      });
      showToast({ message: t("pages.settings.saved") });
    } catch {
      await aiPreferencesQuery.refetch();
    }
  };

  const isPending = updateAiPreferencesMutation.isPending;

  if (aiPreferencesQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft size={24} color="#737373" />
          </Pressable>
          <UiText className="text-lg font-semibold text-foreground flex-1 ml-2">
            {t("pages.settings.aiTitle")}
          </UiText>
        </View>
        <View className="flex-1 px-4 pt-4 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#737373" />
        </Pressable>
        <UiText className="text-lg font-semibold text-foreground flex-1 ml-2">
          {t("pages.settings.aiTitle")}
        </UiText>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
      >
        {/* Carte 1 — Comportement IA */}
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-4">
            <UiText className="text-xs text-muted-foreground">
              {t("pages.settings.aiBehaviorSubtitle")}
            </UiText>

            <View className="mt-4">
              <UiText className="text-sm font-medium text-foreground">
                {t("pages.settings.aiMode")}
              </UiText>
              <UiText className="text-xs text-muted-foreground mt-0.5">
                {t("pages.settings.aiModeHelp")}
              </UiText>
              <View className="mt-2 flex-row gap-2">
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

            <View className="mt-4 flex-row items-center justify-between">
              <View>
                <UiText className="text-sm font-medium text-foreground">
                  {t("pages.settings.aiThreshold")}
                </UiText>
                <UiText className="text-xs text-muted-foreground mt-0.5">
                  {t("pages.settings.aiThresholdHelp")}
                </UiText>
              </View>
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

            <View className="mt-4 flex-row items-center justify-between">
              <View>
                <UiText className="text-sm font-medium text-foreground">
                  {t("pages.settings.aiMaxActions")}
                </UiText>
                <UiText className="text-xs text-muted-foreground mt-0.5">
                  {t("pages.settings.aiMaxActionsHelp")}
                </UiText>
              </View>
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
                disabled={isPending}
              >
                <UiText>{t("common.save")}</UiText>
              </Button>
            </View>
          </CardContent>
        </Card>

        {/* Carte 2 — Providers de capture */}
        <Card className="mt-4 rounded-xl border border-border bg-card">
          <CardContent className="p-4">
            <UiText className="text-xs font-semibold uppercase text-muted-foreground">
              {t("pages.settings.captureProviders")}
            </UiText>
            {PROVIDER_KEYS.map((key) => (
              <View key={key} className="mt-4 rounded-lg border border-border/70 p-3">
                <UiText className="mb-2 text-sm font-medium text-foreground">
                  {t(PROVIDER_LABELS[key])}
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
                  placeholder={t("pages.settings.modelPlaceholder", {
                    type: t(PROVIDER_LABELS[key]),
                  })}
                />
                <View className="mt-2 flex-row items-center justify-between">
                  <UiText className="text-sm text-foreground">
                    {t("pages.settings.fallbackLabel")}
                  </UiText>
                  <Switch
                    checked={draftProviderPrefs[key].fallback_enabled}
                    onCheckedChange={(checked) =>
                      setDraftProviderPrefs((prev) => ({
                        ...prev,
                        [key]: {
                          ...prev[key],
                          fallback_enabled: checked,
                        },
                      }))
                    }
                  />
                </View>
              </View>
            ))}
            <View className="mt-4 flex-row justify-end">
              <Button
                size="sm"
                onPress={() => void saveSettings()}
                disabled={isPending}
              >
                <UiText>{t("common.save")}</UiText>
              </Button>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
