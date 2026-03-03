import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { Switch } from "@/components/ui/switch";
import { RRule, Frequency, Weekday } from "rrule";
import { useTranslation } from "react-i18next";

interface RecurrenceInputProps {
    value?: string | null;
    onChange: (rrule?: string | null) => void;
    startDate: Date;
}

const DAYS = [
    { value: RRule.MO.weekday, label: "M" },
    { value: RRule.TU.weekday, label: "T" },
    { value: RRule.WE.weekday, label: "W" },
    { value: RRule.TH.weekday, label: "T" },
    { value: RRule.FR.weekday, label: "F" },
    { value: RRule.SA.weekday, label: "S" },
    { value: RRule.SU.weekday, label: "S" },
];

export function RecurrenceInput({ value, onChange, startDate }: RecurrenceInputProps) {
    const { t } = useTranslation();
    const [isRepeating, setIsRepeating] = useState(!!value);
    const [selectedDays, setSelectedDays] = useState<number[]>([]);

    useEffect(() => {
        if (value) {
            try {
                const rule = RRule.fromString(value);
                if (rule.options.byweekday) {
                    setSelectedDays(rule.options.byweekday.map((w: Weekday) => w.weekday));
                }
                setIsRepeating(true);
            } catch (e) {
                console.error("Failed to parse rrule", e);
            }
        } else {
            setIsRepeating(false);
        }
    }, [value]);

    const updateRRule = useCallback((days: number[], repeating: boolean) => {
        if (!repeating) {
            onChange(null);
            return;
        }

        const fallbackDay = startDate.getDay() === 0 ? 6 : startDate.getDay() - 1;
        const activeDays = days.length > 0 ? days : [fallbackDay];

        const rule = new RRule({
            freq: Frequency.WEEKLY,
            byweekday: activeDays.map(d => new Weekday(d)),
        });

        const optionsString = rule.toString();
        const rruleOnly = optionsString.split('\\n').find(line => line.startsWith('RRULE:'))?.replace('RRULE:', '') || optionsString;

        onChange(rruleOnly);
    }, [onChange, startDate]);

    const handleRepeatsChange = (checked: boolean) => {
        setIsRepeating(checked);
        updateRRule(selectedDays, checked);
    };

    const toggleDay = (day: number) => {
        const nextDays = selectedDays.includes(day)
            ? selectedDays.filter((d) => d !== day)
            : [...selectedDays, day].sort((a, b) => a - b);

        setSelectedDays(nextDays);
        updateRRule(nextDays, isRepeating);
    };

    return (
        <View className="rounded-md border border-border p-3 mt-3">
            <View className="flex-row items-center justify-between pointer-events-auto">
                <Text className="text-sm font-medium text-foreground">
                    {t("pages.timeline.eventSheet.repeat", "Repeat Event")}
                </Text>
                <Switch checked={isRepeating} onCheckedChange={handleRepeatsChange} />
            </View>

            {isRepeating && (
                <View className="mt-4 pt-3 border-t border-border">
                    <Text className="mb-2 text-xs text-muted-foreground">
                        {t("pages.timeline.eventSheet.repeatOn", "Repeat on")}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        {DAYS.map((day) => {
                            const isActive = selectedDays.includes(day.value);
                            return (
                                <Pressable
                                    key={day.value}
                                    onPress={() => toggleDay(day.value)}
                                    className={`h-9 w-9 items-center justify-center rounded-full border ${isActive
                                        ? "bg-primary border-primary"
                                        : "bg-transparent border-input"
                                        }`}
                                >
                                    <Text
                                        className={`font-medium ${isActive ? "text-primary-foreground" : "text-foreground"
                                            }`}
                                    >
                                        {day.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            )}
        </View>
    );
}
