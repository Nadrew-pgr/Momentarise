import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Archive,
  Camera,
  FileText,
  Link2,
  Mic,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
  WandSparkles,
} from "lucide-react-native";
import type { CaptureActionSuggestion, CaptureType } from "@momentarise/shared";
import {
  useApplyCapture,
  useArchiveCapture,
  useDeleteCapture,
  useInbox,
  useReprocessCapture,
} from "@/hooks/use-inbox";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text as UiText } from "@/components/ui/text";

type TypeFilterKey = "all" | "voice" | "photo" | "file" | "link";
type SectionKey = "today" | "yesterday" | "earlier";
type InboxSegment = "all" | "untreated" | "treated";

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

function previewText(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
}

function fallbackTimestampedTitle(
  captureType: string,
  createdAt: string,
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const date = new Date(createdAt);
  const datePart = date.toLocaleDateString(locale || "en-US");
  const timePart = date.toLocaleTimeString(locale || "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return t("pages.inbox.captureFallbackTimestamped", {
    type: captureType,
    date: datePart,
    time: timePart,
    defaultValue: `${captureType} - ${datePart} ${timePart}`,
  });
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

function actionableSuggestions(actions: CaptureActionSuggestion[]): CaptureActionSuggestion[] {
  return actions;
}

function resolvePrimaryAction(capture: {
  primary_action: CaptureActionSuggestion | null;
  suggested_actions: CaptureActionSuggestion[];
}): CaptureActionSuggestion | null {
  const actions = actionableSuggestions(capture.suggested_actions);
  if (!actions.length) return null;
  if (capture.primary_action) {
    const matched = actions.find((action) => action.key === capture.primary_action?.key);
    if (matched) return matched;
  }
  return actions.find((action) => action.is_primary) ?? actions[0] ?? null;
}

const typeFilters: TypeFilterKey[] = ["all", "voice", "photo", "file", "link"];

