"use client";

import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";
import { useTimeline } from "@/hooks/use-timeline";
import { useTracking } from "@/hooks/use-tracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TimelinePage() {
  const { t } = useTranslation();
  const date = new Date().toISOString().slice(0, 10);
  const { data, isLoading, error } = useTimeline(date);
  const { startTracking, stopTracking, isStarting, isStopping } = useTracking();

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
        <p className="text-destructive">{error.message}</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
        <Calendar className="text-muted-foreground h-12 w-12 animate-pulse" />
        <h1 className="text-2xl font-semibold">{t("pages.timeline.title")}</h1>
      </div>
    );
  }

  const { events } = data;

  if (events.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
        <Calendar className="text-muted-foreground h-12 w-12" />
        <h1 className="text-2xl font-semibold">{t("pages.timeline.title")}</h1>
        <p className="text-muted-foreground max-w-sm">
          {t("pages.timeline.emptyDay")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{t("pages.timeline.title")}</h1>
      <p className="text-muted-foreground text-sm">{data.date}</p>

      <ul className="space-y-2">
        {events.map((ev) => (
          <Card key={ev.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
              <div className="min-w-0 flex-1">
                <span className="text-muted-foreground mr-2 text-sm">
                  {new Date(ev.start_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="font-medium">{ev.title}</span>
              </div>
              {ev.is_tracking ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isStopping}
                  onClick={() => stopTracking(ev.id)}
                >
                  {t("pages.timeline.stop")}
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  disabled={isStarting}
                  onClick={() => startTracking(ev.id)}
                >
                  {t("pages.timeline.start")}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </ul>
    </div>
  );
}
