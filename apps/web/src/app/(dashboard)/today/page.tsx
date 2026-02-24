"use client";

import { useTranslation } from "react-i18next";
import { LayoutDashboard } from "lucide-react";
import { useToday } from "@/hooks/use-today";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function TodayPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useToday();

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
        <LayoutDashboard className="text-muted-foreground h-12 w-12 animate-pulse" />
        <h1 className="text-2xl font-semibold">{t("pages.today.title")}</h1>
      </div>
    );
  }

  const { priorities, next_event, next_action } = data;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{t("pages.today.title")}</h1>

      <Card>
        <CardHeader className="text-base font-medium">
          {t("pages.today.priorities")}
        </CardHeader>
        <CardContent className="pt-0">
          {priorities.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("pages.today.emptyPriorities")}
            </p>
          ) : (
            <ul className="list-inside list-decimal space-y-1 text-sm">
              {priorities.map((p) => (
                <li key={p.id}>{p.title}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="text-base font-medium">
          {t("pages.today.nextEvent")}
        </CardHeader>
        <CardContent className="pt-0">
          {next_event ? (
            <p className="text-sm">
              {next_event.title} —{" "}
              {new Date(next_event.start_at).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("pages.today.emptyNextEvent")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="text-base font-medium">
          {t("pages.today.nextAction")}
        </CardHeader>
        <CardContent className="pt-0">
          {next_action ? (
            <p className="text-sm">{next_action.title}</p>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("pages.today.emptyNextAction")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
