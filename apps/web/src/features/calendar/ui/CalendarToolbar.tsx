"use client";

import { RiCalendarCheckLine } from "@remixicon/react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CalendarViewKind } from "../core/view-types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CalendarToolbarProps {
  view: CalendarViewKind;
  title: string;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onViewChange: (view: CalendarViewKind) => void;
  onCreate: () => void;
  startHour?: number;
  endHour?: number;
  onDisplayHoursChange?: (startHour: number, endHour: number) => Promise<void>;
  disableActions?: boolean;
  shortcutsEnabled?: boolean;
  className?: string;
}

export function CalendarToolbar({
  view,
  title,
  onToday,
  onPrevious,
  onNext,
  onViewChange,
  onCreate,
  startHour = 8,
  endHour = 24,
  onDisplayHoursChange,
  disableActions = false,
  shortcutsEnabled = true,
  className,
}: CalendarToolbarProps) {
  const { t } = useTranslation();
  const [isHoursOpen, setIsHoursOpen] = useState(false);
  const [isHoursSaving, setIsHoursSaving] = useState(false);
  const [draftStartHour, setDraftStartHour] = useState(startHour);
  const [draftEndHour, setDraftEndHour] = useState(endHour);

  useEffect(() => {
    setDraftStartHour(startHour);
    setDraftEndHour(endHour);
  }, [startHour, endHour]);

  const startHourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const endHourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, i) => i + 1).filter((value) => value > draftStartHour),
    [draftStartHour]
  );

  const hasHoursChanged = draftStartHour !== startHour || draftEndHour !== endHour;
  const hasValidHours = draftEndHour > draftStartHour;

  const applyDisplayHours = async () => {
    if (!onDisplayHoursChange || !hasValidHours || !hasHoursChanged) {
      setIsHoursOpen(false);
      return;
    }
    setIsHoursSaving(true);
    try {
      await onDisplayHoursChange(draftStartHour, draftEndHour);
      setIsHoursOpen(false);
    } finally {
      setIsHoursSaving(false);
    }
  };

  useEffect(() => {
    if (!shortcutsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "m") onViewChange("month");
      if (key === "w") onViewChange("week");
      if (key === "d") onViewChange("day");
      if (key === "a") onViewChange("agenda");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onViewChange, shortcutsEnabled]);

  return (
    <div className={["flex items-center justify-between p-2 sm:p-4", className].filter(Boolean).join(" ")}>
      <div className="flex items-center gap-1 sm:gap-4">
        <Button
          className="max-[479px]:aspect-square max-[479px]:p-0!"
          onClick={onToday}
          variant="outline"
          disabled={disableActions}
        >
          <RiCalendarCheckLine aria-hidden="true" className="min-[480px]:hidden" size={16} />
          <span className="max-[479px]:sr-only">{t("common.today")}</span>
        </Button>
        <div className="flex items-center sm:gap-2">
          <Button aria-label="Previous" onClick={onPrevious} size="icon" variant="ghost" disabled={disableActions}>
            <ChevronLeftIcon aria-hidden="true" size={16} />
          </Button>
          <Button aria-label="Next" onClick={onNext} size="icon" variant="ghost" disabled={disableActions}>
            <ChevronRightIcon aria-hidden="true" size={16} />
          </Button>
        </div>
        <h2 className="font-semibold text-sm sm:text-lg md:text-xl">{title}</h2>
      </div>

      <div className="flex items-center gap-2">
        <Popover open={isHoursOpen} onOpenChange={setIsHoursOpen}>
          <PopoverTrigger asChild>
            <Button className="gap-1.5 max-[479px]:h-8" variant="outline" disabled={disableActions || !onDisplayHoursChange}>
              {t("pages.calendar.displayHours")}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-60 space-y-3">
            <div className="space-y-1.5">
              <Label>{t("pages.calendar.displayHoursStart")}</Label>
              <Select
                value={String(draftStartHour)}
                onValueChange={(value) => {
                  const next = Number(value);
                  setDraftStartHour(next);
                  if (draftEndHour <= next) setDraftEndHour(next + 1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {startHourOptions.map((hour) => (
                    <SelectItem key={hour} value={String(hour)}>
                      {`${String(hour).padStart(2, "0")}:00`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("pages.calendar.displayHoursEnd")}</Label>
              <Select value={String(draftEndHour)} onValueChange={(value) => setDraftEndHour(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {endHourOptions.map((hour) => (
                    <SelectItem key={hour} value={String(hour)}>
                      {`${String(hour).padStart(2, "0")}:00`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraftStartHour(startHour);
                  setDraftEndHour(endHour);
                  setIsHoursOpen(false);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={() => void applyDisplayHours()}
                disabled={disableActions || isHoursSaving || !hasValidHours || !hasHoursChanged}
              >
                {isHoursSaving ? "Saving..." : t("common.save")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-1.5 max-[479px]:h-8" variant="outline" disabled={disableActions}>
              <span>
                <span aria-hidden="true" className="min-[480px]:hidden">
                  {view.charAt(0).toUpperCase()}
                </span>
                <span className="max-[479px]:sr-only">{view.charAt(0).toUpperCase() + view.slice(1)}</span>
              </span>
              <ChevronDownIcon aria-hidden="true" className="-me-1 opacity-60" size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-32">
            <DropdownMenuItem onClick={() => onViewChange("month")}>{t("pages.calendar.month")} <DropdownMenuShortcut>M</DropdownMenuShortcut></DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewChange("week")}>{t("pages.calendar.week")} <DropdownMenuShortcut>W</DropdownMenuShortcut></DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewChange("day")}>{t("pages.calendar.day")} <DropdownMenuShortcut>D</DropdownMenuShortcut></DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewChange("agenda")}>Agenda <DropdownMenuShortcut>A</DropdownMenuShortcut></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button className="max-[479px]:aspect-square max-[479px]:p-0!" onClick={onCreate} size="sm" disabled={disableActions}>
          <PlusIcon aria-hidden="true" className="sm:-ms-1 opacity-60" size={16} />
          <span className="max-sm:sr-only">{t("pages.calendar.create")}</span>
        </Button>
      </div>
    </div>
  );
}
