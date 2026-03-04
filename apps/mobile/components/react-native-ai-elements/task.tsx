import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, useAnimatedStyle, withTiming, useSharedValue, Easing } from 'react-native-reanimated';
import { ChevronDown, CheckCircle2, XCircle, Wrench, BrainCircuit } from 'lucide-react-native';

export type TaskState = 'pending' | 'running' | 'completed' | 'error';
export type TaskType = 'tool-call' | 'chain-of-thought';

export interface TaskProps {
    title: string;
    state: TaskState;
    type?: TaskType;
    children?: React.ReactNode;
    defaultOpen?: boolean;
}

export function Task({ title, state, type = 'tool-call', children, defaultOpen }: TaskProps) {
    // Open by default if it's currently running, or if explicitly passed.
    const [isOpen, setIsOpen] = useState(defaultOpen ?? state === 'running');
    const heightValue = useSharedValue(isOpen ? 1 : 0);
    const rotationValue = useSharedValue(isOpen ? 180 : 0);

    const toggleOpen = () => {
        const nextState = !isOpen;
        setIsOpen(nextState);
        heightValue.value = withTiming(nextState ? 1 : 0, { duration: 300, easing: Easing.inOut(Easing.ease) });
        rotationValue.value = withTiming(nextState ? 180 : 0, { duration: 300, easing: Easing.inOut(Easing.ease) });
    };

    // Auto-open if status becomes running
    React.useEffect(() => {
        if (state === 'running' && !isOpen) {
            toggleOpen();
        }
    }, [state]);

    const animatedContentStyle = useAnimatedStyle(() => {
        return {
            opacity: heightValue.value,
        };
    });

    const animatedIconStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${rotationValue.value}deg` }],
        };
    });

    const renderIcon = () => {
        switch (state) {
            case 'running':
                return <ActivityIndicator size="small" className="ml-2" />;
            case 'completed':
                return <CheckCircle2 size={16} className="text-green-500 ml-2" />;
            case 'error':
                return <XCircle size={16} className="text-destructive ml-2" />;
            default:
                return null;
        }
    };

    const TypeIcon = type === 'chain-of-thought' ? BrainCircuit : Wrench;

    return (
        <Animated.View
            entering={FadeInUp.duration(300).springify()}
            exiting={FadeOutUp}
            className="w-full mb-3 rounded-xl border border-border/60 bg-card overflow-hidden"
        >
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={toggleOpen}
                className="flex-row items-center justify-between p-3"
            >
                <View className="flex-row items-center flex-1 pr-4">
                    <TypeIcon size={16} className="text-muted-foreground mr-2" />
                    <Text className="text-sm font-medium text-card-foreground" numberOfLines={1}>
                        {title}
                    </Text>
                    {renderIcon()}
                </View>

                {children && (
                    <Animated.View style={animatedIconStyle}>
                        <ChevronDown size={16} className="text-muted-foreground" />
                    </Animated.View>
                )}
            </TouchableOpacity>

            {children && isOpen && (
                <Animated.View style={animatedContentStyle}>
                    <View className="p-3 pt-0 border-t border-border/30">
                        {children}
                    </View>
                </Animated.View>
            )}
        </Animated.View>
    );
}
