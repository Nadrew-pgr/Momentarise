import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Camera, FileText, Link2, Mic, Search } from "lucide-react-native";
import type { CaptureType } from "@momentarise/shared";
import {
  useApplyCapture,
  useDeleteCapture,
  useInbox,
  usePreviewCapture,
  useProcessCapture,
  useRestoreCapture,
} from "@/hooks/use-inbox";
import { useDeleteItemById, useItems, useRestoreItemById } from "@/hooks/use-item";
import { useAppToast } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Text as UiText } from "@/components/ui/text";

type FilterKey = "all" | "notes" | "voice" | "photo" | "file" | "link";
type SectionKey = "today" | "yesterday" | "earlier";

type FeedEntry =
  | {
      type: "capture";
      id: string;
      at: Date;
      title: string;
      subtitle: string;
      status: string;
      captureType: CaptureType;
      channel: string | null;
    }
  | {
      type: "item";
      id: string;
      at: Date;
      title: string;
      subtitle: string;
      itemKind: string;
    };

const filters: FilterKey[] = ["all", "notes", "voice", "photo", "file", "link"];

function captureIcon(type: CaptureType) {
  switch (type) {
    case "voice":
      return <Mic size={14} color="#737373" />;
    case "photo":
      return <Camera size={14} color="#737373" />;
    case "link":
      return <Link2 size={14} color="#737373" />;
    default:
      return <FileText size={14} color="#737373" />;
  }
}

function firstLine(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.split("\n")[0]?.trim() ?? "";
}

function previewText(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
}

function resolveSectionKey(at: Date): SectionKey {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (at >= today) return "today";
  if (at >= yesterday) return "yesterday";
  return "earlier";
}

