import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated"; import { MessageSquare, X, Clock3 } from "lucide-react-native";
import { useSyncRuns } from "@/hooks/use-sync";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface HistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectRun: (runId: string) => void;
    currentRunId: string | null;
}

const { width } = Dimensions.get("window");
// Take 85% of screen up to 400px
const DRAWER_WIDTH = Math.min(width * 0.85, 400);

function formatTime(value: string | null | undefined): string {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function runTitle(run: any): string {
    if (run.title && run.title.trim()) return run.title;
    if (run.last_message_preview && run.last_message_preview.trim()) return run.last_message_preview;
    return run.id.slice(0, 8);
}

export function HistoryDrawer({ isOpen, onClose, onSelectRun, currentRunId }: HistoryDrawerProps) {
    const insets = useSafeAreaInsets();
    const translateX = useSharedValue(DRAWER_WIDTH);
    const { data: runs, isLoading } = useSyncRuns(50);

    useEffect(() => {
        translateX.value = withTiming(isOpen ? 0 : DRAWER_WIDTH, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
        });
    }, [isOpen]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    const backdropStyle = useAnimatedStyle(() => {
        return {
            opacity: 1 - translateX.value / DRAWER_WIDTH,
            pointerEvents: isOpen ? "auto" : "none",
        } as any;
    });

    return (
        <View className="absolute inset-0 z-50" pointerEvents="box-none" style={{ elevation: isOpen ? 50 : 0 }}>
            {/* Backdrop */}
            <Animated.View
                className="absolute inset-0 bg-black/50"
                style={backdropStyle}
            >
                <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
            </Animated.View>

            {/* Drawer */}
            <Animated.View
                className="absolute top-0 bottom-0 right-0 bg-background border-l border-border"
                style={[
                    { width: DRAWER_WIDTH, paddingTop: insets.top, paddingBottom: insets.bottom },
                    animatedStyle
                ]}
                pointerEvents={isOpen ? "auto" : "none"}
            >
                <View className="flex-row items-center justify-between p-4 border-b border-border">
                    <Text className="text-foreground text-lg font-semibold">History</Text>
                    <TouchableOpacity onPress={onClose} className="p-2 -mr-2">
                        <X size={20} className="text-muted-foreground" />
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1 px-3">
                    {isLoading ? (
                        <View className="py-8 items-center justify-center">
                            <ActivityIndicator size="small" />
                        </View>
                    ) : runs?.length === 0 ? (
                        <Text className="text-muted-foreground p-4 text-center">No history yet.</Text>
                    ) : (
                        <View className="space-y-3 pb-8 pt-2 gap-3">
                            {runs?.map((run) => (
                                <TouchableOpacity
                                    key={run.id}
                                    onPress={() => {
                                        onSelectRun(run.id);
                                        onClose();
                                    }}
                                    className={`w-full rounded-xl border p-3 ${run.id === currentRunId
                                        ? "border-primary/40 bg-primary/5"
                                        : "border-border/60 bg-transparent active:bg-muted/50"
                                        }`}
                                >
                                    <Text className="text-foreground text-[14px] font-medium" numberOfLines={1}>
                                        {runTitle(run)}
                                    </Text>

                                    {run.last_message_preview ? (
                                        <Text className="mt-1 text-muted-foreground text-[12px]" numberOfLines={2}>
                                            {run.last_message_preview}
                                        </Text>
                                    ) : null}

                                    <View className="mt-2 flex-row items-center justify-between">
                                        <View className="flex-row items-center gap-1">
                                            <Clock3 size={12} className="text-muted-foreground" />
                                            <Text className="text-muted-foreground text-[11px]">
                                                {formatTime(run.updated_at)}
                                            </Text>
                                        </View>
                                        <Text className="text-muted-foreground text-[11px]">
                                            {run.selected_model ?? "-"}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </Animated.View>
        </View>
    );
}
