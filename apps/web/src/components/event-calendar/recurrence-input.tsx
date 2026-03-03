"use client";

import { useTranslation } from "react-i18next";
import { RRule, Frequency, Weekday } from "rrule";
import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RecurrenceInputProps {
    value?: string;
    onChange: (rrule?: string) => void;
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
                    setSelectedDays(
                        (rule.options.byweekday as (number | Weekday)[]).map((w) =>
                            typeof w === "number" ? w : w.weekday
                        )
                    );
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
            onChange(undefined);
            return;
        }

        // Default to current day of startDate if none selected
        const fallbackDay = startDate.getDay() === 0 ? 6 : startDate.getDay() - 1;
        const activeDays = days.length > 0 ? days : [fallbackDay];

        const rule = new RRule({
            freq: Frequency.WEEKLY,
            byweekday: activeDays.map(d => new Weekday(d)),
        });

        // Convert to string. The RRule library formats it nicely.
        // We remove the DTSTART part if we only want the recurrence rule string itself
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
        <div className="space-y-4 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
                <Label htmlFor="repeat-toggle" className="text-sm font-medium cursor-pointer">
                    {t("pages.calendar.momentFields.repeat", "Repeat Event")}
                </Label>
                <Switch
                    id="repeat-toggle"
                    checked={isRepeating}
                    onCheckedChange={handleRepeatsChange}
                />
            </div>

            {isRepeating && (
                <div className="space-y-3 pt-3 border-t border-border">
                    <Label className="text-xs text-muted-foreground">
                        {t("pages.calendar.momentFields.repeatOn", "Repeat on")}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                        {DAYS.map((day) => {
                            const isActive = selectedDays.includes(day.value);
                            return (
                                <Button
                                    key={day.value}
                                    type="button"
                                    variant={isActive ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                        "h-8 w-8 rounded-full p-0 font-medium",
                                        isActive ? "" : "text-muted-foreground hover:bg-muted"
                                    )}
                                    onClick={() => toggleDay(day.value)}
                                    aria-label={`Select day ${day.label}`}
                                    aria-pressed={isActive}
                                >
                                    {day.label}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
