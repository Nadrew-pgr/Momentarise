import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProjects } from "@/hooks/use-projects";
import { useSeries } from "@/hooks/use-series";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ProjectSeriesSelectorProps {
    projectId: string | null;
    seriesId: string | null;
    onProjectChange: (id: string | null) => void;
    onSeriesChange: (id: string | null) => void;
}

export function ProjectSeriesSelector({
    projectId,
    seriesId,
    onProjectChange,
    onSeriesChange,
}: ProjectSeriesSelectorProps) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { data: projects = [], isLoading: pLoading } = useProjects();
    const { data: series = [], isLoading: sLoading } = useSeries();

    const activeSeriesForProject = useMemo(() => {
        if (!projectId) return [];
        return series.filter((s) => s.project_id === projectId);
    }, [projectId, series]);

    const selectedProjectValue = projectId ?? undefined;
    const selectedSeriesValue = seriesId ?? undefined;

    const projectLabel = t("pages.timeline.momentFields.project", t("pages.calendar.momentFields.project", "Project"));
    const selectProjectPlaceholder = t("pages.timeline.momentFields.selectProject", t("pages.calendar.momentFields.selectProject", "Select a project"));
    const seriesLabel = t("pages.timeline.momentFields.series", t("pages.calendar.momentFields.series", "Series"));
    const selectSeriesPlaceholder = t("pages.timeline.momentFields.selectSeries", t("pages.calendar.momentFields.selectSeries", "Select a series"));

    return (
        <View className="gap-3">
            <View>
                <Text className="mb-1 text-sm font-medium text-foreground">
                    {projectLabel}
                </Text>
                <Select
                    value={selectedProjectValue}
                    onValueChange={(val) => {
                        if (val) {
                            onProjectChange(val);
                            onSeriesChange(null);
                        }
                    }}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue
                            className="text-foreground text-sm native:text-lg"
                            placeholder={
                                pLoading
                                    ? t("common.loading")
                                    : selectProjectPlaceholder
                            }
                        />
                    </SelectTrigger>
                    <SelectContent insets={insets} className="w-full max-w-sm">
                        <SelectGroup>
                            {projects.map((p) => (
                                <SelectItem key={p.id} label={p.title} value={p.id}>
                                    {p.title}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                {projectId && (
                    <Pressable onPress={() => { onProjectChange(null); onSeriesChange(null); }} className="mt-2 pl-1">
                        <Text className="text-xs text-muted-foreground">{t("common.clear") || "Clear project"}</Text>
                    </Pressable>
                )}
            </View>

            {projectId && activeSeriesForProject.length > 0 && (
                <View>
                    <Text className="mb-1 text-sm font-medium text-foreground">
                        {seriesLabel}
                    </Text>
                    <Select
                        value={selectedSeriesValue}
                        onValueChange={(val) => {
                            if (val) {
                                onSeriesChange(val);
                            }
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue
                                className="text-foreground text-sm native:text-lg"
                                placeholder={
                                    sLoading
                                        ? t("common.loading")
                                        : selectSeriesPlaceholder
                                }
                            />
                        </SelectTrigger>
                        <SelectContent insets={insets} className="w-full max-w-sm">
                            <SelectGroup>
                                {activeSeriesForProject.map((s) => (
                                    <SelectItem key={s.id} label={s.title} value={s.id}>
                                        {s.title}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    {seriesId && (
                        <Pressable onPress={() => onSeriesChange(null)} className="mt-2 pl-1">
                            <Text className="text-xs text-muted-foreground">{t("common.clear") || "Clear series"}</Text>
                        </Pressable>
                    )}
                </View>
            )}
        </View>
    );
}
