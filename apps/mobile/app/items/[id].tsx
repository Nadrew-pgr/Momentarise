import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ProseMirrorNode } from "@momentarise/shared";
import { BlockEditor } from "@/components/BlockEditor";
import { useItem, useUpdateItem } from "@/hooks/use-item";

type TabKey = "details" | "blocks" | "coach";
type SaveState = "idle" | "saving" | "saved" | "error";

export default function ItemDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const itemId = typeof params.id === "string" ? params.id : null;

  const { data: item, isLoading } = useItem(itemId);
  const updateItem = useUpdateItem(itemId);

  const [activeTab, setActiveTab] = useState<TabKey>("blocks");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  const saveLabel = useMemo(() => {
    if (saveState === "saving") return t("pages.item.saving");
    if (saveState === "saved") return t("pages.item.saved");
    if (saveState === "error") return t("pages.item.saveError");
    return null;
  }, [saveState, t]);

  const scheduleSave = useCallback(
    (blocks: ProseMirrorNode[]) => {
      if (!itemId) return;
      setSaveState("saving");

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        updateItem.mutate(
          { blocks },
          {
            onSuccess: () => setSaveState("saved"),
            onError: () => setSaveState("error"),
          }
        );
      }, 700);
    },
    [itemId, updateItem]
  );

  if (!itemId) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-sm text-muted-foreground">{t("pages.inbox.placeholder")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !item) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" />
          <Text className="mt-2 text-sm text-muted-foreground">{t("pages.inbox.placeholder")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Pressable className="flex-1" onPress={Keyboard.dismiss}>
        <View className="flex-1">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Pressable
              onPress={() => router.replace("/(tabs)/inbox")}
              className="rounded border border-input px-3 py-1.5"
            >
              <Text className="text-sm text-foreground">{t("pages.item.backToInbox")}</Text>
            </Pressable>
            {saveLabel ? <Text className="text-xs text-muted-foreground">{saveLabel}</Text> : null}
          </View>

          <View className="flex-row border-b border-border">
            {([
              { key: "details", label: t("pages.item.details") },
              { key: "blocks", label: t("pages.item.blocks") },
              { key: "coach", label: t("pages.item.coach") },
            ] as { key: TabKey; label: string }[]).map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 ${activeTab === tab.key ? "border-b-2 border-primary" : ""}`}
              >
                <Text
                  className={`text-center text-sm font-medium ${
                    activeTab === tab.key ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {activeTab === "details" ? (
            <ScrollView className="flex-1 px-4 py-4" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
              <Text className="text-base font-semibold text-foreground">{item.title}</Text>
              <Text className="mt-1 text-xs text-muted-foreground">ID: {item.id}</Text>
            </ScrollView>
          ) : null}

          {activeTab === "blocks" ? (
            <View className="flex-1 min-h-0 px-4 py-4">
              <View className="flex-1 rounded-lg border border-input bg-background">
                <BlockEditor value={item.blocks} onChange={scheduleSave} editable />
              </View>
            </View>
          ) : null}

          {activeTab === "coach" ? (
            <View className="flex-1 items-center justify-center px-4">
              <Text className="text-center text-sm text-muted-foreground">
                {t("pages.item.coachPlaceholder")}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </SafeAreaView>
  );
}
