"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Bell,
    Bot,
    CalendarClock,
    Download,
    Globe,
    Lock,
    Palette,
    Shield,
    Trash2,
    User,
} from "lucide-react";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";

import { useMe } from "@/hooks/use-me";
import {
    useAiPreferences,
    useUpdateAiPreferences,
} from "@/hooks/use-ai-preferences";
import {
    useCalendarPreferences,
    useUpdateCalendarPreferences,
} from "@/hooks/use-calendar-preferences";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SectionKey =
    | "profile"
    | "calendar"
    | "ai"
    | "appearance"
    | "notifications"
    | "account";

const NAV_ITEMS: { key: SectionKey; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "profile", icon: User },
    { key: "calendar", icon: CalendarClock },
    { key: "ai", icon: Bot },
    { key: "appearance", icon: Palette },
    { key: "notifications", icon: Bell },
    { key: "account", icon: Shield },
];

type ProviderName = "mistral" | "openai" | "heuristic";

const DEFAULT_PROVIDERS = {
    transcription: { provider: "mistral" as ProviderName, model: "voxtral-mini-latest", language: "auto", fallback_enabled: true },
    ocr: { provider: "mistral" as ProviderName, model: "mistral-ocr-latest", fallback_enabled: true },
    vlm: { provider: "mistral" as ProviderName, model: "pixtral-large-latest", fallback_enabled: true },
};

type ModelOption = { value: string; label: string; disabled?: boolean };

const MODEL_OPTIONS: Record<"transcription" | "ocr" | "vlm", { available: ModelOption[]; comingSoon: ModelOption[] }> = {
    transcription: {
        available: [
            { value: "voxtral-mini-latest", label: "Mistral Voxtral Mini" },
        ],
        comingSoon: [
            { value: "whisper-1", label: "OpenAI Whisper", disabled: true },
        ],
    },
    ocr: {
        available: [
            { value: "mistral-ocr-latest", label: "Mistral OCR" },
        ],
        comingSoon: [
            { value: "gpt-5-mini", label: "OpenAI GPT-5 Mini (Vision)", disabled: true },
            { value: "gemini/gemini-3-flash", label: "Google Gemini 3 Flash", disabled: true },
        ],
    },
    vlm: {
        available: [
            { value: "pixtral-large-latest", label: "Mistral Pixtral Large" },
        ],
        comingSoon: [
            { value: "gpt-5-mini", label: "OpenAI GPT-5 Mini", disabled: true },
            { value: "claude-haiku-4-5-20251001", label: "Anthropic Haiku 4.5", disabled: true },
            { value: "gemini/gemini-3-flash", label: "Google Gemini 3 Flash", disabled: true },
        ],
    },
};

/* ------------------------------------------------------------------ */
/*  Section: Profile                                                   */
/* ------------------------------------------------------------------ */

function SectionProfile() {
    const { t } = useTranslation();
    const { data } = useMe();
    const user = data?.user;
    const workspace = data?.active_workspace;

    return (
        <div className="space-y-4">
            {/* Functional */}
            <div className="space-y-3">
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t("pages.settings.profile.email")}</Label>
                    <Input value={user?.email ?? ""} readOnly className="bg-muted/40 h-8 text-sm" />
                </div>
                {workspace && (
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t("pages.settings.profile.workspace")}</Label>
                        <div className="flex items-center gap-2">
                            <Input value={workspace.name} readOnly className="bg-muted/40 h-8 text-sm" />
                            <Badge variant="outline" className="shrink-0 capitalize text-xs">{workspace.role}</Badge>
                        </div>
                    </div>
                )}
            </div>

            <Separator />

            {/* Placeholder */}
            <div className="space-y-3 opacity-50">
                <div className="flex items-center justify-between">
                    <Label className="text-xs">{t("pages.settings.profile.displayName")}</Label>
                    <Badge variant="secondary" className="text-[10px]">{t("pages.settings.comingSoon")}</Badge>
                </div>
                <Input placeholder={t("pages.settings.profile.displayNamePlaceholder")} disabled className="h-8 text-sm" />

                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/30">
                        <User className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-xs font-medium">{t("pages.settings.profile.avatar")}</p>
                        <p className="text-[10px] text-muted-foreground">{t("pages.settings.profile.avatarHint")}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                    <div>
                        <p className="text-xs font-medium">{t("pages.settings.profile.password")}</p>
                        <p className="text-[10px] text-muted-foreground">{t("pages.settings.profile.passwordHint")}</p>
                    </div>
                    <Button variant="outline" size="sm" disabled className="h-7 text-xs">
                        {t("pages.settings.profile.changePassword")}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Section: Calendar                                                  */
