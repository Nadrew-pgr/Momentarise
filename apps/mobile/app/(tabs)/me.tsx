import { View, ScrollView, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  FolderOpen,
  Brain,
  Zap,
  Settings,
  HelpCircle,
  ChevronRight,
  Sparkles,
  QrCode,
} from "lucide-react-native";
import { useMe } from "@/hooks/use-me";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Text as UiText } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";

function RowCard({
  icon: Icon,
  iconColor = "#737373",
  label,
  onPress,
  opacity60 = false,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconColor?: string;
  label: string;
  onPress: () => void;
  opacity60?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-xl border border-border bg-card p-4 flex-row items-center gap-3 ${opacity60 ? "opacity-60" : ""}`}
    >
      <View className="w-9 h-9 rounded-lg bg-muted items-center justify-center">
        <Icon size={20} color={iconColor} />
      </View>
      <Text className="flex-1 text-base font-medium text-foreground">{label}</Text>
      <ChevronRight size={22} color="#737373" />
    </Pressable>
  );
}

export default function MeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useMe();

  const displayName = data?.user?.email
    ? data.user.email.split("@")[0]
    : t("pages.me.user");
  const initial = data?.user?.email
    ? data.user.email.charAt(0).toUpperCase()
    : "?";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      >
        <Text className="text-2xl font-bold text-foreground mb-1">
          {t("pages.me.title")}
        </Text>

        {/* Profile card: tap -> profile page (info + logout) */}
        {error ? (
          <Card className="rounded-xl py-4 mt-4">
            <CardContent className="gap-2 px-4">
              <UiText className="text-destructive">{error.message}</UiText>
              <Button variant="outline" size="sm" onPress={() => refetch()}>
                <UiText>{t("common.retry")}</UiText>
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card className="rounded-xl p-4 mt-4">
            <View className="flex-row items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-full" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-44" />
              </View>
            </View>
          </Card>
        ) : (
          <Pressable onPress={() => router.push("/profile")}>
            <Card className="rounded-xl p-4 mt-4 border border-border shadow-sm">
              <View className="flex-row items-center justify-between gap-4">
                <View className="flex-row items-center gap-4 flex-1">
                  <Avatar alt={t("pages.me.user")} style={{ width: 56, height: 56 }}>
                    <AvatarFallback>
                      <UiText className="text-lg font-semibold text-foreground">
                        {initial}
                      </UiText>
                    </AvatarFallback>
                  </Avatar>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">
                      {displayName}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {data?.user?.email ?? ""}
                    </Text>
                  </View>
                </View>
                <View className="w-9 h-9 rounded-full bg-muted items-center justify-center">
                  <QrCode size={20} color="#737373" />
                </View>
              </View>
            </Card>
          </Pressable>
        )}

        {/* WORKSPACE: Projects, Memory, Automation - one card per row */}
        <Text className="text-xs uppercase tracking-wider text-muted-foreground mt-6 mb-2">
          {t("pages.me.workspace")}
        </Text>
        <View className="gap-2">
          <RowCard
            icon={FolderOpen}
            iconColor="#171717"
            label={t("pages.me.projects")}
            onPress={() => {}}
            opacity60
          />
          <RowCard
            icon={Brain}
            label={t("pages.me.memory")}
            onPress={() => {}}
            opacity60
          />
          <RowCard
            icon={Zap}
            label={t("pages.me.automation")}
            onPress={() => {}}
            opacity60
          />
        </View>

        {/* SYSTEM - one card per row */}
        <Text className="text-xs uppercase tracking-wider text-muted-foreground mt-6 mb-2">
          {t("pages.me.system")}
        </Text>
        <View className="gap-2">
          <RowCard
            icon={Settings}
            label={t("pages.me.settingsPrivacy")}
            onPress={() => router.push("/settings")}
          />
          <RowCard
            icon={HelpCircle}
            label={t("pages.me.helpSupport")}
            onPress={() => router.push("/help")}
          />
        </View>

        {/* Activity log - one card */}
        <Pressable className="opacity-60 mt-4">
          <Card className="rounded-xl p-4 border border-border shadow-sm">
            <View className="flex-row items-center gap-4">
              <View className="w-11 h-11 rounded-full bg-primary/20 items-center justify-center">
                <Sparkles size={22} color="#171717" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-semibold text-foreground">
                    {t("pages.me.activityLog")}
                  </Text>
                  <View className="w-2 h-2 rounded-full bg-primary" />
                </View>
                <Text className="text-sm text-muted-foreground mt-0.5">
                  {t("pages.me.activityLogSubtitle")}
                </Text>
              </View>
              <ChevronRight size={22} color="#737373" />
            </View>
          </Card>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
