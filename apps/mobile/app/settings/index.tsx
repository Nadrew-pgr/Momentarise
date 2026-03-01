import { View, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Calendar, Sparkles, ChevronRight } from "lucide-react-native";
import { Text as UiText } from "@/components/ui/text";

function SettingsRow({
  icon: Icon,
  label,
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-xl border border-border bg-card p-4 flex-row items-center gap-3"
    >
      <View className="w-9 h-9 rounded-lg bg-muted items-center justify-center">
        <Icon size={20} color="#737373" />
      </View>
      <UiText className="flex-1 text-base font-medium text-foreground">{label}</UiText>
      <ChevronRight size={22} color="#737373" />
    </Pressable>
  );
}

export default function SettingsIndexScreen() {
  const { t } = useTranslation();
  const router = useRouter();

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
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      >
        <View className="gap-2 mt-2">
          <SettingsRow
            icon={Calendar}
            label={t("pages.settings.calendarTitle")}
            onPress={() => router.push("/settings/calendar")}
          />
          <SettingsRow
            icon={Sparkles}
            label={t("pages.settings.aiTitle")}
            onPress={() => router.push("/settings/ai")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
