import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";

export default function InboxScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-2xl font-bold text-foreground">
        {t("pages.inbox.title")}
      </Text>
      <Text className="mt-2 text-center text-muted-foreground">
        {t("pages.inbox.placeholder")}
      </Text>
    </View>
  );
}
