import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Camera, FileText, Link2, Mic, RefreshCw, Search, Trash2 } from "lucide-react-native";
import type { CaptureActionSuggestion, CaptureType } from "@momentarise/shared";
import {
  useApplyCapture,
  useDeleteCapture,
  useInbox,
  useProcessCapture,
  useReprocessCapture,
  useRestoreCapture,
} from "@/hooks/use-inbox";
import { useAppToast } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text as UiText } from "@/components/ui/text";

type FilterKey = "all" | "action" | "read" | "waiting";
type SectionKey = "today" | "yesterday" | "earlier";
type ViewMode = "active" | "archived";

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

function relativeTime(now: Date, date: Date, locale: string): string {
  const RelativeTimeFormatCtor =
    typeof Intl !== "undefined" ? Intl.RelativeTimeFormat : undefined;
  if (typeof RelativeTimeFormatCtor !== "function") {
    const deltaMs = date.getTime() - now.getTime();
    const absSeconds = Math.abs(deltaMs) / 1000;
    if (absSeconds < 60) return "just now";
    const absMinutes = absSeconds / 60;
    if (absMinutes < 60) return `${Math.round(absMinutes)}m ago`;
    const absHours = absMinutes / 60;
    if (absHours < 24) return `${Math.round(absHours)}h ago`;
    return `${Math.round(absHours / 24)}d ago`;
  }
  const rtf = new RelativeTimeFormatCtor(locale || "en-US", { numeric: "auto" });
  const deltaMs = date.getTime() - now.getTime();
  const absSeconds = Math.abs(deltaMs) / 1000;
  if (absSeconds < 60) return rtf.format(Math.round(deltaMs / 1000), "second");
  const absMinutes = absSeconds / 60;
  if (absMinutes < 60) return rtf.format(Math.round(deltaMs / 60000), "minute");
  const absHours = absMinutes / 60;
  if (absHours < 24) return rtf.format(Math.round(deltaMs / 3600000), "hour");
  return rtf.format(Math.round(deltaMs / 86400000), "day");
}

function isActionCapture(suggestions: CaptureActionSuggestion[]): boolean {
  return suggestions.some((action) => action.type !== "review");
}

const filters: FilterKey[] = ["all", "action", "read", "waiting"];

