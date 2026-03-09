import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Undo, Play } from 'lucide-react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useTranslation } from "react-i18next";

interface ActionsRailProps {
    pendingPreviews?: { id: string; description?: string }[];
    onApply?: (id: string) => void;
    onUndo?: (id: string) => void;
    isApplying?: boolean;
    isUndoing?: boolean;
    activeToolName?: string;
}

export function ActionsRail({
    pendingPreviews = [],
    onApply,
    onUndo,
    isApplying = false,
    isUndoing = false,
    activeToolName,
}: ActionsRailProps) {
    const { t } = useTranslation();
    if (pendingPreviews.length === 0 && !activeToolName) return null;

    return (
        <View className="mb-3 pl-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {activeToolName && (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={{ marginRight: 8 }}>
                        <View className="flex-row items-center bg-muted/60 px-3 py-1.5 rounded-full border border-border/50">
                            <ActivityIndicator size="small" style={{ width: 14, height: 14, marginRight: 6 }} />
                            <Text className="text-[13px] text-muted-foreground font-medium">{activeToolName}...</Text>
                        </View>
                    </Animated.View>
                )}

                {pendingPreviews.map((preview) => (
                    <Animated.View
                        key={preview.id}
                        entering={FadeInRight}
                        exiting={FadeOutLeft}
                        style={{ marginRight: 8, flexDirection: "row", gap: 8 }}
                    >
                        <TouchableOpacity
                            onPress={() => onApply?.(preview.id)}
                            disabled={isApplying || isUndoing}
                            className={`flex-row items-center px-4 py-1.5 rounded-full border ${isApplying ? 'bg-muted border-border/50' : 'bg-primary border-primary'}`}
                        >
                            {isApplying ? (
                                <ActivityIndicator size="small" style={{ width: 14, height: 14, marginRight: 4 }} />
                            ) : (
                                <Play size={14} className="text-primary-foreground mr-1" />
                            )}
                            <Text className={`text-[13px] font-semibold ${isApplying ? 'text-muted-foreground' : 'text-primary-foreground'}`}>
                                {t("pages.sync.actions.applyPreview")}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => onUndo?.(preview.id)}
                            disabled={isApplying || isUndoing}
                            className={`flex-row items-center px-4 py-1.5 rounded-full border ${isUndoing ? 'bg-muted border-border/50' : 'bg-background border-border'}`}
                        >
                            {isUndoing ? (
                                <ActivityIndicator size="small" style={{ width: 14, height: 14, marginRight: 4 }} />
                            ) : (
                                <Undo size={14} className="text-foreground mr-1" />
                            )}
                            <Text className={`text-[13px] font-semibold ${isUndoing ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {t("pages.sync.actions.undo")}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                ))}

                {/* Spacer */}
                <View className="w-4" />
            </ScrollView>
        </View>
    );
}
