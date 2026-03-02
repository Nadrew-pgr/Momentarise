import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Circle,
  FileText,
  Link2,
  Mic,
  RefreshCw,
  Sparkles,
} from "lucide-react-native";
import type { CaptureActionSuggestion, CaptureAssetOut, CaptureArtifactOut } from "@momentarise/shared";
import {
  useApplyCapture,
  useCaptureDetail,
  usePreviewCapture,
  useProcessCapture,
  useReprocessCapture,
} from "@/hooks/use-inbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text as UiText } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";

function captureIcon(type: string) {
  switch (type) {
    case "voice":
      return <Mic size={16} color="#737373" />;
    case "photo":
      return <Camera size={16} color="#737373" />;
    case "link":
      return <Link2 size={16} color="#737373" />;
    default:
      return <FileText size={16} color="#737373" />;
  }
}

function relativeTime(now: Date, date: Date): string {
  const deltaMs = date.getTime() - now.getTime();
  const absSeconds = Math.abs(deltaMs) / 1000;
  if (absSeconds < 60) return "just now";
  const absMinutes = absSeconds / 60;
  if (absMinutes < 60) return `${Math.round(absMinutes)}m ago`;
  const absHours = absMinutes / 60;
  if (absHours < 24) return `${Math.round(absHours)}h ago`;
  return `${Math.round(absHours / 24)}d ago`;
}

function readArtifactText(artifact: CaptureArtifactOut): string {
  const value = artifact.content_json?.text;
  return typeof value === "string" ? value.trim() : "";
}

function pickSummary(artifacts: CaptureArtifactOut[]): string {
  const preferred = ["summary", "transcript", "extracted_text"];
  for (const artifactType of preferred) {
    const found = artifacts.find((artifact) => artifact.artifact_type === artifactType);
    if (!found) continue;
    const text = readArtifactText(found);
    if (text) return text;
  }
  return "";
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  const precision = index >= 2 ? 1 : 0;
  return `${size.toFixed(precision)} ${units[index]}`;
}

function assetFileName(asset: CaptureAssetOut): string {
  const direct = asset.metadata?.file_name;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const parts = asset.storage_key.split("/");
  return parts[parts.length - 1] || "file";
}

function defaultTitle(raw: string, fallback: string): string {
  const first = raw.trim().split("\n")[0]?.trim() ?? "";
  return first || fallback;
}