/* ------------------------------------------------------------------ */

function SectionCalendar() {
    const { t } = useTranslation();
    const query = useCalendarPreferences();
    const mutation = useUpdateCalendarPreferences();
    const [startHour, setStartHour] = useState(8);
    const [endHour, setEndHour] = useState(24);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (query.data) {
            setStartHour(query.data.start_hour ?? 8);
            setEndHour(query.data.end_hour ?? 24);
        }
    }, [query.data]);

    const save = async () => {
        if (endHour <= startHour) return;
        await mutation.mutateAsync({
            start_hour: startHour,
            end_hour: endHour,
            last_known_updated_at: query.data?.updated_at,
        });
        setDirty(false);
    };

    return (
        <div className="space-y-4">
            <HourRow
                label={t("pages.settings.calendarStartHour")}
                help={t("pages.settings.calendarStartHourHelp")}
                value={startHour}
                canDec={startHour > 0}
                canInc={startHour + 1 < endHour}
                onDec={() => { setStartHour((v) => Math.max(0, v - 1)); setDirty(true); }}
                onInc={() => { setStartHour((v) => Math.min(endHour - 1, v + 1)); setDirty(true); }}
            />
            <HourRow
                label={t("pages.settings.calendarEndHour")}
                help={t("pages.settings.calendarEndHourHelp")}
                value={endHour}
                canDec={endHour - 1 > startHour}
                canInc={endHour < 24}
                onDec={() => { setEndHour((v) => Math.max(startHour + 1, v - 1)); setDirty(true); }}
                onInc={() => { setEndHour((v) => Math.min(24, v + 1)); setDirty(true); }}
            />
            <SaveRow
                dirty={dirty}
                isPending={mutation.isPending}
                isSuccess={mutation.isSuccess && !dirty}
                onSave={() => void save()}
                t={t}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Section: AI                                                        */
/* ------------------------------------------------------------------ */

function SectionAi() {
    const { t } = useTranslation();
    const query = useAiPreferences();
    const mutation = useUpdateAiPreferences();

    const [mode, setMode] = useState<"proposal_only" | "auto_apply">("proposal_only");
    const [threshold, setThreshold] = useState(0.9);
    const [maxActions, setMaxActions] = useState(3);
    const [providers, setProviders] = useState(DEFAULT_PROVIDERS);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (query.data) {
            setMode(query.data.mode);
            setThreshold(query.data.auto_apply_threshold ?? 0.9);
            setMaxActions(query.data.max_actions_per_capture ?? 3);
            if (query.data.capture_provider_preferences) {
                setProviders(query.data.capture_provider_preferences);
            }
        }
    }, [query.data]);

    function patchProvider(key: "transcription" | "ocr" | "vlm", patch: Record<string, unknown>) {
        setProviders((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
        setDirty(true);
    }

    const save = async () => {
        await mutation.mutateAsync({
            mode,
            auto_apply_threshold: Number(threshold.toFixed(2)),
            max_actions_per_capture: maxActions,
            capture_provider_preferences: providers,
            last_known_updated_at: query.data?.updated_at,
        });
        setDirty(false);
    };

    return (
        <div className="space-y-4">
            {/* Mode */}
            <div className="space-y-1">
                <Label className="text-xs">{t("pages.settings.aiMode")}</Label>
                <p className="text-[10px] text-muted-foreground">{t("pages.settings.aiModeHelp")}</p>
                <div className="flex gap-2 pt-0.5">
                    <Button size="sm" className="h-7 text-xs" variant={mode === "proposal_only" ? "default" : "outline"} onClick={() => { setMode("proposal_only"); setDirty(true); }}>
                        {t("pages.settings.aiModeProposalOnly")}
                    </Button>
                    <Button size="sm" className="h-7 text-xs" variant={mode === "auto_apply" ? "default" : "outline"} onClick={() => { setMode("auto_apply"); setDirty(true); }}>
                        {t("pages.settings.aiModeAutoApply")}
                    </Button>
                </div>
            </div>

            {/* Threshold */}
            <HourRow
                label={t("pages.settings.aiThreshold")}
                help={t("pages.settings.aiThresholdHelp")}
                value={threshold}
                format={(v) => v.toFixed(2)}
                canDec={threshold > 0}
                canInc={threshold < 1}
                onDec={() => { setThreshold((v) => Math.max(0, Number((v - 0.05).toFixed(2)))); setDirty(true); }}
                onInc={() => { setThreshold((v) => Math.min(1, Number((v + 0.05).toFixed(2)))); setDirty(true); }}
            />

            {/* Max actions */}
            <HourRow
                label={t("pages.settings.aiMaxActions")}
                help={t("pages.settings.aiMaxActionsHelp")}
                value={maxActions}
                canDec={maxActions > 1}
                canInc={maxActions < 10}
                onDec={() => { setMaxActions((v) => v - 1); setDirty(true); }}
                onInc={() => { setMaxActions((v) => v + 1); setDirty(true); }}
            />

            <Separator />

            {/* Providers */}
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("pages.settings.captureProviders")}
            </p>
            {(["transcription", "ocr", "vlm"] as const).map((key) => {
                const options = MODEL_OPTIONS[key];
                return (
                    <div key={key} className="space-y-2.5 rounded-lg border border-border/60 bg-muted/20 p-3">
                        <p className="text-xs font-medium">{t(`pages.settings.provider${key.charAt(0).toUpperCase() + key.slice(1)}`)}</p>

                        {/* Model dropdown */}
                        <Select
                            value={providers[key].model}
                            onValueChange={(value) => patchProvider(key, { model: value })}
                        >
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={t("pages.settings.modelPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel className="text-[10px]">Available</SelectLabel>
                                    {options.available.map((m) => (
                                        <SelectItem key={m.value} value={m.value} className="text-xs">
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                                <SelectSeparator />
                                <SelectGroup>
                                    <SelectLabel className="text-[10px] text-muted-foreground/60">Coming soon</SelectLabel>
                                    {options.comingSoon.map((m) => (
                                        <SelectItem key={m.value} value={m.value} disabled className="text-xs opacity-50">
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>

                        {/* Fallback toggle */}
                        <div className="flex items-center justify-between">
                            <Label className="text-xs">{t("pages.settings.fallbackLabel")}</Label>
                            <Switch checked={providers[key].fallback_enabled} onCheckedChange={(c) => patchProvider(key, { fallback_enabled: c })} />
                        </div>
                    </div>
                );
            })}

            <SaveRow dirty={dirty} isPending={mutation.isPending} isSuccess={mutation.isSuccess && !dirty} onSave={() => void save()} t={t} />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Section: Appearance (placeholder)                                  */
/* ------------------------------------------------------------------ */

function SectionAppearance() {
    const { t } = useTranslation();
    return (
        <div className="space-y-4 opacity-50">
            <div className="flex items-center justify-between">
                <Label className="text-xs">{t("pages.settings.appearance.theme")}</Label>
                <Badge variant="secondary" className="text-[10px]">{t("pages.settings.comingSoon")}</Badge>
            </div>
            <div className="flex gap-2">
                {(["themeLight", "themeDark", "themeSystem"] as const).map((k) => (
                    <Button key={k} size="sm" className="h-7 text-xs" variant={k === "themeSystem" ? "default" : "outline"} disabled>
                        {t(`pages.settings.appearance.${k}`)}
                    </Button>
                ))}
            </div>

            <Separator />

            <Label className="text-xs">{t("pages.settings.appearance.language")}</Label>
            <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" variant="default" disabled>
                    <Globe className="mr-1.5 size-3" />
                    {t("pages.settings.appearance.languageFr")}
                </Button>
                <Button size="sm" className="h-7 text-xs" variant="outline" disabled>
                    {t("pages.settings.appearance.languageEn")}
                </Button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Section: Notifications (placeholder)                               */
/* ------------------------------------------------------------------ */

function SectionNotifications() {
    const { t } = useTranslation();
    return (
        <div className="space-y-4 opacity-50">
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium">{t("pages.settings.notifications.title")}</p>
                <Badge variant="secondary" className="text-[10px]">{t("pages.settings.comingSoon")}</Badge>
            </div>
            {(["push", "email", "reminders"] as const).map((k) => (
                <div key={k} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                    <div>
                        <p className="text-xs font-medium">{t(`pages.settings.notifications.${k}`)}</p>
                        <p className="text-[10px] text-muted-foreground">{t(`pages.settings.notifications.${k}Help`)}</p>
                    </div>
                    <Switch disabled checked={k === "push"} />
                </div>
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Section: Account (placeholder)                                     */
/* ------------------------------------------------------------------ */

function SectionAccount() {
    const { t } = useTranslation();
    return (
        <div className="space-y-4">
            <div className="opacity-50">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">{t("pages.settings.account.exportData")}</p>
                    <Badge variant="secondary" className="text-[10px]">{t("pages.settings.comingSoon")}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">{t("pages.settings.account.exportDataHelp")}</p>
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
                    <Download className="mr-1.5 size-3" />
                    {t("pages.settings.account.exportButton")}
                </Button>
            </div>

            <Separator />

            <div className="opacity-50">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-destructive/80 mb-2">
                    {t("pages.settings.account.dangerZone")}
                </p>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                    <p className="text-xs font-medium text-destructive">{t("pages.settings.account.deleteAccount")}</p>
                    <p className="text-[10px] text-muted-foreground mb-2">{t("pages.settings.account.deleteAccountHelp")}</p>
                    <Button variant="destructive" size="sm" className="h-7 text-xs" disabled>
                        <Trash2 className="mr-1.5 size-3" />
                        {t("pages.settings.account.deleteButton")}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

function HourRow({
    label,
    help,
    value,
    format,
    canDec,
    canInc,
    onDec,
    onInc,
}: {
    label: string;
    help: string;
    value: number;
    format?: (v: number) => string;
    canDec: boolean;
    canInc: boolean;
    onDec: () => void;
    onInc: () => void;
}) {
    const display = format ? format(value) : `${String(value).padStart(2, "0")}:00`;
    return (
        <div className="flex items-center justify-between">
            <div className="space-y-0.5">
                <Label className="text-xs">{label}</Label>
                <p className="text-[10px] text-muted-foreground">{help}</p>
            </div>
            <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" disabled={!canDec} onClick={onDec} className="h-7 w-7 p-0 text-xs">−</Button>
                <span className="w-12 text-center text-xs font-medium tabular-nums">{display}</span>
                <Button size="sm" variant="outline" disabled={!canInc} onClick={onInc} className="h-7 w-7 p-0 text-xs">+</Button>
            </div>
        </div>
    );
}

function SaveRow({
    dirty,
    isPending,
    isSuccess,
    onSave,
    t,
}: {
    dirty: boolean;
    isPending: boolean;
    isSuccess: boolean;
    onSave: () => void;
    t: (k: string) => string;
}) {
    return (
        <div className="flex items-center justify-end gap-2 pt-1">
            {isSuccess && <span className="text-[10px] text-emerald-600">{t("pages.settings.saved")}</span>}
            <Button size="sm" className="h-7 text-xs" onClick={onSave} disabled={isPending || !dirty}>
                {t("common.save")}
            </Button>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Section router                                                     */
/* ------------------------------------------------------------------ */

const SECTIONS: Record<SectionKey, React.ComponentType> = {
    profile: SectionProfile,
    calendar: SectionCalendar,
    ai: SectionAi,
    appearance: SectionAppearance,
    notifications: SectionNotifications,
    account: SectionAccount,
};

/* ------------------------------------------------------------------ */
/*  Main dialog                                                        */
/* ------------------------------------------------------------------ */

export function SettingsDialog({ children }: { children?: React.ReactNode }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<SectionKey>("profile");

    const ActiveComponent = SECTIONS[activeSection];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
                <DialogTitle className="sr-only">{t("pages.settings.title")}</DialogTitle>
                <DialogDescription className="sr-only">{t("pages.settings.subtitle")}</DialogDescription>
                <SidebarProvider className="items-start">
                    <Sidebar collapsible="none" className="hidden md:flex">
                        <SidebarContent>
                            <SidebarGroup>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {NAV_ITEMS.map((item) => (
                                            <SidebarMenuItem key={item.key}>
                                                <SidebarMenuButton
                                                    isActive={activeSection === item.key}
                                                    onClick={() => setActiveSection(item.key)}
                                                >
                                                    <item.icon className="size-4" />
                                                    <span>{t(`pages.settings.nav.${item.key}`)}</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </SidebarContent>
                    </Sidebar>
                    <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
                        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem className="hidden md:block">
                                        <BreadcrumbLink href="#">{t("pages.settings.title")}</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator className="hidden md:block" />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>{t(`pages.settings.nav.${activeSection}`)}</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </header>
                        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                            {/* Section subtitle */}
                            <div>
                                <h3 className="text-sm font-semibold">
                                    {t(`pages.settings.nav.${activeSection}`)}
                                </h3>
                                <p className="text-[10px] text-muted-foreground">
                                    {activeSection === "profile" && t("pages.settings.profile.subtitle")}
                                    {activeSection === "calendar" && t("pages.settings.calendarSubtitle")}
                                    {activeSection === "ai" && t("pages.settings.aiSubtitle")}
                                    {activeSection === "appearance" && t("pages.settings.appearance.subtitle")}
                                    {activeSection === "notifications" && t("pages.settings.notifications.subtitle")}
                                    {activeSection === "account" && t("pages.settings.account.subtitle")}
                                </p>
                            </div>
                            <ActiveComponent />
                        </div>
                    </main>
                </SidebarProvider>
            </DialogContent>
        </Dialog>
    );
}
