"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  ChevronRight,
  Clock,
  Inbox,
  Play,
} from "lucide-react";
import { useToday } from "@/hooks/use-today";
import { useInbox } from "@/hooks/use-inbox";
import { useMe } from "@/hooks/use-me";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";

const MAX_PRIORITIES = 12;
const MAX_INBOX_PREVIEW = 6;

function formatWeekday(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: "long" });
}

function formatShortDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function formatEventTime(startAt: string, locale: string): string {
  return new Date(startAt).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPriorityLabel(
  order: number,
  t: (key: string) => string
): string {
  switch (order) {
    case 1:
      return t("pages.today.priorityHigh");
    case 2:
      return t("pages.today.priorityMedium");
    case 3:
      return t("pages.today.priorityLow");
    default:
      return t("pages.today.priorities");
  }
}

export default function TodayPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
  const { data, isLoading, error, refetch, isFetching } = useToday();
  const { data: inboxData, isLoading: inboxLoading, refetch: refetchInbox } = useInbox();
  const { data: meData } = useMe();

  useEffect(() => {
    refetchInbox();
  }, [refetchInbox]);

  const now = new Date();
  const weekday = formatWeekday(now, locale);
  const shortDate = formatShortDate(now, locale);
  const previewCaptures = inboxData?.captures?.slice(0, MAX_INBOX_PREVIEW) ?? [];
  const inboxLoaded = !inboxLoading && inboxData !== undefined;

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
        <p className="text-destructive">{error.message}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto w-full max-w-4xl flex-1 flex-col gap-6 p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <Skeleton className="mb-1 h-4 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="size-11 rounded-full" />
        </div>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    );
  }

  const { priorities, next_event, next_action } = data;
  const meInitial = meData?.user?.email
    ? meData.user.email.charAt(0).toUpperCase()
    : "?";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      {/* Header: date left, avatar right */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-primary text-sm font-semibold uppercase tracking-wide">
            {weekday}
          </p>
          <h1 className="text-4xl font-extrabold text-foreground">
            {shortDate}
          </h1>
        </div>
        <Link href="/me" className="rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="size-11" aria-label={t("pages.me.title")}>
            <AvatarFallback className="text-base font-semibold text-foreground">
              {meInitial}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>

      {/* Daily Digest */}
      <Card className="border-border bg-card p-4">
        <CardContent className="gap-1 p-0">
          <h2 className="text-base font-semibold text-foreground">
            {t("pages.today.dailyDigest")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("pages.today.dailyDigestPlaceholder")}
          </p>
        </CardContent>
      </Card>

      {/* Priorities */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            {t("pages.today.priorities")}
          </p>
          <p className="text-muted-foreground text-xs">
            {t("pages.today.prioritiesDone", { total: priorities.length })}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {priorities.length === 0 ? (
            <Card className="border-border bg-card p-4">
              <CardContent className="p-0">
                <p className="text-muted-foreground text-sm">
                  {t("pages.today.emptyPriorities")}
                </p>
              </CardContent>
            </Card>
          ) : (
            priorities.slice(0, MAX_PRIORITIES).map((p) => (
              <Card
                key={p.id}
                className="border-border bg-card flex h-32 p-4"
              >
                <CardContent className="flex flex-1 flex-row p-0">
                  <div className="bg-primary mr-3 w-1 shrink-0 self-stretch rounded-full" />
                  <div className="min-w-0 flex-1">
                    <Badge variant="secondary" className="mb-1">
                      {getPriorityLabel(p.priority_order, t)}
                    </Badge>
                    <p
                      className="text-foreground line-clamp-2 text-sm font-medium"
                      title={p.title}
                    >
                      {p.title}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Next Event */}
      <div>
        <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
          {t("pages.today.nextEvent")}
        </p>
        <Link href="/timeline">
          <Card className="border-border bg-card flex flex-row items-center gap-4 p-4">
            <CardContent className="flex flex-1 flex-row items-center gap-4 p-0">
              <div className="flex w-12 flex-col items-center">
                {next_event ? (
                  <>
                    <Clock className="text-muted-foreground size-5" />
                    <span className="text-muted-foreground mt-1 text-xs">
                      {formatEventTime(next_event.start_at, locale)}
                    </span>
                  </>
                ) : (
                  <Calendar className="text-muted-foreground size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {next_event ? (
                  <>
                    <p className="text-foreground text-base font-medium">
                      {next_event.title}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {formatEventTime(next_event.start_at, locale)}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t("pages.today.emptyNextEvent")}
                  </p>
                )}
              </div>
              <ChevronRight className="text-muted-foreground size-5 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Next Action (hero) */}
      <Card className="bg-primary border-0 p-6 text-primary-foreground">
        <CardContent className="gap-2 p-0">
          <Badge
            variant="secondary"
            className="bg-primary-foreground/20 text-primary-foreground self-start text-xs font-semibold"
          >
            {t("pages.today.focusMode")}
          </Badge>
          <h2 className="text-xl font-bold text-primary-foreground">
            {next_action?.title ?? t("pages.today.emptyNextAction")}
          </h2>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-primary-foreground/90 text-sm">
              25:00 min
            </span>
            <button
              type="button"
              className="bg-primary-foreground text-primary flex size-12 items-center justify-center rounded-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t("pages.today.nextAction")}
            >
              <Play className="size-6" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Inbox Preview */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            {t("pages.today.inboxPreview")}
          </p>
          <Link
            href="/inbox"
            className="text-primary text-sm font-medium hover:underline"
          >
            {t("pages.today.viewAll")}
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {!inboxLoaded ? (
            <Card className="border-border bg-card p-3">
              <CardContent className="flex flex-row items-center gap-3 p-0">
                <Inbox className="text-muted-foreground size-4 shrink-0" />
                <Skeleton className="h-4 flex-1 rounded" />
              </CardContent>
            </Card>
          ) : previewCaptures.length === 0 ? (
            <Link href="/inbox">
              <Card className="border-border bg-card p-3">
                <CardContent className="flex flex-row items-center gap-3 p-0">
                  <Inbox className="text-muted-foreground size-4 shrink-0" />
                  <p className="text-muted-foreground flex-1 text-sm">
                    {t("pages.inbox.emptyList")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ) : (
            previewCaptures.map((c) => (
              <Link key={c.id} href="/inbox">
                <Card className="border-border bg-card p-3 transition-colors hover:bg-muted/50">
                  <CardContent className="flex flex-row items-center gap-3 p-0">
                    <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                    <p
                      className="text-foreground flex-1 truncate text-sm"
                      title={c.raw_content?.trim() || undefined}
                    >
                      {c.raw_content?.trim() || t("pages.inbox.emptyCapture")}
                    </p>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {t("pages.today.now")}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