export default function InboxCaptureDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const captureId = typeof params.id === "string" ? params.id : null;

  const { data, isLoading, isError, error, refetch } = useCaptureDetail(captureId);
  const applyCapture = useApplyCapture();
  const processCapture = useProcessCapture();
  const previewCapture = usePreviewCapture();
  const reprocessCapture = useReprocessCapture();

  const capture = data?.capture ?? null;
  const assets = data?.assets ?? [];
  const artifacts = data?.artifacts ?? [];
  const pipelineTrace = data?.pipeline_trace ?? [];
  const artifactsSummary = data?.artifacts_summary ?? {};
  const summary = useMemo(() => pickSummary(artifacts), [artifacts]);
  const createdAt = capture ? new Date(capture.created_at) : null;

  const [selectedActionKey, setSelectedActionKey] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");

  const filteredActions = useMemo(() => {
    if (!capture) return [];
    return capture.suggested_actions.filter((action) => action.type !== "summarize");
  }, [capture]);

  useEffect(() => {
    if (!capture) return;
    setSelectedActionKey((current) => {
      if (current && filteredActions.some((action) => action.key === current)) {
        return current;
      }
      return capture.primary_action?.key ?? filteredActions[0]?.key ?? null;
    });
    if (!manualTitle.trim()) {
      setManualTitle(
        defaultTitle(
          capture.raw_content,
          t("pages.inbox.captureFallbackTitle", { type: capture.capture_type })
        )
      );
    }
  }, [capture, manualTitle, t, filteredActions]);

  const selectedAction: CaptureActionSuggestion | null = useMemo(() => {
    if (!capture || !selectedActionKey) return null;
    return filteredActions.find((action) => action.key === selectedActionKey) ?? null;
  }, [capture, selectedActionKey, filteredActions]);

  const isBusy =
    applyCapture.isPending ||
    processCapture.isPending ||
    previewCapture.isPending ||
    reprocessCapture.isPending;

  const onBack = useCallback(() => {
    router.replace("/(tabs)/inbox");
  }, [router]);

  const handlePreview = useCallback(() => {
    if (!captureId || !selectedAction) return;
    previewCapture.mutate({ captureId, actionKey: selectedAction.key });
  }, [captureId, previewCapture, selectedAction]);

  const handleApply = useCallback(() => {
    if (!captureId || !capture || !selectedAction || capture.archived) return;
    const title = manualTitle.trim();
    const description = manualDescription.trim();

    if (selectedAction.type === "review") {
      if (!title) return;
      processCapture.mutate(
        { captureId, title },
        {
          onSuccess: () => {
            router.replace(`/(tabs)/inbox`);
          },
        }
      );
      return;
    }

    applyCapture.mutate(
      {
        captureId,
        payload: {
          action_key: selectedAction.key,
          title: title || undefined,
          metadata: description ? { description } : {},
        },
      },
      {
        onSuccess: () => {
          router.replace(`/(tabs)/inbox`);
        },
      }
    );
  }, [
    applyCapture,
    capture,
    captureId,
    manualDescription,
    manualTitle,
    processCapture,
    router,
    selectedAction,
  ]);

  if (!captureId) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-4">
          <UiText className="text-sm text-muted-foreground">{t("pages.inbox.placeholder")}</UiText>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !capture) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-4">
          <UiText className="text-center text-sm text-destructive">
            {error instanceof Error ? error.message : t("pages.inbox.loadError")}
          </UiText>
          <View className="mt-4 flex-row gap-2">
            <Button size="sm" variant="outline" onPress={() => refetch()}>
              <UiText>{t("common.retry")}</UiText>
            </Button>
            <Button size="sm" variant="outline" onPress={onBack}>
              <UiText>{t("pages.item.backToInbox")}</UiText>
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const statusClass =
    capture.status === "ready"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
      : capture.status === "failed"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-600"
        : "border-border bg-muted/40 text-muted-foreground";
  const primaryAsset = assets[0] ?? null;
  const actionCount = capture.suggested_actions.length;
  const preview = previewCapture.data;
  const requiresVoiceContext = capture.capture_type === "voice" && !capture.archived;
  const captureTypeLabel = t(`pages.inbox.filter.${capture.capture_type}`, {
    defaultValue: capture.capture_type,
  });
  const keyClauses = Array.isArray(artifactsSummary.key_clauses)
    ? artifactsSummary.key_clauses.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    )
    : [];
  const potentialRisks = Array.isArray(artifactsSummary.potential_risks)
    ? artifactsSummary.potential_risks.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    )
    : [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 px-4 pt-2">
        <View className="mb-3 flex-row items-center justify-between">
          <Button size="sm" variant="outline" onPress={onBack}>
            <ArrowLeft size={14} color="#171717" />
            <UiText> {t("pages.item.backToInbox")}</UiText>
          </Button>
          {capture.status === "failed" ? (
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
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <Card className="rounded-2xl border border-border bg-card p-3">
            <CardContent className="p-0">
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <UiText className="text-lg font-semibold text-foreground" numberOfLines={1}>
                    {defaultTitle(
                      capture.raw_content,
                      t("pages.inbox.captureFallbackTitle", { type: capture.capture_type })
                    )}
                  </UiText>
                  <View className="mt-2 flex-row flex-wrap items-center gap-2">
                    <View className={`rounded-full border px-2 py-0.5 ${statusClass}`}>
                      <UiText className="text-xs font-medium">{capture.status}</UiText>
                    </View>
                    {createdAt ? (
                      <UiText className="text-xs text-muted-foreground">
                        {relativeTime(new Date(), createdAt)}
                      </UiText>
                    ) : null}
                    <View className="rounded-full border border-border bg-muted/40 px-2 py-0.5">
                      <UiText className="text-xs text-muted-foreground">
                        {captureTypeLabel}
                      </UiText>
                    </View>
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
                  </View>
                </View>
                <View className="rounded-full border border-border bg-background p-2">
                  {captureIcon(capture.capture_type)}
                </View>
              </View>
            </CardContent>
          </Card>

          <Card className="mt-3 rounded-2xl border border-border bg-card p-3">
            <CardContent className="p-0">
              <View className="mb-2 flex-row items-center gap-2">
                <Sparkles size={14} color="#2563eb" />
                <UiText className="text-xs font-semibold uppercase text-foreground">
                  {t("pages.inbox.aiSummary")}
                </UiText>
              </View>
              <UiText className="text-sm leading-6 text-foreground">
                {summary || capture.raw_content || t("pages.inbox.emptyCapture")}
              </UiText>
              {keyClauses.length ? (
                <View className="mt-3">
                  <UiText className="text-xs font-semibold uppercase text-primary">Key Clauses</UiText>
                  {keyClauses.slice(0, 3).map((entry) => (
                    <UiText key={entry} className="mt-1 text-sm text-foreground">
                      - {entry}
                    </UiText>
                  ))}
                </View>
              ) : null}
              {potentialRisks.length ? (
                <View className="mt-3">
                  <UiText className="text-xs font-semibold uppercase text-amber-600">Potential Risks</UiText>
                  {potentialRisks.slice(0, 3).map((entry) => (
                    <UiText key={entry} className="mt-1 text-sm text-foreground">
                      - {entry}
                    </UiText>
                  ))}
                </View>
              ) : null}
            </CardContent>
          </Card>

          <Card className="mt-3 rounded-2xl border border-border bg-card p-3">
            <CardContent className="p-0">
              <View className="mb-3 flex-row items-center justify-between">
                <UiText className="text-xs font-semibold uppercase text-foreground">
                  {t("pages.inbox.suggestedActions")}
                </UiText>
                <View className="rounded-full border border-primary bg-primary/10 px-2 py-0.5">
                  <UiText className="text-xs font-medium text-primary">{filteredActions.length}</UiText>
                </View>
              </View>

              <View className="gap-2">
                {filteredActions.map((action) => {
                  const selected = selectedActionKey === action.key;
                  return (
                    <Pressable
                      key={action.key}
                      onPress={() => setSelectedActionKey(action.key)}
                      className={`rounded-xl border px-3 py-2 ${selected ? "border-primary bg-primary/5" : "border-border bg-background/40"
                        }`}
                    >
                      <View className="flex-row items-start gap-2">
                        {selected ? (
                          <CheckCircle2 size={14} color="#2563eb" />
                        ) : (
                          <Circle size={14} color="#737373" />
                        )}
                        <View className="flex-1">
                          <UiText className="text-sm font-medium text-foreground">{action.label}</UiText>
                          <UiText className="text-xs text-muted-foreground">
                            {(action.confidence * 100).toFixed(0)}% · {action.type}
                          </UiText>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {requiresVoiceContext ? (
                <View className="mt-3 gap-3 rounded-xl border border-border bg-background/40 p-3">
                  <View>
                    <Label>{t("pages.inbox.voiceTitle")}</Label>
                    <Input
                      value={manualTitle}
                      onChangeText={setManualTitle}
                      placeholder={t("pages.inbox.processTitle")}
                    />
                  </View>
                  <View>
                    <Label>{t("pages.inbox.voiceDescription")}</Label>
                    <Textarea
                      value={manualDescription}
                      onChangeText={setManualDescription}
                      placeholder={t("pages.inbox.voiceDescriptionPlaceholder")}
                    />
                  </View>
                </View>
              ) : null}

              <View className="mt-4 flex-row justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onPress={handlePreview}
                  disabled={!selectedAction || isBusy || capture.archived}
                >
                  <UiText>{t("pages.inbox.preview")}</UiText>
                </Button>
                <Button
                  size="sm"
                  onPress={handleApply}
                  disabled={
                    !selectedAction ||
                    isBusy ||
                    capture.archived ||
                    (selectedAction.type === "review" && !manualTitle.trim())
                  }
                >
                  <UiText>{t("pages.inbox.applySelected")}</UiText>
                </Button>
              </View>

              {preview ? (
                <View className="mt-3 rounded-xl border border-border bg-background/40 p-3">
                  <UiText className="text-xs font-semibold uppercase text-muted-foreground">
                    {t("pages.inbox.preview")}
                  </UiText>
                  <UiText className="mt-1 text-sm font-medium text-foreground">
                    {preview.suggested_title}
                  </UiText>
                  <UiText className="text-xs text-muted-foreground">
                    {preview.suggested_kind} · {(preview.confidence * 100).toFixed(0)}%
                  </UiText>
                  <UiText className="mt-2 text-sm text-foreground">{preview.reason}</UiText>
                </View>
              ) : null}
            </CardContent>
          </Card>

          {primaryAsset ? (
            <Card className="mb-6 mt-3 rounded-2xl border border-border bg-card p-3">
              <CardContent className="p-0">
                <UiText className="text-xs font-semibold uppercase text-foreground">
                  {t("pages.inbox.sourceFile")}
                </UiText>
                <View className="mt-2 rounded-xl border border-border bg-background/40 p-3">
                  <UiText className="text-sm font-medium text-foreground" numberOfLines={1}>
                    {assetFileName(primaryAsset)}
                  </UiText>
                  <UiText className="text-xs text-muted-foreground">
                    {formatBytes(primaryAsset.size_bytes)} · {primaryAsset.mime_type}
                  </UiText>
                </View>
              </CardContent>
            </Card>
          ) : null}

          {pipelineTrace.length ? (
            <Card className="mb-6 mt-3 rounded-2xl border border-border bg-card p-3">
              <CardContent className="p-0">
                <UiText className="text-xs font-semibold uppercase text-foreground">
                  Pipeline Trace
                </UiText>
                <View className="mt-2 gap-2">
                  {pipelineTrace.slice(-6).map((entry, idx) => (
                    <View
                      key={`${idx}-${String(entry.stage ?? "stage")}`}
                      className="rounded-lg border border-border/70 p-2"
                    >
                      <UiText className="text-xs font-semibold uppercase text-muted-foreground">
                        {String(entry.stage ?? "stage")}
                      </UiText>
                      <UiText className="text-xs text-foreground">
                        {String(entry.status ?? "unknown")} · {String(entry.provider ?? "n/a")} · {String(entry.model ?? "n/a")}
                      </UiText>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