export default function InboxScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [reviewCaptureId, setReviewCaptureId] = useState<string | null>(null);
  const [reviewTitle, setReviewTitle] = useState("");

  const { data: inboxData, isLoading, isError, error, refetch } = useInbox({
    includeArchived: viewMode === "archived",
  });
  const applyCapture = useApplyCapture();
  const processCapture = useProcessCapture();
  const reprocessCapture = useReprocessCapture();
  const deleteCapture = useDeleteCapture();
  const restoreCapture = useRestoreCapture();
  const showToast = useAppToast((s) => s.show);

  const captures = inboxData?.captures ?? [];

  const filteredCaptures = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = captures.filter((capture) => {
      if (viewMode === "archived" && !capture.archived) return false;
      if (viewMode === "active" && capture.archived) return false;
      const suggestions = capture.suggested_actions ?? [];
      const waiting =
        capture.status === "queued" ||
        capture.status === "processing" ||
        capture.status === "failed" ||
        capture.requires_review;
      const readable = capture.status === "ready" && !capture.requires_review;

      if (activeFilter === "action" && !isActionCapture(suggestions)) return false;
      if (activeFilter === "read" && !readable) return false;
      if (activeFilter === "waiting" && !waiting) return false;

      if (!query) return true;
      const haystack = `${capture.raw_content} ${(capture.primary_action?.label ?? "").toString()}`;
      return haystack.toLowerCase().includes(query);
    });
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [activeFilter, captures, search, viewMode]);

  const grouped = useMemo(() => {
    const bySection: Record<SectionKey, typeof filteredCaptures> = {
      today: [],
      yesterday: [],
      earlier: [],
    };
    for (const capture of filteredCaptures) {
      bySection[resolveSectionKey(new Date(capture.created_at))].push(capture);
    }
    return bySection;
  }, [filteredCaptures]);

  const handleAction = useCallback(
    (captureId: string, action: CaptureActionSuggestion, fallbackTitle: string) => {
      if (action.type === "review") {
        setReviewCaptureId(captureId);
        setReviewTitle(fallbackTitle);
        return;
      }

      applyCapture.mutate(
        {
          captureId,
          payload: {
            action_key: action.key,
          },
        },
        {
          onSuccess: (res) => {
            router.push(`/items/${res.item_id}`);
          },
        }
      );
    },
    [applyCapture, router]
  );

  const handleSubmitReview = useCallback(() => {
    if (!reviewCaptureId || !reviewTitle.trim()) return;
    processCapture.mutate(
      { captureId: reviewCaptureId, title: reviewTitle.trim() },
      {
        onSuccess: (res) => {
          setReviewCaptureId(null);
          setReviewTitle("");
          router.push(`/items/${res.item_id}`);
        },
      }
    );
  }, [processCapture, reviewCaptureId, reviewTitle, router]);

  const isBusy =
    applyCapture.isPending ||
    processCapture.isPending ||
    reprocessCapture.isPending ||
    deleteCapture.isPending ||
    restoreCapture.isPending;
  const inboxErrorMessage =
    error instanceof Error ? error.message : t("pages.inbox.loadError");

  const now = new Date();

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
        <UiText className="text-2xl font-semibold text-foreground">{t("pages.inbox.title")}</UiText>
        <UiText className="mt-1 text-sm text-muted-foreground">{t("pages.inbox.subtitle")}</UiText>

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
          <Pressable
            onPress={() => setViewMode("active")}
            className={`rounded-full border px-3 py-1.5 ${
              viewMode === "active" ? "border-primary bg-primary" : "border-border bg-card"
            }`}
          >
            <UiText
              className={`text-xs font-medium ${
                viewMode === "active" ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              Active
            </UiText>
          </Pressable>
          <Pressable
            onPress={() => setViewMode("archived")}
            className={`rounded-full border px-3 py-1.5 ${
              viewMode === "archived" ? "border-primary bg-primary" : "border-border bg-card"
            }`}
          >
            <UiText
              className={`text-xs font-medium ${
                viewMode === "archived" ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              Archived
            </UiText>
          </Pressable>
          {filters.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`rounded-full border px-3 py-1.5 ${
                activeFilter === filter ? "border-primary bg-primary" : "border-border bg-card"
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
          {isError ? (
            <Card className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3">
              <CardContent className="gap-2 p-0">
                <UiText className="text-sm font-medium text-foreground">
                  {t("pages.inbox.loadError")}
                </UiText>
                <UiText className="text-xs text-muted-foreground">{inboxErrorMessage}</UiText>
                <View className="mt-1">
                  <Button size="sm" variant="outline" onPress={() => refetch()} disabled={isBusy}>
                    <UiText>{t("common.retry")}</UiText>
                  </Button>
                </View>
              </CardContent>
            </Card>
          ) : filteredCaptures.length === 0 ? (
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
                    {entries.map((capture) => {
                      const title =
                        firstLine(capture.raw_content) ||
                        t("pages.inbox.captureFallbackTitle", { type: capture.capture_type });
                      const subtitle = previewText(capture.raw_content) || t("pages.inbox.emptyCapture");
                      const suggestions = capture.suggested_actions.slice(0, 3);
                      const canActOnCapture = !capture.archived && viewMode === "active";
                      return (
                        <Card key={capture.id} className="rounded-2xl border border-border bg-card p-3">
                          <CardContent className="p-0">
                            <View className="mb-2 flex-row items-start justify-between">
                              <View className="mr-2 flex-1">
                                <View className="flex-row items-center gap-2">
                                  {captureIcon(capture.capture_type)}
                                  <UiText className="text-sm font-semibold text-foreground" numberOfLines={1}>
                                    {title}
                                  </UiText>
                                </View>
                                <UiText className="mt-0.5 text-xs text-muted-foreground" numberOfLines={2}>
                                  {subtitle}
                                </UiText>
                                <View className="mt-2 flex-row flex-wrap gap-1">
                                  {capture.badges.map((badge) => (
                                    <Badge
                                      key={`${capture.id}-${badge.key}`}
                                      variant={
                                        badge.tone === "default"
                                          ? "default"
                                          : badge.tone === "secondary"
                                            ? "secondary"
                                            : "outline"
                                      }
                                    >
                                      <UiText>{badge.label}</UiText>
                                    </Badge>
                                  ))}
                                  {capture.archived_reason ? (
                                    <Badge variant="outline">
                                      <UiText>
                                        {capture.archived_reason === "applied" ? "Applied" : "Deleted"}
                                      </UiText>
                                    </Badge>
                                  ) : null}
                                </View>
                              </View>
                              <View className="rounded-full border border-transparent bg-secondary px-2 py-0.5">
                                <UiText className="text-xs font-medium text-secondary-foreground">
                                  {relativeTime(now, new Date(capture.created_at), i18n.language || "en-US")}
                                </UiText>
                              </View>
                            </View>

                            {reviewCaptureId === capture.id ? (
                              <View className="mb-2 gap-2">
                                <Input
                                  placeholder={t("pages.inbox.processTitle")}
                                  value={reviewTitle}
                                  onChangeText={setReviewTitle}
                                />
                                <View className="flex-row gap-2">
                                  <Button
                                    size="sm"
                                    onPress={handleSubmitReview}
                                    disabled={!reviewTitle.trim() || processCapture.isPending}
                                  >
                                    <UiText>{t("pages.inbox.processSubmit")}</UiText>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onPress={() => {
                                      setReviewCaptureId(null);
                                      setReviewTitle("");
                                    }}
                                  >
                                    <UiText>{t("pages.inbox.cancel")}</UiText>
                                  </Button>
                                </View>
                              </View>
                            ) : null}

                            <View className="flex-row flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onPress={() => router.push(`/inbox/${capture.id}`)}
                                disabled={isBusy}
                              >
                                <UiText>{t("pages.inbox.openCapture")}</UiText>
                              </Button>
                              {canActOnCapture
                                ? suggestions.map((action) => (
                                    <Button
                                      key={action.key}
                                      size="sm"
                                      variant={action.is_primary ? "default" : "outline"}
                                      onPress={() => handleAction(capture.id, action, title)}
                                      disabled={isBusy}
                                    >
                                      <UiText>{action.label}</UiText>
                                    </Button>
                                  ))
                                : null}

                              {canActOnCapture && capture.status === "failed" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onPress={() => reprocessCapture.mutate({ captureId: capture.id })}
                                  disabled={isBusy}
                                >
                                  <RefreshCw size={12} color="#171717" />
                                  <UiText> {t("pages.inbox.reprocess")}</UiText>
                                </Button>
                              ) : null}

                              {canActOnCapture ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onPress={() =>
                                    deleteCapture.mutate(
                                      { captureId: capture.id },
                                      {
                                        onSuccess: () => {
                                          showToast({
                                            message: t("pages.item.deleted"),
                                            actionLabel: t("pages.item.undoDelete"),
                                            onAction: () =>
                                              restoreCapture.mutate({ captureId: capture.id }),
                                          });
                                        },
                                      }
                                    )
                                  }
                                  disabled={isBusy}
                                >
                                  <Trash2 size={12} color="#171717" />
                                  <UiText> {t("pages.item.delete")}</UiText>
                                </Button>
                              ) : null}
                              {viewMode === "archived" && capture.archived_reason === "deleted" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onPress={() => restoreCapture.mutate({ captureId: capture.id })}
                                  disabled={isBusy}
                                >
                                  <UiText>{t("pages.item.undoDelete")}</UiText>
                                </Button>
                              ) : null}
                            </View>
                          </CardContent>
                        </Card>
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
