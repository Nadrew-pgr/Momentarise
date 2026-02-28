"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Camera,
  FileText,
  Inbox as InboxIcon,
  Link2,
  Mic,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import type { CaptureActionSuggestion, CaptureType } from "@momentarise/shared";
import {
  useApplyCapture,
  useDeleteCapture,
  useInbox,
  useProcessCapture,
  useReprocessCapture,
  useRestoreCapture,
} from "@/hooks/use-inbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FilterKey = "all" | "action" | "read" | "waiting";
type SectionKey = "today" | "yesterday" | "earlier";

function captureIcon(type: CaptureType) {
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

function isActionCapture(suggestions: CaptureActionSuggestion[]): boolean {
  return suggestions.some((action) => action.type !== "review");
}

export default function InboxPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [reviewCaptureId, setReviewCaptureId] = useState<string | null>(null);
  const [reviewTitle, setReviewTitle] = useState("");

  const { data: inboxData, isLoading } = useInbox();
  const applyCapture = useApplyCapture();
  const processCapture = useProcessCapture();
  const reprocessCapture = useReprocessCapture();
  const deleteCapture = useDeleteCapture();
  const restoreCapture = useRestoreCapture();

  const captures = inboxData?.captures;

  const filteredCaptures = useMemo(() => {
    const source = captures ?? [];
    const query = search.trim().toLowerCase();
    const list = source.filter((capture) => {
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
  }, [activeFilter, captures, search]);

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
            router.push(`/inbox/items/${res.item_id}`);
          },
        }
      );
    },
    [applyCapture, router]
  );

  const handleReviewSubmit = useCallback(() => {
    if (!reviewCaptureId || !reviewTitle.trim()) return;
    processCapture.mutate(
      { captureId: reviewCaptureId, title: reviewTitle.trim() },
      {
        onSuccess: (res) => {
          setReviewCaptureId(null);
          setReviewTitle("");
          router.push(`/inbox/items/${res.item_id}`);
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

  const now = new Date();

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <header className="-mx-4 sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 pb-4 pt-2 backdrop-blur">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">{t("pages.inbox.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("pages.inbox.subtitle")}</p>
        </div>

        <div className="relative mb-3">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("pages.inbox.searchPlaceholder")}
            className="h-11 rounded-xl pl-10"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "action", "read", "waiting"] as FilterKey[]).map((filter) => (
            <Button
              key={filter}
              type="button"
              size="sm"
              variant={activeFilter === filter ? "default" : "outline"}
              className="shrink-0 rounded-full px-4"
              onClick={() => setActiveFilter(filter)}
            >
              {t(`pages.inbox.filter.${filter}`)}
            </Button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-28 pt-4">
        {isLoading ? (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <p className="text-muted-foreground text-sm">{t("pages.inbox.placeholder")}</p>
          </div>
        ) : filteredCaptures.length === 0 ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-center">
            <InboxIcon className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">{t("pages.inbox.emptyList")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {(["today", "yesterday", "earlier"] as SectionKey[]).map((section) => {
              const entries = grouped[section];
              if (!entries.length) return null;
              return (
                <section key={section} className="space-y-3">
                  <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                    {t(`pages.inbox.section${section[0].toUpperCase()}${section.slice(1)}`)}
                  </h2>
                  <div className="space-y-3">
                    {entries.map((capture) => {
                      const title =
                        firstLine(capture.raw_content) ||
                        t("pages.inbox.captureFallbackTitle", { type: capture.capture_type });
                      const subtitle =
                        previewText(capture.raw_content) || t("pages.inbox.emptyCapture");
                      const suggestions = capture.suggested_actions.slice(0, 3);
                      const createdAt = new Date(capture.created_at);
                      return (
                        <article
                          key={capture.id}
                          className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="mt-0.5 rounded-full border border-border bg-background p-2">
                                {captureIcon(capture.capture_type)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{title}</p>
                                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                                  {subtitle}
                                </p>
                              </div>
                            </div>
                            <p className="text-muted-foreground shrink-0 text-xs">
                              {relativeTime(now, createdAt, i18n.language || "en-US")}
                            </p>
                          </div>

                          {reviewCaptureId === capture.id ? (
                            <div className="mb-2 flex flex-wrap items-end gap-2">
                              <div className="min-w-[220px] flex-1">
                                <Label htmlFor={`review-title-${capture.id}`} className="mb-1 block text-xs">
                                  {t("pages.inbox.processTitle")}
                                </Label>
                                <Input
                                  id={`review-title-${capture.id}`}
                                  value={reviewTitle}
                                  onChange={(event) => setReviewTitle(event.target.value)}
                                  placeholder={t("pages.item.title")}
                                  className="h-9"
                                />
                              </div>
                              <Button
                                size="sm"
                                onClick={handleReviewSubmit}
                                disabled={!reviewTitle.trim() || processCapture.isPending}
                              >
                                {t("pages.inbox.processSubmit")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReviewCaptureId(null);
                                  setReviewTitle("");
                                }}
                              >
                                {t("pages.inbox.cancel")}
                              </Button>
                            </div>
                          ) : null}

                          <div className="flex flex-wrap gap-2">
                            {suggestions.map((action) => (
                              <Button
                                key={action.key}
                                size="sm"
                                variant={action.is_primary ? "default" : "outline"}
                                onClick={() => handleAction(capture.id, action, title)}
                                disabled={isBusy}
                              >
                                {action.label}
                              </Button>
                            ))}

                            {capture.status === "failed" ? (
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

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                deleteCapture.mutate(
                                  { captureId: capture.id },
                                  {
                                    onSuccess: () => {
                                      toast(t("pages.item.deleted"), {
                                        action: {
                                          label: t("pages.item.undoDelete"),
                                          onClick: () =>
                                            restoreCapture.mutate({ captureId: capture.id }),
                                        },
                                      });
                                    },
                                  }
                                )
                              }
                              disabled={isBusy}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              {t("pages.item.delete")}
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
