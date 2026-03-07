import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Pressable,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Check, Zap, ClipboardList, ChevronDown } from "lucide-react-native";
import type { SyncRunMode } from "@momentarise/shared";

interface RunModeSelectorProps {
    runMode: SyncRunMode;
    onModeChange: (mode: SyncRunMode) => void;
    disabled?: boolean;
}

export function RunModeSelector({
    runMode,
    onModeChange,
    disabled = false,
}: RunModeSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = useCallback(
        (mode: SyncRunMode) => {
            onModeChange(mode);
            setIsOpen(false);
        },
        [onModeChange]
    );

    return (
        <>
            <TouchableOpacity
                onPress={() => setIsOpen(true)}
                disabled={disabled}
                className="flex-row items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 ml-2"
                activeOpacity={0.7}
            >
                {runMode === "free" ? (
                    <Zap size={14} className="text-blue-500" />
                ) : (
                    <ClipboardList size={14} className="text-amber-500" />
                )}
                <Text className="text-xs font-medium text-foreground">
                    {runMode === "free" ? "Normal" : "Plan Mode"}
                </Text>
                <ChevronDown size={12} className="text-muted-foreground" />
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                transparent
                animationType="none"
                onRequestClose={() => setIsOpen(false)}
            >
                <Pressable
                    className="flex-1 justify-end bg-black/40"
                    onPress={() => setIsOpen(false)}
                >
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        exiting={FadeOut.duration(150)}
                    >
                        <Pressable
                            onPress={(e) => e.stopPropagation()}
                            className="rounded-t-3xl bg-background px-4 pb-10 pt-3"
                        >
                            <View className="mb-4 h-1 w-10 self-center rounded-full bg-border" />

                            <Text className="mb-4 text-center text-base font-semibold text-foreground">
                                Mode d'exécution
                            </Text>

                            <TouchableOpacity
                                onPress={() => handleSelect("free")}
                                className={`mb-1 flex-row items-center rounded-2xl px-4 py-3 ${runMode === "free" ? "bg-accent" : ""
                                    }`}
                                activeOpacity={0.7}
                            >
                                <Zap size={18} className="text-blue-500" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-sm font-semibold text-foreground">
                                        Normal
                                    </Text>
                                    <Text className="text-xs text-muted-foreground">
                                        Action directe et rapide
                                    </Text>
                                </View>
                                {runMode === "free" && (
                                    <Check size={18} className="text-primary" />
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleSelect("guided")}
                                className={`mb-1 flex-row items-center rounded-2xl px-4 py-3 ${runMode === "guided" ? "bg-accent" : ""
                                    }`}
                                activeOpacity={0.7}
                            >
                                <ClipboardList size={18} className="text-amber-500" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-sm font-semibold text-foreground">
                                        Plan Mode
                                    </Text>
                                    <Text className="text-xs text-muted-foreground">
                                        Guidé, propose un plan structuré
                                    </Text>
                                </View>
                                {runMode === "guided" && (
                                    <Check size={18} className="text-primary" />
                                )}
                            </TouchableOpacity>
                        </Pressable>
                    </Animated.View>
                </Pressable>
            </Modal>
        </>
    );
}
