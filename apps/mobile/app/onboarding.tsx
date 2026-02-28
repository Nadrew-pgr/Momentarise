import { useMemo, useState, type ComponentType } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { CalendarDays, Inbox, Sparkles } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Text as UiText } from "@/components/ui/text";
import { setOnboardingCompleted } from "@/lib/auth";
import { useAuthStore } from "@/lib/store";

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ size?: number; color?: string }>;
};

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setHasCompletedOnboarding = useAuthStore((s) => s.setHasCompletedOnboarding);
  const [stepIndex, setStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const steps = useMemo<OnboardingStep[]>(
    () => [
      {
        id: "capture",
        title: t("pages.onboarding.steps.capture.title"),
        description: t("pages.onboarding.steps.capture.description"),
        icon: Inbox,
      },
      {
        id: "timeline",
        title: t("pages.onboarding.steps.timeline.title"),
        description: t("pages.onboarding.steps.timeline.description"),
        icon: CalendarDays,
      },
      {
        id: "sync",
        title: t("pages.onboarding.steps.sync.title"),
        description: t("pages.onboarding.steps.sync.description"),
        icon: Sparkles,
      },
    ],
    [t]
  );

  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  async function finishOnboarding() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await setOnboardingCompleted(true);
      setHasCompletedOnboarding(true);
      router.replace("/(tabs)/today");
    } finally {
      setIsSaving(false);
    }
  }

  function nextStep() {
    if (isLastStep) {
      void finishOnboarding();
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 px-6 pb-8 pt-6">
        <View className="flex-row justify-end">
          <Button
            variant="ghost"
            size="sm"
            disabled={isSaving}
            onPress={() => void finishOnboarding()}
          >
            <UiText>{t("pages.onboarding.skip")}</UiText>
          </Button>
        </View>

        <View className="flex-1 items-center justify-center">
          <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <step.icon size={30} color="#171717" />
          </View>
          <UiText className="text-center text-2xl font-semibold text-foreground">
            {step.title}
          </UiText>
          <UiText className="mt-3 text-center text-base text-muted-foreground">
            {step.description}
          </UiText>
        </View>

        <View className="mb-6 flex-row items-center justify-center gap-2">
          {steps.map((item, idx) => (
            <View
              key={item.id}
              className={`h-2 rounded-full ${idx === stepIndex ? "w-6 bg-foreground" : "w-2 bg-border"}`}
            />
          ))}
        </View>

        <Button onPress={nextStep} disabled={isSaving}>
          <UiText>
            {isLastStep
              ? t("pages.onboarding.getStarted")
              : t("pages.onboarding.next")}
          </UiText>
        </Button>
      </View>
    </SafeAreaView>
  );
}
