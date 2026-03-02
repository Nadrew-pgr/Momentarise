"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function captureIcon(type: string) {
  switch (type) {
    case "voice":
      return <Mic className="h-4 w-4" />;
    case "photo":
      return <Camera className="h-4 w-4" />;
    case "link":
      return <Link2 className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function relativeTime(now: Date, date: Date, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale || "en-US", { numeric: "auto" });
  const deltaMs = date.getTime() - now.getTime();
  const absSeconds = Math.abs(deltaMs) / 1000;
  if (absSeconds < 60) return rtf.format(Math.round(deltaMs / 1000), "second");
  const absMinutes = absSeconds / 60;
  if (absMinutes < 60) return rtf.format(Math.round(deltaMs / 60000), "minute");
  const absHours = absMinutes / 60;
  if (absHours < 24) return rtf.format(Math.round(deltaMs / 3600000), "hour");
  return rtf.format(Math.round(deltaMs / 86400000), "day");
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
  if (typeof asset.file_name === "string" && asset.file_name.trim()) return asset.file_name.trim();
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
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const captureId = typeof params.id === "string" ? params.id : null;
  const actionKeyFromUrl = searchParams.get("action_key");
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
  const selectedDefaultAction = capture?.primary_action?.key ?? capture?.suggested_actions[0]?.key ?? null;

  const [selectedActionKey, setSelectedActionKey] = useState<string | null>(selectedDefaultAction);
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");

  const filteredActions = useMemo(() => {
    if (!capture) return [];
    return capture.suggested_actions.filter((action) => action.type !== "summarize");
  }, [capture]);

  useEffect(() => {
    if (!capture) return;
    const urlKey = actionKeyFromUrl ? decodeURIComponent(actionKeyFromUrl) : null;
    const validKey =
      urlKey && filteredActions.some((a) => a.key === urlKey)
        ? urlKey
        : null;
    setSelectedActionKey((current) => {
      if (validKey) return validKey;
      if (current && filteredActions.some((action) => action.key === current)) {
        return current;
      }
      return capture.primary_action?.key ?? filteredActions[0]?.key ?? null;
    });
    if (!manualTitle.trim()) {
      setManualTitle(defaultTitle(capture.raw_content, t("pages.inbox.captureFallbackTitle", { type: capture.capture_type })));
    }
  }, [capture, actionKeyFromUrl, manualTitle, t, filteredActions]);

  const selectedAction: CaptureActionSuggestion | null = useMemo(() => {
    if (!capture || !selectedActionKey) return null;
    return filteredActions.find((action) => action.key === selectedActionKey) ?? null;
  }, [capture, selectedActionKey, filteredActions]);

  const isBusy =
    applyCapture.isPending ||
    processCapture.isPending ||
    previewCapture.isPending ||
    reprocessCapture.isPending;

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
            router.push(`/inbox`);
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
          router.push(`/inbox`);
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
      <div className="flex h-full min-h-0 flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">{t("pages.inbox.placeholder")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">{t("pages.inbox.placeholder")}</p>
      </div>
    );
  }

  if (isError || !capture) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : t("pages.inbox.loadError")}
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} size="sm" variant="outline">
            {t("common.retry")}
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/inbox">{t("pages.item.backToInbox")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const statusClass =
    capture.status === "ready"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
      : capture.status === "failed"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-600"
        : "border-border bg-muted/40 text-muted-foreground";
  const primaryAsset = assets[0] ?? null;
  const actionCount = filteredActions.length;
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
  const transcriptionLimited = useMemo(() => {
    for (const entry of pipelineTrace) {
      if (entry && typeof entry === "object" && (entry as Record<string, unknown>).fallback_used === true) {
        return true;
      }
    }
    const transcriptArtifact = artifacts.find((a) => a.artifact_type === "transcript");
    if (transcriptArtifact?.content_json && typeof transcriptArtifact.content_json === "object") {
      const cj = transcriptArtifact.content_json as Record<string, unknown>;
      if (cj.fallback_used === true) return true;
    }
    return false;
  }, [artifacts, pipelineTrace]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 py-2">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/inbox" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("pages.item.backToInbox")}
          </Link>
        </Button>
        {capture.status === "failed" || (capture.capture_type === "voice" && transcriptionLimited && !capture.archived) ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => reprocessCapture.mutate({ captureId: capture.id })}
            disabled={isBusy}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            {t("pages.inbox.reprocess")}
          </Button>
        ) : null}
      </header>

      <div className="rounded-2xl border border-border/70 bg-card/90 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">
              {defaultTitle(capture.raw_content, t("pages.inbox.captureFallbackTitle", { type: capture.capture_type }))}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full border px-2 py-0.5 font-medium ${statusClass}`}>
                {capture.status}
              </span>
              {createdAt ? (
                <span className="text-muted-foreground">
                  {relativeTime(new Date(), createdAt, i18n.language || "en-US")}
                </span>
              ) : null}
              <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-muted-foreground">
                {captureTypeLabel}
              </span>
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
                  {badge.label}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-full border border-border bg-background p-2">
            {captureIcon(capture.capture_type)}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-border/70 bg-card/90 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">{t("pages.inbox.aiSummary")}</h2>
        </div>
        {(capture.status === "queued" || capture.status === "processing" || (!summary && capture.status !== "failed")) ? (
          <div className="space-y-2">
            <div className="bg-muted/50 h-3 w-full animate-pulse rounded" />
            <div className="bg-muted/50 h-3 w-11/12 animate-pulse rounded" />
            <div className="bg-muted/50 h-3 w-[80%] animate-pulse rounded" />
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground/90">
            {summary || capture.raw_content || t("pages.inbox.emptyCapture")}
          </p>
        )}
        {capture.capture_type === "voice" && transcriptionLimited ? (
          <Badge variant="secondary" className="mt-2 inline-flex">
            {t("pages.inbox.transcriptionLimited")}
          </Badge>
        ) : null}
        {keyClauses.length ? (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Key Clauses</p>
            <ul className="mt-1 space-y-1">
              {keyClauses.slice(0, 3).map((entry) => (
                <li key={entry} className="text-sm text-foreground/85">
                  - {entry}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {potentialRisks.length ? (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Potential Risks</p>
            <ul className="mt-1 space-y-1">
              {potentialRisks.slice(0, 3).map((entry) => (
                <li key={entry} className="text-sm text-foreground/85">
                  - {entry}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {capture.capture_type === "link" && !assets.length ? (
        <section className="rounded-2xl border border-border/70 bg-card/90 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">{t("pages.inbox.sourceFile")}</h2>
          <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
            <p className="text-muted-foreground truncate text-xs">
              {(() => {
                try {
                  const u = new URL(capture.raw_content);
                  return u.hostname;
                } catch {
                  return capture.raw_content.slice(0, 60);
                }
              })()}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              asChild
            >
              <a href={capture.raw_content} target="_blank" rel="noopener noreferrer">
                {t("pages.inbox.openSite")}
              </a>
            </Button>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border/70 bg-card/90 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide">{t("pages.inbox.suggestedActions")}</h2>
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {actionCount}
          </span>
        </div>

        <div className="space-y-2">
          {filteredActions.map((action) => {
            const selected = selectedActionKey === action.key;
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => setSelectedActionKey(action.key)}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition ${selected ? "border-primary bg-primary/5" : "border-border bg-background/40 hover:bg-muted/40"
                  }`}
              >
                {selected ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {(action.confidence * 100).toFixed(0)}% · {action.type}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {requiresVoiceContext ? (
          <div className="mt-4 grid gap-3 rounded-xl border border-border bg-background/40 p-3">
            <div>
              <Label htmlFor="voice-title">{t("pages.inbox.voiceTitle")}</Label>
              <Input
                id="voice-title"
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
                placeholder={t("pages.inbox.processTitle")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="voice-description">{t("pages.inbox.voiceDescription")}</Label>
              <Textarea
                id="voice-description"
                value={manualDescription}
                onChange={(event) => setManualDescription(event.target.value)}
                placeholder={t("pages.inbox.voiceDescriptionPlaceholder")}
                className="mt-1 min-h-20"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={!selectedAction || isBusy || capture.archived}
          >
            {t("pages.inbox.preview")}
          </Button>
          <Button
            onClick={handleApply}
            disabled={
              !selectedAction ||
              isBusy ||
              capture.archived ||
              (selectedAction.type === "review" && !manualTitle.trim())
            }
          >
            {t("pages.inbox.applySelected")}
          </Button>
        </div>

        {preview ? (
          <div className="mt-4 rounded-xl border border-border bg-background/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("pages.inbox.preview")}
            </p>
            <p className="mt-1 text-sm font-medium">{preview.suggested_title}</p>
            <p className="text-muted-foreground text-xs">
              {preview.suggested_kind} · {(preview.confidence * 100).toFixed(0)}%
            </p>
            <p className="mt-2 text-sm text-foreground/80">{preview.reason}</p>
          </div>
        ) : null}
      </section>

      {primaryAsset ? (
        <section className="rounded-2xl border border-border/70 bg-card/90 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">{t("pages.inbox.sourceFile")}</h2>
          <div className="mt-3 space-y-3">
            {primaryAsset.preview_kind === "audio" ? (
              <audio
                src={captureId ? `/api/inbox/${captureId}/assets/${primaryAsset.id}/content` : undefined}
                controls
                className="w-full"
              />
            ) : primaryAsset.preview_kind === "image" ? (
              <img
                src={captureId ? `/api/inbox/${captureId}/assets/${primaryAsset.id}/content` : undefined}
                alt=""
                className="max-w-full rounded-lg"
              />
            ) : primaryAsset.preview_kind === "pdf" ? (
              <iframe
                title={assetFileName(primaryAsset)}
                src={captureId ? `/api/inbox/${captureId}/assets/${primaryAsset.id}/content` : undefined}
                className="h-[480px] w-full rounded-lg border border-border"
              />
            ) : null}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{assetFileName(primaryAsset)}</p>
                <p className="text-muted-foreground text-xs">
                  {formatBytes(primaryAsset.size_bytes)} · {primaryAsset.mime_type}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={captureId ? `/api/inbox/${captureId}/assets/${primaryAsset.id}/content` : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={assetFileName(primaryAsset)}
                >
                  {t("pages.inbox.openDownload")}
                </a>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {pipelineTrace.length ? (
        <section className="rounded-2xl border border-border/70 bg-card/90 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Pipeline Trace</h2>
          <div className="mt-2 space-y-2">
            {pipelineTrace.slice(-6).map((entry, idx) => (
              <div key={`${idx}-${String(entry.stage ?? "stage")}`} className="rounded-lg border border-border/60 p-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {String(entry.stage ?? "stage")}
                </p>
                <p className="text-xs text-foreground/80">
                  {String(entry.status ?? "unknown")} · {String(entry.provider ?? "n/a")} · {String(entry.model ?? "n/a")}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
