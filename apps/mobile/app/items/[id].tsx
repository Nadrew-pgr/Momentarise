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
import { businessBlockTypeValues, type ProseMirrorNode } from "@momentarise/shared";
import { BlockEditor } from "@/components/BlockEditor";
import {
  useDeleteItem,
  useItem,
  useItemLinks,
  useRestoreItem,
  useUpdateItem,
} from "@/hooks/use-item";
import { useAppToast } from "@/lib/store";

type SaveState = "idle" | "saving" | "saved" | "error";
const BUSINESS_BLOCK_TYPE_SET = new Set<string>(businessBlockTypeValues);

function isBusinessBlocksPayload(value: unknown): value is Array<{ type: string; payload: Record<string, unknown> }> {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const block = entry as Record<string, unknown>;
    return (
      typeof block.type === "string" &&
      BUSINESS_BLOCK_TYPE_SET.has(block.type) &&
      !!block.payload &&
      typeof block.payload === "object"
    );
  });
}

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
  const isBusinessItem = useMemo(() => isBusinessBlocksPayload(item?.blocks), [item?.blocks]);

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
    router.replace("/(tabs)/inbox");
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

          <View className="px-4 py-4 border-b border-border">
            <Text className="text-base font-semibold text-foreground">{item.title}</Text>
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
            ) : null}
          </View>

          <View className="flex-1 min-h-0 bg-background px-2 py-2">
            {isBusinessItem ? (
              <ScrollView className="flex-1 rounded border border-border bg-muted/20 p-3">
                <Text className="text-sm text-muted-foreground">
                  This item now uses Moment business blocks. Edit it from Moment {">"} Contenu.
                </Text>
                <Text className="mt-3 text-xs text-foreground">
                  {JSON.stringify(item.blocks, null, 2)}
                </Text>
              </ScrollView>
            ) : (
              <BlockEditor value={item.blocks} onChange={scheduleSave} editable enableAI />
            )}
          </View>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}
