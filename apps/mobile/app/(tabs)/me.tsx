import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { logout } from "@/lib/auth";
import { useAuthStore } from "@/lib/store";
import { queryClient } from "@/lib/query-client";

export default function MeScreen() {
  const { t } = useTranslation();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  async function handleLogout() {
    await logout();
    queryClient.clear();
    setAuthenticated(false);
  }

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-2xl font-bold text-foreground">
        {t("pages.me.title")}
      </Text>
      <Text className="mt-2 text-center text-muted-foreground">
        {t("pages.me.placeholder")}
      </Text>
      <TouchableOpacity
        className="mt-8 rounded-lg border border-destructive px-6 py-3"
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text className="font-medium text-destructive">{t("auth.logout")}</Text>
      </TouchableOpacity>
    </View>
  );
}
