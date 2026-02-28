import { View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react-native";
import { Card, CardContent } from "@/components/ui/card";
import { Text as UiText } from "@/components/ui/text";

export default function HelpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#737373" />
        </Pressable>
        <UiText className="text-lg font-semibold text-foreground flex-1 ml-2">
          {t("pages.me.helpSupport")}
        </UiText>
      </View>
      <View className="flex-1 px-6 pt-4">
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-4">
            <UiText className="text-muted-foreground">{t("auth.comingSoon")}</UiText>
          </CardContent>
        </Card>
      </View>
    </SafeAreaView>
  );
}
