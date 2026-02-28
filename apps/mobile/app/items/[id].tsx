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
import {
  useDeleteItem,
  useItem,
  useItemLinks,
  useRestoreItem,
  useUpdateItem,
} from "@/hooks/use-item";
import { useAppToast } from "@/lib/store";

type TabKey = "details" | "blocks" | "coach";
type SaveState = "idle" | "saving" | "saved" | "error";

export default function ItemDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const itemId = typeof params.id === "string" ? params.id : null;

  const { data: item, isLoading, isError, isFetching, error, refetch } = useItem(itemId);
  const { data: linksData } = useItemLinks(itemId);
  const links = linksData?.links ?? [];
  const hasLinks = links.length > 0;
  const updateItem = useUpdateItem(itemId);
  const deleteItem = useDeleteItem(itemId);
  const restoreItem = useRestoreItem(itemId);
  const showToast = useAppToast((s) => s.show);

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

  const handleBackToInbox = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
    setTimeout(() => {
      router.replace("/(tabs)/inbox");
    }, 0);
  }, [router]);

  const handleDelete = useCallback(() => {
    deleteItem.mutate(undefined, {
      onSuccess: () => {
        router.replace("/(tabs)/inbox");
        showToast({
          message: t("pages.item.deleted"),
          actionLabel: t("pages.item.undoDelete"),
          onAction: () => {
            restoreItem.mutate(undefined, {
              onSuccess: () => {
                if (itemId) {
                  router.push(`/items/${itemId}`);
                }
              },
            });
          },
        });
      },
    });
  }, [deleteItem, itemId, restoreItem, router, showToast, t]);

  if (!itemId) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-sm text-muted-foreground">{t("pages.inbox.placeholder")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" />
          <Text className="mt-2 text-sm text-muted-foreground">{t("pages.item.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !item) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-sm text-destructive">
            {error instanceof Error ? error.message : t("pages.item.loadError")}
          </Text>
          <View className="mt-4 flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                void refetch();
              }}
              className="rounded border border-input px-3 py-1.5"
              disabled={isFetching}
            >
              <Text className="text-sm text-foreground">{t("common.retry")}</Text>
            </Pressable>
            <Pressable
              onPress={handleBackToInbox}
              className="rounded border border-input px-3 py-1.5"
            >
              <Text className="text-sm text-foreground">{t("pages.item.backToInbox")}</Text>
            </Pressable>
          </View>
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
              onPress={handleBackToInbox}
              className="rounded border border-input px-3 py-1.5"
            >
              <Text className="text-sm text-foreground">{t("pages.item.backToInbox")}</Text>
            </Pressable>
            <View className="flex-row items-center gap-2">
              {saveLabel ? <Text className="text-xs text-muted-foreground">{saveLabel}</Text> : null}
              <Pressable
                onPress={handleDelete}
                className="rounded border border-destructive px-3 py-1.5"
                disabled={deleteItem.isPending}
              >
                <Text className="text-sm text-destructive">{t("pages.item.delete")}</Text>
              </Pressable>
            </View>
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
              {hasLinks ? (
                <View className="mt-4 gap-2">
                  <Text className="text-sm font-semibold text-foreground">{t("pages.item.linkedTo")}</Text>
                  {links.map((link) => (
                    <View key={link.id} className="rounded border border-border bg-card px-3 py-2">
                      <Text className="text-xs font-medium text-foreground">
                        {link.relation_type} {link.to_entity_type}:{link.to_entity_id}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="mt-4 self-start rounded-full border border-border bg-muted/40 px-2 py-1">
                  <Text className="text-[11px] text-muted-foreground">
                    {t("pages.item.noLinksBadge")}
                  </Text>
                </View>
              )}
            </ScrollView>
          ) : null}

          {activeTab === "blocks" ? (
            <View className="flex-1 min-h-0 px-2 py-2">
              <View className="flex-1 bg-background">
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