export default function InboxScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [processingCaptureId, setProcessingCaptureId] = useState<string | null>(null);
  const [processingTitle, setProcessingTitle] = useState("");
  const [previewByCaptureId, setPreviewByCaptureId] = useState<
    Record<string, { suggested_title: string; suggested_kind: string; reason: string }>
  >({});

  const { data: inboxData, isLoading: inboxLoading } = useInbox();
  const { data: itemsData, isLoading: itemsLoading } = useItems();
  const processCapture = useProcessCapture();
  const previewCapture = usePreviewCapture();
  const applyCapture = useApplyCapture();
  const deleteCapture = useDeleteCapture();
  const restoreCapture = useRestoreCapture();
  const deleteItemById = useDeleteItemById();
  const restoreItemById = useRestoreItemById();
  const showToast = useAppToast((s) => s.show);

  const captures = inboxData?.captures;
  const items = itemsData?.items;

  const feed = useMemo(() => {
    const query = search.trim().toLowerCase();
    const allEntries: FeedEntry[] = [];
    const captureList = captures ?? [];
    const itemList = items ?? [];

    for (const capture of captureList) {
      const title =
        firstLine(capture.raw_content) ||
        t("pages.inbox.captureFallbackTitle", { type: capture.capture_type });
      const subtitle = previewText(capture.raw_content) || t("pages.inbox.emptyCapture");
      allEntries.push({
        type: "capture",
        id: capture.id,
        at: new Date(capture.created_at),
        title,
        subtitle,
        status: capture.status,
        captureType: capture.capture_type,
        channel:
          capture.metadata && typeof capture.metadata.channel === "string"
            ? capture.metadata.channel
            : null,
      });
    }

    for (const item of itemList) {
      allEntries.push({
        type: "item",
        id: item.id,
        at: new Date(item.updated_at),
        title: item.title,
        subtitle: item.kind,
        itemKind: item.kind,
      });
    }

    const filtered = allEntries.filter((entry) => {
      if (activeFilter === "notes") {
        if (entry.type === "item") return entry.itemKind === "note";
        return entry.captureType === "text" || entry.channel === "note";
      }
      if (activeFilter === "file") {
        if (entry.type !== "capture") return false;
        return entry.channel === "file";
      }
      if (activeFilter !== "all") {
        if (entry.type !== "capture") return false;
        if (entry.captureType !== activeFilter) return false;
      }
      if (!query) return true;
      return `${entry.title} ${entry.subtitle}`.toLowerCase().includes(query);
    });

    filtered.sort((a, b) => b.at.getTime() - a.at.getTime());
    return filtered;
  }, [activeFilter, captures, items, search, t]);

  const grouped = useMemo(() => {
    const bySection: Record<SectionKey, FeedEntry[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    };
    for (const entry of feed) {
      bySection[resolveSectionKey(entry.at)].push(entry);
    }
    return bySection;
  }, [feed]);

  const handlePreview = useCallback(
    (captureId: string) => {
      previewCapture.mutate(
        { captureId },
        {
          onSuccess: (preview) => {
            setPreviewByCaptureId((prev) => ({
              ...prev,
              [captureId]: {
                suggested_title: preview.suggested_title,
                suggested_kind: preview.suggested_kind,
                reason: preview.reason,
              },
            }));
          },
        }
      );
    },
    [previewCapture]
  );

  const handleApply = useCallback(
    (captureId: string) => {
      const preview = previewByCaptureId[captureId];
      applyCapture.mutate(
        {
          captureId,
          payload: preview
            ? { title: preview.suggested_title, kind: preview.suggested_kind as never }
            : undefined,
        },
        {
          onSuccess: (res) => {
            router.push(`/items/${res.item_id}`);
          },
        }
      );
    },
    [applyCapture, previewByCaptureId, router]
  );

  const handleSubmitProcess = useCallback(() => {
    if (!processingCaptureId || !processingTitle.trim()) return;
    processCapture.mutate(
      { captureId: processingCaptureId, title: processingTitle.trim() },
      {
        onSuccess: (res) => {
          setProcessingCaptureId(null);
          setProcessingTitle("");
          router.push(`/items/${res.item_id}`);
        },
      }
    );
  }, [processCapture, processingCaptureId, processingTitle, router]);

  const isLoading = inboxLoading || itemsLoading;
  const isBusy =
    previewCapture.isPending ||
    applyCapture.isPending ||
    processCapture.isPending ||
    deleteCapture.isPending ||
    deleteItemById.isPending ||
    restoreCapture.isPending ||
    restoreItemById.isPending;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 px-4 pt-2">
        <UiText className="text-2xl font-semibold text-foreground">
          {t("pages.inbox.title")}
        </UiText>
        <UiText className="mt-1 text-sm text-muted-foreground">
          {t("pages.inbox.subtitle")}
        </UiText>

        <View className="mt-3">
          <View className="relative">
            <View className="absolute left-3 top-1/2 -translate-y-1/2">
              <Search size={16} color="#737373" />
            </View>
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder={t("pages.inbox.searchPlaceholder")}
              className="pl-9"
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3 max-h-10"
          contentContainerClassName="gap-2"
        >
          {filters.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`rounded-full border px-3 py-1.5 ${
                activeFilter === filter
                  ? "border-primary bg-primary"
                  : "border-border bg-card"
              }`}
            >
              <UiText
                className={`text-xs font-medium ${
                  activeFilter === filter ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {t(`pages.inbox.filter.${filter}`)}
              </UiText>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false}>
          {feed.length === 0 ? (
            <UiText className="py-8 text-center text-sm text-muted-foreground">
              {t("pages.inbox.emptyList")}
            </UiText>
          ) : (
            (["today", "yesterday", "earlier"] as SectionKey[]).map((section) => {
              const entries = grouped[section];
              if (!entries.length) return null;
              return (
                <View key={section} className="mb-5">
                  <UiText className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
                    {t(`pages.inbox.section${section[0].toUpperCase()}${section.slice(1)}`)}
                  </UiText>
                  <View className="gap-3">
                    {entries.map((entry) => {
                      if (entry.type === "capture") {
                        const preview = previewByCaptureId[entry.id];
                        return (
                          <Card key={`capture-${entry.id}`} className="rounded-2xl border border-border bg-card p-3">
                            <CardContent className="p-0">
                              <View className="mb-2 flex-row items-start justify-between">
                                <View className="mr-2 flex-1">
                                  <View className="flex-row items-center gap-2">
                                    {captureIcon(entry.captureType)}
                                    <UiText className="text-sm font-semibold text-foreground" numberOfLines={1}>
                                      {entry.title}
                                    </UiText>
                                  </View>
                                  <UiText className="mt-0.5 text-xs text-muted-foreground" numberOfLines={2}>
                                    {entry.subtitle}
                                  </UiText>
                                </View>
                                <Badge variant="secondary">
                                  <UiText variant="small" className="uppercase">
                                    {entry.status}
                                  </UiText>
                                </Badge>
                              </View>

                              {preview ? (
                                <View className="mb-2 rounded-lg border border-border bg-background px-2 py-1.5">
                                  <UiText className="text-xs font-medium text-foreground">
                                    {preview.suggested_title} ({preview.suggested_kind})
                                  </UiText>
                                  <UiText className="text-xs text-muted-foreground">{preview.reason}</UiText>
                                </View>
                              ) : null}

                              {processingCaptureId === entry.id ? (
                                <View className="gap-2">
                                  <Input
                                    placeholder={t("pages.inbox.processTitle")}
                                    value={processingTitle}
                                    onChangeText={setProcessingTitle}
                                  />
                                  <View className="flex-row gap-2">
                                    <Button
                                      size="sm"
                                      onPress={handleSubmitProcess}
                                      disabled={!processingTitle.trim() || processCapture.isPending}
                                    >
                                      <UiText>{t("pages.inbox.processSubmit")}</UiText>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onPress={() => {
                                        setProcessingCaptureId(null);
                                        setProcessingTitle("");
                                      }}
                                    >
                                      <UiText>{t("pages.inbox.cancel")}</UiText>
                                    </Button>
                                  </View>
                                </View>
                              ) : (
                                <View className="flex-row flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onPress={() => handlePreview(entry.id)}
                                    disabled={isBusy}
                                  >
                                    <UiText>{t("pages.inbox.preview")}</UiText>
                                  </Button>
                                  <Button
                                    size="sm"
                                    onPress={() => handleApply(entry.id)}
                                    disabled={isBusy}
                                  >
                                    <UiText>{t("pages.inbox.apply")}</UiText>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onPress={() => {
                                      setProcessingCaptureId(entry.id);
                                      setProcessingTitle(preview?.suggested_title ?? entry.title);
                                    }}
                                    disabled={isBusy}
                                  >
                                    <UiText>{t("pages.inbox.process")}</UiText>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onPress={() =>
                                      deleteCapture.mutate(
                                        { captureId: entry.id },
                                        {
                                          onSuccess: () => {
                                            showToast({
                                              message: t("pages.item.deleted"),
                                              actionLabel: t("pages.item.undoDelete"),
                                              onAction: () =>
                                                restoreCapture.mutate({ captureId: entry.id }),
                                            });
                                          },
                                        }
                                      )
                                    }
                                    disabled={isBusy}
                                  >
                                    <UiText>{t("pages.item.delete")}</UiText>
                                  </Button>
                                </View>
                              )}
                            </CardContent>
                          </Card>
                        );
                      }

                      return (
                        <Pressable
                          key={`item-${entry.id}`}
                          onPress={() => router.push(`/items/${entry.id}`)}
                          className="rounded-2xl border border-border bg-card p-3"
                        >
                          <View className="mb-2 flex-row items-start justify-between">
                            <View className="mr-2 flex-1">
                              <UiText className="text-sm font-semibold text-foreground" numberOfLines={1}>
                                {entry.title}
                              </UiText>
                              <UiText className="mt-0.5 text-xs uppercase text-muted-foreground">
                                {entry.subtitle}
                              </UiText>
                            </View>
                            <Badge variant="secondary">
                              <UiText variant="small">{t("pages.inbox.kindItem")}</UiText>
                            </Badge>
                          </View>
                          <View className="flex-row flex-wrap gap-2">
                            <Pressable
                              onPress={(event) => {
                                event.stopPropagation();
                                deleteItemById.mutate(
                                  { itemId: entry.id },
                                  {
                                    onSuccess: () => {
                                      showToast({
                                        message: t("pages.item.deleted"),
                                        actionLabel: t("pages.item.undoDelete"),
                                        onAction: () =>
                                          restoreItemById.mutate({ itemId: entry.id }),
                                      });
                                    },
                                  }
                                );
                              }}
                              className="rounded border border-input px-2.5 py-1.5"
                              disabled={isBusy}
                            >
                              <UiText className="text-xs font-medium text-foreground">
                                {t("pages.item.delete")}
                              </UiText>
                            </Pressable>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
