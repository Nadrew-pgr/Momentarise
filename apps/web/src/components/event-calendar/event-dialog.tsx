"use client";

import { RiCalendarLine, RiDeleteBinLine, RiCloseLine, RiSparklingLine } from "@remixicon/react";
import {
  BLOCK_DISPLAY_META,
  QUICK_UPDATE_LABELS,
  STARTER_KITS,
  applyRuntimeUpdateDraft,
  buildStarterKitBlocks,
  businessBlockTypeValues,
  createBusinessBlock,
  eventContentResponseSchema,
  eventContentUpdateRequestSchema,
  getBusinessBlockPreview,
  insertBusinessBlocks,
  resolveContentRenderMode,
  sanitizeBusinessBlocks,
  type BusinessBlock,
  type ContentRenderMode,
} from "@momentarise/shared";
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
import { useEventAnalytics, useEventContent } from "@/hooks/use-events";
import { useItemLinks } from "@/hooks/use-item";
import { useProjects } from "@/hooks/use-projects";
import { useSeries } from "@/hooks/use-series";
import { BusinessBlocksEditor } from "@/components/business-blocks-editor";
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
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { RecurrenceInput } from "./recurrence-input";
import { ProjectSeriesSelector } from "./project-series-selector";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

type MomentTab = "details" | "content" | "coach";
type ContentSaveState = "idle" | "saving" | "saved" | "error";

type QuickUpdateState = {
  status: string;
  energy: string;
  progressDelta: string;
  nextAction: string;
};

