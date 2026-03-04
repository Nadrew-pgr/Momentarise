"use client";

import { RiCalendarLine, RiDeleteBinLine, RiCloseLine } from "@remixicon/react";
import type { Block } from "@blocknote/core";
import type { ProseMirrorNode } from "@momentarise/shared";
import { useQueryClient } from "@tanstack/react-query";
import { format, isBefore } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import type { CalendarEvent, EventColor } from "./types";
import { EndHour, StartHour } from "./constants";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/bff-client";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useItem, useItemLinks } from "@/hooks/use-item";
import { BlockEditor } from "@/components/block-editor";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { Textarea } from "@/components/ui/textarea";

import { RecurrenceInput } from "./recurrence-input";
import { ProjectSeriesSelector } from "./project-series-selector";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

type MomentTab = "details" | "content" | "coach";
type ContentSaveState = "idle" | "saving" | "saved" | "error";

interface EventDialogProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => Promise<CalendarEvent>;
  onDelete: (eventId: string) => Promise<void>;
  onToggleTracking?: (eventId: string) => void;
  isTrackingActionPending?: boolean;
}

async function readApiError(res: Response, fallback: string): Promise<Error> {
  try {
    const payload = await res.json();
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail: unknown }).detail)
        : null;
    return new Error(detail ? `${fallback}: ${detail}` : fallback);
  } catch {
    return new Error(fallback);
  }
}

