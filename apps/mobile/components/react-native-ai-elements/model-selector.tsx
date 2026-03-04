import React, { useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    Pressable,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Check, Sparkles, Brain, ChevronDown } from "lucide-react-native";
import type { SyncModel } from "@momentarise/shared";
import { ProviderIcon } from "./provider-icons";

const TIER_CONFIG: Record<string, { label: string; bgClass: string; textClass: string; borderClass: string }> = {
    pro: {
        label: "Pro",
        bgClass: "bg-blue-500/10",
        textClass: "text-blue-600",
        borderClass: "border-blue-500/20",
    },
    ultra: {
        label: "Ultra",
        bgClass: "bg-violet-500/10",
        textClass: "text-violet-600",
        borderClass: "border-violet-500/20",
    },
};

const PROVIDER_LABELS: Record<string, string> = {
    mistral: "Mistral",
    anthropic: "Anthropic",
    openai: "OpenAI",
    gemini: "Google",
};

interface ModelSelectorProps {
    models: SyncModel[];
    selectedModel: string;
    onModelChange: (modelId: string) => void;
    disabled?: boolean;
}

export function ModelSelector({
    models,
    selectedModel,
    onModelChange,
    disabled = false,
}: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const isAutoMode = selectedModel === "auto";
    const currentModel = models.find((m) => m.id === selectedModel);

    const displayLabel = isAutoMode ? "Auto" : currentModel?.label ?? "—";

    const groupedModels = useMemo(() => {
        const groups: Record<string, SyncModel[]> = {};
        for (const model of models) {
            const provider = model.provider ?? "other";
            if (!groups[provider]) groups[provider] = [];
            groups[provider].push(model);
        }
        return groups;
    }, [models]);

    const handleSelect = useCallback(
        (modelId: string) => {
            onModelChange(modelId);
            setIsOpen(false);
        },
        [onModelChange]
    );

    return (
        <>
            {/* Trigger — compact badge in header */}
            <TouchableOpacity
                onPress={() => setIsOpen(true)}
                disabled={disabled}
                className="flex-row items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5"
                activeOpacity={0.7}
            >
                {isAutoMode ? (
                    <Sparkles size={14} className="text-amber-500" />
                ) : (
                    <ProviderIcon provider={currentModel?.provider ?? ""} size={14} />
                )}
                <Text className="text-xs font-medium text-foreground">
                    {displayLabel}
                </Text>
                <ChevronDown size={12} className="text-muted-foreground" />
            </TouchableOpacity>

            {/* Bottom sheet modal */}
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
                            {/* Handle */}
                            <View className="mb-4 h-1 w-10 self-center rounded-full bg-border" />

                            <Text className="mb-4 text-center text-base font-semibold text-foreground">
                                Modèle IA
                            </Text>

                            <ScrollView
                                className="max-h-96"
                                showsVerticalScrollIndicator={false}
                            >
                                {/* Auto option */}
                                <TouchableOpacity
                                    onPress={() => handleSelect("auto")}
                                    className={`mb-1 flex-row items-center rounded-2xl px-4 py-3 ${isAutoMode ? "bg-accent" : ""
                                        }`}
                                    activeOpacity={0.7}
                                >
                                    <Sparkles
                                        size={18}
                                        className="text-amber-500"
                                    />
                                    <View className="ml-3 flex-1">
                                        <Text className="text-sm font-semibold text-foreground">
                                            Auto
                                        </Text>
                                        <Text className="text-xs text-muted-foreground">
                                            Sélection adaptative du meilleur
                                            modèle
                                        </Text>
                                    </View>
                                    {isAutoMode && (
                                        <Check
                                            size={18}
                                            className="text-primary"
                                        />
                                    )}
                                </TouchableOpacity>

                                <View className="my-2 h-px bg-border/50" />

                                {/* Models grouped by provider */}
                                {Object.entries(groupedModels).map(
                                    ([provider, providerModels]) => (
                                        <View key={provider} className="mb-2">
                                            <View className="mb-1 px-4 flex-row items-center gap-1.5">
                                                <ProviderIcon provider={provider} size={12} />
                                                <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                                                    {PROVIDER_LABELS[provider] ??
                                                        provider}
                                                </Text>
                                            </View>
                                            {providerModels.map((model) => {
                                                const isSelected =
                                                    model.id === selectedModel;
                                                const tierInfo =
                                                    TIER_CONFIG[
                                                    model.tier ?? ""
                                                    ];
                                                const hasReasoning =
                                                    model.reasoning_levels &&
                                                    model.reasoning_levels
                                                        .length > 0;

                                                return (
                                                    <TouchableOpacity
                                                        key={model.id}
                                                        onPress={() =>
                                                            handleSelect(
                                                                model.id
                                                            )
                                                        }
                                                        className={`flex-row items-center rounded-2xl px-4 py-3 ${isSelected
                                                            ? "bg-accent"
                                                            : ""
                                                            }`}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View className="flex-1">
                                                            <View className="flex-row items-center gap-1.5">
                                                                <Text className="text-sm font-medium text-foreground">
                                                                    {
                                                                        model.label
                                                                    }
                                                                </Text>
                                                                {tierInfo && (
                                                                    <View className={`rounded-full px-1.5 py-0.5 border ${tierInfo.bgClass} ${tierInfo.borderClass}`}>
                                                                        <Text className={`text-[9px] font-semibold ${tierInfo.textClass}`}>
                                                                            {tierInfo.label}
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                                {hasReasoning && (
                                                                    <View className="rounded-full bg-amber-500/10 px-1.5 py-0.5">
                                                                        <Text className="text-[9px] font-medium text-amber-600">
                                                                            Thinking
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                            <Text className="mt-0.5 text-[11px] text-muted-foreground">
                                                                {model
                                                                    .capabilities
                                                                    ?.cost_hint ===
                                                                    "fast"
                                                                    ? "Rapide"
                                                                    : model
                                                                        .capabilities
                                                                        ?.cost_hint ===
                                                                        "reasoning"
                                                                        ? "Raisonnement"
                                                                        : "Équilibré"}
                                                            </Text>
                                                        </View>
                                                        {isSelected && (
                                                            <Check
                                                                size={18}
                                                                className="text-primary"
                                                            />
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )
                                )}
                            </ScrollView>
                        </Pressable>
                    </Animated.View>
                </Pressable>
            </Modal>
        </>
    );
}