function makeBlockId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `blk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatSecondsCompact(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "--";
  const seconds = Math.max(0, Math.round(value));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
  return `${minutes}m`;
}

function parseQuickNumber(value: string): number | null {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function buildQuickUpdateState(blocks: BusinessBlock[]): QuickUpdateState {
  const statusBlock = blocks.find(
    (block) => block.type === "status_block" && (block.label ?? "") === QUICK_UPDATE_LABELS.status
  );
  const energyBlock = blocks.find(
    (block) => block.type === "scale_block" && (block.label ?? "") === QUICK_UPDATE_LABELS.energy
  );
  const progressBlock = blocks.find(
    (block) => block.type === "metric_block" && (block.label ?? "") === QUICK_UPDATE_LABELS.progressDelta
  );
  const nextActionBlock = blocks.find(
    (block) => block.type === "task_block" && (block.label ?? "") === QUICK_UPDATE_LABELS.nextAction
  );

  return {
    status: statusBlock && statusBlock.type === "status_block" ? statusBlock.payload.state : "on_track",
    energy:
      energyBlock && energyBlock.type === "scale_block" ? String(energyBlock.payload.value ?? "") : "",
    progressDelta:
      progressBlock && progressBlock.type === "metric_block" && progressBlock.payload.current != null
        ? String(progressBlock.payload.current)
        : "",
    nextAction:
      nextActionBlock && nextActionBlock.type === "task_block" ? nextActionBlock.payload.title ?? "" : "",
  };
}

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
  const [activeContentBlockId, setActiveContentBlockId] = useState<string | null>(null);
  const [quickUpdate, setQuickUpdate] = useState<QuickUpdateState>({
    status: "on_track",
    energy: "",
    progressDelta: "",
    nextAction: "",
  });
  const [futureAiPrompt, setFutureAiPrompt] = useState("");
  const [contentModeOverride, setContentModeOverride] = useState<ContentRenderMode | null>(null);

  const [blocks, setBlocks] = useState<BusinessBlock[]>([]);
  const [blocksHydrated, setBlocksHydrated] = useState(false);
  const [contentDirty, setContentDirty] = useState(false);
  const [contentSaveState, setContentSaveState] = useState<ContentSaveState>("idle");
  const [isContentFullscreen, setIsContentFullscreen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsContentFullscreen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setContentModeOverride(null);
  }, [currentEventId]);

  const itemId = currentItemId || null;
  const { data: eventContent } = useEventContent(currentEventId || null);
  const { data: eventAnalytics } = useEventAnalytics(currentEventId || null, "week");
  const { data: linksData, isLoading: linksLoading } = useItemLinks(itemId);
  const { data: projects = [] } = useProjects();
  const { data: availableSeries = [] } = useSeries(projectId);
  const links = linksData?.links ?? [];

  useEffect(() => {
    if (!eventContent || !currentEventId || blocksHydrated || contentDirty) {
      return;
    }
    setBlocks(eventContent.blocks ?? []);
    if (eventContent.item_id !== currentItemId) {
      setCurrentItemId(eventContent.item_id);
    }
    setBlocksHydrated(true);
  }, [blocksHydrated, contentDirty, currentEventId, currentItemId, eventContent]);

  useEffect(() => {
    setQuickUpdate(buildQuickUpdateState(blocks));
  }, [blocks]);

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
      setActiveContentBlockId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, event?.itemId, event?.start.getTime(), event?.end.getTime(), event?.allDay, event?.title]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projectId, projects]
  );
  const selectedSeries = useMemo(
    () => availableSeries.find((series) => series.id === seriesId) ?? null,
    [availableSeries, seriesId]
  );

  const persistBlocks = useCallback(
    async (targetEventId: string, nextBlocks: BusinessBlock[]) => {
      const sanitizedBlocks = sanitizeBusinessBlocks(nextBlocks);
      const body = eventContentUpdateRequestSchema.parse({
        schema_version: "business_blocks_v1",
        blocks: sanitizedBlocks,
      });
      const res = await fetchWithAuth(`/api/events/${targetEventId}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw await readApiError(res, t("pages.calendar.errors.saveContent"));
      }
      const payload = eventContentResponseSchema.parse(await res.json());
      if (payload.item_id !== currentItemId) {
        setCurrentItemId(payload.item_id);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["event-content", targetEventId] }),
        queryClient.invalidateQueries({ queryKey: ["event-analytics", targetEventId] }),
        queryClient.invalidateQueries({ queryKey: ["item", payload.item_id] }),
        queryClient.invalidateQueries({ queryKey: ["item-links", payload.item_id] }),
        queryClient.invalidateQueries({ queryKey: ["inbox"] }),
      ]);
    },
    [currentItemId, queryClient, t]
  );

  const { debounced: debouncedPersistBlocks, cancel: cancelDebouncedPersistBlocks } =
    useDebouncedCallback((targetEventId: string, nextBlocks: BusinessBlock[]) => {
      void persistBlocks(targetEventId, nextBlocks)
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
    (nextBlocks: BusinessBlock[]) => {
      const sanitizedBlocks = sanitizeBusinessBlocks(nextBlocks);
      setBlocks(sanitizedBlocks);
      setContentDirty(true);

      if (!currentEventId) {
        setContentSaveState("idle");
        return;
      }

      setContentSaveState("saving");
      debouncedPersistBlocks(currentEventId, sanitizedBlocks);
    },
    [currentEventId, debouncedPersistBlocks]
  );

  const contentSaveLabel = useMemo(() => {
    if (contentSaveState === "saving") return t("pages.calendar.momentContent.saving");
    if (contentSaveState === "saved") return t("pages.calendar.momentContent.saved");
    if (contentSaveState === "error") return t("pages.calendar.momentContent.saveError");
    if (!currentEventId) return t("pages.calendar.momentContent.deferred");
    return null;
  }, [contentSaveState, currentEventId, t]);

  const contentPreviewBlocks = useMemo(() => blocks.slice(0, 3), [blocks]);

  const timeLeftSeconds = useMemo(() => {
    const estimated =
      event?.estimatedTimeSeconds ??
      Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 1000));
    const actual = event?.actualTimeAccSeconds ?? 0;
    return Math.max(estimated - actual, 0);
  }, [endDate, event?.actualTimeAccSeconds, event?.estimatedTimeSeconds, startDate]);

  const completionPercent = Math.round((eventAnalytics?.current.completion_rate ?? 0) * 100);
  const energyScore = eventAnalytics?.current.energy_score;
  const energyDelta = eventAnalytics?.delta.energy_score ?? 0;
  const contentRenderMode = useMemo(
    () =>
      resolveContentRenderMode({
        startAt: startDate,
        endAt: endDate,
        isTracking,
        override: contentModeOverride,
      }),
    [contentModeOverride, endDate, isTracking, startDate]
  );
  const isRunMode = contentRenderMode === "run";

  const insertSingleBusinessBlock = useCallback(
    (type: (typeof businessBlockTypeValues)[number]) => {
      const next = sanitizeBusinessBlocks(
        insertBusinessBlocks(
          blocks,
          [createBusinessBlock(type, makeBlockId())],
          activeContentBlockId
        )
      );
      handleBlocksChange(next);
    },
    [activeContentBlockId, blocks, handleBlocksChange]
  );

  const applyStarterKit = useCallback(
    (key: (typeof STARTER_KITS)[number]["key"]) => {
      const next = sanitizeBusinessBlocks(
        insertBusinessBlocks(blocks, buildStarterKitBlocks(key, makeBlockId), activeContentBlockId)
      );
      handleBlocksChange(next);
    },
    [activeContentBlockId, blocks, handleBlocksChange]
  );

  const applyQuickUpdate = useCallback(() => {
    const parsedEnergy = quickUpdate.energy.trim() ? parseQuickNumber(quickUpdate.energy) : undefined;
    const parsedProgressDelta = quickUpdate.progressDelta.trim()
      ? parseQuickNumber(quickUpdate.progressDelta)
      : undefined;
    const next = sanitizeBusinessBlocks(
      applyRuntimeUpdateDraft(
        blocks,
        {
          status: quickUpdate.status,
          energy: parsedEnergy == null ? undefined : parsedEnergy,
          progressDelta: parsedProgressDelta == null ? undefined : parsedProgressDelta,
          nextAction: quickUpdate.nextAction,
        },
        makeBlockId
      )
    );
    handleBlocksChange(next);
  }, [blocks, handleBlocksChange, quickUpdate]);

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
        if (!nextEventId) {
          throw new Error(t("pages.calendar.errors.contentAttachFailed"));
        }
        setContentSaveState("saving");
        await persistBlocks(nextEventId, blocks);
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
      <SidebarContent className="flex-1 w-full overflow-hidden md:w-[400px]">

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
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="rounded-[28px] border border-border bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--accent))_100%)] p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                    Content studio
                  </div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
                    Build the moment with business blocks
                  </h3>
                  <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Use structured blocks for preparation, logging, follow-up and linked references.
                  </p>
                </div>
                <div className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {blocks.length} block{blocks.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-background/90 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">{completionPercent}%</p>
                  <p className="text-xs font-medium text-muted-foreground">Completion</p>
                </div>
                <div className="rounded-2xl border border-border bg-background/90 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Time left</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">{formatSecondsCompact(timeLeftSeconds)}</p>
                  <p className="text-xs font-medium text-muted-foreground">Estimated remaining</p>
                </div>
                <div className="rounded-2xl border border-border bg-background/90 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Energy</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
                    {energyScore != null ? Math.round(energyScore) : "--"}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    {energyScore != null ? `${energyDelta >= 0 ? "+" : ""}${Math.round(energyDelta)} vs previous` : "No data yet"}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {contentPreviewBlocks.length > 0 ? (
                  contentPreviewBlocks.map((block) => {
                    const meta = BLOCK_DISPLAY_META[block.type];
                    return (
                      <div key={block.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/90 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{meta.eyebrow}</p>
                          <p className="truncate text-sm font-semibold text-foreground">{(block.label ?? "").trim() || meta.title}</p>
                        </div>
                        <p className="max-w-[320px] truncate text-xs font-medium text-muted-foreground">{getBusinessBlockPreview(block)}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
                    No content yet. Open the studio to start from a starter kit or add a first block.
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{contentSaveLabel ?? "Changes save automatically while you edit."}</p>
                {!isMobile ? (
                  <Button
                    type="button"
                    className="rounded-2xl px-5"
                    onClick={() => setIsContentFullscreen(true)}
                  >
                    Open content studio
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "coach" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-muted-foreground text-sm">
              {t("pages.calendar.coachPlaceholder")}
            </div>
          </div>
        ) : null}

        <div className="shrink-0 border-t border-border p-4">
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

      {!isMobile ? (
        <Dialog open={isContentFullscreen} onOpenChange={setIsContentFullscreen}>
          <DialogContent className="h-[min(900px,calc(100vh-2rem))] !w-[min(1440px,calc(100vw-2rem))] !max-w-[min(1440px,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-border bg-background p-0 shadow-[0_36px_120px_-56px_rgba(15,23,42,0.55)] sm:!max-w-[min(1440px,calc(100vw-2rem))]">
            <DialogTitle className="sr-only">Moment content studio</DialogTitle>
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                      <span>Moment content studio</span>
                      <span className="h-1 w-1 rounded-full bg-border" />
                      <span>{contentSaveLabel ?? "Autosave active"}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <h2 className="min-w-0 truncate text-[1.35rem] font-extrabold tracking-tight text-foreground">
                        {title.trim() || event?.title || "Untitled moment"}
                      </h2>
                      {selectedProject ? (
                        <span className="inline-flex items-center rounded-full border border-border bg-accent px-3 py-1 text-[11px] font-bold text-foreground">
                          Project: {selectedProject.title}
                        </span>
                      ) : null}
                      {selectedSeries ? (
                        <span className="inline-flex items-center rounded-full border border-border bg-accent px-3 py-1 text-[11px] font-bold text-foreground">
                          Series: {selectedSeries.title}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="inline-flex rounded-full border border-border bg-accent p-1">
                      <Button
                        type="button"
                        variant={isRunMode ? "ghost" : "secondary"}
                        size="sm"
                        className="h-8 rounded-full px-3"
                        onClick={() => setContentModeOverride("builder")}
                      >
                        Builder
                      </Button>
                      <Button
                        type="button"
                        variant={isRunMode ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 rounded-full px-3"
                        onClick={() => setContentModeOverride("run")}
                      >
                        Run
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => setIsContentFullscreen(false)}>
                      Close studio
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center">
                  <div className="relative min-w-0 flex-1">
                    <RiSparklingLine className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={futureAiPrompt}
                      onChange={(event) => setFutureAiPrompt(event.target.value)}
                      placeholder="Que voulez-vous faire pendant ce Moment ?"
                      className="h-10 rounded-2xl border-border bg-background pl-10 shadow-none"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent px-3 py-2 text-xs font-semibold text-foreground">
                      <span className="text-muted-foreground">Status</span>
                      <span>{completionPercent}%</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent px-3 py-2 text-xs font-semibold text-foreground">
                      <span className="text-muted-foreground">Time left</span>
                      <span>{formatSecondsCompact(timeLeftSeconds)}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent px-3 py-2 text-xs font-semibold text-foreground">
                      <span className="text-muted-foreground">Energy</span>
                      <span>{energyScore != null ? Math.round(energyScore) : "--"}</span>
                      {energyScore != null ? (
                        <span className="text-[11px] text-muted-foreground">
                          {energyDelta >= 0 ? "+" : ""}{Math.round(energyDelta)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-h-0 min-w-0 overflow-hidden border-r border-border/70 bg-accent/20 px-4 py-4">
                  <BusinessBlocksEditor
                    value={blocks}
                    onChange={handleBlocksChange}
                    editable
                    className="h-full"
                    activeBlockId={activeContentBlockId}
                    onActiveBlockChange={setActiveContentBlockId}
                    renderMode={contentRenderMode}
                  />
                </div>

                <aside className="hidden min-h-0 overflow-y-auto bg-background/95 px-4 py-4 lg:flex lg:flex-col lg:gap-3">
                  <section className="rounded-[24px] border border-border bg-accent/20 p-4">
                    <div className="mb-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Runtime update</p>
                      <h3 className="mt-2 text-sm font-extrabold tracking-tight text-foreground">Patch the live signals</h3>
                    </div>
                    <div className="space-y-3">
                      <Select
                        value={quickUpdate.status}
                        onValueChange={(value) => setQuickUpdate((prev) => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on_track">On track</SelectItem>
                          <SelectItem value="at_risk">At risk</SelectItem>
                          <SelectItem value="off_track">Off track</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={quickUpdate.energy}
                        onChange={(event) => setQuickUpdate((prev) => ({ ...prev, energy: event.target.value }))}
                        placeholder="Energy (1-10)"
                        className="h-11 rounded-2xl border-slate-200 bg-white"
                      />
                      <Input
                        value={quickUpdate.progressDelta}
                        onChange={(event) => setQuickUpdate((prev) => ({ ...prev, progressDelta: event.target.value }))}
                        placeholder="Progress delta %"
                        className="h-11 rounded-2xl border-slate-200 bg-white"
                      />
                      <Input
                        value={quickUpdate.nextAction}
                        onChange={(event) => setQuickUpdate((prev) => ({ ...prev, nextAction: event.target.value }))}
                        placeholder="Next action"
                        className="h-11 rounded-2xl border-slate-200 bg-white"
                      />
                      <Button className="w-full rounded-2xl" onClick={applyQuickUpdate}>
                        Apply update
                      </Button>
                    </div>
                  </section>

                  {!isRunMode ? (
                    <>
                      <section className="rounded-[24px] border border-border bg-accent/20 p-4">
                        <div className="mb-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Starter kits</p>
                          <h3 className="mt-2 text-sm font-extrabold tracking-tight text-foreground">Start from a proven structure</h3>
                        </div>
                        <div className="space-y-3">
                          {STARTER_KITS.map((kit) => (
                            <button
                              key={kit.key}
                              type="button"
                              onClick={() => applyStarterKit(kit.key)}
                              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-accent"
                            >
                              <p className="text-sm font-bold text-foreground">{kit.title}</p>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{kit.description}</p>
                            </button>
                          ))}
                        </div>
                      </section>

                      <section className="rounded-[24px] border border-border bg-accent/20 p-4">
                        <div className="mb-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">All blocks</p>
                          <h3 className="mt-2 text-sm font-extrabold tracking-tight text-foreground">Add a single block</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {businessBlockTypeValues.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => insertSingleBusinessBlock(type)}
                              className="rounded-2xl border border-border bg-background px-3 py-2.5 text-left text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                            >
                              {BLOCK_DISPLAY_META[type].title}
                            </button>
                          ))}
                        </div>
                      </section>
                    </>
                  ) : (
                    <section className="rounded-[24px] border border-border bg-accent/20 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Run mode</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-foreground">
                        Keep this view focused on live adjustments. Switch back to Builder to add or restructure blocks.
                      </p>
                    </section>
                  )}
                </aside>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
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