export default function InboxScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilterKey>("all");
  const [segment, setSegment] = useState<InboxSegment>("all");
  const [actionCaptureId, setActionCaptureId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  const { data: inboxData, isLoading, isError, error, refetch } = useInbox({
    includeArchived: false,
    bucket: segment,
  });
  const applyCapture = useApplyCapture();
  const reprocessCapture = useReprocessCapture();
  const archiveCapture = useArchiveCapture();
  const deleteCapture = useDeleteCapture();

  const captures = inboxData?.entries ?? inboxData?.captures ?? [];

  const filteredCaptures = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = captures.filter((capture) => {
      if (typeFilter !== "all" && capture.capture_type !== typeFilter) return false;

      if (!query) return true;
      const primaryAction = resolvePrimaryAction(capture);
      const haystack = `${capture.title ?? ""} ${capture.raw_content} ${(primaryAction?.label ?? "").toString()}`;
      return haystack.toLowerCase().includes(query);
    });
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [captures, search, typeFilter]);

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

  const selectedCapture = useMemo(
    () => captures.find((item) => item.id === actionCaptureId) ?? null,
    [actionCaptureId, captures]
  );
  const selectedPrimaryAction = useMemo(
    () => (selectedCapture ? resolvePrimaryAction(selectedCapture) : null),
    [selectedCapture]
  );

  const handleApplyPrimary = useCallback(
    (captureId: string, action: CaptureActionSuggestion | null) => {
      if (!action) return;
      applyCapture.mutate(
        {
          captureId,
          payload: {
            action_key: action.key,
          },
        }
      );
    },
    [applyCapture]
  );

  const isBusy =
    applyCapture.isPending ||
    reprocessCapture.isPending ||
    archiveCapture.isPending ||
    deleteCapture.isPending;
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

        <View className="mt-3 rounded-xl border border-border bg-muted/40 px-3 py-2">
          <UiText className="text-[11px] font-semibold uppercase text-muted-foreground">
            {t("pages.inbox.comingSoonContextResearchTitle", {
              defaultValue: "Coming soon",
            })}
          </UiText>
          <UiText className="mt-1 text-sm text-foreground">
            {t("pages.inbox.comingSoonContextResearchBody", {
              defaultValue:
                "Context research, web research, advanced enrichments, and connectors are coming soon.",
            })}
          </UiText>
        </View>

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
            onPress={() => setSegment("all")}
            className={`rounded-full border px-3 py-1.5 ${
              segment === "all" ? "border-primary bg-primary" : "border-border bg-card"
            }`}
          >
            <UiText
              className={`text-xs font-medium ${
                segment === "all" ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              {t("pages.inbox.filter.all")}
            </UiText>
          </Pressable>
          <Pressable
            onPress={() => setSegment("untreated")}
            className={`rounded-full border px-3 py-1.5 ${
              segment === "untreated" ? "border-primary bg-primary" : "border-border bg-card"
            }`}
          >
            <UiText
              className={`text-xs font-medium ${
                segment === "untreated" ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              {t("pages.inbox.segmentUntreated", { defaultValue: "Untreated" })}
            </UiText>
          </Pressable>
          <Pressable
            onPress={() => setSegment("treated")}
            className={`rounded-full border px-3 py-1.5 ${
              segment === "treated" ? "border-primary bg-primary" : "border-border bg-card"
            }`}
          >
            <UiText
              className={`text-xs font-medium ${
                segment === "treated" ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              {t("pages.inbox.segmentTreated", { defaultValue: "Treated" })}
            </UiText>
          </Pressable>
          {typeFilters.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setTypeFilter(filter)}
              className={`rounded-full border px-3 py-1.5 ${
                typeFilter === filter ? "border-primary bg-primary" : "border-border bg-card"
              }`}
            >
              <UiText
                className={`text-xs font-medium ${
                  typeFilter === filter ? "text-primary-foreground" : "text-foreground"
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
                        capture.title?.trim() ||
                        fallbackTimestampedTitle(
                          capture.capture_type,
                          capture.created_at,
                          i18n.language || "en-US",
                          t
                        );
                      const subtitle =
                        previewText(capture.raw_content) || t("pages.inbox.emptyCapture");
                      const primaryAction = resolvePrimaryAction(capture);
                      const canActOnCapture = !capture.archived;
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
                                  <Badge variant="outline">
                                    <UiText>
                                      {capture.treated_bucket === "treated"
                                        ? t("pages.inbox.segmentTreated", { defaultValue: "Treated" })
                                        : t("pages.inbox.segmentUntreated", { defaultValue: "Untreated" })}
                                    </UiText>
                                  </Badge>
                                </View>
                              </View>
                              <View className="rounded-full border border-transparent bg-secondary px-2 py-0.5">
                                <UiText className="text-xs font-medium text-secondary-foreground">
                                  {relativeTime(now, new Date(capture.created_at), i18n.language || "en-US")}
                                </UiText>
                              </View>
                            </View>

                            <View className="flex-row flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onPress={() => router.push(`/inbox/${capture.id}`)}
                                disabled={isBusy}
                              >
                                <UiText>{t("pages.inbox.openCapture")}</UiText>
                              </Button>
                              {canActOnCapture && primaryAction ? (
                                <Button
                                  size="sm"
                                  onPress={() => handleApplyPrimary(capture.id, primaryAction)}
                                  disabled={isBusy}
                                >
                                  <WandSparkles size={12} color="#ffffff" />
                                  <UiText> {primaryAction.label}</UiText>
                                </Button>
                              ) : null}
                              <Pressable
                                onPress={() => setActionCaptureId(capture.id)}
                                disabled={isBusy}
                                accessibilityRole="button"
                                accessibilityLabel={t("pages.inbox.itemActions", { defaultValue: "Actions" })}
                                hitSlop={8}
                                className="h-9 w-9 items-center justify-center rounded-md border border-border bg-background"
                              >
                                <MoreHorizontal size={14} color="#171717" />
                              </Pressable>
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

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(actionCaptureId)}
        statusBarTranslucent
        onRequestClose={() => setActionCaptureId(null)}
      >
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/45" onPress={() => setActionCaptureId(null)} />
          <View className="w-full rounded-t-2xl border border-border bg-card p-4">
            <UiText className="mb-3 text-base font-semibold text-foreground">
              {t("pages.inbox.itemActions", { defaultValue: "Actions" })}
            </UiText>
            <View className="gap-2">
              <Button
                variant="outline"
                onPress={() => {
                  if (!selectedCapture) return;
                  setActionCaptureId(null);
                  router.push(`/inbox/${selectedCapture.id}`);
                }}
              >
                <UiText>{t("pages.inbox.openCapture")}</UiText>
              </Button>

              <Button
                variant="outline"
                onPress={() => {
                  if (!selectedCapture || !selectedPrimaryAction || selectedCapture.archived) return;
                  handleApplyPrimary(selectedCapture.id, selectedPrimaryAction);
                  setActionCaptureId(null);
                }}
                disabled={!selectedCapture || !selectedPrimaryAction || selectedCapture.archived}
              >
                <UiText>{t("pages.inbox.reviewApply", { defaultValue: "Review / Apply" })}</UiText>
              </Button>

              <Button
                variant="outline"
                onPress={() => {
                  if (!selectedCapture) return;
                  reprocessCapture.mutate({ captureId: selectedCapture.id });
                  setActionCaptureId(null);
                }}
                disabled={!selectedCapture || selectedCapture.status !== "failed" || selectedCapture.archived}
              >
                <RefreshCw size={12} color="#171717" />
                <UiText> {t("pages.inbox.reprocess")}</UiText>
              </Button>

              <Button
                variant="outline"
                onPress={() => {
                  if (!selectedCapture || selectedCapture.archived) return;
                  archiveCapture.mutate({ captureId: selectedCapture.id });
                  setActionCaptureId(null);
                }}
                disabled={!selectedCapture || selectedCapture.archived}
              >
                <Archive size={12} color="#171717" />
                <UiText> {t("pages.inbox.archive", { defaultValue: "Archive" })}</UiText>
              </Button>

              <Button
                variant="destructive"
                onPress={() => {
                  if (!selectedCapture) return;
                  setActionCaptureId(null);
                  setDeleteCandidateId(selectedCapture.id);
                }}
                disabled={!selectedCapture || selectedCapture.archived}
              >
                <Trash2 size={12} color="#ffffff" />
                <UiText> {t("pages.item.delete")}</UiText>
              </Button>

              <View className="mt-2 gap-1 rounded-lg border border-border/70 bg-muted/30 p-2">
                {[
                  ["pages.inbox.menuDuplicate", "Duplicate"],
                  ["pages.inbox.menuMoveTo", "Move to"],
                  ["pages.inbox.menuCopyLink", "Copy link"],
                  ["pages.inbox.menuVersionHistory", "Version history"],
                  ["pages.inbox.menuNotifications", "Notifications"],
                  ["pages.inbox.menuAnalytics", "Analytics"],
                  ["pages.inbox.menuImportExport", "Import / Export"],
                ].map(([key, fallback]) => (
                  <View key={key} className="rounded-md px-2 py-1 opacity-60">
                    <UiText className="text-sm text-muted-foreground">
                      {t(key, { defaultValue: fallback })}
                    </UiText>
                  </View>
                ))}
              </View>
              <View className="mt-3">
                <Button variant="outline" onPress={() => setActionCaptureId(null)}>
                  <UiText>{t("common.cancel")}</UiText>
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(deleteCandidateId)}
        statusBarTranslucent
        onRequestClose={() => setDeleteCandidateId(null)}
      >
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/45" onPress={() => setDeleteCandidateId(null)} />
          <View className="w-full rounded-t-2xl border border-border bg-card p-4">
            <UiText className="text-base font-semibold text-foreground">
              {t("pages.inbox.confirmDeleteTitle", {
                defaultValue: "Delete this item?",
              })}
            </UiText>
            <UiText className="mt-2 text-sm text-muted-foreground">
              {t("pages.inbox.confirmDeleteBody", {
                defaultValue: "This action is final. Restore is disabled for inbox captures.",
              })}
            </UiText>
            <View className="mt-4 flex-row justify-end gap-2">
              <Button variant="outline" onPress={() => setDeleteCandidateId(null)}>
                <UiText>{t("common.cancel")}</UiText>
              </Button>
              <Button
                variant="destructive"
                onPress={() => {
                  if (!deleteCandidateId) return;
                  deleteCapture.mutate(
                    { captureId: deleteCandidateId },
                    {
                      onSettled: () => setDeleteCandidateId(null),
                    }
                  );
                }}
              >
                <UiText>{t("pages.item.delete")}</UiText>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
