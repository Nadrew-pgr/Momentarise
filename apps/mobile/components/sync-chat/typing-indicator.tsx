import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    SharedValue,
} from "react-native-reanimated";

export function TypingIndicator() {
    const dot1 = useSharedValue(0.3);
    const dot2 = useSharedValue(0.3);
    const dot3 = useSharedValue(0.3);

    useEffect(() => {
        const sequence = (delay: number) =>
            withDelay(
                delay,
                withRepeat(
                    withSequence(
                        withTiming(1, { duration: 400 }),
                        withTiming(0.3, { duration: 400 }),
                        withDelay(400, withTiming(0.3, { duration: 0 }))
                    ),
                    -1,
                    false
                )
            );

        dot1.value = sequence(0);
        dot2.value = sequence(200);
        dot3.value = sequence(400);
    }, []);

    const getStyle = (val: SharedValue<number>) =>
        useAnimatedStyle(() => ({
            opacity: val.value,
            transform: [{ scale: 0.8 + val.value * 0.4 }],
        }));

    return (
        <View className="mb-2 self-start py-1">
            <View className="flex-row items-center gap-1.5">
                <Animated.View className="bg-muted-foreground" style={[styles.dot, getStyle(dot1)]} />
                <Animated.View className="bg-muted-foreground" style={[styles.dot, getStyle(dot2)]} />
                <Animated.View className="bg-muted-foreground" style={[styles.dot, getStyle(dot3)]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
});
