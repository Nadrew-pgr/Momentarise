import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { HelpCircle, Sparkles, ChevronRight, CornerDownLeft } from "lucide-react-native";
import type { SyncQuestion } from "@momentarise/shared";

interface InteractiveQuestionUIProps {
    question: SyncQuestion;
    onSelectOption: (option: string) => void;
    onOtherClick: () => void;
    isDark?: boolean;
}

export function InteractiveQuestionUI({
    question,
    onSelectOption,
    onOtherClick,
    isDark = false,
}: InteractiveQuestionUIProps) {
    return (
        <Animated.View
            entering={FadeInUp}
            exiting={FadeOutDown}
            className={`p-4 mb-4 rounded-3xl border ${isDark
                ? "bg-zinc-900 border-zinc-800"
                : "bg-white border-zinc-200"
                } shadow-lg shadow-zinc-200/50 relative overflow-hidden`}
        >
            <View className="flex-row items-start gap-3">
                <View className={`p-2 rounded-xl border ${isDark
                    ? "bg-blue-500/10 border-blue-500/20"
                    : "bg-blue-50 border-blue-100"
                    }`}>
                    <HelpCircle
                        size={20}
                        color={isDark ? "#60a5fa" : "#2563eb"}
                    />
                </View>
                <View className="flex-1 space-y-1">
                    <View className="flex-row items-center gap-2">
                        <Text className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"
                            }`}>
                            AI Assistant Question
                        </Text>
                        <View className={`px-1.5 py-0.5 rounded-full ${isDark ? "bg-zinc-800" : "bg-zinc-100"
                            }`}>
                            <Text className={`text-[9px] font-bold ${isDark ? "text-zinc-500" : "text-zinc-400"
                                }`}>
                                REQUIRED
                            </Text>
                        </View>
                    </View>
                    <Text className={`text-base font-medium leading-6 ${isDark ? "text-zinc-100" : "text-zinc-900"
                        }`}>
                        {question.prompt}
                    </Text>
                    {question.help_text && (
                        <Text className={`text-xs italic ${isDark ? "text-zinc-500" : "text-zinc-400"
                            }`}>
                            {question.help_text}
                        </Text>
                    )}
                </View>
            </View>

            <View className="flex-row flex-wrap gap-2 mt-4">
                {question.options?.map((option, idx) => (
                    <TouchableOpacity
                        key={option}
                        onPress={() => onSelectOption(option)}
                        activeOpacity={0.7}
                        className={`flex-row items-center gap-2 px-4 py-2.5 rounded-2xl border ${isDark
                            ? "bg-zinc-800/50 border-zinc-700 active:bg-zinc-800"
                            : "bg-zinc-50 border-zinc-200 active:bg-zinc-100"
                            }`}
                    >
                        <Text className={`text-sm font-semibold ${isDark ? "text-zinc-200" : "text-zinc-700"
                            }`}>
                            {option}
                        </Text>
                        <ChevronRight
                            size={14}
                            color={isDark ? "#71717a" : "#a1a1aa"}
                        />
                    </TouchableOpacity>
                ))}

                <TouchableOpacity
                    onPress={onOtherClick}
                    activeOpacity={0.7}
                    className={`flex-row items-center gap-2 px-4 py-2.5 rounded-2xl border border-dashed ${isDark
                        ? "border-zinc-700 bg-transparent"
                        : "border-zinc-300 bg-white"
                        }`}
                >
                    <Text className={`text-sm font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"
                        }`}>
                        Other...
                    </Text>
                    <CornerDownLeft
                        size={14}
                        color={isDark ? "#52525b" : "#d4d4d8"}
                    />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}
