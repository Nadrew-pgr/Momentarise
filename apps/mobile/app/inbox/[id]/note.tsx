import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  type GestureResponderEvent,
  Keyboard,
  Modal,
  Pressable,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Cloud,
  EllipsisVertical,
  Star,
} from "lucide-react-native";
import type { ProseMirrorNode } from "@momentarise/shared";
import { BlockEditor } from "@/components/BlockEditor";
import { useCaptureDetail, useDeleteCapture, useUpdateCapture } from "@/hooks/use-inbox";
import { useDeleteItemById, useItem, useUpdateItem } from "@/hooks/use-item";
import { useAppToast } from "@/lib/store";
import { AnchoredMenu, type AnchoredMenuAnchor } from "@/components/ui/anchored-menu";

type SaveState = "idle" | "saving" | "saved" | "error";

function fallbackTimestampedTitle(captureType: string, createdAt: string, locale: string): string {
  const date = new Date(createdAt);
  const datePart = date.toLocaleDateString(locale);
  const timePart = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return `${captureType} - ${datePart} ${timePart}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildFavoriteMetadata(currentMetadata: Record<string, unknown> | undefined, nextFavorite: boolean) {
  const base = isRecord(currentMetadata) ? currentMetadata : {};
  const currentNote = isRecord(base.note) ? base.note : {};
  return {
    ...base,
    note: {
      ...currentNote,
      favorite: nextFavorite,
    },
  };
}

function formatEditedAt(value: string | null | undefined, locale: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InboxCaptureNotePage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const showToast = useAppToast((state) => state.show);
  const params = useLocalSearchParams<{ id?: string | string[]; item_id?: string | string[] }>();
  const captureId = typeof params.id === "string" ? params.id : null;
  const itemIdHint = typeof params.item_id === "string" ? params.item_id : null;

  const {
    data: captureData,
    isLoading: isCaptureLoading,
    isError: isCaptureError,
    isFetching: isCaptureFetching,
    error: captureError,
    refetch: refetchCapture,
  } = useCaptureDetail(captureId);
  const capture = captureData?.capture ?? null;
  const itemId = capture?.item_id ?? itemIdHint ?? null;

  const {
    data: item,
    isLoading: isItemLoading,
    isError: isItemError,
    isFetching: isItemFetching,
    error: itemError,
    refetch: refetchItem,
  } = useItem(itemId);

  const updateCapture = useUpdateCapture();
  const deleteCapture = useDeleteCapture();
  const updateItem = useUpdateItem(itemId);
  const deleteItemById = useDeleteItemById();

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [menuAnchor, setMenuAnchor] = useState<AnchoredMenuAnchor | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (saveState !== "saved") return;
    const timer = setTimeout(() => {
      setSaveState("idle");
    }, 1600);
    return () => clearTimeout(timer);
  }, [saveState]);

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

  const goBackToCapture = useCallback(() => {
    if (captureId) {
      router.replace(`/inbox/${captureId}`);
      return;
    }
    router.replace("/(tabs)/inbox");
  }, [captureId, router]);

  const noteTitle = useMemo(() => {
    if (capture?.title?.trim()) return capture.title.trim();
    if (item?.title?.trim()) return item.title.trim();
    if (capture) return fallbackTimestampedTitle(capture.capture_type, capture.created_at, i18n.language || "en-US");
    return t("pages.inbox.noteFallbackTitle");
  }, [capture, i18n.language, item?.title, t]);

  const editedLabel = useMemo(() => {
    const formatted = formatEditedAt(item?.updated_at, i18n.language || "en-US");
    if (!formatted) return null;
    return t("pages.item.noteHeader.edited", { date: formatted });
  }, [i18n.language, item?.updated_at, t]);

  const isFavorite = useMemo(() => {
    const metadata = item?.metadata;
    if (!isRecord(metadata)) return false;
    const note = metadata.note;
    if (!isRecord(note)) return false;
    return note.favorite === true;
  }, [item?.metadata]);

  const openMenu = useCallback((event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuAnchor({
      x: pageX - 20,
      y: pageY - 20,
      width: 40,
      height: 40,
    });
    setIsMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleToggleFavorite = useCallback(async () => {
    if (!itemId || !item) return;
    setSaveState("saving");
    try {
      await updateItem.mutateAsync({
        metadata: buildFavoriteMetadata(item.metadata, !isFavorite),
      });
      setSaveState("saved");
    } catch (error) {
      console.error(error);
      setSaveState("error");
      showToast({ message: t("pages.item.noteMenu.favoriteError") });
    }
  }, [isFavorite, item, itemId, showToast, t, updateItem]);

  const openRenameModal = useCallback(() => {
    setRenameValue(noteTitle);
    setRenameModalOpen(true);
    closeMenu();
  }, [closeMenu, noteTitle]);

  const handleRenameConfirm = useCallback(async () => {
    const nextTitle = renameValue.trim();
    if (!nextTitle) {
      showToast({ message: t("pages.item.noteMenu.renameEmpty") });
      return;
    }

    const operations: Promise<unknown>[] = [];
    if (captureId) {
      operations.push(
        updateCapture.mutateAsync({
          captureId,
          payload: { title: nextTitle },
        })
      );
    }
    if (itemId) {
      operations.push(updateItem.mutateAsync({ title: nextTitle }));
    }
    if (operations.length === 0) return;

    setSaveState("saving");
    const results = await Promise.allSettled(operations);
    const failed = results.filter((result) => result.status === "rejected");

    if (failed.length === 0) {
      setSaveState("saved");
      setRenameModalOpen(false);
      showToast({ message: t("pages.item.noteMenu.renameSuccess") });
      void refetchCapture();
      if (itemId) void refetchItem();
      return;
    }

    setSaveState("error");
    showToast({
      message:
        failed.length < results.length
          ? t("pages.item.noteMenu.renamePartialError")
          : t("pages.item.noteMenu.renameError"),
    });
  }, [
    captureId,
    itemId,
    refetchCapture,
    refetchItem,
    renameValue,
    showToast,
    t,
    updateCapture,
    updateItem,
  ]);

  const performDelete = useCallback(async () => {
    if (!captureId && !itemId) return;

    setSaveState("saving");
    const operations: Promise<unknown>[] = [];
    if (captureId) {
      operations.push(deleteCapture.mutateAsync({ captureId }));
    }
    if (itemId) {
      operations.push(deleteItemById.mutateAsync({ itemId }));
    }

    const results = await Promise.allSettled(operations);
    const succeeded = results.filter((result) => result.status === "fulfilled").length;

    if (succeeded === results.length) {
      setSaveState("saved");
      showToast({ message: t("pages.item.noteMenu.deleteSuccess") });
      router.replace("/(tabs)/inbox");
      return;
    }

    if (succeeded > 0) {
      setSaveState("error");
      showToast({ message: t("pages.item.noteMenu.deletePartialError") });
      router.replace("/(tabs)/inbox");
      return;
    }

    setSaveState("error");
    showToast({ message: t("pages.item.noteMenu.deleteError") });
  }, [captureId, deleteCapture, deleteItemById, itemId, router, showToast, t]);

  const confirmDelete = useCallback(() => {
    closeMenu();
    Alert.alert(t("pages.item.noteMenu.deleteConfirmTitle"), t("pages.item.noteMenu.deleteConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("pages.item.noteMenu.delete"),
        style: "destructive",
        onPress: () => {
          void performDelete();
        },
      },
    ]);
  }, [closeMenu, performDelete, t]);

  const copyNoteLink = useCallback(async () => {
    const path = captureId
      ? `/inbox/${captureId}/note${itemId ? `?item_id=${encodeURIComponent(itemId)}` : ""}`
      : "/(tabs)/inbox";
    try {
      const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
      const deepLink = Linking.createURL(normalizedPath);
      await Share.share({ message: deepLink });
      showToast({ message: t("pages.item.noteMenu.copyLinkSuccess") });
    } catch (error) {
      console.error(error);
      showToast({ message: t("pages.item.noteMenu.copyLinkError") });
    }
    closeMenu();
  }, [captureId, closeMenu, itemId, showToast, t]);

  const menuItems = useMemo(
    () => [
      {
        key: "open-source",
        label: t("pages.item.noteMenu.openSourceCapture"),
        onPress: goBackToCapture,
      },
      {
        key: "rename",
        label: t("pages.item.noteMenu.rename"),
        onPress: openRenameModal,
      },
      {
        key: "copy-link",
        label: t("pages.item.noteMenu.copyLink"),
        onPress: () => {
          void copyNoteLink();
        },
      },
      {
        key: "delete",
        label: t("pages.item.noteMenu.delete"),
        destructive: true,
        onPress: confirmDelete,
      },
      {
        key: "duplicate",
        label: t("pages.item.noteMenu.duplicate"),
        disabled: true,
      },
      {
        key: "move-to",
        label: t("pages.item.noteMenu.moveTo"),
        disabled: true,
      },
      {
        key: "versions",
        label: t("pages.item.noteMenu.versionHistory"),
        disabled: true,
      },
      {
        key: "notifications",
        label: t("pages.item.noteMenu.notifications"),
        disabled: true,
      },
      {
        key: "analytics",
        label: t("pages.item.noteMenu.analytics"),
        disabled: true,
      },
      {
        key: "import-export",
        label: t("pages.item.noteMenu.importExport"),
        disabled: true,
      },
    ],
    [confirmDelete, copyNoteLink, goBackToCapture, openRenameModal, t]
  );

  if (!captureId) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-sm text-muted-foreground">{t("pages.inbox.placeholder")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if ((itemId && isItemLoading && !item) || (!itemId && isCaptureLoading)) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" />
          <Text className="mt-2 text-sm text-muted-foreground">{t("pages.item.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if ((isCaptureError || !capture) && !item) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-sm text-destructive">
            {captureError instanceof Error ? captureError.message : t("pages.inbox.loadError")}
          </Text>
          <View className="mt-4 flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                void refetchCapture();
              }}
              className="rounded border border-input px-3 py-1.5"
              disabled={isCaptureFetching}
            >
              <Text className="text-sm text-foreground">{t("common.retry")}</Text>
            </Pressable>
            <Pressable
              onPress={goBackToCapture}
              className="rounded border border-input px-3 py-1.5"
            >
              <Text className="text-sm text-foreground">{t("pages.inbox.openCapture")}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!itemId || isItemError || !item) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-sm text-destructive">
            {itemError instanceof Error
              ? itemError.message
              : t("pages.item.loadError")}
          </Text>
          <View className="mt-4 flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                if (itemId) {
                  void refetchItem();
                } else {
                  void refetchCapture();
                }
              }}
              className="rounded border border-input px-3 py-1.5"
              disabled={isItemFetching}
            >
              <Text className="text-sm text-foreground">{t("common.retry")}</Text>
            </Pressable>
            <Pressable
              onPress={goBackToCapture}
              className="rounded border border-input px-3 py-1.5"
            >
              <Text className="text-sm text-foreground">{t("pages.inbox.openCapture")}</Text>
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
          <View className="flex-row items-center border-b border-border px-2 py-2.5">
            <TouchableOpacity
              onPress={goBackToCapture}
              accessibilityRole="button"
              accessibilityLabel={t("pages.item.noteHeader.openCapture")}
              className="h-11 w-11 items-center justify-center rounded-full"
            >
              <ArrowLeft size={20} className="text-foreground" />
            </TouchableOpacity>

            <View className="flex-1 px-2">
              <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                {noteTitle}
              </Text>
              {editedLabel ? (
                <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                  {editedLabel}
                </Text>
              ) : null}
            </View>

            <View className="flex-row items-center gap-1 pr-1">
              {saveState !== "idle" ? (
                <View className="h-9 w-9 items-center justify-center rounded-full">
                  {saveState === "error" ? (
                    <AlertCircle size={16} className="text-destructive" />
                  ) : (
                    <View className="flex-row items-center">
                      <Cloud
                        size={16}
                        className={saveState === "saved" ? "text-emerald-600" : "text-muted-foreground"}
                      />
                      {saveState === "saved" ? <Check size={12} className="-ml-1 text-emerald-600" /> : null}
                    </View>
                  )}
                </View>
              ) : null}

              <TouchableOpacity
                onPress={() => {
                  void handleToggleFavorite();
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  isFavorite ? t("pages.item.noteMenu.unfavorite") : t("pages.item.noteMenu.favorite")
                }
                className="h-9 w-9 items-center justify-center rounded-full"
              >
                <Star
                  size={17}
                  className={isFavorite ? "text-amber-500" : "text-muted-foreground"}
                  fill={isFavorite ? "#f59e0b" : "none"}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={(event) => openMenu(event)}
                accessibilityRole="button"
                accessibilityLabel={t("pages.item.noteMenu.title")}
                className="h-9 w-9 items-center justify-center rounded-full"
              >
                <EllipsisVertical size={18} className="text-foreground" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-1 min-h-0 bg-background px-2 py-2">
            <BlockEditor value={item.blocks} onChange={scheduleSave} editable enableAI />
          </View>
        </View>
      </Pressable>

      <AnchoredMenu
        visible={isMenuOpen}
        anchor={menuAnchor}
        onClose={closeMenu}
        title={t("pages.item.noteMenu.title")}
        items={menuItems}
      />

      <Modal
        transparent
        visible={renameModalOpen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setRenameModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/45 px-5">
          <View className="w-full max-w-md rounded-2xl border border-border bg-card p-4">
            <Text className="text-base font-semibold text-foreground">
              {t("pages.item.noteMenu.renamePromptTitle")}
            </Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder={t("pages.item.noteMenu.renamePromptPlaceholder")}
              className="mt-3 rounded-lg border border-input px-3 py-2 text-foreground"
              autoFocus
            />
            <View className="mt-4 flex-row justify-end gap-2">
              <TouchableOpacity
                onPress={() => setRenameModalOpen(false)}
                className="rounded border border-input px-3 py-2"
              >
                <Text className="text-sm text-foreground">{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  void handleRenameConfirm();
                }}
                className="rounded bg-primary px-3 py-2"
              >
                <Text className="text-sm font-medium text-primary-foreground">{t("common.save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
