"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bot, CalendarClock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAiPreferences, useUpdateAiPreferences } from "@/hooks/use-ai-preferences";
import {
  useCalendarPreferences,
  useUpdateCalendarPreferences,
} from "@/hooks/use-calendar-preferences";

export default function MePage() {
  const { t } = useTranslation();
  const calendarQuery = useCalendarPreferences();
  const updateCalendar = useUpdateCalendarPreferences();
  const aiQuery = useAiPreferences();
  const updateAi = useUpdateAiPreferences();

  const [calendarDraft, setCalendarDraft] = useState<{
    start_hour: number;
    end_hour: number;
  } | null>(null);
  const [aiDraft, setAiDraft] = useState<{
    mode: "proposal_only" | "auto_apply";
    threshold: number;
    max_actions: number;
  } | null>(null);

  const startHour = calendarDraft?.start_hour ?? calendarQuery.data?.start_hour ?? 8;
  const endHour = calendarDraft?.end_hour ?? calendarQuery.data?.end_hour ?? 24;
  const mode = aiDraft?.mode ?? aiQuery.data?.mode ?? "proposal_only";
  const threshold = aiDraft?.threshold ?? aiQuery.data?.auto_apply_threshold ?? 0.9;
  const maxActions = aiDraft?.max_actions ?? aiQuery.data?.max_actions_per_capture ?? 3;

  const isPending = updateCalendar.isPending || updateAi.isPending;

  async function saveAll() {
    if (endHour <= startHour) return;
    await updateCalendar.mutateAsync({
      start_hour: startHour,
      end_hour: endHour,
      last_known_updated_at: calendarQuery.data?.updated_at,
    });
    await updateAi.mutateAsync({
      mode,
      auto_apply_threshold: Number(threshold.toFixed(2)),
      max_actions_per_capture: maxActions,
      last_known_updated_at: aiQuery.data?.updated_at,
    });
    setCalendarDraft(null);
    setAiDraft(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-full border border-border p-2">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{t("pages.me.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("pages.me.subtitle")}</p>
        </div>
      </div>

      <Card className="rounded-2xl border border-border/70">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">{t("pages.settings.calendarTitle")}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("pages.settings.calendarStartHour")}</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setCalendarDraft({
                    start_hour: Math.max(0, startHour - 1),
                    end_hour: endHour,
                  })
                }
              >
                -
              </Button>
              <p className="w-16 text-center text-sm">{String(startHour).padStart(2, "0")}:00</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setCalendarDraft({
                    start_hour: Math.min(endHour - 1, startHour + 1),
                    end_hour: endHour,
                  })
                }
              >
                +
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("pages.settings.calendarEndHour")}</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setCalendarDraft({
                    start_hour: startHour,
                    end_hour: Math.max(startHour + 1, endHour - 1),
                  })
                }
              >
                -
              </Button>
              <p className="w-16 text-center text-sm">{String(endHour).padStart(2, "0")}:00</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setCalendarDraft({
                    start_hour: startHour,
                    end_hour: Math.min(24, endHour + 1),
                  })
                }
              >
                +
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border/70">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">{t("pages.settings.aiTitle")}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("pages.settings.aiMode")}</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={mode === "proposal_only" ? "default" : "outline"}
                onClick={() =>
                  setAiDraft({
                    mode: "proposal_only",
                    threshold,
                    max_actions: maxActions,
                  })
                }
              >
                {t("pages.settings.aiModeProposalOnly")}
              </Button>
              <Button
                size="sm"
                variant={mode === "auto_apply" ? "default" : "outline"}
                onClick={() =>
                  setAiDraft({
                    mode: "auto_apply",
                    threshold,
                    max_actions: maxActions,
                  })
                }
              >
                {t("pages.settings.aiModeAutoApply")}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("pages.settings.aiThreshold")}</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setAiDraft({
                    mode,
                    threshold: Math.max(0, Number((threshold - 0.05).toFixed(2))),
                    max_actions: maxActions,
                  })
                }
              >
                -
              </Button>
              <p className="w-16 text-center text-sm">{threshold.toFixed(2)}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setAiDraft({
                    mode,
                    threshold: Math.min(1, Number((threshold + 0.05).toFixed(2))),
                    max_actions: maxActions,
                  })
                }
              >
                +
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("pages.settings.aiMaxActions")}</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setAiDraft({
                    mode,
                    threshold,
                    max_actions: Math.max(1, maxActions - 1),
                  })
                }
              >
                -
              </Button>
              <p className="w-16 text-center text-sm">{maxActions}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setAiDraft({
                    mode,
                    threshold,
                    max_actions: Math.min(3, maxActions + 1),
                  })
                }
              >
                +
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => void saveAll()} disabled={isPending || endHour <= startHour}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
