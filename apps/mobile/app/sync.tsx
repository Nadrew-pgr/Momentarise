import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

export default function SyncScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-semibold text-foreground">{t("pages.sync.title")}</Text>
        <Text className="mt-2 text-center text-muted-foreground">
          {t("pages.sync.placeholder")}
        </Text>
      </View>
    </SafeAreaView>
  );
}
