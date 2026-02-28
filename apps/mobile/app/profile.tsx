import { View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react-native";
import { logout } from "@/lib/auth";
import { useAuthStore } from "@/lib/store";
import { queryClient } from "@/lib/query-client";
import { useMe } from "@/hooks/use-me";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Text as UiText } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const { data, isLoading, error, refetch } = useMe();

  async function handleLogout() {
    await logout();
    queryClient.clear();
    setAuthenticated(false);
  }

  const displayName = data?.user?.email
    ? data.user.email.split("@")[0]
    : t("pages.me.user");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.replace("/(tabs)/me")} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#737373" />
        </Pressable>
        <UiText className="text-lg font-semibold text-foreground flex-1 ml-2">
          {t("pages.profile.title")}
        </UiText>
      </View>

      <View className="p-4 gap-4">
        {error ? (
          <Card className="p-4">
            <CardContent className="gap-2">
              <UiText className="text-destructive">{error.message}</UiText>
              <Button variant="outline" size="sm" onPress={() => refetch()}>
                <UiText className="text-foreground">{t("common.retry")}</UiText>
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card className="p-4">
            <View className="gap-4">
              <View className="gap-1">
                <UiText className="text-xs text-muted-foreground">
                  {t("pages.profile.name")}
                </UiText>
                <Skeleton className="h-5 w-40" />
              </View>
              <View className="gap-1">
                <UiText className="text-xs text-muted-foreground">
                  {t("pages.profile.email")}
                </UiText>
                <Skeleton className="h-5 w-56" />
              </View>
            </View>
          </Card>
        ) : (
          <Card className="p-4">
            <View className="gap-4">
              <View className="gap-1">
                <UiText className="text-xs text-muted-foreground">
                  {t("pages.profile.name")}
                </UiText>
                <UiText className="text-base font-medium text-foreground">{displayName}</UiText>
              </View>
              <View className="gap-1">
                <UiText className="text-xs text-muted-foreground">
                  {t("pages.profile.email")}
                </UiText>
                <UiText className="text-base text-foreground">{data?.user?.email ?? ""}</UiText>
              </View>
            </View>
          </Card>
        )}

        <Button variant="destructive" onPress={handleLogout}>
          <UiText>{t("auth.logout")}</UiText>
        </Button>
      </View>
    </SafeAreaView>
  );
}