export function EventDialog({
  event,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onToggleTracking,
  isTrackingActionPending = false,
}: EventDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const formatTimeForInput = useCallback((date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = Math.floor(date.getMinutes() / 15) * 15;
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const initialStart = event ? new Date(event.start) : new Date();
  const initialEnd = event ? new Date(event.end) : new Date(initialStart.getTime() + 60 * 60 * 1000);

  const [activeTab, setActiveTab] = useState<MomentTab>("details");
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startDate, setStartDate] = useState<Date>(initialStart);
  const [endDate, setEndDate] = useState<Date>(initialEnd);
  const [startTime, setStartTime] = useState(formatTimeForInput(initialStart));
  const [endTime, setEndTime] = useState(formatTimeForInput(initialEnd));
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [location, setLocation] = useState(event?.location ?? "");
  const [color, setColor] = useState<EventColor>((event?.color as EventColor) || "sky");
  const [rrule, setRRule] = useState<string | undefined>(event?.rrule);
  const [projectId, setProjectId] = useState<string | null>(event?.projectId ?? null);
  const [seriesId, setSeriesId] = useState<string | null>(event?.seriesId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const [currentEventId, setCurrentEventId] = useState(event?.id ?? "");
  const [currentItemId, setCurrentItemId] = useState(event?.itemId ?? "");
  const [currentUpdatedAt, setCurrentUpdatedAt] = useState(event?.updatedAt);
  const [isTracking, setIsTracking] = useState(event?.isTracking ?? false);

  const [blocks, setBlocks] = useState<Block[] | Record<string, unknown>[]>([]);
  const [blocksHydrated, setBlocksHydrated] = useState(false);
  const [contentDirty, setContentDirty] = useState(false);
  const [contentSaveState, setContentSaveState] = useState<ContentSaveState>("idle");

  const itemId = currentItemId || null;
  const { data: item } = useItem(itemId);
  const { data: linksData, isLoading: linksLoading } = useItemLinks(itemId);
  const links = linksData?.links ?? [];

  useEffect(() => {
    if (!item || !itemId || blocksHydrated || contentDirty) {
      return;
    }
    setBlocks(item.blocks as unknown as Block[]);
    setBlocksHydrated(true);
  }, [blocksHydrated, contentDirty, item, itemId]);

  // Sync local state if the 'event' prop changes via external means (e.g., Drag & Drop on Calendar or switching events)
  useEffect(() => {
    if (!event) return;

    // Use functional updates or condition checks to avoid redundant setStates
    setTitle(prev => prev !== (event.title ?? "") ? (event.title ?? "") : prev);
    setDescription(prev => prev !== (event.description ?? "") ? (event.description ?? "") : prev);
    setAllDay(prev => prev !== (event.allDay ?? false) ? (event.allDay ?? false) : prev);
    setLocation(prev => prev !== (event.location ?? "") ? (event.location ?? "") : prev);
    setColor(prev => prev !== ((event.color as EventColor) || "sky") ? ((event.color as EventColor) || "sky") : prev);
    setRRule(prev => prev !== event.rrule ? event.rrule : prev);
    setProjectId(prev => prev !== (event.projectId ?? null) ? (event.projectId ?? null) : prev);
    setSeriesId(prev => prev !== (event.seriesId ?? null) ? (event.seriesId ?? null) : prev);

    setCurrentEventId(prev => prev !== (event.id ?? "") ? (event.id ?? "") : prev);
    setCurrentItemId(prev => prev !== (event.itemId ?? "") ? (event.itemId ?? "") : prev);
    setCurrentUpdatedAt(prev => prev !== event.updatedAt ? event.updatedAt : prev);
    setIsTracking(prev => prev !== (event.isTracking ?? false) ? (event.isTracking ?? false) : prev);

    const newStart = new Date(event.start);
    const newEnd = new Date(event.end);

    setStartDate(prev => prev.getTime() !== newStart.getTime() ? newStart : prev);
    setEndDate(prev => prev.getTime() !== newEnd.getTime() ? newEnd : prev);

    const formatTimeLocal = (date: Date) => {
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = Math.floor(date.getMinutes() / 15) * 15;
      return `${hours}:${minutes.toString().padStart(2, "0")}`;
    };

    const nextStartTime = formatTimeLocal(newStart);
    const nextEndTime = formatTimeLocal(newEnd);
    setStartTime(prev => prev !== nextStartTime ? nextStartTime : prev);
    setEndTime(prev => prev !== nextEndTime ? nextEndTime : prev);

    // Reset content hydration when switching to a DIFFERENT event/item
    if (event.itemId !== currentItemId || event.id !== currentEventId) {
      setBlocksHydrated(false);
      setContentDirty(false);
      setBlocks([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, event?.itemId, event?.start.getTime(), event?.end.getTime(), event?.allDay, event?.title]);

  const persistBlocks = useCallback(
    async (targetItemId: string, nextBlocks: ProseMirrorNode[]) => {
      const res = await fetchWithAuth(`/api/items/${targetItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: nextBlocks }),
      });
      if (!res.ok) {
        throw await readApiError(res, t("pages.calendar.errors.saveContent"));
      }
      await res.json();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["item", targetItemId] }),
        queryClient.invalidateQueries({ queryKey: ["items"] }),
      ]);
    },
    [queryClient, t]
  );

  const { debounced: debouncedPersistBlocks, cancel: cancelDebouncedPersistBlocks } =
    useDebouncedCallback((targetItemId: string, nextBlocks: ProseMirrorNode[]) => {
      void persistBlocks(targetItemId, nextBlocks)
        .then(() => {
          setContentDirty(false);
          setContentSaveState("saved");
        })
        .catch(() => {
          setContentSaveState("error");
        });
    }, 700);

  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = StartHour; hour <= EndHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMinute = minute.toString().padStart(2, "0");
        const value = `${formattedHour}:${formattedMinute}`;
        const date = new Date(2000, 0, 1, hour, minute);
        const label = format(date, "h:mm a");
        options.push({ label, value });
      }
    }
    return options;
  }, []);

  const handleBlocksChange = useCallback(
    (nextBlocks: Block[]) => {
      setBlocks(nextBlocks);
      setContentDirty(true);

      if (!currentItemId) {
        setContentSaveState("idle");
        return;
      }

      setContentSaveState("saving");
      debouncedPersistBlocks(currentItemId, nextBlocks as unknown as ProseMirrorNode[]);
    },
    [currentItemId, debouncedPersistBlocks]
  );

  const contentSaveLabel = useMemo(() => {
    if (contentSaveState === "saving") return t("pages.calendar.momentContent.saving");
    if (contentSaveState === "saved") return t("pages.calendar.momentContent.saved");
    if (contentSaveState === "error") return t("pages.calendar.momentContent.saveError");
    if (!currentItemId) return t("pages.calendar.momentContent.deferred");
    return null;
  }, [contentSaveState, currentItemId, t]);

  const handleSave = async () => {
    setError(null);

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (!allDay) {
      const [startHours = 0, startMinutes = 0] = startTime.split(":").map(Number);
      const [endHours = 0, endMinutes = 0] = endTime.split(":").map(Number);

      if (
        startHours < StartHour ||
        startHours > EndHour ||
        endHours < StartHour ||
        endHours > EndHour
      ) {
        setError(
          t("pages.calendar.errors.timeOutOfRange", {
            start: StartHour,
            end: EndHour,
          })
        );
        return;
      }

      start.setHours(startHours, startMinutes, 0, 0);
      end.setHours(endHours, endMinutes, 0, 0);
    } else {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    if (isBefore(end, start)) {
      setError(t("pages.calendar.errors.endBeforeStart"));
      return;
    }

    const eventTitle = title.trim() ? title : "(no title)";

    setIsSaving(true);
    cancelDebouncedPersistBlocks();

    try {
      const persistedEvent = await onSave({
        id: currentEventId,
        itemId: currentItemId || undefined,
        updatedAt: currentUpdatedAt,
        title: eventTitle,
        description: description.trim() || undefined,
        start,
        end,
        allDay,
        location: location.trim() || undefined,
        color,
        rrule,
        isTracking,
        projectId: projectId ?? undefined,
        seriesId: seriesId ?? undefined,
      });

      const nextEventId = persistedEvent.id || currentEventId;
      const nextItemId = persistedEvent.itemId || currentItemId;

      setCurrentEventId(nextEventId);
      setCurrentItemId(nextItemId ?? "");
      setCurrentUpdatedAt(persistedEvent.updatedAt ?? currentUpdatedAt);
      setIsTracking(persistedEvent.isTracking ?? isTracking);

      if (contentDirty) {
        if (!nextItemId) {
          throw new Error(t("pages.calendar.errors.contentAttachFailed"));
        }
        setContentSaveState("saving");
        await persistBlocks(nextItemId, blocks as unknown as ProseMirrorNode[]);
        setContentDirty(false);
        setContentSaveState("saved");
      }

      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("pages.calendar.errors.saveMoment")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentEventId) return;
    setError(null);
    setIsDeleting(true);
    cancelDebouncedPersistBlocks();

    try {
      await onDelete(currentEventId);
      onClose();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("pages.calendar.errors.deleteMoment")
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTrackingToggle = () => {
    if (!currentEventId || !onToggleTracking) return;
    onToggleTracking(currentEventId);
    setIsTracking((prev) => !prev);
  };

  const colorOptions: Array<{
    value: EventColor;
    label: string;
    bgClass: string;
    borderClass: string;
  }> = [
      {
        bgClass: "bg-sky-400 data-[state=checked]:bg-sky-400",
        borderClass: "border-sky-400 data-[state=checked]:border-sky-400",
        label: "Sky",
        value: "sky",
      },
      {
        bgClass: "bg-amber-400 data-[state=checked]:bg-amber-400",
        borderClass: "border-amber-400 data-[state=checked]:border-amber-400",
        label: "Amber",
        value: "amber",
      },
      {
        bgClass: "bg-violet-400 data-[state=checked]:bg-violet-400",
        borderClass: "border-violet-400 data-[state=checked]:border-violet-400",
        label: "Violet",
        value: "violet",
      },
      {
        bgClass: "bg-rose-400 data-[state=checked]:bg-rose-400",
        borderClass: "border-rose-400 data-[state=checked]:border-rose-400",
        label: "Rose",
        value: "rose",
      },
      {
        bgClass: "bg-emerald-400 data-[state=checked]:bg-emerald-400",
        borderClass: "border-emerald-400 data-[state=checked]:border-emerald-400",
        label: "Emerald",
        value: "emerald",
      },
      {
        bgClass: "bg-orange-400 data-[state=checked]:bg-orange-400",
        borderClass: "border-orange-400 data-[state=checked]:border-orange-400",
        label: "Orange",
        value: "orange",
      },
    ];

  const isMobile = useIsMobile();

  const DialogInnerContent = (
    <div className="flex flex-col flex-1 min-h-0 w-full md:w-[400px]">
      <SidebarHeader className="flex-row items-center justify-between border-b px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">
          {currentEventId
            ? t("pages.calendar.momentTitleEdit")
            : t("pages.calendar.momentTitleCreate")}
        </h2>
        <Button onClick={onClose} size="icon" variant="ghost" className="h-8 w-8 rounded-full">
          <RiCloseLine size={16} aria-hidden="true" />
          <span className="sr-only">Close</span>
        </Button>
      </SidebarHeader>
      <SidebarContent className="flex-1 w-full md:w-[400px]">

        <div className="border-b border-border p-2">
          <div className="inline-flex w-full rounded-md border border-border bg-muted/50 p-1">
            <Button
              type="button"
              variant={activeTab === "details" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setActiveTab("details")}
            >
              {t("pages.calendar.momentTabs.details")}
            </Button>
            <Button
              type="button"
              variant={activeTab === "content" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setActiveTab("content")}
            >
              {t("pages.calendar.momentTabs.content")}
            </Button>
            <Button
              type="button"
              variant={activeTab === "coach" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setActiveTab("coach")}
            >
              {t("pages.calendar.momentTabs.coach")}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-md bg-destructive/15 px-3 py-2 text-destructive text-sm">
            {error}
          </div>
        )}

        {activeTab === "details" ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid gap-4">
              <div className="*:not-first:mt-1.5">
                <Label htmlFor="title">{t("pages.calendar.momentFields.title")}</Label>
                <Input
                  id="title"
                  onChange={(e) => setTitle(e.target.value)}
                  value={title}
                />
              </div>

              <div className="*:not-first:mt-1.5">
                <Label htmlFor="description">{t("pages.calendar.momentFields.description")}</Label>
                <Textarea
                  id="description"
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  value={description}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="*:not-first:mt-1.5">
                  <Label htmlFor="start-date">{t("pages.calendar.momentFields.startDate")}</Label>
                  <Popover onOpenChange={setStartDateOpen} open={startDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        className={cn(
                          "group w-full justify-between border-input bg-background px-3 font-normal outline-none outline-offset-0 hover:bg-background focus-visible:outline-[3px]",
                          !startDate && "text-muted-foreground"
                        )}
                        id="start-date"
                        variant="outline"
                      >
                        <span className={cn("truncate", !startDate && "text-muted-foreground")}>
                          {startDate
                            ? format(startDate, "PPP")
                            : t("pages.calendar.momentFields.pickDate")}
                        </span>
                        <RiCalendarLine
                          aria-hidden="true"
                          className="shrink-0 text-muted-foreground/80"
                          size={16}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-2">
                      <Calendar
                        defaultMonth={startDate}
                        mode="single"
                        onSelect={(date) => {
                          if (!date) return;
                          setStartDate(date);
                          if (isBefore(endDate, date)) {
                            setEndDate(date);
                          }
                          setError(null);
                          setStartDateOpen(false);
                        }}
                        selected={startDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {!allDay ? (
                  <div className="*:not-first:mt-1.5">
                    <Label htmlFor="start-time">{t("pages.calendar.momentFields.startTime")}</Label>
                    <Select onValueChange={setStartTime} value={startTime}>
                      <SelectTrigger id="start-time">
                        <SelectValue placeholder={t("pages.calendar.momentFields.selectTime")} />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="*:not-first:mt-1.5">
                  <Label htmlFor="end-date">{t("pages.calendar.momentFields.endDate")}</Label>
                  <Popover onOpenChange={setEndDateOpen} open={endDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        className={cn(
                          "group w-full justify-between border-input bg-background px-3 font-normal outline-none outline-offset-0 hover:bg-background focus-visible:outline-[3px]",
                          !endDate && "text-muted-foreground"
                        )}
                        id="end-date"
                        variant="outline"
                      >
                        <span className={cn("truncate", !endDate && "text-muted-foreground")}>
                          {endDate
                            ? format(endDate, "PPP")
                            : t("pages.calendar.momentFields.pickDate")}
                        </span>
                        <RiCalendarLine
                          aria-hidden="true"
                          className="shrink-0 text-muted-foreground/80"
                          size={16}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-2">
                      <Calendar
                        defaultMonth={endDate}
                        disabled={{ before: startDate }}
                        mode="single"
                        onSelect={(date) => {
                          if (!date) return;
                          setEndDate(date);
                          setError(null);
                          setEndDateOpen(false);
                        }}
                        selected={endDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {!allDay ? (
                  <div className="*:not-first:mt-1.5">
                    <Label htmlFor="end-time">{t("pages.calendar.momentFields.endTime")}</Label>
                    <Select onValueChange={setEndTime} value={endTime}>
                      <SelectTrigger id="end-time">
                        <SelectValue placeholder={t("pages.calendar.momentFields.selectTime")} />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allDay}
                  id="all-day"
                  onCheckedChange={(checked) => setAllDay(checked === true)}
                />
                <Label htmlFor="all-day">{t("pages.calendar.momentFields.allDay")}</Label>
              </div>

              <RecurrenceInput
                value={rrule}
                onChange={setRRule}
                startDate={startDate}
              />

              <div className="*:not-first:mt-1.5">
                <Label htmlFor="location">{t("pages.calendar.momentFields.location")}</Label>
                <Input
                  id="location"
                  onChange={(e) => setLocation(e.target.value)}
                  value={location}
                />
              </div>

              <ProjectSeriesSelector
                projectId={projectId}
                seriesId={seriesId}
                onProjectChange={setProjectId}
                onSeriesChange={setSeriesId}
              />

              <fieldset className="space-y-4 pt-2">
                <legend className="font-medium text-foreground text-sm leading-none">
                  {t("pages.calendar.momentFields.color")}
                </legend>
                <RadioGroup
                  className="flex flex-wrap gap-2"
                  defaultValue={colorOptions[0]?.value}
                  onValueChange={(value: EventColor) => setColor(value)}
                  value={color}
                >
                  {colorOptions.map((colorOption) => (
                    <RadioGroupItem
                      aria-label={colorOption.label}
                      className={cn(
                        "size-6 shadow-none",
                        colorOption.bgClass,
                        colorOption.borderClass
                      )}
                      id={`color-${colorOption.value}`}
                      key={colorOption.value}
                      value={colorOption.value}
                    />
                  ))}
                </RadioGroup>
              </fieldset>

              <div className="space-y-2 pt-2">
                <p className="font-medium text-foreground text-sm">
                  {t("pages.calendar.momentLinks.title")}
                </p>
                {!itemId ? (
                  <p className="text-muted-foreground text-xs">
                    {t("pages.calendar.momentLinks.afterCreate")}
                  </p>
                ) : linksLoading ? (
                  <p className="text-muted-foreground text-xs">
                    {t("pages.calendar.momentLinks.loading")}
                  </p>
                ) : links.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    {t("pages.calendar.momentLinks.empty")}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {links.map((link) => (
                      <li
                        className="rounded-md border border-border bg-muted/30 px-2 py-1 text-xs"
                        key={link.id}
                      >
                        {link.relation_type} - {link.to_entity_type}:{link.to_entity_id}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "content" ? (
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            {contentSaveLabel ? (
              <p className="mb-2 text-muted-foreground text-xs">{contentSaveLabel}</p>
            ) : null}
            <div className="flex-1 min-h-0 overflow-hidden rounded-md border border-border bg-background">
              <BlockEditor
                editorKey={currentItemId || "moment-content-draft"}
                value={blocks}
                onChange={handleBlocksChange}
                editable
                className="h-full"
              />
            </div>
          </div>
        ) : null}

        {activeTab === "coach" ? (
          <div className="p-4">
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-muted-foreground text-sm">
              {t("pages.calendar.coachPlaceholder")}
            </div>
          </div>
        ) : null}

        <div className="mt-auto border-t border-border p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {currentEventId && onToggleTracking ? (
                <Button
                  onClick={handleTrackingToggle}
                  variant="outline"
                  className="flex-1"
                  disabled={isTrackingActionPending || isSaving || isDeleting}
                >
                  {isTracking ? t("pages.calendar.actions.stop") : t("pages.calendar.actions.start")}
                </Button>
              ) : null}
              {currentEventId ? (
                <Button
                  aria-label={t("pages.calendar.actions.delete")}
                  onClick={() => void handleDelete()}
                  size="icon"
                  variant="outline"
                  disabled={isDeleting || isSaving}
                >
                  <RiDeleteBinLine aria-hidden="true" size={16} />
                </Button>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                onClick={() => {
                  cancelDebouncedPersistBlocks();
                  onClose();
                }}
                variant="outline"
                className="flex-1"
                disabled={isSaving || isDeleting}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={() => void handleSave()} className="flex-1" disabled={isSaving || isDeleting}>
                {isSaving ? t("pages.calendar.saving") : t("common.save")}
              </Button>
            </div>
          </div>
        </div>
      </SidebarContent>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(o) => (!o ? onClose() : null)}>
        <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col">
          {DialogInnerContent}
        </SheetContent>
      </Sheet>
    );
  }

  const desktopSidebar = (
    <div
      className={cn(
        "bg-background transition-[width] duration-200 ease-linear hidden md:flex flex-col h-svh overflow-hidden shrink-0",
        isOpen ? "w-[400px] border-l border-border" : "w-0"
      )}
      aria-hidden={!isOpen}
    >
      {DialogInnerContent}
    </div>
  );

  if (!mounted) return null;
  const container = typeof document !== 'undefined' ? document.getElementById("right-sidebar-slot") : null;
  if (!container) return desktopSidebar;

  return createPortal(desktopSidebar, container);
}
